import uuid
from rest_framework import permissions
from .models import APIKey

class HasAPIKey(permissions.BasePermission):
    """
    Cho phép truy cập nếu header X-API-KEY hợp lệ và đang active.
    """
    def has_permission(self, request, view):
        api_key_header = request.headers.get('X-API-KEY')
        if not api_key_header:
            api_key_header = request.query_params.get('api_key')
            
        if not api_key_header:
            return False
            
        try:
            # handle if api_key_header is not a valid UUID string implicitly by django
            key_obj = APIKey.objects.get(key=api_key_header, is_active=True)
            request.api_key_owner = key_obj.name
            return True
        except APIKey.DoesNotExist:
            return False
        except Exception:
            return False
