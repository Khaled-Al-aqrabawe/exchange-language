from django.urls import path

from .views import IncomingCallView, RingPartnerView

urlpatterns = [
    path('ring/', RingPartnerView.as_view(), name='call-ring'),
    path('incoming/', IncomingCallView.as_view(), name='call-incoming'),
]
