import hashlib

from rest_framework import authentication, exceptions
from django.http import HttpRequest
from django.core.cache import cache
from django.conf import settings

from .models import Project, Client

INVALID_KEY_LIMIT = settings.INVALID_KEY_LIMIT
INVALID_KEY_WINDOW = settings.INVALID_KEY_WINDOW

class ProjectAPIKeyAuthentication(authentication.BaseAuthentication):
    """
    Authenticates requests using the X-API-Key header.

    On success, sets request.user to the owning Client and request.auth
    to the matched Project. Invalid and inactive keys return the same
    AuthenticationFailed error. Invalid-key attempts are rate-limited
    before database lookup to prevent abuse and unnecessary DB load.
    """

    def authenticate(self, request: HttpRequest) -> tuple[Client, Project] | None:
        """
        Args:
            request: incoming DRF Request.

        Returns:
            (client, project) tuple on success, or None if no
            X-API-Key header is present (lets JWT auth try next).

        Raises:
            AuthenticationFailed: key present but invalid/revoked.
        """
        raw_key = request.headers.get('X-API-Key')
        if not raw_key:
            return None
        
        ip = request.META.get('REMOTE_ADDR', 'unknown')
        invalid_key_bucket = f"throttle:invalid_key:{ip}"

        invalid_count = cache.get(invalid_key_bucket)
        if invalid_count is not None and invalid_count >= INVALID_KEY_LIMIT:
            raise exceptions.AuthenticationFailed(
                'Too many invalid API key attempts. Try again later.'
            )

        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        try:
            project = Project.objects.select_related('client').get(
                api_key_hash=key_hash, is_active=True
            )
        except Project.DoesNotExist:
            self._record_invalid_attempt(invalid_key_bucket)
            raise exceptions.AuthenticationFailed('Invalid API key.')

        return project.client, project
    
    def _record_invalid_attempt(self, bucket_key: str) -> None:
        """
        Increments the invalid-key attempt counter for this IP,
        initializing it with an expiry if this is the first failure
        in the current window.
        """
        if cache.get(bucket_key) is None:
            cache.set(bucket_key, 1, timeout=INVALID_KEY_WINDOW)
        else:
            try:
                cache.incr(bucket_key)
            except ValueError:
                cache.set(bucket_key, 1, timeout=INVALID_KEY_WINDOW)
