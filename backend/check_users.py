import sys
import os
import django

# Force UTF-8 output for Vietnamese characters
sys.stdout.reconfigure(encoding='utf-8')

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from accounts.models import User
from documents.models import DocumentNode, NodeAssignment

print("--- USER LIST ---")
for u in User.objects.all():
    print(f"ID: {u.id:3} | Username: {u.username:15} | Full Name: {u.full_name:30} | get_full_name: {u.get_full_name()}")

print("\n--- ASSIGNMENT LIST ---")
for a in NodeAssignment.objects.all():
    # Sử dụng .getattr để tránh lỗi nếu các quan hệ bị thiếu
    username = a.user.username if a.user else "Unknown"
    full_name = a.user.full_name if a.user else "Unknown"
    node_label = a.node.node_label if a.node else "Unknown"
    print(f"Node: {node_label:20} | User: {username:15} | Full Name (attr): {full_name:30}")
