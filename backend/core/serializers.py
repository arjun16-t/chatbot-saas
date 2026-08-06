from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from django.contrib.auth.password_validation import validate_password
from django.core.validators import EmailValidator
from django.core.exceptions import ValidationError

from rest_framework import serializers
from urllib.parse import urlparse

import re

from .models import Client, Project, default_widget_theme

HEX_COLOR_RE = re.compile(r'^#[0-9A-Fa-f]{6}$')

class ClientSerializer(serializers.ModelSerializer):
    """
    Serializer for client registration.
    Validates email, password and creates a new Client instance.
    """
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = Client
        fields = ['email', 'password', 'display_name']
        extra_kwargs = {
            'password': {'write_only': True},
            'display_name': {'required': False},
        }

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
    
    def validate_email(self, value):
        validator = EmailValidator()
        try:
            validator(value)
        except ValidationError:
            raise serializers.ValidationError("Invalid email format")
        # Check email uniqueness
        if Client.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
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
        display_name = validated_data.get('display_name', '')
        client = Client.objects.create_user(
            email=email,
            password=password,
            display_name=display_name,
            **validated_data)
        return client
    
class CustomTokenSerializer(TokenObtainPairSerializer):
    """
    Extends simplejwt's default token serializer to allow adding
    custom claims to the access/refresh token payload.

    Currently a placeholder -- no extra claims added yet.
    Planned: embed subscription_plan so the frontend/widget can
    read tier info from the token without an extra API call.
    """

    @classmethod
    def get_token(cls, user):
        """
        Builds the token for the given user.

        Args:
            user: authenticated Client instance.

        Returns:
            Token with standard simplejwt claims.
            TODO: add user.subscription_plan as a custom claim.
        """
        token = super().get_token(user)
        # TODO: token['subscription_plan'] = user.subscription_plan
        return token


class ProjectSerializer(serializers.ModelSerializer):
    """
    Serializer for Project. Never exposes api_key_hash. The raw
    API key is only ever returned directly by the create/rotate
    view responses, never via this serializer's normal output.
    """
    document_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'domain', 'is_active', 'widget_enabled', 'created_at', 'document_count'
        ]
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

class ProjectThemeConfigSerializer(serializers.ModelSerializer):
    """
    PATCH-only serializer for widget theme configuration.
    Used by the project config endpoint, not create/list.
    """
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'theme_color', 'logo_raw', 'logo_url',
            'bot_display_name', 'greeting_message', 'bubble_position',
        ]
        extra_kwargs = {
            'logo_raw': {'write_only': True},
        }

    def get_logo_url(self, obj):
        logo_uri = obj.logo_raw
        if logo_uri:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(logo_uri.url)
            return logo_uri.url
        return None

    def validate_theme_color(self, value: dict):
        """
        Validate theme_color dict: correct keys, all values valid hex colors.
        Merges partial updates onto the existing saved theme.

        Args:
            value: dict submitted for theme_color

        Returns:
            dict: merged, validated theme_color

        Raises:
            serializers.ValidationError: if keys unexpected, or any value isn't a valid hex color
        """
        if not isinstance(value, dict):
            raise serializers.ValidationError('Expected a dict')

        unexpected = set(value) - set(default_widget_theme())
        if unexpected:
            raise serializers.ValidationError(
                f"Unexpected keys: {', '.join(sorted(unexpected))}",
                code="theme_keys_error",
            )

        for key, val in value.items():
            if HEX_COLOR_RE.match(val) is None:
                raise serializers.ValidationError(f'{key} - Not a Hex Code', code="theme_keys_value_error")

        return self.instance.theme_color | value