import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from documents.models import DocumentNode
doc_id = DocumentNode.objects.filter(node_label__icontains='VII').first().document_id
from feedbacks.views import FeedbackViewSet
v = FeedbackViewSet()
print(v._find_best_node_match(doc_id, 'Phụ lục VII').id if v._find_best_node_match(doc_id, 'Phụ lục VII') else 'NONE')
print(v._find_best_node_match(doc_id, 'Phụ lục VII. - abc').id if v._find_best_node_match(doc_id, 'Phụ lục VII. - abc') else 'NONE')
print(v._find_best_node_match(doc_id, 'Điều khoản / Phụ lục VII').id if v._find_best_node_match(doc_id, 'Điều khoản / Phụ lục VII') else 'NONE')
