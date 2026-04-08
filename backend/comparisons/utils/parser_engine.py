import docx
import re

class ComparisonParser:
    def __init__(self, file_path_or_obj):
        self.doc = docx.Document(file_path_or_obj)
        self.nodes = []
        self.current_chapter = None
        self.current_article = None
        self.current_clause = None
        self.index = 0

    def parse(self):
        """
        Bóc tách cấu trúc văn bản chuẩn: Chương -> Điều -> Khoản -> Điểm.
        """
        for para in self.doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue

            # 1. Dừng hoàn toàn nếu gặp "Phụ lục"
            if re.match(r'^Phụ\s+lục', text, re.IGNORECASE):
                break

            # 2. Loại bỏ Footnote
            if re.match(r'^\[\d+\]', text) or (len(text) < 110 and re.match(r'^\d+\.?\s', text) and not self.current_article):
                if not re.match(r'^Điều\s+\d+', text, re.IGNORECASE): 
                    continue

            # 3. Nhận diện Chương
            chapter_match = re.match(r'^(Chương\s+([IVXLCDM\d]+|[a-zđăâêôơư]+))[:\.]?\s*(.*)', text, re.IGNORECASE)
            if chapter_match:
                node = self._create_node('Chương', chapter_match.group(1).strip(), chapter_match.group(3).strip())
                self.nodes.append(node)
                self.current_chapter = node
                self.current_article = None
                self.current_clause = None
                continue

            # 4. Nhận diện Điều (Chỉ dùng Regex tiêu chuẩn)
            article_match = re.match(r'^Điều\s+([\d\.]+)\s*[\.:-]?\s*(.*)', text, re.IGNORECASE)
            if article_match:
                label = article_match.group(1).strip()
                if not label.startswith("Điều"): label = f"Điều {label}"
                content = article_match.group(2).strip()
                
                node = self._create_node('Điều', label, content)
                if self.current_chapter:
                    self.current_chapter['children'].append(node)
                else:
                    self.nodes.append(node)
                self.current_article = node
                self.current_clause = None
                continue

            # 5. Xử lý Tiêu đề Chương (Dòng đầu tiên sau Chương nếu không phải Điều)
            if self.current_chapter and not self.current_chapter['content'] and not self.current_chapter['children'] and not self.current_article:
                if len(text) < 220:
                    self.current_chapter['content'] = text
                    continue

            # 6. Nhận diện Khoản
            clause_match = re.match(r'^(\d+)\.\s*(.*)', text)
            if clause_match and self.current_article:
                node = self._create_node('Khoản', f"Khoản {clause_match.group(1)}", clause_match.group(2).strip())
                self.current_article['children'].append(node)
                self.current_clause = node
                continue

            # 7. Nhận diện Điểm
            point_match = re.match(r'^([a-zđ])\)\s*(.*)', text, re.IGNORECASE)
            if point_match and self.current_clause:
                node = self._create_node('Điểm', f"Điểm {point_match.group(1)}", point_match.group(2).strip())
                self.current_clause['children'].append(node)
                continue

            # 8. Nội dung cộng dồn
            if self.current_clause:
                self.current_clause['content'] += f"\n{text}"
            elif self.current_article:
                self.current_article['content'] += f"\n{text}"
            elif self.current_chapter:
                self.current_chapter['content'] += f"\n{text}"
            else:
                if self.nodes and self.nodes[-1]['node_type'] == 'Vấn đề khác':
                    self.nodes[-1]['content'] += f"\n{text}"
                else:
                    node = self._create_node('Vấn đề khác', 'Phần mở đầu', text)
                    self.nodes.append(node)

        return self.nodes

    def _is_bold(self, para):
        """Kiểm tra xem toàn bộ đoạn văn có được in đậm không"""
        if para.runs:
            # Chỉ kiểm tra các run có chứa text thực sự
            real_runs = [r for r in para.runs if r.text.strip()]
            if real_runs and all(r.bold for r in real_runs):
                return True
        return False

    def _create_node(self, node_type, label, content):
        node = {
            'node_type': node_type,
            'node_label': label,
            'content': content,
            'children': [],
            'order_index': self.index
        }
        self.index += 1
        return node
