from rest_framework import serializers
from .models import Document, DocumentNode, NodeAssignment, DocumentType, DocumentAppendix

class DocumentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentType
        fields = ['id', 'name', 'description', 'created_at']


class DocumentAppendixSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentAppendix
        fields = ['id', 'document', 'name', 'content', 'file', 'created_at', 'updated_at']


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

    appendices = DocumentAppendixSerializer(many=True, read_only=True)
    consultation_summary = serializers.SerializerMethodField()
    
    def get_consultation_summary(self, obj):
        # 1. Lấy danh sách các đơn vị được mời chính thức
        invited_agencies = {a.id: a for a in obj.consulted_agencies.all()}
        
        # 2. Lấy tất cả phản hồi thực tế liên quan đến dự thảo này
        # Giả định phản hồi mới nhất sẽ ghi đè nếu một cơ quan gửi nhiều lần
        all_responses = obj.responses.all().select_related('agency').order_by('created_at')
        responses_dict = {r.agency_id: r for r in all_responses}
        
        # 3. Thu thập tất cả agency_id xuất hiện (cả mời và tự nguyện góp ý)
        all_agency_ids = set(invited_agencies.keys()) | set(responses_dict.keys())
        
        summary = []
        # Duyệt qua tất cả các đơn vị liên quan
        # Ưu tiên lấy object Agency từ invited_agencies nếu có, không thì lấy từ response
        for aid in all_agency_ids:
            resp = responses_dict.get(aid)
            agency = invited_agencies.get(aid)
            if not agency and resp:
                agency = resp.agency
            
            if not agency: continue

            summary.append({
                "agency_id": aid,
                "agency_name": agency.name,
                "has_response": resp is not None,
                "official_number": resp.official_number if resp else None,
                "official_date": resp.official_date if resp else None,
                "attached_file": resp.attached_file.url if resp and resp.attached_file else None,
                "response_id": resp.id if resp else None
            })
        
        # Sắp xếp theo tên đơn vị cho dễ nhìn
        summary.sort(key=lambda x: x['agency_name'])
        return summary

    class Meta:
        model = Document
        fields = ['id', 'description', 'project_name', 'drafting_agency', 'agency_location', 'status', 'lead', 'lead_name', 'document_type_id', 'document_type_name', 'created_at', 'total_nodes', 'total_dieu', 'total_khoan', 'total_diem', 'total_phu_luc', 'total_feedbacks', 'resolved_feedbacks', 'total_consulted_doc', 'total_feedbacks_doc', 'issuance_number', 'issuance_date', 'issuance_file', 'consulted_agencies', 'consultation_summary', 'appendices', 'google_sheets_url']

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
