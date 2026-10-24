from django.urls import path

from .views import MaterialDetailView, MaterialListView

urlpatterns = [
    path('materials/', MaterialListView.as_view(), name='material-list'),
    path('materials/<int:pk>/', MaterialDetailView.as_view(), name='material-detail'),
]
