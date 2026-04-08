from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction
from django.utils import timezone
from django.http import HttpResponse
from .models import ComparisonProject, DraftVersion, ComparisonNode, ComparisonMapping
from .serializers import (
    ComparisonProjectSerializer, DraftVersionSerializer, 
    ComparisonNodeSerializer, ComparisonMappingSerializer
)
from .utils.parser_engine import ComparisonParser
from .utils.legislative_diff import legislative_diff
from .utils.automap_service import automap_nodes
from .utils.export_service import export_comparison_table

class ComparisonProjectViewSet(viewsets.ModelViewSet):
    queryset = ComparisonProject.objects.all().order_by('-created_at')
    serializer_class = ComparisonProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        project = serializer.save(uploaded_by=self.request.user)
        # Tự động bóc tách bản gốc ngay khi tạo
        self._parse_base_document(project)

    def _parse_base_document(self, project):
        parser = ComparisonParser(project.base_file.path)
        structure = parser.parse()
        
        def save_nodes_recursive(node_list, parent=None):
            for node_data in node_list:
                children = node_data.pop('children', [])
                node = ComparisonNode.objects.create(
                    project=project,
                    parent=parent,
                    **node_data
                )
                if children:
                    save_nodes_recursive(children, parent=node)
        
        save_nodes_recursive(structure)
        
    @action(detail=True, methods=['post'])
    def replace_base_file(self, request, pk=None):
        """Thay thế văn bản gốc và bóc tách lại"""
        project = self.get_object()
        file_obj = request.FILES.get('base_file')
        if not file_obj:
            return Response({"error": "Vui lòng chọn file .docx mới."}, status=400)
            
        with transaction.atomic():
            # Xóa các node gốc cũ
            ComparisonNode.objects.filter(project=project, version__isnull=True).delete()
            # Cập nhật file
            project.base_file = file_obj
            project.save()
            # Bóc tách lại (Bản gốc không cần đánh số lại)
            self._parse_base_document(project)
            
        return Response(ComparisonProjectSerializer(project).data)

    @action(detail=True, methods=['get'])
    def base_nodes(self, request, pk=None):
        """Lấy tất cả node gốc của dự án này"""
        project = self.get_object()
        nodes = ComparisonNode.objects.filter(project=project).order_by('order_index')
        serializer = ComparisonNodeSerializer(nodes, many=True)
        return Response(serializer.data)

class DraftVersionViewSet(viewsets.ModelViewSet):
    queryset = DraftVersion.objects.all().order_by('-created_at')
    serializer_class = DraftVersionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        if self.action == 'export_word':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        project_id = request.data.get('project')
        user_note = request.data.get('user_note', '')
        file_obj = request.FILES.get('file_path')

        if not project_id or not file_obj:
            return Response({"error": "Thiếu project_id hoặc file dự thảo."}, status=400)

        # Tạo nhãn phiên bản: [Ngày giờ] - {user_note}
        now = timezone.now().strftime('%Y-%m-%d %H:%M')
        version_label = f"[{now}] {user_note}".strip()

        with transaction.atomic():
            version = DraftVersion.objects.create(
                project_id=project_id,
                file_path=file_obj,
                user_note=user_note,
                version_label=version_label
            )
            # Bóc tách cấu trúc cho phiên bản này (Bật renumber_articles theo yêu cầu của user)
            self._parse_draft_document(version)
            
            # Tự động ánh xạ từ phiên bản trước (nếu có) hoặc từ bản gốc
            self._initial_automap(version)

        # Trả về data sau khi tạo (Đảm bảo có get_auth_header nếu cần, nhưng thường data là đủ)
        return Response(DraftVersionSerializer(version).data, status=201)

    def _parse_draft_document(self, version):
        parser = ComparisonParser(version.file_path.path)
        # Bóc tách cấu trúc chuẩn cho bản dự thảo
        structure = parser.parse()
        
        def save_nodes_recursive(node_list, parent=None):
            for node_data in node_list:
                children = node_data.pop('children', [])
                node = ComparisonNode.objects.create(
                    version=version,
                    parent=parent,
                    **node_data
                )
                if children:
                    save_nodes_recursive(children, parent=node)
        
        save_nodes_recursive(structure)

    def _initial_automap(self, version):
        base_nodes = ComparisonNode.objects.filter(project=version.project, node_type__in=['Điều', 'Phụ lục'])
        draft_nodes = ComparisonNode.objects.filter(version=version, node_type__in=['Điều', 'Phụ lục'])
        
        mapping_dict = automap_nodes(base_nodes, draft_nodes)
        
        for b_id, d_id in mapping_dict.items():
            ComparisonMapping.objects.create(
                project=version.project,
                version=version,
                base_node_id=b_id,
                draft_node_id=d_id
            )

    def _get_full_content(self, node):
        """Gộp nội dung tiêu đề và tất cả các con (Khoản, Điểm) của một node"""
        full_text = node.content if node.content else ""
        
        # Nếu là Chương, không gộp các Điều con vào (Để tách Điều thành hàng riêng)
        if node.node_type == 'Chương':
            return full_text.strip()
            
        children = ComparisonNode.objects.filter(parent=node).order_by('order_index')
        for child in children:
            child_text = self._get_full_content(child)
            if child_text:
                full_text += f"\n{child.node_label}: {child_text}"
        return full_text.strip()

    def _get_interleaved_rows(self, version):
        """Logic trộn hàng (Gốc làm chuẩn): Hiển thị đúng thứ tự gốc, không lặp lại"""
        project = version.project
        # Lấy danh sách node gốc (trục chính)
        base_nodes = ComparisonNode.objects.filter(
            project=project, version__isnull=True,
            node_type__in=['Chương', 'Điều', 'Phụ lục', 'Vấn đề khác']
        ).order_by('order_index')
        
        # Lấy danh sách node dự thảo
        draft_nodes = ComparisonNode.objects.filter(
            version=version,
            node_type__in=['Chương', 'Điều', 'Phụ lục', 'Vấn đề khác']
        ).order_by('order_index')
        
        mappings = ComparisonMapping.objects.filter(version=version)
        b_to_d = {m.base_node_id: m.draft_node for m in mappings}
        d_to_b = {m.draft_node_id: m.base_node for m in mappings}
        
        rows = []
        consumed_draft_ids = set()
        
        # Duyệt theo danh sách Gốc để giữ đúng thứ tự 1, 2, 3...
        for b_node in base_nodes:
            d_node = b_to_d.get(b_node.id)
            
            if d_node:
                # Chỉ chèn các Điều dự thảo CHƯA ĐƯỢC ÁNH XẠ (nghĩa là Điều mới hoàn toàn) 
                # mà có thứ tự nằm trước d_node hiện tại
                for skip_d in draft_nodes:
                    if skip_d.order_index < d_node.order_index and skip_d.id not in consumed_draft_ids:
                        # Kiểm tra xem skip_d này có mapping tới bất kỳ node gốc nào không
                        if skip_d.id not in d_to_b:
                            rows.append(self._build_row(None, skip_d))
                            consumed_draft_ids.add(skip_d.id)
                
                rows.append(self._build_row(b_node, d_node))
                consumed_draft_ids.add(d_node.id)
            else:
                # Điều gốc bị bãi bỏ
                rows.append(self._build_row(b_node, None))
                
        # Thêm nốt các Điều dự thảo mới ở cuối bảng (nếu có)
        for last_d in draft_nodes:
            if last_d.id not in consumed_draft_ids:
                rows.append(self._build_row(None, last_d))
                
        return rows

    def _build_row(self, b_node, d_node):
        b_full = self._get_full_content(b_node) if b_node else ""
        d_full = self._get_full_content(d_node) if d_node else ""
        return {
            "base_node": {
                "id": b_node.id, "node_label": b_node.node_label, "content": b_full, "node_type": b_node.node_type
            } if b_node else None,
            "draft_node": {
                "id": d_node.id, "node_label": d_node.node_label, "content": d_full, "node_type": d_node.node_type
            } if d_node else None,
            "diff_content": legislative_diff(b_full, d_full) if d_node and b_node else (d_full if d_node else "")
        }

    @action(detail=True, methods=['get'])
    def workspace_data(self, request, pk=None):
        """Lấy dữ liệu so sánh căn hàng ngang - Logic Interleaving (Base-centric)"""
        version = self.get_object()
        rows = self._get_interleaved_rows(version)
        return Response({
            "project_name": version.project.name,
            "version_label": version.version_label,
            "rows": rows
        })

    @action(detail=True, methods=['post'])
    def add_manual_row(self, request, pk=None):
        """Thêm một hàng trống vào bản gốc để người dùng tự ghép nối"""
        version = self.get_object()
        project = version.project
        from django.db.models import Max
        max_idx = ComparisonNode.objects.filter(project=project, version__isnull=True).aggregate(Max('order_index'))['order_index__max'] or 0
        
        node = ComparisonNode.objects.create(
            project=project,
            node_type='Vấn đề khác',
            node_label='Hàng thủ công',
            content='',
            order_index=max_idx + 1
        )
        return Response(ComparisonNodeSerializer(node).data)

    @action(detail=True, methods=['get'])
    def export_word(self, request, pk=None):
        """Xuất file Word bảng đối chiếu - Logic Interleaving (Base-centric)"""
        user = request.user
        if not user.is_authenticated:
            token = request.query_params.get('token')
            if not token: return Response({"error": "Vui lòng cung cấp token"}, status=401)
            from rest_framework_simplejwt.tokens import AccessToken
            from django.contrib.auth import get_user_model
            try:
                access_token = AccessToken(token)
                user = get_user_model().objects.get(id=access_token['user_id'])
                request.user = user
            except Exception: return Response({"error": "Token không hợp lệ"}, status=401)
        
        version = self.get_object()
        project = version.project
        rows = self._get_interleaved_rows(version)
        word_rows = []
        for r in rows:
            word_rows.append({
                "base_node": {"node_label": r["base_node"]["node_label"], "content": r["base_node"]["content"]} if r["base_node"] else None,
                "draft_node": {"node_label": r["draft_node"]["node_label"], "content": r["draft_node"]["content"]} if r["draft_node"] else None,
                "diff_content": r["diff_content"]
            })
        
        stream = export_comparison_table(
            project.name, 
            version.version_label, 
            word_rows,
            base_name=project.base_document_name,
            draft_name=project.draft_document_name
        )
        
        response = HttpResponse(
            stream.read(),
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        safe_name = f"Bang_doi_chieu_V{version.id}.docx"
        response['Content-Disposition'] = f'attachment; filename="{safe_name}"'
        return response

    @action(detail=True, methods=['post'])
    def update_mapping(self, request, pk=None):
        """Cập nhật ánh xạ thủ công"""
        version = self.get_object()
        base_node_id = request.data.get('base_node_id')
        draft_node_id = request.data.get('draft_node_id') # Có thể null nếu muốn hủy map
        
        if not base_node_id:
            return Response({"error": "Thiếu base_node_id"}, status=400)
            
        with transaction.atomic():
            # 1. Xóa map cũ của base_node này
            ComparisonMapping.objects.filter(version=version, base_node_id=base_node_id).delete()
            
            if draft_node_id:
                # 2. Đảm bảo ánh xạ 1:1: Một node dự thảo chỉ được map vào DUY NHẤT một node gốc
                # Xóa các ánh xạ khác đang trỏ tới draft_node_id này (nếu có)
                ComparisonMapping.objects.filter(version=version, draft_node_id=draft_node_id).delete()
                
                ComparisonMapping.objects.create(
                    project=version.project,
                    version=version,
                    base_node_id=base_node_id,
                    draft_node_id=draft_node_id
                )
        
        return Response({"message": "Cập nhật ánh xạ thành công!"})

    @action(detail=True, methods=['get'])
    def nodes(self, request, pk=None):
        """Lấy tất cả node của phiên bản dự thảo này"""
        version = self.get_object()
        nodes = ComparisonNode.objects.filter(version=version).order_by('order_index')
        serializer = ComparisonNodeSerializer(nodes, many=True)
        return Response(serializer.data)

class ComparisonNodeViewSet(viewsets.ModelViewSet):
    queryset = ComparisonNode.objects.all().order_by('order_index')
    serializer_class = ComparisonNodeSerializer
    permission_classes = [permissions.IsAuthenticated]
