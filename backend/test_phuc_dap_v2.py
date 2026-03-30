"""Test OCR v2 - In kết quả ra file để xem rõ."""
import os, sys, json

os.environ['FLAGS_use_mkldnn'] = '0'
os.environ['FLAGS_enable_pir_in_executor'] = '0'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.conf import settings
import fitz

pdf_path = r"c:\Users\Quoc Anh\Desktop\QLVB\Phuc_dap.pdf"
doc = fitz.open(pdf_path)
page = doc.load_page(0)
pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))

temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_ocr')
os.makedirs(temp_dir, exist_ok=True)
img_path = os.path.join(temp_dir, 'test_phuc_dap.jpg')
pix.save(img_path)
doc.close()

from paddleocr import PaddleOCR
ocr = PaddleOCR(use_angle_cls=False, lang='vi', enable_mkldnn=False,
                det_db_thresh=0.3, det_db_box_thresh=0.5, rec_batch_num=16)

result = ocr.ocr(img_path)

# Ghi kết quả ra file
with open('ocr_result.txt', 'w', encoding='utf-8') as f:
    f.write(f"Type of result: {type(result)}\n")
    f.write(f"Length: {len(result) if result else 0}\n\n")
    
    if result:
        for idx, page_res in enumerate(result):
            f.write(f"--- Page {idx} (type={type(page_res)}) ---\n")
            if page_res is None:
                f.write("  None\n")
                continue
            if hasattr(page_res, '__len__'):
                f.write(f"  Len: {len(page_res)}\n")
            # In raw repr của 3 item đầu
            items = list(page_res) if hasattr(page_res, '__iter__') else [page_res]
            for i, item in enumerate(items[:10]):
                f.write(f"  [{i}] type={type(item)}, repr={repr(item)[:300]}\n")

print("Done! Xem file ocr_result.txt")
