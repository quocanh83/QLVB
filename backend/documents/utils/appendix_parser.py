import docx
import re

class AppendixParser:
    def __init__(self, file_obj):
        self.doc = docx.Document(file_obj)
        
    def parse(self):
        """
        Tách các phụ lục dựa trên tiêu đề 'Phụ lục ...'
        Tự động tìm tiêu đề ở dòng tiếp theo, bỏ qua các ghi chú 'Ban hành kèm theo...'
        """
        paragraphs = self.doc.paragraphs
        appendices = []
        current_appendix = None
        
        # Regex nhận diện phần định danh (PHỤ LỤC IX, Phụ lục IIa, Phụ lục 1...)
        # Chấp nhận số La mã, số thường và chữ cái phụ (a, b...)
        appendix_regex = re.compile(r'^(PHỤ\s+LỤC\s*[IVXLCDM\d]*\s*[a-z]?)\b', re.IGNORECASE | re.UNICODE)
        
        # Regex bỏ qua các nội dung không phải tiêu đề (ngày tháng, số hiệu, chú thích)
        # Bao gồm: (Ban hành kèm theo...), (Kèm theo...), ngày ... tháng ... năm, Nghị định số...
        ignore_regex = re.compile(
            r'^\s*\(|' + 
            r'\bBan\s+hành\s+kèm\s+theo\b|' +
            r'\bKèm\s+theo\b|' +
            r'^ngày\s+(\d+|\.+|_+)[\s\xa0]+tháng|' +
            r'\bSố\s*:\s*\d+|' +
            r'\bNghị\s+định\s+số\b|' +
            r'\bcủa\s+Chính\s+phủ\b',
            re.IGNORECASE | re.UNICODE
        )
        
        for i, para in enumerate(paragraphs):
            text = para.text.strip()
            if not text:
                continue
            
            match = appendix_regex.match(text)
            if match:
                # Nếu đã có phụ lục đang xử lý, lưu lại
                if current_appendix:
                    appendices.append(current_appendix)
                
                base_name = match.group(1).strip()
                
                # Trích xuất tiêu đề
                title = ""
                # 1. Thử lấy phần text còn lại ngay trên dòng định danh (sau dấu : hoặc dấu cách)
                remainder = text[match.end():].strip().lstrip(':').strip()
                if remainder and not ignore_regex.search(remainder):
                    title = remainder
                else:
                    # 2. Nếu không có ở dòng 1, tìm ở tối đa 5 dòng tiếp theo
                    for j in range(i + 1, min(i + 6, len(paragraphs))):
                        next_text = paragraphs[j].text.strip()
                        if not next_text:
                            continue
                        # Bỏ qua dòng ngày tháng, chú thích...
                        if ignore_regex.search(next_text):
                            continue
                        # Nếu gặp Phụ lục mới hoặc đoạn văn quá dài (>200) thì thôi tìm tiêu đề
                        if appendix_regex.match(next_text) or len(next_text) > 200:
                            break
                        # Tìm thấy dòng chữ đầu tiên hợp lệ -> Tiêu đề
                        title = next_text
                        break
                
                # Ưu tiên hiển thị: 'Phụ lục I: TÊN TIÊU ĐỀ'
                full_name = f"{base_name}: {title}" if title else base_name
                
                current_appendix = {
                    'name': full_name,
                    'content': text + "\n"
                }
            else:
                if current_appendix:
                    current_appendix['content'] += text + "\n"
        
        # Lưu phụ lục cuối cùng
        if current_appendix:
            appendices.append(current_appendix)
            
        return appendices
