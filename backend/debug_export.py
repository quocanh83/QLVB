import os
import django
import io
import traceback
from datetime import datetime

# Thiết lập môi trường Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from documents.models import Document
from feedbacks.models import Feedback
from feedbacks.utils.mau10_generator import generate_mau_10
import docx

def debug_export():
    print("--- BẮT ĐẦU DEBUG XUẤT BÁO CÁO ---")
    
    # 1. Lấy dữ liệu mẫu (Dự thảo đầu tiên)
    doc_obj = Document.objects.first()
    if not doc_obj:
        print("[Lỗi] Không tìm thấy dự thảo nào trong DB.")
        return

    print(f"[Thông tin] Đang thử xuất báo cáo cho Dự thảo: {doc_obj.project_name} (ID: {doc_obj.id})")

    # 2. Lấy feedbacks
    feedbacks = Feedback.objects.filter(document_id=doc_obj.id).select_related('node').prefetch_related('explanations').order_by('node__order_index')
    print(f"[Thông tin] Số lượng ý kiến góp ý: {feedbacks.count()}")

    # 3. Lấy cấu hình từ DB (giống logic trong views.py)
    template_config = None
    try:
        from reports.models import ReportTemplate
        tpl = ReportTemplate.objects.filter(template_type='mau_10', is_active=True).first()
        if tpl:
            print(f"[Thông tin] Đang dùng cấu hình mẫu: {tpl.name}")
            enabled_fields = tpl.field_configs.filter(is_enabled=True).order_by('column_order')
            if enabled_fields.exists():
                template_config = {
                    'header_org_name': tpl.header_org_name,
                    'header_org_location': tpl.header_org_location,
                    'footer_signer_name': tpl.footer_signer_name,
                    'footer_signer_title': tpl.footer_signer_title,
                    'fields': [
                        {
                            'field_key': f.field_key,
                            'field_label': f.field_label,
                            'column_width_cm': f.column_width_cm,
                        }
                        for f in enabled_fields
                    ]
                }
    except Exception as e_cfg:
        print(f"[Cảnh báo] Lỗi khi load cấu hình, dùng mặc định: {e_cfg}")

    # 4. Thử chạy Generator
    try:
        print("[Thực thi] Đang gọi generate_mau_10 với template_config...")
        file_stream = generate_mau_10(doc_obj, feedbacks, template_config=template_config)
        
        # 5. Lưu ra file để kiểm tra
        output_path = "debug_output_mau_10_v2.docx"
        with open(output_path, "wb") as f:
            f.write(file_stream.getbuffer())
        print(f"[Thành công] Đã lưu file debug v2 tại: {os.path.abspath(output_path)}")

        # 5. Kiểm tra tính hợp lệ của file vừa tạo bằng chính thư viện docx
        try:
            print("[Kiểm tra] Thử mở lại file bằng python-docx để check lỗi XML...")
            docx.Document(output_path)
            print("[Kết quả] File hợp lệ, python-docx có thể đọc được.")
        except Exception as e_xml:
            print(f"[Lỗi] File vừa tạo bị hỏng cấu trúc XML: {str(e_xml)}")
            
    except Exception as e:
        print("[Lỗi] Quá trình generate thất bại!")
        print(traceback.format_exc())

if __name__ == "__main__":
    debug_export()
