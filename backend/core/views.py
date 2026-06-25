from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from django.db import transaction
from django.conf import settings

from .models import Client, Project
from .serializers import ClientSerializer, ProjectSerializer

from utils.logger import get_logger

logger = get_logger(__name__)

class RegisterClientView(APIView):
    """
    Public endpoint for business client registration.
    Creates a new Client account and returns a one-time API key.
    The raw API key is shown exactly once and never stored — client
    must save it immediately.
    """
    permission_classes = [AllowAny]

    def post(self, request) -> Response:
        """
        Handles POST /api/auth/register/
        
        Args:
            request: DRF request object containing email, password, subscription_plan.
        
        Returns:
            201 with client_id, email and api_key on success.
            400 with validation errors on failure.
        """
        serializer = ClientSerializer(data = request.data)

        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            client = serializer.save()
            logger.info(f'Client Object Registered: {str(client.id)} ({client.email})')


        return Response(
            {
                "status": True,
                "message": "Client registered successfully.",
                "data": {
                    "client_id": str(client.id),
                    "email": client.email
                }
            },
            status=status.HTTP_201_CREATED
        )


class ProjectListCreateView(ListCreateAPIView):
    """
    GET  /api/projects/  -- list authenticated client's projects
    POST /api/projects/  -- create a new project, returns raw API key once
    """
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return Project.objects.filter(client=self.request.user)

    def create(self, request, *args, **kwargs):
        """
        TODO: validate name/domain via serializer, then call
        Project.objects.create_project_with_api_key(client=request.user, ...)
        instead of serializer.save() -- this view bypasses normal
        ModelSerializer.save() since key generation needs the manager.
        Return {'success': True, 'data': {..., 'api_key': raw_key}}.
        """
        pass


class ProjectRotateKeyView(APIView):
    """
    POST /api/projects/<uuid:pk>/rotate/
    Issues a new API key for an existing project. Old key is
    immediately invalid. Project row is unchanged otherwise.
    """
    def post(self, request, pk):
        """
        TODO: fetch Project scoped to request.user (404 if not owned),
        generate new key + hash via secrets.token_urlsafe(32),
        save api_key_hash, return raw key once.
        """
        pass


class ProjectRevokeView(APIView):
    """
    PATCH /api/projects/<uuid:pk>/revoke/
    Soft-revokes a project's API key by setting is_active=False.
    Row and history are preserved.
    """
    def patch(self, request, pk):
        """
        TODO: fetch Project scoped to request.user (404 if not owned),
        set is_active=False, save(update_fields=['is_active']).
        """
        pass