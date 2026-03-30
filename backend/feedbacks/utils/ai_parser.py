import os
import json
from django.conf import settings
from core.models import SystemSetting
from mistralai.client import Mistral

class AIParser:
    def __init__(self):
        self.client = self._get_mistral_client()

    def _get_mistral_client(self):
        # Ưu tiên lấy từ biến môi trường
        api_key = os.environ.get('MISTRAL_API_KEY')
        
        # Nếu không có, tìm trong SystemSetting (DB)
        if not api_key:
            db_setting = SystemSetting.objects.filter(key='MISTRAL_API_KEY').first()
            if db_setting:
                api_key = db_setting.value
        
        if not api_key:
            print("[AI Parser] Cảnh báo: Không tìm thấy MISTRAL_API_KEY.")
            return None
            
        return Mistral(api_key=api_key)

    def parse_text_to_feedbacks(self, text):
        """
        Sử dụng Mistral AI để bóc tách văn bản (Markdown/Thô) sang danh sách Góp ý có cấu trúc.
        """
        if not self.client:
            return None

        system_prompt = """Bạn là một chuyên gia phân tích dữ liệu pháp luật. 
Nhiệm vụ của bạn là chuyển đổi văn bản trích xuất từ OCR (có thể là bảng biểu Markdown hoặc văn bản thô) sang định dạng JSON có cấu trúc để nạp vào cơ sở dữ liệu.

ĐỊNH DẠNG ĐẦU RA JSON (Mảng các đối tượng):
[
  {
    "node_label": "Điều/Khoản tương ứng (VD: Điều 5, Khoản 2, hoặc 'Vấn đề khác')",
    "content": "Nội dung góp ý chi tiết (Gộp cả Lý do nếu có để làm rõ bối cảnh)",
    "agency": "Tên cơ quan góp ý (nếu có trong bảng, không có thì để trống)"
  }
]

QUY TẮC PHÂN TÍCH:
1. Nếu gặp Bảng biểu Markdown: Mỗi hàng trong bảng (trừ header) phải trở thành 1 đối tượng JSON.
2. Cột 'TT' hoặc 'Số thứ tự' bỏ qua.
3. Nếu cột 'Lý do' tách riêng, hãy nối nó vào sau 'Nội dung góp ý' để người dùng dễ theo dõi.
4. Nhận diện thông minh Điều/Khoản: Nếu cột ghi 'Điều 5, Khoản 4' -> node_label="Điều 5, Khoản 4".
5. CHỈ TRẢ VỀ JSON NGUYÊN BẢN, KHÔNG CÓ LỜI DẪN GIẢI."""

        user_prompt = f"Hãy bóc tách văn bản sau đây sang JSON:\n\n{text}"

        try:
            response = self.client.chat.complete(
                model="mistral-large-latest",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            # Làm sạch nếu AI trả về markdown block
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
                
            data = json.loads(content)
            # Mistral response_format might return {"feedbacks": [...]} or just the array
            if isinstance(data, dict):
                for key in ['feedbacks', 'data', 'results']:
                    if key in data and isinstance(data[key], list):
                        return data[key]
                return [data] if 'node_label' in data else []
            return data
        except Exception as e:
            print(f"[AI Parser] Lỗi khi gọi API Mistral: {str(e)}")
            return None
