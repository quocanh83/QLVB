import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  FileText, 
  Download, 
  Search, 
  Filter, 
  RefreshCw,
  MoreVertical,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Building2,
  CheckCircle2,
  X,
  Printer,
  Settings,
  Save,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  History,
  ArrowUp,
  ArrowDown,
  Loader2,
  Globe,
  Database,
  Eye
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { getAuthHeader } from '../utils/authHelpers';
import * as XLSX from 'xlsx';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const VibeReports = () => {
  const [activeTab, setActiveTab] = useState('stats'); // 'stats', 'custom', 'config'
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [statsData, setStatsData] = useState({ agency_stats: [], category_stats: {} });
  const [exportStats, setExportStats] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uncontributedData, setUncontributedData] = useState([]);
  const [currentDoc, setCurrentDoc] = useState(null);

  // Custom Report State (Consolidated)
  const [customStatsData, setCustomStatsData] = useState([]);
  const [customAgency, setCustomAgency] = useState('all');
  const [customStatus, setCustomStatus] = useState('all');
  const [customAgenciesList, setCustomAgenciesList] = useState([]);
  const [isCustomLoading, setIsCustomLoading] = useState(false);

  // ===== Report Template Configuration State =====
  const [templates, setTemplates] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [fieldConfigs, setFieldConfigs] = useState([]);
  const [fieldLogs, setFieldLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingField, setSavingField] = useState(null);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [showAddField, setShowAddField] = useState(false);

  // Template admin fields
  const [headerOrgName, setHeaderOrgName] = useState('');
  const [headerOrgLocation, setHeaderOrgLocation] = useState('');
  const [footerSignerName, setFooterSignerName] = useState('');
  const [footerSignerTitle, setFooterSignerTitle] = useState('');

  useEffect(() => {
    fetchDocuments();
    fetchExportStats();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchSubjectStats(selectedDocId);
    } else if (activeTab === 'custom') {
      fetchCustomAgencies(selectedDocId);
      fetchCustomPreview(selectedDocId, customAgency, customStatus);
    }
  }, [selectedDocId, activeTab, customAgency, customStatus]);

  const fetchDocuments = async () => {
    try {
      const auth = getAuthHeader();
      const res = await axios.get('/api/documents/', auth);
      setDocuments(res.data);
      if (res.data.length > 0 && !selectedDocId) setSelectedDocId(res.data[0].id);
    } catch (e) { console.error("Lỗi tải danh sách dự thảo", e); }
  };

  const fetchSubjectStats = async (docId) => {
    setLoading(true);
    try {
      const auth = getAuthHeader();
      const url = `/api/feedbacks/subject_stats/${docId ? `?document_id=${docId}` : ''}`;
      const res = await axios.get(url, auth);
      setStatsData(res.data);
    } catch (error) { console.error("Lỗi tải thống kê", error); }
    finally { setLoading(false); }
  };

  const fetchExportStats = async () => {
    try {
      const auth = getAuthHeader();
      const res = await axios.get('/api/documents/explanation_stats/', auth);
      setExportStats(res.data);
    } catch (error) { console.error("Lỗi tải thống kê xuất báo cáo", error); }
  };

  const fetchCustomAgencies = async (docId) => {
    if (!docId) return;
    try {
      const auth = getAuthHeader();
      const res = await axios.get(`/api/feedbacks/subject_stats/?document_id=${docId}`, auth);
      setCustomAgenciesList((res.data.agency_stats || []).map(a => a.agency));
    } catch (e) { console.error("Lỗi lấy danh sách cơ quan", e); }
  };

  const fetchCustomPreview = async (docId, agency, statusFilter) => {
    if (!docId) return;
    setIsCustomLoading(true);
    try {
      const auth = getAuthHeader();
      let url = `/api/feedbacks/custom_report_preview/?document_id=${docId}&status=${statusFilter}`;
      if (agency && agency !== 'all') url += `&agency=${encodeURIComponent(agency)}`;
      const res = await axios.get(url, auth);
      setCustomStatsData(res.data);
    } catch (error) { console.error("Lỗi preview", error); }
    finally { setIsCustomLoading(false); }
  };

  // ===== Template Management API Calls =====
  const fetchTemplates = async () => {
    setTemplateLoading(true);
    try {
      const auth = getAuthHeader();
      const res = await axios.get('/api/reports/templates/', auth);
      setTemplates(res.data);
      if (res.data.length > 0) selectTemplate(res.data[0]);
    } catch (e) { console.error("Lỗi tải mẫu", e); }
    finally { setTemplateLoading(false); }
  };

  const selectTemplate = (tpl) => {
    setActiveTemplate(tpl);
    setFieldConfigs(tpl.field_configs || []);
    setHeaderOrgName(tpl.header_org_name || '');
    setHeaderOrgLocation(tpl.header_org_location || '');
    setFooterSignerName(tpl.footer_signer_name || '');
    setFooterSignerTitle(tpl.footer_signer_title || '');
    fetchFieldLogs(tpl.id);
  };

  const fetchFieldLogs = async (templateId) => {
    try {
      const auth = getAuthHeader();
      const res = await axios.get(`/api/reports/templates/${templateId}/field_logs/`, auth);
      setFieldLogs(res.data);
    } catch (e) { console.error("Lỗi tải log", e); }
  };

  const saveTemplateHeader = async () => {
    if (!activeTemplate) return;
    setSavingTemplate(true);
    try {
      const auth = getAuthHeader();
      await axios.patch(`/api/reports/templates/${activeTemplate.id}/`, {
        header_org_name: headerOrgName,
        header_org_location: headerOrgLocation,
        footer_signer_name: footerSignerName,
        footer_signer_title: footerSignerTitle,
      }, auth);
      fetchTemplates();
    } catch (e) { alert("Lỗi khi lưu thông tin."); }
    finally { setSavingTemplate(false); }
  };

  const toggleField = async (fieldId, currentValue) => {
    setSavingField(fieldId);
    try {
      const auth = getAuthHeader();
      await axios.patch(`/api/reports/field-configs/${fieldId}/`, { is_enabled: !currentValue }, auth);
      fetchTemplates();
    } catch (e) { alert("Lỗi thay đổi trạng thái field."); }
    finally { setSavingField(null); }
  };

  const updateFieldLabel = async (fieldId, newLabel) => {
    setSavingField(fieldId);
    try {
      const auth = getAuthHeader();
      await axios.patch(`/api/reports/field-configs/${fieldId}/`, { field_label: newLabel }, auth);
      fetchTemplates();
    } catch (e) { alert("Lỗi cập nhật nhãn."); }
    finally { setSavingField(null); }
  };

  const addField = async () => {
    if (!newFieldKey || !newFieldLabel || !activeTemplate) return;
    try {
      const auth = getAuthHeader();
      await axios.post('/api/reports/field-configs/', {
        template: activeTemplate.id,
        field_key: newFieldKey,
        field_label: newFieldLabel,
        column_order: fieldConfigs.length,
        is_enabled: true
      }, auth);
      setNewFieldKey('');
      setNewFieldLabel('');
      setShowAddField(false);
      fetchTemplates();
    } catch (e) { alert("Mã trường đã tồn tại hoặc có lỗi."); }
  };

  const removeField = async (fieldId) => {
    if (!window.confirm("Bạn có chắc muốn xoá trường này?")) return;
    try {
      const auth = getAuthHeader();
      await axios.delete(`/api/reports/field-configs/${fieldId}/`, auth);
      fetchTemplates();
    } catch (e) { alert("Lỗi khi xoá trường."); }
  };

  const moveField = async (fieldId, direction) => {
    const idx = fieldConfigs.findIndex(f => f.id === fieldId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= fieldConfigs.length) return;
    setSavingField(fieldId);
    try {
      const auth = getAuthHeader();
      await Promise.all([
        axios.patch(`/api/reports/field-configs/${fieldConfigs[idx].id}/`, { column_order: swapIdx }, auth),
        axios.patch(`/api/reports/field-configs/${fieldConfigs[swapIdx].id}/`, { column_order: idx }, auth),
      ]);
      fetchTemplates();
    } catch (e) { alert("Lỗi đổi vị trí."); }
    finally { setSavingField(null); }
  };

  const handleExportCustomWord = () => {
    if (!selectedDocId) return;
    const token = localStorage.getItem('access_token');
    let url = `/api/feedbacks/export_mau_10/?document_id=${selectedDocId}&token=${token}&status=${customStatus}`;
    if (customAgency && customAgency !== 'all') url += `&agency=${encodeURIComponent(customAgency)}`;
    window.location.href = url;
  };

  const categoryMap = { ministry: 'Bộ/Ngành', local: 'Địa phương', organization: 'Tổ chức', enterprise: 'Doanh nghiệp', other: 'Khác' };

  const pieData = Object.keys(statsData.category_stats || {}).map(key => ({
    name: categoryMap[key] || key,
    value: statsData.category_stats[key]
  }));

  // ===== DEMO PREVIEW COMPONENT =====
  const ReportPreviewDemo = () => {
    const enabledFields = fieldConfigs.filter(f => f.is_enabled);
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-10 max-w-4xl mx-auto font-serif text-slate-800 scale-[0.85] origin-top border-t-8 border-t-indigo-500">
        <div className="flex justify-between items-start mb-8">
            <div className="text-center w-52">
                <p className="font-bold text-[13px] uppercase">{headerOrgName || 'BỘ/CƠ QUAN CHỦ TRÌ'}</p>
                <div className="w-16 h-[1px] bg-slate-800 mx-auto mt-1"></div>
            </div>
            <div className="text-center w-72">
                <p className="font-bold text-[13px] uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="font-bold text-[13px]">Độc lập - Tự do - Hạnh phúc</p>
                <div className="w-24 h-[1px] bg-slate-800 mx-auto mt-1"></div>
            </div>
        </div>
        <div className="text-center mb-10">
            <h2 className="font-bold text-lg uppercase leading-tight">BẢN TỔNG HỢP, GIẢI TRÌNH, TIẾP THU Ý KIẾN</h2>
            <p className="font-bold text-sm italic mt-1">Đối với dự thảo: [Tên Dự thảo hiển thị ở đây]</p>
        </div>
        <table className="w-full border-collapse border border-slate-800 text-[11px]">
            <thead>
                <tr className="bg-slate-50">
                    {enabledFields.map((f, i) => (
                        <th key={i} className="border border-slate-800 p-2 text-center uppercase font-bold" style={{ width: `${f.column_width_cm}cm` }}>
                            {f.field_label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                <tr>
                    {enabledFields.map((f, i) => (
                        <td key={i} className="border border-slate-800 p-2 text-slate-400 italic">
                             {f.field_key === 'stt' ? '1' : `[Dữ liệu ${f.field_label}]`}
                        </td>
                    ))}
                </tr>
            </tbody>
        </table>
        <div className="mt-10 flex flex-col items-end">
            <p className="italic text-xs mb-1">{headerOrgLocation || 'Hà Nội'}, ngày ... tháng ... năm ...</p>
            <div className="text-center min-w-[200px]">
                <p className="font-bold uppercase text-[12px]">{footerSignerTitle || 'CƠ QUAN CHỦ TRÌ'}</p>
                <p className="italic text-[10px] mt-1">(Ký tên, đóng dấu)</p>
                <div className="h-16"></div>
                {footerSignerName && <p className="font-bold text-[12px] mt-4">{footerSignerName}</p>}
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 bg-slate-50 p-6 lg:p-10 space-y-8 overflow-y-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Trung tâm Báo cáo</h1>
          <p className="text-slate-500 mt-1">Phân tích dữ liệu & Cấu hình mẫu báo cáo chuẩn Nghị định 30.</p>
        </div>
        <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex shrink-0">
            <button onClick={() => setActiveTab('stats')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'stats' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-blue-600'}`}>Thống kê</button>
            <button onClick={() => setActiveTab('custom')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'custom' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-blue-600'}`}>Báo cáo</button>
            <button onClick={() => setActiveTab('config')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'config' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-blue-600'}`}>Mẫu chuẩn</button>
        </div>
      </div>

      {activeTab === 'stats' && (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Filter */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
               <div className="flex items-center space-x-4 flex-1 w-full">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Filter size={20} /></div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Lọc theo dự thảo</p>
                        <select className="bg-transparent border-none p-0 font-bold text-slate-800 focus:ring-0 w-full" value={selectedDocId || ''} onChange={(e) => setSelectedDocId(e.target.value)}>
                            <option value="">-- Tất cả dự thảo --</option>
                            {documents.map(d => <option key={d.id} value={d.id}>{d.project_name}</option>)}
                        </select>
                    </div>
               </div>
               <button onClick={() => fetchSubjectStats(selectedDocId)} className="p-4 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all">
                 <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
               </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                    <h3 className="text-lg font-black text-slate-800 flex items-center space-x-2"><TrendingUp className="text-blue-500" size={20} /><span>Top 10 Đơn vị</span></h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer><BarChart data={(statsData.agency_stats || []).slice(0, 10)} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" /><XAxis type="number" hide /><YAxis dataKey="agency" type="category" width={100} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} /><RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none' }} /><Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} /><Bar dataKey="resolved" fill="#10b981" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                    <h3 className="text-lg font-black text-slate-800 flex items-center space-x-2"><PieIcon className="text-indigo-500" size={20} /><span>Nhóm cơ quan</span></h3>
                    <div className="h-80 w-full"><ResponsiveContainer><PieChart><Pie data={pieData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">{pieData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><RechartsTooltip /><Legend /></PieChart></ResponsiveContainer></div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'custom' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl p-10 space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 leading-tight">Báo cáo Tổng hợp Ý kiến</h2>
                        <p className="text-slate-500 text-sm mt-3 max-w-2xl">Mọi báo cáo được xuất theo định dạng chuẩn Mẫu 10 của Bộ Tư pháp với các trường dữ liệu tùy biến theo cấu hình bên dưới.</p>
                    </div>
                    <button onClick={handleExportCustomWord} disabled={!selectedDocId || customStatsData.length === 0} className="bg-indigo-600 hover:bg-slate-900 disabled:bg-slate-200 text-white font-black py-4 px-8 rounded-[1.5rem] text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-3 shrink-0">
                        <Download size={20} /><span>Tải Word</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Văn bản / Dự thảo</label>
                        <select className="w-full bg-white border-none py-3 px-4 rounded-xl font-bold text-sm shadow-sm focus:ring-2 focus:ring-indigo-500/20" value={selectedDocId || ''} onChange={(e) => setSelectedDocId(e.target.value)}>
                            {documents.map(doc => <option key={doc.id} value={doc.id}>{doc.project_name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Cơ quan góp ý</label>
                        <select className="w-full bg-white border-none py-3 px-4 rounded-xl font-bold text-sm shadow-sm focus:ring-2 focus:ring-indigo-500/20" value={customAgency} onChange={(e) => setCustomAgency(e.target.value)}>
                            <option value="all">Tất cả Cơ quan</option>
                            {customAgenciesList.map((a, i) => <option key={i} value={a}>{a}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Trạng thái giải trình</label>
                        <select className="w-full bg-white border-none py-3 px-4 rounded-xl font-bold text-sm shadow-sm focus:ring-2 focus:ring-indigo-500/20" value={customStatus} onChange={(e) => setCustomStatus(e.target.value)}>
                            <option value="all">Tất cả Ý kiến</option>
                            <option value="unresolved">Chưa xử lý</option>
                            <option value="resolved">Đã tiếp thu/giải trình</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-hidden border border-slate-100 rounded-[2.5rem] bg-indigo-50/10">
                    <div className="overflow-x-auto"><table className="w-full text-left">
                        <thead><tr className="bg-slate-100/50 text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="px-6 py-5 text-center">TT</th><th className="px-6 py-5">Điều/Khoản</th><th className="px-6 py-5">Cơ quan</th><th className="px-6 py-5">Nội dung</th><th className="px-6 py-5">Giải trình</th></tr></thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {isCustomLoading ? <tr><td colSpan="5" className="py-20 text-center"><Loader2 className="animate-spin inline text-blue-500" /></td></tr> : 
                             customStatsData.length === 0 ? <tr><td colSpan="5" className="py-20 text-center text-slate-400 font-bold uppercase text-xs">Không có dữ liệu</td></tr> : 
                             customStatsData.map((r, i) => (
                                <tr key={i} className="hover:bg-white bg-white/50"><td className="px-6 py-4 font-black text-slate-300 text-center">{r.stt}</td><td className="px-6 py-4 font-bold text-slate-800">{r.dieu_khoan}</td><td className="px-6 py-4"><span className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold">{r.co_quan}</span></td><td className="px-6 py-4 text-slate-600 line-clamp-2 hover:line-clamp-none transition-all">{r.noi_dung_gop_y}</td><td className="px-6 py-4 text-slate-800 font-medium italic">{r.noi_dung_giai_trinh || '---'}</td></tr>
                             ))
                            }
                        </tbody>
                    </table></div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 animate-in zoom-in-95 duration-500 items-start">
            {/* Form Cấu hình */}
            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden sticky top-0">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest text-xs">Cấu hình Mẫu Báo cáo</h3>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-black">Nghị định 30/2020/NĐ-CP Standard</p>
                    </div>
                    <button onClick={fetchTemplates} className="p-2 hover:bg-white rounded-xl transition-all"><RefreshCw size={16} className={templateLoading ? 'animate-spin' : ''} /></button>
                </div>
                
                {templateLoading ? <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" /></div> : !activeTemplate ? <div className="p-20 text-center text-slate-400">Chưa khởi tạo mẫu.</div> : (
                    <div className="divide-y divide-slate-50">
                        {/* Header Box */}
                        <div className="p-8 space-y-6">
                            <h4 className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-tighter"><Globe size={14} /><span>Thông tin hành chính</span></h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 px-1">Cơ quan chủ trì</label><input type="text" className="w-full bg-slate-100 border-none py-2.5 px-4 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500" value={headerOrgName} onChange={e => setHeaderOrgName(e.target.value)} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 px-1">Nơi ban hành</label><input type="text" className="w-full bg-slate-100 border-none py-2.5 px-4 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500" value={headerOrgLocation} onChange={e => setHeaderOrgLocation(e.target.value)} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 px-1">Chức danh người ký</label><input type="text" className="w-full bg-slate-100 border-none py-2.5 px-4 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500" value={footerSignerTitle} onChange={e => setFooterSignerTitle(e.target.value)} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 px-1">Họ tên người ký</label><input type="text" className="w-full bg-slate-100 border-none py-2.5 px-4 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500" value={footerSignerName} onChange={e => setFooterSignerName(e.target.value)} /></div>
                            </div>
                            <button onClick={saveTemplateHeader} disabled={savingTemplate} className="w-full bg-indigo-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                                {savingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} <span>Cập nhật Thông tin</span>
                            </button>
                        </div>

                        {/* Fields Config */}
                        <div className="p-8 space-y-6">
                            <div className="flex items-center justify-between"><h4 className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-tighter"><Database size={14} /><span>Cấu hình Cột dữ liệu</span></h4><button onClick={() => setShowAddField(!showAddField)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Plus size={14} /></button></div>
                            {showAddField && (
                                <div className="p-4 bg-indigo-50 rounded-2xl flex items-end gap-3 animate-in fade-in transition-all">
                                    <div className="flex-1 space-y-1"><label className="text-[9px] font-bold text-indigo-400 px-1">Mã trường</label><input type="text" className="w-full bg-white border-none py-2 px-3 rounded-lg text-xs" value={newFieldKey} onChange={e => setNewFieldKey(e.target.value)} placeholder="ma_cot" /></div>
                                    <div className="flex-1 space-y-1"><label className="text-[9px] font-bold text-indigo-400 px-1">Nhãn hiển thị</label><input type="text" className="w-full bg-white border-none py-2 px-3 rounded-lg text-xs" value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} placeholder="Tên cột" /></div>
                                    <button onClick={addField} className="bg-indigo-600 text-white p-2 rounded-lg"><CheckCircle2 size={16} /></button>
                                </div>
                            )}
                            <div className="space-y-2">
                                {fieldConfigs.map((f, i) => (
                                    <div key={f.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-sm">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="flex flex-col items-center gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => moveField(f.id, 'up')} disabled={i === 0}><ArrowUp size={10}/></button>
                                                <button onClick={() => moveField(f.id, 'down')} disabled={i === fieldConfigs.length-1}><ArrowDown size={10}/></button>
                                            </div>
                                            <div className="flex flex-col">
                                                <input type="text" className="bg-transparent border-none p-0 font-bold text-xs focus:ring-0 text-slate-800" value={f.field_label} onChange={e => setFieldConfigs(prev => prev.map(x => x.id === f.id ? {...x, field_label: e.target.value} : x))} onBlur={e => updateFieldLabel(f.id, e.target.value)} />
                                                <span className="text-[8px] font-mono text-slate-400 uppercase">{f.field_key}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => toggleField(f.id, f.is_enabled)}>{f.is_enabled ? <ToggleRight size={20} className="text-indigo-600" /> : <ToggleLeft size={20} className="text-slate-300" />}</button>
                                            {!f.is_default && <button onClick={() => removeField(f.id)} className="text-red-300 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Logs */}
                        <div className="p-8"><button onClick={() => { setShowLogs(!showLogs); if(!showLogs) fetchFieldLogs(activeTemplate.id); }} className="flex items-center justify-between w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"><span>Nhật ký ghi vết ({fieldLogs.length})</span>{showLogs ? <X size={14} /> : <History size={14} />}</button>{showLogs && <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">{fieldLogs.map((l, i) => <div key={i} className="text-[9px] p-2 bg-slate-50 rounded-lg flex justify-between"><span><b className="text-slate-600">{l.action}</b>: {l.old_value} → {l.new_value}</span><span className="text-slate-300 font-mono italic">{new Date(l.changed_at).toLocaleTimeString('vi-VN')}</span></div>)}</div>}</div>
                    </div>
                )}
            </div>

            {/* DEMO PREVIEW AREA */}
            <div className="space-y-6 xl:sticky xl:top-0">
                <div className="flex items-center justify-between px-6">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Eye size={16} className="text-indigo-500" />
                        <span>Xem trước trực quan (Live Demo)</span>
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-[10px] font-black text-green-600 tracking-widest uppercase">Live View</span>
                    </div>
                </div>
                <ReportPreviewDemo />
                <div className="bg-amber-50 p-6 rounded-[2.5rem] border border-amber-100 flex gap-4 mx-6">
                    <AlertCircle className="text-amber-500 shrink-0" size={20} />
                    <p className="text-[10px] text-amber-700 leading-relaxed font-bold">Lưu ý: Demo này hiển thị cấu trúc trang Word chuẩn Nghị định 30. Nội dung bảng chỉ mang tính chất minh họa để bạn dễ dàng căn chỉnh cột.</p>
                </div>
            </div>
        </div>
      )}

      {/* Uncontributed Modal (Remains same) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 border-t-8 border-indigo-600">
                <div className="p-8 flex justify-between items-center border-b border-slate-50">
                    <div><h2 className="text-xl font-black italic text-slate-900">Danh sách Đôn đốc</h2><p className="text-slate-400 text-[9px] uppercase font-black tracking-widest">Cơ quan chưa tham gia đóng góp ý kiến</p></div>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X size={20} /></button>
                </div>
                <div className="p-8">
                     <div className="bg-indigo-50/50 p-6 rounded-3xl mb-6 border border-indigo-100"><p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter mb-1">Dự thảo</p><h4 className="flex-1 font-black text-slate-800 text-lg">{currentDoc?.project_name}</h4></div>
                     <div className="max-h-80 overflow-y-auto custom-scrollbar border border-slate-100 rounded-3xl"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 border-b border-slate-100"><tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest"><th className="px-6 py-4">Tên Cơ quan</th><th className="px-6 py-4 text-center">Phân loại</th></tr></thead><tbody className="divide-y divide-slate-100">{uncontributedData.map((a, i) => <tr key={i} className="hover:bg-slate-50/50 transition-colors"><td className="px-6 py-4 font-bold text-slate-700">{a.name}</td><td className="px-6 py-4 text-center"><span className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase text-indigo-500">{categoryMap[a.category] || a.category}</span></td></tr>)}</tbody></table></div>
                     <button className="w-full py-4 bg-slate-900 text-white rounded-3xl font-black mt-8 shadow-2xl shadow-slate-900/20 flex items-center justify-center space-x-2 active:scale-95 transition-all text-xs uppercase tracking-widest"><Printer size={16} /><span>Xuất danh sách (PDF)</span></button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default VibeReports;
