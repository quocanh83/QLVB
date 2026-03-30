import django
import os
import sys

# Thiết lập môi trường Django
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Agency, AgencyCategory

def populate():
    # 1. Định nghĩa các danh mục mặc định từ Choices cũ
    default_categories = {
        'ministry': ('Bộ, cơ quan ngang Bộ', '#405189'),
        'local': ('Địa phương (UBND tỉnh/thành phố)', '#0ab39c'),
        'organization': ('Sở, Ban, Ngành, Tổ chức, Đoàn thể', '#299cdb'),
        'citizen': ('Công dân, Doanh nghiệp', '#f7b84b'),
        'other': ('Khác', '#f06548'),
    }

    print("--- Bắt đầu khởi tạo Danh mục Cơ quan ---")
    
    # Tạo map để ánh xạ từ key cũ sang object mới
    category_map = {}
    for key, (name, color) in default_categories.items():
        cat, created = AgencyCategory.objects.get_or_create(
            name=name,
            defaults={'color': color}
        )
        category_map[key] = cat
        if created:
            print(f"Đã tạo danh mục: {name}")
        else:
            print(f"Đã tồn tại danh mục: {name}")

    # 2. Cập nhật các Agency hiện có
    print("\n--- Đang cập nhật liên kết cho các Cơ quan hiện có ---")
    agencies = Agency.objects.all()
    updated_count = 0
    
    for agency in agencies:
        if not agency.agency_category:
            old_cat_key = agency.category
            if old_cat_key in category_map:
                agency.agency_category = category_map[old_cat_key]
                agency.save()
                updated_count += 1
    
    print(f"Đã cập nhật thành công {updated_count} cơ quan.")
    print("--- Hoàn tất ---")

if __name__ == "__main__":
    populate()
