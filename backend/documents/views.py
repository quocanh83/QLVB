from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Count, Q
from django.db import transaction
from .models import Document, DocumentNode, NodeAssignment
from .serializers import DocumentListSerializer, DocumentUploadSerializer, DocumentNodeSerializer
from accounts.models import User
import docx
import re
import io
from datetime import datetime
from django.http import FileResponse, HttpResponse
from docxtpl import DocxTemplate
import os
from .utils.parser_engine import ParserEngine

def clean_text(text):
    """Giữ lại các ký tự hợp lệ cho XML 1.0, loại bỏ ký tự điều khiển và escape các ký tự đặc biệt."""
    if text is None:
        return ""
    text = str(text)
    # Loại bỏ các ký tự không hợp lệ cho XML 1.0
    text = re.sub(r'[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\U00010000-\U0010FFFF]', '', text)
    # Escape các ký tự đặc biệt của XML để tránh làm hỏng cấu trúc file Word
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Document.objects.annotate(
            total_dieu=Count('nodes', filter=Q(nodes__node_type='Điều'), distinct=True),
            total_khoan=Count('nodes', filter=Q(nodes__node_type='Khoản'), distinct=True),
            total_diem=Count('nodes', filter=Q(nodes__node_type='Điểm'), distinct=True),
            total_phu_luc=Count('nodes', filter=Q(nodes__node_type='Phụ lục'), distinct=True),
            total_nodes=Count('nodes', distinct=True),
            total_feedbacks=Count('feedbacks', distinct=True),
            resolved_feedbacks=Count('feedbacks', filter=Q(feedbacks__explanations__isnull=False), distinct=True)
        ).order_by('-id')

    def get_serializer_class(self):
        if self.action == 'create':
            return DocumentUploadSerializer
        return DocumentListSerializer

    @action(detail=True, methods=['post'])
    def set_lead(self, request, pk=None):
        """Admin chỉ định Chủ trì (Lead) cho một Dự thảo"""
        user = request.user
        user = request.user
        is_admin = user.is_staff or user.is_superuser or (hasattr(user, 'roles') and user.roles.filter(role_name='Admin').exists())
        if not is_admin:
            return Response({"error": "Chỉ Admin mới có thể chỉ định Chủ trì."}, status=403)
        document = self.get_object()
        lead_id = request.data.get('lead_id')
        if lead_id:
            try:
                lead_user = User.objects.get(id=lead_id)
                document.lead = lead_user
            except User.DoesNotExist:
                return Response({"error": "Không tìm thấy tài khoản cán bộ."}, status=404)
        else:
            document.lead = None  # Gỡ chủ trì
        document.save()
        return Response({"message": "Đã cập nhật thông tin Chủ trì (Lead) thành công!"})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                document = serializer.save(uploaded_by=request.user)
                file_obj = request.FILES.get('attached_file_path')
                if file_obj:
                    parser = ParserEngine(file_obj)
                    structure = parser.parse()
                    
                    def save_nodes_recursive(node_list, parent=None):
                        nonlocal index
                        for node_data in node_list:
                            children = node_data.pop('children', [])
                            node = DocumentNode.objects.create(
                                document=document,
                                parent=parent,
                                **node_data
                            )
                            if children:
                                save_nodes_recursive(children, parent=node)

                    index = 0
                    save_nodes_recursive(structure)
                    
                    # Tự động tạo node Vấn đề khác ở cuối cùng
                    DocumentNode.objects.create(
                        document=document,
                        node_type='Vấn đề khác',
                        node_label='Vấn đề khác',
                        content='',
                        order_index=9999
                    )                    
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['post'])
    def parse_preview(self, request):
        """Trả về cấu trúc cây thư mục của file docx mà không lưu database"""
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "Vui lòng đính kèm file .docx"}, status=400)
        
        try:
            parser = ParserEngine(file_obj)
            structure = parser.parse()
            return Response(structure)
        except Exception as e:
            return Response({"error": f"Lỗi parse: {str(e)}"}, status=400)

    @action(detail=True, methods=['get'], permission_classes=[])
    def nodes(self, request, pk=None):
        document = self.get_object()
        user = request.user
        
        is_admin = user.is_staff or user.is_superuser or (hasattr(user, 'roles') and user.roles.filter(role_name='Admin').exists())
        is_lead = (document.lead == user)
        
        if is_admin or is_lead:
            all_nodes = DocumentNode.objects.filter(document=document).annotate(
                total_feedbacks=Count('feedbacks', distinct=True),
                resolved_feedbacks=Count('feedbacks', filter=Q(feedbacks__explanations__isnull=False), distinct=True)
            ).prefetch_related('assignments', 'assignments__user').order_by('order_index')
            for n in all_nodes:
                n.is_editable = True
        else:
            # Data Isolation ORM Magic
            assigned_node_ids = NodeAssignment.objects.filter(
                user=user, 
                node__document=document
            ).values_list('node_id', flat=True)
            
            all_nodes = DocumentNode.objects.filter(document=document).filter(
                Q(id__in=assigned_node_ids) |
                Q(children__id__in=assigned_node_ids) |
                Q(children__children__id__in=assigned_node_ids)
            ).annotate(
                total_feedbacks=Count('feedbacks', distinct=True),
                resolved_feedbacks=Count('feedbacks', filter=Q(feedbacks__explanations__isnull=False), distinct=True)
            ).prefetch_related('assignments', 'assignments__user').distinct().order_by('order_index')
            
            assigned_set = set(assigned_node_ids)
            for n in all_nodes:
                n.is_editable = (n.id in assigned_set)

        # Build In-Memory Tree (O(N) Complexity)
        node_dict = {n.id: n for n in all_nodes}
        root_nodes = []
        for n in all_nodes:
            n.prefetched_children = []
            
        for n in all_nodes:
            if n.parent_id and n.parent_id in node_dict:
                node_dict[n.parent_id].prefetched_children.append(n)
            else:
                root_nodes.append(n)
                
        serializer = DocumentNodeSerializer(root_nodes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def assign_nodes(self, request, pk=None):
        document = self.get_object()
        user = request.user
        is_admin = user.is_staff or user.is_superuser or (hasattr(user, 'roles') and user.roles.filter(role_name='Admin').exists())
        if not (is_admin or document.lead == user):
            return Response({"error": "Bạn không có quyền Phân công dự án này."}, status=403)
            
        assignments_data = request.data.get('assignments', [])
        
        with transaction.atomic():
            for item in assignments_data:
                node_id = item.get('node_id')
                user_ids = item.get('user_ids', [])
                
                NodeAssignment.objects.filter(node_id=node_id).delete()
                
                new_assignments = [
                    NodeAssignment(node_id=node_id, user_id=uid, assigned_by=user)
                    for uid in user_ids
                ]
                NodeAssignment.objects.bulk_create(new_assignments)
                
        return Response({"message": "Cập nhật phân công thành công!"})

    @action(detail=True, methods=['get'], permission_classes=[])
    def node_details(self, request, pk=None):
        node_id = request.query_params.get('node_id')
        from feedbacks.models import Feedback, Explanation
        from django.contrib.contenttypes.models import ContentType
        try:
            root_node = DocumentNode.objects.get(id=node_id, document_id=pk)
            
            # Hàm đệ quy lấy con
            def get_all_descendants(node):
                descendants = [node]
                for child in node.children.all():
                    descendants.extend(get_all_descendants(child))
                return descendants
            
            all_target_nodes = get_all_descendants(root_node)
            node_ct = ContentType.objects.get_for_model(DocumentNode)
            
            results = []
            for n in all_target_nodes:
                feedbacks = Feedback.objects.filter(node=n).order_by('-created_at')
                feedback_data = []
                for fb in feedbacks:
                    explanations = fb.explanations.all()
                    feedback_data.append({
                        "id": fb.id,
                        "contributing_agency": fb.contributing_agency,
                        "content": fb.content,
                        "created_at": fb.created_at,
                        "explanations": [{"id": ex.id, "content": ex.content} for ex in explanations]
                    })
                
                node_explanations = Explanation.objects.filter(content_type=node_ct, object_id=n.id)
                results.append({
                    "id": n.id,
                    "node_label": n.node_label,
                    "node_type": n.node_type,
                    "content": n.content,
                    "feedbacks": feedback_data,
                    "node_explanations": [{"id": ex.id, "content": ex.content} for ex in node_explanations]
                })
            
            return Response(results)
        except DocumentNode.DoesNotExist:
            return Response({"error": "Node not found"}, status=404)

    @action(detail=False, methods=['get'])
    def explanation_stats(self, request):
        """Thống kê giải trình cho danh sách dự thảo"""
        queryset = Document.objects.annotate(
            total_feedbacks=Count('feedbacks', distinct=True),
            resolved_feedbacks=Count('feedbacks', filter=Q(feedbacks__explanations__isnull=False), distinct=True)
        ).order_by('-id')
        
        serializer = DocumentListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def export_report(self, request, pk=None):
        from docxtpl import DocxTemplate
        import os
        from django.conf import settings
        from django.http import HttpResponse
        from datetime import date
        from django.contrib.contenttypes.models import ContentType
        from feedbacks.models import Feedback, Explanation
        from .models import DocumentNode

        doc_obj = self.get_object()
        
        # Prepare Data
        feedback_ct = ContentType.objects.get_for_model(Feedback)
        
        data = {
            "agency_name": getattr(doc_obj, 'drafting_agency', '') or "BỘ TƯ PHÁP",
            "headquarters_location": getattr(doc_obj, 'agency_location', '') or "Hà Nội",
            "document_title": doc_obj.project_name,
            "export_date": date.today().strftime("%d/%m/%Y"),
            "dieu_list": []
        }
        
        dieu_nodes = DocumentNode.objects.filter(document=doc_obj, node_type="Điều").order_by('order_index')
        for dieu in dieu_nodes:
            dieu_dict = {
                "node_label": dieu.node_label,
                "content": dieu.content,
                "feedbacks": [],
                "khoan_list": []
            }
            
            # Feedbacks on Điều
            for fb in dieu.feedbacks.all():
                exps = Explanation.objects.filter(content_type=feedback_ct, object_id=fb.id)
                fb_dict = {
                    "user_name": getattr(fb.user, 'username', '') if fb.user else (fb.contributing_agency or "Ẩn danh"),
                    "content": fb.content,
                    "explanations": [{"user_name": getattr(exp.user, 'username', ''), "content": exp.content} for exp in exps]
                }
                dieu_dict["feedbacks"].append(fb_dict)
                
            # Khoản
            for khoan in dieu.children.filter(node_type="Khoản").order_by('order_index'):
                khoan_dict = {
                    "node_label": khoan.node_label,
                    "content": khoan.content,
                    "feedbacks": [],
                    "diem_list": []
                }
                
                for fb in khoan.feedbacks.all():
                    exps = Explanation.objects.filter(content_type=feedback_ct, object_id=fb.id)
                    fb_dict = {
                        "user_name": getattr(fb.user, 'username', '') if fb.user else (fb.contributing_agency or "Ẩn danh"),
                        "content": fb.content,
                        "explanations": [{"user_name": getattr(exp.user, 'username', ''), "content": exp.content} for exp in exps]
                    }
                    khoan_dict["feedbacks"].append(fb_dict)
                    
                # Điểm
                for diem in khoan.children.filter(node_type="Điểm").order_by('order_index'):
                    diem_dict = {
                        "node_label": diem.node_label,
                        "content": diem.content,
                        "feedbacks": []
                    }
                    for fb in diem.feedbacks.all():
                        exps = Explanation.objects.filter(content_type=feedback_ct, object_id=fb.id)
                        fb_dict = {
                            "user_name": getattr(fb.user, 'username', '') if fb.user else (fb.contributing_agency or "Ẩn danh"),
                            "content": fb.content,
                            "explanations": [{"user_name": getattr(exp.user, 'username', ''), "content": exp.content} for exp in exps]
                        }
                        diem_dict["feedbacks"].append(fb_dict)
                        
                    khoan_dict["diem_list"].append(diem_dict)
                    
                dieu_dict["khoan_list"].append(khoan_dict)
                
            data["dieu_list"].append(dieu_dict)
            
        template_path = os.path.join(settings.BASE_DIR, '..', 'template_bao_cao_chuan_v2.docx')
        if not os.path.exists(template_path):
            return Response({"error": "Template không tồn tại"}, status=404)
            
        tpl = DocxTemplate(template_path)
        tpl.render(data)
        
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        response['Content-Disposition'] = f'attachment; filename="bao_cao_{doc_obj.id}.docx"'
        tpl.save(response)
        
        return response

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """API cung cấp dữ liệu cho trang Tổng quan (Dashboard)"""
        from feedbacks.models import Feedback
        from django.db.models.functions import TruncDate
        from datetime import timedelta
        from django.utils import timezone

        # KPI Cards
        total_docs = Document.objects.count()
        total_feedbacks = Feedback.objects.count()
        resolved_feedbacks = Feedback.objects.filter(explanations__isnull=False).distinct().count()
        
        # Lấy count danh sách agencies distinct không bị none/rỗng
        agencies_qs = Feedback.objects.exclude(contributing_agency__isnull=True).exclude(contributing_agency='').values('contributing_agency').distinct()
        agencies_count = agencies_qs.count()
        
        # Top Documents (Dự thảo nóng nhất - Top 5)
        top_docs_qs = Document.objects.annotate(
            feedback_count=Count('feedbacks', distinct=True)
        ).order_by('-feedback_count', '-id')[:5]
        
        top_docs = [{"name": d.project_name, "feedbacks": d.feedback_count} for d in top_docs_qs]
        
        # Trend Data (Góp ý theo ngày - 7 ngày gần nhất)
        today = timezone.now()
        seven_days_ago = (today - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
        
        trend_qs = Feedback.objects.filter(created_at__gte=seven_days_ago).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(count=Count('id', distinct=True)).order_by('date')
        
        trend_dict = {item['date'].strftime('%d/%m'): item['count'] for item in trend_qs if item['date']}
        
        trend_data = []
        for i in range(6, -1, -1):
            day_str = (today - timedelta(days=i)).strftime('%d/%m')
            trend_data.append({
                "date": day_str,
                "count": trend_dict.get(day_str, 0)
            })
        
        # Recent Activity (5 hoạt động mới nhất)
        recent_feedbacks = Feedback.objects.select_related('user', 'document').order_by('-created_at')[:5]
        recent_activity = []
        for fb in recent_feedbacks:
            recent_activity.append({
                "id": f"fb-{fb.id}",
                "type": "feedback",
                "user": fb.user.username if fb.user else "Hệ thống",
                "document": fb.document.project_name,
                "time": fb.created_at,
                "content": "đã gửi góp ý mới"
            })
            
        return Response({
            "cards": {
                "totalDocs": total_docs,
                "totalFeedbacks": total_feedbacks,
                "resolvedFeedbacks": resolved_feedbacks,
                "agenciesCount": agencies_count
            },
            "topDocs": top_docs,
            "trendData": trend_data,
            "recentActivity": recent_activity
        })

    @action(detail=True, methods=['get'])
    def feedback_nodes(self, request, pk=None):
        """Lấy cây thư mục chỉ chứa các node có góp ý, hỗ trợ lọc theo cơ quan"""
        document = self.get_object()
        agency = request.query_params.get('agency')
        
        # Tìm tất cả các node có góp ý hoặc có con/cháu có góp ý
        # Lọc nhãn số lượng theo cơ quan nếu có
        query_all_fb = Q(feedbacks__isnull=False)
        query_exp_fb = Q(feedbacks__explanations__isnull=False)
        
        if agency:
            query_all_fb &= Q(feedbacks__contributing_agency__icontains=agency)
            query_exp_fb &= Q(feedbacks__contributing_agency__icontains=agency)

        nodes = DocumentNode.objects.filter(document=document).annotate(
            total_fb=Count('feedbacks', filter=query_all_fb, distinct=True),
            explained_fb=Count('feedbacks', filter=query_exp_fb, distinct=True)
        ).order_by('order_index')
        
        # Build tree in-memory
        node_dict = {n.id: n for n in nodes}
        for n in nodes:
            n.prefetched_children = []
            n.total_feedbacks = n.total_fb
            n.resolved_feedbacks = n.explained_fb
            
        root_nodes = []
        for n in nodes:
            if n.parent_id and n.parent_id in node_dict:
                node_dict[n.parent_id].prefetched_children.append(n)
            else:
                root_nodes.append(n)
        
        filter_type = request.query_params.get('filter_type', 'has_feedback')

        # Hàm đệ quy để tính tổng số lượng góp ý từ dưới lên
        def aggregate_counts_recursive(node):
            total = node.total_fb
            resolved = node.explained_fb
            
            valid_children = []
            for child in node.prefetched_children:
                child_total, child_resolved, should_keep = aggregate_counts_recursive(child)
                
                # Luôn cộng dồn số lượng để hiển thị đúng tổng số, bất kể filter
                total += child_total
                resolved += child_resolved
                
                if should_keep:
                    valid_children.append(child)
            
            node.total_feedbacks = total
            node.resolved_feedbacks = resolved
            node.prefetched_children = valid_children
            
            # Quyết định xem branch này có được giữ lại không dựa trên filter_type
            if filter_type == 'all':
                keep_node = True
            elif filter_type == 'resolved':
                keep_node = (resolved > 0)
            elif filter_type == 'unresolved':
                keep_node = ((total - resolved) > 0)
            else: # has_feedback (default)
                keep_node = (total > 0)
                
            return total, resolved, keep_node

        pruned_roots = []
        for r in root_nodes:
            _, _, should_keep = aggregate_counts_recursive(r)
            if should_keep:
                pruned_roots.append(r)
        
        serializer = DocumentNodeSerializer(pruned_roots, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[])
    def unresolved_feedbacks(self, request, pk=None):
        """Liệt kê các góp ý chưa có giải trình của một văn bản"""
        from feedbacks.models import Feedback
        # Feedback chưa có explanation
        unresolved = Feedback.objects.filter(
            document_id=pk,
            explanations__isnull=True
        ).select_related('node').order_by('node__order_index')
        
        data = []
        for fb in unresolved:
            # Tạo nhãn đường dẫn: Điều X, Khoản Y...
            path = []
            curr = fb.node
            while curr:
                path.insert(0, curr.node_label)
                curr = curr.parent
            
            data.append({
                "id": fb.id,
                "node_id": fb.node_id,
                "node_path": " > ".join(path),
                "contributing_agency": fb.contributing_agency or "Ẩn danh",
                "content": fb.content[:200] + ("..." if len(fb.content) > 200 else ""),
                "created_at": fb.created_at
            })
        return Response(data)

    @action(detail=True, methods=['get'], permission_classes=[])
    def export_report(self, request, pk=None):
        try:
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

            doc_obj = self.get_object()
            from feedbacks.models import Feedback
            from docx.shared import Pt, Cm
            from docx.enum.text import WD_ALIGN_PARAGRAPH
            from docx.enum.table import WD_TABLE_ALIGNMENT

            # ===== HELPERS =====
            def set_cell_text(cell, text, bold=False, size=12, align=None):
                cell.text = ""
                run = cell.paragraphs[0].add_run(str(text) if text else "")
                run.bold = bold
                run.font.size = Pt(size)
                run.font.name = 'Times New Roman'
                if align:
                    cell.paragraphs[0].alignment = align

            def add_para(doc, text, bold=False, italic=False, size=13, align=None, space_after=6):
                p = doc.add_paragraph()
                run = p.add_run(str(text) if text else "")
                run.bold = bold
                run.italic = italic
                run.font.size = Pt(size)
                run.font.name = 'Times New Roman'
                if align:
                    p.alignment = align
                p.paragraph_format.space_after = Pt(space_after)
                return p

            # ===== THU THẬP DỮ LIỆU =====
            all_nodes = DocumentNode.objects.filter(document=doc_obj).order_by('order_index')
            dieu_nodes = [n for n in all_nodes if n.node_type == 'Điều']

            drafting_agency = doc_obj.drafting_agency or "(Chưa cập nhật)"
            agency_location = doc_obj.agency_location or "Hà Nội"
            export_date = datetime.now().strftime('%d/%m/%Y')
            total_consulted = doc_obj.total_consulted_doc or 0
            total_feedbacks_doc = doc_obj.total_feedbacks_doc or 0
            actual_fb_count = Feedback.objects.filter(node__document=doc_obj).count()

            # ===== TẠO FILE WORD =====
            doc = docx.Document()
            section = doc.sections[0]
            section.page_width = Cm(21)
            section.page_height = Cm(29.7)
            section.left_margin = Cm(3)
            section.right_margin = Cm(2)
            section.top_margin = Cm(2)
            section.bottom_margin = Cm(2)

            # ========== BẢNG HEADER (2 cột, không viền) ==========
            header_table = doc.add_table(rows=2, cols=2)
            header_table.alignment = WD_TABLE_ALIGNMENT.CENTER
            # Loại bỏ viền
            from docx.oxml.ns import qn
            from docx.oxml import OxmlElement
            tbl = header_table._tbl
            tblPr = tbl.tblPr if tbl.tblPr is not None else OxmlElement('w:tblPr')
            borders = OxmlElement('w:tblBorders')
            for border_name in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
                border = OxmlElement(f'w:{border_name}')
                border.set(qn('w:val'), 'none')
                border.set(qn('w:sz'), '0')
                border.set(qn('w:space'), '0')
                border.set(qn('w:color'), 'auto')
                borders.append(border)
            tblPr.append(borders)

            # Row 0: Tên CQ (trái) | Quốc hiệu (phải)
            set_cell_text(header_table.rows[0].cells[0], drafting_agency.upper(), bold=True, size=13, align=WD_ALIGN_PARAGRAPH.CENTER)
            # Thêm dòng gạch ngang
            run_sep = header_table.rows[0].cells[0].paragraphs[0].add_run("\n-------")
            run_sep.font.size = Pt(13)
            run_sep.font.name = 'Times New Roman'

            cell_right = header_table.rows[0].cells[1]
            cell_right.text = ""
            p_r = cell_right.paragraphs[0]
            p_r.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run1 = p_r.add_run("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM")
            run1.bold = True
            run1.font.size = Pt(13)
            run1.font.name = 'Times New Roman'
            run2 = p_r.add_run("\nĐộc lập - Tự do - Hạnh phúc")
            run2.bold = True
            run2.font.size = Pt(13)
            run2.font.name = 'Times New Roman'
            run3 = p_r.add_run("\n---------------")
            run3.font.size = Pt(13)
            run3.font.name = 'Times New Roman'

            # Row 1: Trống (trái) | Ngày tháng (phải)
            header_table.rows[1].cells[0].text = ""
            set_cell_text(header_table.rows[1].cells[1], f"{agency_location}, ngày {export_date}", size=13, align=WD_ALIGN_PARAGRAPH.CENTER)
            header_table.rows[1].cells[1].paragraphs[0].runs[0].italic = True

            # ========== TIÊU ĐỀ ==========
            add_para(doc, "", size=6, space_after=6)  # Spacer
            title = add_para(doc,
                f"BẢN TỔNG HỢP Ý KIẾN, TIẾP THU, GIẢI TRÌNH\nÝ KIẾN GÓP Ý, PHẢN BIỆN XÃ HỘI ĐỐI VỚI\n{doc_obj.project_name}",
                bold=True, size=14, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=12)

            # ========== MÔ TẢ TỔNG QUAN ==========
            add_para(doc,
                "Căn cứ Luật Ban hành văn bản quy phạm pháp luật, "
                "cơ quan lập đề xuất chính sách/cơ quan chủ trì soạn thảo đã nghiên cứu, "
                "tiếp thu, giải trình ý kiến góp ý, phản biện xã hội "
                f"đối với hồ sơ chính sách {doc_obj.project_name}",
                size=13, space_after=6)

            add_para(doc,
                f"1. Tổng số {total_consulted} cơ quan, tổ chức, cá nhân đã gửi xin ý kiến, "
                f"tham vấn/góp ý, phản biện xã hội và tổng số {total_feedbacks_doc} ý kiến nhận được.",
                size=13, space_after=6)

            add_para(doc, "2. Kết quả cụ thể như sau:", bold=True, size=13, space_after=10)

            # ========== BẢNG CHÍNH (1 bảng duy nhất, 4 cột) ==========
            main_table = doc.add_table(rows=1, cols=4)
            main_table.style = 'Table Grid'
            main_table.alignment = WD_TABLE_ALIGNMENT.CENTER

            # Header Row
            col_headers = [
                'NHÓM VẤN ĐỀ / ĐIỀU / KHOẢN',
                'CHỦ THỂ GÓP Ý',
                'NỘI DUNG GÓP Ý',
                'Ý KIẾN TIẾP THU, GIẢI TRÌNH'
            ]
            for i, h in enumerate(col_headers):
                set_cell_text(main_table.rows[0].cells[i], h, bold=True, size=11, align=WD_ALIGN_PARAGRAPH.CENTER)

            # ========== FILL DỮ LIỆU VÀO BẢNG ==========
            detail_level = 'Điều khoản điểm'
            try:
                from core.models import SystemSetting
                setting = SystemSetting.objects.get(key='EXPORT_DETAIL_LEVEL')
                if setting.value:
                    detail_level = setting.value
            except Exception:
                pass

            node_dict = {n.id: n for n in all_nodes}

            def get_hierarchical_path(node):
                if node.node_type == 'Vấn đề khác':
                    return "Vấn đề khác"
                path = []
                current = node
                while current:
                    path.insert(0, current.node_label)
                    current = node_dict.get(current.parent_id)
                
                if detail_level == 'Điều':
                    return path[0] if len(path) > 0 else "Vấn đề khác"
                elif detail_level == 'Điều khoản':
                    return ", ".join(path[:2]) if len(path) > 0 else "Vấn đề khác"
                else:
                    return ", ".join(path)

            last_printed_path = None
            last_printed_node_id = None

            def add_node_rows(node):
                nonlocal last_printed_path, last_printed_node_id
                """Thêm rows cho một node và các feedbacks của nó vào main_table."""
                fbs = Feedback.objects.filter(node=node).prefetch_related('explanations')
                
                # Nếu không có góp ý, bỏ qua không đưa vào báo cáo
                if not fbs.exists():
                    return
                    
                path_text = get_hierarchical_path(node)
                
                for fb in fbs:
                    row = main_table.add_row()
                    # Cột 0: Điều/Khoản (chỉ hiện khi chuyển sang nhóm mới hoặc node mới)
                    if path_text != last_printed_path or node.id != last_printed_node_id:
                        set_cell_text(row.cells[0], path_text, size=11)
                        last_printed_path = path_text
                        last_printed_node_id = node.id
                    else:
                        row.cells[0].text = ""

                    # Cột 1: Chủ thể góp ý
                    set_cell_text(row.cells[1], fb.contributing_agency or "Ẩn danh", size=11)

                    # Cột 2: Nội dung góp ý
                    set_cell_text(row.cells[2], fb.content or "", size=11)

                    # Cột 3: Giải trình
                    explanations = fb.explanations.all()
                    if explanations.exists():
                        ex_text = "\n".join([f"- {ex.content}" for ex in explanations])
                    else:
                        ex_text = "(Chưa giải trình)"
                    set_cell_text(row.cells[3], ex_text, size=11)

            for dieu in dieu_nodes:
                add_node_rows(dieu)

                # Khoản
                khoan_nodes = [n for n in all_nodes if n.node_type == 'Khoản' and n.parent_id == dieu.id]
                for khoan in khoan_nodes:
                    add_node_rows(khoan)

                    # Điểm
                    diem_nodes = [n for n in all_nodes if n.node_type == 'Điểm' and n.parent_id == khoan.id]
                    for diem in diem_nodes:
                        add_node_rows(diem)
            
            van_de_khac_nodes = [n for n in all_nodes if n.node_type == 'Vấn đề khác']
            for vdk in van_de_khac_nodes:
                add_node_rows(vdk)

            # ========== FOOTER ==========
            add_para(doc, "", size=6, space_after=10)
            add_para(doc, "THỦ TRƯỞNG CƠ QUAN CHỦ TRÌ SOẠN THẢO", bold=True, size=13, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=4)
            add_para(doc, "(Ký tên, đóng dấu)", italic=True, size=12, align=WD_ALIGN_PARAGRAPH.CENTER)

            # ===== LƯU VÀ TRẢ VỀ =====
            output_name = f"Bao_cao_tong_hop_{doc_obj.id}.docx"

            buffer = io.BytesIO()
            doc.save(buffer)
            buffer.seek(0)
            file_data = buffer.getvalue()

            response = HttpResponse(
                file_data,
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
            response['Content-Disposition'] = f'attachment; filename="{output_name}"'
            response['Content-Length'] = str(len(file_data))
            response['Access-Control-Expose-Headers'] = 'Content-Disposition'
            return response
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return Response({"error": f"Lỗi trong quá trình xuất báo cáo: {str(e)}"}, status=500)
