import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from documents.views import DocumentViewSet
from rest_framework.test import APIRequestFactory, force_authenticate
from accounts.models import User

try:
    factory = APIRequestFactory()
    request = factory.get('/api/documents/dashboard_stats/')
    user = User.objects.first()
    force_authenticate(request, user=user)

    view = DocumentViewSet.as_view({'get': 'dashboard_stats'})
    response = view(request)
    try:
        import json
        from django.core.serializers.json import DjangoJSONEncoder
        with open("out.json", "w", encoding="utf-8") as f:
            json.dump(response.data, f, cls=DjangoJSONEncoder, ensure_ascii=False, indent=2)
        print("Wrote to out.json")
    except Exception as e:
        print("Write failed:", e)
except Exception as e:
    import traceback
    traceback.print_exc()
