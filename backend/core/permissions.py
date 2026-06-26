from rest_framework.permissions import BasePermission

from urllib.parse import urlparse

from .models import Project

class ProjectDomainPermission(BasePermission):
    """
    Validates that a project-key-authenticated request's Origin or
    Referer header matches the domain registered on the Project
    that authenticated it (request.auth).

    JWT-authenticated requests have no Project in request.auth
    (request.auth is None for JWT, or whatever SimpleJWT sets) --
    this permission passes those through unaffected, since domain
    validation only applies to widget/project-key traffic.
    """

    def has_permission(self, request, view) -> bool:
        """
        Args:
            request: incoming DRF Request, post-authentication.
            view: the view being accessed.

        Returns:
            bool: True if this isn't a project-key request, or if
            the request's Origin/Referer matches the Project's
            registered domain. False otherwise (DRF returns 403).
        """
        project = getattr(request, 'auth', None)
        if not isinstance(project, Project):
            return True  # JWT path, or no auth resolved -- not this permission's concern

        origin = request.headers.get('Origin') or request.headers.get('Referer')
        if not origin:
            return False

        request_domain = self._normalize(origin)
        return request_domain == project.domain

    def _normalize(self, value: str) -> str:
        """
        Mirrors ProjectSerializer.validate_domain's normalization,
        so Origin/Referer headers compare correctly against the
        stored domain regardless of scheme/path/trailing slash.
        """
        if '://' not in value:
            value = 'https://' + value
        parsed = urlparse(value)
        return parsed.netloc.strip().lower()