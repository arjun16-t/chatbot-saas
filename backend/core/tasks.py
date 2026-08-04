from celery import shared_task
from django.utils import timezone

from .models import OTPVerification
from utils.logger import get_logger

logger = get_logger(__name__)

@shared_task
def cleanup_expired_otps():
    """
    Deletes all OTPVerification rows past their expiry.
    Scheduled daily via django-celery-beat.
    """
    deleted_count, _ = OTPVerification.objects.filter(
        expires_at__lt=timezone.now()
    ).delete()
    logger.info(f'Cleaned up {deleted_count} expired OTP rows')