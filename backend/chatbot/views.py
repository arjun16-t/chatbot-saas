# ruff : noqa: RUF012
from core.authentication import ProjectAPIKeyAuthentication
from core.crypto import decrypt_groq_key
from core.exceptions import ChatbotUnavailable, GroqKeyInvalid, GroqKeyRequired
from core.mixins import EnvelopeResponseMixin
from core.models import Project
from core.permissions import ProjectDomainPermission, WidgetEnabledPermission
from core.throttling import ClientProjectThrottle
from cryptography.fernet import InvalidToken
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from utils.client_project import get_client_project
from utils.logger import get_logger

from rag.query import query as query_rag

from .models import UnansweredQuery
from .serializers import QuerySerializer, UnansweredQuerySerializer

logger = get_logger(__name__)

class ChatView(APIView):
    authentication_classes = [JWTAuthentication, ProjectAPIKeyAuthentication]
    permission_classes = [IsAuthenticated, ProjectDomainPermission, WidgetEnabledPermission]
    throttle_classes = [ClientProjectThrottle]

    def post(self, request) -> Response:
        serializer = QuerySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        question = serializer.validated_data['question']
        client = request.user
        client_id = str(client.id)

        if not client.has_groq_key:
            raise GroqKeyRequired()
        
        try:
            groq_api_key = decrypt_groq_key(client.groq_api_key_encrypted)
        except InvalidToken:
            logger.error(f"Groq key decryption failed for client {client.id} — possible GROQ_ENCRYPTION_KEY mismatch")
            raise GroqKeyInvalid()
        
        if isinstance(request.auth, Project):
            project = request.auth
        else:
            project_id_param = request.data.get('project_id')
            if not project_id_param:
                raise ValidationError({"project_id": "This field is required for dashboard/JWT queries."})
            project = get_client_project(request, project_id_param)

        project_id = str(project.id)

        try:
            result = query_rag(
                question=question,
                client_id=client_id,
                project_id=project_id,
                groq_api_key=groq_api_key
            )
        except Exception:
            logger.exception('Query Pipeline Failed')
            raise ChatbotUnavailable()

        response = {
            "answer": result['answer'],
            "sources": result['used_sources'],
            "status": result['status'],
            "latency_ms": result['metadata']['latency_ms']
        }

        if result['status'] == 'unanswered':
            UnansweredQuery.objects.create(
                project=project,
                query=result['query']
            )
            logger.info(f"Unanswered Query: {result['query']} Saved!")

        logger.info(
            "Query processed",
            extra={
                "query": result["query"],
                "project_id": project_id,
                "latency_ms": response["latency_ms"],
                "status": result["status"]
            }
        )

        return Response(
            {
                "success": True,
                "message": "Query processed successfully",
                "data": response
            }, status=status.HTTP_200_OK
        )

class UnansweredPagination(PageNumberPagination):
    page_size = 20

class UnansweredListView(EnvelopeResponseMixin, ListAPIView):
    serializer_class = UnansweredQuerySerializer
    pagination_class = UnansweredPagination
    success_message = "Unanswered Queries fetched successfully."

    def get_queryset(self):
        project = get_client_project(self.request, self.kwargs.get("project_id"))
        queryset = UnansweredQuery.objects.filter(
            project=project
        )
        
        is_resolved_filter = self.request.query_params.get('is_resolved')
        if is_resolved_filter:
            queryset = queryset.filter(is_resolved=is_resolved_filter)

        return queryset

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return response

class UnansweredRetrieveUpdateDestroyView(EnvelopeResponseMixin, RetrieveUpdateDestroyAPIView):
    serializer_class = UnansweredQuerySerializer
    lookup_url_kwarg = 'id'
    success_message = "Unanswered Query Updated Successfully."

    def get_queryset(self):
        project = get_client_project(self.request, self.kwargs.get("project_id"))
        queryset = UnansweredQuery.objects.filter(
            project=project
        )
        return queryset

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {"success": True, "message": "Unanswered query deleted successfully", "data": None},
            status=status.HTTP_200_OK,
        )

class UnansweredBulkActionView(APIView):
    """
    POST /api/projects/<uuid:project_id>/unanswered/bulk/
    Bulk-resolves, bulk-unresolves, or bulk-deletes a set of
    UnansweredQuery rows for a single project. Single DB write
    regardless of selection size -- same pattern as
    sweep_deleted_documents / delete_project_task.

    Body: {"ids": [1, 2, 3], "action": "delete" | "resolve" | "unresolve"}
    """
    def post(self, request, project_id):
        project = get_client_project(request, project_id)

        ids = request.data.get('ids')
        action = request.data.get('action')

        if not isinstance(ids, list) or not ids:
            raise ValidationError({"ids": "Provide a non-empty list of query IDs."})
        if action not in {'delete', 'resolve', 'unresolve'}:
            raise ValidationError({"action": "action must be one of: delete, resolve, unresolve."})

        queryset = UnansweredQuery.objects.filter(project=project, id__in=ids)

        if action == 'delete':
            affected, _ = queryset.delete()
        else:
            affected = queryset.update(is_resolved=(action == 'resolve'))

        return Response(
            {
                "success": True,
                "message": f"{affected} quer{'y' if affected == 1 else 'ies'} updated",
                "data": {"affected": affected},
            },
            status=status.HTTP_200_OK,
        )