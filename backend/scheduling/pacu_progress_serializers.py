from rest_framework import serializers
from scheduling.models import PacuProgressNotes

class PacuProgressNotesSerializer(serializers.ModelSerializer):
    class Meta:
        model = PacuProgressNotes
        fields = [
            'id',
            'checkin',
            'entries',
            'is_signed',
            'signed_by',
            'signed_at',
            'signature_data_url',
            'content_hash',
            'signature_hash',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'is_signed', 'signed_by', 'signed_at', 'content_hash', 'signature_hash', 'created_at', 'updated_at']
