from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.generics import ListAPIView, RetrieveDestroyAPIView
from rest_framework import status

from django.db import transaction

from kombu.exceptions import OperationalError

from .models import Document
from .serializers import DocumentSerializer
from .tasks import ingest_document_task, delete_document_task

from rag.ingest import generate_doc_id
from rag.utils.qdrant import get_qdrant_client, remove_points

from utils.logger import get_logger
from utils.files import compute_uploaded_file_hash
from utils.client_project import get_client_project

logger = get_logger(__name__)


class DocumentUploadView(APIView):
    """
    Authenticated endpoint for uploading and enqueuing client documents
    for asynchronous ingestion.
    """

    def post(self, request: Request) -> Response:
        """
        Handles POST /api/documents/upload/

        Args:
            request: DRF request object containing the uploaded file.

        Returns:
            202 with document details on success.
            400 on validation error.
        """
        uploaded_file = request.FILES['file_raw']
        original_filename = uploaded_file.name
        file_size = uploaded_file.size

        client = request.user                           # Client Object
        project = get_client_project(request, self.kwargs.get("project_id"))      # Project
        
        # --- PRE-INGEST DEDUP CHECK ---
        doc_id = generate_doc_id(str(project.id), original_filename)

        # use filter here since we want silent failure
        existing = Document.objects.filter(
            project_id=project.id,          # Filter by client not required here
            doc_id=doc_id
        ).first()

        file_hash = compute_uploaded_file_hash(uploaded_file)
        uploaded_file.seek(0)

        # File Exists Already
        if existing and existing.file_hash == file_hash:
            logger.info(f'{original_filename} ({doc_id}) already exists, skipped!')
            return Response(
                {
                    'success': True,
                    'message': f'{original_filename} Document already exists.',
                    'data': {
                        'doc_id': str(doc_id),
                        'chunk_count': existing.chunk_count,
                        'status': 'duplicate',
                    }
                },
                status=status.HTTP_201_CREATED
            )
        
        # File Exists but is updated
        if existing and existing.file_hash != file_hash:
            existing.status = 'received'
            existing.save(update_fields=['status']) 
            
            remove_points(
                client=get_qdrant_client(),
                doc_id=str(existing.doc_id),
                client_id=str(existing.project.client_id)
            )

            document = existing
            serializer = DocumentSerializer(document, data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            with transaction.atomic():
                document = serializer.save(
                    project=project,
                    original_filename=original_filename,
                    file_size=file_size,
                    file_hash=file_hash
                )
                logger.info('Updated existing Document row for re-ingestion: doc_id=%s', doc_id)
        
        # New File
        else:
            serializer = DocumentSerializer(
                data=request.data,
                context={'request': request}
            )
            serializer.is_valid(raise_exception=True)

            with transaction.atomic():
                document = serializer.save(
                    project=project,
                    original_filename=original_filename,
                    file_size=file_size,
                    status='received',
                    doc_id=doc_id,
                    file_hash=file_hash
                )
            logger.info(f'Successfully created the Document: {original_filename}')
        
        try:
            ingest_document_task.delay(document.doc_id)

        except OperationalError:
            logger.warning(f"Failed to enqueue ingestion task for document: {document.doc_id}")

        return Response(
            {
                'success': True,
                'message': f'{original_filename} Document uploaded successfully.',
                'data': {
                    'doc_id': document.doc_id,
                    'status': document.status,
                }
            },
            status=status.HTTP_202_ACCEPTED
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
        project = get_client_project(self.request, self.kwargs.get("project_id"))
        queryset = (
            Document.objects
            .filter(project=project)
            .order_by('created_at')
            .exclude(status__in=['deleting', 'deleted'])
        )
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
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
        project = get_client_project(self.request, self.kwargs.get("project_id"))
        return Document.objects.filter(
            project=project
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
        """
        instance.status = 'deleting'
        instance.save(update_fields=['status'])

        try:
            delete_document_task.delay(instance.doc_id)
        except OperationalError:
            logger.warning('Failed to enqueue deletion task for doc_id=%s', instance.doc_id)