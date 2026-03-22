from django.db import models
from accounts.models import User
from documents.models import Document, DocumentNode
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from django.contrib.contenttypes.models import ContentType

class Explanation(models.Model):
    TARGET_TYPE_CHOICES = (
        ('Feedback', 'Feedback'),
        ('Node', 'Node'),
    )
    target_type = models.CharField(max_length=20, choices=TARGET_TYPE_CHOICES)
    
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    target = GenericForeignKey('content_type', 'object_id')
    
    content = models.TextField()
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='explanations')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Explanation by {self.user.username} for {self.target_type}"

class Feedback(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='feedbacks')
    node = models.ForeignKey(DocumentNode, on_delete=models.CASCADE, related_name='feedbacks')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feedbacks')
    contributing_agency = models.CharField(max_length=500, blank=True, null=True, help_text="Cơ quan góp ý")
    content = models.TextField()
    attached_file_path = models.FileField(upload_to='feedbacks/files/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    explanations = GenericRelation(Explanation, related_query_name='feedback_obj')

    def __str__(self):
        return f"Feedback by {self.user.username} on {self.node.node_label}"
