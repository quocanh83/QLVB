import os
import django
import sys
import io

# Setup Django
sys.path.append(os.path.abspath(os.curdir))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from documents.models import Document
from feedbacks.models import Feedback
from feedbacks.utils.v2_template_generator import generate_from_v2_template

def debug_v2_export():
    print("--- BẮT ĐẦU DEBUG XUẤT BÁO CÁO V2 ---")
    doc_id = 3  # ID dự thảo người dùng đang làm
    try:
        document = Document.objects.get(id=doc_id)
        print(f"[Thông tin] Dự thảo: {document.project_name}")
        
        feedbacks = Feedback.objects.filter(document_id=doc_id).select_related('node').prefetch_related('explanations').order_by('node__order_index')
        print(f"[Thông tin] Ý kiến: {feedbacks.count()}")
        
        # Test with report_type='mau_10'
        print("[Thực thi] Đang gọi generate_from_v2_template...")
        file_stream = generate_from_v2_template(document, feedbacks, template_config={}, template_type='mau_10')
        
        output_path = "debug_output_v2.docx"
        with open(output_path, "wb") as f:
            f.write(file_stream.getbuffer())
        print(f"[Thành công] Đã lưu file debug V2 tại: {os.path.abspath(output_path)}")
        
        # Kiểm tra tính hợp lệ
        import docx
        doc = docx.Document(output_path)
        print(f"[Kết quả] File hợp lệ, số đoạn văn: {len(doc.paragraphs)}")
        
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_v2_export()
