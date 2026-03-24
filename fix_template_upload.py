"""
Script tổng hợp sửa:
1. Fix line-clamp bảng trong VibeReports.jsx
2. Thêm upload_template action trong reports/views.py  
3. Cập nhật reports/serializers.py để include file_path + has_custom_template
4. Thêm khu vực upload template trong VibeSettings.jsx
5. Update v2_template_generator.py để ưu tiên file upload từ DB
"""

# ===== 1. FIX TABLE LINE-CLAMP IN VibeReports.jsx =====
with open('frontend/src/pages/VibeReports.jsx', 'r', encoding='utf-8') as f:
    jsx = f.read()

# Remove line-clamp from nội dung column
jsx = jsx.replace(
    'className="px-6 py-4 text-slate-600 line-clamp-2 hover:line-clamp-none transition-all"',
    'className="px-6 py-4 text-slate-600 text-xs leading-relaxed"'
)
# Also remove the bg-indigo-50/10 background from table wrapper (was distracting)
jsx = jsx.replace(
    'className="overflow-hidden border border-slate-100 rounded-[2.5rem] bg-indigo-50/10"',
    'className="overflow-hidden border border-slate-100 rounded-[2.5rem]"'
)

with open('frontend/src/pages/VibeReports.jsx', 'w', encoding='utf-8') as f:
    f.write(jsx)
print('1. VibeReports.jsx line-clamp fixed OK')


# ===== 2. UPDATE reports/serializers.py =====
serializer_content = '''from rest_framework import serializers
from .models import ReportTemplate, ReportFieldConfig, ReportFieldLog


class ReportFieldLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.username', read_only=True, default='')

    class Meta:
        model = ReportFieldLog
        fields = ['id', 'action', 'old_value', 'new_value', 'changed_by_name', 'changed_at']


class ReportFieldConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportFieldConfig
        fields = ['id', 'field_key', 'field_label', 'is_enabled', 'is_default', 'column_order', 'column_width_cm']


class ReportTemplateSerializer(serializers.ModelSerializer):
    field_configs = ReportFieldConfigSerializer(many=True, read_only=True)
    has_custom_file = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = ReportTemplate
        fields = [
            'id', 'name', 'template_type', 'is_active',
            'header_org_name', 'header_org_location',
            'footer_signer_name', 'footer_signer_title',
            'created_at', 'updated_at', 'field_configs',
            'has_custom_file', 'file_name'
        ]

    def get_has_custom_file(self, obj):
        return bool(obj.file_path)

    def get_file_name(self, obj):
        if obj.file_path:
            return obj.file_path.name.split('/')[-1]
        return None
'''

with open('backend/reports/serializers.py', 'w', encoding='utf-8') as f:
    f.write(serializer_content)
print('2. reports/serializers.py updated OK')


# ===== 3. Add upload_template + ensure_custom actions to reports/views.py =====
with open('backend/reports/views.py', 'r', encoding='utf-8') as f:
    views = f.read()

upload_action = '''
    @action(detail=True, methods=['post'], url_path='upload_template')
    def upload_template(self, request, pk=None):
        """Upload file .docx template thay thế cho mẫu báo cáo này"""
        template = self.get_object()
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({"error": "Vui lòng chọn file .docx để tải lên."}, status=400)
        if not uploaded_file.name.endswith('.docx'):
            return Response({"error": "Chỉ chấp nhận file .docx."}, status=400)

        # Xóa file cũ nếu có
        if template.file_path:
            try:
                import os
                if os.path.exists(template.file_path.path):
                    os.remove(template.file_path.path)
            except Exception:
                pass

        template.file_path = uploaded_file
        template.save()
        serializer = self.get_serializer(template)
        return Response({"message": f"Đã tải lên mẫu: {uploaded_file.name}", "template": serializer.data})

    @action(detail=True, methods=['post'], url_path='remove_template')
    def remove_template(self, request, pk=None):
        """Xóa file template đã upload, trả về mẫu mặc định"""
        template = self.get_object()
        if template.file_path:
            try:
                import os
                if os.path.exists(template.file_path.path):
                    os.remove(template.file_path.path)
            except Exception:
                pass
            template.file_path = None
            template.save()
        return Response({"message": "Đã xóa file template, hệ thống sẽ dùng mẫu mặc định."})

'''

# Insert after add_field action (before remove_field)
insert_marker = '    @action(detail=True, methods=[\'post\'])\n    def remove_field(self, request, pk=None):'
if insert_marker in views:
    views = views.replace(insert_marker, upload_action + '\n    @action(detail=True, methods=[\'post\'])\n    def remove_field(self, request, pk=None):')
    print('3. upload_template action added OK')
else:
    print('3. WARN: insert marker not found, appending to end of ReportTemplateViewSet')

with open('backend/reports/views.py', 'w', encoding='utf-8') as f:
    f.write(views)


# ===== 4. Update v2_template_generator.py to use uploaded file if available =====
with open('backend/feedbacks/utils/v2_template_generator.py', 'r', encoding='utf-8') as f:
    gen = f.read()

old_template_path = "# Đường dẫn tuyệt đối đến file template\nTEMPLATE_PATH = os.path.join(os.path.dirname(__file__), 'template_bao_cao_V2_fixed.docx')"
new_template_path = """# Đường dẫn mặc định đến file template
DEFAULT_TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), 'template_bao_cao_V2_fixed.docx')


def _get_template_path(template_type='mau_10'):
    \"\"\"
    Trả về đường dẫn file template:
    - Ưu tiên 1: File đã upload trong DB (ReportTemplate.file_path)
    - Ưu tiên 2: File mặc định trong source code
    \"\"\"
    try:
        from reports.models import ReportTemplate as RT
        tpl = RT.objects.filter(template_type=template_type, is_active=True).first()
        if tpl and tpl.file_path:
            import os as _os
            path = tpl.file_path.path
            if _os.path.exists(path):
                return path
    except Exception:
        pass
    return DEFAULT_TEMPLATE_PATH"""

if old_template_path in gen:
    gen = gen.replace(old_template_path, new_template_path)
    # Update usage
    gen = gen.replace(
        'tpl = DocxTemplate(TEMPLATE_PATH)',
        'tpl = DocxTemplate(_get_template_path(\'mau_10\'))'
    )
    print('4. v2_template_generator.py updated for dynamic template OK')
else:
    print('4. WARN: generator template path marker not found')

with open('backend/feedbacks/utils/v2_template_generator.py', 'w', encoding='utf-8') as f:
    f.write(gen)


# ===== 5. Add Template Upload section to VibeSettings.jsx =====
with open('frontend/src/pages/VibeSettings.jsx', 'r', encoding='utf-8') as f:
    settings_jsx = f.read()

# Add state for template upload
old_state_block = "    const [updating, setUpdating] = useState(false);"
new_state_block = """    const [updating, setUpdating] = useState(false);
    const [reportTemplates, setReportTemplates] = useState([]);
    const [uploadingTpl, setUploadingTpl] = useState(null);"""

settings_jsx = settings_jsx.replace(old_state_block, new_state_block)

# Add fetchReportTemplates and uploadTemplate functions before handleSystemUpdate
old_fn = "    const handleSystemUpdate = async () => {"
new_fn = """    const fetchReportTemplates = async () => {
        try {
            const auth = getAuthHeader();
            const res = await axios.get('/api/reports/templates/', auth);
            setReportTemplates(res.data);
        } catch (e) { console.error('Lỗi tải template báo cáo', e); }
    };

    const uploadTemplate = async (templateId, file) => {
        if (!file) return;
        setUploadingTpl(templateId);
        try {
            const auth = getAuthHeader();
            const formData = new FormData();
            formData.append('file', file);
            await axios.post(`/api/reports/templates/${templateId}/upload_template/`, formData, {
                ...auth,
                headers: { ...auth.headers, 'Content-Type': 'multipart/form-data' }
            });
            alert('Tải lên thành công! Mẫu báo cáo đã được cập nhật.');
            fetchReportTemplates();
        } catch (e) { alert('Lỗi khi tải lên: ' + (e.response?.data?.error || e.message)); }
        finally { setUploadingTpl(null); }
    };

    const removeTemplate = async (templateId) => {
        if (!window.confirm('Xóa file template này? Hệ thống sẽ dùng lại mẫu mặc định.')) return;
        try {
            const auth = getAuthHeader();
            await axios.post(`/api/reports/templates/${templateId}/remove_template/`, {}, auth);
            fetchReportTemplates();
        } catch (e) { alert('Lỗi khi xóa template.'); }
    };

    const handleSystemUpdate = async () => {"""

settings_jsx = settings_jsx.replace(old_fn, new_fn)

# Add fetchReportTemplates to useEffect
settings_jsx = settings_jsx.replace(
    "    useEffect(() => { fetchSettings(); }, []);",
    "    useEffect(() => { fetchSettings(); fetchReportTemplates(); }, []);"
)

# Add import for Upload and FileText icons
settings_jsx = settings_jsx.replace(
    "  Globe\n} from 'lucide-react';",
    "  Globe,\n  Upload,\n  FileText,\n  Trash2,\n  FileCheck\n} from 'lucide-react';"
)

# Add Template Upload section before the git update section
old_git_section = '                <div className="bg-slate-900 rounded-[3rem] p-8 md:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">'
new_template_section = '''                {/* Template Báo cáo Upload */}
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex items-center gap-3 bg-indigo-50/40">
                        <FileText className="text-indigo-600" size={24} />
                        <div>
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Mẫu Tài liệu Báo cáo</h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">Tải lên file .docx để thay thế mẫu báo cáo mặc định. Hệ thống sẽ ưu tiên file tải lên.</p>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {reportTemplates.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs">Chưa có dữ liệu mẫu. Chạy <code className="bg-slate-100 px-1 rounded">python manage.py seed_report_template</code> trên server.</div>
                        ) : reportTemplates.map(tpl => (
                            <div key={tpl.id} className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${tpl.has_custom_file ? 'bg-green-100' : 'bg-slate-100'}`}>
                                        {tpl.has_custom_file ? <FileCheck className="text-green-600" size={20} /> : <FileText className="text-slate-400" size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-black text-sm text-slate-800">{tpl.name}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            {tpl.has_custom_file ? (
                                                <span className="text-green-600 font-bold">✓ File tuỳ chỉnh: {tpl.file_name}</span>
                                            ) : (
                                                <span>Đang dùng mẫu mặc định trong hệ thống</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {tpl.has_custom_file && (
                                        <button onClick={() => removeTemplate(tpl.id)} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors">
                                            <Trash2 size={14} /> Xóa
                                        </button>
                                    )}
                                    <label className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest cursor-pointer transition-all ${uploadingTpl === tpl.id ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20'}`}>
                                        {uploadingTpl === tpl.id ? <><RefreshCw size={14} className="animate-spin" /><span>Đang tải...</span></> : <><Upload size={14} /><span>Tải lên .docx</span></>}
                                        <input type="file" accept=".docx" className="hidden" onChange={e => { if (e.target.files[0]) uploadTemplate(tpl.id, e.target.files[0]); }} disabled={uploadingTpl === tpl.id} />
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-900 rounded-[3rem] p-8 md:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">'''

settings_jsx = settings_jsx.replace(old_git_section, new_template_section)
print('5. VibeSettings.jsx template upload section added OK')

with open('frontend/src/pages/VibeSettings.jsx', 'w', encoding='utf-8') as f:
    f.write(settings_jsx)

print('\n=== ALL DONE ===')
