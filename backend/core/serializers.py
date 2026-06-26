from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from urllib.parse import urlparse

from .models import Client, Project


class ClientSerializer(serializers.ModelSerializer):
    """
    Serializer for client registration.
    Validates email, password and creates a new Client instance.
    """
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = Client
        fields = ['email', 'password']

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
        Creates a new Client instance with a hashed password.
        
        Args:
            validated_data: Cleaned data from the serializer.
        
        Returns:
            client instance
        """
        password = validated_data.pop('password')
        email = validated_data.pop('email')
        client = Client.objects.create_user(email=email, password=password, **validated_data)
        return client


class ProjectSerializer(serializers.ModelSerializer):
    """
    Serializer for Project. Never exposes api_key_hash. The raw
    API key is only ever returned directly by the create/rotate
    view responses, never via this serializer's normal output.
    """
    class Meta:
        model = Project
        fields = ['id', 'name', 'domain', 'is_active', 'widget_enabled', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data: dict) -> Project:
        """
        Creates a new Project instance with a hashed password and generated API key.
        
        Args:
            validated_data: Cleaned data from the serializer.
        
        Returns:
            projecct instance and api key (shown only once)
        """
        project, api_key = Project.objects.create_project_with_api_key(**validated_data)
        project._raw_api_key = api_key
        return project

    def validate_domain(self, value: str) -> str:
        """
        Normalizes and validates the domain field.

        Strips scheme/path/trailing slash if accidentally included
        (e.g. "https://example.com/" -> "example.com"), lowercases
        for consistent comparison against Origin/Referer headers later.

        Args:
            value: raw domain string from the request.

        Returns:
            Normalized domain string.

        Raises:
            serializers.ValidationError: if the value doesn't resemble
                a valid domain after normalization.
        """
        if '://' not in value:
            value = "https://" + value
        
        parsed = urlparse(value)
        url = parsed.netloc
        return url.strip().lower()