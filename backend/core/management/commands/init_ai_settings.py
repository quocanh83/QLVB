from django.core.management.base import BaseCommand
from core.models import SystemSetting
import os

class Command(BaseCommand):
    help = 'Initialize AI settings in the database for UI configuration'

    def handle(self, *args, **options):
        settings_to_init = [
            {
                'key': 'AI_PROVIDER',
                'value': os.environ.get('AI_PROVIDER', 'gemini'),
                'description': 'AI Provider (gemini, openrouter, qwen)'
            },
            {
                'key': 'AI_API_KEY',
                'value': os.environ.get('AI_API_KEY', ''),
                'description': 'API Key cho AI Provider đã chọn'
            },
            {
                'key': 'AI_MODEL',
                'value': os.environ.get('AI_MODEL', 'gemini-1.5-pro'),
                'description': 'Tên Model AI sử dụng (VD: gemini-1.5-pro, qwen-plus)'
            }
        ]

        for s in settings_to_init:
            obj, created = SystemSetting.objects.get_or_create(
                key=s['key'],
                defaults={
                    'value': s['value'],
                    'description': s['description']
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created setting: {s['key']}"))
            else:
                self.stdout.write(f"Setting already exists: {s['key']} (Value: {obj.value})")
