from django.contrib import admin
from .models import Encounter, ElectronicSignature, Diagnosis, Procedure, Vital

@admin.register(Encounter)
class EncounterAdmin(admin.ModelAdmin):
    list_display = ('patient', 'provider', 'encounter_date', 'encounter_type', 'status')
    list_filter = ('status', 'encounter_type', 'clinic')
    search_fields = ('patient__first_name', 'patient__last_name')

@admin.register(ElectronicSignature)
class ElectronicSignatureAdmin(admin.ModelAdmin):
    list_display = ('encounter', 'signer_name', 'signed_at', 'meaning')
    readonly_fields = ('signature_hash', 'content_hash', 'signed_at')

admin.site.register(Diagnosis)
admin.site.register(Procedure)
admin.site.register(Vital)
