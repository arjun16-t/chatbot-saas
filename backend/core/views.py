from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.serializers import ValidationError

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db import IntegrityError

import secrets
import hashlib

from .models import Project
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
                "success": True,
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
        serializer = self.serializer_class(data = request.data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                project = serializer.save(client=request.user)
        except IntegrityError:
            raise ValidationError(
                {"domain": "A project with this domain already exists for your account."}
            )

        logger.info(f'New Project created: {project.name} for Client: {str(project.client_id)}')
        
        return Response(
            {
                "success": True,
                "message": "Project registered successfully.",
                "data": {
                    "client_id": str(project.client_id),
                    "name": project.name,
                    "api_key": project._raw_api_key,
                    "is_active": project.is_active
                }
            },
            status=status.HTTP_201_CREATED
        )


class ProjectRotateKeyView(APIView):
    """
    POST /api/projects/<uuid:pk>/rotate/

    Issues a new API key for an existing project owned by the
    authenticated client. Old key is immediately invalid.
    Rotating always reactivates the project (is_active=True),
    even if it was previously revoked -- client must explicitly
    revoke again if that wasn't intended.
    """
    def post(self, request, pk):
        project = get_object_or_404(Project, client=request.user, pk=pk)


        new_api_key = "ac_" + secrets.token_urlsafe(32)
        new_api_hash = hashlib.sha256(new_api_key.encode()).hexdigest()

        with transaction.atomic():
            project.api_key_hash = new_api_hash
            project.is_active = True
            project.save(update_fields=['api_key_hash', 'is_active'])
        
        return Response(
            {
                "success": True,
                "message": "New API key successfully generated",
                "data": {
                    "client_id": str(project.client_id),
                    "name": project.name,
                    "api_key": new_api_key,
                    "is_active": project.is_active
                }
            },
            status=status.HTTP_200_OK
        )


class ProjectRevokeView(APIView):
    """
    PATCH /api/projects/<uuid:pk>/revoke/

    Soft-revokes a project's API key by setting is_active=False.
    Row and history are preserved.
    """
    def patch(self, request, pk):
        project = get_object_or_404(Project, client=request.user, pk=pk)

        project.is_active = False
        project.save(update_fields=['is_active'])
        
        return Response(
            {
                "success": True,
                "message": "API key successfully revoked",
                "data": {
                    "client_id": str(project.client_id),
                    "name": project.name,
                    "is_active": project.is_active
                }
            },
            status=status.HTTP_200_OK
        )