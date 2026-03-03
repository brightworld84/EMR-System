from rest_framework import serializers
from django.utils import timezone
from .models import SurgeryCase
from .models import (
    Appointment,
    PatientCheckIn,
    PacuRecord,
    ImmediatePostOpProgressNote,
    ExparelBillingWorksheet,
    ImplantBillableInformation,
    OperatingRoomRecord,
    AnesthesiaRecord,
    PeripheralNerveBlockProcedureNote,
    AnesthesiaOrders,
    ConsentForAnesthesiaServices,
    HistoryAndPhysical,
    SafeSurgeryCommunicationChecklist,
    PreOpPhoneCall,
    MedicationReconciliation,
    FallRiskAssessmentPreOpTesting,
    PreoperativeNursesNotes,
    FallRiskAssessmentPreOp,
    PostOpPhoneCall,
    PatientEducationInfectionRisk,
    PatientEducationDVTPE,
    PatientInstructions,
)

class AuditedFormSerializerMixin:    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user:
            metadata = validated_data.get('metadata', {})
            metadata.update({
                'created_by_id': request.user.id,
                'created_by_username': request.user.username,
                'created_at': timezone.now().isoformat(),
                'created_from_ip': self._get_client_ip(request),
                'created_from_user_agent': request.META.get('HTTP_USER_AGENT', ''),
            })
            validated_data['metadata'] = metadata
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        request = self.context.get('request')
        if request and request.user:
            metadata = getattr(instance, 'metadata', None) or {}
            modifications = metadata.get('modifications', [])
            modifications.append({
                'modified_by_id': request.user.id,
                'modified_by_username': request.user.username,
                'modified_at': timezone.now().isoformat(),
                'modified_from_ip': self._get_client_ip(request),
                'modified_from_user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'fields_changed': list(validated_data.keys()),
            })
            metadata['modifications'] = modifications[-10:]
            metadata['last_modified_by_id'] = request.user.id
            metadata['last_modified_at'] = timezone.now().isoformat()
            validated_data['metadata'] = metadata
        return super().update(instance, validated_data)
    
    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class JSONFieldFormSerializer(AuditedFormSerializerMixin, serializers.ModelSerializer):
    """Base serializer with audit logging for all forms"""
    pass

class PostOpPhoneCallSerializer(JSONFieldFormSerializer):
    class Meta:
        model = PostOpPhoneCall
        fields = "__all__"
        read_only_fields = ("id", "clinic", "created_at", "updated_at")

class MedicationReconciliationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationReconciliation
        fields = "__all__"
        read_only_fields = ("id", "clinic", "signed_by", "signed_at", "created_at", "updated_at")

class FallRiskAssessmentPreOpTestingSerializer(JSONFieldFormSerializer):
    class Meta:
        model = FallRiskAssessmentPreOpTesting
        fields = "__all__"
        read_only_fields = ("id", "clinic", "signed_by", "signed_at", "created_at", "updated_at")

class FallRiskAssessmentPreOpSerializer(JSONFieldFormSerializer):
    class Meta:
        model = FallRiskAssessmentPreOp
        fields = "__all__"
        read_only_fields = ("id", "clinic", "signed_by", "signed_at", "created_at", "updated_at")

class PreoperativeNursesNotesSerializer(JSONFieldFormSerializer):
    class Meta:
        model = PreoperativeNursesNotes
        fields = "__all__"
        read_only_fields = ("id", "clinic", "created_at", "updated_at")

class PatientEducationInfectionRiskSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientEducationInfectionRisk
        fields = "__all__"
        read_only_fields = ("id", "clinic", "signed_by", "signed_at", "created_at", "updated_at")


class PatientEducationDVTPESerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientEducationDVTPE
        fields = "__all__"
        read_only_fields = ("id", "clinic", "signed_by", "signed_at", "created_at", "updated_at")

class PatientInstructionsSerializer(JSONFieldFormSerializer):
    class Meta:
        model = PatientInstructions
        fields = "__all__"
        read_only_fields = ("id", "clinic", "signed_by", "signed_at", "created_at", "updated_at")

class SurgeryCaseSerializer(serializers.ModelSerializer):
    clinic = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = SurgeryCase
        fields = "__all__"
        read_only_fields = ["id", "clinic", "created_at", "updated_at"]

class SafeSurgeryCommunicationChecklistSerializer(serializers.ModelSerializer):
    class Meta:
        model = SafeSurgeryCommunicationChecklist
        fields = "__all__"

class HistoryAndPhysicalSerializer(serializers.ModelSerializer):
    clinic = serializers.PrimaryKeyRelatedField(read_only=True)
    signed_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = HistoryAndPhysical
        fields = "__all__"
        read_only_fields = [
            "id",
            "clinic",
            "is_signed",
            "signed_by",
            "signed_at",
            "signature_data_url",
            "created_at",
            "updated_at",
        ]

class ConsentForAnesthesiaServicesSerializer(serializers.ModelSerializer):
    clinic = serializers.PrimaryKeyRelatedField(read_only=True)
    signed_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = ConsentForAnesthesiaServices
        fields = "__all__"
        read_only_fields = [
            "id",
            "clinic",
            "is_signed",
            "signed_by",
            "signed_at",
            "created_at",
            "updated_at",
        ]

class AnesthesiaOrdersSerializer(serializers.ModelSerializer):
    clinic = serializers.PrimaryKeyRelatedField(read_only=True)
    signed_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = AnesthesiaOrders
        fields = "__all__"
        read_only_fields = [
            "id",
            "clinic",
            "is_signed",
            "signed_by",
            "signed_at",
            "signature_data_url",
            "created_at",
            "updated_at",
        ]

class PeripheralNerveBlockProcedureNoteSerializer(serializers.ModelSerializer):
    clinic = serializers.PrimaryKeyRelatedField(read_only=True)
    signed_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = PeripheralNerveBlockProcedureNote
        fields = "__all__"
        read_only_fields = [
            "id",
            "clinic",
            "is_signed",
            "signed_by",
            "signed_at",
            "signature_data_url",
            "created_at",
            "updated_at",
        ]

class AnesthesiaRecordSerializer(serializers.ModelSerializer):
    clinic = serializers.PrimaryKeyRelatedField(read_only=True)
    signed_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = AnesthesiaRecord
        fields = "__all__"
        read_only_fields = [
            "id",
            "clinic",
            "is_signed",
            "signed_by",
            "signed_at",
            "signature_data_url",
            "created_at",
            "updated_at",
        ]

class OperatingRoomRecordSerializer(serializers.ModelSerializer):
    clinic = serializers.PrimaryKeyRelatedField(read_only=True)
    signed_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = OperatingRoomRecord
        fields = "__all__"
        read_only_fields = [
            "id",
            "clinic",
            "is_signed",
            "signed_by",
            "signed_at",
            "signature_data_url",
            "created_at",
            "updated_at",
        ]

class ImmediatePostOpProgressNoteSerializer(serializers.ModelSerializer):
    clinic = serializers.PrimaryKeyRelatedField(read_only=True)
    signed_by = serializers.PrimaryKeyRelatedField(read_only=True)
    pacu_record_id = serializers.SerializerMethodField()

    def get_pacu_record_id(self, obj):
        # Auto-link via checkin → pacu_record
        pr = getattr(obj.checkin, 'pacu_record', None)
        return pr.id if pr else None

    class Meta:
        model = ImmediatePostOpProgressNote
        fields = "__all__"
        read_only_fields = ["id", "clinic", "pacu_record", "is_signed", "signed_by", "signed_at", "signature_data_url", "created_at", "updated_at"]

class PacuRecordSerializer(serializers.ModelSerializer):
    clinic = serializers.PrimaryKeyRelatedField(read_only=True)
    signed_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = PacuRecord
        fields = "__all__"
        read_only_fields = [
            "id",
            "clinic",
            "is_signed",
            "signed_by",
            "signed_at",
            "signature_data_url",
            "created_at",
            "updated_at",
            "pacu_autofilled",
            "pacu_autofilled_at",
            "pacu_autofill_locked",      
        ]

class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    mrn = serializers.CharField(source='patient.medical_record_number', read_only=True)

    provider_display_name = serializers.SerializerMethodField()

    def get_provider_display_name(self, obj):
        if getattr(obj, "provider", None):
            return obj.provider.display_name
        return obj.provider_name or ''

    class Meta:
        model = Appointment
        fields = [
            'id',
            'patient',
            'patient_name',
            'mrn',
            'scheduled_start',
            'scheduled_end',
            'provider',
            'provider_display_name',
            'provider_name',
            'reason_for_visit',
            'status',
        ]
        read_only_fields = ['id']


class PatientCheckInSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    mrn = serializers.CharField(source='patient.medical_record_number', read_only=True)

    class Meta:
        model = PatientCheckIn
        fields = [
            'id',
            'patient',
            'patient_name',
            'mrn',
            'check_in_time',
            'check_out_time',
            'is_active',
            'status',
            'status_changed_at',
            'room',
            'assigned_staff_name',
            'provider_name',
        ]
        read_only_fields = ['id', 'check_in_time', 'status_changed_at']

# --- Exparel Billing Worksheet (CPT C9290) ---

class ExparelBillingWorksheetSerializer(serializers.ModelSerializer):
    clinic = serializers.PrimaryKeyRelatedField(read_only=True)
    signed_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = ExparelBillingWorksheet
        fields = "__all__"
        read_only_fields = [
            "id",
            "clinic",
            "is_signed",
            "signed_by",
            "signed_at",
            "signature_data_url",
            "content_hash",
            "signature_hash",
            "created_at",
            "updated_at",
        ]


# --- Implant / Billable Information ---

class ImplantBillableInformationSerializer(serializers.ModelSerializer):
    clinic = serializers.PrimaryKeyRelatedField(read_only=True)
    signed_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = ImplantBillableInformation
        fields = "__all__"
        read_only_fields = [
            "id",
            "clinic",
            "is_signed",
            "signed_by",
            "signed_at",
            "signature_data_url",
            "created_at",
            "updated_at",
        ]

class PreOpPhoneCallSerializer(JSONFieldFormSerializer):
    class Meta:
        model = PreOpPhoneCall
        fields = "__all__"
        read_only_fields = ("id", "clinic", "created_at", "updated_at")

