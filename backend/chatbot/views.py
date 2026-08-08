from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from rest_framework import status

from rest_framework_simplejwt.authentication import JWTAuthentication

from core.exceptions import ChatbotUnavailable
from core.permissions import ProjectDomainPermission, WidgetEnabledPermission
from core.authentication import ProjectAPIKeyAuthentication
from core.throttling import ClientProjectThrottle
from core.models import Project

from .models import UnansweredQuery
from .serializers import QuerySerializer

from rag.query import query as query_rag
from utils.logger import get_logger
from utils.client_project import get_client_project

logger = get_logger(__name__)

class ChatView(APIView):
    authentication_classes = [JWTAuthentication, ProjectAPIKeyAuthentication]
    permission_classes = [IsAuthenticated, ProjectDomainPermission, WidgetEnabledPermission]
    throttle_classes = [ClientProjectThrottle]

    def post(self, request) -> Response:
        serializer = QuerySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        question = serializer.validated_data['question']
        client_id = str(request.user.id)

        if isinstance(request.auth, Project):
            project_id = str(request.auth.id)
        else:
            project_id_param = request.data.get('project_id')
            if not project_id_param:
                raise ValidationError({"project_id": "This field is required for dashboard/JWT queries."})
            project = get_client_project(request, project_id_param)
            project_id = str(project.id)

        try:
            result = query_rag(question, client_id, project_id)
        except Exception as e:
            logger.exception(f'Query Pipeline Failed')
            raise ChatbotUnavailable()

        response = {
            "answer": result['answer'],
            "sources": result['used_sources'],
            "status": result['status'],
            "latency_ms": result['metadata']['latency_ms']
        }

        if result['status'] == 'unanswered':
            UnansweredQuery.objects.create(
                client=request.user,
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