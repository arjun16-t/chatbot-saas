from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.generics import ListAPIView, RetrieveDestroyAPIView
from rest_framework import status

from django.db import transaction

from core.exceptions import IngestionFail

from .models import Document
from .serializers import DocumentSerializer

from rag.ingest import ingest
from rag.utils.qdrant import get_qdrant_client, remove_points
from utils.logger import get_logger

logger = get_logger(__name__)


class DocumentUploadView(APIView):
    """
    Authenticated endpoint for uploading and ingesting client documents.
    Creates a Document record with status='received', runs the file
    through the RAG ingestion pipeline, then updates the record with
    the resulting doc_id, chunk_count and final status.
    """

    def post(self, request: Request) -> Response:
        """
        Handles POST /api/documents/upload/

        Args:
            request: DRF request object containing the uploaded file.

        Returns:
            201 with document details on success.
            400 on validation error.
            500 on ingestion pipeline failure.
        """
        serializer = DocumentSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        original_filename = request.FILES['file_raw'].name
        file_size = request.FILES['file_raw'].size

        with transaction.atomic():
            document = serializer.save(
                client=request.user,
                original_filename=original_filename,
                file_size=file_size
            )
            logger.info(f'Successfully created the Document: {original_filename}')
        
        file_path = document.file_raw.path

        try:
            # document.status = 'processing'            Enable this after async and celery in sprint 3
            # document.save(update_fields=['status'])
            result = ingest(
                client_id=str(request.user.id), 
                file_path=file_path
            )
        except Exception:
            document.status = 'failed'
            document.save(update_fields=['status'])

            logger.exception(
                "Document ingestion failed",
                extra={
                    "document_id": str(document.id),
                    "client_id": str(request.user.id),
                },
            )
            raise IngestionFail()
        
        with transaction.atomic():
            document.filename = result['filename']
            document.doc_id = result['doc_id']
            document.file_hash = result['metadata']['file_hash']
            document.chunk_count = result['chunk_count']
            document.status = result['status']
            document.save()
            
            logger.info(f'Successfully updated the Document: {original_filename}')

        return Response(
            {
                'success': True,
                'message': f'{original_filename} Document uploaded successfully.',
                'data': {
                    'doc_id': result['doc_id'],
                    'chunk_count': result['chunk_count'],
                    'status': result['status'],
                }
            },
            status=status.HTTP_201_CREATED
        )

class DocumentListView(ListAPIView):
    """
    List all documents belonging to the authenticated client.

    GET /api/documents/

    Returns a paginated (or flat, depending on DRF settings) list of the
    requesting client's own Document rows. Never exposes documents
    belonging to other clients — the queryset is scoped to
    `request.user` before any lookup happens.

    Permissions:
        Requires authentication (JWT). Uses the default
        `IsAuthenticated` permission inherited from DRF settings.

    Returns:
        200 OK: list of serialized Document objects.
    """
    serializer_class = DocumentSerializer

    def get_queryset(self):
        """
        Restrict the base queryset to documents owned by the
        authenticated client.
        """
        queryset = (
            Document.objects
            .filter(client=self.request.user)
            .select_related("client")
            .order_by('created_at')
            .exclude(status__in=['deleting', 'deleted'])
        )
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        logger.debug('Successfully fetched documents for client=%s', request.user.id)
        return response

class DocumentRetrieveDestroyView(RetrieveDestroyAPIView):
    """
    Retrieve or delete a single document belonging to the authenticated client.

    GET    /api/documents/<uuid:doc_id>/  — retrieve document detail
    DELETE /api/documents/<uuid:doc_id>/  — delete document (Qdrant + file + Postgres)

    Lookup is by `doc_id` (the rag/ layer's deterministic uuid5 identifier,
    not the Postgres primary key), scoped to the authenticated client via
    get_queryset(). Documents with status 'deleting' or 'deleted' are
    excluded from the queryset entirely, so a repeated DELETE on a document
    already mid-deletion returns 404 rather than re-entering perform_destroy.

    Permissions:
        Requires authentication (JWT).

    Returns:
        GET:    200 OK with serialized document, or 404 if not found/owned.
        DELETE: 204 No Content on success, or 404 if not found/owned.
    """
    serializer_class = DocumentSerializer
    lookup_field = 'doc_id'

    def get_queryset(self):
        """
        Restrict the queryset to the authenticated client's own documents,
        excluding any currently mid-deletion or awaiting the periodic
        cleanup sweep (Sprint 4). Shared by both retrieve() and destroy()
        via get_object(), so the exclusion can't drift out of sync between
        the two operations.
        """
        return Document.objects.filter(
            client=self.request.user
        ).exclude(status__in=['deleting', 'deleted'])

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        logger.info('Successfully fetched document doc_id=%s', kwargs.get('doc_id'))
        return Response({'success': True, 'data': serializer.data}, status=status.HTTP_200_OK)

    def perform_destroy(self, instance: Document):
        """
        Delete a document across all three systems, in order:
        Qdrant vectors -> filesystem file -> Postgres status.

        The row is marked 'deleting' immediately (own committed write,
        before any external call) so that a process crash mid-deletion
        leaves a durable marker rather than silent inconsistent state.
        No automatic rollback on failure (accepted gap for dev phase) --
        recovery is deferred to Celery's retry/sweep mechanisms (Sprint 4).

        TODO: introduce a DeletionFail APIException (mirroring IngestionFail)
        once we confirm what failure modes remove_points actually raises,
        so failures here get a proper error envelope instead of an
        unhandled 500.
        
        TODO Sprint 4: once Celery is introduced, this should enqueue a task
        instead of running synchronously, and a periodic sweep task should
        bulk-delete all Document rows with status='deleted' once daily
        (single DB write regardless of volume), rather than this view
        ever deleting rows directly.

        Raises:
            RuntimeError: propagated from remove_points on genuine
                Qdrant-side failure. Currently uncaught -- bubbles up
                to custom_exception_handler as an unhandled exception.
        """
        instance.status = 'deleting'
        instance.save(update_fields=['status'])

        try:
            remove_points(
                client=get_qdrant_client(),
                doc_id=str(instance.doc_id),
                client_id=str(instance.client_id)
            )
            instance.file_raw.delete(save=False)
        except Exception:
            logger.exception(
                'Document deletion failed mid-flight for doc_id=%s',
                instance.doc_id
            )
            raise

        instance.status = 'deleted'
        instance.save(update_fields=['status'])