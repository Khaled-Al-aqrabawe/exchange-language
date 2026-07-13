from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User

from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer


class ConversationListView(generics.ListAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user).order_by('-created_at')


class StartConversationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        partner_id = request.data.get('partner_id')
        if not partner_id:
            raise ValidationError({'partner_id': 'This field is required.'})
        try:
            partner = User.objects.get(id=partner_id)
        except User.DoesNotExist:
            raise ValidationError({'partner_id': 'No such user.'})
        if partner.id == request.user.id:
            raise ValidationError('Cannot start a conversation with yourself.')

        existing = Conversation.objects.filter(participants=request.user).filter(participants=partner).first()
        if existing:
            return Response(ConversationSerializer(existing).data)

        conversation = Conversation.objects.create()
        conversation.participants.set([request.user, partner])
        return Response(ConversationSerializer(conversation).data, status=201)


class MessageListView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_conversation(self):
        conversation = Conversation.objects.filter(
            id=self.kwargs['conversation_id'], participants=self.request.user
        ).first()
        if not conversation:
            raise PermissionDenied('Not a participant of this conversation.')
        return conversation

    def get_queryset(self):
        conversation = self.get_conversation()
        return conversation.messages.select_related('sender').order_by('created_at')
