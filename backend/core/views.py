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

    def _parse_agency_import_file(self, file_obj):
        try:
            import pandas as pd
        except ImportError:
            raise Exception("Máy chủ thiếu thư viện 'pandas' và 'openpyxl'.")

        if file_obj.name.endswith('.xlsx') or file_obj.name.endswith('.xls'):
            df = pd.read_excel(file_obj)
        else:
            encodings = ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252', 'utf-16']
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
        
        col_map = {}
        name_keywords = ['name', 'tên', 'don vi', 'đơn vị', 'co quan', 'cơ quan']
        cat_keywords = ['category', 'phân loại', 'phan loai', 'loại', 'loai']
        
        for col in df.columns:
            c_low = str(col).lower().strip()
            if not col_map.get('name') and c_low in name_keywords:
                col_map['name'] = col
            if not col_map.get('category') and c_low in cat_keywords:
                col_map['category'] = col
        
        if 'name' not in col_map:
            raise Exception("Không tìm thấy cột 'Tên' hoặc 'Đơn vị' trong tệp tin.")
            
        return df, col_map

    @action(detail=False, methods=['post'])
    def analyze_import(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "Không tìm thấy tệp tải lên."}, status=400)
        
        try:
            df, col_map = self._parse_agency_import_file(file_obj)
            
            existing_names = set(Agency.objects.values_list('name', flat=True))
            
            duplicates = []
            new_items = []
            
            for _, row in df.iterrows():
                name_val = str(row.get(col_map['name'], '')).strip()
                if not name_val or name_val.lower() == 'nan': continue
                
                cat_name = str(row.get(col_map.get('category'), 'Khác')).strip()
                
                item = {"name": name_val, "category": cat_name}
                if name_val in existing_names:
                    duplicates.append(item)
                else:
                    new_items.append(item)
            
            return Response({
                "total": len(duplicates) + len(new_items),
                "duplicate_count": len(duplicates),
                "new_count": len(new_items),
                "duplicates": duplicates[:100], # Gửi tối đa 100 cái để preview
                "has_more_duplicates": len(duplicates) > 100
            })
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        file_obj = request.FILES.get('file')
        duplicates_mode = request.data.get('duplicates_mode', 'overwrite') # 'overwrite' or 'skip'
        
        if not file_obj:
            return Response({"error": "Không tìm thấy tệp tải lên."}, status=400)
        
        try:
            df, col_map = self._parse_agency_import_file(file_obj)
            categories = {cat.name.lower().strip(): cat for cat in AgencyCategory.objects.all()}
            existing_names = set(Agency.objects.values_list('name', flat=True))
            
            created_count = 0
            updated_count = 0
            skipped_count = 0
            import_details = []
            
            legacy_map = {
                'ministry': 'Bộ, cơ quan ngang Bộ',
                'local': 'Địa phương (UBND tỉnh/thành phố)',
                'organization': 'Sở, Ban, Ngành, Tổ chức, Đoàn thể',
                'citizen': 'Công dân, Doanh nghiệp',
                'other': 'Khác'
            }

            for _, row in df.iterrows():
                name_val = str(row.get(col_map['name'], '')).strip()
                if not name_val or name_val.lower() == 'nan': continue
                
                is_duplicate = name_val in existing_names
                
                if is_duplicate and duplicates_mode == 'skip':
                    skipped_count += 1
                    import_details.append({"name": name_val, "status": "Bỏ qua (Trùng)"})
                    continue

                cat_name_input = str(row.get(col_map.get('category'), 'Khác')).strip()
                if not cat_name_input or cat_name_input.lower() == 'nan': cat_name_input = 'Khác'
                
                actual_cat_name = legacy_map.get(cat_name_input.lower(), cat_name_input)
                target_cat = categories.get(actual_cat_name.lower().strip())
                if not target_cat:
                    target_cat, _ = AgencyCategory.objects.get_or_create(name=actual_cat_name)
                    categories[actual_cat_name.lower().strip()] = target_cat

                agency, created = Agency.objects.update_or_create(
                    name=name_val,
                    defaults={
                        'agency_category': target_cat,
                        'category': actual_cat_name[:50]
                    }
                )
                
                if created: created_count += 1
                else: updated_count += 1
                
                import_details.append({
                    "name": agency.name,
                    "category": actual_cat_name,
                    "status": "Mới" if created else "Cập nhật"
                })
            
            if not import_details:
                return Response({"error": "Tệp tin không chứa dữ liệu hợp lệ (Dòng trống hoặc thiếu tên đơn vị)."}, status=400)

            return Response({
                "message": f"Đã xử lý xong {len(import_details)} đơn vị.",
                "created": created_count,
                "updated": updated_count,
                "skipped": skipped_count,
                "details": import_details
            })
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return Response({"error": f"Lỗi xử lý tệp: {str(e)}"}, status=500)

    @action(detail=False, methods=['post'], url_path='bulk-delete')
    def bulk_delete(self, request):
        if not IsAdminOrCustomAdmin().has_permission(request, self):
             return Response({"error": "Bạn không có quyền thực hiện thao tác này."}, status=403)
             
        ids = request.data.get('ids', [])
        if not ids:
            return Response({"error": "Không có ID nào được cung cấp."}, status=400)
            
        # Xóa các đơn vị có ID trong danh sách
        count, _ = Agency.objects.filter(id__in=ids).delete()
        return Response({"status": "deleted", "count": count})

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
