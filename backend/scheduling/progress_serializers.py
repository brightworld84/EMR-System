from rest_framework import serializers
from .models import PacuProgressNotes, PacuProgressNotesSignature

class PacuProgressNotesSignatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = PacuProgressNotesSignature
        fields = [
            'id', 'role', 'signer_name',
            'is_signed', 'signed_by', 'signed_at',
            'signature_data_url',
            'content_hash', 'signature_hash',
            'created_at',
        ]
        read_only_fields = ['id', 'signed_by', 'signed_at', 'content_hash', 'signature_hash', 'created_at']

    is_signed = serializers.SerializerMethodField()

    def get_is_signed(self, obj):
        return bool(obj.signature_data_url) and obj.signed_at is not None


class PacuProgressNotesSerializer(serializers.ModelSerializer):
    signatures = PacuProgressNotesSignatureSerializer(many=True, read_only=True)

    class Meta:
        model = PacuProgressNotes
        fields = [
            'id', 'checkin',
            'entries',
            'is_signed', 'signed_by', 'signed_at',
            'signature_data_url',
            'content_hash', 'signature_hash',
            'signatures',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'is_signed', 'signed_by', 'signed_at',
            'signature_data_url', 'content_hash', 'signature_hash',
            'signatures', 'created_at', 'updated_at'
        ]

    def validate_entries(self, value):
        # Expect list of {date, time, initials, notes}
        if not isinstance(value, list):
            raise serializers.ValidationError("entries must be a list")
        for row in value[:500]:
            if not isinstance(row, dict):
                raise serializers.ValidationError("each entry must be an object")
        return value
