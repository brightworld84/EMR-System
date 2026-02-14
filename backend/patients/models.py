"""
Patient models for EMR system.
HIPAA-compliant patient management.
"""

from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import date, timedelta
from core.models import Clinic, EncryptedField


class Patient(models.Model):
    """
    Patient demographics and core information.
    Contains Protected Health Information (PHI) - must be audited.
    """
    
    # Clinic association (multi-tenant)
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name='patients')
    
    # Medical Record Number (MRN) - unique per clinic
    medical_record_number = models.CharField(max_length=50, db_index=True)
    
    # Demographics
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()

    # Gender
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
        ('U', 'Unknown'),
    ]
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)

    # ONC demographics (store as strings for now; can upgrade to coded values later)
    race = models.CharField(max_length=100, blank=True, default="")
    ethnicity = models.CharField(max_length=100, blank=True, default="")
    
    # Optional but useful ONC/USCDI fields
    sexual_orientation = models.CharField(max_length=100, blank=True, default="")
    gender_identity = models.CharField(max_length=100, blank=True, default="")
    
    # Preferred Language
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('es', 'Spanish'),
        ('other', 'Other'),
    ]
    preferred_language = models.CharField(max_length=10, choices=LANGUAGE_CHOICES, default='en')
    
    # SSN (encrypted) - HIPAA requires encryption for SSN
    ssn_encrypted = models.CharField(max_length=500, blank=True)
    
    # Contact Information
    phone_primary = models.CharField(max_length=20)
    phone_secondary = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    
    # Address
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2, default='TX')
    zip_code = models.CharField(max_length=10)
    
    # Emergency Contact
    emergency_contact_name = models.CharField(max_length=200, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    emergency_contact_relationship = models.CharField(max_length=50, blank=True)
    
    # Insurance - Primary
    insurance_primary_company = models.CharField(max_length=200, blank=True)
    insurance_primary_policy_number = models.CharField(max_length=100, blank=True)
    insurance_primary_group_number = models.CharField(max_length=100, blank=True)
    insurance_primary_subscriber_name = models.CharField(max_length=200, blank=True)
    insurance_primary_subscriber_dob = models.DateField(null=True, blank=True)
    
    # Insurance - Secondary
    insurance_secondary_company = models.CharField(max_length=200, blank=True)
    insurance_secondary_policy_number = models.CharField(max_length=100, blank=True)
    insurance_secondary_group_number = models.CharField(max_length=100, blank=True)
    
    # Privacy Settings (HIPAA patient rights)
    privacy_restrictions = models.JSONField(
        default=dict,
        blank=True,
        help_text="Patient-requested restrictions on PHI disclosure"
    )
    consent_for_treatment = models.BooleanField(default=False)
    consent_for_phi_disclosure = models.BooleanField(default=False)
    notice_of_privacy_practices_provided = models.BooleanField(default=False)
    notice_of_privacy_practices_date = models.DateField(null=True, blank=True)
    
    # Photo
    photo = models.ImageField(upload_to='patient_photos/', blank=True, null=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_deceased = models.BooleanField(default=False)
    deceased_date = models.DateField(null=True, blank=True)
    
    # Record Management
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_patients'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Retention (Texas law: 10 years for adults, 20 for minors)
    record_retention_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date after which record can be archived/deleted"
    )
    
    class Meta:
        db_table = 'patients'
        ordering = ['last_name', 'first_name']
        unique_together = [['clinic', 'medical_record_number']]
        indexes = [
            models.Index(fields=['clinic', 'medical_record_number']),
            models.Index(fields=['clinic', 'last_name', 'first_name']),
            models.Index(fields=['clinic', 'date_of_birth']),
        ]
    
    def __str__(self):
        return f"{self.last_name}, {self.first_name} (MRN: {self.medical_record_number})"
    
    @property
    def age(self):
        """Calculate patient age"""
        if self.is_deceased and self.deceased_date:
            end_date = self.deceased_date
        else:
            end_date = date.today()
        
        age = end_date.year - self.date_of_birth.year
        if end_date.month < self.date_of_birth.month or \
           (end_date.month == self.date_of_birth.month and end_date.day < self.date_of_birth.day):
            age -= 1
        return age
    
    @property
    def is_minor(self):
        """Check if patient is a minor (under 18)"""
        return self.age < 18
    
    @property
    def full_name(self):
        """Get full name"""
        if self.middle_name:
            return f"{self.first_name} {self.middle_name} {self.last_name}"
        return f"{self.first_name} {self.last_name}"
    
    @property
    def ssn(self):
        """Decrypt and return SSN"""
        if self.ssn_encrypted:
            return EncryptedField.decrypt(self.ssn_encrypted)
        return ''
    
    @ssn.setter
    def ssn(self, value):
        """Encrypt and store SSN"""
        if value:
            self.ssn_encrypted = EncryptedField.encrypt(value)
        else:
            self.ssn_encrypted = ''
    
    def calculate_retention_date(self):
        """Calculate record retention date per Texas law"""
        if self.pk is None:
            return None
        if self.is_deceased and self.deceased_date:
            # 10 years from death
            return self.deceased_date + timedelta(days=365 * settings.RECORD_RETENTION_ADULT_YEARS)
        elif self.is_minor:
            # Until age 20 or 20 years from last treatment
            age_20_date = date(self.date_of_birth.year + 20, self.date_of_birth.month, self.date_of_birth.day)
            return age_20_date
        else:
            # 10 years from last treatment
            last_encounter = self.encounters.order_by('-encounter_date').first()
            if last_encounter:
                return last_encounter.encounter_date + timedelta(days=365 * settings.RECORD_RETENTION_ADULT_YEARS)
            return None
    
    def save(self, *args, **kwargs):
        """Override save to calculate retention date"""
        self.record_retention_date = self.calculate_retention_date()
        super().save(*args, **kwargs)


class Allergy(models.Model):
    """
    Patient allergies.
    Critical safety information - must be prominently displayed.
    """
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='allergies')
    
    allergen = models.CharField(max_length=200, help_text="Drug, food, or environmental allergen")
    
    SEVERITY_CHOICES = [
        ('mild', 'Mild'),
        ('moderate', 'Moderate'),
        ('severe', 'Severe/Anaphylaxis'),
    ]
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    
    reaction = models.TextField(help_text="Description of allergic reaction")
    
    # Status
    is_active = models.BooleanField(default=True)
    onset_date = models.DateField(null=True, blank=True)
    
    # Source
    reported_by = models.CharField(max_length=100, blank=True, help_text="Patient, family, etc.")
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Migration flag
    imported_from_imed = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'allergies'
        ordering = ['-severity', 'allergen']
    
    def __str__(self):
        return f"{self.allergen} ({self.severity})"


class Medication(models.Model):
    """
    Current medications list.
    Required for drug interaction checking and continuity of care.
    """
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='medications')
    
    name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100, blank=True)
    frequency = models.CharField(max_length=100, blank=True, help_text="e.g., 'twice daily', 'as needed'")
    route = models.CharField(max_length=50, blank=True, help_text="e.g., 'oral', 'topical'")
    
    # Prescribing info
    prescribed_by = models.CharField(max_length=200, blank=True)
    prescribed_date = models.DateField(null=True, blank=True)
    
    # Purpose
    indication = models.CharField(max_length=200, blank=True, help_text="Why prescribed")
    
    # Status
    is_active = models.BooleanField(default=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    discontinued_date = models.DateField(null=True, blank=True)
    discontinued_reason = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Migration flag
    imported_from_imed = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'medications'
        ordering = ['is_active', 'name']
    
    def __str__(self):
        if self.dosage:
            return f"{self.name} {self.dosage}"
        return self.name


class Problem(models.Model):
    """
    Problem/diagnosis list.
    Tracks active and resolved conditions.
    """
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='problems')
    
    # Description
    description = models.CharField(max_length=500)
    
    # ICD-10 code
    icd10_code = models.CharField(max_length=10, blank=True)
    
    # Status
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('resolved', 'Resolved'),
        ('chronic', 'Chronic'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Dates
    onset_date = models.DateField(null=True, blank=True)
    resolved_date = models.DateField(null=True, blank=True)
    
    # Clinical info
    severity = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)
    
    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_problems'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Migration flag
    imported_from_imed = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'problems'
        ordering = ['status', '-onset_date']
    
    def __str__(self):
        return f"{self.description} ({self.status})"


class FamilyHistory(models.Model):
    """
    Family medical history.
    Important for risk assessment.
    """
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='family_history')
    
    RELATIONSHIP_CHOICES = [
        ('father', 'Father'),
        ('mother', 'Mother'),
        ('sibling', 'Sibling'),
        ('grandparent', 'Grandparent'),
        ('child', 'Child'),
        ('other', 'Other'),
    ]
    relationship = models.CharField(max_length=20, choices=RELATIONSHIP_CHOICES)
    
    condition = models.CharField(max_length=200)
    age_at_diagnosis = models.IntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'family_history'
        verbose_name_plural = 'Family histories'
    
    def __str__(self):
        return f"{self.relationship}: {self.condition}"


class SocialHistory(models.Model):
    """
    Social history (tobacco, alcohol, drugs, occupation).
    Updated periodically during visits.
    """
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='social_history')
    
    # Tobacco use
    TOBACCO_CHOICES = [
        ('never', 'Never used'),
        ('former', 'Former user'),
        ('current', 'Current user'),
    ]
    tobacco_use = models.CharField(max_length=20, choices=TOBACCO_CHOICES, default='never')
    tobacco_packs_per_day = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    tobacco_years = models.IntegerField(null=True, blank=True)
    tobacco_quit_date = models.DateField(null=True, blank=True)
    
    # Alcohol use
    ALCOHOL_CHOICES = [
        ('never', 'Never'),
        ('occasional', 'Occasional'),
        ('moderate', 'Moderate'),
        ('heavy', 'Heavy'),
    ]
    alcohol_use = models.CharField(max_length=20, choices=ALCOHOL_CHOICES, default='never')
    alcohol_drinks_per_week = models.IntegerField(null=True, blank=True)
    
    # Drug use
    illicit_drug_use = models.BooleanField(default=False)
    illicit_drug_details = models.TextField(blank=True)
    
    # Occupation
    occupation = models.CharField(max_length=200, blank=True)
    occupational_hazards = models.TextField(blank=True)
    
    # Other
    exercise_frequency = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'social_history'
        verbose_name_plural = 'Social histories'
    
    def __str__(self):
        return f"Social history for {self.patient}"
