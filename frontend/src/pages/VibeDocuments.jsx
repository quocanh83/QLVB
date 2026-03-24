import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Search, 
  FileText, 
  Clock, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Crown, 
  Download, 
  ExternalLink,
  Filter,
  RefreshCw,
  UploadCloud,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAuthHeader, checkUserHasRole } from '../utils/authHelpers';

const VibeDocuments = () => {
  const [data, setData] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
    fetchUsers();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const auth = getAuthHeader();
      const response = await axios.get('/api/documents/', auth);
      setData(response.data);
    } catch (error) {
      console.error("Lấy danh sách thất bại!", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const auth = getAuthHeader();
      const res = await axios.get('/api/accounts/users/', auth);
      const ud = res.data.results || res.data;
      setUsers(Array.isArray(ud) ? ud : []);
    } catch (e) {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn dự thảo này không?')) return;
    try {
      const auth = getAuthHeader();
      await axios.delete(`/api/documents/${id}/`, auth);
      fetchDocuments();
    } catch (error) {
      alert('Lỗi khi xoá dự thảo.');
    }
  };

  const handleExport = (id) => {
    const token = localStorage.getItem('access_token');
    const url = `/api/documents/${id}/export_report/?token=${token}`;
    window.location.href = url;
  };

  const filteredData = data.filter(doc => 
    doc.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.drafting_agency && doc.drafting_agency.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 bg-slate-50 p-6 lg:p-10 space-y-8 overflow-y-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quản lý Dự thảo</h1>
          <p className="text-slate-500 mt-1">Quản lý, bóc tách và theo dõi tiến độ giải trình các dự thảo văn bản.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchDocuments}
            className="p-3 text-slate-500 hover:bg-white hover:text-blue-600 rounded-2xl border border-transparent hover:border-slate-200 transition-all active:scale-95"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          {checkUserHasRole('Admin') && (
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-sm"
            >
              <Plus size={18} />
              <span>Tải lên Dự thảo</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo tên dự thảo hoặc cơ quan..." 
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter size={16} />
            <span>Bộ lọc</span>
          </button>
        </div>
      </div>

      {/* Documents Grid/Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium italic">Đang tải danh sách...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredData.map((doc) => (
            <div key={doc.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group overflow-hidden flex flex-col sm:flex-row">
              {/* Left Side: Status & Icon */}
              <div className="sm:w-48 bg-slate-50 p-6 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-slate-100">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                  <FileText size={32} />
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  doc.status === 'Completed' ? 'bg-green-50 text-green-600 border-green-200' :
                  doc.status === 'Reviewing' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                  'bg-orange-50 text-orange-600 border-orange-200'
                }`}>
                  {doc.status || 'Draft'}
                </div>
              </div>

              {/* Middle: Content */}
              <div className="flex-1 p-6 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-start justify-between">
                    <h3 
                      onClick={() => navigate(`/vibe-dashboard?docId=${doc.id}`)}
                      className="text-lg font-black text-slate-800 leading-tight cursor-pointer hover:text-blue-600 transition-colors"
                    >
                      {doc.project_name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    {doc.drafting_agency || 'Cơ quan chủ trì chưa rõ'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Cấu trúc</p>
                    <div className="flex items-center space-x-2">
                       <span className="text-sm font-bold text-slate-700">{doc.total_dieu || 0} Điều</span>
                       <span className="text-[10px] text-slate-300">|</span>
                       <span className="text-sm font-bold text-slate-700">{doc.total_khoan || 0} Khoản</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Giải trình</p>
                    <div className="flex items-center space-x-2">
                       <span className="text-sm font-bold text-blue-600">{doc.resolved_feedbacks || 0}</span>
                       <span className="text-xs text-slate-400 font-bold">/ {doc.total_feedbacks || 0}</span>
                       <CheckCircle2 size={14} className={doc.resolved_feedbacks === doc.total_feedbacks && doc.total_feedbacks > 0 ? "text-green-500" : "text-slate-300"} />
                    </div>
                  </div>
                </div>

                {doc.lead_name && (
                  <div className="flex items-center space-x-2 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100 w-fit">
                    <Crown size={14} className="text-amber-500" />
                    <span className="text-xs font-bold text-amber-700">Chủ trì: {doc.lead_name}</span>
                  </div>
                )}
              </div>

              {/* Right Side: Actions */}
              <div className="p-4 sm:border-l border-slate-50 flex sm:flex-col items-center justify-center gap-2 bg-white">
                <button 
                  onClick={() => navigate(`/vibe-dashboard?docId=${doc.id}`)}
                  className="w-full sm:w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                  title="Xử lý chi tiết"
                >
                  <ExternalLink size={18} />
                </button>
                <button 
                  onClick={() => handleExport(doc.id)}
                  className="w-full sm:w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-100"
                  title="Xuất báo cáo tổng hợp"
                >
                  <Download size={18} />
                </button>
                {checkUserHasRole('Admin') && (
                  <>
                    <button 
                      onClick={() => { setEditingDoc(doc); setIsLeadModalOpen(true); }}
                      className="w-full sm:w-10 h-10 flex items-center justify-center bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors border border-amber-100"
                      title="Phân công chủ trì"
                    >
                      <Crown size={18} />
                    </button>
                    <button 
                      onClick={() => { setEditingDoc(doc); setIsEditModalOpen(true); }}
                      className="w-full sm:w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100"
                      title="Chỉnh sửa thông tin"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="w-full sm:w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors border border-rose-100"
                      title="Xoá dự thảo"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {filteredData.length === 0 && (
            <div className="col-span-full bg-white rounded-[3rem] border-2 border-dashed border-slate-200 p-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                <Search size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Không tìm thấy dự thảo nào</h3>
                <p className="text-slate-400 max-w-sm mx-auto mt-2">Hãy thử đổi từ khóa tìm kiếm hoặc tải lên văn bản mới để bắt đầu.</p>
              </div>
              {checkUserHasRole('Admin') && (
                <button 
                  onClick={() => setIsUploadModalOpen(true)}
                  className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold mt-4"
                >
                  Tải lên ngay
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      <VibeUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        onSuccess={fetchDocuments}
      />

      {/* Edit Modal */}
      {isEditModalOpen && (
        <VibeEditModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          doc={editingDoc}
          onSuccess={fetchDocuments}
        />
      )}

      {/* Lead Modal */}
      {isLeadModalOpen && (
        <VibeLeadModal 
          isOpen={isLeadModalOpen}
          onClose={() => setIsLeadModalOpen(false)}
          doc={editingDoc}
          users={users}
          onSuccess={fetchDocuments}
        />
      )}
    </div>
  );
};

// Helper components for modals
const VibeUploadModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ project_name: '', drafting_agency: '', agency_location: '' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { alert('Vui lòng chọn file word!'); return; }
    
    setLoading(true);
    const data = new FormData();
    data.append('project_name', formData.project_name);
    data.append('drafting_agency', formData.drafting_agency);
    data.append('agency_location', formData.agency_location);
    data.append('attached_file_path', file);

    try {
      const auth = getAuthHeader();
      await axios.post('/api/documents/', data, {
        headers: { ...auth.headers, 'Content-Type': 'multipart/form-data' }
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Upload error details:", err.response?.data || err.message);
      const errorMsg = err.response?.data?.error || JSON.stringify(err.response?.data) || 'Lỗi khi tải lên dự thảo.';
      alert('Lỗi: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col">
        <div className="bg-blue-600 p-8 text-white flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-black">Tải lên Dự thảo</h2>
                <p className="text-blue-100 text-sm mt-1 uppercase tracking-widest font-bold">Xử lý bóc tách AI</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-blue-500 rounded-xl transition-colors">
                <X size={24} />
            </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase ml-1">Tên Dự án / Văn bản</label>
              <input 
                required
                type="text" 
                placeholder="VD: Luật Đất đai (sửa đổi)"
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                value={formData.project_name}
                onChange={e => setFormData({...formData, project_name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase ml-1">Cơ quan chủ trì</label>
                    <input 
                        type="text" 
                        placeholder="Bộ Tài nguyên..."
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm"
                        value={formData.drafting_agency}
                        onChange={e => setFormData({...formData, drafting_agency: e.target.value})}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase ml-1">Địa danh</label>
                    <input 
                        type="text" 
                        placeholder="VD: Hà Nội"
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm"
                        value={formData.agency_location}
                        onChange={e => setFormData({...formData, agency_location: e.target.value})}
                    />
                </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase ml-1">File Word (.docx)</label>
            <div className={`
              border-2 border-dashed rounded-[2rem] p-8 flex flex-col items-center justify-center transition-all cursor-pointer
              ${file ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50'}
            `} onClick={() => document.getElementById('fileInput').click()}>
              <input 
                id="fileInput"
                type="file" 
                className="hidden" 
                accept=".docx"
                onChange={e => setFile(e.target.files[0])}
              />
              <UploadCloud size={40} className={file ? 'text-green-500' : 'text-slate-400'} />
              <p className="mt-2 text-sm font-bold text-slate-600">
                {file ? file.name : "Nhấn để chọn hoặc kéo thả file"}
              </p>
              {!file && <p className="text-[10px] text-slate-400 mt-1 uppercase font-black">Hệ thống sẽ tự động bóc tách Điều/Khoản</p>}
            </div>
          </div>

          <button 
            disabled={loading}
            type="submit" 
            className={`w-full py-5 rounded-[1.5rem] font-black text-white shadow-xl flex items-center justify-center space-x-3 transition-all active:scale-95 ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}`}
          >
            {loading ? (
                <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang xử lý bóc tách...</span>
                </>
            ) : (
                <>
                    <FileText size={20} />
                    <span>Xác nhận & Khởi tạo Dự thảo</span>
                </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

const VibeEditModal = ({ isOpen, onClose, doc, onSuccess }) => {
  const [formData, setFormData] = useState({ 
    project_name: doc?.project_name || '', 
    drafting_agency: doc?.drafting_agency || '', 
    agency_location: doc?.agency_location || '',
    status: doc?.status || 'Draft'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const auth = getAuthHeader();
      await axios.patch(`/api/documents/${doc.id}/`, formData, auth);
      onSuccess();
      onClose();
    } catch (err) {
      alert('Lỗi khi cập nhật.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden">
        <div className="bg-slate-800 p-8 text-white flex justify-between items-center">
            <h2 className="text-2xl font-black italic underline decoration-blue-500 underline-offset-8">Hiệu chỉnh</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-xl transition-colors">
                <X size={24} />
            </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase">Tên Dự thảo</label>
            <input 
              type="text" 
              className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500"
              value={formData.project_name}
              onChange={e => setFormData({...formData, project_name: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase">Cơ quan</label>
                <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500"
                    value={formData.drafting_agency}
                    onChange={e => setFormData({...formData, drafting_agency: e.target.value})}
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase">Trạng thái</label>
                <select 
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 appearance-none"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                >
                    <option value="Draft">Draft</option>
                    <option value="Reviewing">Reviewing</option>
                    <option value="Completed">Completed</option>
                </select>
            </div>
          </div>
          <button 
            type="submit" 
            className="w-full py-4 mt-4 bg-blue-600 text-white rounded-[1.5rem] font-bold shadow-lg shadow-blue-600/10"
            disabled={loading}
          >
            {loading ? 'Đang cập nhật...' : 'Cập nhật Thông tin'}
          </button>
        </form>
      </div>
    </div>
  );
};

const VibeLeadModal = ({ isOpen, onClose, doc, users, onSuccess }) => {
  const [leadId, setLeadId] = useState(doc?.lead || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const auth = getAuthHeader();
      await axios.post(`/api/documents/${doc.id}/set_lead/`, { lead_id: leadId || null }, auth);
      onSuccess();
      onClose();
    } catch (err) {
      alert('Lỗi khi phân công công việc.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden">
        <div className="bg-amber-500 p-8 text-white flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-black">🏅 Phân công Chủ trì</h2>
                <p className="text-amber-100 text-[10px] mt-1 uppercase font-bold tracking-widest">{doc.project_name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-amber-400 rounded-xl transition-colors">
                <X size={24} />
            </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase ml-1">Chọn Cán bộ Chủ trì</label>
            <select 
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 transition-all font-medium appearance-none"
                value={leadId}
                onChange={e => setLeadId(e.target.value)}
            >
                <option value="">-- Để trống = Gỡ bỏ chủ trì --</option>
                {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name || u.username} ({u.role_name || u.username})</option>
                ))}
            </select>
          </div>
          
          <div className="bg-amber-50 rounded-2xl p-4 flex items-start space-x-3 border border-amber-100">
            <AlertCircle className="text-amber-500 mt-0.5" size={18} />
            <p className="text-xs text-amber-700 leading-relaxed font-medium">
                Người được chỉ định làm **Chủ trì** sẽ có toàn quyền phê duyệt giải trình và bóc tách các nội dung nâng cao cho dự thảo này.
            </p>
          </div>

          <button 
            type="submit" 
            className="w-full py-5 bg-amber-500 text-white rounded-[1.5rem] font-black shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
            disabled={loading}
          >
            {loading ? 'Đang thực hiện...' : 'Xác nhận Chủ trì'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VibeDocuments;
