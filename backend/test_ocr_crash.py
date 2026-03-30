"""Test script để kiểm tra PaddleOCR có crash tiến trình hay không."""
import os
import sys

os.environ['FLAGS_use_mkldnn'] = '0'
os.environ['FLAGS_enable_pir_in_executor'] = '0'

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.conf import settings
import fitz

print("=== STEP 1: Mở file PDF ===")
pdf_path = os.path.join(settings.MEDIA_ROOT, 'uploads_ocr', 'Phuc_dap.pdf')
if not os.path.exists(pdf_path):
    # Tìm file pdf bất kỳ
    ocr_dir = os.path.join(settings.MEDIA_ROOT, 'uploads_ocr')
    pdfs = [f for f in os.listdir(ocr_dir) if f.endswith('.pdf')]
    if pdfs:
        pdf_path = os.path.join(ocr_dir, pdfs[0])
        print(f"Dùng file: {pdf_path}")
    else:
        print("Không tìm thấy file PDF nào!")
        sys.exit(1)

doc = fitz.open(pdf_path)
page = doc.load_page(0)
pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))

temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_ocr')
os.makedirs(temp_dir, exist_ok=True)
img_path = os.path.join(temp_dir, 'test_crash.jpg')
pix.save(img_path)
doc.close()
print(f"=== STEP 2: Đã lưu ảnh trang 1: {img_path} ({os.path.getsize(img_path)} bytes) ===")

print("=== STEP 3: Khởi tạo PaddleOCR ===")
from paddleocr import PaddleOCR
ocr = PaddleOCR(
    use_angle_cls=False,
    lang='vi',
    enable_mkldnn=False,
    det_db_thresh=0.3,
    det_db_box_thresh=0.5,
    rec_batch_num=16
)
print("=== STEP 4: PaddleOCR đã sẵn sàng ===")

print("=== STEP 5: Bắt đầu OCR (đây là bước có thể crash) ===")
try:
    result = ocr.ocr(img_path)
    print(f"=== STEP 6: OCR hoàn tất! Số kết quả: {len(result)} ===")
    if result and result[0]:
        for i, line in enumerate(result[0][:5]):
            if isinstance(line, list) and len(line) > 1:
                text = line[1][0] if isinstance(line[1], tuple) else str(line[1])
                print(f"  Dòng {i+1}: {text}")
except Exception as e:
    print(f"=== LỖI OCR: {e} ===")
    import traceback
    traceback.print_exc()

print("=== HOÀN TẤT - Không crash ===")
