from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from core.public_views import PublicStatsAPIView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/feedbacks/', include('feedbacks.urls')),
    path('api/settings/', include('core.urls')),
    path('api/notifications/', include('core.notification_urls')),
    path('api/reports/', include('reports.urls')),
    path('api/public/stats/', PublicStatsAPIView.as_view(), name='public-stats'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
