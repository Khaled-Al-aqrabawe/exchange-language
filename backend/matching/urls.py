from django.urls import path

from .views import PartnerDetailView, PartnerListView

urlpatterns = [
    path('partners/', PartnerListView.as_view(), name='partner-list'),
    path('partners/<int:user_id>/', PartnerDetailView.as_view(), name='partner-detail'),
]
