from django.urls import path

from .views import ConversationListView, MessageListView, StartConversationView

urlpatterns = [
    path('conversations/', ConversationListView.as_view(), name='conversation-list'),
    path('conversations/start/', StartConversationView.as_view(), name='conversation-start'),
    path('conversations/<int:conversation_id>/messages/', MessageListView.as_view(), name='message-list'),
]
