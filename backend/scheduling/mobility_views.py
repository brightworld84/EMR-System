from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from core.models import AuditLog
from .models import PacuMobilityAssessment, PatientCheckIn
from .mobility_serializers import PacuMobilityAssessmentSerializer

class PacuMobilityAssessmentViewSet(viewsets.ModelViewSet):
    serializer_class = PacuMobilityAssessmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PacuMobilityAssessment.objects.filter(
            clinic=self.request.user.clinic
        ).order_by("-created_at")

    def perform_create(self, serializer):
        # Enforce clinic scoping + checkin belongs to clinic
        checkin = serializer.validated_data["checkin"]
        if checkin.clinic_id != self.request.user.clinic_id:
            raise PermissionError("Check-in does not belong to your clinic.")
        obj = serializer.save(clinic=self.request.user.clinic)

        AuditLog.log_action(
            user=self.request.user,
            action="create",
            resource_type="pacu_mobility_assessment",
            resource_id=str(obj.id),
            changes={"detail": "Created PACU Mobility Assessment (draft)"},
            ip_address=self.request.META.get("REMOTE_ADDR", ""),
            user_agent=self.request.META.get("HTTP_USER_AGENT", ""),
        )

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "Already signed."}, status=400)

        signature_data_url = request.data.get("signature_data_url", "")
        if not signature_data_url:
            return Response({"detail": "signature_data_url is required"}, status=400)

        # Save signature, then lock
        obj.signature_data_url = signature_data_url
        obj.sign_and_lock(request.user)

        AuditLog.log_action(
            user=request.user,
            action="update",
            resource_type="pacu_mobility_assessment",
            resource_id=str(obj.id),
            changes={"detail": "Signed and locked PACU Mobility Assessment"},
            ip_address=request.META.get("REMOTE_ADDR", ""),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        return Response(PacuMobilityAssessmentSerializer(obj).data)
