from rest_framework import serializers
from .models import Document

class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = ['file_url', 'file_raw', 'status']
        read_only_fields = ['status']

    def get_file_url (self, obj):
        file_uri = obj.file_raw
        if file_uri:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(file_uri.url)
            return file_uri.url
        return None