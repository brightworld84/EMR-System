"""
Clinical image models for EMR system.
Supports DICOM, regular images, and documents.
"""

from django.db import models
from django.conf import settings
from django.core.files.storage import default_storage
import uuid


class ClinicalImage(models.Model):
    """
    Clinical images and documents.
    Supports DICOM (OCT, X-rays) and regular images (photos).
    """
    
    # Unique ID
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Associations
    encounter = models.ForeignKey(
        'encounters.Encounter',
        on_delete=models.CASCADE,
        related_name='images'
    )
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='images'
    )
    clinic = models.ForeignKey(
        'core.Clinic',
        on_delete=models.CASCADE,
        related_name='images'
    )
    
    # Image metadata
    IMAGE_TYPE_CHOICES = [
        ('oct', 'OCT Scan'),
        ('fundus_photo', 'Fundus Photography'),
        ('visual_field', 'Visual Field'),
        ('xray', 'X-ray'),
        ('mri', 'MRI'),
        ('ct', 'CT Scan'),
        ('ultrasound', 'Ultrasound'),
        ('photo_preop', 'Pre-operative Photo'),
        ('photo_postop', 'Post-operative Photo'),
        ('photo_cosmetic', 'Cosmetic Photo'),
        ('document', 'Scanned Document'),
        ('other', 'Other'),
    ]
    image_type = models.CharField(max_length=30, choices=IMAGE_TYPE_CHOICES)
    
    # Specialty
    specialty = models.CharField(
        max_length=50,
        choices=[
            ('ophthalmology', 'Ophthalmology'),
            ('orthopedics', 'Orthopedics'),
            ('cosmetic', 'Cosmetic Surgery'),
            ('general', 'General'),
        ]
    )
    
    # Laterality (for body parts)
    LATERALITY_CHOICES = [
        ('OD', 'Right Eye (OD)'),
        ('OS', 'Left Eye (OS)'),
        ('OU', 'Both Eyes (OU)'),
        ('right', 'Right'),
        ('left', 'Left'),
        ('bilateral', 'Bilateral'),
        ('n/a', 'Not Applicable'),
    ]
    laterality = models.CharField(
        max_length=10,
        choices=LATERALITY_CHOICES,
        blank=True,
        null=True
    )
    
    # Body location (for orthopedics/cosmetic)
    body_location = models.CharField(
        max_length=100,
        blank=True,
        help_text="e.g., 'Face', 'Right Knee', 'Abdomen'"
    )
    
    # File storage
    image_file = models.FileField(upload_to='clinical-images/%Y/%m/%d/')
    thumbnail = models.FileField(
        upload_to='thumbnails/%Y/%m/%d/',
        blank=True,
        null=True
    )
    
    # File info
    file_size = models.BigIntegerField(help_text="Size in bytes")
    mime_type = models.CharField(max_length=100)
    original_filename = models.CharField(max_length=255)
    
    # DICOM support
    is_dicom = models.BooleanField(default=False)
    dicom_metadata = models.JSONField(
        null=True,
        blank=True,
        help_text="""
        DICOM tags:
        {
          "StudyDate": "20250107",
          "Modality": "OCT",
          "Laterality": "R",
          "Manufacturer": "Zeiss",
          "SeriesDescription": "Macular Cube"
        }
        """
    )
    
    # Viewable version (for DICOM, we generate PNG)
    viewable_image = models.FileField(
        upload_to='viewable-images/%Y/%m/%d/',
        blank=True,
        null=True
    )
    
    # Photo series (for before/after, progress photos)
    series_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="Groups related photos together"
    )
    
    PHOTO_TYPE_CHOICES = [
        ('before', 'Before'),
        ('during', 'During'),
        ('after', 'After'),
        ('baseline', 'Baseline'),
        ('follow_up', 'Follow-up'),
    ]
    photo_type = models.CharField(
        max_length=20,
        choices=PHOTO_TYPE_CHOICES,
        blank=True,
        null=True
    )
    
    time_point = models.CharField(
        max_length=100,
        blank=True,
        help_text="e.g., 'Pre-op', '1 week', '1 month', '3 months'"
    )
    
    # Annotations/markup
    annotations = models.JSONField(
        null=True,
        blank=True,
        help_text="Drawing data for image markup (arrows, circles, measurements)"
    )
    
    # Organization
    notes = models.TextField(blank=True)
    tags = models.JSONField(
        default=list,
        help_text="Tags for organization and search"
    )
    
    # OCR for scanned documents
    ocr_text = models.TextField(
        blank=True,
        help_text="Extracted text from document (searchable)"
    )
    
    # Access control
    is_sensitive = models.BooleanField(
        default=False,
        help_text="Requires additional permissions to view"
    )
    shared_with_patient = models.BooleanField(
        default=False,
        help_text="Visible in patient portal"
    )
    
    # Upload info
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_images'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    # Processing status
    PROCESSING_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    processing_status = models.CharField(
        max_length=20,
        choices=PROCESSING_STATUS_CHOICES,
        default='pending'
    )
    processing_error = models.TextField(blank=True)
    
    class Meta:
        db_table = 'clinical_images'
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['patient', '-uploaded_at']),
            models.Index(fields=['encounter']),
            models.Index(fields=['series_id']),
            models.Index(fields=['image_type', 'specialty']),
        ]
    
    def __str__(self):
        return f"{self.image_type} for {self.patient} ({self.uploaded_at.date()})"
    
    def get_thumbnail_url(self):
        """Get URL for thumbnail"""
        if self.thumbnail:
            return self.thumbnail.url
        return self.image_file.url
    
    def get_display_url(self):
        """Get URL for display (viewable version for DICOM, original for others)"""
        if self.is_dicom and self.viewable_image:
            return self.viewable_image.url
        return self.image_file.url


class ImageSeries(models.Model):
    """
    Groups related images together (e.g., before/after series).
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Associations
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='image_series'
    )
    
    # Series type
    SERIES_TYPE_CHOICES = [
        ('before_after', 'Before/After'),
        ('progress', 'Progress Photos'),
        ('multi_view', 'Multi-view'),
        ('comparison', 'Comparison'),
    ]
    series_type = models.CharField(max_length=30, choices=SERIES_TYPE_CHOICES)
    
    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'image_series'
        verbose_name_plural = 'Image series'
    
    def __str__(self):
        return self.name
    
    def get_images(self):
        """Get all images in this series"""
        return ClinicalImage.objects.filter(series_id=self.id).order_by('uploaded_at')


class ImageAnnotation(models.Model):
    """
    Annotations on images (measurements, markings, notes).
    """
    
    image = models.ForeignKey(
        ClinicalImage,
        on_delete=models.CASCADE,
        related_name='detailed_annotations'
    )
    
    # Annotation type
    ANNOTATION_TYPE_CHOICES = [
        ('measurement', 'Measurement'),
        ('arrow', 'Arrow'),
        ('circle', 'Circle'),
        ('text', 'Text Label'),
        ('highlight', 'Highlight'),
    ]
    annotation_type = models.CharField(max_length=20, choices=ANNOTATION_TYPE_CHOICES)
    
    # Annotation data (coordinates, etc.)
    data = models.JSONField(
        help_text="""
        {
          "type": "measurement",
          "coordinates": [[x1, y1], [x2, y2]],
          "value": "12.3mm",
          "color": "#FF0000"
        }
        """
    )
    
    # Text content
    text = models.TextField(blank=True)
    
    # Creator
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'image_annotations'
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.annotation_type} on {self.image}"
