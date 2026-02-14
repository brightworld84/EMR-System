"""
Layout customization models.
Allows creating custom form layouts per clinic/provider.
"""

from django.db import models
from django.conf import settings


class LayoutTemplate(models.Model):
    """
    Customizable layout template for encounter forms.
    Can be clinic-specific, provider-specific, or global.
    
    This is the core of the customization system - allows each practice
    to have forms that match their paper charts.
    """
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Specialty and type
    specialty = models.CharField(
        max_length=50,
        choices=[
            ('ophthalmology', 'Ophthalmology'),
            ('orthopedics', 'Orthopedics'),
            ('cosmetic', 'Cosmetic Surgery'),
            ('general', 'General'),
        ]
    )
    
    VISIT_TYPE_CHOICES = [
        ('new_patient', 'New Patient'),
        ('follow_up', 'Follow-up'),
        ('annual_physical', 'Annual Physical'),
        ('pre_op', 'Pre-operative'),
        ('post_op', 'Post-operative'),
        ('consultation', 'Consultation'),
        ('procedure', 'Procedure'),
    ]
    visit_type = models.CharField(max_length=30, choices=VISIT_TYPE_CHOICES)
    
    # Ownership
    clinic = models.ForeignKey(
        'core.Clinic',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='layout_templates',
        help_text="If set, only this clinic can use this template"
    )
    
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='layout_templates',
        help_text="If set, only this provider can use this template"
    )
    
    is_global = models.BooleanField(
        default=False,
        help_text="If true, all clinics can use this template"
    )
    
    # Layout configuration (JSON structure)
    layout = models.JSONField(
        default=dict,
        help_text="""
        Structure:
        {
          "pages": [
            {
              "page_number": 1,
              "sections": [
                {
                  "id": "demographics",
                  "title": "Patient Information",
                  "position": {"x": 0, "y": 0, "width": 12, "height": 2},
                  "fields": [
                    {
                      "name": "patient_name",
                      "label": "Patient Name",
                      "type": "text",
                      "required": true,
                      "auto_populate": "patient.full_name",
                      "readonly": true
                    }
                  ]
                }
              ]
            }
          ],
          "auto_population_rules": {
            "allergies": "carry_forward",
            "medications": "carry_forward_active_only"
          }
        }
        """
    )
    
    # Auto-population settings
    auto_population_enabled = models.BooleanField(default=True)
    
    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_layout_templates'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Usage tracking
    usage_count = models.IntegerField(default=0)
    last_used_at = models.DateTimeField(null=True, blank=True)
    
    # Version control
    version = models.IntegerField(default=1)
    parent_template = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='versions'
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'layout_templates'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['specialty', 'visit_type']),
            models.Index(fields=['clinic', 'specialty']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.specialty} - {self.visit_type})"
    
    def can_be_used_by(self, user):
        """Check if user can use this template"""
        if self.is_global:
            return True
        if self.clinic and self.clinic == user.clinic:
            return True
        if self.provider and self.provider == user:
            return True
        return False


class LayoutSection(models.Model):
    """
    Pre-built sections that can be added to layouts.
    Think of these as building blocks for forms.
    
    Examples:
    - Visual Acuity section (ophthalmology)
    - Range of Motion section (orthopedics)
    - Before/After Photos section (cosmetic)
    """
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Categorization
    specialty = models.CharField(max_length=50)
    category = models.CharField(
        max_length=50,
        choices=[
            ('exam', 'Examination'),
            ('history', 'History'),
            ('assessment', 'Assessment'),
            ('plan', 'Plan'),
            ('procedures', 'Procedures'),
            ('vitals', 'Vital Signs'),
            ('images', 'Images'),
        ]
    )
    
    # Fields configuration
    fields = models.JSONField(
        default=list,
        help_text="""
        List of fields in this section:
        [
          {
            "name": "va_od",
            "label": "Visual Acuity OD",
            "type": "select",
            "options": ["20/20", "20/25", "20/30", ...],
            "required": false,
            "auto_populate": "last_value",
            "validation": {"pattern": "^\d+/\d+$"}
          }
        ]
        """
    )
    
    # Default settings
    default_width = models.IntegerField(default=6)  # Grid units (out of 12)
    default_height = models.IntegerField(default=4)  # Grid units
    default_auto_population = models.JSONField(default=dict)
    
    # Visibility
    is_public = models.BooleanField(
        default=True,
        help_text="If true, all users can see and use this section"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    
    # Usage tracking
    usage_count = models.IntegerField(default=0)
    
    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'layout_sections'
        ordering = ['specialty', 'category', 'name']
        indexes = [
            models.Index(fields=['specialty', 'category']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.specialty})"


class FieldType(models.Model):
    """
    Available field types for layout builder.
    """
    
    name = models.CharField(max_length=50, unique=True)
    display_name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)  # Emoji or icon class
    
    # Configuration schema
    config_schema = models.JSONField(
        default=dict,
        help_text="JSON schema for field configuration"
    )
    
    # Validation options
    supports_validation = models.BooleanField(default=True)
    supports_auto_population = models.BooleanField(default=True)
    supports_conditional_display = models.BooleanField(default=True)
    
    # Examples
    example_config = models.JSONField(default=dict)
    
    class Meta:
        db_table = 'field_types'
        ordering = ['display_name']
    
    def __str__(self):
        return self.display_name


class AutoPopulationRule(models.Model):
    """
    Rules for auto-populating fields from previous encounters.
    """
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Rule type
    RULE_TYPE_CHOICES = [
        ('last_value', 'Use last recorded value'),
        ('carry_forward', 'Carry forward if unchanged'),
        ('carry_forward_active', 'Carry forward only active items'),
        ('conditional', 'Conditional based on other fields'),
        ('calculated', 'Calculate from other fields'),
        ('default', 'Use default value'),
    ]
    rule_type = models.CharField(max_length=30, choices=RULE_TYPE_CHOICES)
    
    # Field this rule applies to
    field_name = models.CharField(max_length=100)
    
    # Rule configuration
    config = models.JSONField(
        default=dict,
        help_text="""
        Configuration for the rule:
        {
          "source": "last_encounter.clinical_data.lens_od",
          "condition": "diagnosis != 'cataract'",
          "default": "clear"
        }
        """
    )
    
    # Specialty/context
    specialty = models.CharField(max_length=50, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'auto_population_rules'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class LayoutUsageLog(models.Model):
    """
    Track which layouts are used when and by whom.
    Helps identify which layouts are most effective.
    """
    
    template = models.ForeignKey(
        LayoutTemplate,
        on_delete=models.CASCADE,
        related_name='usage_logs'
    )
    
    encounter = models.ForeignKey(
        'encounters.Encounter',
        on_delete=models.CASCADE,
        related_name='layout_usage'
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    
    # Performance metrics
    time_to_complete_seconds = models.IntegerField(null=True, blank=True)
    
    # Feedback
    user_rating = models.IntegerField(
        null=True,
        blank=True,
        help_text="1-5 stars"
    )
    user_feedback = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'layout_usage_logs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.template} used for {self.encounter}"
