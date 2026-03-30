import sys
import os
import django

sys.path.append(r'C:\Users\Quoc Anh\Desktop\QLVB\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User
try:
    users_count = User.objects.count()
    print(f"Hệ thống đang kết nối trực tiếp đến CSDL và tìm thấy {users_count} tài khoản người dùng.")
except Exception as e:
    print("LOI_TRONG_DJANGO:", e)
