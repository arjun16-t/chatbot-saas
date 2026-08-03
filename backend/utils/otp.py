from django.core.mail import send_mail

from smtplib import SMTPException

import secrets
from logger import get_logger
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
        send_mail(
            subject='OTP Verification — RML Group of Institutions',
            message=(
                f"Dear {student_name},\n\n"
                f"Your OTP for application verification is:\n\n"
                f"    {otp}\n\n"
                f"This OTP is valid for 10 minutes.\n"
                f"Do not share this OTP with anyone.\n\n"
                f"If you did not request this, please ignore.\n\n"
                f"Regards,\n"
                f"Admissions Team\n"
                f"RML Group of Institutions\n"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        if settings.DEBUG:
            print(f'\033[91mOTP email failed: {e}\033[0m')
        return False


def create_and_send_otp(email: str) -> "OTPVerification":
    """
    Generates OTP, creates OTPVerification row, sends email.
    Single entry point reused by both send and resend flows.

    Args:
        email: address to send OTP to

    Returns:
        OTPVerification: newly created row
    """
    ...