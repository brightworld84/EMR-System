from django.contrib import admin
from .models import Patient, Allergy, Medication, Problem, FamilyHistory, SocialHistory

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'medical_record_number', 'date_of_birth', 'age', 'clinic')
    search_fields = ('first_name', 'last_name', 'medical_record_number')
    list_filter = ('clinic', 'gender', 'is_active')

@admin.register(Allergy)
class AllergyAdmin(admin.ModelAdmin):
    list_display = ('patient', 'allergen', 'severity', 'is_active')
    list_filter = ('severity', 'is_active')

@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = ('patient', 'name', 'dosage', 'is_active')
    list_filter = ('is_active',)

@admin.register(Problem)
class ProblemAdmin(admin.ModelAdmin):
    list_display = ('patient', 'description', 'status', 'onset_date')
    list_filter = ('status',)

admin.site.register(FamilyHistory)
admin.site.register(SocialHistory)
