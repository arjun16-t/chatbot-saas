from django.contrib import admin
from django.urls import path, include

# Add url versioning for apis

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('core.urls')),
    path('api/', include('chatbot.urls')),
    path('api/', include('documents.urls')),
]
