from rest_framework import serializers
from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)

    class Meta:
        model = Document
        fields = [
            'id',
            'patient',
            'appointment',
            'doc_type',
            'title',
            'notes',
            'file',
            'file_url',
            'original_filename',
            'content_type',
            'file_size',
            'uploaded_by',
            'uploaded_by_name',
            'uploaded_at',
        ]
        read_only_fields = [
            'id', 'uploaded_by', 'uploaded_by_name', 'uploaded_at',
            'file_url', 'original_filename', 'content_type', 'file_size'
        ]

    def get_file_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return None
