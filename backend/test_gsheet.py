import os, sys, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

import re
import gspread
from google.oauth2.service_account import Credentials

key_path = os.path.join(os.path.dirname(__file__), 'google_keys.json')
print('Key file exists:', os.path.exists(key_path))

scopes = ['https://www.googleapis.com/auth/spreadsheets']
try:
    creds = Credentials.from_service_account_file(key_path, scopes=scopes)
    client = gspread.authorize(creds)
    print('Auth OK')
    
    gs_url = 'https://docs.google.com/spreadsheets/d/13ZycPk_IxgK4Ns87BchiTM52Yj0sRU83PnPPL6GZYp0/edit#gid=0'
    match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', gs_url)
    sheet_id = match.group(1)
    print('Sheet ID:', sheet_id)
    
    sp = client.open_by_key(sheet_id)
    ws = sp.get_worksheet(0)
    headers = ws.row_values(1)
    print('Headers:', headers)
    print('Total data rows:', len(ws.get_all_values()) - 1)
    
    # Test ghi vào cột ND
    if 'ND' in headers:
        col_nd = headers.index('ND') + 1
        print(f'Cot ND o vi tri: {col_nd}')
    else:
        col_nd = len(headers) + 1
        ws.update_cell(1, col_nd, 'ND')
        print(f'Da tao cot ND o vi tri: {col_nd}')
    
    # Ghi OK vào dòng 2 (dòng dữ liệu đầu tiên)
    ws.update_cell(2, col_nd, 'OK')
    print('GHI THANH CONG! Kiem tra file GG Sheet ngay!')
    
except Exception as e:
    import traceback
    print('ERROR:', str(e))
    traceback.print_exc()
