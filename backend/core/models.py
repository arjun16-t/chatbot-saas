import uuid
import secrets
import hashlib
from django.contrib.auth.models import AbstractUser
from django.db import models


SUBSCRIPTION_PLANS = [
    ('free', 'Free'),
    ('basic', 'Basic'),
    ('premium', 'Premium'),
]


class BaseModel(models.Model):
    """
    Abstract base model that provides created_at and modified_at
    timestamp fields to all inheriting models.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Client(AbstractUser, BaseModel):
    """
    Custom user model representing a business client of AthenaChat.
    Uses email as the primary login identifier instead of username.
    Stores only a SHA256 hash of the API key — the raw key is shown
    to the client once at generation time and never persisted.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name="client_id"
    )
    username = None
    email = models.EmailField(unique=True)
    subscription_plan = models.CharField(
        max_length=7,
        choices=SUBSCRIPTION_PLANS,
        default='free'
    )
    api_key_hash = models.CharField(
        max_length=64,
        blank=True,
        help_text="SHA256 hash of the API key. Raw key is never stored."
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def generate_api_key(self) -> str:
        """
        Generates a cryptographically secure API key for the client.
        Stores only the SHA256 hash in the database.
        Returns the raw key — caller is responsible for showing it
        to the client exactly once.
        """

        api_key = secrets.token_urlsafe(32)
        self.api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        return api_key

    def verify_api_key(self, raw_key: str) -> bool:
        """
        Verifies an incoming API key against the stored hash.
        
        Args:
            raw_key: The raw API key provided by the client in the request.
        
        Returns:
            True if the key matches, False otherwise.
        """
        
        raw_key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        return raw_key_hash == self.api_key_hash