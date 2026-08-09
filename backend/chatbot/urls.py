from django.urls import path
from .views import ChatView, UnansweredListView, UnansweredRetrieveUpdateDestroyView

urlpatterns = [
    path('chat/', ChatView.as_view(), name='chat'),
]

querypatterns = [
    path('unanswered/', UnansweredListView.as_view(), name='unanswered_query'),
    path('unanswered/<int:id>/', UnansweredRetrieveUpdateDestroyView.as_view(), name='unanswered_retrieve_update_delete')
]