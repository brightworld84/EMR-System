from django.urls import path
from .views import dashboard_metrics

urlpatterns = [
    path('metrics/dashboard/', dashboard_metrics, name='metrics_dashboard'),
]
