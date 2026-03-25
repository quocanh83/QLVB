import os

f_path = 'backend/reports/views.py'
with open(f_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the path joining
old_snippet = """        default_path = os.path.join(
            os.path.dirname(__file__),
            '..', '..', 'feedbacks', 'utils', 'template_bao_cao_V2_fixed.docx'
        )"""

new_snippet = """        default_path = os.path.join(
            os.path.dirname(__file__),
            '..', 'feedbacks', 'utils', 'template_bao_cao_V2_fixed.docx'
        )"""

if old_snippet in content:
    content = content.replace(old_snippet, new_snippet)
    with open(f_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: download_schema path fixed in backend/reports/views.py')
else:
    # Try with CRLF
    old_snippet_crlf = old_snippet.replace('\n', '\r\n')
    if old_snippet_crlf in content:
        content = content.replace(old_snippet_crlf, new_snippet.replace('\n', '\r\n'))
        with open(f_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('OK: download_schema path fixed (with CRLF)')
    else:
        print('ERROR: Snippet not found')
