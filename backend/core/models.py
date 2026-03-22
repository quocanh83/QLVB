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
