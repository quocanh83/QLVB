import re
from django.core.management.base import BaseCommand
from comparisons.models import ComparisonNode

class Command(BaseCommand):
    help = 'Chuẩn hóa nhãn và nội dung của các mục so sánh (loại bỏ Khoản, Điểm)'

    def handle(self, *args, **options):
        # 1. Xử lý Khoản và Điểm
        nodes = ComparisonNode.objects.filter(node_type__in=['Khoản', 'Điểm'])
        count = 0
        self.stdout.write(f"Đang xử lý {nodes.count()} mục Khoản/Điểm...")

        for node in nodes:
            original_label = node.node_label
            original_content = node.content
            changed = False

            # Chuẩn hóa nhãn (node_label)
            new_label = re.sub(r'^Khoản\s+(\d+)', r'\1.', node.node_label, flags=re.IGNORECASE)
            new_label = re.sub(r'^Điểm\s+([a-zđ])', r'\1)', new_label, flags=re.IGNORECASE)
            
            if new_label != node.node_label:
                node.node_label = new_label
                changed = True

            # Chuẩn hóa nội dung (content)
            # Loại bỏ tiền tố "Khoản 1" hoặc "Điểm a" VÀ các dấu phân cách thừa (:, ., )) ở đầu nội dung
            # Bước A: Xóa tiền tố chữ nếu có
            node.content = re.sub(r'^(Khoản\s+\d+|Điểm\s+[a-zđ])', '', node.content, flags=re.IGNORECASE).strip()
            # Bước B: Xóa các dấu phân cách thừa sót lại ở đầu nội dung (:, ., ))
            node.content = re.sub(r'^[\.\:\)\s]+', '', node.content).strip()

            if node.content != original_content:
                changed = True

            if changed:
                node.save()
                count += 1

        # 2. Xử lý Điều (Gột tiêu đề vào nhãn)
        article_nodes = ComparisonNode.objects.filter(node_type='Điều')
        article_count = 0
        for node in article_nodes:
            # Nếu nhãn chỉ có dạng "Điều 1" hoặc "Điều 1." (chưa có tiêu đề đi kèm)
            if re.match(r'^Điều\s+\d+\.?$', node.node_label, flags=re.IGNORECASE):
                # Lấy dòng đầu tiên của content làm tiêu đề nếu nội dung không trống
                if node.content:
                    lines = node.content.split('\n')
                    first_line = lines[0].strip()
                    
                    # Nếu dòng đầu tiên ngắn và không bắt đầu bằng Khoản/Số thứ tự (điềm báo là tiêu đề)
                    if len(first_line) > 0 and len(first_line) < 300 and not re.match(r'^(\d+[\.\:]|Khoản|Điểm)', first_line, re.IGNORECASE):
                        # Cập nhật nhãn mới
                        num_match = re.search(r'\d+', node.node_label)
                        if num_match:
                            num = num_match.group()
                            node.node_label = f"Điều {num}. {first_line}"
                            # Xóa tiêu đề khỏi phần nội dung
                            node.content = '\n'.join(lines[1:]).strip()
                            node.save()
                            article_count += 1
            
            # Trường hợp nhãn đã có tiêu đề nhưng vẫn còn dấu chấm ở cuối số thứ tự (Điều 1. Tiêu đề -> Điều 1. Tiêu đề)
            # Thực tế "Điều 1." là chuẩn, nên ta giữ nguyên dấu chấm nếu sau đó là tiêu đề.
            # Nếu nhãn là "Điều 1." (không tiêu đề) thì bỏ dấu chấm.
            elif node.node_label.endswith('.') and not re.search(r'\.\s+.+', node.node_label):
                 node.node_label = node.node_label[:-1]
                 node.save()
                 article_count += 1

        self.stdout.write(self.style.SUCCESS(f"Đã cập nhật: {count} mục Khoản/Điểm, {article_count} mục Điều."))
