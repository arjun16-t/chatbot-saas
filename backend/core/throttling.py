from rest_framework.throttling import BaseThrottle
from django.core.cache import cache
from django.http import JsonResponse
from django.conf import settings

from utils.logger import get_logger
logger = get_logger(__name__)

from .models import Project


class ClientProjectThrottle(BaseThrottle):
    """
    Fixed-window throttle with separate limits for JWT and project-key
    authentication. Applies stricter limits to project-key requests and
    uses client/project identity as the throttle key. Runs after
    authentication via DRF's throttle pipeline.
    """

    JWT_LIMIT = settings.JWT_LIMIT
    JWT_WINDOW = settings.JWT_WINDOW
    PROJECT_LIMIT = settings.PROJECT_LIMIT
    PROJECT_WINDOW = settings.PROJECT_WINDOW

    def allow_request(self, request, view) -> bool:
        if isinstance(request.auth, Project):
            self.key = f"throttle:project:{request.auth.id}"
            self.limit, self.window = self.PROJECT_LIMIT, self.PROJECT_WINDOW
            extra = {"project": request.auth.id}
        else:
            self.key = f"throttle:client:{request.user.id}"
            self.limit, self.window = self.JWT_LIMIT, self.JWT_WINDOW
            extra = {"client": request.user.id}
        
        count = cache.get(self.key)
        if count is None:
            cache.set(self.key, 1, timeout=self.window)
            return True
        
        elif count >= self.limit:
            logger.warning("Rate Limit Exceeded", extra=extra)
            return False
        else:
            try:
                cache.incr(self.key)
            except ValueError:
                cache.set(self.key, 1, timeout=self.window)
            return True

    def wait(self) -> float | None:
        return self.window