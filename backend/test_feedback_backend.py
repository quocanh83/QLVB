import os
import django
import sys

# Thêm đường dẫn vào sys.path để Django tìm thấy apps
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.files.uploadedfile import SimpleUploadedFile
from feedbacks.views import FeedbackViewSet
from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model
from core.models import Agency
from documents.models import Document, DocumentNode

User = get_user_model()

def run_test():
    print("--- Bắt đầu kiểm tra Backend Import ---")
    
    # 1. Chuẩn bị dữ liệu
    user = User.objects.filter(is_superuser=True).first()
    if not user:
        print("Không tìm thấy superuser để authenticate.")
        return
        
    doc = Document.objects.first()
    if not doc:
        print("Không tìm thấy Document nào trong DB.")
        return
    
    document_id = doc.id
    print(f"Sử dụng Document ID: {document_id}")
    
    # Tạo Agency nếu chưa có để test fuzzy matching
    Agency.objects.get_or_create(name="Vụ Pháp chế")
    Agency.objects.get_or_create(name="Bộ Kế hoạch và Đầu tư")
    
    factory = APIRequestFactory()
    viewset = FeedbackViewSet()
    
    # 2. Test Analyze Import
    print("\n[Step 1] Test analyze_import...")
    with open('../test_import.xlsx', 'rb') as f:
        file_obj = SimpleUploadedFile('test_import.xlsx', f.read())
        
    request = factory.post('/api/feedbacks/analyze_import/', {
        'file': file_obj, 
        'document_id': document_id
    }, format='multipart')
    force_authenticate(request, user=user)
    
    response = FeedbackViewSet.as_view({'post': 'analyze_import'})(request)
    
    if response.status_code == 200:
        rows = response.data.get('rows', [])
        print(f"Thành công! Phân tích được {len(rows)} dòng.")
        for row in rows:
            print(f" - Node: {row['node_label']}, Agency: {row['agency_name']} ({'Khớp' if row['agency_id'] else 'Không khớp'}), Content: {row['content'][:50]}...")
            if row['is_duplicate']:
                print(f"   (!) Phát hiện trùng lặp!")
    else:
        print(f"Thất bại! Status: {response.status_code}, Error: {response.data}")
        return

    # 3. Test Confirm Import
    print("\n[Step 2] Test confirm_import...")
    # Thử import tất cả các dòng
    request_confirm = factory.post('/api/feedbacks/confirm_import/', {
        'document_id': document_id,
        'rows': rows
    }, format='json')
    force_authenticate(request_confirm, user=user)
    
    response_confirm = FeedbackViewSet.as_view({'post': 'confirm_import'})(request_confirm)
    
    if response_confirm.status_code == 200:
        print(f"Thành công! {response_confirm.data['message']}")
    else:
        print(f"Thất bại! Status: {response_confirm.status_code}, Error: {response_confirm.data}")

if __name__ == "__main__":
    run_test()
