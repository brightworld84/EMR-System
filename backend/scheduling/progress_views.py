import hashlib
import json
from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from core.models import AuditLog
from .models import PacuProgressNotes, PacuProgressNotesSignature, PatientCheckIn
from .progress_serializers import PacuProgressNotesSerializer

class PacuProgressNotesViewSet(viewsets.ModelViewSet):
    serializer_class = PacuProgressNotesSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PacuProgressNotes.objects.filter(
            clinic=self.request.user.clinic
        ).order_by('-updated_at')

    def perform_create(self, serializer):
        obj = serializer.save(clinic=self.request.user.clinic)
        AuditLog.log_action(
            user=self.request.user,
            action='create',
            resource_type='pacu_progress_notes',
            resource_id=str(obj.id),
            changes={'detail': 'Created PACU progress notes'},
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )

    def perform_update(self, serializer):
        obj = serializer.instance
        if obj.is_signed:
            # Once locked, no edits
            return
        updated = serializer.save()
        AuditLog.log_action(
            user=self.request.user,
            action='update',
            resource_type='pacu_progress_notes',
            resource_id=str(updated.id),
            changes={'detail': 'Updated PACU progress notes'},
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )

    @action(detail=False, methods=['get'], url_path='for-checkin')
    def for_checkin(self, request):
        checkin_id = request.query_params.get('checkin')
        if not checkin_id:
            return Response({'detail': 'checkin is required'}, status=400)

        qs = self.get_queryset().filter(checkin_id=checkin_id)
        if qs.exists():
            return Response(self.get_serializer(qs.first()).data)

        # Create on demand (ASC workflow)
        checkin = PatientCheckIn.objects.filter(
            clinic=request.user.clinic,
            id=checkin_id
        ).first()
        if not checkin:
            return Response({'detail': 'checkin not found'}, status=404)

        obj = PacuProgressNotes.objects.create(
            clinic=request.user.clinic,
            checkin=checkin,
            entries=[]
        )
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'], url_path='sign')
    def sign(self, request, pk=None):
        """
        Adds a signature row (up to 3).
        Locks the progress note after first signature.
        """
        obj = self.get_object()

        # Max 3 signatures
        if obj.signatures.count() >= 3:
            return Response({'detail': 'Maximum of 3 signatures reached'}, status=400)

        sig = (request.data.get('signature_data_url') or '').strip()
        role = (request.data.get('role') or 'rn').strip()
        signer_name = (request.data.get('signer_name') or '').strip()

        if not sig.startswith('data:image/'):
            return Response({'detail': 'Valid signature_data_url is required'}, status=400)

        # Lock main note if not locked
        if not obj.is_signed:
            # compute note content hash
            raw = json.dumps({"entries": obj.entries}, sort_keys=True, separators=(',', ':')).encode("utf-8")
            obj.content_hash = hashlib.sha256(raw).hexdigest()
            obj.signature_data_url = sig
            obj.signature_hash = hashlib.sha256((obj.content_hash + "|" + sig).encode("utf-8")).hexdigest()

            obj.is_signed = True
            obj.signed_by = request.user
            obj.signed_at = timezone.now()
            obj.save(update_fields=[
                'content_hash', 'signature_hash', 'signature_data_url',
                'is_signed', 'signed_by', 'signed_at', 'updated_at'
            ])

        # Add additional signer record (also tamper-evident)
        content_hash = obj.content_hash or ''
        sig_hash = hashlib.sha256((content_hash + "|" + sig).encode("utf-8")).hexdigest()

        PacuProgressNotesSignature.objects.create(
            progress_notes=obj,
            clinic=request.user.clinic,
            checkin=obj.checkin,
            role=role,
            signer_name=signer_name,
            signed_by=request.user,
            signed_at=timezone.now(),
            signature_data_url=sig,
            content_hash=content_hash,
            signature_hash=sig_hash,
        )

        AuditLog.log_action(
            user=request.user,
            action='update',
            resource_type='pacu_progress_notes_signature',
            resource_id=str(obj.id),
            changes={'detail': 'Signed PACU progress notes', 'role': role, 'signer_name': signer_name},
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        return Response(self.get_serializer(obj).data)
