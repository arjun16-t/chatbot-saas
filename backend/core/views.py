from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from django.db import transaction
from django.conf import settings

from .models import Client
from .serializers import ClientSerializer

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
            client, api_key = serializer.save()
            logger.info(f'Client Object Registered: {str(client.id)} ({client.email})')


        return Response(
            {
                "status": True,
                "message": "Client registered successfully.",
                "data": {
                    "client_id": str(client.id),
                    "email": client.email,
                    "api_key": api_key
                }
            },
            status=status.HTTP_201_CREATED
        )