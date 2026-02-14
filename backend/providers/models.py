from django.db import models
from django.conf import settings
from core.models import Clinic

class Provider(models.Model):
    """
    Provider/clinician within a clinic (multi-tenant).
    Keep this separate from auth User so you can later map:
    - real users (login accounts)
    - external providers (referring surgeons, locums)
    - MagdaRecords-linked identities
    """
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name='providers')

    # Optional link to a login user (not required)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='provider_profile'
    )

    display_name = models.CharField(max_length=200)
    npi = models.CharField(max_length=10, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_name']
        indexes = [
            models.Index(fields=['clinic', 'display_name']),
            models.Index(fields=['clinic', 'is_active']),
        ]

    def __str__(self):
        return f"{self.display_name} ({self.clinic.name})"
