from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.password_validation import validate_password

from rest_framework.exceptions import ValidationError
import re

GROQ_KEY_LEN = 56
GROQ_KEY_REGEX = re.compile(r'gsk_[a-zA-Z0-9]{52}')

def validate_groq_key(key:str) -> str:
    if key is None or len(key) != GROQ_KEY_LEN:
        raise ValidationError(f"Not a valid Groq API key. Must be {GROQ_KEY_LEN} characters long")

    if not re.match(GROQ_KEY_REGEX, key):
        raise ValidationError("Not a valid Groq API Key")

    return key.strip()

def validate_name(value) -> str:
    value = value.strip()

    if len(value) < 2:
        raise ValidationError(
            "Name must be at least 2 characters."
        )

    if not re.fullmatch(r"[A-Za-z ]+_[A-Za-z ]+", value):
        raise ValidationError(
            "Name can only contain letters and spaces."
        )

    return value

def validate_client_password(value: str) -> str:
    try:
        validate_password(value)
    except DjangoValidationError as e:
        raise ValidationError(e)
    
    return value
