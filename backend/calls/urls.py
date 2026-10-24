from django.urls import path

from .views import RingPartnerView

urlpatterns = [
    path('ring/', RingPartnerView.as_view(), name='call-ring'),
]
