import os
import sys
import django

# Setup Django environment
backend_path = r'c:\Users\Quoc Anh\Desktop\QLVB\backend'
if backend_path not in sys.path:
    sys.path.append(backend_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from documents.models import Document, DocumentNode, DocumentAppendix

def inspect_latest_document():
    doc = Document.objects.order_by('-created_at').first()
    if not doc:
        print("No documents found.")
        return

    print(f"--- Inspecting Document: {doc.project_name} (ID: {doc.id}) ---")
    
    print("\n[APPENDICES (DocumentAppendix Table)]")
    apps = DocumentAppendix.objects.filter(document=doc)
    for a in apps:
        print(f"ID: {a.id}, Name: '{a.name}'")
    
    print("\n[NODES (DocumentNode Table) - Potential Appendices]")
    nodes = DocumentNode.objects.filter(document=doc, node_type='Phụ lục')
    for n in nodes:
        print(f"ID: {n.id}, Label: '{n.node_label}', Type: {n.node_type}")
    
    print("\n[NODES (DocumentNode Table) - First 20 Nodes]")
    nodes = DocumentNode.objects.filter(document=doc).order_by('order_index')[:20]
    for n in nodes:
        print(f"ID: {n.id}, Label: '{n.node_label}', Type: {n.node_type}")

if __name__ == "__main__":
    inspect_latest_document()
