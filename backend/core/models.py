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

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []