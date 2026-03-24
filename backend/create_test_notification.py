import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Notification
from accounts.models import User
from documents.models import Document

user = User.objects.filter(is_superuser=True).first()
if not user:
    user = User.objects.first()

doc = Document.objects.first()

if user and doc:
    Notification.objects.create(
        recipient=user,
        message=f'TEST: Góp ý mới cho dự thảo "{doc.project_name}"',
        link=f'/vibe-dashboard?docId={doc.id}'
    )
    print(f"Created notification for user: {user.username}, doc: {doc.project_name}")
else:
    print("Could not find user or document to create notification")
