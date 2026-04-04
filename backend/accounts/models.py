from django.db import models
from django.contrib.auth.models import AbstractUser

class Role(models.Model):
    ROLE_CHOICES = (
        ('Admin', 'Admin'),
        ('Contributor', 'Contributor'),
        ('Explainer', 'Explainer'),
    )
    role_name = models.CharField(max_length=50, choices=ROLE_CHOICES, unique=True)
    permissions = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.role_name

class Department(models.Model):
    name = models.CharField(max_length=255, unique=True, verbose_name="Tên phòng ban")
    description = models.TextField(blank=True, null=True, verbose_name="Mô tả")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Phòng ban"
        verbose_name_plural = "Phòng ban"

class Group(models.Model):
    group_name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.group_name

class User(AbstractUser):
    full_name = models.CharField(max_length=255, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    roles = models.ManyToManyField(Role, related_name='users', blank=True)
    group = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='users', verbose_name="Phòng ban")
    sidebar_config = models.JSONField(default=list, blank=True, null=True, verbose_name="Cấu hình Sidebar")

    def __str__(self):
        return self.username
