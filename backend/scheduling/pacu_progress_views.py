from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from core.models import AuditLog
from scheduling.models import PacuProgressNotes, PatientCheckIn
from scheduling.pacu_progress_serializers import PacuProgressNotesSerializer

class PacuProgressNotesViewSet(viewsets.ModelViewSet):
    serializer_class = PacuProgressNotesSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PacuProgressNotes.objects.filter(
            clinic=self.request.user.clinic
        ).order_by('-created_at')

    def perform_create(self, serializer):
        obj = serializer.save(clinic=self.request.user.clinic)

        AuditLog.log_action(
            user=self.request.user,
            action='create',
            resource_type='pacu_progress_notes',
            resource_id=str(obj.id),
            changes={'detail': 'Created PACU Progress Notes'},
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )

    def perform_update(self, serializer):
        obj = self.get_object()
        if obj.is_signed:
            return  # locked

        updated = serializer.save()

        AuditLog.log_action(
            user=self.request.user,
            action='update',
            resource_type='pacu_progress_notes',
            resource_id=str(updated.id),
            changes={'detail': 'Updated PACU Progress Notes entries'},
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )

    @action(detail=True, methods=['post'], url_path='sign')
    def sign(self, request, pk=None):
        obj = self.get_object()
        if obj.is_signed:
            return Response({'detail': 'Already signed and locked.'}, status=400)

        sig = request.data.get('signature_data_url') or ''
        if not sig.startswith('data:image/'):
            return Response({'detail': 'signature_data_url must be a data:image/* data URL'}, status=400)

        obj.lock_with_signature(user=request.user, signature_data_url=sig)

        AuditLog.log_action(
            user=request.user,
            action='sign',
            resource_type='pacu_progress_notes',
            resource_id=str(obj.id),
            changes={'detail': 'Signed/locked PACU Progress Notes'},
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        return Response(self.get_serializer(obj).data)

    @action(detail=False, methods=['get'], url_path='by-checkin')
    def by_checkin(self, request):
        checkin_id = request.query_params.get('checkin')
        if not checkin_id:
            return Response({'detail': 'checkin is required'}, status=400)

        qs = self.get_queryset().filter(checkin_id=checkin_id)
        return Response(self.get_serializer(qs, many=True).data)
