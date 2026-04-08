from difflib import SequenceMatcher
import re

def legislative_diff(old_text, new_text):
    """
    So sánh hai văn bản cấp độ từ. 
    Các từ mới trong new_text sẽ được bọc trong thẻ <i> để hiển thị in nghiêng.
    """
    if not old_text:
        return f"<i>{new_text}</i>"
    if not new_text:
        return ""

    def tokenize(text):
        # Tách từ, giữ lời khoảng trắng và ký hiệu
        return re.findall(r'\s+|\w+|[^\w\s]', text, re.UNICODE)

    words_old = tokenize(old_text)
    words_new = tokenize(new_text)

    s = SequenceMatcher(None, words_old, words_new)
    result = []
    
    for tag, i1, i2, j1, j2 in s.get_opcodes():
        if tag == 'equal':
            result.append("".join(words_new[j1:j2]))
        elif tag in ('insert', 'replace'):
            # Với nội dung mới hoặc thay đổi, in nghiêng toàn bộ block mới
            content = "".join(words_new[j1:j2])
            if content.strip():
                result.append(f"<i>{content}</i>")
            else:
                result.append(content)
        elif tag == 'delete':
            # Nội dung bị xóa khỏi bản dự thảo thì không hiển thị (theo yêu cầu bản dự thảo)
            pass
            
    return "".join(result)
