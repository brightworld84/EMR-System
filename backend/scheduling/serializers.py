from rest_framework import serializers
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

class PostOpPhoneCallSerializer(serializers.ModelSerializer):
    # --- Tri-state Yes/No fields (true/false/null) ---
    ok_to_leave_message = serializers.BooleanField(required=False, allow_null=True)

    tolerating_food_liquids = serializers.BooleanField(required=False, allow_null=True)
    nausea_vomiting = serializers.BooleanField(required=False, allow_null=True)
    pain_med_effective = serializers.BooleanField(required=False, allow_null=True)
    dressing_intact = serializers.BooleanField(required=False, allow_null=True)
    drainage = serializers.BooleanField(required=False, allow_null=True)
    swelling_redness_at_site = serializers.BooleanField(required=False, allow_null=True)
    change_color_numbness_tingling_coldness = serializers.BooleanField(required=False, allow_null=True)
    follow_up_appt_scheduled = serializers.BooleanField(required=False, allow_null=True)
    referred_to_physician = serializers.BooleanField(required=False, allow_null=True)

    # --- Text fields (allow blank) ---
    phone_number = serializers.CharField(required=False, allow_blank=True)

    tolerating_food_liquids_comments = serializers.CharField(required=False, allow_blank=True)
    nausea_vomiting_comments = serializers.CharField(required=False, allow_blank=True)
    pain_med_effective_comments = serializers.CharField(required=False, allow_blank=True)
    dressing_intact_comments = serializers.CharField(required=False, allow_blank=True)

    drainage_describe = serializers.CharField(required=False, allow_blank=True)
    swelling_redness_describe = serializers.CharField(required=False, allow_blank=True)
    change_color_describe = serializers.CharField(required=False, allow_blank=True)

    follow_up_appt_comments = serializers.CharField(required=False, allow_blank=True)
    referred_to_physician_comments = serializers.CharField(required=False, allow_blank=True)

    general_comments = serializers.CharField(required=False, allow_blank=True)
    letter_sent_by = serializers.CharField(required=False, allow_blank=True)

    # --- Attempt fields (booleans + strings) ---
    attempt1_date = serializers.CharField(required=False, allow_blank=True)
    attempt1_time = serializers.CharField(required=False, allow_blank=True)
    attempt1_by = serializers.CharField(required=False, allow_blank=True)
    attempt1_no_phone = serializers.BooleanField(required=False)
    attempt1_no_answer = serializers.BooleanField(required=False)
    attempt1_left_message = serializers.BooleanField(required=False)
    attempt1_spoke_to = serializers.CharField(required=False, allow_blank=True)

    attempt2_date = serializers.CharField(required=False, allow_blank=True)
    attempt2_time = serializers.CharField(required=False, allow_blank=True)
    attempt2_by = serializers.CharField(required=False, allow_blank=True)
    attempt2_no_phone = serializers.BooleanField(required=False)
    attempt2_no_answer = serializers.BooleanField(required=False)
    attempt2_left_message = serializers.BooleanField(required=False)
    attempt2_spoke_to = serializers.CharField(required=False, allow_blank=True)

    not_contacted_letter_sent = serializers.BooleanField(required=False)

    # Keep this list in sync with your frontend defaults keys
    FORM_KEYS = {
        "phone_number",
        "ok_to_leave_message",
        "tolerating_food_liquids",
        "tolerating_food_liquids_comments",
        "nausea_vomiting",
        "nausea_vomiting_comments",
        "pain_med_effective",
        "pain_med_effective_comments",
        "dressing_intact",
        "dressing_intact_comments",
        "drainage",
        "drainage_describe",
        "swelling_redness_at_site",
        "swelling_redness_describe",
        "change_color_numbness_tingling_coldness",
        "change_color_describe",
        "follow_up_appt_scheduled",
        "follow_up_appt_comments",
        "referred_to_physician",
        "referred_to_physician_comments",
        "general_comments",
        "attempt1_date",
        "attempt1_time",
        "attempt1_by",
        "attempt1_no_phone",
        "attempt1_no_answer",
        "attempt1_left_message",
        "attempt1_spoke_to",
        "attempt2_date",
        "attempt2_time",
        "attempt2_by",
        "attempt2_no_phone",
        "attempt2_no_answer",
        "attempt2_left_message",
        "attempt2_spoke_to",
        "not_contacted_letter_sent",
        "letter_sent_by",
    }

    class Meta:
        model = PostOpPhoneCall
        fields = "__all__"  # includes model fields + the declared serializer-only fields

    def _build_call_attempts(self, extra: dict):
        attempts = []

        def has_any(d: dict):
            for v in d.values():
                if v is True:
                    return True
                if isinstance(v, str) and v.strip():
                    return True
            return False

        a1 = {
            "attempt": 1,
            "date": extra.get("attempt1_date", ""),
            "time": extra.get("attempt1_time", ""),
            "by": extra.get("attempt1_by", ""),
            "no_phone": extra.get("attempt1_no_phone", False),
            "no_answer": extra.get("attempt1_no_answer", False),
            "left_message": extra.get("attempt1_left_message", False),
            "spoke_to": extra.get("attempt1_spoke_to", ""),
        }
        if has_any(a1):
            attempts.append(a1)

        a2 = {
            "attempt": 2,
            "date": extra.get("attempt2_date", ""),
            "time": extra.get("attempt2_time", ""),
            "by": extra.get("attempt2_by", ""),
            "no_phone": extra.get("attempt2_no_phone", False),
            "no_answer": extra.get("attempt2_no_answer", False),
            "left_message": extra.get("attempt2_left_message", False),
            "spoke_to": extra.get("attempt2_spoke_to", ""),
        }
        if has_any(a2):
            attempts.append(a2)

        if extra.get("not_contacted_letter_sent", False):
            attempts.append({
                "type": "not_contacted_letter_sent",
                "sent": True,
                "sent_by": extra.get("letter_sent_by", ""),
            })

        return attempts

    def create(self, validated_data):
        extra = {}
        for k in list(validated_data.keys()):
            if k in self.FORM_KEYS:
                extra[k] = validated_data.pop(k)

        # store the whole flat form payload into JSONField `data`
        validated_data["data"] = extra
        validated_data["call_attempts"] = self._build_call_attempts(extra)

        return super().create(validated_data)

    def update(self, instance, validated_data):
        extra = {}
        for k in list(validated_data.keys()):
            if k in self.FORM_KEYS:
                extra[k] = validated_data.pop(k)

        # merge into existing JSON
        merged = dict(instance.data or {})
        merged.update(extra)

        validated_data["data"] = merged
        validated_data["call_attempts"] = self._build_call_attempts(merged)

        return super().update(instance, validated_data)


class MedicationReconciliationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationReconciliation
        fields = "__all__"
        read_only_fields = ("id", "clinic", "signed_by", "signed_at", "created_at", "updated_at")


class FallRiskAssessmentPreOpTestingSerializer(serializers.ModelSerializer):
    class Meta:
        model = FallRiskAssessmentPreOpTesting
        fields = "__all__"
        read_only_fields = ("id", "clinic", "signed_by", "signed_at", "created_at", "updated_at")

class PreoperativeNursesNotesSerializer(serializers.ModelSerializer):
    class Meta:
        model = PreoperativeNursesNotes
        fields = "__all__"
        read_only_fields = ("id", "clinic", "created_at", "updated_at")

class FallRiskAssessmentPreOpSerializer(serializers.ModelSerializer):
    class Meta:
        model = FallRiskAssessmentPreOp
        fields = "__all__"
        read_only_fields = ("id", "clinic", "signed_by", "signed_at", "created_at", "updated_at")

class PreoperativeNursesNotesSerializer(serializers.ModelSerializer):
    class Meta:
        model = PreoperativeNursesNotes
        fields = "__all__"
        read_only_fields = ("clinic", "created_at", "updated_at", "signed_by", "signed_at")

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


class PatientInstructionsSerializer(serializers.ModelSerializer):
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

class PreOpPhoneCallSerializer(serializers.ModelSerializer):
    class Meta:
        model = PreOpPhoneCall
        fields = "__all__"
        read_only_fields = ("id", "clinic", "created_at", "updated_at")
