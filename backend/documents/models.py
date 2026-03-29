from django.db import models
from accounts.models import User

class DocumentType(models.Model):
    name = models.CharField(max_length=255, unique=True, help_text="Tên loại văn bản")
    description = models.TextField(blank=True, null=True, help_text="Mô tả về loại văn bản")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Document(models.Model):
    STATUS_CHOICES = (
        ('Draft', 'Draft'),
        ('Reviewing', 'Reviewing'),
        ('Completed', 'Completed'),
    )
    project_name = models.CharField(max_length=500, default='Dự thảo')
    description = models.TextField(blank=True, null=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='uploaded_documents')
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    attached_file_path = models.FileField(upload_to='documents/files/', blank=True, null=True)
    drafting_agency = models.CharField(max_length=500, blank=True, null=True, help_text="Tên cơ quan, tổ chức chủ trì")
    agency_location = models.CharField(max_length=200, blank=True, null=True, help_text="Địa danh nơi đóng trụ sở")
    total_consulted_doc = models.IntegerField(default=0, help_text="Tổng số cơ quan, tổ chức, cá nhân được lấy ý kiến")
    total_feedbacks_doc = models.IntegerField(default=0, help_text="Tổng số ý kiến nhận được")
    lead = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='led_documents')
    document_type = models.ForeignKey(DocumentType, on_delete=models.SET_NULL, null=True, blank=True, related_name='documents')

    def __str__(self):
        return self.project_name

class DocumentNode(models.Model):
    NODE_TYPE_CHOICES = (
        ('Chương', 'Chương'),
        ('Điều', 'Điều'),
        ('Khoản', 'Khoản'),
        ('Điểm', 'Điểm'),
        ('Phụ lục', 'Phụ lục'),
        ('Vấn đề khác', 'Vấn đề khác'),
    )
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='nodes')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    node_type = models.CharField(max_length=20, choices=NODE_TYPE_CHOICES)
    node_label = models.CharField(max_length=255)
    content = models.TextField()
    order_index = models.IntegerField(default=0)

    class Meta:
        ordering = ['order_index']

    def __str__(self):
        return f"{self.node_label} - {self.document.project_name}"

class NodeAssignment(models.Model):
    node = models.ForeignKey(DocumentNode, on_delete=models.CASCADE, related_name='assignments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_nodes')
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='given_assignments')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('node', 'user')
