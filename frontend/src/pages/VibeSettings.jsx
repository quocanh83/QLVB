import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Settings, 
  ShieldCheck, 
  Cpu, 
  Save, 
  RefreshCw, 
  Lock, 
  Eye, 
  EyeOff,
  AlertCircle,
  ChevronRight,
  Database,
  Globe,
  Upload,
  FileText,
  Trash2,
  FileCheck
} from 'lucide-react';
import { getAuthHeader } from '../utils/authHelpers';

const VibeSettings = () => {
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingValues, setEditingValues] = useState({});
    const [savingId, setSavingId] = useState(null);
    const [showKeys, setShowKeys] = useState({});
    const [updating, setUpdating] = useState(false);
    const [reportTemplates, setReportTemplates] = useState([]);
    const [uploadingTpl, setUploadingTpl] = useState(null);

    const fetchReportTemplates = async () => {
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

    const handleSystemUpdate = async () => {
        if (!window.confirm('Hệ thống sẽ kéo mã nguồn mới nhất từ GitHub và khởi động lại. Máy chủ có thể gián đoạn trong ít phút.\n\nLưu ý: Bạn phải cấp quyền visudo trên máy chủ trước khi sử dụng tính năng này.')) return;
        setUpdating(true);
        try {
            const auth = getAuthHeader();
            await axios.post('/api/settings/update-system/', {}, auth);
            alert('Quá trình cập nhật đã bắt đầu trên máy chủ! Vui lòng chờ 1-2 phút rồi tải lại trang.');
        } catch (e) {
            console.error('Lỗi khi cập nhật:', e);
            alert('Có lỗi khi gọi lệnh cập nhật.');
        } finally {
            setUpdating(false);
        }
    };

    useEffect(() => { fetchSettings(); fetchReportTemplates(); }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const auth = getAuthHeader();
            const res = await axios.get('/api/settings/', auth);
            setSettings(res.data);
            const initValues = {};
            res.data.forEach(s => { initValues[s.id] = s.value; });
            setEditingValues(initValues);
        } catch (e) { console.error('Lỗi tải cấu hình', e); }
        finally { setLoading(false); }
    };

    const handleValueChange = (id, value) => {
        setEditingValues(prev => ({ ...prev, [id]: value }));
    };

    const saveSetting = async (id) => {
        setSavingId(id);
        try {
            const auth = getAuthHeader();
            await axios.patch(`/api/settings/${id}/`, { value: editingValues[id] }, auth);
            fetchSettings();
        } catch (e) { alert('Lỗi khi lưu cấu hình.'); }
        finally { setSavingId(null); }
    };

    const toggleShowKey = (id) => {
        setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="flex-1 bg-slate-50 p-6 lg:p-10 space-y-8 overflow-y-auto font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Cấu hình Hệ thống</h1>
                    <p className="text-slate-500 mt-1">Quản lý tham số vận hành, kết nối AI và các thiết lập nâng cao.</p>
                </div>
                <button onClick={fetchSettings} className="flex items-center space-x-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                  <span>Làm mới bộ nhớ đệm</span>
                </button>
            </div>

            <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden group">
                <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md"><Cpu size={32} /></div>
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-xl font-black">AI & Cloud Copilot</h3>
                        <p className="text-blue-100 text-sm mt-1 max-w-2xl">Cấu hình API Key cho các LLMs. Các giá trị này mức độ ưu tiên cao hơn biến môi trường server.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Database className="text-blue-600" size={24} />
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest text-xs">Tham số vận hành</h3>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {settings.map((s) => (
                            <div key={s.id} className="p-8 hover:bg-slate-50/50 transition-colors">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                                    <div className="lg:col-span-4 space-y-1">
                                        <span className="text-sm font-black text-slate-800">{s.key}</span>
                                        <p className="text-xs text-slate-400 font-medium">{s.description}</p>
                                    </div>
                                    <div className="lg:col-span-6 relative">
                                        {s.key.includes('KEY') || s.key.includes('SECRET') ? (
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                <input type={showKeys[s.id] ? "text" : "password"} className="w-full pl-11 pr-12 py-3.5 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-mono text-xs" value={editingValues[s.id] || ''} onChange={(e) => handleValueChange(s.id, e.target.value)} />
                                                <button onClick={() => toggleShowKey(s.id)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600">{showKeys[s.id] ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                                            </div>
                                        ) : (
                                            <input type="text" className="w-full px-5 py-3.5 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-xs font-bold" value={editingValues[s.id] || ''} onChange={(e) => handleValueChange(s.id, e.target.value)} />
                                        )}
                                    </div>
                                    <div className="lg:col-span-2 flex justify-end">
                                        <button disabled={savingId === s.id} onClick={() => saveSetting(s.id)} className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-xs font-black uppercase transition-all shadow-sm ${editingValues[s.id] !== s.value ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                                            {savingId === s.id ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                            <span>Lưu</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Template Báo cáo Upload */}
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

                <div className="bg-slate-900 rounded-[3rem] p-8 md:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
                    <div className="relative z-10 space-y-2 flex-1">
                        <div className="flex items-center space-x-3"><div className="p-2 bg-slate-800 rounded-xl"><RefreshCw size={24} className={updating ? 'animate-spin text-blue-400' : 'text-slate-300'} /></div><h3 className="text-xl font-black">Cập nhật (Git)</h3></div>
                        <p className="text-slate-400 text-sm">V{__APP_VERSION__} - Bấm để tự động cập nhật code mới nhất.</p>
                    </div>
                    <button onClick={handleSystemUpdate} disabled={updating} className={`w-full md:w-auto px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center space-x-3 transition-all ${updating ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg shadow-blue-500/20 active:scale-95'}`}>
                        {updating ? <><RefreshCw size={18} className="animate-spin" /><span>Đang update...</span></> : <><span>Bắt đầu Cập nhật</span><ChevronRight size={18} /></>}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default VibeSettings;
