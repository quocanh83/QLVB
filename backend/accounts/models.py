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

class Group(models.Model):
    group_name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.group_name

class User(AbstractUser):
    full_name = models.CharField(max_length=255, blank=True)
    roles = models.ManyToManyField(Role, related_name='users', blank=True)
    group = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')

    def __str__(self):
        return self.username
