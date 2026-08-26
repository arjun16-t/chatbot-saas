import uuid
import secrets
import hashlib

from django.utils import timezone
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.db import models
from django.db.models import Q

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
    
    def create_user(
        self,
        email,
        password=None,
        **extra_fields
    ):
        if not email:
            raise ValueError("Email is required")
        client = self.model(
            email=self.normalize_email(email),
            **extra_fields
        )

        client.set_password(password)
        client.save(using=self._db)

        return client



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
    display_name = models.CharField(max_length=50, blank=True, default='')
    email = models.EmailField(unique=True)
    subscription_plan = models.CharField(
        max_length=7,
        choices=SUBSCRIPTION_PLANS,
        default='free'
    )

    groq_api_key_encrypted = models.TextField(null=True, blank=True, editable=False)
    groq_api_key_set_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    @property
    def has_groq_key(self) -> bool:
        return bool(self.groq_api_key_encrypted)

class ProjectManager(models.Manager):
    """
    Custom manager for Project. Generates a raw API key, hashes it,
    and persists the Project in a single DB write.
    """

    def create_project_with_api_key(
        self, client: Client, name: str, domain: str, **extra_fields
    ) -> tuple["Project", str]:
        """
        Creates a new Project with a freshly generated API key.

        Args:
            client: owning Client account.
            name: client-facing label.
            domain: registered origin domain for widget requests.

        Returns:
            tuple[Project, str]: created Project, and the raw API key
                (shown once -- cannot be retrieved again after this call).
        """
        api_key = f"ac_" + secrets.token_urlsafe(32)    # ac = AthenaChat

        project = self.model(
            client=client,
            name=name,
            domain=domain,
            bot_display_name=name,
            api_key_hash=hashlib.sha256(
                api_key.encode()
            ).hexdigest(),
            **extra_fields
        )

        project.save(using=self._db)
        return project, api_key

DEFAULT_GREETING = "Welcome! How may I assist you?"

BUBBLE_POSITION = [
    ("bottom-left", "Bottom Left"),
    ("bottom-right", "Bottom Right"),
]

def default_widget_theme():
    return {
        "primary_color": "#C8860A",
        "secondary_color": "#F5C842",
        "background_color": "#FFFDF5",
        "text_color": "#111111",
        "bot_bubble_color": "#FFFFFF",
        "user_bubble_color": "#C8860A",
        "user_text_color": "#FFFFFF",
    }

def logo_file_path(instance, filename):
    client = str(instance.client_id)
    project = str(instance.id)
    return f"{client}/{project}/logo/{filename}"

def validate_logo_size(file):
    if file.size > 1 * 1024 * 1024:
        raise ValidationError("File size cannot exceed 1MB")

def return_name(instance):
    return instance.name

class ProjectTheme(models.Model):
    theme_color = models.JSONField(
        default=default_widget_theme,
        blank=False,
        null=False
    )

    logo_raw = models.ImageField(
        upload_to=logo_file_path,
        validators=[
            validate_logo_size,
            FileExtensionValidator(
                allowed_extensions=['jpg', 'png', 'svg', 'webp']
            )
        ],
        help_text="JPG/PNG/SVG/WEBP - max file size 1 MB",
        blank=True,
        null=True
    )

    bot_display_name = models.CharField(max_length=50)

    greeting_message = models.TextField(max_length=200, default=DEFAULT_GREETING)

    bubble_position = models.CharField(max_length=12, choices=BUBBLE_POSITION, default='bottom-right')

    class Meta:
        abstract = True

class Project(BaseModel, ProjectTheme):
    """
    A single client-owned website/integration, each with its own
    API key and registered domain.

    Widget requests from this Project's domain authenticate via
    its key, but are scoped at the RAG layer to the parent Client's
    documents (client_id, not project_id).

    Attributes:
        client: owning Client account.
        name: client-facing label (e.g. "Marketing Site").
        domain: registered origin, validated against Origin/Referer.
        api_key_hash: SHA256 hash of raw key; raw key never persisted.
        is_active: soft-revoke flag.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Information
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=255)

    # Website
    domain = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    widget_enabled = models.BooleanField(default=True)

    is_deleted = models.BooleanField(default=False)

    # Authentication
    api_key_hash = models.CharField(max_length=64, editable=False, unique=True)
    api_key_last_used = models.DateTimeField(null=True)

    objects = ProjectManager()

    class Meta:
        indexes = [
            models.Index(fields=['client', 'name']),
            models.Index(fields=['is_active']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["client", "domain"],
                condition=Q(is_deleted=False),
                name="unique_domain_per_client_active",
            )
        ]

class OTPVerification(BaseModel):
    email = models.EmailField()
    otp = models.CharField(max_length=6)

    is_verified = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)

    def is_expired(self):
        return timezone.now() > self.expires_at

    def verify(self, otp):
        if self.is_expired():
            return False, "OTP has expired."
        if self.attempts >= 3:
            return False, "Maximum attempts exceeded."
        if self.otp != otp:
            self.attempts += 1
            self.save()
            return False, "Invalid OTP."
        self.is_verified = True
        self.save()
        return True, "OTP verified successfully."

# from rag.config import QUERYING_MODEL

# class ChatbotConfig(BaseModel):
#     # AI Configuration - Available only for Pro User
#     system_prompt = models.TextField(blank=True)
#     model_name = models.CharField(default=QUERYING_MODEL)
#     temperature = models.FloatField(default=0.2)
#     max_tokens = models.IntegerField(default=1000)

#     # Chat Settings
#     welcome_message = models.TextField(blank=True)
#     fallback_message = models.TextField(blank=True)
#     collect_feedback = models.BooleanField(default=True)
#     human_handoff = models.BooleanField(default=False)