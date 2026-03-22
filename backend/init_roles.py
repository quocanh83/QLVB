import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import Role, User

roles = [
    'Admin',
    'Chuyên viên Góp ý',
    'Chuyên viên Giải trình',
    'Chủ trì'
]

admin_role, _ = Role.objects.get_or_create(role_name='Admin')

for role_name in roles:
    role, created = Role.objects.get_or_create(role_name=role_name)
    if created:
        print(f"Đã tạo vai trò: {role_name}")
    else:
        print(f"Vai trò đã tồn tại: {role_name}")

# Tự động gán Admin cho Superuser
superusers = User.objects.filter(is_superuser=True)
for su in superusers:
    if not su.roles.filter(id=admin_role.id).exists():
        su.roles.add(admin_role)
        print(f"Đã gán vai trò Admin cho Superuser: {su.username}")

from core.models import SystemSetting
setting, created = SystemSetting.objects.get_or_create(
    key='OPENAI_API_KEY',
    defaults={'value': '', 'description': 'Khóa API OpenAI để sử dụng tính năng AI Copilot'}
)
if created:
    print("Đã tạo tham số cấu hình: OPENAI_API_KEY")

print("--- Kết thúc khởi tạo Dữ liệu hệ thống ---")
