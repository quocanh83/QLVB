from django.core.management.base import BaseCommand
from core.models import Agency, AgencyCategory

class Command(BaseCommand):
    help = 'Initialize agency categories and link them'

    def handle(self, *args, **kwargs):
        default_categories = {
            'ministry': ('Bộ, cơ quan ngang Bộ', '#405189'),
            'local': ('Địa phương (UBND tỉnh/thành phố)', '#0ab39c'),
            'organization': ('Sở, Ban, Ngành, Tổ chức, Đoàn thể', '#299cdb'),
            'citizen': ('Công dân, Doanh nghiệp', '#f7b84b'),
            'other': ('Khác', '#f06548'),
        }

        self.stdout.write("--- Bắt đầu khởi tạo Danh mục Cơ quan ---")
        
        category_map = {}
        for key, (name, color) in default_categories.items():
            cat, created = AgencyCategory.objects.get_or_create(
                name=name,
                defaults={'color': color}
            )
            category_map[key] = cat
            if created:
                self.stdout.write(self.style.SUCCESS(f"Đã tạo danh mục: {name}"))
            else:
                self.stdout.write(f"Đã tồn tại danh mục: {name}")

        self.stdout.write("\n--- Đang cập nhật liên kết cho các Cơ quan hiện có ---")
        agencies = Agency.objects.all()
        updated_count = 0
        
        for agency in agencies:
            if not agency.agency_category:
                old_cat_key = agency.category
                if old_cat_key in category_map:
                    agency.agency_category = category_map[old_cat_key]
                    agency.save()
                    updated_count += 1
        
        self.stdout.write(self.style.SUCCESS(f"Đã cập nhật thành công {updated_count} cơ quan."))
        self.stdout.write("--- Hoàn tất ---")
