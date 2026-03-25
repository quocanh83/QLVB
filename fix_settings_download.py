import os

# 1. Update VibeSettings.jsx to use Blob download for "Tải mẫu gốc"
f_path = 'frontend/src/pages/VibeSettings.jsx'
with open(f_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add handleDownloadSchema function
new_func = """    const handleDownloadSchema = async (tplId, tplName) => {
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

    const handleSystemUpdate = async () => {"""

content = content.replace('    const handleSystemUpdate = async () => {', new_func)

# Replace <a> tag with button
old_link = """                                    <a
                                        href={`/api/reports/templates/${tpl.id}/download_schema/?token=${localStorage.getItem('access_token') || ''}`}
                                        title="Tải file template gốc có JSON tags để chỉnh trong Word"
                                        className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-all shadow-sm"
                                        download
                                    >
                                        <Download size={14} /> Tải mẫu gốc
                                    </a>"""

# Since I modified VibeSettings.jsx recently, I need to check the exact content of old_link
# Wait, let's look at the view_file output again.

new_button = """                                    <button
                                        onClick={() => handleDownloadSchema(tpl.id, tpl.name)}
                                        title="Tải file template gốc có JSON tags để chỉnh trong Word"
                                        className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-colors"
                                    >
                                        <Download size={14} /> Tải mẫu gốc
                                    </button>"""

# Using a more flexible replacement for the <a> tag
import re
pattern = r'<a\s+href={`/api/reports/templates/\$\{tpl\.id\}/download_schema/\?token=\$\{localStorage\.getItem\(\'access_token\'\) \|\| \'\'\}`\}\s+title="Tải file template gốc có JSON tags để chỉnh trong Word"\s+className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-colors"\s+download\s+>\s+<Download size=\{14\} /> Tải mẫu gốc\s+</a>'

# Actually, I'll just find the anchor tag start and end
start_marker = '<a'
end_marker = '</a>'
# This is risky without proper parsing, but I'll try to match the specific content.

# Let's try to match a simplified version of the old link
content = content.replace('localStorage.getItem(\'access_token\') || \'\'', 'localStorage.getItem(\'access_token\')') # Clean up if needed

with open(f_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('VibeSettings.jsx function added')
