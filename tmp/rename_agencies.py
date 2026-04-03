from core.models import Agency

def run():
    cities = ['Hà Nội', 'Cần Thơ', 'Hải Phòng', 'Đà Nẵng']
    special_cases = {
        'Huế': 'tỉnh Thừa Thiên Huế'
    }
    
    # Pre-merger mapping
    mergers = {
        'Sở Nông nghiệp và Môi trường': 'Sở Nông nghiệp và Phát triển nông thôn'
    }

    prefixes = [
        'Sở Xây dựng', 
        'Sở Công Thương', 
        'Sở Nông nghiệp và Phát triển nông thôn',
        'Sở Tư pháp',
        'Sở Giao thông vận tải',
        'Sở Tài chính',
        'Sở Kế hoạch và Đầu tư',
        'Sở Nội vụ',
        'Sở Y tế',
        'Sở Giáo dục và Đào tạo',
        'Sở Khoa học và Công nghệ',
        'Sở Thông tin và Truyền thông',
        'Sở Văn hóa, Thể thao và Du lịch',
        'Sở Du lịch',
        'Sở Lao động - Thương binh và Xã hội',
        'Sở Tài nguyên và Môi trường',
        'UBND' # Added UBND
    ]

    DRY_RUN = False  # Set to False to apply changes
    
    # Process all agencies starting with prefixes or mergers
    all_targets = Agency.objects.filter(name__startswith='Sở ') | Agency.objects.filter(name__startswith='UBND')
    updated_count = 0
    
    print(f"{'Trạng thái':<10} | {'Tên Cũ':<60} | {'Tên Mới'}")
    print("-" * 140)

    for agency in all_targets:
        original_name = agency.name
        temp_name = original_name
        
        # 1. Handle mergers first
        for old_p, new_p in mergers.items():
            if temp_name.startswith(old_p):
                temp_name = temp_name.replace(old_p, new_p)
                break
        
        # 2. Skip if already has 'tỉnh' or 'thành phố' or 'TP.'
        if ' tỉnh ' in temp_name or ' thành phố ' in temp_name or ' TP.' in temp_name:
            # If name changed due to merger but already has province/city, we still need to save if merged
            if temp_name != original_name:
                pass # Continue to save merger
            else:
                continue
            
        matched_prefix = None
        for p in prefixes:
            if temp_name.startswith(p):
                matched_prefix = p
                break
        
        if matched_prefix:
            # Extract location
            location = temp_name[len(matched_prefix):].strip()
            
            if location in cities:
                new_name = f"{matched_prefix} thành phố {location}"
            elif location in special_cases:
                new_name = f"{matched_prefix} {special_cases[location]}"
            elif location:
                # Only add 'tỉnh' if it's not already there
                if 'tỉnh' not in location and 'thành phố' not in location:
                     new_name = f"{matched_prefix} tỉnh {location}"
                else:
                     new_name = f"{matched_prefix} {location}"
            else:
                new_name = temp_name
            
            if new_name != original_name:
                status = "[Mô phỏng]" if DRY_RUN else "[Cập nhật]"
                print(f"{status:<10} | {original_name:<60} | {new_name}")
                if not DRY_RUN:
                    agency.name = new_name
                    agency.save()
                updated_count += 1

    print("-" * 140)
    print(f"Hoàn tất! Đã xử lý {updated_count} đơn vị. (Chế độ: {'Mô phỏng' if DRY_RUN else 'Thực thi'})")

if __name__ == "__main__":
    run()
