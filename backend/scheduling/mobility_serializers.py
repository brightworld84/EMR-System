from rest_framework import serializers
from .models import PacuMobilityAssessment

class PacuMobilityAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PacuMobilityAssessment
        fields = [
            "id",
            "checkin",
            "level1_result", "level1_time_initials",
            "level2_result", "level2_time_initials",
            "level3_result", "level3_time_initials",
            "notes",
            "is_signed",
            "signed_by",
            "signed_at",
            "signature_data_url",
            "content_hash",
            "signature_hash",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "is_signed",
            "signed_by",
            "signed_at",
            "content_hash",
            "signature_hash",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        if instance and instance.is_signed:
            raise serializers.ValidationError("This assessment is signed and locked. Create an amendment instead.")
        return attrs
