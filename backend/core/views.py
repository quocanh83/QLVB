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

class AgencyViewSet(viewsets.ModelViewSet):
    queryset = Agency.objects.all()
    serializer_class = AgencySerializer
    permission_classes = [permissions.IsAuthenticated]

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
