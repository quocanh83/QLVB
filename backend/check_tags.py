from docxtpl import DocxTemplate

try:
    tpl = DocxTemplate(r"C:\Users\Quoc Anh\Desktop\QLVB\template_bao_cao.docx")
    tags = tpl.get_undeclared_template_variables()
    print("=== DANH SÁCH CÁC THẺ (TAGS) TÌM THẤY TRONG FILE MẪU ===")
    for tag in sorted(tags):
        print(f"- {tag}")
except Exception as e:
    print("LỖI:", e)
