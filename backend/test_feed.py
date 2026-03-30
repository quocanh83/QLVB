import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from feedbacks.models import Feedback
feedbacks = Feedback.objects.filter(contributing_agency__icontains="Kien truc Quoc gia")
if not feedbacks:
    feedbacks = Feedback.objects.filter(contributing_agency__icontains="Viện kiến trúc Quốc gia")

print(f"Total feedbacks found: {feedbacks.count()}")
for fb in feedbacks:
    print(f"ID: {fb.id}")
    print(f"Agency ID: {fb.agency_id}")
    print(f"Contributing Agency: {fb.contributing_agency}")
    print(f"Content: {fb.content[:50]}...")
    print("-" * 30)
