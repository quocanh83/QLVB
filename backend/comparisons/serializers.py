from rest_framework import serializers
from .models import ComparisonProject, DraftVersion, ComparisonNode, ComparisonMapping

class ComparisonNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComparisonNode
        fields = '__all__'

class DraftVersionSerializer(serializers.ModelSerializer):
    node_count = serializers.IntegerField(source='nodes.count', read_only=True)
    
    class Meta:
        model = DraftVersion
        fields = '__all__'

class ComparisonProjectSerializer(serializers.ModelSerializer):
    versions = DraftVersionSerializer(many=True, read_only=True)
    base_node_count = serializers.IntegerField(source='base_nodes.count', read_only=True)
    
    class Meta:
        model = ComparisonProject
        fields = [
            'id', 'name', 'description', 'base_file', 'uploaded_by', 
            'created_at', 'updated_at', 'versions', 'base_node_count',
            'base_document_name', 'draft_document_name'
        ]

class ComparisonMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComparisonMapping
        fields = '__all__'
