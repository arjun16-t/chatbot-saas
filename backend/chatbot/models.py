from django.db import models
from core.models import BaseModel, Client

class UnansweredQueries(BaseModel):
    client_id = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        verbose_name='client',
        editable=False
    )

    query = models.TextField(blank=False, null=False)

    is_resolved = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ['-created_at', 'is_resolved']
        verbose_name = 'Unanswered Query'
        verbose_name_plural = 'Unanswered Queries'