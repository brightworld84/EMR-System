from django.shortcuts import render
from rest_framework import viewsets, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Document
from .serializers import DocumentSerializer
from core.models import AuditLog


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        qs = Document.objects.filter(
            clinic=self.request.user.clinic,
            is_active=True
        )

        patient_id = self.request.query_params.get('patient')
        appointment_id = self.request.query_params.get('appointment')

        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        if appointment_id:
            qs = qs.filter(appointment_id=appointment_id)

        return qs

    def perform_create(self, serializer):
        f = self.request.FILES.get('file')
        doc = serializer.save(
            clinic=self.request.user.clinic,
            uploaded_by=self.request.user,
            original_filename=getattr(f, 'name', ''),
            content_type=getattr(f, 'content_type', ''),
            file_size=getattr(f, 'size', 0),
        )

        AuditLog.log_action(
            user=self.request.user,
            action='create',
            resource_type='document',
            resource_id=str(doc.id),
            changes={'detail': 'Uploaded document', 'doc_type': doc.doc_type},
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )
