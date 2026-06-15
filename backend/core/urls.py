from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.urls import path
from .views import RegisterClientView

urlpatterns = [
    path('register/', RegisterClientView.as_view(), name='register_client'),
    path('login/', TokenObtainPairView.as_view(), name='login_jwt'),
    path('token/refresh/', TokenRefreshView.as_view(), name='refresh_jwt'),
]