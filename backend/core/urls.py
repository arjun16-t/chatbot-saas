from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.urls import path
from .views import (
    RegisterClientView,
    ProjectListCreateView,
    ProjectRotateKeyView,
    ProjectRevokeView
)

auth_patterns = [
    path('register/', RegisterClientView.as_view(), name='register_client'),
    path('login/', TokenObtainPairView.as_view(), name='login_jwt'),
    path('token/refresh/', TokenRefreshView.as_view(), name='refresh_jwt'),
]

project_patterns = [
    path('', ProjectListCreateView.as_view(), name='list_create_project'),
    path('<uuid:pk>/rotate/', ProjectRotateKeyView.as_view(), name='rotate_key_project'),
    path('<uuid:pk>/revoke/', ProjectRevokeView.as_view(), name='revoke_key_project'),
]