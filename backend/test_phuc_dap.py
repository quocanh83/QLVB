"""Test OCR với file Phuc_dap.pdf của người dùng."""
import os
import sys

os.environ['FLAGS_use_mkldnn'] = '0'
os.environ['FLAGS_enable_pir_in_executor'] = '0'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.conf import settings
import fitz

pdf_path = r"c:\Users\Quoc Anh\Desktop\QLVB\Phuc_dap.pdf"
print(f"=== File: {pdf_path} ({os.path.getsize(pdf_path)} bytes) ===")

doc = fitz.open(pdf_path)
print(f"=== Số trang: {len(doc)} ===")

page = doc.load_page(0)
pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
print(f"=== Ảnh trang 1: {pix.width}x{pix.height} pixels ===")

temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_ocr')
os.makedirs(temp_dir, exist_ok=True)
img_path = os.path.join(temp_dir, 'test_phuc_dap.jpg')
pix.save(img_path)
doc.close()

print("=== Khởi tạo PaddleOCR ===")
from paddleocr import PaddleOCR
ocr = PaddleOCR(use_angle_cls=False, lang='vi', enable_mkldnn=False,
                det_db_thresh=0.3, det_db_box_thresh=0.5, rec_batch_num=16)
print("=== PaddleOCR sẵn sàng. Bắt đầu OCR... ===")

try:
    result = ocr.ocr(img_path)
    print(f"=== OCR hoàn tất! ===")
    if result:
        for page_result in result:
            if page_result:
                for i, line in enumerate(page_result):
                    if isinstance(line, list) and len(line) > 1:
                        text = line[1][0] if isinstance(line[1], tuple) else str(line[1])
                        conf = line[1][1] if isinstance(line[1], tuple) else 0
                        print(f"  [{i+1}] ({conf:.2f}) {text}")
except Exception as e:
    print(f"=== LỖI: {e} ===")
    import traceback
    traceback.print_exc()

print("=== HOÀN TẤT ===")
