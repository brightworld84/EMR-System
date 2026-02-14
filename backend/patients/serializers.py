from rest_framework import serializers
from .models import Patient

class PatientSerializer(serializers.ModelSerializer):
    age = serializers.ReadOnlyField()
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = Patient
        fields = [
            'id',
            'medical_record_number',
            'first_name',
            'last_name',
            'full_name',
            'date_of_birth',
            'age',
            'gender',
            'race',
            'ethnicity',
            'preferred_language',
            'sexual_orientation',
            'gender_identity',
            'phone_primary',
            'phone_secondary',
            'email',
            'address_line1',
            'address_line2',
            'city',
            'state',
            'zip_code',
            'emergency_contact_name',
            'emergency_contact_relationship',
            'emergency_contact_phone',
            'insurance_primary_company',
            'insurance_primary_policy_number',
            'insurance_primary_group_number',
            'insurance_primary_subscriber_name',
            'insurance_primary_subscriber_dob',
            'insurance_secondary_company',
            'insurance_secondary_policy_number',
            'insurance_secondary_group_number', 
            'is_active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'age', 'full_name', 'created_at', 'updated_at']

    def validate_medical_record_number(self, value):
        value = (value or "").strip()
        clinic = self.context['request'].user.clinic
        qs = Patient.objects.filter(clinic=clinic, medical_record_number=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("MRN already exists for this clinic.")
        return value


