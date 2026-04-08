from django.db import models
from accounts.models import User

class ComparisonProject(models.Model):
    name = models.CharField(max_length=500, verbose_name="Tên dự án so sánh")
    description = models.TextField(blank=True, null=True, verbose_name="Mô tả")
    base_file = models.FileField(upload_to='comparisons/base/', verbose_name="Văn bản gốc")
    base_document_name = models.CharField(max_length=500, blank=True, null=True, verbose_name="Tên định danh văn bản gốc")
    draft_document_name = models.CharField(max_length=500, blank=True, null=True, verbose_name="Tên định danh văn bản dự thảo")
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='comparison_projects')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Dự án so sánh"
        verbose_name_plural = "Dự án so sánh"

class DraftVersion(models.Model):
    project = models.ForeignKey(ComparisonProject, on_delete=models.CASCADE, related_name='versions')
    file_path = models.FileField(upload_to='comparisons/drafts/', verbose_name="Tệp dự thảo")
    user_note = models.TextField(blank=True, null=True, verbose_name="Ghi chú người dùng")
    version_label = models.CharField(max_length=255, verbose_name="Nhãn phiên bản")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Phiên bản dự thảo"
        verbose_name_plural = "Phiên bản dự thảo"

    def __str__(self):
        return f"{self.version_label} - {self.project.name}"

class StandaloneReview(models.Model):
    name = models.CharField(max_length=500, verbose_name="Tên phiên bản rà soát")
    file = models.FileField(upload_to='comparisons/standalone/', verbose_name="Tệp văn bản")
    description = models.TextField(blank=True, null=True, verbose_name="Mô tả")
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='standalone_reviews')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Rà soát độc lập"
        verbose_name_plural = "Rà soát độc lập"
        ordering = ['-created_at']

class ComparisonNode(models.Model):
    NODE_TYPE_CHOICES = (
        ('Chương', 'Chương'),
        ('Điều', 'Điều'),
        ('Khoản', 'Khoản'),
        ('Điểm', 'Điểm'),
        ('Phụ lục', 'Phụ lục'),
        ('Vấn đề khác', 'Vấn đề khác'),
    )
    # Node có thể thuộc về Project (Base), Version (Draft) hoặc StandaloneReview
    project = models.ForeignKey(ComparisonProject, on_delete=models.CASCADE, related_name='base_nodes', null=True, blank=True)
    version = models.ForeignKey(DraftVersion, on_delete=models.CASCADE, related_name='nodes', null=True, blank=True)
    standalone_review = models.ForeignKey(StandaloneReview, on_delete=models.CASCADE, related_name='nodes', null=True, blank=True)
    
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    node_type = models.CharField(max_length=20, choices=NODE_TYPE_CHOICES)
    node_label = models.CharField(max_length=255)
    content = models.TextField()
    order_index = models.IntegerField(default=0)

    class Meta:
        ordering = ['order_index']
        verbose_name = "Mục văn bản so sánh"
        verbose_name_plural = "Mục văn bản so sánh"

    def __str__(self):
        owner = self.project.name if self.project else self.version.version_label
        return f"{self.node_label} ({owner})"

class ComparisonMapping(models.Model):
    project = models.ForeignKey(ComparisonProject, on_delete=models.CASCADE, related_name='mappings')
    version = models.ForeignKey(DraftVersion, on_delete=models.CASCADE, related_name='mappings')
    base_node = models.ForeignKey(ComparisonNode, on_delete=models.CASCADE, related_name='mapped_to')
    draft_node = models.ForeignKey(ComparisonNode, on_delete=models.CASCADE, related_name='mapped_from')
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('version', 'base_node') 
        verbose_name = "Ánh xạ so sánh"
        verbose_name_plural = "Ánh xạ so sánh"

class ComparisonAIResult(models.Model):
    RESULT_TYPE_CHOICES = (
        ('reference_check', 'Rà soát dẫn chiếu'),
        ('automated_report', 'Báo cáo tự động'),
    )
    version = models.ForeignKey(DraftVersion, on_delete=models.CASCADE, related_name='ai_results', null=True, blank=True)
    standalone_review = models.ForeignKey(StandaloneReview, on_delete=models.CASCADE, related_name='ai_results', null=True, blank=True)
    result_type = models.CharField(max_length=50, choices=RESULT_TYPE_CHOICES)
    content = models.TextField(verbose_name="Nội dung kết quả (JSON hoặc Markdown)")
    agent_info = models.CharField(max_length=255, verbose_name="Thông tin Agent (Gemini, Qwen...)")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Kết quả Phân tích AI"
        verbose_name_plural = "Kết quả Phân tích AI"
        ordering = ['-created_at']
