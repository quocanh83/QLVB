import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from feedbacks.views import FeedbackViewSet
from documents.models import DocumentNode
v = FeedbackViewSet()
ddoc = DocumentNode.objects.filter(node_label__icontains='VII').first()
print(v._find_best_node_match(ddoc.document_id, 'Phụ lục VII'))
