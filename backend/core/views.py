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
            df = pd.read_excel(file_obj) if file_obj.name.endswith('.xlsx') else pd.read_csv(file_obj)
            
            # Tải mapping danh mục hiện có để tối ưu
            categories = {cat.name.lower().strip(): cat for cat in AgencyCategory.objects.all()}
            default_cat = categories.get('khác') or AgencyCategory.objects.first()
            
            created_count = 0
            updated_count = 0
            
            for _, row in df.iterrows():
                name = str(row.get('name', '')).strip()
                if not name or name == 'nan': continue
                
                # Tìm danh mục phù hợp
                cat_name_input = str(row.get('category', '')).strip().lower()
                target_cat = categories.get(cat_name_input) or default_cat
                
                # Legacy mapping if using old keys
                legacy_map = {
                    'ministry': 'Bộ, cơ quan ngang Bộ',
                    'local': 'Địa phương (UBND tỉnh/thành phố)',
                    'organization': 'Sở, Ban, Ngành, Tổ chức, Đoàn thể',
                    'citizen': 'Công dân, Doanh nghiệp',
                    'other': 'Khác'
                }
                if not target_cat and cat_name_input in legacy_map:
                    target_cat = categories.get(legacy_map[cat_name_input].lower())

                agency, created = Agency.objects.update_or_create(
                    name=name,
                    defaults={
                        'agency_category': target_cat,
                        'category': cat_name_input[:50] # For backward compatibility
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
