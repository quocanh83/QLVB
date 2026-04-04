import docx
import re

class ParserEngine:
    def __init__(self, file_path_or_obj):
        self.doc = docx.Document(file_path_or_obj)
        self.nodes = []
        self.current_chapter = None
        self.current_article = None
        self.current_clause = None
        self.index = 0

    def parse(self):
        """
        Duyệt qua các đoạn văn bản và bóc tách cấu trúc theo thứ tự phân cấp:
        Chương -> Điều -> Khoản -> Điểm.
        Phụ lục được coi là các node độc lập hoặc ở cấp cao.
        """
        for para in self.doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue

            # 1. Nhận diện Chương (Chương I, Chương 1, Chương Một...)
            chapter_match = re.match(r'^(Chương\s+([IVXLCDM\d]+|[a-zđăâêôơư]+))[:\.]?\s*(.*)', text, re.IGNORECASE)
            if chapter_match:
                node = {
                    'node_type': 'Chương',
                    'node_label': chapter_match.group(1).strip() if chapter_match.group(1) else "Chương",
                    'content': chapter_match.group(2).strip(),
                    'children': [],
                    'order_index': self.index
                }
                self.nodes.append(node)
                self.current_chapter = node
                self.current_article = None
                self.current_clause = None
                self.index += 1
                continue

            # 2. Nhận diện Phụ lục (Phụ lục I, Phụ lục 1, PHỤ LỤC...)
            appendix_match = re.match(r'^(Phụ\s+lục\s*([IVXLCDM\d]*|[a-zđăâêôơư]*))[:\.]?\s*(.*)', text, re.IGNORECASE)
            if appendix_match:
                node = {
                    'node_type': 'Phụ lục',
                    'node_label': appendix_match.group(1).strip(),
                    'content': appendix_match.group(2).strip(),
                    'children': [],
                    'order_index': self.index
                }
                self.nodes.append(node)
                # Reset hierarchy for new appendix
                self.current_chapter = None
                self.current_article = None
                self.current_clause = None
                self.index += 1
                continue

            # 3. Nhận diện Điều
            article_match = re.match(r'^(Điều\s+\d+[\w\.]*)[\.:]?\s*(.*)', text, re.IGNORECASE)
            if article_match:
                node = {
                    'node_type': 'Điều',
                    'node_label': article_match.group(1).strip(),
                    'content': article_match.group(2).strip(),
                    'children': [],
                    'order_index': self.index
                }
                
                if self.current_chapter:
                    self.current_chapter['children'].append(node)
                else:
                    self.nodes.append(node)
                
                self.current_article = node
                self.current_clause = None
                self.index += 1
                continue

            # 4. Nhận diện Khoản (e.g., "1. ", "2. ")
            clause_match = re.match(r'^(\d+)\.\s*(.*)', text)
            if clause_match and self.current_article:
                node = {
                    'node_type': 'Khoản',
                    'node_label': f"Khoản {clause_match.group(1)}",
                    'content': clause_match.group(2).strip(),
                    'children': [],
                    'order_index': self.index
                }
                self.current_article['children'].append(node)
                self.current_clause = node
                self.index += 1
                continue

            # 5. Nhận diện Điểm (e.g., "a) ", "b) ")
            point_match = re.match(r'^([a-zđ])\)\s*(.*)', text, re.IGNORECASE)
            if point_match and self.current_clause:
                node = {
                    'node_type': 'Điểm',
                    'node_label': f"Điểm {point_match.group(1)}",
                    'content': point_match.group(2).strip(),
                    'children': [],
                    'order_index': self.index
                }
                self.current_clause['children'].append(node)
                self.index += 1
                continue

            # 6. Nếu không khớp gì, cộng dồn vào content của node hiện tại (backwards compatibility)
            if self.current_clause:
                self.current_clause['content'] += f"\n{text}"
            elif self.current_article:
                self.current_article['content'] += f"\n{text}"
            elif self.current_chapter:
                self.current_chapter['content'] += f"\n{text}"
            else:
                # Ghost text at the beginning
                pass

        return self.nodes
