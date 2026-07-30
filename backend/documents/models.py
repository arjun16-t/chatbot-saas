from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from core.models import BaseModel, Client, Project

STATUS = [
    ('received', 'Received'),      # file uploaded, not yet processed
    ('processing', 'Processing'),  # ingest pipeline running
    ('created', 'Created'),        # successfully stored in Qdrant
    ('duplicate', 'Duplicate'),    # file already exists
    ('updated', 'Updated'),        # existing file re-indexed
    ('failed', 'Failed'),          # pipeline error
    ('deleting', 'Deleting'),      # deleting points from Qdrant
    ('deleted', 'Deleted'),        # deleted file from all 3 (Qdrant, Actual and Postgres)
]

def project_file_path(instance, filename):
    client = str(instance.project.client_id)
    project = str(instance.project.id)
    return f"{client}/{project}/{filename}"

def validate_file_size(file):
    if file.size > 10 * 1024 * 1024:
        raise ValidationError("File size cannot exceed 10MB")

class Document(BaseModel):
    """
    Represents a client-uploaded document in the AthenaChat ingestion pipeline.

    Stores the raw uploaded file along with structured metadata needed
    for querying and deduplication. The actual chunk text and embeddings
    live in Qdrant — this model only tracks file-level state in Postgres.

    Status lifecycle:
        received -> processing -> created/updated/duplicate/failed
    """
    
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='documents',
        editable=False,
    )

    filename = models.CharField(max_length=255)
    original_filename = models.CharField(
        max_length=255,
        null=True, blank=True,
        help_text="Max Length is 255 Characters."
    )

    doc_id = models.CharField(max_length=255)

    file_raw = models.FileField(
        upload_to=project_file_path,
        validators=[
            validate_file_size,
            FileExtensionValidator(
                allowed_extensions=['pdf', 'txt', 'md', 'docx']
            )
        ],
        help_text="PDF/TXT/MD/DOCX - max file size 10MB"
    )
    file_hash = models.CharField(
        max_length=64, blank=True, db_index=True,
        help_text="SHA256 hash of the file. Raw key is never stored."
    )
    file_size = models.PositiveIntegerField(
        blank=True,
        null=True
    )

    chunk_count = models.IntegerField(blank=True, null=True)

    status = models.CharField(
        max_length=10,
        choices=STATUS,
        default='received',
        blank=False, null=False
    )
    
    class Meta:
        ordering = ['doc_id', 'status']
        indexes = [
            # models.Index(fields=['project']),  No Need to create since db_index = True automatically for FK
            models.Index(fields=['project', 'doc_id']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.filename} - {self.status}"