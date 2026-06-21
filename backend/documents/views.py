from rest_framework.views import APIView
from rest_framework.response import Response
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

    def post(self, request) -> Response:
        """
        Handles POST /api/documents/upload/

        Args:
            request: DRF request object containing the uploaded file.

        Returns:
            201 with document details on success.
            400 on validation error.
            500 on ingestion pipeline failure.
        """
        # TODO: validate incoming file via DocumentSerializer
        # TODO: derive original_filename from request.FILES['file_raw'].name
        # TODO: create Document with status='received', client=request.user
        #       (use serializer.save(client=..., original_filename=...))
        # TODO: get filesystem path via document.file_raw.path
        # TODO: call ingest(file_path, client_id=str(request.user.id))
        #       wrap in try/except — on failure, set status='failed' and save, return 500
        # TODO: on success, update document with doc_id, chunk_count,
        #       filename (system-generated from ingest result), and status from result
        # TODO: log the outcome
        # TODO: return serialized document with 201
        pass