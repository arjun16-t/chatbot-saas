from django.conf import settings
from cryptography.fernet import Fernet, InvalidToken

from decouple import AutoConfig
config = AutoConfig(search_path=settings.BASE_DIR.parent)

from utils.logger import get_logger
logger = get_logger(__name__)

_fernet = None
def _get_fernet() -> Fernet:
    """
    Singleton Fernet instance, lazily built from settings.

    Returns:
        cryptography.fernet.Fernet
    """
    global _fernet
    if _fernet is None:
        key = bytes(config("GROQ_ENCRYPTION_KEY"), encoding="utf-8")
        _fernet = Fernet(key)
        logger.info("New Fernet instance created")

    return _fernet

def encrypt_groq_key(raw_key: str) -> bytes:
    """
    Encrypt a client-supplied Groq API key for storage.

    Args:
        raw_key: the plaintext key as received from the client.
            Caller is responsible for stripping whitespace and
            basic non-blank validation before this is called.

    Returns:
        Encrypted bytes, safe to store in Client.groq_api_key_encrypted.
    """
    cipher = _get_fernet()

    raw_key = raw_key.encode()
    encrypted_key = cipher.encrypt(raw_key)

    return encrypted_key


def decrypt_groq_key(encrypted: bytes) -> str:
    """
    Decrypt a stored Groq key for use in a live request.

    Call this as late as possible — right before building the
    per-request Groq client in query() — and never store or log
    the return value.

    Args:
        encrypted: the bytes from Client.groq_api_key_encrypted.

    Returns:
        The plaintext API key.

    Raises:
        cryptography.fernet.InvalidToken: if GROQ_KEY_ENCRYPTION_SECRET
            has changed since this value was encrypted, or the stored
            bytes are corrupted. Treat this as equivalent to "no key
            set" at the call site — do not surface the raw exception
            to the client.
    """
    cipher = _get_fernet()

    try:
        decrypted_key = cipher.decrypt(encrypted)
        raw_key = decrypted_key.decode()
    except InvalidToken:
        logger.exception("The received encrypted bytes are invalid")
        raise