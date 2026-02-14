"""
Core models for the EMR system.
Includes User, Clinic, AuditLog with HIPAA compliance.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from django.utils import timezone
from cryptography.fernet import Fernet
import hashlib
import json


class Clinic(models.Model):
    """
    Medical practice or surgery center.
    Multi-tenant support - each clinic has isolated data.
    """
    name = models.CharField(max_length=255)
    timezone = models.CharField(max_length=64, default='America/Chicago')

    workflow_labels = models.JSONField(default=dict, blank=True)
    
    # Texas Medical Board Registration
    texas_medical_board_number = models.CharField(max_length=50, blank=True)
    npi = models.CharField(max_length=10, blank=True, help_text="National Provider Identifier")
    
    # Address
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2, default='TX')
    zip_code = models.CharField(max_length=10)
    
    # Contact
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    website = models.URLField(blank=True)
    
    # Clinic Type
    CLINIC_TYPES = [
        ('primary_care', 'Primary Care'),
        ('specialty', 'Specialty Practice'),
        ('surgery_center', 'Surgery Center'),
        ('multi_specialty', 'Multi-Specialty Practice'),
    ]
    clinic_type = models.CharField(max_length=20, choices=CLINIC_TYPES)
    
    # Specialties offered
    specialties = models.JSONField(default=list, help_text="List of specialties")
    
    # Settings
    
    # Compliance
    hipaa_trained = models.BooleanField(default=False)
    baa_signed_date = models.DateField(null=True, blank=True, help_text="Business Associate Agreement")
    last_security_audit = models.DateField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'clinics'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class User(AbstractUser):
    """
    Custom user model with HIPAA-compliant features.
    Unique identification required by HIPAA § 164.312(a)(2)(i).
    """
    
    # Clinic association (multi-tenant)
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name='users')
    
    # Role-based access control
    ROLE_CHOICES = [
        ('physician', 'Physician'),
        ('surgeon', 'Surgeon'),
        ('nurse_practitioner', 'Nurse Practitioner'),
        ('physician_assistant', 'Physician Assistant'),
        ('nurse', 'Nurse'),
        ('tech', 'Technician'),
        ('scribe', 'Scribe'),
        ('front_desk', 'Front Desk'),
        ('surgery_scheduler', 'Surgery Scheduler'),
        ('or_nurse', 'OR Nurse'),
        ('anesthesiologist', 'Anesthesiologist'),
        ('admin', 'Administrator'),
    ]
    role = models.CharField(max_length=30, choices=ROLE_CHOICES)
    
    # Professional credentials
    npi = models.CharField(max_length=10, blank=True, help_text="National Provider Identifier")
    license_number = models.CharField(max_length=50, blank=True)
    license_state = models.CharField(max_length=2, blank=True, default='TX')
    dea_number = models.CharField(max_length=20, blank=True, help_text="DEA for prescribing")
    
    # Specialties (providers can have multiple)
    specialties = models.JSONField(default=list)
    
    # Contact
    phone = models.CharField(max_length=20, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    
    # MFA (HIPAA best practice)
    mfa_enabled = models.BooleanField(default=False)
    
    # Preferences
    default_encounter_type = models.CharField(max_length=50, blank=True)
    preferred_layout = models.ForeignKey(
        'layouts.LayoutTemplate',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='preferred_by_users'
    )
    auto_population_enabled = models.BooleanField(default=True)
    
    # HIPAA Training (required)
    hipaa_trained = models.BooleanField(default=False)
    hipaa_training_date = models.DateField(null=True, blank=True)
    hipaa_training_expires = models.DateField(null=True, blank=True)
    
    # Security
    last_password_change = models.DateTimeField(null=True, blank=True)
    password_expires_at = models.DateTimeField(null=True, blank=True)
    failed_login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'
        ordering = ['last_name', 'first_name']
        permissions = [
            ('view_phi', 'Can view Protected Health Information'),
            ('export_data', 'Can export patient data'),
            ('break_the_glass', 'Can access restricted patient records'),
        ]
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"
    
    def is_provider(self):
        """Check if user is a clinical provider"""
        return self.role in ['physician', 'surgeon', 'nurse_practitioner', 'physician_assistant']
    
    def can_prescribe(self):
        """Check if user can prescribe medications"""
        return self.role in ['physician', 'surgeon', 'nurse_practitioner', 'physician_assistant'] and self.dea_number


class AuditLog(models.Model):
    """
    Comprehensive audit trail for HIPAA compliance.
    Required by HIPAA § 164.312(b) - Audit Controls.
    
    Must track:
    - Who accessed/modified data
    - What was accessed/modified
    - When it occurred
    - Where (IP address)
    - Why (reason for access)
    """
    
    # Who
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )
    username = models.CharField(max_length=150)  # Preserved even if user deleted
    user_role = models.CharField(max_length=30)
    clinic = models.ForeignKey(Clinic, on_delete=models.SET_NULL, null=True)
    
    # What action
    ACTION_CHOICES = [
        ('create', 'Created'),
        ('read', 'Viewed'),
        ('update', 'Updated'),
        ('delete', 'Deleted'),
        ('print', 'Printed'),
        ('export', 'Exported'),
        ('email', 'Emailed'),
        ('login', 'Logged in'),
        ('logout', 'Logged out'),
        ('failed_login', 'Failed login attempt'),
        ('password_change', 'Changed password'),
        ('password_reset', 'Reset password'),
        ('mfa_enable', 'Enabled MFA'),
        ('mfa_disable', 'Disabled MFA'),
        ('signature', 'Electronically signed'),
        ('break_glass', 'Emergency access (Break the Glass)'),
    ]
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    
    # What resource
    resource_type = models.CharField(max_length=50)  # 'patient', 'encounter', 'image', etc.
    resource_id = models.IntegerField(null=True)
    resource_repr = models.CharField(max_length=255, blank=True)  # Human-readable representation
    
    # When
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    # Where
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    
    # Why/How
    reason = models.TextField(blank=True, help_text="Reason for access (e.g., 'Emergency access')")
    
    # What changed (for update actions)
    changes = models.JSONField(
        null=True,
        blank=True,
        help_text="{'field_name': {'old': 'value', 'new': 'value'}}"
    )
    
    # Additional context
    metadata = models.JSONField(default=dict)
    
    # Integrity protection (tamper detection)
    previous_log_hash = models.CharField(max_length=64, blank=True)
    log_hash = models.CharField(max_length=64, blank=True)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['clinic', 'timestamp']),
        ]
        # Prevent deletion - audit logs must be retained
        permissions = [
            ('view_audit_log', 'Can view audit logs'),
        ]
    
    def __str__(self):
        return f"{self.username} {self.action} {self.resource_type} at {self.timestamp}"
    
    def save(self, *args, **kwargs):
        """Generate hash for tamper detection"""
        if not self.log_hash:
            # Get the hash of the previous log entry
            last_log = AuditLog.objects.order_by('-id').first()
            if last_log:
                self.previous_log_hash = last_log.log_hash
            
            # Create hash of this log entry
            hash_content = f"{self.username}{self.action}{self.resource_type}{self.resource_id}{self.timestamp}{self.previous_log_hash}"
            self.log_hash = hashlib.sha256(hash_content.encode()).hexdigest()
        
        super().save(*args, **kwargs)
    
    @classmethod
    def log_action(cls, user, action, resource_type, resource_id=None, resource_repr='', ip_address='', user_agent='', reason='', changes=None, metadata=None):
        """
        Helper method to create audit log entries.
        
        Usage:
            AuditLog.log_action(
                user=request.user,
                action='read',
                resource_type='patient',
                resource_id=patient.id,
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT')
            )
        """
        return cls.objects.create(
            user=user,
            username=user.username if user else 'anonymous',
            user_role=user.role if user and hasattr(user, 'role') else 'unknown',
            clinic=user.clinic if user and hasattr(user, 'clinic') else None,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_repr=resource_repr,
            ip_address=ip_address or '0.0.0.0',
            user_agent=user_agent or '',
            reason=reason,
            changes=changes,
            metadata=metadata or {}
        )


class EncryptedField:
    """
    Utility class for encrypting sensitive fields (SSN, etc.)
    Uses Fernet symmetric encryption.
    """
    
    @staticmethod
    def encrypt(plaintext):
        """Encrypt plaintext string"""
        if not plaintext:
            return ''
        
        cipher = Fernet(settings.ENCRYPTION_KEY.encode())
        encrypted = cipher.encrypt(plaintext.encode())
        return encrypted.decode()
    
    @staticmethod
    def decrypt(ciphertext):
        """Decrypt ciphertext string"""
        if not ciphertext:
            return ''
        
        cipher = Fernet(settings.ENCRYPTION_KEY.encode())
        decrypted = cipher.decrypt(ciphertext.encode())
        return decrypted.decode()


class SystemConfiguration(models.Model):
    """
    System-wide configuration settings.
    """
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    description = models.TextField(blank=True)
    
    # Metadata
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'system_configuration'
        ordering = ['key']
    
    def __str__(self):
        return self.key
