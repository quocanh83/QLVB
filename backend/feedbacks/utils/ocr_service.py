import os
import json
from django.conf import settings
from core.models import SystemSetting

class OCRService:
    def __init__(self, lang='vi'):
        self.lang = lang
        self.ocr = None
        self.dmp = None
        
        # Thử khởi tạo PaddleOCR
        try:
            from paddleocr import PaddleOCR
            self.ocr = PaddleOCR(use_angle_cls=True, lang=lang, show_log=False)
        except Exception as e:
            print(f"CRITICAL: Không thể khởi tạo PaddleOCR. Lỗi: {e}")

        # Thử khởi tạo Diff Match Patch
        try:
            from diff_match_patch import diff_match_patch
            self.dmp = diff_match_patch()
        except Exception as e:
            print(f"CRITICAL: Không thể khởi tạo diff_match_patch. Lỗi: {e}")

    def process_file(self, file_path):
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
        import fitz  # Lazy import
        doc = fitz.open(pdf_path)
        pages_results = []
        
        for page_index in range(len(doc)):
            page = doc.load_page(page_index)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
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
                'raw_text': 'Lỗi: PaddleOCR chưa được khởi tạo thành công trên Server (Thiếu thư viện hệ thống).',
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
                    raw_lines.append(line[1][0])
        
        raw_text = "\n".join(raw_lines)
        
        # 2. AI Correction
        corrected_text = self._ai_correct(raw_text)
        
        # 3. Calculate Diffs
        formatted_diffs = []
        if self.dmp:
            diffs = self.dmp.diff_main(raw_text, corrected_text)
            self.dmp.diff_cleanupSemantic(diffs)
            for op, data in diffs:
                t = 'equal'
                if op == 1: t = 'added'
                elif op == -1: t = 'removed'
                formatted_diffs.append({'text': data, 'type': t})
        else:
            formatted_diffs = [{'text': corrected_text, 'type': 'equal'}]

        rel_img_path = os.path.relpath(img_path, settings.MEDIA_ROOT).replace('\\', '/')
        image_url = settings.MEDIA_URL + rel_img_path

        return {
            'image_url': image_url,
            'raw_text': raw_text,
            'corrected_text': corrected_text,
            'diffs': formatted_diffs
        }

    def _ai_correct(self, text):
        if not text.strip():
            return ""

        db_setting = SystemSetting.objects.filter(key='OPENAI_API_KEY').first()
        api_key = db_setting.value if db_setting and db_setting.value else os.environ.get('OPENAI_API_KEY')
        
        if not api_key:
            return text

        from openai import OpenAI # Lazy import
        client = OpenAI(api_key=api_key)
        
        system_prompt = """Bạn là trợ lý AI chuyên gia về ngôn ngữ pháp luật xây dựng tại Việt Nam.
NHIỆM VỤ: 
1. Sửa toàn bộ lỗi chính tả do quá trình nhận diện OCR sai.
2. Bù đắp các từ bị mất hoặc bị mờ dựa trên ngữ cảnh pháp luật.
3. GIỮ NGUYÊN cấu trúc đoạn văn bản.
4. Trả về văn bản đã được chuẩn hóa hoàn toàn."""

        try:
            response = client.chat.completions.create(
                model="gpt-4o",
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
