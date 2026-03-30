from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Feedback, Explanation, ActionLog, ConsultationResponse
from documents.models import DocumentNode
from django.contrib.contenttypes.models import ContentType
from .serializers import FeedbackSerializer, ConsultationResponseSerializer
import docx
import re
import os
from openai import OpenAI
from django.http import FileResponse
from .utils.mau10_generator import generate_mau_10
from .utils.v2_template_generator import generate_from_v2_template
from django.core.files.storage import FileSystemStorage
from django.conf import settings
import shutil
from django.utils.text import get_valid_filename
import traceback

class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action == 'export_mau_10':
            return [permissions.AllowAny()]
        return super().get_permissions()

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
            if not document_id: return False
            doc = Document.objects.get(id=document_id)
            if doc.lead == user: return True
        except (Document.DoesNotExist, ValueError, TypeError):
            pass

        # 3. Chuyên viên Role?
        return user.roles.filter(role_name__in=['Contributor', 'Explainer']).exists()
        
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

    @action(detail=False, methods=['post'])
    def ocr_parse(self, request):
        """
        Xử lý OCR cho file Ảnh/PDF, trả về văn bản đã qua AI sửa lỗi và highlight diff.
        """
        try:
            document_id = request.data.get('document_id')
            if not self._check_permission(request, document_id, 'Chuyên viên Góp ý'):
                return Response({"error": "Bạn không có quyền hoặc ID văn bản không hợp lệ."}, status=403)
            
            file_obj = request.FILES.get('file')
            if not file_obj:
                return Response({"error": "Không tìm thấy tệp tin được tải lên."}, status=400)
                
            # Save temporary file
            fs = FileSystemStorage(location=os.path.join(settings.MEDIA_ROOT, 'uploads_ocr'))
            
            # Làm sạch tên file để tránh lỗi tiếng Việt/ký tự lạ trên Windows
            safe_name = get_valid_filename(file_obj.name)
            print(f"--- [OCR API] Đang lưu tệp tin: {safe_name} ---")
            filename = fs.save(safe_name, file_obj)
            file_path = fs.path(filename)
            
            from .utils.ocr_service import OCRService # Lazy load
            print(f"--- [OCR API] Bắt đầu xử lý AI cho {filename} (đợi nạp bộ não)... ---")
            
            selected_pages = request.data.get('selected_pages') # VD: "2, 4" hoặc "1-3, 5"
            
            service = OCRService()
            ocr_results = service.process_file(file_path, target_pages=selected_pages)
            print(f"--- [OCR API] Bóc tách hoàn tất {len(ocr_results)} trang. ---")
            
            # Clean up raw upload if desired, or keep for audit
            # os.remove(file_path) 
            
            return Response({
                "pages": ocr_results
            })
        except Exception as e:
            import traceback
            with open('error_log_ocr.txt', 'w', encoding='utf-8') as f:
                traceback.print_exc(file=f)
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=['post'])
    def get_pdf_info(self, request):
        """
        Lấy thông tin số trang và tạo thumbnails cho file PDF/Ảnh.
        """
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file"}, status=400)
            
        fs = FileSystemStorage(location=os.path.join(settings.MEDIA_ROOT, 'temp_previews'))
        filename = fs.save(get_valid_filename(file_obj.name), file_obj)
        file_path = fs.path(filename)
        ext = os.path.splitext(file_path)[1].lower()
        
        previews = []
        total_pages = 0
        
        import fitz
        try:
            if ext == '.pdf':
                doc = fitz.open(file_path)
                total_pages = len(doc)
                # Chỉ tạo thumbnail cho tất cả các trang
                for i in range(total_pages):
                    page = doc.load_page(i)
                    # Tạo ảnh nhỏ (thumbnail)
                    pix = page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5)) 
                    img_name = f"thumb_{os.urandom(4).hex()}_{i}.jpg"
                    img_p = os.path.join(fs.location, img_name)
                    pix.save(img_p)
                    rel_p = os.path.relpath(img_p, settings.MEDIA_ROOT).replace('\\', '/')
                    previews.append(settings.MEDIA_URL + rel_p)
                doc.close()
            else:
                total_pages = 1
                rel_p = os.path.relpath(file_path, settings.MEDIA_ROOT).replace('\\', '/')
                previews.append(settings.MEDIA_URL + rel_p)
                
            return Response({
                "total_pages": total_pages,
                "previews": previews,
                "temp_file_path": filename # Để frontend dùng lại nếu cần (tuy nhiên hiện tại vẫn upload lại ocr_parse cho đơn giản)
            })
        except Exception as e:
            return Response({"error": str(e)}, status=500)
        finally:
            # Lưu ý: Không xóa file ở đây vì preview cần URL. 
            # Hệ thống nên có job dọn dẹp temp định kỳ.
            pass

    @action(detail=False, methods=['post'])
    def ocr_finalize_parse(self, request):
        """
        Giai đoạn cuối: biến văn bản sau OCR thành danh sách góp ý có cấu trúc.
        """
        document_id = request.data.get('document_id')
        text = request.data.get('text', '')
        
        if not text:
            return Response({"error": "Văn bản trống"}, status=400)
            
        from .utils.ai_parser import AIParser
        parser = AIParser()
        raw_feedbacks = parser.parse_text_to_feedbacks(text)
        
        if not raw_feedbacks:
            return Response({"error": "Không thể phân tích văn bản này bằng AI."}, status=500)
            
        # Làm sạch và khớp NodeID
        results = []
        for i, f in enumerate(raw_feedbacks):
            node_label = f.get('node_label', 'Chung')
            content = f.get('content', '')
            agency = f.get('agency', '')
            
            # Sử dụng logic khớp thông minh của hệ thống
            suggested_node = self._find_best_node_match(document_id, node_label)
            
            results.append({
                "key": f"ocr-finalize-{i}-{os.urandom(4).hex()}",
                "node_label": suggested_node.node_label if suggested_node else node_label,
                "node_id": suggested_node.id if suggested_node else None,
                "contributing_agency": agency or "",
                "content": content
            })
            
        return Response({
            "feedbacks": results
        })

    @action(detail=False, methods=['get'])
    def get_document_nodes(self, request):
        """Lấy danh sách node để phục vụ mapping ở frontend với nhãn đầy đủ"""
        doc_id = request.query_params.get('document_id')
        if not doc_id: return Response([])
        nodes = DocumentNode.objects.filter(document_id=doc_id).select_related('parent', 'parent__parent').order_by('order_index')
        
        results = []
        for n in nodes:
            # Tạo nhãn phân tầng: Điều 1 > Khoản 2 > Điểm a
            path_parts = []
            curr = n
            while curr:
                if curr.node_type != 'Văn bản':
                    path_parts.insert(0, curr.node_label)
                curr = curr.parent
            
            results.append({
                "id": n.id, 
                "label": " > ".join(path_parts) if path_parts else n.node_label, 
                "type": n.node_type
            })
        return Response(results)

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

        # Tìm node làm fallback (Ưu tiên nhãn "Chung")
        fallback_node = DocumentNode.objects.filter(document_id=document_id, node_label='Chung').first()
        if not fallback_node:
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
                # Ưu tiên lấy cơ quan góp ý và số công văn từ metadata (chung cho cả lần nhập)
                global_agency = metadata.get('contributing_agency')
                global_agency_id = metadata.get('agency_id')
                global_doc_number = metadata.get('official_doc_number')

                Feedback.objects.create(
                    document_id=document_id,
                    node=target_node,
                    user=request.user,
                    contributing_agency=global_agency or item.get('contributing_agency', ''),
                    agency_id=global_agency_id or item.get('agency_id'),
                    official_doc_number=global_doc_number or item.get('official_doc_number', ''),
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
            fb = Feedback.objects.filter(id=object_id).first()
            if fb:
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

    @action(detail=False, methods=['post'])
    def delete_explanation(self, request):
        document_id = request.data.get('document_id')
        if not self._check_permission(request, document_id, 'Chuyên viên Giải trình'):
            return Response({"error": "Bạn không có quyền Xóa giải trình cho dự thảo này."}, status=403)
            
        target_type = request.data.get('target_type')
        object_id = request.data.get('object_id')
        
        if target_type == 'Feedback':
            content_type = ContentType.objects.get_for_model(Feedback)
        else:
            content_type = ContentType.objects.get_for_model(DocumentNode)
            
        deleted_count, _ = Explanation.objects.filter(
            target_type=target_type,
            content_type=content_type,
            object_id=object_id
        ).delete()
        
        if target_type == 'Feedback' and deleted_count > 0:
            fb = Feedback.objects.filter(id=object_id).first()
            if fb:
                fb.status = 'pending'
                fb.save()
                ActionLog.objects.create(
                    user=request.user,
                    feedback=fb,
                    action="Xóa giải trình",
                    details="Chuyên viên đã xóa nội dung giải trình."
                )
            
        return Response({"message": "Đã xóa giải trình thành công."})

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
    def by_document(self, request):
        """Lấy toàn bộ góp ý của một dự thảo"""
        doc_id = request.query_params.get('document_id')
        if not doc_id: return Response({"error": "document_id is required"}, status=400)
        
        feedbacks = Feedback.objects.filter(document_id=doc_id)\
            .select_related('node', 'agency')\
            .prefetch_related('explanations')\
            .order_by('node__order_index', 'created_at')
        
        results = []
        for i, fb in enumerate(feedbacks, 1):
            path = []
            curr = fb.node
            while curr:
                path.insert(0, curr.node_label)
                curr = curr.parent
            
            explanation_obj = fb.explanations.first()
            
            results.append({
                "stt": i,
                "id": fb.id,
                "node_id": fb.node_id,
                "node_label": fb.node.node_label if fb.node else "Vấn đề khác",
                "node_path": ", ".join(path),
                "contributing_agency": fb.contributing_agency or (fb.agency.name if fb.agency else "Ẩn danh"),
                "content": fb.content,
                "explanation": explanation_obj.content if explanation_obj else "",
                "status": fb.status,
                "created_at": fb.created_at.isoformat(),
            })
        return Response(results)

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
                    "created_at": fb.created_at.isoformat(),
                    "logs": [
                        {
                            "username": log.user.username,
                            "action": log.action,
                            "time": log.created_at.isoformat(),
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
            
        # Group by the unified display name: contributing_agency
        # contributing_agency is now synced with agency.name in the model's save() method.
        stats_qs = queryset.filter(
            Q(agency__isnull=False) | Q(contributing_agency__isnull=False)
        ).values('contributing_agency', 'agency__name', 'agency__category').annotate(
            total_feedbacks=Count('id', distinct=True),
            resolved_count=Count('explanations', distinct=True)
        ).order_by('-total_feedbacks')
        
        agency_data_map = {}
        category_counts = {}
        
        for item in stats_qs:
            raw_name = item['contributing_agency'] or item['agency__name']
            if not raw_name: continue
            
            import unicodedata
            norm_name = unicodedata.normalize('NFC', raw_name).strip().lower()
            category = item['agency__category'] or 'other'
            
            # Aggregate by category (keep original SQL behavior for category charts)
            if category not in category_counts:
                category_counts[category] = 0
            category_counts[category] += item['total_feedbacks']
            
            # Merge by normalized agency name in Python
            if norm_name not in agency_data_map:
                # Store the most "standard" name (prefer first one or latest)
                agency_data_map[norm_name] = {
                    "display_name": raw_name.strip(), 
                    "category": category,
                    "total": 0,
                    "resolved": 0
                }
            
            # Pick non-other category if available for this specific agency name
            if category != 'other':
                agency_data_map[norm_name]['category'] = category
                
            agency_data_map[norm_name]['total'] += item['total_feedbacks']
            agency_data_map[norm_name]['resolved'] += item['resolved_count']

        agency_results = []
        for norm, data in agency_data_map.items():
            total = data['total']
            resolved = data['resolved']
            agency_results.append({
                "agency": data['display_name'],
                "category": data['category'],
                "total": total,
                "resolved": resolved,
                "resolve_rate": round(resolved / total * 100, 1) if total > 0 else 0
            })
            
        # Re-sort by total
        agency_results.sort(key=lambda x: x['total'], reverse=True)
            
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
        specialist = request.query_params.get('specialist')
        report_type = request.query_params.get('report_type', 'mau10')
        
        if not doc_id: return Response([])
        
        feedbacks = Feedback.objects.filter(document_id=doc_id).select_related('node', 'agency').prefetch_related('explanations', 'user').order_by('node__order_index')
        
        if agency and agency != 'all':
            import unicodedata
            norm_target = unicodedata.normalize('NFC', agency).strip().lower()
            feedbacks = [
                fb for fb in feedbacks 
                if (fb.contributing_agency and unicodedata.normalize('NFC', fb.contributing_agency).strip().lower() == norm_target) or
                (fb.agency and unicodedata.normalize('NFC', fb.agency.name).strip().lower() == norm_target)
            ]
            
        if status_filter == 'resolved':
            if isinstance(feedbacks, list):
                feedbacks = [fb for fb in feedbacks if fb.explanations.exists()]
            else:
                feedbacks = feedbacks.filter(explanations__isnull=False).distinct()
        elif status_filter == 'unresolved':
            if isinstance(feedbacks, list):
                feedbacks = [fb for fb in feedbacks if not fb.explanations.exists()]
            else:
                feedbacks = feedbacks.filter(explanations__isnull=True).distinct()

        if specialist and specialist != 'all':
            if specialist == 'none':
                if isinstance(feedbacks, list):
                    feedbacks = [fb for fb in feedbacks if not any(ex.user for ex in fb.explanations.all())]
                else:
                    feedbacks = feedbacks.filter(explanations__user__isnull=True)
            else:
                if isinstance(feedbacks, list):
                    feedbacks = [fb for fb in feedbacks if any(str(ex.user_id) == str(specialist) for ex in fb.explanations.all())]
                else:
                    feedbacks = feedbacks.filter(explanations__user_id=specialist)
            
        # Lay cau hinh truong tu template
        from reports.models import ReportTemplate
        template = ReportTemplate.objects.filter(template_type=report_type, is_active=True).first()
        fields = []
        if template:
            fields = template.field_configs.filter(is_enabled=True).order_by('column_order')

        from .utils.mau10_generator import _get_field_value
        
        results = []
        for i, fb in enumerate(feedbacks, 1):
            explanation = fb.explanations.first()
            if fields:
                row = { f.field_key: _get_field_value(f.field_key, i, fb, explanation) for f in fields }
            else:
                # Fallback mac dinh
                dieu_khoan = f"{fb.node.node_label}" if fb.node else ""
                if fb.node and fb.node.parent:
                    dieu_khoan = f"{fb.node.parent.node_label}, {fb.node.node_label}"
                row = {
                    "stt": i,
                    "dieu_khoan": dieu_khoan,
                    "co_quan": fb.contributing_agency or "Khác",
                    "noi_dung_gop_y": fb.content,
                    "noi_dung_giai_trinh": explanation.content if explanation else "",
                }
            results.append(row)
            
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
            feedbacks = Feedback.objects.filter(document_id=doc_id).select_related('node', 'agency').prefetch_related('explanations').order_by('node__order_index')
            
            if agency and agency != 'all':
                import unicodedata
                norm_target = unicodedata.normalize('NFC', agency).strip().lower()
                feedbacks = [
                    fb for fb in feedbacks 
                    if (fb.contributing_agency and unicodedata.normalize('NFC', fb.contributing_agency).strip().lower() == norm_target) or
                    (fb.agency and unicodedata.normalize('NFC', fb.agency.name).strip().lower() == norm_target)
                ]
                
            if status_filter == 'resolved':
                if isinstance(feedbacks, list):
                    feedbacks = [fb for fb in feedbacks if fb.explanations.exists()]
                else:
                    feedbacks = feedbacks.filter(explanations__isnull=False).distinct()
            elif status_filter == 'unresolved':
                if isinstance(feedbacks, list):
                    feedbacks = [fb for fb in feedbacks if not fb.explanations.exists()]
                else:
                    feedbacks = feedbacks.filter(explanations__isnull=True).distinct()
            
            if not feedbacks.exists():
                return Response({"error": "Không có ý kiến góp ý nào thỏa mãn bộ lọc để xuất báo cáo."}, status=404)
            
            # Sử dụng generator V2 với file template Word chuẩn
            # Đọc cấu hình admin từ DB (nếu có)
            # Phan nhanh theo loai bao cao (report_type param)
            report_type = request.query_params.get('report_type', 'mau10')
            
            # Doc cau hinh tu DB cho loai tuong ung
            template_config = {}
            tpl_db = None
            try:
                from reports.models import ReportTemplate, ReportFieldConfig
                tpl_db = ReportTemplate.objects.filter(template_type=report_type, is_active=True).first()
                if tpl_db:
                    fields_qs = tpl_db.field_configs.filter(is_enabled=True).order_by('column_order')
                    fields = [
                        {
                            'field_key': f.field_key,
                            'field_label': f.field_label,
                            'column_width_cm': f.column_width_cm
                        } for f in fields_qs
                    ]
                    template_config = {
                        'header_org_name': tpl_db.header_org_name,
                        'header_org_location': tpl_db.header_org_location,
                        'footer_signer_name': tpl_db.footer_signer_name,
                        'footer_signer_title': tpl_db.footer_signer_title,
                        'fields': fields
                    }
            except Exception as e:
                print(f"Error loading template config: {e}")

            from .utils.mau10_generator import generate_mau_10
            from .utils.v2_template_generator import generate_from_v2_template
            from django.http import FileResponse

            # Neu la mau custom -> Dung mau10_generator (vi no ho tro cot dong tot hon)
            # Neu la mau10 -> Dung v2_template_generator (vi no dung file word design san dep hon)
            if report_type == 'custom':
                file_stream = generate_mau_10(document, feedbacks, template_config=template_config)
            else:
                file_stream = generate_from_v2_template(document, feedbacks, template_config=template_config, template_type=report_type)
            
            filename = f"Bao_cao_{'Mau_10' if report_type=='mau10' else 'Tuy_chinh'}_{document.id}.docx"

            
            response = FileResponse(
                file_stream, 
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
            
        except Document.DoesNotExist:
            return Response({"error": "Văn bản không tồn tại"}, status=404)
        except Exception as e:
            return Response({"error": f"Lỗi xuất báo cáo: {str(e)}"}, status=500)

    @action(detail=True, methods=['post'])
    def reassign_node(self, request, pk=None):
        fb = self.get_object()
        new_node_id = request.data.get('node_id')
        if not new_node_id:
            return Response({"error": "node_id is required"}, status=400)
        
        try:
            from documents.models import DocumentNode
            new_node = DocumentNode.objects.get(id=new_node_id, document_id=fb.document_id)
            old_label = fb.node.node_label if fb.node else "N/A"
            fb.node = new_node
            fb.save()
            
            ActionLog.objects.create(
                user=request.user,
                feedback=fb,
                action="Gắn lại điều khoản",
                details=f"Chuyển từ '{old_label}' sang '{new_node.node_label}'"
            )
            
            return Response({"message": "Đã chuyển điều khoản thành công."})
        except DocumentNode.DoesNotExist:
            return Response({"error": "Điều khoản mới không hợp lệ hoặc không thuộc dự thảo này."}, status=404)

class ConsultationResponseViewSet(viewsets.ModelViewSet):
    queryset = ConsultationResponse.objects.all()
    serializer_class = ConsultationResponseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        doc_id = self.request.query_params.get('document_id')
        if doc_id:
            return ConsultationResponse.objects.filter(document_id=doc_id).order_by('-created_at')
        return super().get_queryset()




