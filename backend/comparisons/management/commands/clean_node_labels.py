import re
from django.core.management.base import BaseCommand
from comparisons.models import ComparisonNode

class Command(BaseCommand):
    help = 'Chuẩn hóa nhãn và nội dung của các mục so sánh (loại bỏ Khoản, Điểm)'

    def handle(self, *args, **options):
        nodes = ComparisonNode.objects.filter(node_type__in=['Khoản', 'Điểm'])
        count = 0
        
        self.stdout.write(f"Đang xử lý {nodes.count()} mục...")

        for node in nodes:
            original_label = node.node_label
            original_content = node.content
            changed = False

            # 1. Chuẩn hóa nhãn (node_label)
            # "Khoản 1" -> "1."
            new_label = re.sub(r'^Khoản\s+(\d+)', r'\1.', node.node_label, flags=re.IGNORECASE)
            # "Điểm a" -> "a)"
            new_label = re.sub(r'^Điểm\s+([a-zđ])', r'\1)', new_label, flags=re.IGNORECASE)
            
            if new_label != node.node_label:
                node.node_label = new_label
                changed = True

            # 2. Chuẩn hóa nội dung (content)
            # Loại bỏ "Khoản 1:" hoặc "Khoản 1." ở đầu nội dung nếu có
            node.content = re.sub(r'^(Khoản\s+\d+[\.\:]\s*)', '', node.content, flags=re.IGNORECASE).strip()
            # Loại bỏ "Điểm a:" hoặc "Điểm a)" ở đầu nội dung nếu có
            node.content = re.sub(r'^(Điểm\s+[a-zđ][\)\.\:]\s*)', '', node.content, flags=re.IGNORECASE).strip()

            if node.content != original_content:
                changed = True

            if changed:
                node.save()
                count += 1

        self.stdout.write(self.style.SUCCESS(f"Đã cập nhật thành công {count} mục."))
