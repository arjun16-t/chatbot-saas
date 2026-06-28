from django.core.cache import cache
from django.http import JsonResponse
from django.conf import settings

from utils.logger import get_logger

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
        
        ip = request.META.get('REMOTE_ADDR', 'unknown')
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