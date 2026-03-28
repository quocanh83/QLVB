from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Feedback
from core.models import Notification

@receiver(post_save, sender=Feedback)
def notify_new_feedback(sender, instance, created, **kwargs):
    if kwargs.get('raw'):
        return
        
    if created:
        document = instance.document
        if document.lead:
            agency = instance.contributing_agency or "Một cơ quan"
            Notification.objects.create(
                recipient=document.lead,
                sender=instance.user,
                message=f'Có góp ý mới từ "{agency}" cho dự thảo: {document.project_name}',
                link=f"/feedbacks?docId={document.id}"
            )
