import re
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction
from django.utils import timezone
from django.http import HttpResponse
from .models import ComparisonProject, DraftVersion, ComparisonNode, ComparisonMapping, ComparisonAIResult, StandaloneReview
from .serializers import (
    ComparisonProjectSerializer, DraftVersionSerializer, 
    ComparisonNodeSerializer, ComparisonMappingSerializer,
    ComparisonAIResultSerializer, StandaloneReviewSerializer
)
from .utils.parser_engine import ComparisonParser
from .utils.legislative_diff import legislative_diff
from .utils.automap_service import automap_nodes
from .utils.export_service import export_comparison_table
from .utils.ai_service import UnifiedAIService
from .utils.reference_export import export_reference_excel, export_reference_word

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
        project = version.project
        # 1. Tìm phiên bản trước đó gần nhất (không phải phiên bản hiện tại)
        prev_version = DraftVersion.objects.filter(project=project).exclude(id=version.id).order_by('-created_at').first()
        
        inherited_mapping = {}
        if prev_version:
            # Lấy ánh xạ của phiên bản trước
            prev_mappings = ComparisonMapping.objects.filter(version=prev_version).select_related('draft_node')
            # Tạo bản đồ: {id_node_gốc: nhãn_node_dự_thảo_cũ}
            # Chúng ta dùng nhãn (node_label) để làm "cầu nối" giữa 2 phiên bản dự thảo (V1 -> V2)
            prev_map_by_label = {m.base_node_id: m.draft_node.node_label for m in prev_mappings}
            
            # Lấy danh sách node của phiên bản hiện tại, đánh chỉ mục theo nhãn
            current_draft_nodes_by_label = {
                n.node_label: n.id 
                for n in ComparisonNode.objects.filter(version=version)
            }
            
            # Xây dựng ánh xạ kế thừa: Nếu Điều 1 gốc v1 khớp nhãn "Điều 5" dự thảo v1, 
            # thì ở v2 ta vẫn cố gắng khớp Điều 1 gốc với cái gì có nhãn "Điều 5" ở dự thảo v2.
            for b_id, label in prev_map_by_label.items():
                if label in current_draft_nodes_by_label:
                    inherited_mapping[b_id] = current_draft_nodes_by_label[label]

        # 2. Thực hiện automap tiêu chuẩn (cho các node chưa có trong ánh xạ kế thừa)
        base_nodes = ComparisonNode.objects.filter(project=project, node_type__in=['Điều', 'Phụ lục'], version__isnull=True)
        draft_nodes = ComparisonNode.objects.filter(version=version, node_type__in=['Điều', 'Phụ lục'])
        
        standard_mapping = automap_nodes(base_nodes, draft_nodes)
        
        # 3. Gộp kết quả: Ánh xạ kế thừa (Inherited) được ưu tiên vì nó chứa các tùy chỉnh thủ công của người dùng
        # Dictionary merge in Python 3.9+: final_mapping = standard_mapping | inherited_mapping
        final_mapping = {**standard_mapping, **inherited_mapping}
        
        # 4. Lưu vào DB
        new_mappings = [
            ComparisonMapping(
                project=project,
                version=version,
                base_node_id=b_id,
                draft_node_id=d_id
            ) for b_id, d_id in final_mapping.items()
        ]
        
        if new_mappings:
            ComparisonMapping.objects.bulk_create(new_mappings)

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
                # Thay dấu ":" bằng dấu cách để tránh bị lặp "1.:" hoặc "a):"
                full_text += f"\n{child.node_label} {child_text}"
        return full_text.strip()

    def _get_full_explanation(self, node):
        """Gộp thuyết minh của node và tất cả các mục con"""
        full_exp = node.explanation if node.explanation else ""
        
        # Nếu là Chương, không gộp Điều con
        if node.node_type == 'Chương':
            return full_exp.strip()
            
        children = ComparisonNode.objects.filter(parent=node).order_by('order_index')
        for child in children:
            child_exp = self._get_full_explanation(child)
            if child_exp:
                full_exp += f"\n{child.node_label} {child_exp}"
        return full_exp.strip()

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
        d_exp = self._get_full_explanation(d_node) if d_node else ""
        
        return {
            "base_node": {
                "id": b_node.id, "node_label": b_node.node_label, "content": b_full, "node_type": b_node.node_type
            } if b_node else None,
            "draft_node": {
                "id": d_node.id, "node_label": d_node.node_label, "content": d_full, "node_type": d_node.node_type,
                "explanation": d_exp
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

    @action(detail=True, methods=['post'])
    def ai_check_references(self, request, pk=None):
        """Action: Rà soát dẫn chiếu chéo sử dụng AI"""
        version = self.get_object()
        # Lấy toàn bộ text dự thảo
        nodes = ComparisonNode.objects.filter(version=version).order_by('order_index')
        text_parts = []
        for n in nodes:
            text_parts.append(f"{n.node_label}: {n.content}")
        full_text = "\n".join(text_parts)

        ai_service = UnifiedAIService()
        result_json = ai_service.check_internal_references(full_text)
        
        if "error" in result_json:
            return Response(result_json, status=500)

        # Lưu kết quả
        ai_res = ComparisonAIResult.objects.create(
            version=version,
            result_type='reference_check',
            content=json.dumps(result_json, ensure_ascii=False),
            agent_info=f"{ai_service.provider} ({ai_service.model_name or 'default'})"
        )
        return Response(ComparisonAIResultSerializer(ai_res).data)

    @action(detail=True, methods=['post'])
    def ai_generate_report(self, request, pk=None):
        """Action: Đối chiếu & Tạo báo cáo tự động sử dụng AI"""
        version = self.get_object()
        summary_text = request.data.get('summary_text', '')
        custom_request = request.data.get('custom_request', 'Tạo báo cáo tóm tắt nội dung mới')

        # Lấy toàn bộ text dự thảo
        nodes = ComparisonNode.objects.filter(version=version).order_by('order_index')
        full_text = "\n".join([f"{n.node_label}: {n.content}" for n in nodes])

        ai_service = UnifiedAIService()
        report_md = ai_service.generate_automated_report(summary_text, full_text, custom_request)

        if report_md.startswith("Lỗi"):
            return Response({"error": report_md}, status=500)

        # Lưu kết quả
        ai_res = ComparisonAIResult.objects.create(
            version=version,
            result_type='automated_report',
            content=report_md,
            agent_info=f"{ai_service.provider} ({ai_service.model_name or 'default'})"
        )
        return Response(ComparisonAIResultSerializer(ai_res).data)

    @action(detail=True, methods=['post'])
    def upload_explanation(self, request, pk=None):
        """Action: Nạp thuyết minh từ file Word (.docx)"""
        version = self.get_object()
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "Vui lòng tải lên tệp thuyết minh (.docx)."}, status=400)
            
        from .utils.parser_engine import ExplanationParser
        try:
            parser = ExplanationParser(file_obj)
            exp_dict = parser.parse_to_dict()
            
            # Cập nhật thuyết minh cho các Điều tương ứng
            count = 0
            # Chỉ khớp với type='Điều' như yêu cầu
            nodes = ComparisonNode.objects.filter(version=version, node_type='Điều')
            for node in nodes:
                # Trích xuất số điều từ nhãn (Ví dụ: "Điều 1" -> "1")
                m = re.search(r'\d+', node.node_label)
                if m:
                    num = m.group()
                    if num in exp_dict:
                        node.explanation = exp_dict[num]
                        node.save()
                        count += 1
            
            return Response({"message": f"Đã cập nhật thuyết minh cho {count} Điều từ file Word."})
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=['post'])
    def save_gsheet_url(self, request, pk=None):
        """Action: Chỉ lưu link Google Sheet không đồng bộ"""
        version = self.get_object()
        sheet_url = request.data.get('sheet_url')
        if not sheet_url:
            return Response({"error": "Vui lòng nhập đường dẫn Google Sheet."}, status=400)
        
        version.explanation_sheet_url = sheet_url
        version.save()
        return Response({"message": "Đã lưu đường dẫn Google Sheet thành công.", "sheet_url": sheet_url})

    @action(detail=True, methods=['post'])
    def sync_gsheet_explanation(self, request, pk=None):
        """Action: Đồng bộ thuyết minh từ Google Sheets"""
        version = self.get_object()
        sheet_url = request.data.get('sheet_url')
        if not sheet_url:
            return Response({"error": "Vui lòng nhập đường dẫn Google Sheet."}, status=400)
            
        from .utils.gsheet_sync import sync_explanation_from_gsheet
        try:
            exp_dict = sync_explanation_from_gsheet(sheet_url)
            
            # Lưu lại link GSheet
            version.explanation_sheet_url = sheet_url
            version.save()
            
            # Cập nhật thuyết minh
            count = 0
            nodes = ComparisonNode.objects.filter(version=version, node_type__in=['Điều', 'Phụ lục'])
            for node in nodes:
                # Trích xuất số điều để khớp (Điều 1 -> 1)
                m = re.search(r'[\u0110\u0111]i\u1ec1u\s+(\d+)', node.node_label, re.IGNORECASE)
                article_num = m.group(1) if m else node.node_label
                
                # Khớp theo nhãn đầy đủ hoặc số điều
                gsheet_val = exp_dict.get(node.node_label)
                if gsheet_val is None:
                    gsheet_val = exp_dict.get(article_num)
                
                if gsheet_val:
                    node.explanation = gsheet_val
                    node.save()
                    count += 1
                        
            return Response({"message": f"Đã đồng bộ thuyết minh cho {count} mục từ Google Sheet."})
        except Exception as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=True, methods=['get'])
    def gsheet_compare_explanation(self, request, pk=None):
        """So sánh thuyết minh giữa Hệ thống và Google Sheet"""
        version = self.get_object()
        if not version.explanation_sheet_url:
            return Response({"error": "Chưa cài đặt URL Google Sheet Thuyết minh."}, status=400)
            
        from .utils.gsheet_sync import sync_explanation_from_gsheet, normalize_label
        try:
            # Lấy dữ liệu từ gsheet (Đã được chuẩn hoá key trong util)
            gsheet_data = sync_explanation_from_gsheet(version.explanation_sheet_url)
            
            # Lấy các node của phiên bản hiện tại
            nodes = ComparisonNode.objects.filter(version=version, node_type__in=['Điều', 'Phụ lục']).order_by('order_index')
            
            comparison = []
            for node in nodes:
                # Chuẩn hoá nhãn của node hiện tại để khớp với key trong gsheet_data
                norm_label = normalize_label(node.node_label)
                gsheet_content = gsheet_data.get(norm_label, "")
                
                db_content = node.explanation or ""
                
                status_val = "match"
                if not db_content and gsheet_content: status_val = "missing_db"
                elif db_content and not gsheet_content: status_val = "missing_gsheet"
                elif db_content.strip() != gsheet_content.strip(): status_val = "mismatch"
                
                comparison.append({
                    "id": node.id,
                    "label": node.node_label,
                    "db_content": db_content,
                    "gsheet_content": gsheet_content,
                    "status": status_val
                })
            
            return Response(comparison)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=True, methods=['post'])
    def gsheet_sync_selected_explanation(self, request, pk=None):
        """Kéo dữ liệu từ GSheet về những node được chọn"""
        version = self.get_object()
        items = request.data.get('items', []) # [{id, content}]
        
        with transaction.atomic():
            for item in items:
                ComparisonNode.objects.filter(id=item['id'], version=version).update(explanation=item['content'])
                
        return Response({"message": f"Đã cập nhật {len(items)} mục từ Google Sheet."})

    @action(detail=True, methods=['post'])
    def gsheet_push_selected_explanation(self, request, pk=None):
        """Đẩy dữ liệu từ hệ thống lên GSheet cho những node được chọn"""
        version = self.get_object()
        if not version.explanation_sheet_url:
             return Response({"error": "Chưa cài đặt URL Google Sheet Thuyết minh."}, status=400)
             
        node_ids = request.data.get('node_ids', [])
        nodes = ComparisonNode.objects.filter(id__in=node_ids, version=version)
        
        from .utils.gsheet_sync import push_explanations_to_gsheet
        items_to_push = [
            {'label': n.node_label, 'content': n.explanation or ""}
            for n in nodes
        ]
        
        try:
            push_explanations_to_gsheet(version.explanation_sheet_url, items_to_push)
            return Response({"message": f"Đã đẩy {len(items_to_push)} mục lên Google Sheet thành công."})
        except Exception as e:
            return Response({"error": str(e)}, status=400)


    @action(detail=True, methods=['get'])
    def export_mappings(self, request, pk=None):
        """Xuất bộ nhớ ánh xạ (Mapping Memory) ra file Excel"""
        import pandas as pd
        import io
        from django.http import HttpResponse
        from rest_framework_simplejwt.authentication import JWTAuthentication

        # Hỗ trợ xác thực qua query param để window.open hoạt động
        if not request.user.is_authenticated:
            query_token = request.query_params.get('token')
            if query_token:
                try:
                    auth = JWTAuthentication()
                    validated_token = auth.get_validated_token(query_token)
                    user = auth.get_user(validated_token)
                    request.user = user
                except Exception as e:
                    print(f"Query token auth error: {e}")

        if not request.user.is_authenticated:
               return Response({"detail": "Authentication credentials were not provided."}, status=401)

        version = self.get_object()
        mappings = ComparisonMapping.objects.filter(version=version).select_related('base_node', 'draft_node')
        
        data = []
        for m in mappings:
            data.append({
                'Loại mục': m.base_node.node_type,
                'Nhãn Gốc': m.base_node.node_label,
                'Nội dung Gốc': m.base_node.content[:200] + '...' if len(m.base_node.content) > 200 else m.base_node.content,
                'Nhãn Dự thảo': m.draft_node.node_label,
                'Nội dung Dự thảo': m.draft_node.content[:200] + '...' if len(m.draft_node.content) > 200 else m.draft_node.content,
            })
            
        if not data:
            return Response({"error": "Chưa có dữ liệu ánh xạ để xuất."}, status=400)

        df = pd.DataFrame(data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Mapping Memory')
        
        output.seek(0)
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="Mapping_Memory_{version.id}.xlsx"'
        return response

    @action(detail=False, methods=['get'], url_path='export_ai_report/(?P<result_id>[^/.]+)')
    def export_ai_report(self, request, result_id=None):
        """Xuất báo cáo AI sang file Word (.docx)"""
        import io
        from docx import Document
        from docx.shared import Pt
        from docx.enum.text import WD_ALIGN_PARAGRAPH

        ai_res = ComparisonAIResult.objects.get(id=result_id)
        if ai_res.result_type != 'automated_report':
            return Response({"error": "Chỉ hỗ trợ xuất báo cáo tự động."}, status=400)

        doc = Document()
        # Chuyển đổi Markdown đơn giản sang docx
        lines = ai_res.content.split('\n')
        for line in lines:
            if line.startswith('###'):
                p = doc.add_heading(line.replace('###', '').strip(), level=3)
            elif line.startswith('##'):
                p = doc.add_heading(line.replace('##', '').strip(), level=2)
            elif line.startswith('#'):
                p = doc.add_heading(line.replace('#', '').strip(), level=1)
            elif line.startswith('*') or line.startswith('-'):
                p = doc.add_paragraph(line[1:].strip(), style='List Bullet')
            elif '|' in line and '--' not in line: # Bảng cơ bản
                cells = [c.strip() for c in line.split('|') if c.strip()]
                if cells:
                    p = doc.add_paragraph(" | ".join(cells))
            else:
                p = doc.add_paragraph(line.strip())

        stream = io.BytesIO()
        doc.save(stream)
        stream.seek(0)
        
        response = HttpResponse(
            stream.read(),
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        safe_name = f"Bao_cao_AI_{ai_res.id}.docx"
        response['Content-Disposition'] = f'attachment; filename="{safe_name}"'
        return response

import json
class ComparisonNodeViewSet(viewsets.ModelViewSet):
    queryset = ComparisonNode.objects.all().order_by('order_index')
    serializer_class = ComparisonNodeSerializer

class StandaloneReviewViewSet(viewsets.ModelViewSet):
    queryset = StandaloneReview.objects.all().order_by('-created_at')
    serializer_class = StandaloneReviewSerializer

    def perform_create(self, serializer):
        review = serializer.save(uploaded_by=self.request.user)
        # Tự động bóc tách sau khi tải lên
        # Sử dụng đúng constructor và method của ComparisonParser
        parser = ComparisonParser(review.file.path)
        structure = parser.parse()
        
        def save_nodes_recursive(node_list, parent=None):
            for node_data in node_list:
                children = node_data.pop('children', [])
                node = ComparisonNode.objects.create(
                    standalone_review=review,
                    parent=parent,
                    **node_data
                )
                if children:
                    save_nodes_recursive(children, parent=node)
        
        with transaction.atomic():
            save_nodes_recursive(structure)

    @action(detail=True, methods=['get'])
    def data(self, request, pk=None):
        review = self.get_object()
        nodes = ComparisonNode.objects.filter(standalone_review=review).order_by('order_index')
        ai_results = ComparisonAIResult.objects.filter(standalone_review=review)
        
        return Response({
            "review": StandaloneReviewSerializer(review).data,
            "nodes": ComparisonNodeSerializer(nodes, many=True).data,
            "ai_results": ComparisonAIResultSerializer(ai_results, many=True).data
        })

    @action(detail=True, methods=['post'])
    def ai_check(self, request, pk=None):
        review = self.get_object()
        nodes = ComparisonNode.objects.filter(standalone_review=review).order_by('order_index')
        full_text = "\n".join([f"{n.node_label}: {n.content}" for n in nodes])

        ai_service = UnifiedAIService()
        result_json = ai_service.check_internal_references(full_text)
        
        if "error" in result_json:
            error_msg = result_json.get("error", "Lỗi không xác định từ AI")
            return Response({"error": error_msg}, status=500)

        ai_res = ComparisonAIResult.objects.create(
            standalone_review=review,
            result_type='reference_check',
            content=json.dumps(result_json, ensure_ascii=False),
            agent_info=f"{ai_service.provider} ({ai_service.model_name or 'default'})"
        )
        return Response(ComparisonAIResultSerializer(ai_res).data)

    @action(detail=True, methods=['get'])
    def export_excel(self, request, pk=None):
        review = self.get_object()
        ai_result = ComparisonAIResult.objects.filter(standalone_review=review, result_type='reference_check').first()
        if not ai_result:
            return Response({"error": "Chưa có kết quả rà soát AI để xuất."}, status=400)
            
        output = export_reference_excel(review, ai_result)
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="Loi_dan_chieu_{review.id}.xlsx"'
        return response

    @action(detail=True, methods=['get'])
    def export_word(self, request, pk=None):
        review = self.get_object()
        ai_result = ComparisonAIResult.objects.filter(standalone_review=review, result_type='reference_check').first()
        if not ai_result:
            return Response({"error": "Chưa có kết quả rà soát AI để xuất."}, status=400)
            
        output = export_reference_word(review, ai_result)
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        response['Content-Disposition'] = f'attachment; filename="Bao_cao_dan_chieu_{review.id}.docx"'
        return response
    permission_classes = [permissions.IsAuthenticated]
