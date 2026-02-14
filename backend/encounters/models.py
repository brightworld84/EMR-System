"""
Encounter models for clinical documentation.
Includes electronic signatures for 21 CFR Part 11 compliance.
"""

from django.db import models
from django.conf import settings
from django.utils import timezone
import hashlib
import json


class Encounter(models.Model):
    """
    Clinical encounter/visit.
    Central document for patient care - must be signed and locked.
    """
    
    # Patient and clinic
    patient = models.ForeignKey('patients.Patient', on_delete=models.CASCADE, related_name='encounters')
    clinic = models.ForeignKey('core.Clinic', on_delete=models.CASCADE, related_name='encounters')
    
    # Provider
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='encounters_as_provider'
    )
    
    # Encounter details
    encounter_date = models.DateTimeField(default=timezone.now, db_index=True)
    
    ENCOUNTER_TYPE_CHOICES = [
        ('new_patient', 'New Patient'),
        ('established', 'Established Patient'),
        ('follow_up', 'Follow-up'),
        ('annual_physical', 'Annual Physical'),
        ('pre_op', 'Pre-operative'),
        ('post_op', 'Post-operative'),
        ('consultation', 'Consultation'),
        ('procedure', 'Procedure'),
        ('surgery', 'Surgery'),
        ('emergency', 'Emergency'),
        ('telemedicine', 'Telemedicine'),
    ]
    encounter_type = models.CharField(max_length=30, choices=ENCOUNTER_TYPE_CHOICES)
    
    # Chief complaint
    chief_complaint = models.TextField()
    
    # Specialty-specific data (flexible JSON structure)
    specialty = models.CharField(max_length=50, blank=True)  # 'ophthalmology', 'orthopedics', 'cosmetic'
    clinical_data = models.JSONField(
        default=dict,
        help_text="Specialty-specific exam data"
    )
    
    # Universal clinical elements
    assessment = models.TextField(blank=True)
    plan = models.TextField(blank=True)
    
    # Associated diagnoses
    diagnoses = models.ManyToManyField('Diagnosis', blank=True)
    
    # Procedures performed
    procedures = models.ManyToManyField('Procedure', blank=True)
    
    # Billing
    billing_codes = models.JSONField(default=list, help_text="CPT codes")
    
    # Status
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('in_progress', 'In Progress'),
        ('pending_signature', 'Pending Signature'),
        ('signed', 'Signed'),
        ('amended', 'Amended'),
        ('archived', 'Archived'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Locking (signed encounters are locked)
    is_locked = models.BooleanField(default=False)
    locked_at = models.DateTimeField(null=True, blank=True)
    
    # Amendment tracking (21 CFR Part 11)
    is_amended = models.BooleanField(default=False)
    amendment_reason = models.TextField(blank=True)
    original_encounter = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='amendments'
    )
    
    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_encounters'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Migration flag
    imported_from_imed = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'encounters'
        ordering = ['-encounter_date']
        indexes = [
            models.Index(fields=['patient', '-encounter_date']),
            models.Index(fields=['provider', '-encounter_date']),
            models.Index(fields=['clinic', '-encounter_date']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.patient} - {self.encounter_type} on {self.encounter_date.date()}"
    
    def can_edit(self):
        """Check if encounter can be edited"""
        return not self.is_locked and self.status not in ['signed', 'archived']
    
    def lock(self):
        """Lock encounter after signing"""
        self.is_locked = True
        self.locked_at = timezone.now()
        self.status = 'signed'
        self.save()
    
    def get_content_hash(self):
        """Generate hash of encounter content for signature verification"""
        content = {
            'patient_id': self.patient_id,
            'encounter_date': str(self.encounter_date),
            'encounter_type': self.encounter_type,
            'chief_complaint': self.chief_complaint,
            'clinical_data': self.clinical_data,
            'assessment': self.assessment,
            'plan': self.plan,
        }
        content_str = json.dumps(content, sort_keys=True)
        return hashlib.sha256(content_str.encode()).hexdigest()


class ElectronicSignature(models.Model):
    """
    Electronic signature for encounters.
    Compliant with 21 CFR Part 11.
    
    Requirements:
    - Unique to one individual
    - Verified by password re-entry or biometric
    - Linked to timestamped record
    - Cannot be removed or altered
    """
    
    encounter = models.ForeignKey(
        Encounter,
        on_delete=models.CASCADE,
        related_name='signatures'
    )
    
    # Who signed
    signer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,  # Cannot delete user with signatures
        related_name='signatures'
    )
    signer_name = models.CharField(max_length=200)  # Preserved name
    signer_credentials = models.CharField(max_length=100, blank=True)  # MD, NP, PA, etc.
    
    # When signed
    signed_at = models.DateTimeField(auto_now_add=True)
    
    # Signature meaning
    MEANING_CHOICES = [
        ('authorship', 'Authorship'),
        ('review', 'Review'),
        ('approval', 'Approval'),
        ('co_signature', 'Co-signature'),
    ]
    meaning = models.CharField(max_length=20, choices=MEANING_CHOICES, default='authorship')
    
    # Authentication method
    password_verified = models.BooleanField(default=False)
    biometric_verified = models.BooleanField(default=False)
    
    # Context
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    
    # Content hash (what was signed)
    content_hash = models.CharField(
        max_length=64,
        help_text="SHA-256 hash of signed content"
    )
    
    # Signature itself (combining all elements)
    signature_hash = models.CharField(
        max_length=64,
        help_text="Hash of signature components for verification"
    )
    
    # Metadata
    metadata = models.JSONField(default=dict)
    
    class Meta:
        db_table = 'electronic_signatures'
        ordering = ['-signed_at']
        # Cannot delete signatures
        permissions = [
            ('view_electronic_signature', 'Can view electronic signatures'),
        ]
    
    def __str__(self):
        return f"{self.signer_name} signed {self.encounter} at {self.signed_at}"
    
    def save(self, *args, **kwargs):
        """Generate signature hash"""
        if not self.signature_hash:
            # Capture signer name and credentials
            self.signer_name = self.signer.get_full_name()
            if hasattr(self.signer, 'license_number'):
                self.signer_credentials = f"{self.signer.role} {self.signer.license_number}"
            
            # Generate content hash
            self.content_hash = self.encounter.get_content_hash()
            
            # Generate signature hash
            sig_content = f"{self.signer_name}{self.signed_at}{self.content_hash}{self.ip_address}"
            self.signature_hash = hashlib.sha256(sig_content.encode()).hexdigest()
        
        super().save(*args, **kwargs)
    
    def verify(self):
        """Verify signature integrity"""
        # Recreate signature hash
        sig_content = f"{self.signer_name}{self.signed_at}{self.content_hash}{self.ip_address}"
        expected_hash = hashlib.sha256(sig_content.encode()).hexdigest()
        
        return self.signature_hash == expected_hash


class Diagnosis(models.Model):
    """
    Diagnoses with ICD-10 codes.
    """
    code = models.CharField(max_length=10, unique=True, db_index=True)
    description = models.TextField()
    
    # Categorization
    category = models.CharField(max_length=100, blank=True)
    
    # Common usage tracking
    usage_count = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'diagnoses'
        verbose_name_plural = 'Diagnoses'
        ordering = ['code']
    
    def __str__(self):
        return f"{self.code} - {self.description}"


class Procedure(models.Model):
    """
    Procedures with CPT codes.
    """
    code = models.CharField(max_length=10, unique=True, db_index=True)
    description = models.TextField()
    
    # Categorization
    category = models.CharField(max_length=100, blank=True)
    specialty = models.CharField(max_length=50, blank=True)
    
    # Billing
    default_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Common usage tracking
    usage_count = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'procedures'
        ordering = ['code']
    
    def __str__(self):
        return f"{self.code} - {self.description}"


class Vital(models.Model):
    """
    Vital signs recorded during encounter.
    """
    encounter = models.ForeignKey(
        Encounter,
        on_delete=models.CASCADE,
        related_name='vitals'
    )
    
    # Standard vitals
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    temperature_unit = models.CharField(max_length=1, choices=[('F', 'Fahrenheit'), ('C', 'Celsius')], default='F')
    
    heart_rate = models.IntegerField(null=True, blank=True, help_text="BPM")
    
    blood_pressure_systolic = models.IntegerField(null=True, blank=True)
    blood_pressure_diastolic = models.IntegerField(null=True, blank=True)
    
    respiratory_rate = models.IntegerField(null=True, blank=True, help_text="Breaths per minute")
    
    oxygen_saturation = models.IntegerField(null=True, blank=True, help_text="SpO2 %")
    
    # Measurements
    height = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Inches")
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Pounds")
    bmi = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    
    # Pain assessment
    pain_level = models.IntegerField(
        null=True,
        blank=True,
        help_text="0-10 scale"
    )
    
    # Who recorded
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    recorded_at = models.DateTimeField(auto_now_add=True)
    
    # Notes
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'vitals'
        ordering = ['-recorded_at']
    
    def __str__(self):
        return f"Vitals for {self.encounter}"
    
    def save(self, *args, **kwargs):
        """Calculate BMI if height and weight present"""
        if self.height and self.weight:
            # BMI = (weight in pounds / (height in inches)^2) * 703
            self.bmi = (self.weight / (self.height ** 2)) * 703
        super().save(*args, **kwargs)
