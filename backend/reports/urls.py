from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReportTemplateViewSet, ReportFieldConfigViewSet

router = DefaultRouter()
router.register(r'templates', ReportTemplateViewSet, basename='report-template')
router.register(r'field-configs', ReportFieldConfigViewSet, basename='field-config')

urlpatterns = [
    path('', include(router.urls)),
]
