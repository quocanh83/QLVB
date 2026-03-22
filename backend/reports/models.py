from django.db import models
from accounts.models import User

class ReportTemplate(models.Model):
    name = models.CharField(max_length=255)
    file_path = models.FileField(upload_to='reports/templates/')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='report_templates')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
