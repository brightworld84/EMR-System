from django.db import models
from django.conf import settings
from core.models import Clinic
from patients.models import Patient
from scheduling.models import Appointment


class Document(models.Model):
    DOC_TYPES = [
        ('consent', 'Consent'),
        ('h_p', 'H&P'),
        ('op_note', 'Operative Note'),
        ('anesthesia', 'Anesthesia Record'),
        ('implant', 'Implant / Sticker'),
        ('referral', 'Referral'),
        ('insurance', 'Insurance Card'),
        ('image', 'Image'),
        ('form', 'Form'),
        ('other', 'Other'),
    ]

    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name='documents')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='documents')

    # Optional: attach to a specific case/appointment
    appointment = models.ForeignKey(
        Appointment, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='documents'
    )

    doc_type = models.CharField(max_length=32, choices=DOC_TYPES, default='other')
    title = models.CharField(max_length=255, blank=True)

    file = models.FileField(upload_to='documents/%Y/%m/%d/')
    original_filename = models.CharField(max_length=255, blank=True)
    content_type = models.CharField(max_length=100, blank=True)
    file_size = models.BigIntegerField(default=0)

    notes = models.TextField(blank=True)

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=['clinic', 'patient', 'uploaded_at']),
            models.Index(fields=['clinic', 'appointment', 'uploaded_at']),
            models.Index(fields=['clinic', 'doc_type', 'uploaded_at']),
        ]
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.title or self.original_filename or f"Document {self.id}"
