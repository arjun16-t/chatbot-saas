from django.db import models
from core.models import BaseModel, Client

from rag.config import QUERYING_MODEL

class UnansweredQuery(BaseModel):
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='unanswered_queries',
        verbose_name='client',
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
        return f"[{status}] {self.client} - {self.query[:50]}"

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

#     # Appearance
#     primary_color = models.CharField(max_length=7, default="#2563EB")
#     logo = models.ImageField(...)
#     bot_name = models.CharField(max_length=100)
#     avatar = models.ImageField(...)