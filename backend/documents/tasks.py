from celery import shared_task
from celery.exceptions import MaxRetriesExceededError

from django.db import transaction

from .models import Document
from rag.ingest import ingest
from utils.logger import get_logger


logger = get_logger(__name__)


@shared_task(bind=True)
def ingest_document_task(self, document_id):
    """
    Celery task: run the RAG ingestion pipeline for a single Document,
    identified only by its UUID
    """
    try:
        existing = Document.objects.exclude(
                status__in=['deleting', 'deleted']
            ).get(
                doc_id=document_id
            )
    except Document.DoesNotExist:
        logger.warning(f'Document does not exist: {document_id}')
        return
    
    try:
        existing.status = 'processing'
        existing.save(update_fields=['status'])
        result = ingest(
            client_id=str(existing.client_id),
            file_path=existing.file_raw.path
        )

        with transaction.atomic():
            existing.filename = result['filename']
            existing.chunk_count = result['chunk_count']
            existing.status = result['status']
            existing.save()
            
            logger.info(f'Successfully updated the Document: {existing.filename}')
    except Exception as exc:
        logger.exception(
            "Document ingestion failed",
            extra={
                "document_id": str(document_id),
                "client_id": str(existing.client_id),
            },
        )
        try:
            countdown = 2 ** self.request.retries
            raise self.retry(exc=exc, countdown=countdown, max_retries=3)
        except MaxRetriesExceededError:
            existing.status = 'failed'
            existing.save(update_fields=['status'])
            logger.warning(
                "Max Retries failed: Document ingestion failed",
                extra={
                    "document_id": document_id,
                },
            )