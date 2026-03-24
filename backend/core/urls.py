from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SystemSettingViewSet, AgencyViewSet, SystemUpdateAPIView

router = DefaultRouter()
router.register(r'agencies', AgencyViewSet, basename='agency')
router.register(r'', SystemSettingViewSet, basename='systemsetting')

urlpatterns = [
    path('update-system/', SystemUpdateAPIView.as_view(), name='update-system'),
    path('', include(router.urls)),
]
