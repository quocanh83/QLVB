"""Test Mistral AI OCR."""
import os, sys, time, json
import mimetypes
import base64

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from feedbacks.utils.ocr_service import OCRService

def test_mistral():
    service = OCRService()
    if not service.client:
        print("Lỗi: MISTRAL_API_KEY không tồn tại.")
        return

    test_file = r"c:\Users\Quoc Anh\Desktop\QLVB\Phuc_dap.pdf"
    if not os.path.exists(test_file):
        print(f"Lỗi: Không tìm thấy file {test_file}")
        return

    print(f"--- Đang test Mistral OCR với file: {os.path.basename(test_file)} ---")
    t0 = time.time()
    results = service.process_file(test_file)
    print(f"--- Hoàn tất sau {time.time()-t0:.1f}s ---")
    
    # Ghi kết quả ra file để kiểm tra
    output_temp = r"c:\Users\Quoc Anh\Desktop\QLVB\mistral_ocr_raw_test.md"
    with open(output_temp, "w", encoding="utf-8") as f:
        for i, page in enumerate(results):
            f.write(f"# TRANG {i+1}\n\n")
            f.write(page['corrected_text'])
            f.write("\n\n---\n\n")
    
    print(f"Done! Kết quả lưu tại: {output_temp}")

if __name__ == "__main__":
    test_mistral()
