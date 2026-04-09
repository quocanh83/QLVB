import os
import re
import gspread
from google.oauth2.service_account import Credentials
from django.conf import settings

def sync_explanation_from_gsheet(sheet_url):
    """
    Kết nối Google Sheet và trích xuất dữ liệu thuyết minh.
    Trả về báo cáo dictionary { số_điều_chuỗi: nội_dung_thuyết_minh }
    """
    # Đường dẫn tệp key mặc định của hệ thống
    key_path = os.path.join(settings.BASE_DIR, 'google_keys.json')
    if not os.path.exists(key_path):
        raise Exception("Hệ thống chưa cấu hình tệp google_keys.json trên server.")

    scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    
    try:
        creds = Credentials.from_service_account_file(key_path, scopes=scopes)
        client = gspread.authorize(creds)

        # Trích xuất Sheet ID từ URL
        match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', sheet_url)
        if not match:
            raise Exception("URL Google Sheet không hợp lệ. Vui lòng kiểm tra lại đường dẫn.")
        
        sheet_id = match.group(1)
        spreadsheet = client.open_by_key(sheet_id)
        worksheet = spreadsheet.get_worksheet(0)
        
        all_values = worksheet.get_all_values()
        results = {}

        for i, row in enumerate(all_values):
            if i == 0: continue # Bỏ qua dòng tiêu đề
            if len(row) >= 1:
                label_val = str(row[0]).strip()
                # Thuyết minh nằm ở cột C (index 2), nếu dòng ngắn hơn thì lấy rỗng
                exp_val = str(row[2]).strip() if len(row) >= 3 else ""
                
                if not label_val:
                    continue
                
                # Tìm số thứ tự Điều (Ví dụ: "Điều 1" -> "1")
                # Hỗ trợ cả Đ hoa và đ thường
                m = re.search(r'(?:Điều|điều)\s+(\d+)', label_val, re.IGNORECASE)
                if m:
                    article_num = m.group(1)
                    if article_num in results:
                        results[article_num] += f"\n{exp_val}"
                    else:
                        results[article_num] = exp_val
                else:
                    # Nếu không khớp "Điều X", lấy toàn bộ nhãn làm key
                    results[label_val] = exp_val
        
        return results
        
    except gspread.exceptions.PermissionDenied:
        raise Exception("Quyền truy cập GSheet bị từ chối. Hãy Share quyền cho Email dịch vụ trong google_keys.json.")
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
        
        # Chuẩn hóa nhãn để khớp chính xác hơn (Ví dụ: "Điều 1." -> "Điều 1")
        def normalize_label(l):
            if not l: return ""
            return re.sub(r'[\s\.]+', ' ', str(l).strip()).lower()

        # Map normalized_label -> row_index (1-based)
        label_to_row = {}
        for i, row in enumerate(all_values):
            if i == 0: continue 
            if len(row) > 0:
                raw_label = str(row[0]).strip()
                if raw_label:
                    norm = normalize_label(raw_label)
                    label_to_row[norm] = i + 1
        
        for item in items_to_push:
            label = item['label']
            content = item['content']
            norm_label = normalize_label(label)
            
            if norm_label in label_to_row:
                row_idx = label_to_row[norm_label]
                # Cập nhật Cột C (index 3)
                worksheet.update_cell(row_idx, 3, content)
            else:
                # Nếu không thấy, thêm dòng mới xuống cuối: Cột A = Nhãn, Cột C = Nội dung
                worksheet.append_row([label, '', content])
                
    except gspread.exceptions.PermissionDenied:
        raise Exception("Không có quyền ghi vào GSheet. Hãy Share quyền Editor cho email trong google_keys.json.")
    except Exception as e:
        raise Exception(f"Lỗi đẩy dữ liệu lên GSheet: {str(e)}")

