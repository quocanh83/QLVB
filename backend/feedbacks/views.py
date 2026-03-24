from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Feedback, Explanation, ActionLog
from documents.models import DocumentNode
from django.contrib.contenttypes.models import ContentType
from .serializers import FeedbackSerializer
import docx
import re
import os
from openai import OpenAI
from django.http import FileResponse
from .utils.mau10_generator import generate_mau_10
from documents.models import Document

class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        node_id = request.data.get('node')
        if node_id:
            try:
                node = DocumentNode.objects.get(id=node_id)
                if not self._check_permission(request, node.document_id, 'Chuyên viên Góp ý'):
                    return Response({"error": "Bạn không có quyền Nhập góp ý cho dự thảo này."}, status=403)
            except DocumentNode.DoesNotExist:
                return Response({"error": "Điều/Khoản không tồn tại."}, status=404)
        return super().create(request, *args, **kwargs)

    def _check_permission(self, request, document_id, required_role=None):
        user = request.user
        # 1. Admin?
        is_admin = user.is_staff or user.is_superuser or (hasattr(user, 'roles') and user.roles.filter(role_name='Admin').exists())
        if is_admin: return True
        
        # 2. Lead?
        from documents.models import Document
        try:
            doc = Document.objects.get(id=document_id)
            if doc.lead == user: return True
        except Document.DoesNotExist:
            pass

        # 3. Chuyên viên Role?
        return False
        
    def _find_best_node_match(self, document_id, label, parent_context=None):
        """
        Tìm node phù hợp nhất dựa trên label (Điều 1, Khoản 2, Điểm a...)
        Hỗ trợ phân cấp: nếu label chỉ là 'Khoản 2', sẽ ưu tiên tìm Khoản 2 thuộc parent_context (Điều x).
        """
        if not label or label == "Vấn đề khác": return None
        label = label.strip()
        
        # Thử tìm khớp hoàn toàn trước (case-insensitive)
        exact_match = DocumentNode.objects.filter(document_id=document_id, node_label__iexact=label).first()
        if exact_match: return exact_match

        # Regex linh hoạt hơn để tách Điều/Khoản/Điểm
        dieu_match = re.search(r'(?:Điều|D|Art|Art\.|Chương|Mục)\s*(\d+)', label, re.IGNORECASE)
        khoan_match = re.search(r'(?:Khoản|K|Clause|K\.)\s*(\d+)', label, re.IGNORECASE)
        diem_match = re.search(r'(?:Điểm|Diem|Item|Point|P\.|p)\s*([a-zđ0-9]+)', label, re.IGNORECASE)
        
        # Nếu nhãn chỉ là số
        if not dieu_match and not khoan_match and label.replace('.', '').isdigit():
            clean_num = label.replace('.', '').strip()
            if not parent_context:
                dieu_match = re.search(r'(\d+)', clean_num)
            else:
                khoan_match = re.search(r'(\d+)', clean_num)

        # 1. Xử lý có Điều hoặc Chương/Mục
        if dieu_match:
            d_num_int = int(dieu_match.group(1))
            possible_nodes = DocumentNode.objects.filter(document_id=document_id, node_type='Điều', node_label__icontains=str(d_num_int))
            
            node_dieu = None
            for n in possible_nodes:
                actual_nums = re.findall(r'\d+', n.node_label)
                if any(int(x) == d_num_int for x in actual_nums):
                    node_dieu = n
                    break
            
            if node_dieu:
                if khoan_match:
                    k_num_int = int(khoan_match.group(1))
                    possible_khoans = DocumentNode.objects.filter(document_id=document_id, parent_id=node_dieu.id)
                    for k in possible_khoans:
                        k_actual_nums = re.findall(r'\d+', k.node_label)
                        if any(int(x) == k_num_int for x in k_actual_nums):
                            if diem_match:
                                d_label = diem_match.group(1).lower()
                                possible_diems = DocumentNode.objects.filter(document_id=document_id, parent_id=k.id, node_label__icontains=d_label)
                                if possible_diems.exists(): return possible_diems.first()
                            return k
                return node_dieu

        # 2. Xử lý chỉ có Khoản (trong context Điều)
        if khoan_match and parent_context:
            k_num_int = int(khoan_match.group(1))
            search_parent = parent_context.id
            if parent_context.node_type != 'Điều':
                p = parent_context
                while p and p.node_type != 'Điều':
                    p = DocumentNode.objects.filter(id=p.parent_id).first()
                if p: search_parent = p.id

            possible_khoans = DocumentNode.objects.filter(document_id=document_id, parent_id=search_parent)
            for k in possible_khoans:
                k_actual_nums = re.findall(r'\d+', k.node_label)
                if any(int(x) == k_num_int for x in k_actual_nums):
                    return k
            return parent_context

        # Fallback: icontains đơn thuần
        return DocumentNode.objects.filter(document_id=document_id, node_label__icontains=label).first()

    @action(detail=False, methods=['post'])
    def parse_file(self, request):
        document_id = request.data.get('document_id')
        if not self._check_permission(request, document_id, 'Chuyên viên Góp ý'):
            return Response({"error": "Bạn không có quyền Nhập góp ý cho dự thảo này."}, status=403)
        
        file_obj = request.FILES.get('file')
        agency_default = request.data.get('contributing_agency', '')
        agency_id = request.data.get('agency_id')
        
        if not file_obj:
            return Response({"error": "No file uploaded"}, status=400)
            
        doc = docx.Document(file_obj)
        results = []
        metadata = {
            "drafting_agency": "",
            "agency_location": "",
            "total_consulted_doc": 0,
            "total_feedbacks_doc": 0
        }
        
        # Sơ bộ tìm metadata ở 20 đoạn đầu
        for i, para in enumerate(doc.paragraphs[:20]):
            text = para.text.strip()
            if not text: continue
            
            loc_match = re.search(r'^([\w\s]+),\s*ngày\s+\d+\s+tháng\s+\d+\s+năm\s+\d+', text)
            if loc_match and not metadata["agency_location"]:
                metadata["agency_location"] = loc_match.group(1).strip()
            
            if i < 7 and any(kw in text.upper() for kw in ["BỘ ", "TỔNG CỤC ", "ỦY BAN ", "SỞ "]):
                if not metadata["drafting_agency"]:
                    metadata["drafting_agency"] = text
            
            consult_match = re.search(r'tổng số cơ quan.*?là\s*(\d+)', text.lower()) or re.search(r'lấy ý kiến.*?:?\s*(\d+)', text.lower())
            if consult_match:
                metadata["total_consulted_doc"] = int(consult_match.group(1))
            
            feedback_match = re.search(r'tổng số ý kiến.*?là\s*(\d+)', text.lower()) or re.search(r'số ý kiến nhận được.*?:?\s*(\d+)', text.lower())
            if feedback_match:
                metadata["total_feedbacks_doc"] = int(feedback_match.group(1))

        # Phân rã từ BẢNG (thường có trong phụ lục)
        table_context_node = None
        for table in doc.tables:
            # Kiểm tra xem bảng có phải bảng góp ý không (dựa vào header)
            header_cells = [cell.text.strip().lower() for cell in table.rows[0].cells]
            if not any(kw in " ".join(header_cells) for kw in ["góp ý", "ý kiến", "nội dung", "điều", "khoản"]):
                continue
            
            # Tìm cột chứa nội dung và cột chứa node_label
            content_col_idx = -1
            node_col_idx = -1
            agency_col_idx = -1
            
            for idx, text in enumerate(header_cells):
                if any(kw in text for kw in ["góp ý", "nội dung", "ý kiến"]): content_col_idx = idx
                if any(kw in text for kw in ["điều", "khoản", "mục", "vị trí"]): node_col_idx = idx
                if any(kw in text for kw in ["cơ quan", "đơn vị", "chủ thể"]): agency_col_idx = idx
            
            # Nếu không tìm thấy cột nội dung, lấy cột rộng nhất hoặc mặc định cột 2
            if content_col_idx == -1: continue
            
            for row in table.rows[1:]: # Bỏ qua header
                cells = row.cells
                if len(cells) <= content_col_idx: continue
                
                row_content = cells[content_col_idx].text.strip()
                if not row_content: continue
                
                row_node_label = cells[node_col_idx].text.strip() if node_col_idx != -1 and len(cells) > node_col_idx else ""
                row_agency = cells[agency_col_idx].text.strip() if agency_col_idx != -1 and len(cells) > agency_col_idx else agency_default
                
                # Tìm node_id tự động
                suggested_node = self._find_best_node_match(document_id, row_node_label, parent_context=table_context_node)
                if suggested_node and suggested_node.node_type in ['Điều', 'Khoản']:
                    table_context_node = suggested_node # Cập nhật context cho dòng sau
                
                results.append({
                    "key": f"table-{len(results)}",
                    "node_label": row_node_label if row_node_label else "Vấn đề khác",
                    "node_id": suggested_node.id if suggested_node else None,
                    "contributing_agency": row_agency,
                    "content": row_content
                })

        # Phân rã nội dung từ Văn bản (Paragraphs)
        current_node_label = "Vấn đề khác"
        current_node_obj = None # Context cho phân cấp
        current_content = ""
        
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text: continue
            
            node_match = re.search(r'(Điều\s+\d+|Khoản\s+\d+|Điểm\s+[a-zđ])', text, re.IGNORECASE)
            
            if node_match:
                if current_content.strip():
                    results.append({
                        "key": f"para-{len(results)}",
                        "node_label": current_node_label,
                        "node_id": current_node_obj.id if current_node_obj else None,
                        "contributing_agency": agency_default,
                        "agency_id": agency_id,
                        "content": current_content.strip()
                    })
                
                new_label = node_match.group(1).title()
                # Thử tìm node và cập nhật context
                new_node = self._find_best_node_match(document_id, new_label, parent_context=current_node_obj if 'Điều' not in new_label else None)
                
                current_node_label = new_label
                current_node_obj = new_node
                current_content = text
            else:
                if current_content:
                    current_content += f"\n{text}"
                else:
                    current_content = text
                    
        if current_content.strip():
            results.append({
                "key": f"para-{len(results)}",
                "node_label": current_node_label,
                "node_id": current_node_obj.id if current_node_obj else None,
                "contributing_agency": agency_default,
                "agency_id": agency_id,
                "content": current_content.strip()
            })
            
        return Response({
            "metadata": metadata,
            "feedbacks": results
        })

    @action(detail=False, methods=['get'])
    def get_document_nodes(self, request):
        """Lấy danh sách node để phục vụ mapping ở frontend"""
        doc_id = request.query_params.get('document_id')
        if not doc_id: return Response([])
        nodes = DocumentNode.objects.filter(document_id=doc_id).order_by('order_index')
        return Response([{"id": n.id, "label": n.node_label, "type": n.node_type} for n in nodes])

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        document_id = request.data.get('document_id')
        if not self._check_permission(request, document_id, 'Chuyên viên Góp ý'):
            return Response({"error": "Bạn không có quyền Nhập góp ý cho dự thảo này."}, status=403)
            
        feedbacks_data = request.data.get('feedbacks', [])
        metadata = request.data.get('metadata', {})
        
        # Cập nhật Document Metadata
        from documents.models import Document
        doc = Document.objects.filter(id=document_id).first()
        if doc and metadata:
            if metadata.get('drafting_agency'): doc.drafting_agency = metadata['drafting_agency']
            if metadata.get('agency_location'): doc.agency_location = metadata['agency_location']
            if metadata.get('total_consulted_doc'): doc.total_consulted_doc = metadata['total_consulted_doc']
            if metadata.get('total_feedbacks_doc'): doc.total_feedbacks_doc = metadata['total_feedbacks_doc']
            doc.save()

        # Tìm node "Vấn đề khác" làm fallback
        fallback_node = DocumentNode.objects.filter(document_id=document_id, node_type='Vấn đề khác').first()

        created_count = 0
        for item in feedbacks_data:
            node_id = item.get('node_id') # Ưu tiên id nếu frontend đã map
            node_label = item.get('node_label', '')
            
            node = None
            if node_id:
                node = DocumentNode.objects.filter(id=node_id, document_id=document_id).first()
            
            if not node and node_label:
                # Tìm theo label (icontains)
                node = DocumentNode.objects.filter(document_id=document_id, node_label__icontains=node_label).first()
            
            # Fallback
            target_node = node or fallback_node
            
            if target_node:
                agency_id = item.get('agency_id')
                Feedback.objects.create(
                    document_id=document_id,
                    node=target_node,
                    user=request.user,
                    contributing_agency=item.get('contributing_agency', ''),
                    agency_id=agency_id,
                    content=item.get('content', '')
                )
                created_count += 1
                
        return Response({"message": f"Đã lưu thành công {created_count} góp ý.", "count": created_count})

    @action(detail=False, methods=['post'])
    def ai_suggest(self, request):
        document_id = request.data.get('document_id')
        if not self._check_permission(request, document_id, 'Chuyên viên Giải trình'):
            return Response({"error": "Bạn không có quyền sử dụng AI Giải trình cho dự thảo này."}, status=403)

        node_content = request.data.get('node_content', '')
        feedback_content = request.data.get('feedback_content', '')
        
        system_prompt = """Bạn là một Chuyên viên Pháp chế cấp cao của cơ quan Nhà nước trực thuộc Chính phủ Việt Nam.
NGUYÊN TẮC LẬP LUẬN:
- Bạn mang tâm thế của cơ quan chủ trì soạn thảo. ƯU TIÊN MẶC ĐỊNH là bảo vệ, giữ nguyên nội dung dự thảo ban đầu, trừ khi ý kiến góp ý chỉ ra sai sót pháp lý nghiêm trọng không thể chối cãi.
- Lập luận từ chối tiếp thu phải cực kỳ khéo léo, khách quan, hợp tình hợp lý. Dựa vào các lý do như: tính khả thi, đánh giá tác động thủ tục hành chính, bối cảnh thực tiễn...
- Văn phong mang ĐẬM TÍNH NGÔN NGỮ HÀNH CHÍNH NHÀ NƯỚC.
FORMAT TRẢ LỜI CỐ ĐỊNH:
- KHÔNG XƯNG HÔ "tôi", "bạn", "chúng tôi", "AI". Chỉ dùng đại từ "Cơ quan chủ trì soạn thảo".
- KHÔNG CÓ lời chào hỏi, dạo đầu. TRẢ VỀ TRỰC TIẾP kết quả giải trình để điền thẳng vào khung báo cáo."""
        
        user_prompt = f"Nội dung gốc:\n{node_content}\n\nNội dung góp ý:\n{feedback_content}\n\nHãy đưa ra nội dung giải trình ngắn gọn, đanh thép để bảo vệ dự thảo."
        
        from core.models import SystemSetting
        db_setting = SystemSetting.objects.filter(key='OPENAI_API_KEY').first()
        api_key = db_setting.value if db_setting and db_setting.value else os.environ.get('OPENAI_API_KEY')
        
        if not api_key:
            return Response({
                "suggestion": "Cơ quan chủ trì soạn thảo xin ghi nhận ý kiến. Tuy nhiên, qua rà soát bối cảnh thực tiễn và tính bộ khung của toàn Hệ thống điều khoản, kính đề nghị giữ nguyên như dự thảo để đảm bảo tính khả thi.\n\n(Hệ thống đang chạy MOCK AI do Môi trường Backend chưa nạp biến OPENAI_API_KEY. Để nạp key, vui lòng Set Environment OPENAI_API_KEY=sk-...)"
            })
            
        try:
            client = OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=600
            )
            return Response({
                "suggestion": response.choices[0].message.content.strip()
            })
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=['post'])
    def save_explanation(self, request):
        document_id = request.data.get('document_id')
        if not self._check_permission(request, document_id, 'Chuyên viên Giải trình'):
            return Response({"error": "Bạn không có quyền Lưu giải trình cho dự thảo này."}, status=403)
            
        target_type = request.data.get('target_type')
        object_id = request.data.get('object_id')
        content = request.data.get('content')
        
        if target_type == 'Feedback':
            content_type = ContentType.objects.get_for_model(Feedback)
        else:
            content_type = ContentType.objects.get_for_model(DocumentNode)
            
        explanation, created = Explanation.objects.update_or_create(
            target_type=target_type,
            content_type=content_type,
            object_id=object_id,
            defaults={'content': content, 'user': request.user}
        )
        
        # Log action and update feedback status if target is Feedback
        if target_type == 'Feedback':
            fb = Feedback.objects.get(id=object_id)
            if fb.status == 'pending':
                fb.status = 'reviewed'
                fb.save()
            ActionLog.objects.create(
                user=request.user,
                feedback=fb,
                action="Lưu giải trình",
                details=f"Nội dung: {content[:100]}..."
            )
            
        return Response({"message": "Đã lưu giải trình"})

    @action(detail=True, methods=['post'])
    def submit_for_review(self, request, pk=None):
        fb = self.get_object()
        if not self._check_permission(request, fb.document_id, 'Chuyên viên Giải trình'):
            return Response({"error": "No permission"}, status=403)
        
        fb.status = 'reviewed'
        fb.save()
        ActionLog.objects.create(
            user=request.user,
            feedback=fb,
            action="Gửi duyệt",
            details="Chuyên viên đã gửi duyệt nội dung giải trình."
        )
        return Response({"message": "Đã gửi duyệt thành công"})

    @action(detail=True, methods=['post'])
    def approve_feedback(self, request, pk=None):
        fb = self.get_object()
        # Admin or Lead only
        user = request.user
        is_lead = fb.document.lead == user or user.is_staff or user.is_superuser
        if not is_lead:
            return Response({"error": "Chỉ Lãnh đạo/Admin mới có quyền phê duyệt."}, status=403)
        
        fb.status = 'approved'
        fb.save()
        ActionLog.objects.create(
            user=request.user,
            feedback=fb,
            action="Phê duyệt",
            details="Lãnh đạo đã phê duyệt nội dung giải trình."
        )
        return Response({"message": "Đã phê duyệt thành công"})

    @action(detail=False, methods=['get'])
    def by_node(self, request):
        """Lấy danh sách góp ý phẳng cho một node (và các con của nó)"""
        node_id = request.query_params.get('node_id')
        filter_type = request.query_params.get('filter_type', 'has_feedback')
        if not node_id: return Response([])
        
        from documents.models import DocumentNode
        try:
            root_node = DocumentNode.objects.get(id=node_id)
            
            # Lấy tất cả node con/cháu
            def get_all_descendant_ids(node):
                ids = [node.id]
                for child in node.children.all():
                    ids.extend(get_all_descendant_ids(child))
                return ids
            
            target_ids = get_all_descendant_ids(root_node)
            
            feedbacks = Feedback.objects.filter(node_id__in=target_ids)\
                .select_related('node', 'agency')\
                .prefetch_related('explanations', 'logs', 'logs__user')\
                .order_by('created_at')
            
            results = []
            for fb in feedbacks:
                # Build hierarchical path label
                path = []
                curr = fb.node
                while curr:
                    path.insert(0, curr.node_label)
                    curr = curr.parent
                
                explanation_obj = fb.explanations.first() # Lấy giải trình đầu tiên
                
                if filter_type == 'resolved' and not explanation_obj:
                    continue
                if filter_type == 'unresolved' and explanation_obj:
                    continue
                
                results.append({
                    "id": fb.id,
                    "node_id": fb.node_id,
                    "node_path": ", ".join(path),
                    "node_content": fb.node.content,
                    "contributing_agency": fb.contributing_agency or (fb.agency.name if fb.agency else "Ẩn danh"),
                    "agency_category": fb.agency.category if fb.agency else "other",
                    "content": fb.content,
                    "explanation": explanation_obj.content if explanation_obj else "",
                    "status": fb.status, # Use real status from model
                    "created_at": fb.created_at.strftime("%d/%m/%Y %H:%M"),
                    "logs": [
                        {
                            "username": log.user.username,
                            "action": log.action,
                            "time": log.created_at.strftime("%H:%M %d/%m/%Y"),
                            "details": log.details
                        } for log in fb.logs.all()
                    ]
                })
            return Response(results)
        except DocumentNode.DoesNotExist:
            return Response({"error": "Node not found"}, status=404)

    @action(detail=False, methods=['get'])
    def subject_stats(self, request):
        """API thống kê số lượng góp ý theo chủ thể (cơ quan) và phân loại"""
        from django.db.models import Count, Q
        
        doc_id = request.query_params.get('document_id')
        queryset = Feedback.objects.all()
        if doc_id:
            queryset = queryset.filter(document_id=doc_id)
            
        # Group by agency (using agency__name and agency__category if linked, else contributing_agency)
        stats_qs = queryset.filter(
            Q(agency__isnull=False) | Q(contributing_agency__isnull=False)
        ).values('agency__name', 'agency__category', 'contributing_agency').annotate(
            total_feedbacks=Count('id', distinct=True),
            resolved_count=Count('explanations', distinct=True)
        ).order_by('-total_feedbacks')
        
        agency_results = []
        category_counts = {}
        
        for item in stats_qs:
            agency_name = item['agency__name'] or item['contributing_agency']
            category = item['agency__category'] or 'other'
            if not agency_name: continue
            
            # Aggregate by category
            if category not in category_counts:
                category_counts[category] = 0
            category_counts[category] += item['total_feedbacks']
            
            agency_results.append({
                "agency": agency_name,
                "category": category,
                "total": item['total_feedbacks'],
                "resolved": item['resolved_count'],
                "resolve_rate": round(item['resolved_count'] / item['total_feedbacks'] * 100, 1) if item['total_feedbacks'] > 0 else 0
            })
            
        return Response({
            "agency_stats": agency_results,
            "category_stats": category_counts
        })

    @action(detail=False, methods=['get'])
    def uncontributed(self, request):
        """Trả về danh sách các cơ quan CHƯA có góp ý cho dự thảo cụ thể"""
        doc_id = request.query_params.get('document_id')
        if not doc_id:
            return Response({"error": "Vui lòng cung cấp document_id"}, status=400)
            
        from core.models import Agency
        # Lấy ID của các Agency đã góp ý cho dự thảo này
        contributed_agency_ids = Feedback.objects.filter(
            document_id=doc_id, agency__isnull=False
        ).values_list('agency_id', flat=True).distinct()
        
        # Các Agency còn lại là chưa góp ý
        uncontributed = Agency.objects.exclude(id__in=contributed_agency_ids).values('id', 'name', 'category')
        
        return Response(list(uncontributed))

    @action(detail=False, methods=['get'])
    def custom_report_preview(self, request):
        doc_id = request.query_params.get('document_id')
        agency = request.query_params.get('agency')
        status_filter = request.query_params.get('status')
        
        if not doc_id: return Response([])
        
        feedbacks = Feedback.objects.filter(document_id=doc_id).select_related('node').prefetch_related('explanations', 'user').order_by('node__order_index')
        
        if agency and agency != 'all':
            feedbacks = feedbacks.filter(contributing_agency=agency)
            
        if status_filter == 'resolved':
            feedbacks = feedbacks.filter(explanations__isnull=False).distinct()
        elif status_filter == 'unresolved':
            feedbacks = feedbacks.filter(explanations__isnull=True).distinct()
            
        results = []
        for i, fb in enumerate(feedbacks, 1):
            explanation = fb.explanations.first()
            
            dieu_khoan = f"{fb.node.node_label}" if fb.node else ""
            if fb.node and fb.node.parent:
                dieu_khoan = f"{fb.node.parent.node_label}, {fb.node.node_label}"
                
            results.append({
                "stt": i,
                "dieu_khoan": dieu_khoan,
                "co_quan": fb.contributing_agency or "Khác",
                "noi_dung_gop_y": fb.content,
                "noi_dung_giai_trinh": explanation.content if explanation else "",
                "chuyen_vien": explanation.user.username if explanation and explanation.user else (fb.user.username if fb.user else "")
            })
            
        return Response(results)

    @action(detail=False, methods=['get'], permission_classes=[])
    def export_mau_10(self, request):
        doc_id = request.query_params.get('document_id')
        agency = request.query_params.get('agency')
        status_filter = request.query_params.get('status')
        
        # Xác thực qua token ở URL (Cho phép tải file trực tiếp từ trình duyệt)
        user = request.user
        if not user.is_authenticated:
            token = request.query_params.get('token')
            if not token:
                return Response({"error": "Vui lòng cung cấp token"}, status=401)
            from rest_framework_simplejwt.tokens import AccessToken
            from django.contrib.auth import get_user_model
            try:
                access_token = AccessToken(token)
                user = get_user_model().objects.get(id=access_token['user_id'])
            except Exception:
                return Response({"error": "Token không hợp lệ"}, status=401)
        
        if not doc_id:
            return Response({"error": "Vui lòng cung cấp document_id"}, status=400)
            
        try:
            document = Document.objects.get(id=doc_id)
            feedbacks = Feedback.objects.filter(document_id=doc_id).select_related('node').prefetch_related('explanations').order_by('node__order_index')
            
            if agency and agency != 'all':
                feedbacks = feedbacks.filter(contributing_agency=agency)
                
            if status_filter == 'resolved':
                feedbacks = feedbacks.filter(explanations__isnull=False).distinct()
            elif status_filter == 'unresolved':
                feedbacks = feedbacks.filter(explanations__isnull=True).distinct()
            
            if not feedbacks.exists():
                return Response({"error": "Không có ý kiến góp ý nào thỏa mãn bộ lọc để xuất báo cáo."}, status=404)
                
            file_stream = generate_mau_10(document, feedbacks)
            
            response = FileResponse(
                file_stream, 
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
            filename = f"Bao_cao_Mau_10_Tuy_bien.docx"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
            
        except Document.DoesNotExist:
            return Response({"error": "Văn bản không tồn tại"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

