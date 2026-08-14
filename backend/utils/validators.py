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