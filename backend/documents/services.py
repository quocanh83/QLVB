import re
from docx import Document as DocxDocument
from django.db import transaction
from .models import Document, DocumentNode

def parse_docx_to_nodes(file_path, document_id):
    """
    Đọc file Word và bóc tách thành Điều, Khoản, Điểm.
    Lưu vào bảng DocumentNode.
    Sử dụng transaction để an toàn dữ liệu.
    """
    doc = DocxDocument(file_path)
    
    # 1. Regex cho Cấp 1 (Điều): Bắt đầu bằng chữ "Điều" + Dấu cách + Số + Dấu chấm, phẩy hoặc khoảng trắng
    # VD: "Điều 1.", "Điều 2 "
    re_dieu = re.compile(r'^Điều\s+(\d+)[.,:;]?\s*(.*)', re.IGNORECASE)
    
    # 2. Regex cho Cấp 2 (Khoản): Bắt đầu bằng Số + Dấu chấm + Dấu cách
    # VD: "1. ", "2. "
    re_khoan = re.compile(r'^(\d+)\.\s+(.*)')
    
    # 3. Regex cho Cấp 3 (Điểm): Bắt đầu bằng Chữ cái thường + Dấu đóng ngoặc
    # VD: "a) ", "đ) " (bao gồm cả ký tự tiếng Việt đ, ê, ...)
    re_diem = re.compile(r'^([a-zđêăâôơư]+)\)\s+(.*)', re.IGNORECASE)
    
    results = {
        'dieu_count': 0,
        'khoan_count': 0,
        'diem_count': 0,
        'unrecognized_paragraphs': []
    }
    
    current_dieu = None
    current_khoan = None
    
    with transaction.atomic():
        document_obj = Document.objects.get(id=document_id)
        
        # Xóa các node cũ nếu re-parse
        DocumentNode.objects.filter(document=document_obj).delete()
        
        order_idx = 0
        
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
                
            match_dieu = re_dieu.match(text)
            match_khoan = re_khoan.match(text)
            match_diem = re_diem.match(text)
            
            if match_dieu:
                # Tìm thấy Cấp 1 (Điều)
                num = match_dieu.group(1)
                label = f"Điều {num}"
                
                node = DocumentNode.objects.create(
                    document=document_obj,
                    parent=None,
                    node_type='Điều',
                    node_label=label,
                    content=text,
                    order_index=order_idx
                )
                current_dieu = node
                current_khoan = None # Reset khoản
                results['dieu_count'] += 1
                
            elif match_khoan:
                # Tìm thấy Cấp 2 (Khoản)
                num = match_khoan.group(1)
                label = f"Khoản {num}"
                
                # Khoản phải nằm trong Điều, nếu không có Điều thì gán parent=None
                parent_node = current_dieu
                
                node = DocumentNode.objects.create(
                    document=document_obj,
                    parent=parent_node,
                    node_type='Khoản',
                    node_label=label,
                    content=text,
                    order_index=order_idx
                )
                current_khoan = node
                results['khoan_count'] += 1
                
            elif match_diem:
                # Tìm thấy Cấp 3 (Điểm)
                letter = match_diem.group(1)
                label = f"Điểm {letter}"
                
                # Điểm có thể nằm trong Khoản hoặc Điều
                parent_node = current_khoan if current_khoan else current_dieu
                
                node = DocumentNode.objects.create(
                    document=document_obj,
                    parent=parent_node,
                    node_type='Điểm',
                    node_label=label,
                    content=text,
                    order_index=order_idx
                )
                results['diem_count'] += 1
                
            else:
                # Không nhận diện được cấu trúc, lưu lại để báo cáo
                results['unrecognized_paragraphs'].append(text)
                
            order_idx += 1
            
    return results
