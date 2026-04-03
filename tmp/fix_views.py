import os
filepath = r'c:\Users\Quoc Anh\Desktop\QLVB\backend\feedbacks\views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = """        # 5. Thống kê cấp ý kiến (mới bổ sung)
        AGREED_REGEX = r'thống\\s+nhất|nhất\\s+trí'
        ACCEPTED_REGEX = r'tiếp\\s+thu'
        
        total_fbs = query.count()
        count_agreed = query.filter(models.Q(content__iregex=AGREED_REGEX)).count()
        
        # Feedback có giải trình 'tiếp thu'
        from .models import Explanation
        accepted_fb_ids = Explanation.objects.filter(
            target_type='Feedback',
            content__iregex=ACCEPTED_REGEX
        ).values_list('object_id', flat=True)
        
        # Feedback có giải trình nhưng không tiếp thu
        count_explained_no_acc = query.filter(
            explanations__isnull=False
        ).exclude(
            id__in=accepted_fb_ids
        ).distinct().count()
        
        # Feedback chưa giải trình
        count_pending = query.filter(explanations__isnull=True).count()

        return Response({
            'agency_stats': agency_stats_list,
            'category_stats': category_stats,
            'invited_category_stats': invited_category_stats,
            'available_categories': sorted(list(found_categories)),
            'summary': {
                'total_fbs': total_fbs,
                'total_agreed': count_agreed,
                'total_accepted': count_accepted,
                'total_explained_no_acc': count_explained_no_acc,
                'total_pending': count_pending
            }
        })"""

replacement = """        # 5. Thống kê cấp ý kiến (Quy tắc mới)
        AGREED_PHRASE = "thống nhất với nội dung dự thảo Nghị định"
        
        # Tính số lượng cơ quan thống nhất (từ toàn bộ query)
        count_agreed = query.filter(content__icontains=AGREED_PHRASE)\\
            .values('agency_id', 'contributing_agency').distinct().count()
        
        # Tập dữ liệu loại trừ các ý kiến thống nhất để tính các thông số khác
        active_query = query.exclude(content__icontains=AGREED_PHRASE)
        
        total_fbs = active_query.count()
        
        from .models import Explanation
        # Lấy danh sách ID các ý kiến có giải trình tiếp thu
        accepted_fb_ids = Explanation.objects.filter(
            target_type='Feedback',
            content__iregex=r'tiếp\\s+thu'
        ).values_list('object_id', flat=True)
        
        # Lấy danh sách ID các ý kiến có giải trình tiếp thu một phần
        partial_fb_ids = Explanation.objects.filter(
            target_type='Feedback',
            content__iregex=r'tiếp\\s+thu\\s+một\\s+phần'
        ).values_list('object_id', flat=True)
        
        count_accepted = active_query.filter(id__in=accepted_fb_ids).distinct().count()
        count_partial = active_query.filter(id__in=partial_fb_ids).distinct().count()
        
        # Feedback có giải trình nhưng không tiếp thu (và không thống nhất)
        count_explained_no_acc = active_query.filter(
            explanations__isnull=False
        ).exclude(
            id__in=accepted_fb_ids
        ).distinct().count()
        
        # Feedback chưa giải trình (và không thống nhất)
        count_pending = active_query.filter(explanations__isnull=True).count()

        return Response({
            'agency_stats': agency_stats_list,
            'category_stats': category_stats,
            'invited_category_stats': invited_category_stats,
            'available_categories': sorted(list(found_categories)),
            'summary': {
                'total_fbs': total_fbs,
                'total_agreed': count_agreed,
                'total_accepted': count_accepted,
                'total_partial': count_partial,
                'total_explained_no_acc': count_explained_no_acc,
                'total_pending': count_pending
            }
        })"""

if target in content:
    new_content = content.replace(target, replacement)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Success")
else:
    # Try normalizing line endings or spaces if it failed
    target_norm = target.replace('\\n', os.linesep)
    if target_norm in content:
        new_content = content.replace(target_norm, replacement)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Success with normalized line endings")
    else:
        print("Target not found in content")
