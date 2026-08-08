from celery import shared_task
from django.utils import timezone

from .models import OTPVerification, Project
from documents.models import Document

from utils.logger import get_logger
from rag.utils.qdrant import get_qdrant_client, delete_project as delete_project_vectors

logger = get_logger(__name__)

@shared_task
def cleanup_expired_otps():
    """
    Deletes all OTPVerification rows past their expiry.
    Scheduled daily via django-celery-beat.
    """
    deleted_count, _ = OTPVerification.objects.filter(
        expires_at__lt=timezone.now()
    ).delete()
    logger.info(f'Cleaned up {deleted_count} expired OTP rows')

@shared_task
def delete_project_task(project_id, client_id):
    """
    Celery task: full cleanup for a project marked is_deleted=True.

    Order: Qdrant vectors -> files (per-document, storage-abstraction-safe,
    same pattern as delete_document_task) -> Document rows -> Project row.

    Args:
        project_id: UUID string of the project being deleted.
        client_id: UUID string of the owning client (for Qdrant filter).
    """
    try:
        delete_project_vectors(
            client=get_qdrant_client(),
            project_id=project_id,
            client_id=client_id,
        )
        logger.info(f'Deleted Qdrant vectors for project: {project_id}')

        documents = Document.objects.filter(project_id=project_id)
        for doc in documents:
            doc.file_raw.delete(save=False)
        deleted_count = documents.count()
        documents.delete()
        logger.info(f'Deleted {deleted_count} document rows/files for project: {project_id}')

        Project.objects.filter(id=project_id).delete()
        logger.info(f'Project fully deleted: {project_id}')

    except Exception:
        logger.exception(
            "Project deletion failed",
            extra={"project_id": project_id, "client_id": client_id},
        )