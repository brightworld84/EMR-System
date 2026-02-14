from rest_framework import serializers
from .models import PacuAdditionalNursingNotes

class PacuAdditionalNursingNotesSerializer(serializers.ModelSerializer):
    class Meta:
        model = PacuAdditionalNursingNotes
        fields = [
            "id",
            "checkin",
            "patient_assessment_rows",
            "wound_extremity_rows",
            "medication_rows",
            "notes",
            "signatures",
            "is_locked",
            "locked_by",
            "locked_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "signatures", "is_locked", "locked_by", "locked_at", "created_at", "updated_at"]
