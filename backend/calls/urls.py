from django.urls import path

from .views import (
    CancelCallView, DeclineCallView, GroupDetailView, GroupJoinView, GroupLeaveView, GroupListCreateView, IncomingCallView,
    NotifyCallView, RingPartnerView,
)

urlpatterns = [
    path('ring/', RingPartnerView.as_view(), name='call-ring'),
    path('notify/', NotifyCallView.as_view(), name='call-notify'),
    path('cancel/', CancelCallView.as_view(), name='call-cancel'),
    path('decline/', DeclineCallView.as_view(), name='call-decline'),
    path('groups/', GroupListCreateView.as_view(), name='group-list'),
    path('groups/<str:room_id>/', GroupDetailView.as_view(), name='group-detail'),
    path('groups/<str:room_id>/join/', GroupJoinView.as_view(), name='group-join'),
    path('groups/<str:room_id>/leave/', GroupLeaveView.as_view(), name='group-leave'),
    path('incoming/', IncomingCallView.as_view(), name='call-incoming'),
]
