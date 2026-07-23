from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.serializers import ValidationError

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db import IntegrityError
from django.conf import settings

import secrets
import hashlib

from .models import Project
from .serializers import ClientSerializer, ProjectSerializer, CustomTokenSerializer

from utils.logger import get_logger
from utils.token_obtain import set_refresh_cookie

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
        
        refresh = RefreshToken.for_user(client)
        response = Response(
            {
                "success": True,
                "message": "Client registered successfully.",
                "data": {
                    "access": str(refresh.access_token),
                    "client_id": str(client.id),
                    "email": client.email
                }
            },
            status=status.HTTP_201_CREATED
        )

        return set_refresh_cookie(response, refresh)

class LoginClientView(TokenObtainPairView):
    """
    Public endpoint for client login. Validates credentials via
    CustomTokenSerializer, returns the access token in the response
    body, and sets the refresh token as an httpOnly cookie.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Handles POST /api/auth/login/

        Args:
            request: DRF request object containing email and password.

        Returns:
            200 with access token, client_id, and email on success.
                Sets a rotated refresh_token cookie.
            400 if credentials are invalid (handled by
                custom_exception_handler via ValidationError).
        """
        serializer = CustomTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        client = serializer.user
        
        refresh = serializer.validated_data.get("refresh")

        response = Response(
            {
                "success": True,
                "message": "Client Logged in Successfully.",
                "data": {
                    "access": str(serializer.validated_data.get("access")),
                    "client_id": str(client.id),
                    "email": client.email
                }
            },
            status=status.HTTP_200_OK
        )

        return set_refresh_cookie(response, refresh)

class RefreshClientView(TokenRefreshView):
    """
    Reads the refresh token from an httpOnly cookie instead of the
    request body, validates it via TokenRefreshSerializer, and
    rotates the refresh cookie on success.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Handles POST /api/auth/token/refresh/

        Args:
            request: DRF request object. Refresh token expected in
                the 'refresh_token' cookie, not the request body.

        Returns:
            200 with a new access token in the body on success.
                Sets a rotated refresh_token cookie.
            401 if the cookie is missing or the token is invalid/expired.
        """
        refresh_token = request.COOKIES.get('refresh_token')
        if not refresh_token:
            return Response(
                {"success": False, "message": "Refresh token missing.", "code": "no_refresh_cookie"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        serializer = self.get_serializer(data={"refresh": refresh_token})
        serializer.is_valid(raise_exception=True)

        access = serializer.validated_data.get("access")
        refresh = serializer.validated_data.get("refresh")

        response = Response(
            {
                "success": True,
                "message": "Token Refreshed",
                "data": {
                    "access": access,
                }
            }, status=status.HTTP_200_OK
        )

        return set_refresh_cookie(response, refresh)

class LogoutClientView(APIView):
    """
    Authenticated endpoint that blacklists the client's refresh token
    and clears the refresh_token cookie, ending the session.
    """
    def post(self, request):
        """
        Handles POST /api/auth/logout/

        Args:
            request: DRF request object. Requires a valid access
                token (IsAuthenticated). Refresh token read from cookie.

        Returns:
            205 on success, with the refresh_token cookie cleared.
                Missing or already-invalid refresh cookies are treated
                as a no-op, not an error.
        """
        refresh_token = request.COOKIES.get('refresh_token')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                pass

        response = Response(
            {
                "success": True,
                "message": "Client Logged Out successfully.",
                "data": {
                    "client_id": str(request.user.id)
                }
            }, status=status.HTTP_205_RESET_CONTENT
        )
        response.delete_cookie("refresh_token")
        return response


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