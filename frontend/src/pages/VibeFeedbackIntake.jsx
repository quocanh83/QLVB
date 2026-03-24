import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Upload, 
  Save, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  FileText, 
  Search, 
  Database, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  MoreVertical,
  Building2,
  Table as TableIcon
} from 'lucide-react';
import { getAuthHeader } from '../utils/authHelpers';

const VibeFeedbackIntake = () => {
    const [documents, setDocuments] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState(null);
    const [nodes, setNodes] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [metadata, setMetadata] = useState(null);
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedAgencyForUpload, setSelectedAgencyForUpload] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const queryDocId = new URLSearchParams(location.search).get('docId');
        if (queryDocId) setSelectedDocId(parseInt(queryDocId));
        fetchInitialData();
    }, [location]);

    useEffect(() => {
        if (selectedDocId) fetchNodes(selectedDocId);
    }, [selectedDocId]);

    const fetchInitialData = async () => {
        try {
            const auth = getAuthHeader();
            const [docRes, agencyRes] = await Promise.all([
                axios.get('/api/documents/', auth),
                axios.get('/api/settings/agencies/', auth)
            ]);
            setDocuments(docRes.data);
            setAgencies(agencyRes.data);
        } catch (e) { console.error("Lỗi tải dữ liệu ban đầu", e); }
    };

    const fetchNodes = async (docId) => {
        try {
            const auth = getAuthHeader();
            const res = await axios.get(`/api/feedbacks/get_document_nodes/?document_id=${docId}`, auth);
            setNodes(res.data);
        } catch (e) { console.error("Lỗi tải cấu trúc dự thảo", e); }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!selectedDocId) {
            alert("Vui lòng chọn Dự thảo văn bản trước!");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_id', selectedDocId);
        if (selectedAgencyForUpload) formData.append('agency_id', selectedAgencyForUpload);

        try {
            const auth = getAuthHeader();
            const res = await axios.post('/api/feedbacks/parse_file/', formData, {
                headers: { ...auth.headers, 'Content-Type': 'multipart/form-data' }
            });
            
            const enriched = res.data.feedbacks.map((f, i) => ({
                ...f,
                key: `file-${Date.now()}-${i}`,
                node_id: f.node_id || null
            }));
            
            setFeedbacks(enriched);
            setMetadata(res.data.metadata);
        } catch (e) {
            alert("Lỗi khi phân rã file góp ý.");
        } finally {
            setUploading(false);
        }
    };

    const addManualFeedback = () => {
        const newFb = {
            key: `manual-${Date.now()}`,
            content: '',
            agency_id: null,
            node_id: null
        };
        setFeedbacks([...feedbacks, newFb]);
    };

    const removeFeedback = (key) => {
        setFeedbacks(feedbacks.filter(f => f.key !== key));
    };

    const updateFeedbackField = (key, field, value) => {
        setFeedbacks(feedbacks.map(f => f.key === key ? { ...f, [field]: value } : f));
    };

    const handleSave = async () => {
        if (!selectedDocId) return alert("Chưa chọn dự thảo!");
        if (feedbacks.length === 0) return alert("Danh sách góp ý trống!");

        setSaving(true);
        try {
            const auth = getAuthHeader();
            await axios.post('/api/feedbacks/bulk_create/', {
                document_id: selectedDocId,
                feedbacks: feedbacks,
                metadata: metadata
            }, auth);
            navigate(`/vibe-dashboard?docId=${selectedDocId}`);
        } catch (e) {
            alert("Lỗi khi lưu góp ý.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex-1 bg-slate-50 p-6 lg:p-10 space-y-8 overflow-y-auto font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 transition-all hover:bg-blue-50"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Tiếp nhận Góp ý</h1>
                        <p className="text-slate-500 mt-1">Nạp dữ liệu từ file văn bản hoặc nhập thủ công vào hệ thống.</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <button 
                        onClick={addManualFeedback}
                        className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center space-x-2"
                    >
                        <Plus size={18} />
                        <span>Thêm mới</span>
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saving || feedbacks.length === 0}
                        className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center space-x-2"
                    >
                        {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                        <span>Lưu hệ thống</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Fixed Left Panel */}
                <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-0">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                <Database size={20} />
                            </div>
                            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">1. Thiết lập Nguồn</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Dự thảo mục tiêu</label>
                                <select 
                                    className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-sm appearance-none"
                                    value={selectedDocId || ''}
                                    onChange={(e) => setSelectedDocId(parseInt(e.target.value))}
                                >
                                    <option value="">-- Chọn dự thảo --</option>
                                    {documents.map(d => <option key={d.id} value={d.id}>{d.project_name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Đơn vị góp ý (Tùy chọn)</label>
                                <select 
                                    className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-sm appearance-none"
                                    value={selectedAgencyForUpload || ''}
                                    onChange={(e) => setSelectedAgencyForUpload(e.target.value)}
                                >
                                    <option value="">-- Chọn đơn vị --</option>
                                    {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>

                            <div className="pt-2">
                                <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2rem] p-8 cursor-pointer hover:bg-blue-50/50 hover:border-blue-300 transition-all group relative overflow-hidden">
                                     <input type="file" className="hidden" accept=".docx" onChange={handleFileUpload} disabled={uploading || !selectedDocId} />
                                     <div className={`flex flex-col items-center transition-all ${uploading ? 'opacity-0' : 'opacity-100'}`}>
                                         <Upload size={32} className="text-slate-400 group-hover:text-blue-500 mb-4 transition-colors" />
                                         <p className="text-sm font-black text-slate-700">Tải lên File .docx</p>
                                         <p className="text-xs text-slate-400 mt-1">Bóc tách ý kiến tự động bằng AI</p>
                                     </div>
                                     {uploading && (
                                         <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
                                             <RefreshCw size={24} className="text-blue-600 animate-spin mb-2" />
                                             <p className="text-xs font-black text-blue-600">Đang bóc tách...</p>
                                         </div>
                                     )}
                                </label>
                            </div>
                        </div>
                    </div>

                    {metadata && (
                        <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-600/20 space-y-6 relative overflow-hidden group">
                            <div className="absolute right-0 top-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                            <div className="flex items-center space-x-3">
                                <CheckCircle2 size={24} />
                                <h3 className="font-black italic text-lg tracking-tight">Dữ liệu bóc tách</h3>
                            </div>
                            <div className="space-y-4 text-xs font-medium text-indigo-100">
                                <div className="flex justify-between border-b border-white/10 pb-2">
                                    <span>Đơn vị chủ trì:</span>
                                    <span className="font-black text-white">{metadata.drafting_agency || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/10 pb-2">
                                    <span>Địa danh:</span>
                                    <span className="font-black text-white">{metadata.agency_location || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/10 pb-2">
                                    <span>Tổng đầu góp ý:</span>
                                    <span className="font-black text-white">{metadata.total_feedbacks_doc || 0}</span>
                                </div>
                                <div className="bg-white/10 p-4 rounded-2xl mt-4 flex items-start space-x-3">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    <p className="leading-relaxed opacity-80">Thông tin này sẽ được cập nhật đồng bộ vào dự thảo sau khi lưu.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div className="flex items-center space-x-3">
                                <TableIcon className="text-blue-600" size={20} />
                                <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Phân loại & Kiểm tra ({feedbacks.length})</h3>
                            </div>
                        </div>

                        <div className="flex-1">
                            {feedbacks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full py-32 space-y-6 opacity-40">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                                        <FileText size={40} className="text-slate-400" />
                                    </div>
                                    <div className="text-center max-w-xs">
                                        <p className="text-sm font-black text-slate-800">Chưa có dữ liệu góp ý</p>
                                        <p className="text-xs text-slate-500 mt-1">Hãy tải file lên hoặc bấm "Thêm mới" để bắt đầu nạp dữ liệu thủ công.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                                <th className="px-8 py-4">Nội dung góp ý</th>
                                                <th className="px-8 py-4 w-48">Phân loại Đơn vị</th>
                                                <th className="px-8 py-4 w-48">Điều / Khoản mục tiêu</th>
                                                <th className="px-8 py-4 w-16"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {feedbacks.map((fb) => (
                                                <tr key={fb.key} className="hover:bg-slate-50/50 group transition-colors">
                                                    <td className="px-8 py-6">
                                                        <textarea 
                                                            className="w-full bg-slate-100/50 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 min-h-[100px] transition-all"
                                                            value={fb.content}
                                                            onChange={(e) => updateFeedbackField(fb.key, 'content', e.target.value)}
                                                            placeholder="Nhập nội dung ý kiến..."
                                                        />
                                                    </td>
                                                    <td className="px-8 py-6 align-top">
                                                        <select 
                                                            className="w-full bg-slate-100/50 border-none rounded-xl py-2 px-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 appearance-none"
                                                            value={fb.agency_id || ''}
                                                            onChange={(e) => updateFeedbackField(fb.key, 'agency_id', e.target.value)}
                                                        >
                                                            <option value="">Chọn cơ quan</option>
                                                            {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="px-8 py-6 align-top">
                                                        <select 
                                                            className="w-full bg-slate-100/50 border-none rounded-xl py-2 px-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 appearance-none"
                                                            value={fb.node_id || ''}
                                                            onChange={(e) => updateFeedbackField(fb.key, 'node_id', e.target.value)}
                                                        >
                                                            <option value="">Chọn mục tiêu</option>
                                                            {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="px-8 py-6 align-top text-right">
                                                        <button 
                                                            onClick={() => removeFeedback(fb.key)}
                                                            className="lg:opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VibeFeedbackIntake;
