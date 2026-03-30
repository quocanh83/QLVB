from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FeedbackViewSet, ConsultationResponseViewSet

router = DefaultRouter()
router.register(r'responses', ConsultationResponseViewSet, basename='consultation-response')
router.register(r'', FeedbackViewSet, basename='feedback')

urlpatterns = [
    path('', include(router.urls)),
]
