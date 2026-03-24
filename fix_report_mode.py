import re

# ============ FIX BACKEND views.py ============
with open('backend/feedbacks/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the block to replace using a unique substring
old_marker = 'file_stream = generate_from_v2_template(document, feedbacks, template_config=template_config)'
new_block = '''# Phan nhanh theo loai bao cao (report_type param)
            report_type = request.query_params.get('report_type', 'mau10')

            if report_type == 'custom':
                # Bao cao Tuy chinh: dung mau10_generator + field configs tu DB
                custom_config = dict(template_config) if template_config else {}
                try:
                    from reports.models import ReportTemplate as RT2
                    tpl2 = RT2.objects.filter(template_type='mau_10', is_active=True).first()
                    if tpl2:
                        enabled_fields = tpl2.field_configs.filter(is_enabled=True).order_by('column_order')
                        if enabled_fields.exists():
                            custom_config['fields'] = [
                                {
                                    'field_key': f.field_key,
                                    'field_label': f.field_label,
                                    'column_width_cm': f.column_width_cm,
                                }
                                for f in enabled_fields
                            ]
                except Exception:
                    pass
                file_stream = generate_mau_10(document, feedbacks, template_config=custom_config or None)
                filename = f"Bao_cao_Tuy_chinh_{document.id}.docx"
            else:
                # Mau 10 chuan: dung template file V2
                file_stream = generate_from_v2_template(document, feedbacks, template_config=template_config)
                filename = f"Bao_cao_Mau_10_{document.id}.docx"'''

if old_marker in content:
    content = content.replace(old_marker, new_block)
    # Also fix the filename line after
    content = content.replace(
        'filename = f"Bao_cao_Mau_10_Tuy_bien.docx"',
        ''
    )
    with open('backend/feedbacks/views.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Backend updated OK')
else:
    print('Backend marker not found:', repr(old_marker[:50]))

# ============ FIX FRONTEND VibeReports.jsx ============
with open('frontend/src/pages/VibeReports.jsx', 'r', encoding='utf-8') as f:
    jsx = f.read()

# 1. Add reportMode state after customStatus state
old_state = "  const [isCustomLoading, setIsCustomLoading] = useState(false);"
new_state = """  const [isCustomLoading, setIsCustomLoading] = useState(false);
  const [reportMode, setReportMode] = useState('mau10'); // 'mau10' | 'custom'"""

if old_state in jsx:
    jsx = jsx.replace(old_state, new_state)
    print('State added OK')
else:
    print('State marker not found')

# 2. Update handleExportCustomWord to pass report_type
old_export = "    window.location.href = url;"
new_export = """    url += `&report_type=${reportMode}`;
    window.location.href = url;"""

if old_export in jsx:
    jsx = jsx.replace(old_export, new_export)
    print('Export function updated OK')
else:
    print('Export marker not found')

# 3. Replace the entire custom tab content (from h2 title to filter+table)
old_tab_header = """                    <div>
                        <h2 className="text-2xl font-black text-slate-900 leading-tight">Báo cáo Tổng hợp Ý kiến</h2>
                        <p className="text-slate-500 text-sm mt-3 max-w-2xl">Mọi báo cáo được xuất theo định dạng chuẩn Mẫu 10 của Bộ Tư pháp với các trường dữ liệu tùy biến theo cấu hình bên dưới.</p>
                    </div>
                    <button onClick={handleExportCustomWord} disabled={!selectedDocId || customStatsData.length === 0} className="bg-indigo-600 hover:bg-slate-900 disabled:bg-slate-200 text-white font-black py-4 px-8 rounded-[1.5rem] text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-3 shrink-0">
                        <Download size={20} /><span>Tải Word</span>
                    </button>"""

new_tab_header = """                    <div>
                        <h2 className="text-2xl font-black text-slate-900 leading-tight">Báo cáo Tổng hợp Ý kiến</h2>
                        <p className="text-slate-500 text-sm mt-3 max-w-2xl">Chọn loại báo cáo phù hợp và lọc dữ liệu trước khi xuất.</p>
                    </div>
                    <button onClick={handleExportCustomWord} disabled={!selectedDocId || (customStatsData?.length || 0) === 0} className="bg-indigo-600 hover:bg-slate-900 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-black py-4 px-8 rounded-[1.5rem] text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-3 shrink-0">
                        <Download size={20} /><span>Tải Word</span>
                    </button>"""

if old_tab_header in jsx:
    jsx = jsx.replace(old_tab_header, new_tab_header)
    print('Tab header updated OK')
else:
    print('Tab header marker not found')

# 4. Add mode selector cards after the header div closing
old_mode_anchor = """                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">"""
new_mode_section = """                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setReportMode('mau10')}
                        className={`p-5 rounded-2xl border-2 text-left transition-all ${reportMode === 'mau10' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${reportMode === 'mau10' ? 'border-indigo-500' : 'border-slate-300'}`}>
                                {reportMode === 'mau10' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                            </div>
                            <span className="font-black text-sm text-slate-800">Mẫu số 10</span>
                            <span className="ml-auto text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">Chuẩn NĐ 30</span>
                        </div>
                        <p className="text-xs text-slate-500 pl-7">Xuất theo mẫu văn bản hành chính Word chuẩn với tiêu đề, quốc hiệu, chữ ký.</p>
                    </button>
                    <button
                        onClick={() => setReportMode('custom')}
                        className={`p-5 rounded-2xl border-2 text-left transition-all ${reportMode === 'custom' ? 'border-violet-500 bg-violet-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${reportMode === 'custom' ? 'border-violet-500' : 'border-slate-300'}`}>
                                {reportMode === 'custom' && <div className="w-2 h-2 rounded-full bg-violet-500" />}
                            </div>
                            <span className="font-black text-sm text-slate-800">Báo cáo Tuỳ chỉnh</span>
                            <span className="ml-auto text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-violet-100 text-violet-600 rounded-full">Cài đặt DB</span>
                        </div>
                        <p className="text-xs text-slate-500 pl-7">Xuất theo cấu hình cột tùy biến đã thiết lập trong tab <b>Mẫu chuẩn</b>.</p>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">"""

if old_mode_anchor in jsx:
    jsx = jsx.replace(old_mode_anchor, new_mode_section)
    print('Mode selector added OK')
else:
    print('Mode anchor not found')

# 5. Fix table hover style
old_row = 'className="hover:bg-white bg-white/50"'
new_row = 'className="hover:bg-indigo-50/40 border-b border-slate-100 transition-colors"'
jsx = jsx.replace(old_row, new_row)
print('Table hover fixed')

with open('frontend/src/pages/VibeReports.jsx', 'w', encoding='utf-8') as f:
    f.write(jsx)
print('Frontend updated OK')
