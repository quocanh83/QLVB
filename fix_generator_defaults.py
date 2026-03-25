import os

# 1. Update v2_template_generator.py
f_path = 'backend/feedbacks/utils/v2_template_generator.py'
with open(f_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define new constants
new_constants = """# Đường dẫn mặc định đến các file template
DEFAULT_MAU10_PATH = os.path.join(os.path.dirname(__file__), 'template_bao_cao_V2_fixed.docx')
DEFAULT_CUSTOM_PATH = os.path.join(os.path.dirname(__file__), 'template_truong_tu_chinh_v3.docx')
"""

content = content.replace("DEFAULT_TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), 'template_bao_cao_V2_fixed.docx')", new_constants)

# Update _get_template_path logic
old_get_path = """def _get_template_path(template_type='mau_10'):
    \"\"\"
    Trả về đường dẫn file template:
    - Ưu tiên 1: File đã upload trong DB (ReportTemplate.file_path)
    - Ưu tiên 2: File mặc định trong source code
    \"\"\"
    try:
        from reports.models import ReportTemplate as RT
        tpl = RT.objects.filter(template_type=template_type, is_active=True).first()
        if tpl and tpl.file_path:
            import os as _os
            path = tpl.file_path.path
            if _os.path.exists(path):
                return path
    except Exception:
        pass
    return DEFAULT_TEMPLATE_PATH"""

new_get_path = """def _get_template_path(template_type='mau_10'):
    \"\"\"
    Trả về đường dẫn file template:
    - Ưu tiên 1: File đã upload trong DB (ReportTemplate.file_path)
    - Ưu tiên 2: File mặc định trong source code (V3 cho custom, V2 cho mau10)
    \"\"\"
    try:
        from reports.models import ReportTemplate as RT
        tpl = RT.objects.filter(template_type=template_type, is_active=True).first()
        if tpl and tpl.file_path:
            import os as _os
            path = tpl.file_path.path
            if _os.path.exists(path):
                return path
    except Exception:
        pass
    
    if template_type == 'custom':
        return DEFAULT_CUSTOM_PATH
    return DEFAULT_MAU10_PATH"""

content = content.replace(old_get_path, new_get_path)

with open(f_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('v2_template_generator.py defaults updated')
