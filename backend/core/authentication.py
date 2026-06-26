import hashlib
from rest_framework import authentication, exceptions
from .models import Project, Client
from django.http import HttpRequest


class ProjectAPIKeyAuthentication(authentication.BaseAuthentication):
    """
    Authenticates requests via the X-API-Key header against the
    Project model. On success, resolves request.user to the
    Project's owning Client (uniform with JWT auth), and sets
    request.auth to the matched Project instance so downstream
    code (permissions, views) can access it via request.auth.

    Invalid keys and revoked keys (is_active=False) are treated
    identically -- both raise AuthenticationFailed with the same
    generic message, so no information leaks about key validity.
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

        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        try:
            project = Project.objects.select_related('client').get(
                api_key_hash=key_hash, is_active=True
            )
        except Project.DoesNotExist:
            raise exceptions.AuthenticationFailed('Invalid API key.')

        return project.client, project