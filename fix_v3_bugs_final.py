import os

# 1. Update backend/reports/views.py download_schema action
f_path_views = 'backend/reports/views.py'
with open(f_path_views, 'r', encoding='utf-8') as f:
    views_content = f.read()

old_fallback = """        # Fallback: template mặc định trong source code
        default_path = os.path.join(
            os.path.dirname(__file__),
            '..', 'feedbacks', 'utils', 'template_bao_cao_V2_fixed.docx'
        )
        default_path = os.path.normpath(default_path)
        if os.path.exists(default_path):
            return FileResponse(
                open(default_path, 'rb'),
                as_attachment=True,
                filename='template_bao_cao_V2_fixed.docx',
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )"""

new_fallback = """        # Fallback: template mặc định trong source code (V3 cho custom, V2 cho mau10)
        try:
            from feedbacks.utils.v2_template_generator import _get_template_path
            default_path = _get_template_path(template.template_type)
            if default_path and os.path.exists(default_path):
                fname = os.path.basename(default_path)
                return FileResponse(
                    open(default_path, 'rb'),
                    as_attachment=True,
                    filename=fname,
                    content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                )
        except Exception:
            pass"""

if old_fallback in views_content:
    views_content = views_content.replace(old_fallback, new_fallback)
    with open(f_path_views, 'w', encoding='utf-8') as f:
        f.write(views_content)
    print('OK: download_schema in reports/views.py updated')
else:
    # Try with CRLF
    old_fallback_crlf = old_fallback.replace('\n', '\r\n')
    if old_fallback_crlf in views_content:
        views_content = views_content.replace(old_fallback_crlf, new_fallback.replace('\n', '\r\n'))
        with open(f_path_views, 'w', encoding='utf-8') as f:
            f.write(views_content)
        print('OK: download_schema in reports/views.py updated (CRLF)')
    else:
        print('ERROR: old_fallback snippet not found in reports/views.py')


# 2. Update backend/feedbacks/utils/v2_template_generator.py to fix double-append and duplicate comment
f_path_gen = 'backend/feedbacks/utils/v2_template_generator.py'
with open(f_path_gen, 'r', encoding='utf-8') as f:
    gen_content = f.read()

# Fix duplicate comment
gen_content = gen_content.replace("# Đường dẫn mặc định đến file template\n# Đường dẫn mặc định đến các file template", "# Đường dẫn mặc định đến các file template")

# Fix double append bug in _build_dieu_list
double_append_snippet = """        nodes_map[node_key]['feedbacks'].append({
            'user_name': user_name,
            'content': fb.content or '',
            'explanations': explanations_list
        })"""

if double_append_snippet in gen_content:
    # We want to remove the SECOND occurrence which is the simple one
    parts = gen_content.split(double_append_snippet)
    if len(parts) > 2:
        # It's duplicated. Let's rebuild without it.
        # Actually, let's just use regex to find the one after the big dict
        import re
        gen_content = re.sub(r"\}\)\s+# Lấy tên cơ quan góp ý.*?nodes_map\[node_key\]\['feedbacks'\]\.append\(\{\s+'user_name': user_name,\s+'content': fb\.content or '',\s+'explanations': explanations_list\s+\}\)", "})", gen_content, flags=re.DOTALL)
        with open(f_path_gen, 'w', encoding='utf-8') as f:
            f.write(gen_content)
        print('OK: v2_template_generator.py double-append bug fixed')
    else:
        print('ERROR: double_append_snippet found but not duplicated or something else')
else:
    # Try CRLF
    double_append_snippet_crlf = double_append_snippet.replace('\n', '\r\n')
    if double_append_snippet_crlf in gen_content:
        import re
        gen_content = re.sub(r"\}\)\r\n\s+# Lấy tên cơ quan góp ý.*?nodes_map\[node_key\]\['feedbacks'\]\.append\(\{\r\n\s+'user_name': user_name,\r\n\s+'content': fb\.content or '',\r\n\s+'explanations': explanations_list\r\n\s+\}\)", "})", gen_content, flags=re.DOTALL)
        with open(f_path_gen, 'w', encoding='utf-8') as f:
            f.write(gen_content)
        print('OK: v2_template_generator.py double-append bug fixed (CRLF)')
    else:
        print('ERROR: double_append_snippet not found in v2_template_generator.py')
