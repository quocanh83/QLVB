import os
import django
from datetime import date

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from documents.models import Document, DocumentNode
from feedbacks.models import Feedback, Explanation
from accounts.models import User
from docxtpl import DocxTemplate

def main():
    doc_obj = Document.objects.first()
    if not doc_obj:
        print("Lỗi: Không tìm thấy Document nào trong DB. Hãy chạy lại test_parse.py trước.")
        return
        
    user, _ = User.objects.get_or_create(username="test_user", defaults={"full_name": "Người dùng Test"})
    
    # Tạo fake data (góp ý, giải trình) nếu chưa có
    if not Feedback.objects.filter(document=doc_obj).exists():
        print("Tạo dữ liệu Góp ý và Giải trình giả lập...")
        dieu1 = DocumentNode.objects.filter(document=doc_obj, node_type="Điều").first()
        if dieu1:
            fb1 = Feedback.objects.create(
                document=doc_obj,
                node=dieu1,
                user=user,
                content="Mock Feedback Lên Điều: Đề nghị chỉnh sửa lại toàn bộ nội dung phần phạm vi điều chỉnh cho phù hợp với Luật mới."
            )
            Explanation.objects.create(
                target=fb1,
                user=user,
                content="Mock Explanation Lên Điều: Đã tiếp thu một phần và sẽ sửa đổi trong Dự thảo lần 2."
            )
            
        khoan1 = DocumentNode.objects.filter(document=doc_obj, node_type="Khoản").first()
        if khoan1:
            fb2 = Feedback.objects.create(
                document=doc_obj,
                node=khoan1,
                user=user,
                content="Mock Feedback Lên Khoản: Khoản này quy định chưa chặt chẽ, dễ gây hiểu lầm."
            )
            Explanation.objects.create(
                target=fb2,
                user=user,
                content="Mock Explanation Lên Khoản: Cơ quan soạn thảo xin bảo lưu quan điểm vì quy định này đã được cân nhắc kỹ."
            )

    # Thêm Mock data cho các trường mới nếu chưa có
    if not doc_obj.drafting_agency:
        doc_obj.drafting_agency = "BỘ THÔNG TIN VÀ TRUYỀN THÔNG"
        doc_obj.agency_location = "Hà Nội"
        doc_obj.save()

    from django.contrib.contenttypes.models import ContentType
    feedback_ct = ContentType.objects.get_for_model(Feedback)

    print("Đang truy vấn và gom dữ liệu thành JSON phân cấp...")
    data = {
        "agency_name": doc_obj.drafting_agency,
        "headquarters_location": doc_obj.agency_location,
        "document_title": doc_obj.project_name,
        "export_date": date.today().strftime("%d/%m/%Y"),
        "dieu_list": []
    }
    
    dieu_nodes = DocumentNode.objects.filter(document=doc_obj, node_type="Điều").order_by('order_index')
    for dieu in dieu_nodes:
        dieu_dict = {
            "node_label": dieu.node_label,
            "content": dieu.content,
            "feedbacks": [],
            "khoan_list": []
        }
        
        # Lặp Góp ý của Điều
        for fb in dieu.feedbacks.all():
            exps = Explanation.objects.filter(content_type=feedback_ct, object_id=fb.id)
            fb_dict = {
                "user_name": fb.user.username,
                "content": fb.content,
                "explanations": [{"user_name": exp.user.username, "content": exp.content} for exp in exps]
            }
            dieu_dict["feedbacks"].append(fb_dict)
            
        # Lặp Khoản
        for khoan in dieu.children.filter(node_type="Khoản").order_by('order_index'):
            khoan_dict = {
                "node_label": khoan.node_label,
                "content": khoan.content,
                "feedbacks": [],
                "diem_list": []
            }
            
            for fb in khoan.feedbacks.all():
                exps = Explanation.objects.filter(content_type=feedback_ct, object_id=fb.id)
                fb_dict = {
                    "user_name": fb.user.username,
                    "content": fb.content,
                    "explanations": [{"user_name": exp.user.username, "content": exp.content} for exp in exps]
                }
                khoan_dict["feedbacks"].append(fb_dict)
                
            # Lặp Điểm
            for diem in khoan.children.filter(node_type="Điểm").order_by('order_index'):
                diem_dict = {
                    "node_label": diem.node_label,
                    "content": diem.content,
                    "feedbacks": []
                }
                for fb in diem.feedbacks.all():
                    exps = Explanation.objects.filter(content_type=feedback_ct, object_id=fb.id)
                    fb_dict = {
                        "user_name": fb.user.username,
                        "content": fb.content,
                        "explanations": [{"user_name": exp.user.username, "content": exp.content} for exp in exps]
                    }
                    diem_dict["feedbacks"].append(fb_dict)
                    
                khoan_dict["diem_list"].append(diem_dict)
                
            dieu_dict["khoan_list"].append(khoan_dict)
            
        data["dieu_list"].append(dieu_dict)
        
    print("Dữ liệu đã gom xong. Đang tiến hành Render Word...")
    
    try:
        tpl = DocxTemplate(r"C:\Users\Quoc Anh\Desktop\QLVB\template_bao_cao_chuan_v2.docx")
        tpl.render(data)
        out_path = r"C:\Users\Quoc Anh\Desktop\QLVB\output_bao_cao_v2.docx"
        tpl.save(out_path)
        print(f"XUẤT FILE THÀNH CÔNG TẠI: {out_path}")
    except Exception as e:
        print(f"LỖI KHI RENDER THƯ VIỆN docxtpl: {e}")

if __name__ == "__main__":
    main()
