from django.db.models import Q
from django.utils import timezone
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

        update_fields = ['status', 'updated_at']
        session.status = status_value

        if status_value == 'cancelled':
            reason = (request.data.get('reason') or '').strip()
            if not reason:
                raise ValidationError({'reason': 'A cancellation reason is required.'})
            session.cancellation_reason = reason
            update_fields.append('cancellation_reason')

        session.save(update_fields=update_fields)
        return Response(ScheduledSessionSerializer(session).data)


class NotificationsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        seen_at = user.profile.notifications_seen_at

        requests_qs = (
            ScheduledSession.objects.filter(partner=user, status='pending')
            .select_related('host', 'partner')
            .order_by('-created_at')[:15]
        )
        confirmed_qs = (
            ScheduledSession.objects.filter(host=user, status='confirmed')
            .select_related('host', 'partner')
            .order_by('-updated_at')[:15]
        )

        items = []
        for session in requests_qs:
            items.append({
                'type': 'request',
                'session': ScheduledSessionSerializer(session).data,
                'timestamp': session.created_at,
                'is_new': seen_at is None or session.created_at > seen_at,
            })
        for session in confirmed_qs:
            items.append({
                'type': 'confirmed',
                'session': ScheduledSessionSerializer(session).data,
                'timestamp': session.updated_at,
                'is_new': seen_at is None or session.updated_at > seen_at,
            })

        items.sort(key=lambda item: item['timestamp'], reverse=True)
        unread_count = sum(1 for item in items if item['is_new'])

        return Response({'unread_count': unread_count, 'items': items[:20]})


class NotificationsSeenView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = request.user.profile
        profile.notifications_seen_at = timezone.now()
        profile.save(update_fields=['notifications_seen_at'])
        return Response({'notifications_seen_at': profile.notifications_seen_at})
