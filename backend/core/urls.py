from django.urls import path, include
from .views import (
    RegisterClientView,
    LoginClientView,
    RefreshClientView,
    LogoutClientView,
    SendOTPView,
    VerifyOTPView,
    ResendOTPView,
    WidgetConfigView,
    ProjectListCreateView,
    CheckDomainAvailabilityView,
    ProjectConfigView,
    ProjectRotateKeyView,
    ProjectRevokeView,
    ProjectDetailUpdateView,
    ProjectDeleteView
)

auth_patterns = [
    path('send-otp/', SendOTPView.as_view(), name='send_otp'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify_otp'),
    path('resend-otp/', ResendOTPView.as_view(), name='resend_otp'),
    path('register/', RegisterClientView.as_view(), name='register_client'),
    path('login/', LoginClientView.as_view(), name='login'),
    path('logout/', LogoutClientView.as_view(), name='logout'),
    path('token/refresh/', RefreshClientView.as_view(), name='refresh_jwt'),
]

widget_patterns = [
    path('config/', WidgetConfigView.as_view(), name='widget_config'),
]

project_patterns = [
    path('', ProjectListCreateView.as_view(), name='list_create_project'),
    path('check-domain/', CheckDomainAvailabilityView.as_view(), name='check_domain'),
    path('<uuid:project_id>/config/', ProjectConfigView.as_view(), name='config_project'),
    path('<uuid:pk>/rotate/', ProjectRotateKeyView.as_view(), name='rotate_key_project'),
    path('<uuid:pk>/revoke/', ProjectRevokeView.as_view(), name='revoke_key_project'),
    path('<uuid:pk>/details/', ProjectDetailUpdateView.as_view(), name='update_project_details'),
    path('<uuid:pk>/', ProjectDeleteView.as_view(), name='delete_project'),
    
    path('<uuid:project_id>/', include('documents.urls')),
]