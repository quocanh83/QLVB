import os
import re
import gspread
import hashlib
from google.oauth2.service_account import Credentials
from django.conf import settings

def normalize_label(l):
    if not l: return ""
    # Chuyển thường, bỏ dấu, bỏ mọi khoảng trắng và ký tự đặc biệt ở cuối
    # Ví dụ: "Điều 1." -> "dieu1", "Điều 1 a" -> "dieu1a"
    l = str(l).lower().strip()
    l = re.sub(r'[\s\.]+', '', l)
    return l

def extract_norm_label(text):
    """Trích xuất nhãn chuẩn hoá hạt nhân (Ví dụ: 'Điều 1. Phạm vi...' -> 'dieu1')"""
    if not text: return ""
    import unicodedata
    # NFC normalization for cross-platform stability (important for Vietnamese)
    text_s = unicodedata.normalize('NFC', str(text)).strip()
    
    # Tìm "Điều X", "Phụ lục X", "Chương X" hoặc các nhãn cố định như "Phần mở đầu"
    m = re.search(r'^(?:Điều|điều|Phụ lục|phụ lục|Chương|chương|Mục|mục)\s+([a-zA-Z0-9]+)', text_s, re.IGNORECASE)
    if m:
        # Trả về dạng dieu1, phuluc2...
        prefix = "dieu" if "iều" in text_s[:5].lower() else \
                 "phuluc" if "lục" in text_s[:10].lower() else \
                 "chuong" if "ương" in text_s[:10].lower() else \
                 "muc" if "mục" in text_s[:5].lower() else ""
        return f"{prefix}{m.group(1).lower()}"
    
    # Nhận diện các nhãn cố định quan trọng (Phần mở đầu, Lời nói đầu, Căn cứ)
    static_labels = {
        'phần mở đầu': 'phanmodau',
        'lời nói đầu': 'loinaidau',
        'căn cứ': 'cancu',
        'phần thứ': 'phanthu'
    }
    for key, val in static_labels.items():
        if text_s.lower().startswith(key):
            return val
    
    # Fallback: lấy 15 ký tự đầu chuẩn hóa
    return normalize_label(text_s[:15])

def get_content_fingerprint(text):
    """Tạo dấu vân tay cho nội dung để khớp fuzzy (bỏ qua khoảng trắng/xuống dòng)"""
    if not text: return ""
    import unicodedata
    # NFC normalization + remove ALL whitespace
    clean_text = unicodedata.normalize('NFC', str(text))
    clean_text = re.sub(r'[\s\xa0\u200b\ufeff]+', '', clean_text).lower()
    return clean_text[:50] # Lấy 50 ký tự đầu làm fingerprint

def sync_explanation_from_gsheet(sheet_url):
    """
    Kết nối Google Sheet và trích xuất dữ liệu. 
    Trả về bộ { key: { base, draft, exp, row_idx } }
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
            if i == 0: continue # Header
            
            # Cấu trúc: A: Gốc, B: Dự thảo, C: Thuyết minh, D: ID
            base_val = str(row[0]).strip() if len(row) >= 1 else ""
            draft_val = str(row[1]).strip() if len(row) >= 2 else ""
            exp_val = str(row[2]).strip() if len(row) >= 3 else ""
            id_val = str(row[3]).strip() if len(row) >= 4 else ""
            
            data = {
                'base': base_val,
                'draft': draft_val,
                'exp': exp_val,
                'row_idx': i
            }

            # 1. Key theo ID (Ưu tiên cao nhất - Tuyệt đối)
            if id_val.startswith('node_'):
                results[id_val] = data
            
            # 2. Key theo Cặp nhãn chuẩn hóa (Dựa trên Sơ đồ Mapping - Rất chính xác)
            label_base = extract_norm_label(base_val)
            label_draft = extract_norm_label(draft_val)
            
            if label_base or label_draft:
                pair_key = f"{label_base}|{label_draft}"
                # Chỉ lưu nếu chưa có ID match để tránh ghi đè
                if pair_key not in results:
                    results[pair_key] = data
                
                # Fallback: Lưu thêm label đơn lẻ nếu chưa có bất kỳ gì
                if label_draft and f"only_draft_{label_draft}" not in results:
                    results[f"only_draft_{label_draft}"] = data
                if label_base and f"only_base_{label_base}" not in results:
                    results[f"only_base_{label_base}"] = data
                
            # 3. Key theo Fingerprint (Fuzzy match - Dự phòng cuối cùng)
            fp_base = get_content_fingerprint(base_val)
            fp_draft = get_content_fingerprint(draft_val)
            if fp_draft and f"fp_d_{fp_draft}" not in results:
                results[f"fp_d_{fp_draft}"] = data
            if fp_base and f"fp_b_{fp_base}" not in results:
                results[f"fp_b_{fp_base}"] = data
        
        return results
        
    except gspread.exceptions.PermissionDenied:
        raise Exception("Quyền truy cập GSheet bị từ chối.")
    except Exception as e:
        raise Exception(f"Lỗi truy xuất GSheet: {str(e)}")

def push_explanations_to_gsheet(sheet_url, items_to_push):
    """
    Đẩy dữ liệu lên GSheet với thuật toán khớp đa lớp thông minh.
    items_to_push: [{ 'id', 'label', 'base_content', 'draft_content', 'explanation' }]
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
        
        # Tự động tạo headers nếu sheet trắng hoàn toàn
        if len(all_values) == 0:
            worksheet.append_row(["A: Gốc", "B: Dự thảo", "C: Thuyết minh", "D: ID (Vui lòng không sửa)"])
            all_values = worksheet.get_all_values()
            
        # 1. Xây dựng bản đồ đối soát từ GSheet hiện tại
        id_to_row = {}
        label_to_row = {}
        fingerprint_to_row = {}
        
        for i, row in enumerate(all_values):
            if i == 0: continue 
            
            # Khớp ID (Cột D)
            gs_id = str(row[3]).strip() if len(row) >= 4 else ""
            if gs_id.startswith('node_'):
                id_to_row[gs_id] = i
                
            # Khớp Nhãn chuẩn hóa (Cột A hoặc B)
            l_a = extract_norm_label(row[0]) if len(row) > 0 else ""
            l_b = extract_norm_label(row[1]) if len(row) > 1 else ""
            if l_a: label_to_row[l_a] = i
            elif l_b: label_to_row[l_b] = i
            
            # Khớp Fingerprint
            fp_a = get_content_fingerprint(row[0]) if len(row) > 0 else ""
            if fp_a: fingerprint_to_row[fp_a] = i
        
        updates = []
        new_rows = []
        
        for item in items_to_push:
            ref_id = item.get('id', '')
            label = item.get('label', '')
            base_content = item.get('base_content', '') or ""
            draft_content = item.get('draft_content', '') or ""
            explanation = item.get('explanation', '') or ""
            
            # Cấu trúc: [Gốc, Dự thảo, Thuyết minh, ID]
            # Content ở đây đã được xử lý gộp nhãn từ views.py, nên đẩy trực tiếp
            row_data = [
                base_content if base_content else label,
                draft_content if draft_content else label,
                explanation,
                ref_id
            ]
            
            row_idx = -1
            # Lớp 1: Khớp theo ID
            if ref_id in id_to_row:
                row_idx = id_to_row[ref_id]
            # Lớp 2: Khớp theo Nhãn chuẩn hóa
            elif extract_norm_label(label) in label_to_row:
                row_idx = label_to_row[extract_norm_label(label)]
            # Lớp 3: Khớp theo Fingerprint nội dung
            elif get_content_fingerprint(base_content) in fingerprint_to_row:
                row_idx = fingerprint_to_row[get_content_fingerprint(base_content)]
            
            if row_idx >= 0:
                range_name = f'A{row_idx + 1}:D{row_idx + 1}'
                updates.append({
                    'range': range_name,
                    'values': [row_data]
                })
            else:
                # Không khớp bất cứ lớp nào -> Thêm hàng mới
                new_rows.append(row_data)
        
        if updates:
            worksheet.batch_update(updates)
            
        if new_rows:
            worksheet.append_rows(new_rows)
                
    except Exception as e:
        raise Exception(f"Lỗi đẩy dữ liệu: {str(e)}")
