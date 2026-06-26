from django.contrib import admin
from django.urls import path, include
from core.urls import auth_patterns, project_patterns

# Add url versioning for apis

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include(auth_patterns)),          # if using reverse() later replace this with
    path('api/projects/', include(project_patterns)),            # path('api/projects/', include((project_patterns, 'core'))),
    path('api/', include('chatbot.urls')),
    path('api/', include('documents.urls')),
]
