from django.db.models import Q
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ScheduledSession
from .serializers import ScheduledSessionSerializer


class SessionListCreateView(generics.ListCreateAPIView):
    serializer_class = ScheduledSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return ScheduledSession.objects.filter(Q(host=user) | Q(partner=user)).select_related('host', 'partner')

    def get_serializer_context(self):
        return {'request': self.request}

    def perform_create(self, serializer):
        partner_id = self.request.data.get('partner_id')
        if str(partner_id) == str(self.request.user.id):
            raise ValidationError('Cannot schedule a session with yourself.')
        serializer.save()


class SessionDetailView(generics.RetrieveAPIView):
    serializer_class = ScheduledSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return ScheduledSession.objects.filter(Q(host=user) | Q(partner=user))


class SessionStatusUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            session = ScheduledSession.objects.get(
                Q(host=request.user) | Q(partner=request.user), pk=pk
            )
        except ScheduledSession.DoesNotExist:
            raise PermissionDenied('Not a participant of this session.')

        status_value = request.data.get('status')
        valid_statuses = dict(ScheduledSession.STATUS_CHOICES)
        if status_value not in valid_statuses:
            raise ValidationError({'status': f'Must be one of {list(valid_statuses)}.'})

        session.status = status_value
        session.save(update_fields=['status'])
        return Response(ScheduledSessionSerializer(session).data)
