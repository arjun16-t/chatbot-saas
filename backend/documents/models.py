from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from core.models import BaseModel, Client

import hashlib

STATUS = [
    ('received', 'Received'),      # file uploaded, not yet processed
    ('processing', 'Processing'),  # ingest pipeline running
    ('created', 'Created'),        # successfully stored in Qdrant
    ('duplicate', 'Duplicate'),    # file already exists
    ('updated', 'Updated'),        # existing file re-indexed
    ('failed', 'Failed'),          # pipeline error
]

def client_file_path(instance, filename):
    client = instance.client.id
    return f"{client}/{filename}"

def validate_file_size(file):
    if file.size > 10 * 1024 * 1024:
        raise ValidationError("File size cannot exceed 10MB")

class Document(BaseModel):
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='document',
        editable=False,
    )

    filename = models.CharField(max_length=100)

    doc_id = models.CharField(max_length=100)

    file_raw = models.FileField(
        upload_to=client_file_path,
        validators=[
            validate_file_size,
            FileExtensionValidator(
                allowed_extensions=['pdf', 'txt', 'md', 'docx']
            )
        ],
        help_text="PDF/TXT/MD/DOCX - max file size 10MB"
    )
    file_hash = models.CharField(
        max_length=64, blank=True,
        help_text="SHA256 hash of the file. Raw key is never stored."
    )
    file_size = models.IntegerField(max_length=8, blank=True, null=True)

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
            models.Index(fields=['client']),
            models.Index(fields=['client', 'doc_id']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.client.id}: {self.filename} - {self.status}"