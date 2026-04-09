import os
import re
import gspread
from google.oauth2.service_account import Credentials
from django.conf import settings

def normalize_label(l):
    if not l: return ""
    # Chuyển thường, bỏ dấu chấm, bỏ mọi khoảng trắng
    return str(l).lower().replace('.', '').replace(' ', '').strip()

def extract_norm_label(text):
    """Trích xuất nhãn chuẩn hoá từ nội dung ô (Ví dụ: 'Điều 1. Phạm vi...' -> 'dieu1')"""
    if not text: return ""
    # Tìm "Điều X" hoặc "Phụ lục X" ở đầu chuỗi (cho phép dấu cách/dấu chấm)
    m = re.search(r'^(?:Điều|điều|Phụ lục|phụ lục)\s+(\d+|[A-Z]+)', str(text).strip(), re.IGNORECASE)
    if m:
        return normalize_label(m.group(0))
    return normalize_label(str(text)[:20])

def sync_explanation_from_gsheet(sheet_url):
    """
    Kết nối Google Sheet và trích xuất dữ liệu 3 cột. 
    Trả về bộ { nhãn: { base, draft, exp } }
    """
    key_path = os.path.join(settings.BASE_DIR, 'google_keys.json')
    if not os.path.exists(key_path):
        raise Exception("Hệ thống chưa cấu hình tệp google_keys.json trên server.")

    scopes = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    
    try:
        creds = Credentials.from_service_account_file(key_path, scopes=scopes)
        client = gspread.authorize(creds)

        match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', sheet_url)
        if not match:
            raise Exception("URL Google Sheet không hợp lệ.")
        
        sheet_id = match.group(1)
        spreadsheet = client.open_by_key(sheet_id)
        worksheet = spreadsheet.get_worksheet(0)
        
        all_values = worksheet.get_all_values()
        results = {}

        for i, row in enumerate(all_values):
            if i == 0: continue # Bỏ qua dòng tiêu đề
            
            # Cấu trúc 4 cột mới: A: ID, B: Gốc, C: Dự thảo, D: Thuyết minh
            # Dự phòng cấu trúc 3 cột cũ: A: Gốc, B: Dự thảo, C: Thuyết minh
            if len(row) >= 4 and str(row[0]).startswith('node_'):
                row_id = str(row[0]).strip()
                base_val = str(row[1]).strip()
                draft_val = str(row[2]).strip()
                exp_val = str(row[3]).strip()
                norm_key = row_id # Dùng Luôn ID làm key
            else:
                # Fallback cấu trúc 3 cột cũ
                base_val = str(row[0]).strip() if len(row) >= 1 else ""
                draft_val = str(row[1]).strip() if len(row) >= 2 else ""
                exp_val = str(row[2]).strip() if len(row) >= 3 else ""
                norm_key = extract_norm_label(base_val) or extract_norm_label(draft_val)
            
            if not norm_key:
                continue
                
            if norm_key not in results:
                results[norm_key] = {
                    'base': base_val,
                    'draft': draft_val,
                    'exp': exp_val
                }
        
        return results
        
    except gspread.exceptions.PermissionDenied:
        raise Exception("Quyền truy cập GSheet bị từ chối.")
    except Exception as e:
        raise Exception(f"Lỗi truy xuất GSheet: {str(e)}")

def push_explanations_to_gsheet(sheet_url, items_to_push):
    """
    Đẩy dữ liệu so sánh 3 cột (Gốc, Dự thảo, Thuyết minh) lên Google Sheet.
    items_to_push: [{ 'label': 'Điều 1', 'base_content': '...', 'draft_content': '...', 'explanation': '...' }]
    """
    key_path = os.path.join(settings.BASE_DIR, 'google_keys.json')
    if not os.path.exists(key_path):
        raise Exception("Hệ thống chưa cấu hình tệp google_keys.json trên server.")

    scopes = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    
    try:
        creds = Credentials.from_service_account_file(key_path, scopes=scopes)
        client = gspread.authorize(creds)

        match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', sheet_url)
        if not match:
            raise Exception("URL Google Sheet không hợp lệ.")
        
        sheet_id = match.group(1)
        spreadsheet = client.open_by_key(sheet_id)
        worksheet = spreadsheet.get_worksheet(0)
        
        all_values = worksheet.get_all_values()
        
        # Hàm trích xuất nhãn từ nội dung (Ví dụ: "Điều 1. Phạm vi..." -> "dieu1")
        def extract_norm_label(text):
            if not text: return ""
            # Tìm "Điều X" hoặc "Phụ lục X" ở đầu chuỗi (cho phép dấu cách/dấu chấm)
            m = re.search(r'^(?:Điều|điều|Phụ lục|phụ lục)\s+(\d+|[A-Z]+)', str(text).strip(), re.IGNORECASE)
            if m:
                return normalize_label(m.group(0))
            return normalize_label(text[:20]) # Fallback lấy 20 ký tự đầu

        # 1. Xây dựng bản đồ đối soát từ GSheet hiện tại
        # Map: ID (cột A) -> row_index HOẶC Label -> row_index
        id_map = {}
        label_map = {}
        
        for i, row in enumerate(all_values):
            if i == 0: continue 
            
            first_col = str(row[0]).strip() if len(row) > 0 else ""
            if first_col.startswith('node_'):
                id_map[first_col] = i
            else:
                # Fallback cho GSheet cũ: Tìm nhãn ở cột A/B
                l_a = extract_norm_label(row[0]) if len(row) > 0 else ""
                l_b = extract_norm_label(row[1]) if len(row) > 1 else ""
                if l_a: label_map[l_a] = i
                if l_b: label_map[l_b] = i
        
        updates = []
        new_rows = []
        
        for item in items_to_push:
            ref_id = item.get('id', '') # Mã node dạng node_123
            label = item['label']
            base_content = item.get('base_content', '')
            draft_content = item.get('draft_content', '')
            explanation = item.get('explanation', '')
            
            # Dữ liệu chuẩn 4 cột: [ID, Gốc, Dự thảo, Thuyết minh]
            row_data = [ref_id, base_content, draft_content, explanation]
            
            row_idx = -1
            # Lớp 1: Khớp theo ID (Chính xác tuyệt đối)
            if ref_id in id_map:
                row_idx = id_map[ref_id]
            # Lớp 2: Khớp theo Nhãn (Dành cho việc nâng cấp GSheet cũ)
            elif normalize_label(label) in label_map:
                row_idx = label_map[normalize_label(label)]
            
            if row_idx >= 0:
                # Cập nhật dải ô A-D của hàng row_idx+1
                range_name = f'A{row_idx + 1}:D{row_idx + 1}'
                updates.append({
                    'range': range_name,
                    'values': [row_data]
                })
            else:
                # Nếu không thấy cả ID lẫn Nhãn, thêm dòng mới 4 cột
                new_rows.append(row_data)
        
        if updates:
            worksheet.batch_update(updates)
            
        if new_rows:
            worksheet.append_rows(new_rows)
                
    except gspread.exceptions.PermissionDenied:
        raise Exception("Không có quyền Editor trên GSheet. Hãy Share Editor cho email dịch vụ.")
    except Exception as e:
        raise Exception(f"Lỗi đẩy dữ liệu: {str(e)}")
