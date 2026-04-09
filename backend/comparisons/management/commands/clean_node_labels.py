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

        # 2. Xử lý Điều (Loại bỏ dấu chấm ở cuối nhãn Điều 1. -> Điều 1)
        article_nodes = ComparisonNode.objects.filter(node_type='Điều')
        article_count = 0
        for node in article_nodes:
            if node.node_label.endswith('.'):
                node.node_label = node.node_label[:-1]
                node.save()
                article_count += 1

        self.stdout.write(self.style.SUCCESS(f"Đã cập nhật: {count} mục Khoản/Điểm, {article_count} mục Điều."))
