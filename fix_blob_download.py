import os

# 1. Update VibeReports.jsx to use Blob download
f_path = 'frontend/src/pages/VibeReports.jsx'
with open(f_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_handle = """  const handleExportCustomWord = () => {
    if (!selectedDocId) return;
    const token = localStorage.getItem('access_token');
    let url = `/api/feedbacks/export_mau_10/?document_id=${selectedDocId}&token=${token}&status=${customStatus}`;
    if (customAgency && customAgency !== 'all') url += `&agency=${encodeURIComponent(customAgency)}`;
    url += `&report_type=${reportMode}`;
    window.location.href = url;
  };"""

new_handle = """  const handleExportCustomWord = async () => {
    if (!selectedDocId) return;
    try {
      const auth = getAuthHeader();
      let url = `/api/feedbacks/export_mau_10/?document_id=${selectedDocId}&status=${customStatus}`;
      if (customAgency && customAgency !== 'all') url += `&agency=${encodeURIComponent(customAgency)}`;
      url += `&report_type=${reportMode}`;
      
      const response = await axios.get(url, {
        ...auth,
        responseType: 'blob', // Quan trọng: Nhận dữ liệu dưới dạng tệp tin
      });

      // Tạo link ảo để tải file
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      const filename = `Bao_cao_${reportMode === 'mau10' ? 'Mau_10' : 'Tuy_chinh'}_${selectedDocId}.docx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error('Lỗi khi tải báo cáo:', e);
      alert('Không thể tải báo cáo. Vui lòng kiểm tra lại dữ liệu hoặc quyền truy cập.');
    }
  };"""

if old_handle in content:
    content = content.replace(old_handle, new_handle)
    with open(f_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('VibeReports.jsx handleExportCustomWord updated to Blob')
else:
    # Try different indentation
    print('ERROR: handleExportCustomWord not found for replacement')
