from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.generics import ListAPIView, RetrieveAPIView, DestroyAPIView
from rest_framework import status

from django.db import transaction

from .models import Document
from .serializers import DocumentSerializer

from rag.ingest import ingest
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
        if not serializer.is_valid():
            logger.warning(f'Document Validation failed: {serializer.errors}')
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
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
        except Exception as e:
            document.status = 'failed'
            document.save(update_fields=['status'])

            logger.exception(f'Ingestion Failed')
            return Response(
                {'error': 'Ingestion Failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
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
                'message': f'{original_filename} Document uploaded successfully.',
                'status': result['status'],
                'doc_id': result['doc_id'],
                'chunk_count': result['chunk_count']
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
        )
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        logger.debug('Successfully fetched documents for client=%s', request.user.id)
        return response


class DocumentDetailView(RetrieveAPIView):
    """
    Retrieve a single document belonging to the authenticated client.

    GET /api/documents/<uuid:doc_id>/

    Looks up a Document by its `doc_id` (the rag/ layer's deterministic
    uuid5 identifier — NOT the Postgres primary key `id`), but only
    within the authenticated client's own documents. A doc_id that
    exists under a different client returns 404, identical to a
    doc_id that doesn't exist at all — this is intentional and
    prevents leaking information about other tenants' data.

    Permissions:
        Requires authentication (JWT).

    Returns:
        200 OK: serialized Document object.
        404 Not Found: doc_id does not exist under this client.
    """
    serializer_class = DocumentSerializer
    lookup_field = "doc_id"

    def get_queryset(self):
        """
        Restrict the base queryset to documents owned by the
        authenticated client. DRF's get_object() will further filter
        this queryset by `doc_id` (from the URL) before returning a
        single row or raising Http404.
        """
        return Document.objects.filter(client=self.request.user)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        logger.info('Successfully fetched document doc_id=%s', kwargs.get('doc_id'))
        return Response(
            {'success': True, 'data': serializer.data},
            status=status.HTTP_200_OK
        )


class DocumentDeleteView(DestroyAPIView):
    """
    Delete a single document belonging to the authenticated client.

    DELETE /api/documents/<uuid:doc_id>/

    Deletion must be coordinated across THREE systems, in a defined
    order, since there is no cross-database transaction spanning
    Postgres, Qdrant, and the filesystem:

        1. Qdrant   — remove_points(doc_id, client_id) from rag/utils/qdrant.py
        2. Filesystem — delete the file at document.file_raw.path
        3. Postgres — delete the Document row itself (perform_destroy)

    TODO (decide and document the ordering rationale):
        Consider deleting in an order such that if a step fails partway,
        the system is left in the SAFEST inconsistent state rather than
        the worst one. E.g. ask yourself: would you rather have an
        orphaned Qdrant vector with no Postgres row (silent, invisible
        leftover data), or a Postgres row with no Qdrant vectors
        (visible -- client can still see the doc in a list call,
        re-attempt delete, or you can write a cleanup job)?

        Also consider: should failures in step 1 or 2 block step 3
        (the Postgres delete), or should Postgres delete proceed
        regardless and failures just get logged for a reconciliation
        job to catch later?

    Permissions:
        Requires authentication (JWT).

    Returns:
        204 No Content: deletion succeeded.
        404 Not Found: doc_id does not exist under this client.
        500 Internal Server Error: a downstream delete step failed
            (exact behavior depends on the ordering decision above).
    """
    serializer_class = DocumentSerializer
    lookup_field = "doc_id"

    def get_queryset(self):
        """
        Restrict the base queryset to documents owned by the
        authenticated client.

        TODO: filter Document.objects by `client=self.request.user`.
        """
        pass

    def perform_destroy(self, instance):
        """
        Override DRF's default perform_destroy (which just calls
        instance.delete()) to also tear down the Qdrant vectors and
        the file on disk, in the order decided above.

        TODO:
            1. Call remove_points(doc_id=instance.doc_id,
               client_id=str(instance.client_id)) from rag/utils/qdrant.py
            2. Delete instance.file_raw from disk (instance.file_raw.delete(save=False))
            3. Call instance.delete() (or super().perform_destroy(instance))

        Wrap in try/except per step — log failures via the configured
        logger rather than letting an unhandled exception bubble into
        a generic 500 with no trace of which step failed.
        """
        pass