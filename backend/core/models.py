from django.db import models

class SystemSetting(models.Model):
    key = models.CharField(max_length=100, unique=True, verbose_name="Tham số")
    value = models.TextField(verbose_name="Giá trị", blank=True, null=True)
    description = models.CharField(max_length=255, blank=True, null=True, verbose_name="Mô tả")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.key

    class Meta:
        verbose_name = "Cài đặt hệ thống"
        verbose_name_plural = "Cài đặt hệ thống"

from accounts.models import User

class Notification(models.Model):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_notifications')
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification for {self.recipient.username}: {self.message[:20]}"

    class Meta:
        ordering = ['-created_at']

import uuid

class APIKey(models.Model):
    name = models.CharField(max_length=255, verbose_name="Tên ứng dụng / Đối tác")
    key = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "API Key"
        verbose_name_plural = "API Keys"

class AgencyCategory(models.Model):
    name = models.CharField(max_length=255, unique=True, verbose_name="Tên phân loại")
    description = models.CharField(max_length=500, blank=True, null=True, verbose_name="Mô tả")
    color = models.CharField(max_length=20, default="#405189", verbose_name="Mã màu hiển thị")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Danh mục Phân loại Cơ quan"
        verbose_name_plural = "Danh mục Phân loại Cơ quan"
        ordering = ['name']

class Agency(models.Model):
    CATEGORY_CHOICES = [
        ('ministry', 'Bộ, cơ quan ngang Bộ'),
        ('local', 'Địa phương (UBND tỉnh/thành phố)'),
        ('organization', 'Sở, Ban, Ngành, Tổ chức, Đoàn thể'),
        ('citizen', 'Công dân, Doanh nghiệp'),
        ('other', 'Khác'),
    ]
    name = models.CharField(max_length=255, unique=True, verbose_name="Tên cơ quan/tổ chức")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other', verbose_name="Phân loại hệ thống (Legacy)")
    agency_category = models.ForeignKey(AgencyCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='agencies', verbose_name="Phân loại cơ quan")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['agency_category__name', 'name']
        verbose_name = "Cơ quan/Chủ thể"
        verbose_name_plural = "Cơ quan/Chủ thể"
