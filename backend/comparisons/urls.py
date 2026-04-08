from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ComparisonProjectViewSet, DraftVersionViewSet, ComparisonNodeViewSet

router = DefaultRouter()
router.register(r'projects', ComparisonProjectViewSet)
router.register(r'versions', DraftVersionViewSet)
router.register(r'nodes', ComparisonNodeViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
