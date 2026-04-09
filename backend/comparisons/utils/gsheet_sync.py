import os
import re
import gspread
from google.oauth2.service_account import Credentials
from django.conf import settings

def normalize_label(l):
    if not l: return ""
    # Chuyển thường, bỏ dấu chấm, bỏ mọi khoảng trắng
    return str(l).lower().replace('.', '').replace(' ', '').strip()

def sync_explanation_from_gsheet(sheet_url):
    """
    Kết nối Google Sheet và trích xuất dữ liệu thuyết minh.
    Trả về báo cáo dictionary { nhãn_chuẩn_hoá: nội_dung_thuyết_minh }
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
            if len(row) >= 1:
                label_val = str(row[0]).strip()
                exp_val = str(row[2]).strip() if len(row) >= 3 else ""
                
                if not label_val:
                    continue
                
                # Chuẩn hoá nhãn để làm key chính xác
                norm_key = normalize_label(label_val)
                
                if norm_key in results:
                    results[norm_key] += f"\n{exp_val}"
                else:
                    results[norm_key] = exp_val
        
        return results
        
    except gspread.exceptions.PermissionDenied:
        raise Exception("Quyền truy cập GSheet bị từ chối. Hãy Share quyền cho Email dịch vụ.")
    except Exception as e:
        raise Exception(f"Lỗi truy xuất GSheet: {str(e)}")

def push_explanations_to_gsheet(sheet_url, items_to_push):
    """
    Đẩy dữ liệu từ hệ thống lên Google Sheet.
    items_to_push: danh sách [{ label: 'Điều 1', content: '...' }]
    """
    key_path = os.path.join(settings.BASE_DIR, 'google_keys.json')
    if not os.path.exists(key_path):
        raise Exception("Không tìm thấy tệp cấu hình Google trên Server.")

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
        
        # Chuẩn hóa nhãn tuyệt đối (Bỏ tất cả dấu chấm và khoảng trắng)
        def normalize_label(l):
            if not l: return ""
            # Chuyển thường, bỏ dấu chấm, bỏ mọi khoảng trắng
            res = str(l).lower().replace('.', '').replace(' ', '').strip()
            return res

        # Map normalized_label -> row_index (0-based)
        label_to_row_idx = {}
        for i, row in enumerate(all_values):
            if i == 0: continue 
            if len(row) > 0:
                raw_label = str(row[0]).strip()
                if raw_label:
                    norm = normalize_label(raw_label)
                    label_to_row_idx[norm] = i
        
        updates = []
        new_rows = []
        
        for item in items_to_push:
            label = item['label']
            content = item['content']
            norm_label = normalize_label(label)
            
            if norm_label in label_to_row_idx:
                row_idx = label_to_row_idx[norm_label]
                # Cấu trúc gspread update: range, values
                # Cột C là cột thứ 3 (index 2) -> R{row_idx+1}C3
                range_name = f'C{row_idx + 1}'
                updates.append({
                    'range': range_name,
                    'values': [[content]]
                })
            else:
                # Nếu không thấy, chuẩn bị thêm dòng mới: Cột A = Nhãn, Cột B = rỗng, Cột C = Thuyết minh
                new_rows.append([label, '', content])
        
        # Thực hiện Batch Update (Nhanh và an toàn quota)
        if updates:
            worksheet.batch_update(updates)
            
        # Thêm các dòng mới nếu có
        if new_rows:
            worksheet.append_rows(new_rows)
                
    except gspread.exceptions.PermissionDenied:
        raise Exception("Không có quyền ghi vào GSheet. Hãy Share quyền Editor cho email trong google_keys.json.")
    except Exception as e:
        raise Exception(f"Lỗi đẩy dữ liệu lên GSheet: {str(e)}")

