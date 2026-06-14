from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import Client


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for client registration.
    Validates email, password and creates a new Client instance.
    Returns the generated API key once — it is never retrievable again.
    """
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = Client
        fields = ['email', 'password', 'subscription_plan']

    def validate_password(self, value: str) -> str:
        """
        Runs Django's built-in password validators against the given value.
        
        Args:
            value: Raw password string from the request.
        
        Returns:
            The validated password string.
        
        Raises:
            serializers.ValidationError: If password fails any validator.
        """
        validate_password(value)
        return value

    def create(self, validated_data: dict) -> Client:
        """
        Creates a new Client instance with a hashed password and generated API key.
        
        Args:
            validated_data: Cleaned data from the serializer.
        
        Returns:
            Tuple of (client instance, raw_api_key).
        """
        password = validated_data.pop('password')
        client = Client.objects.create_user(password=password, **validated_data)
        return client
