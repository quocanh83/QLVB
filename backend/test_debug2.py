import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from documents.models import DocumentNode
doc_id = DocumentNode.objects.filter(node_label__icontains='VII').first().document_id
from feedbacks.views import FeedbackViewSet
v = FeedbackViewSet()
class MockReq: query_params = {'document_id': doc_id}
r = v.get_document_nodes(MockReq())
print([x for x in r.data if 'VII' in x['label']])
