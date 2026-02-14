from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from core.models import AuditLog
from .models import PacuRecord, PatientCheckIn
from .serializers import PacuRecordSerializer


class PacuRecordViewSet(viewsets.ModelViewSet):
    serializer_class = PacuRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Clinic scoped
        return PacuRecord.objects.filter(clinic=self.request.user.clinic).order_by('-updated_at')

    def perform_create(self, serializer):
        obj = serializer.save(
            clinic=self.request.user.clinic,
        )

        AuditLog.log_action(
            user=self.request.user,
            action='create',
            resource_type='pacu_record',
            resource_id=str(obj.id),
            changes={'detail': 'Created PACU Record'},
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )

    @action(detail=False, methods=['get'], url_path='by-checkin')
    def by_checkin(self, request):
        checkin_id = request.query_params.get('checkin')
        if not checkin_id:
            return Response({'detail': 'checkin is required'}, status=400)

        obj = self.get_queryset().filter(checkin_id=checkin_id).first()
        if not obj:
            return Response({'detail': 'Not found'}, status=404)

        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'], url_path='sign')
    def sign(self, request, pk=None):
        obj = self.get_object()

        if obj.is_signed:
            return Response({'detail': 'Already signed'}, status=400)

        sig = request.data.get('signature_data_url') or ''
        if not sig.startswith('data:image/'):
            return Response({'detail': 'signature_data_url is required (data:image/...)'}, status=400)

        # lock
        from django.utils import timezone
        obj.signature_data_url = sig
        obj.is_signed = True
        obj.signed_by = request.user
        obj.signed_at = timezone.now()
        obj.save(update_fields=['signature_data_url', 'is_signed', 'signed_by', 'signed_at', 'updated_at'])

        AuditLog.log_action(
            user=request.user,
            action='update',
            resource_type='pacu_record',
            resource_id=str(obj.id),
            changes={'detail': 'Signed PACU Record'},
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        return Response(self.get_serializer(obj).data)
