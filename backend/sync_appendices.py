from documents.models import Document, DocumentNode, DocumentAppendix

def sync_appendices_to_nodes():
    appendices = DocumentAppendix.objects.all()
    created_count = 0
    for app in appendices:
        # Kiểm tra xem đã có node Phụ lục nào cho document này với tên tương đương chưa
        exists = DocumentNode.objects.filter(
            document=app.document,
            node_type='Phụ lục',
            node_label=app.name
        ).exists()
        
        if not exists:
            # Tạo node mới để có thể phân công
            DocumentNode.objects.create(
                document=app.document,
                node_type='Phụ lục',
                node_label=app.name,
                content=app.content or "",
                order_index=9000 + app.id # Đặt ở cuối danh sách
            )
            created_count += 1
            print(f"Created node for appendix: {app.name}")
    
    print(f"Sync complete. Created {created_count} nodes.")

if __name__ == "__main__":
    sync_appendices_to_nodes()
