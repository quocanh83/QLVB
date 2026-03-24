from rest_framework.views import APIView
from rest_framework.response import Response
from .permissions import HasAPIKey
from documents.models import Document
from feedbacks.models import Feedback

class PublicStatsAPIView(APIView):
    """
    Endpoint mở rộng (Webhook/API) cho các hệ thống bên thứ 3.
    Yêu cầu header X-API-KEY.
    """
    permission_classes = [HasAPIKey]

    def get(self, request, *args, **kwargs):
        total_docs = Document.objects.count()
        total_feedbacks = Feedback.objects.count()
        
        return Response({
            "status": "success",
            "message": "Chiết xuất dữ liệu thống kê chung thành công.",
            "requested_by": getattr(request, 'api_key_owner', 'Unknown'),
            "data": {
                "total_documents": total_docs,
                "total_feedbacks": total_feedbacks
            }
        })
