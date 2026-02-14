from rest_framework import viewsets, permissions
from .models import Provider
from .serializers import ProviderSerializer

class ProviderViewSet(viewsets.ModelViewSet):
    serializer_class = ProviderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Provider.objects.filter(
            clinic=self.request.user.clinic,
            is_active=True
        ).order_by('display_name')

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)
