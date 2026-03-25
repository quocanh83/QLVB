"""
Generator Mẫu Báo cáo V2 — Sử dụng file template_bao_cao_V2_fixed.docx
Phương pháp: docxtpl (Jinja2-style rendering trực tiếp vào file Word)

Placeholder trong template:
  Paragraphs:
    {{ document_title }}   — Tên dự thảo
    {{ total_consulted }}  — Số cơ quan gửi ý kiến
    {{ total_feedbacks }}  — Tổng số ý kiến
  Table[0]:
    {{ drafting_agency }}  — Cơ quan chủ trì soạn thảo
    {{ agency_location }}  — Địa điểm (Hà Nội)
    {{ export_date }}      — Ngày xuất báo cáo (dạng "ngày dd tháng mm năm yyyy")
  Table[1] (bảng nội dung - lặp):
    {% for d in dieu_list %}
      d.node_label, d.content
      {% for fb in d.feedbacks %}
        fb.user_name, fb.content
        {% for ex in fb.explanations %}
          ex.content
        {% endfor %}
      {% endfor %}
    {% endfor %}
"""

import io
import os
from datetime import datetime
from docxtpl import DocxTemplate

# Đường dẫn mặc định đến file template
# Đường dẫn mặc định đến các file template
DEFAULT_MAU10_PATH = os.path.join(os.path.dirname(__file__), 'template_bao_cao_V2_fixed.docx')
DEFAULT_CUSTOM_PATH = os.path.join(os.path.dirname(__file__), 'template_truong_tu_chinh_v3.docx')



def _get_template_path(template_type='mau_10'):
    """
    Trả về đường dẫn file template:
    - Ưu tiên 1: File đã upload trong DB (ReportTemplate.file_path)
    - Ưu tiên 2: File mặc định trong source code (V3 cho custom, V2 cho mau10)
    """
    try:
        from reports.models import ReportTemplate as RT
        tpl = RT.objects.filter(template_type=template_type, is_active=True).first()
        if tpl and tpl.file_path:
            import os as _os
            path = tpl.file_path.path
            if _os.path.exists(path):
                return path
    except Exception:
        pass
    
    if template_type == 'custom':
        return DEFAULT_CUSTOM_PATH
    return DEFAULT_MAU10_PATH


def _build_dieu_list(feedbacks):
    """
    Nhóm feedbacks theo node (Điều/Khoản) để render vào vòng lặp dieu_list.
    Mỗi phần tử dieu_list là:
      {
        'node_label': str,
        'content': str,
        'feedbacks': [
          {
            'user_name': str,
            'content': str,
            'explanations': [{'content': str}, ...]
          }, ...
        ]
      }
    """
    nodes_map = {}
    node_order = []

    for i, fb in enumerate(feedbacks, 1):
        node_key = None
        node_label = ''
        node_content = ''

        if fb.node:
            node_key = fb.node.id
            node_label = fb.node.node_label or ''
            # Thêm cả parent node label nếu có
            if fb.node.parent:
                node_label = f"{fb.node.parent.node_label}, {node_label}"
            node_content = (fb.node.content or '')[:300]
        else:
            node_key = '__no_node__'
            node_label = 'Ý kiến chung'
            node_content = ''

        if node_key not in nodes_map:
            nodes_map[node_key] = {
                'node_label': node_label,
                'content': node_content,
                'feedbacks': []
            }
            node_order.append(node_key)

        # Lấy danh sách giải trình và Chuyên viên
        explanations_list = []
        chuyen_vien = ''
        if hasattr(fb, 'explanations'):
            for ex in fb.explanations.all():
                explanations_list.append({
                    'content': ex.content or ''
                })
                if not chuyen_vien and ex.user:
                    chuyen_vien = ex.user.username or ex.user.first_name

        # Lấy tên cơ quan góp ý
        user_name = fb.contributing_agency or ''
        if not user_name and hasattr(fb, 'agency') and fb.agency:
            user_name = fb.agency.name

        # Map status sang TV
        status_map = {'pending': 'Chưa xử lý', 'reviewed': 'Đã giải trình', 'approved': 'Đã duyệt'}
        status_tv = status_map.get(fb.status, fb.status)

        explanation_str = "\n".join([f"- {ex['content']}" for ex in explanations_list])

        
        nodes_map[node_key]['feedbacks'].append({
            'stt': len(nodes_map[node_key]['feedbacks']) + 1, # STT trong tung Điều
            'stt_global': i, # STT tong the
            'user_name': user_name,
            'content': fb.content or '',
            'status': status_tv,
            'chuyen_vien': chuyen_vien or (fb.user.username if fb.user else ''),
            'time': fb.created_at.strftime("%d/%m/%Y") if fb.created_at else '',
            'explanation_str': explanation_str,
            'explanations': explanations_list
        })


        # Da bo doan code lap tai day


    return [nodes_map[k] for k in node_order]


def generate_from_v2_template(document, feedbacks, template_config=None, template_type='mau_10'):
    """
    Sinh file Word từ template V2 sử dụng docxtpl.

    Thứ tự ưu tiên cho drafting_agency:
      1. document.drafting_agency (cài đặt lúc nạp dự thảo)
      2. template_config['header_org_name'] (cài đặt admin trong Mẫu chuẩn)
      3. Giá trị mặc định

    Args:
        document: Document model instance
        feedbacks: QuerySet feedback đã filter
        template_config: dict cấu hình admin (tuỳ chọn)
        template_type: 'mau_10' (ngang) hoặc 'custom' (dọc)
            {
                'header_org_name': str,
                'header_org_location': str,
                'footer_signer_name': str,
                'footer_signer_title': str
            }

    Returns:
        io.BytesIO: file Word đã render
    """
    cfg = template_config or {}

    # Ưu tiên 1: Thông tin cơ quan từ Document model (nhập lúc tạo dự thảo)
    # Ưu tiên 2: Cài đặt admin trong tab Mẫu chuẩn  
    # Ưu tiên 3: Giá trị mặc định
    drafting_agency = (
        getattr(document, 'drafting_agency', None)
        or cfg.get('header_org_name')
        or 'CƠ QUAN CHỦ TRÌ SOẠN THẢO'
    )
    agency_location = (
        getattr(document, 'agency_location', None)
        or cfg.get('header_org_location')
        or 'Hà Nội'
    )

    # Số liệu tổng hợp
    total_feedbacks = len(feedbacks) if hasattr(feedbacks, '__len__') else feedbacks.count()

    # Số cơ quan (unique theo contributing_agency)
    agencies = set()
    for fb in feedbacks:
        if fb.contributing_agency:
            agencies.add(fb.contributing_agency)
        elif hasattr(fb, 'agency') and fb.agency:
            agencies.add(fb.agency.name)
    total_consulted = len(agencies) or total_feedbacks

    # Ngày xuất — Dạng đầy đủ tiếng Việt: "ngày 24 tháng 03 năm 2026"
    now = datetime.now()
    export_date = f"ngày {now.day:02d} tháng {now.month:02d} năm {now.year}"

    # Xây dựng dieu_list từ feedbacks
    dieu_list = _build_dieu_list(feedbacks)

    # Context cho Jinja2 template
    context = {
        'document_title': document.project_name or 'Dự thảo văn bản',
        'total_consulted': total_consulted,
        'total_feedbacks': total_feedbacks,
        'drafting_agency': drafting_agency,
        'agency_location': agency_location,
        'export_date': export_date,
        'dieu_list': dieu_list,
    }

    # Render và trả về BytesIO
    tpl = DocxTemplate(_get_template_path(template_type))
    tpl.render(context)

    file_stream = io.BytesIO()
    tpl.save(file_stream)
    file_stream.seek(0)
    return file_stream
