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
            
            # Cột A: Gốc, B: Dự thảo, C: Thuyết minh
            base_val = str(row[0]).strip() if len(row) >= 1 else ""
            draft_val = str(row[1]).strip() if len(row) >= 2 else ""
            exp_val = str(row[2]).strip() if len(row) >= 3 else ""
            
            # Ưu tiên lấy nhãn từ cột Gốc hoặc Dự thảo
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

        # Map normalized_label -> row_index (0-based)
        label_map = {}
        for i, row in enumerate(all_values):
            if i == 0: continue 
            # Tìm nhãn ở cột A hoặc cột B
            label_a = extract_norm_label(row[0]) if len(row) > 0 else ""
            label_b = extract_norm_label(row[1]) if len(row) > 1 else ""
            
            if label_a: label_map[label_a] = i
            if label_b: label_map[label_b] = i
        
        updates = []
        new_rows = []
        
        for item in items_to_push:
            label = item['label']
            base_content = item.get('base_content', '')
            draft_content = item.get('draft_content', '')
            explanation = item.get('explanation', '')
            
            norm_key = normalize_label(label)
            
            # Chuẩn bị dữ liệu 3 cột cho hàng này
            row_data = [base_content, draft_content, explanation]
            
            if norm_key in label_map:
                row_idx = label_map[norm_key]
                # Cập nhật dải ô A-C của hàng row_idx+1
                range_name = f'A{row_idx + 1}:C{row_idx + 1}'
                updates.append({
                    'range': range_name,
                    'values': [row_data]
                })
            else:
                # Nếu không thấy, thêm dòng mới 3 cột
                new_rows.append(row_data)
        
        if updates:
            worksheet.batch_update(updates)
            
        if new_rows:
            worksheet.append_rows(new_rows)
                
    except gspread.exceptions.PermissionDenied:
        raise Exception("Không có quyền Editor trên GSheet. Hãy Share Editor cho email dịch vụ.")
    except Exception as e:
        raise Exception(f"Lỗi đẩy dữ liệu: {str(e)}")
