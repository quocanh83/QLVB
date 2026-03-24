import os

# 1. Update v2_template_generator.py
gen_path = 'backend/feedbacks/utils/v2_template_generator.py'
with open(gen_path, 'r', encoding='utf-8') as f:
    gen_content = f.read()

# Update function signature
old_sig = "def generate_from_v2_template(document, feedbacks, template_config=None):"
new_sig = "def generate_from_v2_template(document, feedbacks, template_config=None, template_type='mau_10'):"
if old_sig in gen_content:
    gen_content = gen_content.replace(old_sig, new_sig)

# Update docstring args
old_args = "        template_config: dict cấu hình admin (tuỳ chọn):"
new_args = "        template_config: dict cấu hình admin (tuỳ chọn)\n        template_type: 'mau_10' (ngang) hoặc 'custom' (dọc)"
if old_args in gen_content:
    gen_content = gen_content.replace(old_args, new_args)

# Update usage of _get_template_path
gen_content = gen_content.replace(
    "tpl = DocxTemplate(_get_template_path('mau_10'))",
    "tpl = DocxTemplate(_get_template_path(template_type))"
)

with open(gen_path, 'w', encoding='utf-8') as f:
    f.write(gen_content)
print('v2_template_generator.py updated')


# 2. Update feedbacks/views.py
views_path = 'backend/feedbacks/views.py'
with open(views_path, 'r', encoding='utf-8') as f:
    views_content = f.read()

# Logic to replace the whole export block or just the generator part
# Let's find the start of the try block in export_mau_10
export_start = views_content.find('def export_mau_10(self, request):')
if export_start != -1:
    # We'll replace the block from "template_config = None" to the return response
    import re
    p_start = views_content.find('template_config = None', export_start)
    p_end = views_content.find('return response', p_start) + 15
    
    if p_start != -1 and p_end != -1:
        new_block = """            # Phan nhanh theo loai bao cao (report_type param)
            report_type = request.query_params.get('report_type', 'mau10')
            
            # Doc cau hinh tu DB cho loai tuong ung
            template_config = None
            tpl_db = None
            try:
                from reports.models import ReportTemplate
                tpl_db = ReportTemplate.objects.filter(template_type=report_type, is_active=True).first()
                if tpl_db:
                    template_config = {
                        'header_org_name': tpl_db.header_org_name,
                        'header_org_location': tpl_db.header_org_location,
                        'footer_signer_name': tpl_db.footer_signer_name,
                        'footer_signer_title': tpl_db.footer_signer_title,
                    }
            except Exception:
                pass

            if report_type == 'custom' and (not tpl_db or not tpl_db.file_path):
                # Truong hop Bao cao Tuy chinh ma chua upload file .docx -> dung generator dong (Portrait)
                custom_config = dict(template_config) if template_config else {}
                try:
                    enabled_fields = tpl_db.field_configs.filter(is_enabled=True).order_by('column_order')
                    if enabled_fields.exists():
                        custom_config['fields'] = [
                            {'field_key': f.field_key, 'field_label': f.field_label, 'column_width_cm': f.column_width_cm}
                            for f in enabled_fields
                        ]
                except Exception:
                    pass
                file_stream = generate_mau_10(document, feedbacks, template_config=custom_config or None)
                filename = f"Bao_cao_Tuy_chinh_{document.id}.docx"
            else:
                # Dung generator V2 (Landscape cho mau_10, hoac Portrait cho custom neu co file)
                file_stream = generate_from_v2_template(document, feedbacks, template_config=template_config, template_type=report_type)
                filename = f"Bao_cao_{'Mau_10' if report_type=='mau10' else 'Tuy_chinh'}_{document.id}.docx"
            
            response = FileResponse(
                file_stream, 
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response"""
        
        # Careful with indentation. The original block was indented by 12 spaces.
        # Let's adjust new_block to match or just use a simpler find/replace if possible.
        views_content = views_content[:p_start] + new_block + views_content[p_end:]
        with open(views_path, 'w', encoding='utf-8') as f:
            f.write(views_content)
        print('feedbacks/views.py updated')
    else:
        print('Markers not found in views.py')
else:
    print('export_mau_10 not found')
