from django.db import models
from core.models import BaseModel, Project

from rag.config import QUERYING_MODEL

class UnansweredQuery(BaseModel):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='unanswered_queries',
        verbose_name='project',
        editable=False
    )

    query = models.TextField(blank=False, null=False)

    is_resolved = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ['is_resolved', '-created_at']
        verbose_name = 'Unanswered Query'
        verbose_name_plural = 'Unanswered Queries'
    
    def __str__(self):
        status = "Resolved" if self.is_resolved else "Unresolved"
        return f"[{status}] {self.project} - {self.query[:50]}"