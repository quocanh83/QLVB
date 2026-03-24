import os

f_path = 'backend/feedbacks/views.py'
with open(f_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_v = "class FeedbackViewSet(viewsets.ModelViewSet):\n    queryset = Feedback.objects.all()\n    serializer_class = FeedbackSerializer\n    permission_classes = [permissions.IsAuthenticated]"

new_v = """class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action == 'export_mau_10':
            return [permissions.AllowAny()]
        return super().get_permissions()"""

if old_v in content:
    content = content.replace(old_v, new_v)
    with open(f_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: get_permissions added to FeedbackViewSet')
else:
    # Try CRLF
    old_v_alt = old_v.replace('\n', '\r\n')
    if old_v_alt in content:
        content = content.replace(old_v_alt, new_v.replace('\n', '\r\n'))
        with open(f_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('OK: get_permissions added (with CRLF)')
    else:
        print('ERROR: Pattern not found in feedbacks/views.py')
        start = content.find('class FeedbackViewSet')
        print('Snippet:', repr(content[start:start+150]))
