from celery import shared_task
from celery.exceptions import MaxRetriesExceededError

from django.db import transaction

from .models import Document

from rag.ingest import ingest
from rag.utils.qdrant import get_qdrant_client, remove_points

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
        client_id = existing.project.client_id
        existing.status = 'processing'
        existing.save(update_fields=['status'])
        result = ingest(
            client_id=str(client_id),
            file_path=existing.file_raw.path,
            project_id=str(existing.project.id)
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
                "client_id": str(client_id),
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

@shared_task(bind=True)
def delete_document_task(self, document_id):
    """
    Celery task: delete all points for specific document from Qdrant
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
        client_id = existing.project.client_id
        project_id = existing.project.id

        remove_points(
            client=get_qdrant_client(),
            doc_id=document_id,
            client_id=str(client_id),
            project_id=str(project_id)
        )

        logger.info(f'Successfully Deleted the Document From Qdrant: {existing.filename}')
        existing.file_raw.delete(save=False)
        logger.info(f'Successfully Deleted the Document From Filesystem: {existing.filename}')

        existing.status = 'deleted'
        existing.save(update_fields=['status'])

    except Exception as exc:
        logger.exception(
            "Document Deletion failed",
            extra={
                "document_id": str(document_id),
                "client_id": str(client_id),
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


@shared_task
def sweep_deleted_documents():
    """
    Bulk-delete all Document rows with status='deleted'.

    Final step of the three-state deletion machine (Sprint 3.5) —
    Qdrant vectors and files are already gone by this point; only
    the empty Postgres row remains. Uses a single bulk .delete()
    call, not a per-row loop.

    Returns:
        None. Logs the count of rows deleted.
    """
    try:
        rows, _ = Document.objects.filter(status='deleted').delete()
        logger.info(f'Batch Deletion Successful: {rows} Deleted')
    except Exception:
        logger.exception(f'Failed to Delete Rows')