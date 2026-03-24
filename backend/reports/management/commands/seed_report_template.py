from django.core.management.base import BaseCommand
from reports.models import ReportTemplate, ReportFieldConfig


class Command(BaseCommand):
    help = 'Tạo mẫu báo cáo Mẫu 10 mặc định với 5 trường cơ bản'

    def handle(self, *args, **options):
        template, created = ReportTemplate.objects.get_or_create(
            template_type='mau_10',
            defaults={
                'name': 'Mẫu 10 - Tổng hợp, Giải trình, Tiếp thu',
                'is_active': True,
                'header_org_name': 'BỘ/CƠ QUAN CHỦ TRÌ',
                'header_org_location': 'Hà Nội',
                'footer_signer_name': '',
                'footer_signer_title': 'ĐẠI DIỆN CƠ QUAN CHỦ TRÌ',
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Đã tạo mẫu: {template.name}'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠ Mẫu đã tồn tại: {template.name}'))

        # Tạo 5 trường mặc định
        default_fields = [
            ('stt', 'TT', 1.0, 0),
            ('noi_dung_du_thao', 'Nội dung dự thảo', 4.0, 1),
            ('noi_dung_gop_y', 'Nội dung góp ý', 4.0, 2),
            ('don_vi_gop_y', 'Đơn vị góp ý', 3.0, 3),
            ('giai_trinh', 'Ý kiến giải trình, tiếp thu', 4.5, 4),
        ]

        for field_key, field_label, width, order in default_fields:
            obj, field_created = ReportFieldConfig.objects.get_or_create(
                template=template,
                field_key=field_key,
                defaults={
                    'field_label': field_label,
                    'is_enabled': True,
                    'is_default': True,
                    'column_order': order,
                    'column_width_cm': width,
                }
            )
            if field_created:
                self.stdout.write(f'  + Trường: {field_label} ({field_key})')
            else:
                self.stdout.write(f'  = Đã có: {field_label}')

        self.stdout.write(self.style.SUCCESS('\n✓ Hoàn tất seed dữ liệu mẫu báo cáo!'))
