import requests
import json

# Setup some constants
BASE_URL = "http://localhost:8000/api/feedbacks/"
# Assuming we have a valid token (I'll need to grab one from the environment or common test user)

# Let's try to find an appendix ID first
import os
import django
import sys
sys.path.append(r'c:\Users\quoca\OneDrive\Desktop\QLVB\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from documents.models import DocumentAppendix
from feedbacks.models import Feedback

print("Appendixes:")
for a in DocumentAppendix.objects.all()[:5]:
    print(f"ID: {a.id}, Name: {a.name}, Document: {a.document_id}")

# Let's test the serializer validation directly again
from feedbacks.serializers import FeedbackSerializer
from rest_framework import serializers

app = DocumentAppendix.objects.first()
data = {
    'document': app.document_id,
    'appendix': app.id,
    'content': 'Test direct serializer validation'
}
# No user provided
s = FeedbackSerializer(data=data)
v = s.is_valid()
print(f"Is valid: {v}")
if not v:
    print(f"Errors: {s.errors}")
