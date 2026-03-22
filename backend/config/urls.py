from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/feedbacks/', include('feedbacks.urls')),
    path('api/settings/', include('core.urls')),
]
