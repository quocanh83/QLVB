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
        raise Exception(f"Không tìm thấy tệp cấu hình Google: {key_path}. Vui lòng liên hệ quản trị viên.")

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
            raise Exception("Đường dẫn Google Sheet không hợp lệ. Vui lòng kiểm tra lại URL.")
        
        sheet_id = match.group(1)
        spreadsheet = client.open_by_key(sheet_id)
        # Lấy trang tính đầu tiên
        worksheet = spreadsheet.get_worksheet(0)
        
        all_values = worksheet.get_all_values()
        results = {}

        for row in all_values:
            if len(row) >= 3:
                c1 = str(row[0]).strip() # Cột A: Số Điều
                c2 = str(row[2]).strip() # Cột C: Thuyết minh
                
                if not c1:
                    continue
                
                # Tìm số thứ tự Điều (Ví dụ: "Điều 1" -> "1")
                m = re.search(r'[\u0110\u0111]i\u1ec1u\s+(\d+)', c1, re.IGNORECASE)
                if m:
                    article_num = m.group(1)
                    if article_num in results:
                        results[article_num] += f"\n{c2}"
                    else:
                        results[article_num] = c2
        
        return results
        
    except gspread.exceptions.PermissionDenied:
        raise Exception("Quyền truy cập bị từ chối. Hãy đảm bảo bạn đã Share quyền Viewer cho email trong google_keys.json.")
    except Exception as e:
        raise Exception(f"Lỗi đồng bộ GSheet: {str(e)}")
