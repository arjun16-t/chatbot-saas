from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
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