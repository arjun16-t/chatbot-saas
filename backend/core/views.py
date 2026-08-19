from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.serializers import ValidationError
from rest_framework.exceptions import PermissionDenied

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

from django.db import transaction, IntegrityError
from django.db.models import Count
from django.core.validators import EmailValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone

import secrets
import hashlib
from urllib.parse import urlparse
from datetime import timedelta

from .models import Project, Client, OTPVerification
from .serializers import (
    ClientSerializer,
    ClientProfileSerializer,
    ChangePasswordSerializer,
    ProjectSerializer,
    CustomTokenSerializer,
    ProjectThemeConfigSerializer,
    ProjectDetailSerializer,
)
from .permissions import ProjectDomainPermission
from .authentication import ProjectAPIKeyAuthentication
from .tasks import delete_project_task
from .crypto import encrypt_groq_key
from .mixins import EnvelopeResponseMixin

from utils.logger import get_logger
from utils.token_obtain import set_refresh_cookie
from utils.client_project import get_client_project, get_owned_project
from utils.otp import create_and_send_otp
from utils.validators import validate_groq_key
from utils.custom_responses import success_response

logger = get_logger(__name__)

class SendOTPView(APIView):
    """
    POST /api/auth/send-otp/
    Body: {email}
    Rejects if a Client with this email already exists.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        validator = EmailValidator(code="invalid_email")
        try:
            validator(email)
        except DjangoValidationError:
            raise ValidationError({"email": "Enter a valid email address."})

        if Client.objects.filter(email=email).exists():
            return Response(
            {
                "success": False,
                "message": "Client Already Exists.",
                "data": {
                    "email": email,
                }
            },
            status=status.HTTP_409_CONFLICT
        )

        otp_row = create_and_send_otp(email)
        return Response({
            "success": True,
            "message": "OTP Generated Successfully.",
            "data": {
                "email": email
            }
        }, status=status.HTTP_200_OK)

class VerifyOTPView(APIView):
    """
    POST /api/auth/verify-otp/
    Body: {email, otp}
    Marks OTPVerification.is_verified = True. Does NOT create Client.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()
        otp = request.data.get("otp", "").strip()
        if not email or not otp:
            return Response({
                "success": False,
                "message": "Email and OTP both required",
                "data": {
                    "email": email
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            otp_row = OTPVerification.objects.filter(
                email=email,
                is_verified=False
            ).latest('created_at')
            
        except OTPVerification.DoesNotExist:
            logger.exception(f'{email} does not exist')
            return Response({
                "success": False,
                "message": "email does not exist",
                "data": {
                    "email": email
                }
            }, status=status.HTTP_404_NOT_FOUND)

        is_valid, msg = otp_row.verify(otp)
        if not is_valid:
            return Response({
                "success": False,
                "message": msg,
                "data": {
                    "email": email
                }
            }, status=status.HTTP_400_BAD_REQUEST) 

        # OTP Verified Successfully
        return Response({
            "success": True,
            "message": msg,
            "data": {
                "email": email
            }
        }, status=status.HTTP_200_OK) 

class ResendOTPView(APIView):
    """
    POST /api/auth/resend-otp/
    Body: {email}
    Same as SendOTPView but conceptually a distinct trigger from the frontend.
    # decide: rate-limit resend attempts? (e.g. min interval between sends)
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        validator = EmailValidator(code="invalid_email")
        try:
            validator(email)
        except DjangoValidationError:
            raise ValidationError({"email": "Enter a valid email address."})

        try:
            otp_row = OTPVerification.objects.filter(
                email=email,
                is_verified=False
            ).latest('created_at')

            # Generate new OTP
            if otp_row:
                time_elapsed = timezone.now() - otp_row.created_at
                if time_elapsed < timedelta(seconds=30):
                    remaining = 30 - int(time_elapsed.total_seconds())
                    return Response(
                        {'error': f'Please wait {remaining} seconds before requesting a new OTP.'},
                        status=status.HTTP_429_TOO_MANY_REQUESTS
                    )
                
            # Delete existing unverified OTPs
            OTPVerification.objects.filter(
                email=email,
                is_verified=False
            ).delete()
        
        except OTPVerification.DoesNotExist:
            logger.exception(f'{email} does not exist')
            return Response({
                "success": False,
                "message": "email does not exist",
                "data": {
                    "email": email
                }
            }, status=status.HTTP_404_NOT_FOUND)

        otp_row = create_and_send_otp(email)
        return Response({
            "success": True,
            "message": "OTP Regenerated Successfully.",
            "data": {
                "email": email
            }
        }, status=status.HTTP_200_OK)

class RegisterClientView(APIView):
    """
    POST /api/auth/register/
    Body: {email, password, display_name (optional)}
    Requires a verified, unexpired OTPVerification row for this email.
    """
    permission_classes = [AllowAny]

    def post(self, request) -> Response:
        email = request.data.get("email", "").strip()

        try:
            otp_row = OTPVerification.objects.filter(
                email=email,
                is_verified=True
            ).latest('created_at')
        except OTPVerification.DoesNotExist:
            return Response({
                "success": False,
                "message": "Email not verified. Please verify OTP first.",
                "data": {"email": email}
            }, status=status.HTTP_400_BAD_REQUEST)

        if otp_row.is_expired():
            return Response({
                "success": False,
                "message": "Verification expired. Please request a new OTP.",
                "data": {"email": email}
            }, status=status.HTTP_400_BAD_REQUEST)
        
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
                    "email": client.email,
                    "display_name": client.display_name,
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
                    "email": client.email,
                    "display_name": client.display_name,
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

class ClientProfileView(EnvelopeResponseMixin, RetrieveUpdateAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = ClientProfileSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        client = request.user
        old_password = serializer.validated_data['old_password']
        new_password = serializer.validated_data['new_password']

        if not client.check_password(old_password):
            raise ValidationError("Current password is incorrect.")

        client.set_password(new_password)
        client.save(update_fields=['password'])

        current_jti = None      # JWT ID Claim
        cookie_value = request.COOKIES.get('refresh_token')
        if cookie_value:
            try:
                current_jti = RefreshToken(cookie_value)['jti']
            except TokenError:
                pass
        
        outstanding = OutstandingToken.objects.filter(user=client)
        if current_jti:
            outstanding = outstanding.exclude(jti=current_jti)
        
        BlacklistedToken.objects.bulk_create(
            [BlacklistedToken(token=t) for t in outstanding],
            ignore_conflicts=True,
        )

        return success_response(
            message="Password updated. You've been logged out on all other devices."
        )

class ProjectListCreateView(ListCreateAPIView):
    """
    GET  /api/projects/  -- list authenticated client's projects
    POST /api/projects/  -- create a new project, returns raw API key once
    """
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return Project.objects.filter(
            client=self.request.user,
            is_deleted=False
        ).annotate(
            document_count=Count('documents')
        )

    def create(self, request, *args, **kwargs):
        serializer = self.serializer_class(data = request.data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                project = serializer.save(client=request.user)
        except IntegrityError as e:
            raise ValidationError(
                {"domain": f"A project with this domain already exists for your account. {e}"}
            )

        logger.info(f'New Project created: {project.name} for Client: {str(project.client_id)}')
        
        return Response(
            {
                "success": True,
                "message": "Project registered successfully.",
                "data": {
                    "id": str(project.id),
                    "client_id": str(project.client_id),
                    "name": project.name,
                    "api_key": project._raw_api_key,
                    "is_active": project.is_active
                }
            },
            status=status.HTTP_201_CREATED
        )

class CheckDomainAvailabilityView(APIView):
    """
    GET /api/projects/check-domain/?domain=

    Inline-validation helper for the project creation wizard's
    Step 1 -- returns whether a domain is free for this client to
    use in a new project.
    """
    def get(self, request):
        raw = request.query_params.get('domain', '')
        if not raw.strip():
            raise ValidationError({"domain": "Domain is required."})

        value = raw.strip()
        if '://' not in value:
            value = "https://" + value
        parsed = urlparse(value)
        normalized = parsed.netloc.strip().lower()

        host = normalized.split(':')[0]
        if host not in {'localhost', '127.0.0.1'} and '.' not in host:
            raise ValidationError({"domain": "Enter a valid domain (e.g. example.com) or 'localhost'."})

        is_taken = Project.objects.filter(
            client=request.user, domain=normalized, is_deleted=False
        ).exists()

        return Response(
            {
                "success": True,
                "message": "Domain checked",
                "data": {"domain": normalized, "available": not is_taken},
            },
            status=status.HTTP_200_OK,
        )

class ProjectConfigView(APIView):
    """
    GET: fetch widget theme config (dashboard JWT or widget API-key).
    PATCH: update widget theme config (dashboard JWT only).
    """
    authentication_classes = [JWTAuthentication, ProjectAPIKeyAuthentication]
    permission_classes = [IsAuthenticated, ProjectDomainPermission]

    def get_object(self, request, project_id):
        """
        Resolve the Project for this request, enforcing ownership.

        Args:
            request: DRF request (request.auth is Project if API-key path, else None)
            project_id: UUID from URL

        Returns:
            Project instance

        Raises:
            Http404: JWT path, client doesn't own this project
            PermissionDenied: API-key path, key's project doesn't match URL project_id
        """
        if isinstance(request.auth, Project):
            if str(request.auth.id) != str(project_id):
                raise PermissionDenied("This API key does not belong to the requested project.")
            return request.auth
        return get_client_project(request, project_id)

    def get(self, request, project_id):
        project = self.get_object(request, project_id)
        serializer = ProjectThemeConfigSerializer(project, context={'request': request})
        return Response(serializer.data)

    def patch(self, request, project_id):
        if isinstance(request.auth, Project):
            raise PermissionDenied("Widget API keys cannot modify project config.")
        project = self.get_object(request, project_id)
        serializer = ProjectThemeConfigSerializer(project, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


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
        project = get_owned_project(request, pk)


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
        project = get_owned_project(request, pk)

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

class WidgetConfigView(APIView):
    """
    GET /api/widget/config/
    Key-only config endpoint for the embedded widget. Resolves the
    project purely from the API key (request.auth) — no project_id
    in the URL, since the widget never knows its own UUID.
    """
    authentication_classes = [ProjectAPIKeyAuthentication]
    permission_classes = [IsAuthenticated, ProjectDomainPermission]

    def get(self, request):
        project = request.auth
        serializer = ProjectThemeConfigSerializer(project, context={'request': request})
        return Response(serializer.data)

class ProjectDetailUpdateView(APIView):
    """
    PATCH /api/projects/<uuid:pk>/details/

    Updates a project's name, domain, and/or widget_enabled flag.
    Ownership-scoped via client=request.user. Does not touch
    api_key_hash -- that remains rotate/revoke-only.
    """
    def patch(self, request, pk):
        project = get_owned_project(request, pk)

        serializer = ProjectDetailSerializer(project, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(
            {
                "success": True,
                "message": "Project updated successfully",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

class ProjectDeleteView(APIView):
    """
    DELETE /api/projects/<uuid:pk>/
    Immediately hides the project (is_active=False, is_deleted=True)
    and enqueues async cleanup. Client sees it gone right away;
    Qdrant/file/row cleanup happens in the background.
    """
    def delete(self, request, pk):
        project = get_owned_project(request, pk)
        with transaction.atomic():
            project.is_active = False
            project.is_deleted = True
            project.save(update_fields=['is_active', 'is_deleted'])

        delete_project_task.delay(str(project.id), str(project.client_id))

        return Response(
            {"success": True, "message": "Project deletion started", "data": None},
            status=status.HTTP_202_ACCEPTED
        )


class GroqKeyView(APIView):
    """
    Manage the authenticated client's BYOK Groq key.

    GET    -> {"is_set": bool, "set_at": datetime|null}
              Never returns the key itself, encrypted or otherwise.
    PATCH  -> body: {"groq_api_key": "gsk_..."}
              Encrypts and stores. Strip whitespace, reject blank.
              Consider a loose format sanity check (e.g. non-empty,
              reasonable length) but NOT a live validation call to
              Groq — that's explicitly deferred.
    DELETE -> clears groq_api_key_encrypted and groq_key_set_at.
              A free-tier client who does this immediately loses
              chat access on next request — that's the intended
              behavior, not a bug to guard against.

    permission_classes = [IsAuthenticated]
    (JWT only — this is a dashboard-only endpoint, no project-key path)
    """

    def get(self, request):
        client = request.user
        is_set = client.has_groq_key
        set_at = client.groq_api_key_set_at

        return Response(
            {
                "success": True,
                "message": "Groq API Key status fetched",
                "data": {
                    "is_set": is_set,
                    "set_at": set_at
                }
            },
            status=status.HTTP_200_OK
        )

    def patch(self, request):
        client = request.user
        key = request.data.get("groq_api_key")
        
        key_clean = validate_groq_key(key)

        client.groq_api_key_encrypted = encrypt_groq_key(key_clean)
        client.groq_api_key_set_at = timezone.now()
        client.save(update_fields=['groq_api_key_encrypted', 'groq_api_key_set_at'])

        return Response(
            {
                "success": True,
                "message": "Groq API Key successfully updated",
                "data": {
                    "is_set": True,
                    "set_at": timezone.now()
                }
            },
            status=status.HTTP_200_OK
        )

    def delete(self, request):
        client = request.user

        client.groq_api_key_set_at = None
        client.groq_api_key_encrypted = None
        client.save(update_fields=['groq_api_key_set_at', 'groq_api_key_encrypted'])

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )