import os
import django
import sys

# Đảm bảo nhận đúng project root
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
sys.path.insert(0, project_root)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from documents.models import Document, DocumentNode

def add_chung_node_to_all():
    docs = Document.objects.all()
    count = 0
    print(f"Bắt đầu quét {docs.count()} dự thảo...")
    
    for doc in docs:
        # Kiểm tra xem đã có node "Chung" chưa
        exists = DocumentNode.objects.filter(document=doc, node_label='Chung').exists()
        if not exists:
            DocumentNode.objects.create(
                document=doc,
                node_type='Vấn đề khác',
                node_label='Chung',
                content='',
                order_index=-1
            )
            print(f" - Đã thêm node 'Chung' cho dự thảo ID {doc.id}: {doc.project_name}")
            count += 1
        else:
            print(f" - Dự thảo ID {doc.id} đã có node 'Chung'. Bỏ qua.")
            
    print(f"Hoàn tất. Đã bổ sung cho {count} dự thảo.")

if __name__ == "__main__":
    add_chung_node_to_all()
