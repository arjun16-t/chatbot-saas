from rest_framework import serializers
from .models import Document

class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = Document
        fields = [
            'doc_id', 'original_filename', 'file_url', 'file_raw',
            'status', 'created_at', 'file_size', 'project_name',
        ]
        read_only_fields = ['doc_id', 'original_filename', 'status', 'created_at', 'file_size', 'project_name']
        extra_kwargs = {
            'file_raw': {'write_only': True},
        }

    def get_file_url (self, obj):
        file_uri = obj.file_raw
        if file_uri:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(file_uri.url)
            return file_uri.url
        return None