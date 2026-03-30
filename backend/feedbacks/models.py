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
    contributing_agency = models.CharField(max_length=500, blank=True, null=True, help_text="Tên text tự nhập (Legacy)")
    agency = models.ForeignKey('core.Agency', on_delete=models.SET_NULL, null=True, blank=True, related_name='feedbacks', help_text="Cơ quan góp ý chuẩn hóa")
    official_doc_number = models.CharField(max_length=255, blank=True, null=True, help_text="Số công văn của cơ quan góp ý")
    content = models.TextField()
    attached_file_path = models.FileField(upload_to='feedbacks/files/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    STATUS_CHOICES = (
        ('pending', 'Chờ xử lý'),
        ('reviewed', 'Đã thẩm định'),
        ('approved', 'Đã phê duyệt'),
        ('rejected', 'Từ chối'),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    explanations = GenericRelation(Explanation, related_query_name='feedback_obj')

    def __str__(self):
        return f"Feedback by {self.user.username} on {self.node.node_label}"

class ConsultationResponse(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='responses', verbose_name="Dự thảo liên quan")
    agency = models.ForeignKey('core.Agency', on_delete=models.CASCADE, related_name='consultation_responses', verbose_name="Đơn vị góp ý")
    official_number = models.CharField(max_length=255, verbose_name="Số hiệu công văn")
    official_date = models.DateField(verbose_name="Ngày công văn")
    attached_file = models.FileField(upload_to='consultation_responses/', verbose_name="File đính kèm công văn", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.official_number} - {self.agency.name}"

class ActionLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='action_logs')
    feedback = models.ForeignKey(Feedback, on_delete=models.CASCADE, related_name='logs')
    action = models.CharField(max_length=255) # e.g., "Lưu giải trình", "Gửi duyệt"
    details = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.action} - {self.created_at}"
