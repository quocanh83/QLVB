import os

f_path = 'backend/reports/views.py'
with open(f_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern for the beginning of the class
old_v = "class ReportTemplateViewSet(viewsets.ModelViewSet):\n    queryset = ReportTemplate.objects.all()\n    serializer_class = ReportTemplateSerializer\n    permission_classes = [permissions.IsAuthenticated]"

# New code with get_permissions
new_v = """class ReportTemplateViewSet(viewsets.ModelViewSet):
    queryset = ReportTemplate.objects.all()
    serializer_class = ReportTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action == 'download_schema':
            return [permissions.AllowAny()]
        return super().get_permissions()"""

if old_v in content:
    content = content.replace(old_v, new_v)
    with open(f_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: get_permissions added')
else:
    # Try a slightly different pattern if line endings are different
    old_v_alt = old_v.replace('\n', '\r\n')
    if old_v_alt in content:
        content = content.replace(old_v_alt, new_v.replace('\n', '\r\n'))
        with open(f_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('OK: get_permissions added (with CRLF)')
    else:
        print('ERROR: Pattern not found in views.py')
        # Print a snippet to debug
        start = content.find('class ReportTemplateViewSet')
        print('Snippet found:', repr(content[start:start+150]))
