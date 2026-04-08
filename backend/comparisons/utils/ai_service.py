import os
import json
import google.generativeai as genai
from openai import OpenAI
from django.conf import settings

class UnifiedAIService:
    def __init__(self):
        self.provider = self._get_config('AI_PROVIDER', 'gemini').lower()
        self.api_key = self._get_config('AI_API_KEY')
        self.model_name = self._get_config('AI_MODEL')

    def _get_config(self, key, default=None):
        from core.models import SystemSetting
        try:
            setting = SystemSetting.objects.filter(key=key).first()
            if setting and setting.value:
                return setting.value
        except Exception:
            pass
        return os.environ.get(key, default)

    def _get_client(self):
        if self.provider == 'gemini':
            genai.configure(api_key=self.api_key)
            model = genai.GenerativeModel(self.model_name or 'gemini-1.5-pro')
            return model
        elif self.provider == 'openai' or self.provider == 'openrouter':
            base_url = "https://openrouter.ai/api/v1" if self.provider == 'openrouter' else None
            client = OpenAI(api_key=self.api_key, base_url=base_url)
            return client
        return None

    def check_internal_references(self, draft_text):
        """MẪU LỆNH 1: RÀ SOÁT DẪN CHIẾU CHÉO"""
        system_role = (
            "Bạn là một Chuyên gia Pháp chế kỹ tính và một Trình phân tích Dữ liệu (Data Parser) xuất sắc.\n"
            "Nhiệm vụ: Tôi sẽ cung cấp cho bạn toàn văn của một văn bản dự thảo pháp luật. Hãy thực hiện rà soát theo các bước sau:\n"
            "1. Quét và trích xuất toàn bộ các cụm từ có tính chất dẫn chiếu nội bộ (Ví dụ: 'theo quy định tại Điều...', 'tại khoản... Điều... Nghị định này').\n"
            "2. Đối chiếu nội dung của điều khoản đang đọc (nơi chứa lời dẫn chiếu) với nội dung của điều khoản đích (nơi được dẫn chiếu đến).\n"
            "3. Đánh giá tính logic: Điều khoản đích có tồn tại không? Số thứ tự có bị sai lệch không? Nội dung của điều khoản đích có liên quan trực tiếp và giải quyết đúng vấn đề được dẫn chiếu hay không?\n"
            "QUY TẮC:\n"
            "- Tuyệt đối không tự bịa đặt thông tin.\n"
            "- Bỏ qua các dẫn chiếu đến văn bản pháp luật khác, chỉ tập trung vào dẫn chiếu nội bộ văn bản.\n"
            "- Đánh giá trạng thái: Valid (Hợp lệ), Missing (Không tồn tại), Logical Error (Sai lệch ngữ nghĩa).\n"
            "ĐỊNH DẠNG ĐẦU RA: Trả về kết quả ĐỘC NHẤT dưới định dạng JSON (không kèm markdown hay giải thích phụ)."
        )
        
        prompt = f"{system_role}\n\n[VĂN BẢN DỰ THẢO]:\n{draft_text}"
        
        return self._call_ai(prompt, is_json=True)

    def generate_automated_report(self, summary_text, draft_text, custom_request="Tạo báo cáo tóm tắt"):
        """MẪU LỆNH 2: ĐỐI CHIẾU & TẠO BÁO CÁO TỰ ĐỘNG"""
        system_role = (
            "Bạn là một Chuyên viên Phân tích Chính sách và Người chắp bút (Speechwriter) chuyên nghiệp, "
            "am hiểu sâu sắc về kỹ thuật lập pháp và ngôn ngữ hành chính.\n"
            "Nhiệm vụ: Đối chiếu nội dung giữa [VĂN BẢN 1 - TÓM TẮT] và [VĂN BẢN 2 - DỰ THẢO] để tạo ra bản báo cáo đầu ra.\n"
            "QUY TẮC:\n"
            "- Nguyên tắc 'Neo' sự thật: Dùng VĂN BẢN 2 làm cơ sở thực tế (Ground truth).\n"
            "- Xác thực nội dung: Nếu VĂN BẢN 1 nêu điểm mới mà VĂN BẢN 2 chưa có, đưa ra cảnh báo [THIẾU SÓT DỰ THẢO].\n"
            "- Văn phong: Trang trọng, rành mạch, đúng thuật ngữ pháp lý.\n"
            "- Định dạng: Markdown, sử dụng ### cho tiêu đề, * cho liệt kê, | cho bảng so sánh.\n"
            "Không thêm các câu giao tiếp thừa thãi."
        )
        
        prompt = (
            f"{system_role}\n\n"
            f"YÊU CẦU CỤ THỂ: {custom_request}\n\n"
            f"[VĂN BẢN 1 - TÓM TẮT]:\n{summary_text}\n\n"
            f"[VĂN BẢN 2 - DỰ THẢO]:\n{draft_text}"
        )
        
        return self._call_ai(prompt, is_json=False)

    def _call_ai(self, prompt, is_json=False):
        if not self.api_key:
            return {"error": "AI_API_KEY chưa được cấu hình."} if is_json else "Lỗi: AI_API_KEY chưa được cấu hình."
            
        try:
            if self.provider == 'gemini':
                model = self._get_client()
                response = model.generate_content(prompt)
                text = response.text
            else:
                client = self._get_client()
                model_name = self.model_name or ("qwen/qwen-2.5-72b-instruct" if self.provider == 'openrouter' else "gpt-4o")
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": prompt}]
                )
                text = response.choices[0].message.content

            if is_json:
                # Làm sạch markdown json nếu AI trả về kèm ```json ... ```
                clean_json = text.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:]
                if clean_json.endswith("```"):
                    clean_json = clean_json[:-3]
                return json.loads(clean_json.strip())
            return text
        except Exception as e:
            msg = f"Lỗi AI ({self.provider}): {str(e)}"
            return {"error": msg} if is_json else msg
