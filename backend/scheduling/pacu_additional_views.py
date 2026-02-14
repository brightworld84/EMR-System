from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from core.models import AuditLog
from .models import PacuAdditionalNursingNotes
from .pacu_additional_serializers import PacuAdditionalNursingNotesSerializer

class PacuAdditionalNursingNotesViewSet(viewsets.ModelViewSet):
    serializer_class = PacuAdditionalNursingNotesSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PacuAdditionalNursingNotes.objects.filter(
            clinic=self.request.user.clinic
        ).order_by("-updated_at")

    def perform_create(self, serializer):
        obj = serializer.save(clinic=self.request.user.clinic)

        AuditLog.log_action(
            user=self.request.user,
            action="create",
            resource_type="pacu_additional_nursing_notes",
            resource_id=str(obj.id),
            changes={"detail": "Created PACU Additional Nursing Notes"},
            ip_address=self.request.META.get("REMOTE_ADDR", ""),
            user_agent=self.request.META.get("HTTP_USER_AGENT", ""),
        )

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()

        if obj.is_locked:
            return Response({"detail": "Form is locked."}, status=400)

        signature_data_url = request.data.get("signature_data_url") or ""
        signer_name = request.data.get("signer_name") or ""
        signer_role = request.data.get("signer_role") or ""

        if not signature_data_url.startswith("data:image"):
            return Response({"detail": "signature_data_url is required (data:image/...)"}, status=400)

        obj.add_signature(
            user=request.user,
            signature_data_url=signature_data_url,
            signer_name=signer_name,
            signer_role=signer_role,
        )

        AuditLog.log_action(
            user=request.user,
            action="update",
            resource_type="pacu_additional_nursing_notes_sign",
            resource_id=str(obj.id),
            changes={"detail": "Added signature", "signer_name": signer_name, "signer_role": signer_role},
            ip_address=request.META.get("REMOTE_ADDR", ""),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="lock")
    def lock(self, request, pk=None):
        obj = self.get_object()

        obj.lock(request.user)

        AuditLog.log_action(
            user=request.user,
            action="update",
            resource_type="pacu_additional_nursing_notes_lock",
            resource_id=str(obj.id),
            changes={"detail": "Locked form"},
            ip_address=request.META.get("REMOTE_ADDR", ""),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        return Response(self.get_serializer(obj).data)
