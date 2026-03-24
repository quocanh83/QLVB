"""
Script: Thêm action download_schema vào reports/views.py
và nút "Tải mẫu gốc" vào VibeSettings.jsx
"""

# ===== BACKEND: Add download_schema action =====
with open('backend/reports/views.py', 'r', encoding='utf-8') as f:
    views = f.read()

download_action = '''
    @action(detail=True, methods=['get'], url_path='download_schema')
    def download_schema(self, request, pk=None):
        """
        Tải xuống file .docx template gốc có chứa các JSON tag {{ }}, {% for %}.
        - Nếu có file đã upload: trả về file đó (user có thể xem lại file đã chỉnh)
        - Nếu không: trả về file template mặc định trong source code
        """
        from django.http import FileResponse
        import mimetypes, os
        template = self.get_object()

        # Ưu tiên file đã upload
        if template.file_path:
            try:
                path = template.file_path.path
                if os.path.exists(path):
                    fname = os.path.basename(path)
                    return FileResponse(
                        open(path, 'rb'),
                        as_attachment=True,
                        filename=fname,
                        content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    )
            except Exception:
                pass

        # Fallback: template mặc định trong source code
        default_path = os.path.join(
            os.path.dirname(__file__),
            '..', '..', 'feedbacks', 'utils', 'template_bao_cao_V2_fixed.docx'
        )
        default_path = os.path.normpath(default_path)
        if os.path.exists(default_path):
            return FileResponse(
                open(default_path, 'rb'),
                as_attachment=True,
                filename='template_bao_cao_V2_fixed.docx',
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )

        return Response({"error": "Không tìm thấy file template."}, status=404)

'''

# Insert before remove_template action
insert_before = "    @action(detail=True, methods=['post'], url_path='remove_template')"
if insert_before in views:
    views = views.replace(insert_before, download_action + insert_before)
    print('Backend download_schema action added OK')
else:
    print('WARN: insert marker not found')

with open('backend/reports/views.py', 'w', encoding='utf-8') as f:
    f.write(views)


# ===== FRONTEND: Add download button to VibeSettings.jsx =====
with open('frontend/src/pages/VibeSettings.jsx', 'r', encoding='utf-8') as f:
    jsx = f.read()

# Add Download icon to imports
jsx = jsx.replace(
    '  FileCheck\n} from \'lucide-react\';',
    '  FileCheck,\n  Download\n} from \'lucide-react\';'
)

# Add download button next to the upload label in template rows  
old_upload_label = """                                    <label className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest cursor-pointer transition-all ${uploadingTpl === tpl.id ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20'}`}>
                                        {uploadingTpl === tpl.id ? <><RefreshCw size={14} className="animate-spin" /><span>Đang tải...</span></> : <><Upload size={14} /><span>Tải lên .docx</span></>}
                                        <input type="file" accept=".docx" className="hidden" onChange={e => { if (e.target.files[0]) uploadTemplate(tpl.id, e.target.files[0]); }} disabled={uploadingTpl === tpl.id} />
                                    </label>"""

new_upload_label = """                                    <a
                                        href={`/api/reports/templates/${tpl.id}/download_schema/?token=${localStorage.getItem('access_token') || ''}`}
                                        title="Tải file template gốc có JSON tags để chỉnh trong Word"
                                        className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-colors"
                                        download
                                    >
                                        <Download size={14} /> Tải mẫu gốc
                                    </a>
                                    <label className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest cursor-pointer transition-all ${uploadingTpl === tpl.id ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20'}`}>
                                        {uploadingTpl === tpl.id ? <><RefreshCw size={14} className="animate-spin" /><span>Đang tải...</span></> : <><Upload size={14} /><span>Tải lên .docx</span></>}
                                        <input type="file" accept=".docx" className="hidden" onChange={e => { if (e.target.files[0]) uploadTemplate(tpl.id, e.target.files[0]); }} disabled={uploadingTpl === tpl.id} />
                                    </label>"""

if old_upload_label in jsx:
    jsx = jsx.replace(old_upload_label, new_upload_label)
    print('Frontend download button added OK')
else:
    print('WARN: upload label not found')

with open('frontend/src/pages/VibeSettings.jsx', 'w', encoding='utf-8') as f:
    f.write(jsx)
print('Done')
