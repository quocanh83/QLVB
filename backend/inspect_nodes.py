import os
import sys
import django

# This script must be run from the 'backend' directory
sys.path.append(os.getcwd())
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
    if not apps.exists():
        print("No DocumentAppendix entries.")
    for a in apps:
        print(f"ID: {a.id}, Name: '{a.name}'")
    
    print("\n[NODES (DocumentNode Table) - Type 'Phụ lục']")
    nodes = DocumentNode.objects.filter(document=doc, node_type='Phụ lục')
    if not nodes.exists():
        print("No DocumentNode entries with type 'Phụ lục'.")
    for n in nodes:
        print(f"ID: {n.id}, Label: '{n.node_label}'")
    
    print("\n[NODES (DocumentNode Table) - All Labels (First 30)]")
    all_nodes = DocumentNode.objects.filter(document=doc).order_by('order_index')[:30]
    for n in all_nodes:
        print(f"[{n.node_type}] Label: '{n.node_label}'")

if __name__ == "__main__":
    inspect_latest_document()
