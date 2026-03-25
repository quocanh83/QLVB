import os

# 1. Update v2_template_generator.py logic
f_path = 'backend/feedbacks/utils/v2_template_generator.py'
with open(f_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update docstring to show new tags
old_doc = '13:     {{ export_date }}      — Ngày xuất báo cáo (dạng "ngày dd tháng mm năm yyyy")\r\n14:   Table[1] (bảng nội dung - lặp):\r\n15:     {% for d in dieu_list %}\r\n16:       d.node_label, d.content\r\n17:       {% for fb in d.feedbacks %}\r\n18:         fb.user_name, fb.content\r\n19:         {% for ex in fb.explanations %}\r\n20:           ex.content\r\n21:         {% endfor %}\r\n22:       {% endfor %}\r\n23:     {% endfor %}'

# Since Indentation and CRLF can vary, let's use a more robust replacement
import re

# Update _build_dieu_list function body
old_build_func = """    for fb in feedbacks:
        node_key = None
        node_label = ''
        node_content = ''

        if fb.node:
            node_key = fb.node.id
            node_label = fb.node.node_label or ''
            # Thêm cả parent node label nếu có
            if fb.node.parent:
                node_label = f"{fb.node.parent.node_label}, {node_label}"
            node_content = (fb.node.content or '')[:300]
        else:
            node_key = '__no_node__'
            node_label = 'Ý kiến chung'
            node_content = ''

        if node_key not in nodes_map:
            nodes_map[node_key] = {
                'node_label': node_label,
                'content': node_content,
                'feedbacks': []
            }
            node_order.append(node_key)

        # Lấy danh sách giải trình
        explanations_list = []
        if hasattr(fb, 'explanations'):
            for ex in fb.explanations.all():
                explanations_list.append({
                    'content': ex.content or ''
                })

        # Lấy tên cơ quan góp ý
        user_name = fb.contributing_agency or ''
        if not user_name and hasattr(fb, 'agency') and fb.agency:
            user_name = fb.agency.name

        nodes_map[node_key]['feedbacks'].append({
            'user_name': user_name,
            'content': fb.content or '',
            'explanations': explanations_list
        })"""

new_build_func = """    for i, fb in enumerate(feedbacks, 1):
        node_key = None
        node_label = ''
        node_content = ''

        if fb.node:
            node_key = fb.node.id
            node_label = fb.node.node_label or ''
            # Thêm cả parent node label nếu có
            if fb.node.parent:
                node_label = f"{fb.node.parent.node_label}, {node_label}"
            node_content = (fb.node.content or '')[:300]
        else:
            node_key = '__no_node__'
            node_label = 'Ý kiến chung'
            node_content = ''

        if node_key not in nodes_map:
            nodes_map[node_key] = {
                'node_label': node_label,
                'content': node_content,
                'feedbacks': []
            }
            node_order.append(node_key)

        # Lấy danh sách giải trình và Chuyên viên
        explanations_list = []
        chuyen_vien = ''
        if hasattr(fb, 'explanations'):
            for ex in fb.explanations.all():
                explanations_list.append({
                    'content': ex.content or ''
                })
                if not chuyen_vien and ex.user:
                    chuyen_vien = ex.user.username or ex.user.first_name

        # Lấy tên cơ quan góp ý
        user_name = fb.contributing_agency or ''
        if not user_name and hasattr(fb, 'agency') and fb.agency:
            user_name = fb.agency.name

        # Map status sang TV
        status_map = {'pending': 'Chưa xử lý', 'reviewed': 'Đã giải trình', 'approved': 'Đã duyệt'}
        status_tv = status_map.get(fb.status, fb.status)

        nodes_map[node_key]['feedbacks'].append({
            'stt': len(nodes_map[node_key]['feedbacks']) + 1, # STT trong tung Điều
            'stt_global': i, # STT tong the
            'user_name': user_name,
            'content': fb.content or '',
            'status': status_tv,
            'chuyen_vien': chuyen_vien or (fb.user.username if fb.user else ''),
            'time': fb.created_at.strftime("%d/%m/%Y") if fb.created_at else '',
            'explanations': explanations_list
        })"""

# Use a simpler way to replace if indentation is tricky using string search
if old_build_func.replace(' ', '') in content.replace(' ', ''):
    # This is rough, let's try finding the lines
    start_str = "    for fb in feedbacks:"
    end_str = "        })"
    # Find start and end indices
    start_idx = content.find(start_str)
    end_idx = content.find(end_str, start_idx) + len(end_str)
    
    if start_idx != -1 and end_idx != -1:
        new_content = content[:start_idx] + new_build_func + content[end_idx:]
        with open(f_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('v2_template_generator.py updated successfully')
    else:
        print('ERROR: Could not find build function markers')
else:
    print('ERROR: old_build_func not found for replacement')
