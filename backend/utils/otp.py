from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone

from core.models import OTPVerification

from datetime import timedelta
from smtplib import SMTPException
import secrets
from utils.logger import get_logger
logger = get_logger(__name__)

def generate_otp() -> str:
    """
    Generate a random 6-digit OTP, zero-padded.

    Returns:
        str: 6-digit numeric OTP
    """
    digits = "0123456789"
    otp = "".join(secrets.choice(digits) for _ in range(6))

    return otp

def send_otp_email(email: str, otp: str) -> None:
    """
    Send OTP to the given email via Django's email backend.

    Args:
        email: recipient address
        otp: plaintext OTP to include in the email

    Raises:
        # decide: should a send failure block registration, or fail silently/log only?
    """
    try:
        context = {
            "otp_code": otp,
            "expiry_minutes": 10
        }
        html_content = render_to_string(
            "emails/email.html",
            context=context
        )
        text_content = render_to_string(
            "emails/email.txt",
            context=context
        )

        msg = EmailMultiAlternatives(
            subject=f"Your Verification Code for AthenaChat: {otp}",
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)

    except SMTPException:
        logger.exception("OTP Email was not sent")
        raise

    except Exception:
        logger.exception("Mail could not be sent")
        raise


def create_and_send_otp(email: str) -> "OTPVerification":
    """
    Generates OTP, creates OTPVerification row, sends email.
    Single entry point reused by both send and resend flows.

    Args:
        email: address to send OTP to

    Returns:
        OTPVerification: newly created row
    """
    otp = generate_otp()
    row = OTPVerification.objects.create(
        email=email,
        otp=otp,
        expires_at = timezone.now() + timedelta(minutes=10)
    )
    logger.debug(f"OTP is: {otp}")
    send_otp_email(email, otp)

    return row