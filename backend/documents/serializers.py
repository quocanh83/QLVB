from rest_framework import serializers
from .models import Document, DocumentNode, NodeAssignment, DocumentType

class DocumentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentType
        fields = ['id', 'name', 'description', 'created_at']


class NodeAssignmentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = NodeAssignment
        fields = ['id', 'user', 'username', 'created_at']

class DocumentNodeSerializer(serializers.ModelSerializer):
    is_editable = serializers.BooleanField(read_only=True, default=False)
    children = serializers.SerializerMethodField()
    assignments = NodeAssignmentSerializer(many=True, read_only=True)
    total_feedbacks = serializers.IntegerField(read_only=True, default=0)
    resolved_feedbacks = serializers.IntegerField(read_only=True, default=0)
    
    parent_id = serializers.IntegerField(read_only=True)
    parent_label = serializers.CharField(source='parent.node_label', read_only=True)
    parent_content = serializers.CharField(source='parent.content', read_only=True)
    
    class Meta:
        model = DocumentNode
        fields = ['id', 'parent_id', 'node_type', 'node_label', 'content', 'order_index', 'is_editable', 'children', 'assignments', 'total_feedbacks', 'resolved_feedbacks', 'parent_label', 'parent_content']

    def get_children(self, obj):
        # Lấy từ Ram Memory (tránh N+1)
        if hasattr(obj, 'prefetched_children'):
            return DocumentNodeSerializer(obj.prefetched_children, many=True).data
        return []

class DocumentListSerializer(serializers.ModelSerializer):
    total_nodes = serializers.IntegerField(read_only=True)
    total_dieu = serializers.IntegerField(read_only=True)
    total_khoan = serializers.IntegerField(read_only=True)
    total_diem = serializers.IntegerField(read_only=True)
    total_phu_luc = serializers.IntegerField(read_only=True)
    total_feedbacks = serializers.IntegerField(read_only=True)
    resolved_feedbacks = serializers.IntegerField(read_only=True)
    lead_name = serializers.SerializerMethodField()
    document_type_name = serializers.CharField(source='document_type.name', read_only=True)
    document_type_id = serializers.PrimaryKeyRelatedField(
        source='document_type',
        queryset=DocumentType.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Document
        fields = ['id', 'description', 'project_name', 'drafting_agency', 'agency_location', 'status', 'lead', 'lead_name', 'document_type_id', 'document_type_name', 'created_at', 'total_nodes', 'total_dieu', 'total_khoan', 'total_diem', 'total_phu_luc', 'total_feedbacks', 'resolved_feedbacks', 'total_consulted_doc', 'total_feedbacks_doc']

    def get_lead_name(self, obj):
        if obj.lead:
            return f"{obj.lead.full_name or obj.lead.username}"
        return None

class DocumentUploadSerializer(serializers.ModelSerializer):
    document_type_id = serializers.PrimaryKeyRelatedField(
        source='document_type',
        queryset=DocumentType.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Document
        fields = ['project_name', 'drafting_agency', 'agency_location', 'attached_file_path', 'total_consulted_doc', 'total_feedbacks_doc', 'document_type_id']
