from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Patient
from .serializers import PatientSerializer
from core.models import AuditLog


class PatientViewSet(viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Patient.objects.filter(
            clinic=self.request.user.clinic,
            is_active=True
        ).order_by('-created_at')

    def perform_create(self, serializer):
        patient = serializer.save(
            clinic=self.request.user.clinic,
            created_by=self.request.user
        )

        AuditLog.log_action(
            user=self.request.user,
            action='create',
            resource_type='patient',
            resource_id=str(patient.id),
            changes={'detail': 'Created patient'},
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )

    def retrieve(self, request, *args, **kwargs):
        patient = self.get_object()

        AuditLog.log_action(
            user=request.user,
            action='view',
            resource_type='patient',
            resource_id=str(patient.id),
            changes={'detail': 'Viewed patient chart'},
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        return super().retrieve(request, *args, **kwargs)

    @action(detail=True, methods=['get'], url_path='export/json')
    def export_json(self, request, pk=None):
        patient = self.get_object()

        AuditLog.log_action(
            user=request.user,
            action='view',
            resource_type='patient_export_json',
            resource_id=str(patient.id),
            changes={'detail': 'Exported patient JSON'},
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        data = PatientSerializer(patient, context={'request': request}).data
        return Response({'patient': data})

    @action(detail=True, methods=['get'], url_path='export/fhir')
    def export_fhir(self, request, pk=None):
        patient = self.get_object()

        AuditLog.log_action(
            user=request.user,
            action='view',
            resource_type='patient_export_fhir',
            resource_id=str(patient.id),
            changes={'detail': 'Exported patient FHIR bundle'},
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        gender = 'other'
        if patient.gender == 'M':
            gender = 'male'
        elif patient.gender == 'F':
            gender = 'female'

        given = [patient.first_name]
        middle = getattr(patient, 'middle_name', '') or ''
        if middle.strip():
            given.append(middle)

        bundle = {
            "resourceType": "Bundle",
            "type": "collection",
            "entry": [
                {
                    "resource": {
                        "resourceType": "Patient",
                        "id": str(patient.id),
                        "name": [{"family": patient.last_name, "given": given}],
                        "gender": gender,
                        "birthDate": patient.date_of_birth.isoformat(),
                    }
                }
            ]
        }

        return Response(bundle)
