import hashlib
import json

from django.db import models
from django.conf import settings
from patients.models import Patient
from core.models import Clinic
from django.utils import timezone
from providers.models import Provider

class SurgeryCase(models.Model):
    clinic = models.ForeignKey(
        'core.Clinic',
        on_delete=models.CASCADE,
        related_name='surgery_cases',
    )

    checkin = models.OneToOneField(
        'scheduling.PatientCheckIn',
        on_delete=models.CASCADE,
        related_name='surgery_case'
    )

    procedure = models.CharField(max_length=255)
    surgeon = models.CharField(max_length=255)
    anesthesiologist = models.CharField(max_length=255, blank=True)

    scheduled_date = models.DateField()
    scheduled_start_time = models.TimeField()
    scheduled_end_time = models.TimeField(null=True, blank=True)

    room = models.CharField(max_length=50, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"SurgeryCase #{self.id} — {self.procedure}"

try:
    # Django 5+ includes JSONField on models
    from django.db.models import JSONField
except ImportError:
    from django.contrib.postgres.fields import JSONField

class PatientInstructions(models.Model):
    clinic = models.ForeignKey("core.Clinic", on_delete=models.CASCADE)
    checkin = models.ForeignKey("scheduling.PatientCheckIn", on_delete=models.CASCADE)

    data = models.JSONField(default=dict, blank=True)
    call_attempts = models.JSONField(default=list, blank=True)

    completed = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class PatientEducationDVTPE(models.Model):
    clinic = models.ForeignKey("core.Clinic", on_delete=models.CASCADE)
    checkin = models.ForeignKey("scheduling.PatientCheckIn", on_delete=models.CASCADE)

    patient_signature = models.JSONField(default=dict, blank=True)
    nurse_signature = models.JSONField(default=dict, blank=True)

    acknowledged_at = models.DateTimeField(auto_now_add=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class PatientEducationInfectionRisk(models.Model):
    clinic = models.ForeignKey("core.Clinic", on_delete=models.CASCADE)
    checkin = models.ForeignKey("scheduling.PatientCheckIn", on_delete=models.CASCADE)

    patient_signature = models.JSONField(default=dict, blank=True)
    nurse_signature = models.JSONField(default=dict, blank=True)

    acknowledged_at = models.DateTimeField(auto_now_add=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class PostOpPhoneCall(models.Model):
    clinic = models.ForeignKey("core.Clinic", on_delete=models.CASCADE)
    checkin = models.ForeignKey("scheduling.PatientCheckIn", on_delete=models.CASCADE)

    call_attempts = models.JSONField(default=list, blank=True)
    data = models.JSONField(default=dict, blank=True)

    completed = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class PreoperativeNursesNotes(models.Model):
    clinic = models.ForeignKey("core.Clinic", on_delete=models.CASCADE)
    checkin = models.ForeignKey("scheduling.PatientCheckIn", on_delete=models.CASCADE)

    data = models.JSONField(default=dict, blank=True)

    nurse_signature = models.JSONField(null=True, blank=True)
    patient_signature = models.JSONField(null=True, blank=True)

    completed = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class FallRiskAssessmentPreOp(models.Model):
    clinic = models.ForeignKey("core.Clinic", on_delete=models.CASCADE)
    checkin = models.ForeignKey("scheduling.PatientCheckIn", on_delete=models.CASCADE)

    data = models.JSONField(default=dict, blank=True)
    total_score = models.IntegerField(default=0)

    nurse_signature = models.JSONField(null=True, blank=True)

    completed = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class FallRiskAssessmentPreOpTesting(models.Model):
    clinic = models.ForeignKey("core.Clinic", on_delete=models.CASCADE)
    checkin = models.ForeignKey("scheduling.PatientCheckIn", on_delete=models.CASCADE)

    data = models.JSONField(default=dict, blank=True)
    total_score = models.IntegerField(default=0)

    nurse_signature = models.JSONField(null=True, blank=True)

    completed = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class MedicationReconciliation(models.Model):
    clinic = models.ForeignKey("core.Clinic", on_delete=models.CASCADE)
    checkin = models.ForeignKey("scheduling.PatientCheckIn", on_delete=models.CASCADE)

    data = models.JSONField(default=dict, blank=True)

    rn_signature = models.JSONField(null=True, blank=True)
    surgeon_signature = models.JSONField(null=True, blank=True)

    completed = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class PreOpPhoneCall(models.Model):
    clinic = models.ForeignKey("core.Clinic", on_delete=models.CASCADE)
    checkin = models.ForeignKey("scheduling.PatientCheckIn", on_delete=models.CASCADE)

    call_attempts = models.JSONField(default=list, blank=True)
    data = models.JSONField(default=dict, blank=True)

    completed = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class SafeSurgeryCommunicationChecklist(models.Model):
    clinic = models.ForeignKey(
        "core.Clinic",
        on_delete=models.CASCADE,
        related_name="safe_surgery_checklists"
    )

    checkin = models.ForeignKey(
        "scheduling.PatientCheckIn",
        on_delete=models.CASCADE,
        related_name="safe_surgery_checklists",
        null=True,
        blank=True,
    )

    # Option A: store the whole page in JSON
    page1 = models.JSONField(default=dict, blank=True)

    # Signature fields (structured columns)
    preop_signature_name = models.CharField(max_length=255, blank=True, default="")
    preop_signature_datetime = models.DateTimeField(null=True, blank=True)

    before_induction_signature_name = models.CharField(max_length=255, blank=True, default="")
    before_induction_signature_datetime = models.DateTimeField(null=True, blank=True)

    before_incision_signature_name = models.CharField(max_length=255, blank=True, default="")
    before_incision_signature_datetime = models.DateTimeField(null=True, blank=True)

    before_leaving_room_signature_name = models.CharField(max_length=255, blank=True, default="")
    before_leaving_room_signature_datetime = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_safe_surgery_checklists"
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_safe_surgery_checklists"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Safe Surgery Checklist #{self.id}"

class HistoryAndPhysical(models.Model):
    clinic = models.ForeignKey('core.Clinic', on_delete=models.CASCADE, related_name='history_and_physicals')
    checkin = models.OneToOneField("scheduling.PatientCheckIn", on_delete=models.CASCADE, related_name="history_physical")

    # Option A: everything on the paper form goes in here
    page1 = models.JSONField(default=dict, blank=True)

    # Signature lock
    is_signed = models.BooleanField(default=False)
    signed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="signed_history_physicals",
    )
    signed_at = models.DateTimeField(null=True, blank=True)
    signature_data_url = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"H&P checkin={self.checkin_id} clinic={self.clinic_id}"

class ConsentForAnesthesiaServices(models.Model):
    clinic = models.ForeignKey('core.Clinic', on_delete=models.CASCADE, related_name='anesthesia_consents')
    checkin = models.OneToOneField('scheduling.PatientCheckIn', on_delete=models.CASCADE, related_name='anesthesia_consent')

    nkda = models.BooleanField(default=False)
    allergies_text = models.CharField(max_length=255, blank=True, default='')

    # Store which consent sections are checked + any small notes
    consent = models.JSONField(default=dict, blank=True)

    # Signatures (data URLs from signature pad)
    patient_signature_data_url = models.TextField(blank=True, default='')
    witness_signature_data_url = models.TextField(blank=True, default='')
    guardian_signature_data_url = models.TextField(blank=True, default='')
    anesthesiologist_signature_data_url = models.TextField(blank=True, default='')

    # Lock
    is_signed = models.BooleanField(default=False)
    signed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    signed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Consent for Anesthesia Services – CheckIn #{self.checkin_id}"

class AnesthesiaOrders(models.Model):
    """
    ANESTHESIA ORDERS (paper-faithful).
    Stores Preoperative Orders + PACU Phase I Orders as JSON for flexibility.
    Single anesthesiologist signer. Locks after signing.
    """
    clinic = models.ForeignKey('core.Clinic', on_delete=models.CASCADE, related_name='anesthesia_orders')
    checkin = models.OneToOneField('scheduling.PatientCheckIn', on_delete=models.CASCADE, related_name='anesthesia_orders')

    # Header: NKDA / Allergies
    nkda = models.BooleanField(default=False)
    allergies_text = models.CharField(max_length=255, blank=True, default='')

    # Store the two order sections as JSON (keeps it flexible and paper-faithful)
    preop_orders = models.JSONField(default=dict, blank=True)      # Preoperative Orders
    pacu_phase1_orders = models.JSONField(default=dict, blank=True) # PACU Phase I Orders

    # Signature + lock
    is_signed = models.BooleanField(default=False)
    signed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    signed_at = models.DateTimeField(null=True, blank=True)
    signature_data_url = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Anesthesia Orders – CheckIn #{self.checkin_id}"

class PeripheralNerveBlockProcedureNote(models.Model):
    """
    Peripheral Nerve Block(s) Procedure Note (Page 1 + Page 2).
    Store paper-faithful content in JSON blobs.
    Single physician signer. Locks after signing.
    """
    clinic = models.ForeignKey('core.Clinic', on_delete=models.CASCADE, related_name='pnb_notes')
    checkin = models.OneToOneField(
        'scheduling.PatientCheckIn',
        on_delete=models.CASCADE,
        related_name='pnb_note'
    )

    # Paper-faithful payloads
    page1 = models.JSONField(default=dict, blank=True)
    page2 = models.JSONField(default=dict, blank=True)

    # Free-text comments line area (appears on both pages)
    comments = models.TextField(blank=True, default='')

    # Signature + lock
    is_signed = models.BooleanField(default=False)
    signed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    signed_at = models.DateTimeField(null=True, blank=True)
    signature_data_url = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"PNB Procedure Note – CheckIn #{self.checkin_id}"

class AnesthesiaRecord(models.Model):
    """
    Anesthesia Record (paper-faithful baseline).
    We'll store the complex grid/checkbox-heavy sections as JSON, and
    keep key signature/lock fields consistent with other forms.
    """
    clinic = models.ForeignKey(
        'core.Clinic',
        on_delete=models.CASCADE,
        related_name='anesthesia_records'
    )
    checkin = models.OneToOneField(
        'scheduling.PatientCheckIn',
        on_delete=models.CASCADE,
        related_name='anesthesia_record'
    )

    # Structured sections (paper has many grouped areas + large grids)
    header = models.JSONField(default=dict, blank=True)          # date/time, ASA class, NPO status, etc.
    history = models.TextField(blank=True, default='')
    ros = models.TextField(blank=True, default='')
    meds = models.TextField(blank=True, default='')
    pe = models.TextField(blank=True, default='')

    airway = models.JSONField(default=dict, blank=True)          # ETT/LMA/teeth/oral-nasal, attempts, etc.
    plan = models.TextField(blank=True, default='')              # diagnosis/plan block
    time_series = models.JSONField(default=list, blank=True)     # the big time grid rows/cols
    regional_anesthesia = models.JSONField(default=dict, blank=True)  # regional procedure block (bottom right)
    notes = models.TextField(blank=True, default='')

    # Signature + lock
    is_signed = models.BooleanField(default=False)
    signed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    signed_at = models.DateTimeField(null=True, blank=True)
    signature_data_url = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Anesthesia Record – CheckIn #{self.checkin_id}"

class OperatingRoomRecord(models.Model):
    """
    Operating Room Record (Pages 1–2 combined). Paper-faithful.
    Single RN signer. Locks after signing.
    """
    clinic = models.ForeignKey('core.Clinic', on_delete=models.CASCADE, related_name='operating_room_records')
    checkin = models.OneToOneField('scheduling.PatientCheckIn', on_delete=models.CASCADE, related_name='operating_room_record')

    # Page 1 header times
    room_number = models.CharField(max_length=50, blank=True, default='')
    in_time = models.TimeField(null=True, blank=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    out_time = models.TimeField(null=True, blank=True)

    # Store the rest as paper-faithful JSON blocks (checkboxes/tables/lines)
    page1 = models.JSONField(default=dict, blank=True)  # pre-op assessment, staff grid, time-out, meds, specimens, etc.
    page2 = models.JSONField(default=dict, blank=True)  # positioning, DVT, skin prep, tourniquet, counts, transfer, nurse notes, etc.

    # Signature + lock
    is_signed = models.BooleanField(default=False)
    signed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    signed_at = models.DateTimeField(null=True, blank=True)
    signature_data_url = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"OR Record – CheckIn #{self.checkin_id}"

class PacuAdditionalNursingNotes(models.Model):
    """
    PACU Additional Nursing Notes (paper-faithful).
    Option A: fixed tables that print like the paper form.
    """
    clinic = models.ForeignKey('core.Clinic', on_delete=models.CASCADE, related_name='pacu_additional_notes')
    checkin = models.OneToOneField('scheduling.PatientCheckIn', on_delete=models.CASCADE, related_name='pacu_additional_notes')

    # Fixed-row tables
    patient_assessment_rows = models.JSONField(default=list, blank=True)
    wound_extremity_rows = models.JSONField(default=list, blank=True)
    medication_rows = models.JSONField(default=list, blank=True)

    notes = models.TextField(blank=True, default='')

    # Multi-signer (up to 3)
    # Each item: {slot: 1..3, signed_by, signed_at, signer_name, signer_role, signature_data_url, content_hash, signature_hash}
    signatures = models.JSONField(default=list, blank=True)

    is_locked = models.BooleanField(default=False)
    locked_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='locked_pacu_additional_notes')
    locked_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def _canonical_payload(self):
        return {
            "patient_assessment_rows": self.patient_assessment_rows,
            "wound_extremity_rows": self.wound_extremity_rows,
            "medication_rows": self.medication_rows,
            "notes": self.notes,
            "checkin_id": self.checkin_id,
            "clinic_id": self.clinic_id,
        }

    def compute_content_hash(self):
        payload_json = json.dumps(self._canonical_payload(), sort_keys=True, separators=(",", ":")).encode("utf-8")
        return hashlib.sha256(payload_json).hexdigest()

    def add_signature(self, user, signature_data_url: str, signer_name: str = "", signer_role: str = ""):
        if self.is_locked:
            return

        # Determine next slot (1..3)
        used = {int(s.get("slot")) for s in (self.signatures or []) if str(s.get("slot")).isdigit()}
        slot = next((i for i in [1, 2, 3] if i not in used), None)
        if slot is None:
            return  # already 3 signatures

        content_hash = self.compute_content_hash()
        sig_raw = (content_hash + "|" + (signature_data_url or "")).encode("utf-8")
        signature_hash = hashlib.sha256(sig_raw).hexdigest()

        self.signatures = list(self.signatures or []) + [{
            "slot": slot,
            "signed_by": user.id if user else None,
            "signed_at": timezone.now().isoformat(),
            "signer_name": signer_name or "",
            "signer_role": signer_role or "",
            "signature_data_url": signature_data_url or "",
            "content_hash": content_hash,
            "signature_hash": signature_hash,
        }]

        self.save(update_fields=["signatures", "updated_at"])

    def lock(self, user):
        if self.is_locked:
            return
        self.is_locked = True
        self.locked_by = user
        self.locked_at = timezone.now()
        self.save(update_fields=["is_locked", "locked_by", "locked_at", "updated_at"])

    def __str__(self):
        return f"PACU Additional Nursing Notes (CheckIn #{self.checkin_id})"

class PacuProgressNotes(models.Model):
    """
    PACU Progress Notes sheet (paper-matching) with signature + lock.
    """
    clinic = models.ForeignKey('core.Clinic', on_delete=models.CASCADE, related_name='pacu_progress_notes')
    checkin = models.OneToOneField('scheduling.PatientCheckIn', on_delete=models.CASCADE, related_name='pacu_progress_notes')

    # Rows: [{date:'YYYY-MM-DD', time:'HH:MM', initials:'', notes:''}, ...]
    entries = models.JSONField(default=list, blank=True)

    # Signature + verification
    is_signed = models.BooleanField(default=False)
    signed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    signed_at = models.DateTimeField(null=True, blank=True)
    signature_data_url = models.TextField(blank=True, default='')  # data:image/png;base64,...

    content_hash = models.CharField(max_length=64, blank=True, default='')
    signature_hash = models.CharField(max_length=64, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def compute_content_hash(self):
        payload = {"entries": self.entries}
        raw = json.dumps(payload, sort_keys=True, separators=(',', ':')).encode("utf-8")
        return hashlib.sha256(raw).hexdigest()

    def lock_with_signature(self, user, signature_data_url: str):
        if self.is_signed:
            return

        self.signature_data_url = signature_data_url or ''
        self.content_hash = self.compute_content_hash()

        sig_raw = (self.content_hash + "|" + self.signature_data_url).encode("utf-8")
        self.signature_hash = hashlib.sha256(sig_raw).hexdigest()

        self.is_signed = True
        self.signed_by = user
        self.signed_at = timezone.now()
        self.save(update_fields=[
            "signature_data_url",
            "content_hash",
            "signature_hash",
            "is_signed",
            "signed_by",
            "signed_at",
            "updated_at",
        ])

class PacuProgressNotesSignature(models.Model):
    """
    Supports up to 3 signatures on the same PACU Progress Notes.
    Notes become read-only after first signature, but additional signatures
    can still be added (audit defensible).
    """
    ROLE_CHOICES = [
        ('rn', 'RN'),
        ('crna', 'CRNA'),
        ('md', 'MD/DO'),
        ('other', 'Other'),
    ]

    progress_notes = models.ForeignKey(
        'scheduling.PacuProgressNotes',
        on_delete=models.CASCADE,
        related_name='signatures'
    )
    clinic = models.ForeignKey('core.Clinic', on_delete=models.CASCADE)
    checkin = models.ForeignKey('scheduling.PatientCheckIn', on_delete=models.CASCADE)

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='rn')
    signer_name = models.CharField(max_length=200, blank=True, default='')

    signed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    signed_at = models.DateTimeField(null=True, blank=True)

    signature_data_url = models.TextField(blank=True, default='')

    content_hash = models.CharField(max_length=64, blank=True, default='')
    signature_hash = models.CharField(max_length=64, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['clinic', 'checkin', 'signed_at']),
        ]

    def __str__(self):
        return f"PACU Progress Notes Signature ({self.role}) for CheckIn #{self.checkin_id}"

class PacuRecord(models.Model):
    """
    PACU Record (paper-matching). Single RN signer.
    """
    clinic = models.ForeignKey(
        Clinic,
        on_delete=models.CASCADE,
        related_name="pacu_records"
    )
    checkin = models.OneToOneField(
        'scheduling.PatientCheckIn',
        on_delete=models.CASCADE,
        related_name="pacu_record"
    )

        # --- Header / top line (matches paper) ---
    surgeon = models.CharField(max_length=200, blank=True, default='')
    anesthesiologist = models.CharField(max_length=200, blank=True, default='')
    procedure = models.CharField(max_length=255, blank=True, default='')
    date = models.DateField(null=True, blank=True)
    arrival_time = models.TimeField(null=True, blank=True)

    anesthesia_type = models.CharField(max_length=50, blank=True, default='')  # Local / MAC / General / Other
    asa_level = models.CharField(max_length=10, blank=True, default='')        # 1 / 2 / 3

    # Airway / O2 / Allergies (matches checkboxes/lines)
    airway = models.CharField(max_length=50, blank=True, default='')           # N/A / Nasal / Oral / LMA / D/C’d
    airway_dc_time = models.TimeField(null=True, blank=True)

    o2_lpm = models.CharField(max_length=20, blank=True, default='')           # “___ L/min”
    o2_device = models.CharField(max_length=50, blank=True, default='')        # NC / Mask / N/A
    o2_dc_time = models.TimeField(null=True, blank=True)

    nkda = models.BooleanField(default=False)
    allergies_text = models.CharField(max_length=255, blank=True, default='')

    # --- Bottom clinical summary boxes (paper) ---
    cardiac = models.CharField(max_length=100, blank=True, default='')          # “RRR” / “Other”
    lungs = models.CharField(max_length=100, blank=True, default='')            # “CTA” / “Other”

    neuro_orientation = models.CharField(max_length=150, blank=True, default='')  # e.g., “Alert and Oriented x3”
    neuro_other = models.CharField(max_length=255, blank=True, default='')

    upper_extremities_motor = models.CharField(max_length=255, blank=True, default='')
    upper_extremities_sensory = models.CharField(max_length=255, blank=True, default='')
    lower_extremities_motor = models.CharField(max_length=255, blank=True, default='')
    lower_extremities_sensory = models.CharField(max_length=255, blank=True, default='')

    # --- Discharge section (paper) ---
    iv_dc_time = models.TimeField(null=True, blank=True)
    iv_site = models.CharField(max_length=100, blank=True, default='')
    iv_without_redness_swelling = models.BooleanField(default=False)

    vital_signs_stable = models.BooleanField(default=False)
    respirations_even_unlabored = models.BooleanField(default=False)
    breath_sounds = models.CharField(max_length=255, blank=True, default='')
    tolerating_po_fluids = models.BooleanField(default=False)

    discharged_to = models.CharField(max_length=50, blank=True, default='')      # Home / Other
    discharge_via = models.CharField(max_length=50, blank=True, default='')      # Wheelchair / Other
    discharge_other = models.CharField(max_length=255, blank=True, default='')

    discharge_pain_level = models.CharField(max_length=50, blank=True, default='')
    discharge_comments = models.TextField(blank=True, default='')
    discharge_time = models.TimeField(null=True, blank=True)

    # Large structured sections stored as JSON (table rows)
    aldrete_rows = models.JSONField(default=list, blank=True)
    patient_assessment_rows = models.JSONField(default=list, blank=True)
    wound_extremity_rows = models.JSONField(default=list, blank=True)
    medication_rows = models.JSONField(default=list, blank=True)

    intake_notes = models.TextField(blank=True, default='')
    output_notes = models.TextField(blank=True, default='')
    general_notes = models.TextField(blank=True, default='')

    # Auto-fill guard (from SurgeryCase)
    pacu_autofilled = models.BooleanField(default=False)
    pacu_autofilled_at = models.DateTimeField(null=True, blank=True)

    # Manual override lock:
    # If True, surgery schedule will never overwrite this PACU header again
    pacu_autofill_locked = models.BooleanField(default=False)

    # RN signature (single signer)
    is_signed = models.BooleanField(default=False)
    signed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    signed_at = models.DateTimeField(null=True, blank=True)
    signature_data_url = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"PACU Record – CheckIn #{self.checkin_id}"

class ImmediatePostOpProgressNote(models.Model):
    """
    Immediate Post-Operative Progress Note (paper-faithful).
    Single physician signer. Locks after signing.
    """
    clinic = models.ForeignKey('core.Clinic', on_delete=models.CASCADE, related_name='immediate_postop_notes')
    checkin = models.OneToOneField('scheduling.PatientCheckIn', on_delete=models.CASCADE, related_name='immediate_postop_note')

    pacu_record = models.OneToOneField(
        'scheduling.PacuRecord',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='immediate_postop_note'
    )

    surgeon_assist = models.CharField(max_length=255, blank=True, default='')

    pre_procedure_diagnosis = models.TextField(blank=True, default='')
    post_procedure_diagnosis_same = models.BooleanField(default=False)
    post_procedure_diagnosis_other = models.TextField(blank=True, default='')

    # Anesthesia checkboxes
    anesthesia_general = models.BooleanField(default=False)
    anesthesia_spinal = models.BooleanField(default=False)
    anesthesia_epidural = models.BooleanField(default=False)
    anesthesia_mac_local = models.BooleanField(default=False)
    anesthesia_regional = models.BooleanField(default=False)
    anesthesia_local = models.BooleanField(default=False)
    anesthesia_iv_sedation = models.BooleanField(default=False)

    procedure_name = models.CharField(max_length=255, blank=True, default='')
    findings = models.TextField(blank=True, default='')  # "Description of Each Finding..."
    disposition = models.CharField(max_length=50, blank=True, default='')  # PACU / Home / Other
    disposition_other = models.CharField(max_length=255, blank=True, default='')

    status_stable = models.BooleanField(default=False)
    status_other = models.CharField(max_length=255, blank=True, default='')

    drain_or_pack_none = models.BooleanField(default=False)
    drain_or_pack_yes = models.BooleanField(default=False)
    drain_or_pack_type = models.CharField(max_length=255, blank=True, default='')

    complications_none = models.BooleanField(default=False)
    complications_other = models.CharField(max_length=255, blank=True, default='')

    ebl_negligible = models.BooleanField(default=False)
    ebl_mls = models.CharField(max_length=50, blank=True, default='')

    specimen_no = models.BooleanField(default=False)
    specimen_pathology = models.BooleanField(default=False)
    specimen_discarded = models.BooleanField(default=False)

    operative_note_dictated_required = models.BooleanField(default=False)

    notes = models.TextField(blank=True, default='')

    # Signature + lock
    is_signed = models.BooleanField(default=False)
    signed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    signed_at = models.DateTimeField(null=True, blank=True)
    signature_data_url = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Immediate Post-Op Progress Note – CheckIn #{self.checkin_id}"

class ExparelBillingWorksheet(models.Model):
    """
    Exparel Billing Worksheet (ASC billing support).
    Keep data flexible: store paper-faithful fields in JSON, plus RN signer + lock.
    """
    clinic = models.ForeignKey('core.Clinic', on_delete=models.CASCADE, related_name='exparel_billing_worksheets')
    checkin = models.OneToOneField('scheduling.PatientCheckIn', on_delete=models.CASCADE, related_name='exparel_billing_worksheet')

    # Flexible payload that matches the paper form fields (we’ll map exact keys next)
    form_data = models.JSONField(default=dict, blank=True)

    # Signature / lock (single signer)
    is_signed = models.BooleanField(default=False)
    signed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    signed_at = models.DateTimeField(null=True, blank=True)
    signature_data_url = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Exparel Billing Worksheet – CheckIn #{self.checkin_id}"


class ImplantBillableInformation(models.Model):
    """
    Implant / Billable Information (ASC billing support).
    Table-like rows stored in JSON for print fidelity.
    """
    clinic = models.ForeignKey('core.Clinic', on_delete=models.CASCADE, related_name='implant_billables')
    checkin = models.OneToOneField('scheduling.PatientCheckIn', on_delete=models.CASCADE, related_name='implant_billable_information')

    # Rows: [{ item, manufacturer, catalog, lot, exp, qty, notes }, ...]
    rows = models.JSONField(default=list, blank=True)

    notes = models.TextField(blank=True, default='')

    # Signature / lock (single signer)
    is_signed = models.BooleanField(default=False)
    signed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    signed_at = models.DateTimeField(null=True, blank=True)
    signature_data_url = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Implant/Billable Info – CheckIn #{self.checkin_id}"

class Appointment(models.Model):
    """
    Represents a scheduled patient appointment.
    """
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('checked_in', 'Checked In'),
        ('roomed', 'Roomed'),
        ('ready', 'Ready'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
    ]

    clinic = models.ForeignKey(
        Clinic,
        on_delete=models.CASCADE,
        related_name='appointments'
    )

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='appointments'
    )

    scheduled_start = models.DateTimeField(db_index=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='scheduled',
        db_index=True
    )

    provider_name = models.CharField(max_length=200, blank=True)
    reason_for_visit = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    provider = models.ForeignKey(
        Provider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='appointments'
    )

    class Meta:
        ordering = ['scheduled_start']
        indexes = [
            models.Index(fields=['clinic', 'scheduled_start']),
            models.Index(fields=['clinic', 'status', 'scheduled_start']),
        ]

    def __str__(self):
        return f"{self.patient.full_name} — {self.scheduled_start}"

class PatientCheckIn(models.Model):
    """
    Tracks when a patient is physically present in the clinic.
    """
    STATUS_CHOICES = [
        ('checked_in', 'Checked In'),
        ('roomed', 'Roomed'),
        ('ready', 'Ready'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)

    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='checkins'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='checked_in',
        db_index=True
    )

    room = models.CharField(max_length=50, blank=True, default='')
    assigned_staff_name = models.CharField(max_length=200, blank=True, default='')
    provider_name = models.CharField(max_length=200, blank=True, default='')

    status_changed_at = models.DateTimeField(default=timezone.now)
    roomed_at = models.DateTimeField(null=True, blank=True)
    ready_at = models.DateTimeField(null=True, blank=True)
    in_progress_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    check_in_time = models.DateTimeField(auto_now_add=True)
    check_out_time = models.DateTimeField(null=True, blank=True)

    checked_in_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=['clinic', 'is_active']),
            models.Index(fields=['clinic', 'status', 'check_in_time']),
        ]

    def __str__(self):
        return f"{self.patient.full_name} — {self.status}"

class CheckInStatusEvent(models.Model):
    """
    Immutable event log for operational analytics (not clinical decision support).
    Tracks every status transition with timestamp.
    """
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE)
    checkin = models.ForeignKey(PatientCheckIn, on_delete=models.CASCADE, related_name='status_events')
    status = models.CharField(max_length=20, db_index=True)
    occurred_at = models.DateTimeField(default=timezone.now, db_index=True)

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        ordering = ['occurred_at']
        indexes = [
            models.Index(fields=['clinic', 'occurred_at']),
            models.Index(fields=['clinic', 'status', 'occurred_at']),
        ]

    def __str__(self):
        return f"{self.checkin_id} {self.status} @ {self.occurred_at}"

class PacuMobilityAssessment(models.Model):
    """
    PACU Mobility Assessment (paper-matching) with tablet signature + audit-safe locking.
    """
    PASS_FAIL = [
        ('pass', 'Pass'),
        ('fail', 'Fail'),
    ]

    clinic = models.ForeignKey('core.Clinic', on_delete=models.CASCADE, related_name='pacu_mobility_assessments')
    checkin = models.OneToOneField('scheduling.PatientCheckIn', on_delete=models.CASCADE, related_name='mobility_assessment')

    # Level 1
    level1_result = models.CharField(max_length=10, choices=PASS_FAIL, blank=True, default='')
    level1_time_initials = models.CharField(max_length=50, blank=True, default='')

    # Level 2
    level2_result = models.CharField(max_length=10, choices=PASS_FAIL, blank=True, default='')
    level2_time_initials = models.CharField(max_length=50, blank=True, default='')

    # Level 3
    level3_result = models.CharField(max_length=10, choices=PASS_FAIL, blank=True, default='')
    level3_time_initials = models.CharField(max_length=50, blank=True, default='')

    notes = models.TextField(blank=True, default='')

    # Signature + verification
    is_signed = models.BooleanField(default=False)
    signed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    signed_at = models.DateTimeField(null=True, blank=True)

    # Store the drawn signature as a data URL (PNG). Later we can store as a file.
    signature_data_url = models.TextField(blank=True, default='')

    # Tamper-evident hashes
    content_hash = models.CharField(max_length=64, blank=True, default='')
    signature_hash = models.CharField(max_length=64, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def _canonical_payload(self):
        return {
            "level1_result": self.level1_result,
            "level1_time_initials": self.level1_time_initials,
            "level2_result": self.level2_result,
            "level2_time_initials": self.level2_time_initials,
            "level3_result": self.level3_result,
            "level3_time_initials": self.level3_time_initials,
            "notes": self.notes,
            "checkin_id": self.checkin_id,
            "clinic_id": self.clinic_id,
        }

    def compute_hashes(self):
        payload = self._canonical_payload()
        payload_json = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        self.content_hash = hashlib.sha256(payload_json).hexdigest()

        sig_bytes = (self.signature_data_url or "").encode("utf-8")
        self.signature_hash = hashlib.sha256(self.content_hash.encode("utf-8") + sig_bytes).hexdigest()

    def sign_and_lock(self, user):
        self.is_signed = True
        self.signed_by = user
        self.signed_at = timezone.now()
        self.compute_hashes()
        self.save(update_fields=[
            "is_signed", "signed_by", "signed_at",
            "content_hash", "signature_hash", "updated_at"
        ])

    def __str__(self):
        return f"PACU Mobility Assessment (CheckIn #{self.checkin_id})"
