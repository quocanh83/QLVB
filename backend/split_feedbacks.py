import os
import django
import re

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from feedbacks.models import Feedback

def split_content():
    feedbacks = Feedback.objects.all()
    count = 0
    for fb in feedbacks:
        original = fb.content
        if " - Lý do: " not in original and " - Ghi chú: " not in original:
            continue
            
        new_content = original
        new_reason = ""
        new_note = ""
        
        # Regex to split: [Content] - Lý do: [Reason] - Ghi chú: [Note]
        # Note: Some might only have Lý do or only Ghi chú
        
        # 1. Extract Note
        if " - Ghi chú: " in new_content:
            parts = new_content.split(" - Ghi chú: ")
            new_content = parts[0]
            new_note = parts[1]
            
        # 2. Extract Reason
        if " - Lý do: " in new_content:
            parts = new_content.split(" - Lý do: ")
            new_content = parts[0]
            new_reason = parts[1]
            
        fb.content = new_content.strip()
        fb.reason = new_reason.strip()
        fb.note = new_note.strip()
        fb.save()
        count += 1
        print(f"Updated Feedback ID {fb.id}")

    print(f"Successfully split {count} feedbacks.")

if __name__ == "__main__":
    split_content()
