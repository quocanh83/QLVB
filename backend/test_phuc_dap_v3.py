"""Test OCR v3 - Đọc đúng format OCRResult."""
import os, sys

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

with open('ocr_result_v3.txt', 'w', encoding='utf-8') as f:
    for idx, page_res in enumerate(result):
        f.write(f"--- Page {idx} ---\n")
        f.write(f"Type: {type(page_res).__name__}\n")
        f.write(f"Dir: {[a for a in dir(page_res) if not a.startswith('_')]}\n\n")
        
        # Thử đọc các thuộc tính phổ biến
        for attr in ['rec_texts', 'rec_scores', 'dt_polys', 'text_type']:
            if hasattr(page_res, attr):
                val = getattr(page_res, attr)
                f.write(f"{attr} (type={type(val).__name__}):\n")
                if isinstance(val, (list, tuple)):
                    for i, v in enumerate(val[:20]):
                        f.write(f"  [{i}] {repr(v)[:200]}\n")
                else:
                    f.write(f"  {repr(val)[:500]}\n")
                f.write("\n")
        
        # Thử dùng dict
        if hasattr(page_res, 'keys'):
            f.write(f"Keys: {list(page_res.keys())}\n")
        if hasattr(page_res, '__getitem__'):
            try:
                f.write(f"page_res['rec_texts']: {repr(page_res['rec_texts'])[:500]}\n")
            except:
                pass

print("Done! Xem file ocr_result_v3.txt")
