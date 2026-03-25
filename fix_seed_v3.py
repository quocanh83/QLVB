import os

# 1. Update seed_report_template.py to include 7 columns for Custom V3
f_path = 'backend/reports/management/commands/seed_report_template.py'
with open(f_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update names for both templates to be clearer
content = content.replace("'name': 'Mẫu số 10 (Xoay Ngang - Chuẩn NĐ 30)',", "'name': 'Mẫu số 10 (Ngang - Chuẩn NĐ 30)',")
content = content.replace("'name': 'Báo cáo Tuỳ chỉnh (Xoay Dọc - Cột tuỳ biến)',", "'name': 'Báo cáo Tuỳ chỉnh (V3 - Đầy đủ 7 cột)',")
content = content.replace("custom_tpl.name = 'Báo cáo Tuỳ chỉnh (Xoay Dọc - Cột tuỳ biến)'", "custom_tpl.name = 'Báo cáo Tuỳ chỉnh (V3 - Đầy đủ 7 cột)'")

# Add the 7 columns logic to the custom template section
custom_fields_logic = """
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
"""

# Insert before the last success message
content = content.replace("self.stdout.write(self.style.SUCCESS('\\n✓ Hoàn tất seed dữ liệu mẫu báo cáo!'))", custom_fields_logic + "\n        self.stdout.write(self.style.SUCCESS('\\n✓ Hoàn tất seed dữ liệu mẫu báo cáo!'))")

with open(f_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('seed_report_template.py updated successfully')
