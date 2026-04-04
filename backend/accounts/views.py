from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import viewsets, permissions
from .serializers import CustomTokenObtainPairSerializer, UserSerializer, RoleSerializer, DepartmentSerializer
from .models import User, Role, Department

class IsAdminUserOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and (request.user.is_staff or request.user.is_superuser))


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUserOrReadOnly]

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUserOrReadOnly]

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUserOrReadOnly]

from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Q

class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

class PersonnelStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Kiểm tra quyền Admin
        user = request.user
        is_admin = user.is_staff or user.is_superuser or (hasattr(user, 'roles') and user.roles.filter(role_name='Admin').exists())
        if not is_admin:
            return Response({"error": "Chỉ Admin mới có quyền xem thống kê này."}, status=403)

        from documents.models import NodeAssignment
        from .models import Department
        from feedbacks.models import Feedback

        document_id = request.query_params.get('document_id')

        # 1. Thống kê theo từng Cán bộ
        users = User.objects.select_related('department').all()
        user_results = []
        
        for u in users:
            # Lấy các feedbacks được phân công (qua Node hoặc trực tiếp qua FeedbackAssignment)
            assigned_node_ids = NodeAssignment.objects.filter(user=u).values_list('node_id', flat=True)
            
            fb_query = Q(node_id__in=assigned_node_ids) | Q(individual_assignments__user=u)
            if document_id:
                fb_query &= Q(document_id=document_id)
            
            stats = Feedback.objects.filter(fb_query).distinct().aggregate(
                total=Count('id'),
                completed=Count('id', filter=Q(explanations__isnull=False), distinct=True)
            )
            
            total = stats['total'] or 0
            completed = stats['completed'] or 0
            
            user_results.append({
                "id": u.id,
                "username": u.username,
                "full_name": u.full_name,
                "department": u.department.name if u.department else "Chưa phân phòng",
                "total": total,
                "completed": completed,
                "rate": round((completed / total * 100), 1) if total > 0 else 0
            })

        # 2. Thống kê theo từng Phòng ban (Tránh lặp lại góp ý nếu nhiều người trong phòng cùng làm)
        departments = Department.objects.all()
        final_depts = []
        
        # Cộng thêm trường hợp null nếu có user chưa phân phòng
        dept_ids = list(departments.values_list('id', flat=True)) + [None]
        
        for d_id in dept_ids:
            dept_obj = departments.filter(id=d_id).first() if d_id else None
            dept_name = dept_obj.name if dept_obj else "Chưa phân phòng"
            
            dept_users = users.filter(department_id=d_id)
            if not dept_users.exists():
                continue

            # Lấy tất cả node được giao cho bất kỳ ai trong phòng
            dept_node_ids = NodeAssignment.objects.filter(user__in=dept_users).values_list('node_id', flat=True)
            
            # Lấy tất cả feedback được giao cho bất kỳ ai trong phòng (Node-based OR Individual-based)
            dept_fb_query = Q(node_id__in=dept_node_ids) | Q(individual_assignments__user__in=dept_users)
            if document_id:
                dept_fb_query &= Q(document_id=document_id)
            
            dept_stats = Feedback.objects.filter(dept_fb_query).distinct().aggregate(
                total=Count('id'),
                completed=Count('id', filter=Q(explanations__isnull=False), distinct=True)
            )
            
            d_total = dept_stats['total'] or 0
            d_completed = dept_stats['completed'] or 0
            
            final_depts.append({
                "name": dept_name,
                "total": d_total,
                "completed": d_completed,
                "rate": round((d_completed / d_total * 100), 1) if d_total > 0 else 0
            })

        return Response({
            "by_user": user_results,
            "by_department": final_depts
        })

import pandas as pd
from rest_framework.parsers import MultiPartParser

class UserImportView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUserOrReadOnly]
    parser_classes = [MultiPartParser]

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "Vui lòng đính kèm file Excel."}, status=400)
        
        try:
            df = pd.read_excel(file_obj)
            # Chuẩn hóa tên cột (loại bỏ khoảng trắng)
            df.columns = [c.strip() for c in df.columns]
            
            required_cols = ['Tên đăng nhập', 'Họ và tên']
            for col in required_cols:
                if col not in df.columns:
                    return Response({"error": f"Thiếu cột bắt buộc: {col}"}, status=400)
            
            success_count = 0
            errors = []
            
            for index, row in df.iterrows():
                username = str(row['Tên đăng nhập']).strip()
                full_name = str(row.get('Họ và tên', '')).strip()
                email = str(row.get('Email', '')).strip()
                dept_name = str(row.get('Phòng ban', '')).strip()
                
                if not username: continue
                
                if User.objects.filter(username=username).exists():
                    errors.append(f"Dòng {index+2}: Tên đăng nhập '{username}' đã tồn tại.")
                    continue
                
                try:
                    dept = None
                    if dept_name and dept_name != 'nan':
                        dept, _ = Department.objects.get_or_create(name=dept_name)
                    
                    user = User.objects.create_user(
                        username=username,
                        full_name=full_name,
                        email=email if email != 'nan' else '',
                        password='password123', # Mật khẩu mặc định
                        department=dept
                    )
                    success_count += 1
                except Exception as e:
                    errors.append(f"Dòng {index+2}: Lỗi - {str(e)}")
            
            return Response({
                "message": f"Đã nhập thành công {success_count} cán bộ.",
                "errors": errors
            })
        except Exception as e:
            return Response({"error": f"Lỗi xử lý file: {str(e)}"}, status=500)

from django.http import HttpResponse
import openpyxl

class UserExportTemplateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "DS Can bo"
        
        headers = ['Tên đăng nhập', 'Họ và tên', 'Email', 'Phòng ban']
        ws.append(headers)
        
        # Thêm ví dụ
        ws.append(['canbo01', 'Nguyễn Văn A', 'a.nv@example.com', 'Phòng Pháp chế'])
        ws.append(['canbo02', 'Trần Thị B', 'b.tt@example.com', 'Phòng Tổng hợp'])
        
        from io import BytesIO
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="Mau_nhap_lieu_can_bo.xlsx"'
        return response
