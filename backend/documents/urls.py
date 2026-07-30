from django.urls import path
from .views import (
    DocumentUploadView,
    DocumentListView,
    DocumentRetrieveDestroyView,
)

urlpatterns = [
    path('documents/', DocumentListView.as_view(), name='document_list'),
    path('documents/upload/', DocumentUploadView.as_view(), name='document_upload'),
    path('documents/<uuid:doc_id>/', DocumentRetrieveDestroyView.as_view(), name='document_detail'),
]