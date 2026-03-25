from django.core.management.base import BaseCommand
from reports.models import ReportTemplate, ReportFieldConfig


class Command(BaseCommand):
    help = 'Tạo mẫu báo cáo mặc định (Mẫu 10 Ngang và Báo cáo Tuỳ chỉnh Dọc)'

    def handle(self, *args, **options):
        # 1. Mẫu số 10 (Ngang - Chuẩn NĐ 30)
        template, created = ReportTemplate.objects.get_or_create(
            template_type='mau_10',
            defaults={
                'name': 'Mẫu số 10 (Ngang - Chuẩn NĐ 30)',
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

        # Tạo 5 trường mặc định cho mẫu 10
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

        # 2. Báo cáo Tuỳ chỉnh (Xoay Dọc)
        custom_tpl, c_created = ReportTemplate.objects.get_or_create(
            template_type='custom',
            defaults={
                'name': 'Báo cáo Tuỳ chỉnh (V3 - Đầy đủ 7 cột)',
                'is_active': True,
                'header_org_name': 'BỘ/CƠ QUAN CHỦ TRÌ',
                'header_org_location': 'Hà Nội',
                'footer_signer_name': '',
                'footer_signer_title': 'ĐẠI DIỆN CƠ QUAN CHỦ TRÌ',
            }
        )
        if c_created:
            self.stdout.write(self.style.SUCCESS(f'✓ Đã tạo mẫu tuỳ chỉnh: {custom_tpl.name}'))
        else:
            # Cập nhật tên nếu đã tồn tại mẫu cũ
            custom_tpl.name = 'Báo cáo Tuỳ chỉnh (V3 - Đầy đủ 7 cột)'
            custom_tpl.save()
            self.stdout.write(self.style.WARNING(f'⚠ Đã cập nhật tên mẫu tuỳ chỉnh: {custom_tpl.name}'))

        
        # Tạo 7 trường mặc định cho mẫu Tuỳ chỉnh V3
        custom_fields = [
            ('stt', 'STT', 1.0, 0),
            ('dieu_khoan', 'Điều/Khoản', 3.0, 1),
            ('user_name', 'Cơ quan góp ý', 3.0, 2),
            ('content', 'Nội dung góp ý', 5.0, 3),
            ('explanations', 'Nội dung giải trình', 5.0, 4),
            ('chuyen_vien', 'Chuyên viên', 2.5, 5),
            ('status', 'Trạng thái', 2.5, 6),
        ]

        for field_key, field_label, width, order in custom_fields:
            ReportFieldConfig.objects.get_or_create(
                template=custom_tpl,
                field_key=field_key,
                defaults={
                    'field_label': field_label,
                    'is_enabled': True,
                    'is_default': True,
                    'column_order': order,
                    'column_width_cm': width,
                }
            )

        self.stdout.write(self.style.SUCCESS('\n✓ Hoàn tất seed dữ liệu mẫu báo cáo!'))
