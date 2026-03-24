f=open('backend/reports/management/commands/seed_report_template.py','r',encoding='utf-8')
c=f.read(); f.close()
# Add custom template seed before final success message
old_end = "        self.stdout.write(self.style.SUCCESS('\\n\\u2713 Ho\\u00e0n t\\u1ea5t seed d\\u1eef li\\u1ec7u m\\u1eabu b\\u00e1o c\\u00e1o!'))"
if old_end not in c:
    # Try finding end by last 3 lines
    lines = c.splitlines()
    print('Last 5 lines:', lines[-5:])
else:
    insert = """
        # Tao ban ghi template 'custom' (cho Bao cao Tuy chinh)
        custom_tpl, c_created = ReportTemplate.objects.get_or_create(
            template_type='custom',
            defaults={
                'name': 'Bao cao Tuy chinh',
                'is_active': True,
                'header_org_name': 'BO/CO QUAN CHU TRI',
                'header_org_location': 'Ha Noi',
                'footer_signer_name': '',
                'footer_signer_title': 'DAI DIEN CO QUAN CHU TRI',
            }
        )
        if c_created:
            self.stdout.write(self.style.SUCCESS(f'+ Da tao mau tuy chinh: {custom_tpl.name}'))
        else:
            self.stdout.write(self.style.WARNING(f'= Mau tuy chinh da ton tai: {custom_tpl.name}'))

"""
    c = c.replace(old_end, insert + old_end)
    f=open('backend/reports/management/commands/seed_report_template.py','w',encoding='utf-8')
    f.write(c); f.close()
    print('seed command updated OK')
