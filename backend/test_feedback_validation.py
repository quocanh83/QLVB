import os
import django
import sys

# Set up Django
sys.path.append(r'c:\Users\quoca\OneDrive\Desktop\QLVB\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from feedbacks.models import Feedback
from documents.models import Document, DocumentNode, DocumentAppendix
from accounts.models import User
from core.models import Agency
from feedbacks.serializers import FeedbackSerializer

def test_feedback_creation():
    user = User.objects.first()
    doc = Document.objects.first()
    node = DocumentNode.objects.filter(document=doc).first()
    appendix = DocumentAppendix.objects.filter(document=doc).first()
    agency = Agency.objects.first()

    print(f"Testing with User: {user.username}, Doc: {doc.project_name}")
    
    # Test Node Feedback
    data_node = {
        'document': doc.id,
        'node': node.id,
        'user': user.id,
        'content': 'Test node feedback',
        'agency': agency.id if agency else None,
        'contributing_agency': agency.name if agency else 'Test Agency'
    }
    serializer = FeedbackSerializer(data=data_node)
    if serializer.is_valid():
        print("Node Feedback Serializer valid")
    else:
        print(f"Node Feedback Serializer INVALID: {serializer.errors}")

    # Test Appendix Feedback
    data_app = {
        'document': doc.id,
        'appendix': appendix.id if appendix else None,
        'user': user.id,
        'content': 'Test appendix feedback',
        'agency': agency.id if agency else None,
        'contributing_agency': agency.name if agency else 'Test Agency'
    }
    serializer = FeedbackSerializer(data=data_app)
    if serializer.is_valid():
        print("Appendix Feedback Serializer valid")
    else:
        print(f"Appendix Feedback Serializer INVALID: {serializer.errors}")

if __name__ == "__main__":
    test_feedback_creation()
