import os
import time
import base64
import mimetypes
from django.conf import settings
from core.models import SystemSetting
from mistralai.client import Mistral

_mistral_client = None
_dmp_instance = None


def get_ocr_instance():
    return OCRService()


class OCRService:
    def __init__(self):
        self.client = self._get_mistral_client()
        self.dmp = self._get_dmp()

    def _get_mistral_client(self):
        global _mistral_client
        if _mistral_client is not None:
            return _mistral_client

        api_key = os.environ.get('MISTRAL_API_KEY')
        if not api_key:
            db_setting = SystemSetting.objects.filter(key='MISTRAL_API_KEY').first()
            api_key = db_setting.value if db_setting else None

        if api_key:
            _mistral_client = Mistral(api_key=api_key)
            return _mistral_client
        return None

    def _get_dmp(self):
        global _dmp_instance
        if _dmp_instance is not None:
            return _dmp_instance
        try:
            from diff_match_patch import diff_match_patch
            _dmp_instance = diff_match_patch()
            return _dmp_instance
        except:
            return None

    def _parse_page_ranges(self, pages_str):
        """Chuyển đổi chuỗi '1, 2, 4-6' thành [0, 1, 3, 4, 5]"""
        indices = set()
        if not pages_str: return list(indices)
        
        parts = [p.strip() for p in pages_str.split(',')]
        for part in parts:
            if '-' in part:
                try:
                    start, end = part.split('-')
                    for i in range(int(start), int(end) + 1):
                        indices.add(i - 1)
                except: pass
            else:
                try:
                    indices.add(int(part) - 1)
                except: pass
        return sorted(list(indices))

    def process_file(self, file_path, target_pages=None):
        """
        Xử lý file OCR. target_pages có thể là một danh sách các số trang (1-indexed).
        """
        if not self.client:
            return [{'image_url': '', 'raw_text': 'Lỗi: MISTRAL_API_KEY chưa được cấu hình.', 'corrected_text': '', 'diffs': []}]

        ext = os.path.splitext(file_path)[1].lower()
        mime_type, _ = mimetypes.guess_type(file_path)
        
        # Thư mục tạm cho ảnh trang
        temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_ocr')
        os.makedirs(temp_dir, exist_ok=True)

        import fitz
        
        # 1. Cắt PDF nếu có target_pages
        final_file_path = file_path
        page_indices = []
        if ext == '.pdf' and target_pages:
            try:
                # Chuyển đổi target_pages sang 0-indexed indices cho fitz
                if isinstance(target_pages, str):
                    # Giả sử target_pages là "1-3, 5"
                    page_indices = self._parse_page_ranges(target_pages)
                else:
                    page_indices = [int(p) - 1 for p in target_pages]
                
                if page_indices:
                    doc = fitz.open(file_path)
                    # Lọc bỏ các chỉ số trang không hợp lệ
                    valid_indices = [i for i in page_indices if 0 <= i < len(doc)]
                    if valid_indices:
                        doc.select(valid_indices)
                        sliced_filename = f"sliced_{os.path.basename(file_path)}"
                        sliced_path = os.path.join(temp_dir, sliced_filename)
                        doc.save(sliced_path)
                        final_file_path = sliced_path
                        print(f"--- [OCR Service] Đã cắt PDF còn {len(valid_indices)} trang. ---")
                    doc.close()
            except Exception as e:
                print(f"--- [OCR Service] Lỗi khi cắt PDF: {e} ---")

        # 2. Chuyển đổi file (gốc hoặc đã cắt) sang Base64
        with open(final_file_path, "rb") as f:
            base64_data = base64.b64encode(f.read()).decode("utf-8")
        
        data_url = f"data:{mime_type};base64,{base64_data}"
        
        if ext == '.pdf':
            doc_payload = {"type": "document_url", "document_url": data_url}
        else:
            doc_payload = {"type": "image_url", "image_url": data_url}

        print(f"--- [Mistral OCR] Đang gửi yêu cầu xử lý tích hợp: {os.path.basename(final_file_path)} ---")
        t0 = time.time()
        
        try:
            response = self.client.ocr.process(
                model="mistral-ocr-latest",
                document=doc_payload
            )
            print(f"--- [Mistral OCR] Hoàn tất sau {time.time()-t0:.1f}s ---")
        except Exception as e:
            print(f"--- [Mistral OCR] Lỗi API: {e} ---")
            return [{'image_url': '', 'raw_text': f'Lỗi Mistral API: {e}', 'corrected_text': '', 'diffs': []}]

        # 3. Tạo ảnh các trang phục vụ hiển thị (Nếu là PDF đã cắt thì chỉ hiện các trang đó)
        results = []
        page_images = []
        if ext == '.pdf':
            doc = fitz.open(final_file_path)
            for i in range(len(doc)):
                page = doc.load_page(i)
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                img_name = f"view_{os.urandom(4).hex()}_{i}.jpg"
                img_p = os.path.join(temp_dir, img_name)
                pix.save(img_p)
                rel_p = os.path.relpath(img_p, settings.MEDIA_ROOT).replace('\\', '/')
                page_images.append(settings.MEDIA_URL + rel_p)
            doc.close()
            
            # Xóa file cắt tạm sau khi xong (tùy chọn)
            if final_file_path != file_path:
                try: os.remove(final_file_path)
                except: pass
        else:
            rel_p = os.path.relpath(file_path, settings.MEDIA_ROOT).replace('\\', '/')
            page_images.append(settings.MEDIA_URL + rel_p)

        # Map Mistral pages to our UI format
        for i, page in enumerate(response.pages):
            markdown_content = page.markdown
            # raw_text: Chúng ta coi text thô là bản Markdown nhưng xóa bớt định dạng nếu cần
            # Ở đây để đơn giản, ta dùng cùng một nội dung nhưng diffs sẽ là rỗng (vì Mistral đã rất tốt rồi)
            
            # Lấy ảnh tương ứng (nếu có)
            img_url = page_images[i] if i < len(page_images) else ""
            
            results.append({
                'image_url': img_url,
                'raw_text': markdown_content,
                'corrected_text': markdown_content,
                'diffs': [{'text': markdown_content, 'type': 'equal'}]
            })

        return results
