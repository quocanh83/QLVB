import os

f_path = 'frontend/src/pages/VibeSettings.jsx'
with open(f_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add handleDownloadSchema function if not already there
if 'const handleDownloadSchema' not in content:
    func_code = """    const handleDownloadSchema = async (tplId, tplName) => {
        try {
            const auth = getAuthHeader();
            const res = await axios.get(`/api/reports/templates/${tplId}/download_schema/`, {
                ...auth,
                responseType: 'blob'
            });
            const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', tplName.toLowerCase().replace(/\\s+/g, '_') + '_original.docx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (e) {
            alert('Lỗi khi tải mẫu gốc.');
        }
    };

"""
    content = content.replace('    const handleSystemUpdate = async () => {', func_code + '    const handleSystemUpdate = async () => {')

# 2. Replace <a> tag with <button>
import re
# Match the specific <a> tag with any whitespace/newlines
anchor_pattern = re.compile(r'<a\s+href={`/api/reports/templates/\$\{tpl\.id\}/download_schema/.*?`}.*?download\s+>.*?</a>', re.DOTALL)

new_button = """                                    <button
                                        onClick={() => handleDownloadSchema(tpl.id, tpl.name)}
                                        title="Tải file template gốc có JSON tags để chỉnh trong Word"
                                        className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-colors"
                                    >
                                        <Download size={14} /> Tải mẫu gốc
                                    </button>"""

if anchor_pattern.search(content):
    content = anchor_pattern.sub(new_button, content)
    with open(f_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: VibeSettings.jsx updated with Blob download button')
else:
    print('ERROR: Anchor pattern not found in VibeSettings.jsx')
