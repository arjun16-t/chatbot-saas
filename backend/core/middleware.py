from urllib.parse import urlparse

from corsheaders.middleware import CorsMiddleware
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from utils.logger import get_logger

from core.models import Project

logger = get_logger(__name__)

class IPRateLimitMiddleware:
    """
    Fixed-window rate limiter keyed on client IP, scoped to /api/
    paths only. Runs before any view/authentication logic, as a
    coarse first line of defense against raw request flooding
    (DDoS-style abuse), independent of whether the request carries
    a valid JWT or API key.

    Uses Django's cache framework (configured to use Redis) as a
    simple counter with a fixed expiry -- not a true token bucket,
    deliberately simpler to avoid concurrency correctness issues
    on a first implementation.
    """

    LIMIT = settings.IP_RATE_LIMIT
    WINDOW_SECONDS = settings.IP_RATE_WINDOW

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path.startswith('/api/'):
            return self.get_response(request)
        
        ip = _get_client_ip(request)
        key = f"throttle:ip:{ip}"

        count = cache.get(key)
        if count is None:
            cache.set(key, 1, timeout=self.WINDOW_SECONDS)
        elif count >= self.LIMIT:
            response = JsonResponse(
                            {
                                "success": False,
                                "message": "Too many requests. Please try again later.",
                                "code": "rate_limited"
                            },
                            status=429
                        )
            
            response['Retry-After'] = str(self.WINDOW_SECONDS)
            logger.warning("Rate Limit Exceeded", extra={"ip": ip})
            return response
        else:
            try:
                cache.incr(key)
            except ValueError:
                cache.set(key, 1, timeout=self.WINDOW_SECONDS)
        
        return self.get_response(request)

def _get_client_ip(request) -> str:
    """
    Resolves the real client IP, accounting for Caddy sitting in
    front of Django as a reverse proxy.

    X-Forwarded-For can contain a chain of IPs (client, then each
    proxy hop) if multiple proxies are involved -- the leftmost
    entry is the original client. Falls back to REMOTE_ADDR when
    the header is absent (e.g. local dev, no proxy in front).

    Args:
        request: Django HttpRequest.

    Returns:
        str: Best-effort client IP, or 'unknown' if neither source
            is available.
    """
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()

    return request.META.get('REMOTE_ADDR', 'unknown')

class DynamicCorsMiddleware(CorsMiddleware):
    """
    Extends django-cors-headers to additionally allow origins matching
    any active Project's registered domain -- needed because the widget
    is embedded on arbitrary client websites that can't be known ahead
    of time as a static CORS_ALLOWED_ORIGINS list.

    Falls back to the standard static list first (still governs the
    dashboard's fixed, credentialed origin) -- this method only adds
    to what's allowed, never removes.
    """

    def origin_found_in_white_lists(self, origin: str, url) -> bool:
        if super().origin_found_in_white_lists(origin, url):
            return True

        domain = urlparse(origin).netloc.lower()
        if not domain:
            return False

        return Project.objects.filter(
            domain=domain,
            is_active=True,
            is_deleted=False,
        ).exists()