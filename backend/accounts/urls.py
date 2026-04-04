from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView, UserViewSet, RoleViewSet, DepartmentViewSet, 
    ProfileView, UserImportView, UserExportTemplateView, PersonnelStatsView
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'roles', RoleViewSet)
router.register(r'departments', DepartmentViewSet)

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='user-profile'),
    path('users/import/', UserImportView.as_view(), name='user-import'),
    path('users/template/', UserExportTemplateView.as_view(), name='user-template'),
    path('personnel-stats/', PersonnelStatsView.as_view(), name='personnel-stats'),
    path('', include(router.urls)),
]
