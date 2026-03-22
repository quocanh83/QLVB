import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from documents.models import Document, DocumentNode
from documents.services import parse_docx_to_nodes

def main():
    print("Xóa CSDL nếu đã có...")
    Document.objects.all().delete()
    DocumentNode.objects.all().delete()

    print("Tạo Document tạm thời...")
    doc_obj = Document.objects.create(
        title="Dự thảo test",
        description="Test parsing",
        status="Draft"
    )
    
    file_path = r"C:\Users\Quoc Anh\Desktop\QLVB\mau_du_thao.docx"
    print(f"\nBắt đầu bóc tách file: {file_path}")
    
    try:
        results = parse_docx_to_nodes(file_path, doc_obj.id)
        
        print("\n=== KẾT QUẢ BÓC TÁCH ===")
        print(f"- Số Điều: {results['dieu_count']}")
        print(f"- Số Khoản: {results['khoan_count']}")
        print(f"- Số Điểm: {results['diem_count']}")
        
        if results['unrecognized_paragraphs']:
            print("\n=== ĐOẠN VĂN BẢN TRÔI NỔI (K nhận diện được) ===")
            for idx, text in enumerate(results['unrecognized_paragraphs']):
                if text.strip() != "":
                    print(f"[{idx+1}] {text[:80]}...")
                if idx >= 9:
                    print("... và nhiều đoạn khác (bỏ qua in log)")
                    break
        
        print("\n=== CẤU TRÚC CÂY SƠ BỘ (15 nodes đầu) ===")
        nodes = DocumentNode.objects.filter(document=doc_obj).order_by('order_index')
        for node in nodes[:15]:
            indent = ""
            if node.node_type == 'Khoản':
                indent = "  + "
            elif node.node_type == 'Điểm':
                indent = "    - "
            print(f"{indent}[{node.node_type}] {node.node_label}: {node.content[:60]}...")
            
    except Exception as e:
        print(f"LỖI: {str(e)}")

if __name__ == "__main__":
    main()
