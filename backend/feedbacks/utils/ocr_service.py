import os
import fitz  # PyMuPDF
# Chuyển PaddleOCR vào trong __init__ để tránh lỗi import khi khởi động Django
import cv2
import numpy as np
import json
from openai import OpenAI
from diff_match_patch import diff_match_patch
from django.conf import settings
from core.models import SystemSetting

class OCRService:
    def __init__(self, lang='vi'):
        self.lang = lang
        try:
            from paddleocr import PaddleOCR
            # Initialize PaddleOCR (only once if possible)
            self.ocr = PaddleOCR(use_angle_cls=True, lang=lang, show_log=False)
        except Exception as e:
            print(f"CRITICAL: Không thể khởi tạo PaddleOCR. Lỗi: {e}")
            self.ocr = None
            
        self.dmp = diff_match_patch()

    def process_file(self, file_path):
        """
        Main entry point: Detects file type and processes accordingly.
        Returns: { 'pages': [ { 'image_url': '...', 'raw_text': '...', 'corrected_text': '...', 'diffs': [] } ] }
        """
        ext = os.path.splitext(file_path)[1].lower()
        results = []
        
        temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_ocr')
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)

        if ext == '.pdf':
            results = self._process_pdf(file_path, temp_dir)
        elif ext in ['.jpg', '.jpeg', '.png']:
            results = [self._process_image(file_path, temp_dir)]
        
        return results

    def _process_pdf(self, pdf_path, temp_dir):
        doc = fitz.open(pdf_path)
        pages_results = []
        
        for page_index in range(len(doc)):
            page = doc.load_page(page_index)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2)) # Zoom for better OCR
            img_filename = f"ocr_{os.path.basename(pdf_path)}_{page_index}.jpg"
            img_path = os.path.join(temp_dir, img_filename)
            pix.save(img_path)
            
            res = self._process_image(img_path, temp_dir)
            pages_results.append(res)
            
        doc.close()
        return pages_results

    def _process_image(self, img_path, temp_dir):
        if not self.ocr:
            return {
                'image_url': '',
                'raw_text': 'Lỗi: PaddleOCR chưa được khởi tạo thành công trên Server.',
                'corrected_text': '',
                'diffs': []
            }
            
        # 1. Run OCR
        result = self.ocr.ocr(img_path, cls=True)
        raw_lines = []
        for idx in range(len(result)):
            res = result[idx]
            if res:
                for line in res:
                    raw_lines.append(line[1][0]) # line[1][0] is the text
        
        raw_text = "\n".join(raw_lines)
        
        # 2. AI Correction
        corrected_text = self._ai_correct(raw_text)
        
        # 3. Calculate Diffs for highlighting
        # Diff returns a list of tuples: (op, content) where op is 0 (equal), 1 (insert), -1 (delete)
        # We want to map these to 'is_changed' flags for words.
        diffs = self.dmp.diff_main(raw_text, corrected_text)
        self.dmp.diff_cleanupSemantic(diffs)
        
        # Prepare a more frontend-friendly diff format
        # Instead of raw DMP, we return segments: {text: string, type: 'equal'|'added'|'removed'}
        formatted_diffs = []
        for op, data in diffs:
            t = 'equal'
            if op == 1: t = 'added'
            elif op == -1: t = 'removed'
            formatted_diffs.append({'text': data, 'type': t})

        # Relative image URL for frontend
        rel_img_path = os.path.relpath(img_path, settings.MEDIA_ROOT).replace('\\', '/')
        image_url = settings.MEDIA_URL + rel_img_path

        return {
            'image_url': image_url,
            'raw_text': raw_text,
            'corrected_text': corrected_text,
            'diffs': formatted_diffs
        }

    def _ai_correct(self, text):
        """Uses LLM to fix Vietnamese spelling and legal context."""
        if not text.strip():
            return ""

        db_setting = SystemSetting.objects.filter(key='OPENAI_API_KEY').first()
        api_key = db_setting.value if db_setting and db_setting.value else os.environ.get('OPENAI_API_KEY')
        
        if not api_key:
            return text # Fallback to raw if no API key

        client = OpenAI(api_key=api_key)
        
        system_prompt = """Bạn là trợ lý AI chuyên gia về ngôn ngữ pháp luật xây dựng tại Việt Nam.
NHIỆM VỤ: 
1. Sửa toàn bộ lỗi chính tả do quá trình nhận diện OCR sai (ví dụ: 'Đìêu' thành 'Điều', 'Khaỏn' thành 'Khoản').
2. Bù đắp các từ bị mất hoặc bị mờ dựa trên ngữ cảnh các văn bản pháp luật hiện hành (Luật Xây dựng, Nghị định, Thông tư...).
3. GIỮ NGUYÊN cấu trúc đoạn văn. KHÔNG tóm tắt. KHÔNG thêm bình luận.
4. Trả về văn bản đã được chuẩn hóa hoàn toàn."""

        try:
            response = client.chat.completions.create(
                model="gpt-4o", # As recommended or gpt-3.5-turbo if cost is concern
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Hãy sửa và chuẩn hóa đoạn văn sau:\n\n{text}"}
                ],
                temperature=0.3
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"AI Correction Error: {e}")
            return text
