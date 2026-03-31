from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, NodeViewSet, DocumentTypeViewSet, DocumentAppendixViewSet

router = DefaultRouter()
router.register(r'nodes', NodeViewSet, basename='node')
router.register(r'types', DocumentTypeViewSet, basename='document-type')
router.register(r'appendices', DocumentAppendixViewSet, basename='appendix')
router.register(r'', DocumentViewSet, basename='document')

urlpatterns = [
    path('', include(router.urls)),
]
