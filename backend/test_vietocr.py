"""Test VietOCR hybrid với file Phuc_dap.pdf."""
import os, sys, time

os.environ['FLAGS_use_mkldnn'] = '0'
os.environ['FLAGS_enable_pir_in_executor'] = '0'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

t_start = time.time()
from feedbacks.utils.ocr_service import OCRService
service = OCRService()
print(f"=== Khởi tạo OCR: {time.time()-t_start:.1f}s ===")

t_ocr = time.time()
results = service.process_file(r"c:\Users\Quoc Anh\Desktop\QLVB\Phuc_dap.pdf")
print(f"\n=== Tổng thời gian OCR: {time.time()-t_ocr:.1f}s ===")
print(f"=== Số trang: {len(results)} ===\n")

with open('ocr_vietocr_result.txt', 'w', encoding='utf-8') as f:
    for i, page in enumerate(results):
        f.write(f"=== TRANG {i+1} ===\n")
        f.write(page['raw_text'])
        f.write("\n\n")

print("Kết quả đã ghi vào ocr_vietocr_result.txt")
