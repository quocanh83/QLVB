from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import SystemSetting, Notification, Agency
from .serializers import SystemSettingSerializer, NotificationSerializer, AgencySerializer

class IsAdminOrCustomAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.is_staff or user.is_superuser or (hasattr(user, 'roles') and user.roles.filter(role_name='Admin').exists())

class SystemSettingViewSet(viewsets.ModelViewSet):
    queryset = SystemSetting.objects.all()
    serializer_class = SystemSettingSerializer
    # Cả hệ thống Admin (is_staff) và Custom Role (Admin) đều được sửa cài đặt
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrCustomAdmin()]
        return [permissions.IsAuthenticated()]

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({"status": "đã đọc"})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({"status": "đã đọc tất cả"})

from .models import AgencyCategory
from .serializers import AgencyCategorySerializer

class AgencyCategoryViewSet(viewsets.ModelViewSet):
    queryset = AgencyCategory.objects.all()
    serializer_class = AgencyCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrCustomAdmin()]
        return [permissions.IsAuthenticated()]

class AgencyViewSet(viewsets.ModelViewSet):
    queryset = Agency.objects.all()
    serializer_class = AgencySerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "Không tìm thấy tệp tải lên."}, status=400)
        
        try:
            import pandas as pd
        except ImportError:
            return Response({"error": "Máy chủ thiếu thư viện 'pandas' và 'openpyxl'. Vui lòng chạy './venv/bin/pip install pandas openpyxl' trên Server."}, status=500)

        try:
            # Đọc tệp tin dựa trên định dạng
            if file_obj.name.endswith('.xlsx') or file_obj.name.endswith('.xls'):
                df = pd.read_excel(file_obj)
            else:
                # Thử nhiều bản mã cho CSV (Hỗ trợ tiếng Việt từ Excel export)
                encodings = ['utf-8', 'latin-1', 'cp1252', 'utf-16']
                df = None
                for enc in encodings:
                    try:
                        file_obj.seek(0)
                        df = pd.read_csv(file_obj, encoding=enc)
                        break
                    except:
                        continue
                if df is None:
                    raise Exception("Không thể đọc tệp CSV. Vui lòng đảm bảo tệp đúng định dạng.")

            # Tải mapping danh mục hiện có
            categories = {cat.name.lower().strip(): cat for cat in AgencyCategory.objects.all()}
            
            created_count = 0
            updated_count = 0
            
            for _, row in df.iterrows():
                name = str(row.get('name', '')).strip()
                if not name or name == 'nan': continue
                
                # Xử lý danh mục
                cat_name_input = str(row.get('category', '')).strip()
                if not cat_name_input or cat_name_input.lower() == 'nan':
                    cat_name_input = 'Khác'
                
                # Legacy mapping
                legacy_map = {
                    'ministry': 'Bộ, cơ quan ngang Bộ',
                    'local': 'Địa phương (UBND tỉnh/thành phố)',
                    'organization': 'Sở, Ban, Ngành, Tổ chức, Đoàn thể',
                    'citizen': 'Công dân, Doanh nghiệp',
                    'other': 'Khác'
                }
                actual_cat_name = legacy_map.get(cat_name_input.lower(), cat_name_input)
                
                # Tìm hoặc tạo danh mục tự động
                target_cat = categories.get(actual_cat_name.lower().strip())
                if not target_cat:
                    target_cat, _ = AgencyCategory.objects.get_or_create(name=actual_cat_name)
                    categories[actual_cat_name.lower().strip()] = target_cat

                agency, created = Agency.objects.update_or_create(
                    name=name,
                    defaults={
                        'agency_category': target_cat,
                        'category': actual_cat_name[:50]
                    }
                )
                
                if created: created_count += 1
                else: updated_count += 1
            
            return Response({
                "message": f"Nhập dữ liệu thành công.",
                "created": created_count,
                "updated": updated_count
            })
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return Response({"error": f"Lỗi xử lý tệp: {str(e)}"}, status=500)

import os
import subprocess
import threading
from rest_framework.views import APIView

def run_update_script():
    script_path = "/home/qlvb/qlvb/auto_update.sh"
    if os.path.exists(script_path):
        # Chạy script cập nhật
        subprocess.run(["bash", script_path])
    else:
        print(f"[AutoUpdate] Không tìm thấy script tại {script_path}. Bỏ qua (có thể đang chạy ở Local).")

class SystemUpdateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrCustomAdmin]

    def post(self, request):
        # Chạy ngầm để không bị timeout request
        threading.Thread(target=run_update_script).start()
        return Response({"status": "Cập nhật mã nguồn đang được tiến hành ngầm."})
