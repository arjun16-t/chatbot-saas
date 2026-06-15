import uuid
import secrets
import hashlib
from django.contrib.auth.models import AbstractUser, BaseUserManager
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

class ClientManager(BaseUserManager):
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True")

        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True")


        return self.create_user(email, password, **extra_fields)
    
    def create_user_with_api_key(
        self,
        email,
        password=None,
        **extra_fields
    ):
        if not email:
            raise ValueError("Email is required")
        
        api_key = secrets.token_urlsafe(32)

        client = self.model(
            email=self.normalize_email(email),
            api_key_hash=hashlib.sha256(
                api_key.encode()
            ).hexdigest(),
            **extra_fields
        )

        client.set_password(password)
        client.save(using=self._db)

        return client, api_key


class Client(AbstractUser, BaseModel):
    """
    Custom user model representing a business client of AthenaChat.
    Uses email as the primary login identifier instead of username.
    Stores only a SHA256 hash of the API key — the raw key is shown
    to the client once at generation time and never persisted.
    """
    objects = ClientManager()

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
        null=True,
        help_text="SHA256 hash of the API key. Raw key is never stored."
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def verify_api_key(self, raw_key: str) -> bool:
        """
        Verifies an incoming API key against the stored hash.
        
        Args:
            raw_key: The raw API key provided by the client in the request.
        
        Returns:
            True if the key matches, False otherwise.
        """
        if not self.api_key_hash:
            return False

        raw_key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

        return secrets.compare_digest(
            raw_key_hash,
            self.api_key_hash
        )