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
    email = models.EmailField(unique=True)
    subscription_plan = models.CharField(
        max_length=7,
        choices=SUBSCRIPTION_PLANS,
        default='free'
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

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
            api_key_hash=hashlib.sha256(
                api_key.encode()
            ).hexdigest(),
            **extra_fields
        )

        project.save(using=self._db)
        return project, api_key


class Project(BaseModel):
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
                name="unique_domain_per_project",
            )
        ]