from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView
)

from core.urls import auth_patterns, project_patterns, widget_patterns

# Add url versioning for apis

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include(auth_patterns)),                  # if using reverse() later replace this with
    path('api/projects/', include(project_patterns)),           # path('api/projects/', include((project_patterns, 'core'))),
    path('api/widget/', include(widget_patterns)),
    path('api/', include('chatbot.urls')),
    path('api/', include('documents.urls')),

    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)