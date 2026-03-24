from django.db import models
from accounts.models import User


class ReportTemplate(models.Model):
    """Mẫu báo cáo (VD: Mẫu 10 Tổng hợp Tiếp thu Giải trình)"""
    TEMPLATE_TYPES = [
        ('mau_10', 'Mẫu 10 - Tổng hợp, Giải trình, Tiếp thu'),
        ('mau_tong_hop', 'Mẫu Tổng hợp Ý kiến'),
        ('custom', 'Mẫu Tuỳ biến'),
    ]

    name = models.CharField(max_length=255, verbose_name="Tên mẫu báo cáo")
    template_type = models.CharField(max_length=50, choices=TEMPLATE_TYPES, default='mau_10')
    is_active = models.BooleanField(default=True, verbose_name="Đang sử dụng")

    # Thông tin hành chính (Header/Footer file Word)
    header_org_name = models.CharField(max_length=500, blank=True, default='BỘ/CƠ QUAN CHỦ TRÌ', verbose_name="Tên cơ quan chủ trì")
    header_org_location = models.CharField(max_length=255, blank=True, default='Hà Nội', verbose_name="Nơi ban hành")
    footer_signer_name = models.CharField(max_length=255, blank=True, default='', verbose_name="Họ tên người ký")
    footer_signer_title = models.CharField(max_length=255, blank=True, default='ĐẠI DIỆN CƠ QUAN CHỦ TRÌ', verbose_name="Chức vụ người ký")

    # File gốc (nếu muốn upload template .docx riêng)
    file_path = models.FileField(upload_to='reports/templates/', blank=True, null=True)

    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='report_templates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_active', '-updated_at']

    def __str__(self):
        return f"{self.name} ({self.get_template_type_display()})"


class ReportFieldConfig(models.Model):
    """Cấu hình từng cột/trường dữ liệu trong bảng báo cáo"""
    DEFAULT_FIELDS = [
        ('stt', 'TT'),
        ('noi_dung_du_thao', 'Nội dung dự thảo'),
        ('noi_dung_gop_y', 'Nội dung góp ý'),
        ('don_vi_gop_y', 'Đơn vị góp ý'),
        ('giai_trinh', 'Ý kiến giải trình, tiếp thu'),
    ]

    template = models.ForeignKey(ReportTemplate, on_delete=models.CASCADE, related_name='field_configs')
    field_key = models.CharField(max_length=100, verbose_name="Mã trường")
    field_label = models.CharField(max_length=255, verbose_name="Nhãn hiển thị")
    is_enabled = models.BooleanField(default=True, verbose_name="Hiển thị")
    is_default = models.BooleanField(default=False, verbose_name="Trường mặc định (không xoá được)")
    column_order = models.IntegerField(default=0, verbose_name="Thứ tự cột")
    column_width_cm = models.FloatField(default=3.0, verbose_name="Độ rộng cột (cm)")

    class Meta:
        ordering = ['column_order']
        unique_together = ['template', 'field_key']

    def __str__(self):
        status = "✓" if self.is_enabled else "✗"
        return f"[{status}] {self.field_label} ({self.field_key})"


class ReportFieldLog(models.Model):
    """Nhật ký ghi vết mọi thay đổi cấu hình trường"""
    field_config = models.ForeignKey(ReportFieldConfig, on_delete=models.CASCADE, related_name='logs')
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=100, verbose_name="Hành động")  # vd: "Bật trường", "Đổi nhãn", "Thêm trường"
    old_value = models.TextField(blank=True, default='')
    new_value = models.TextField(blank=True, default='')
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-changed_at']

    def __str__(self):
        return f"{self.action} bởi {self.changed_by} lúc {self.changed_at}"
