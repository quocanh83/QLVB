import os

# 1. Fix feedbacks/views.py
views_path = 'backend/feedbacks/views.py'
with open(views_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Safe check for tpl_db in export_mau_10
content = content.replace(
    'enabled_fields = tpl_db.field_configs.filter(is_enabled=True).order_by(\'column_order\')',
    'enabled_fields = tpl_db.field_configs.filter(is_enabled=True).order_by(\'column_order\') if tpl_db else None'
)

content = content.replace(
    'if enabled_fields.exists():',
    'if enabled_fields and enabled_fields.exists():'
)

with open(views_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('feedbacks/views.py fix applied')


# 2. Add missing orientation info to seed
seed_path = 'backend/reports/management/commands/seed_report_template.py'
with open(seed_path, 'r', encoding='utf-8') as f:
    seed_content = f.read()

# No changes needed to seed yet, names are already descriptive.

# 3. Check reports/views.py for potential issues in download_schema
# (The pathing logic looked OK, but let's double check it in next step if needed)
