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
  TrendingUp,
  Building2,
  CheckCircle2,
  X,
  Printer
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { getAuthHeader } from '../utils/authHelpers';
import * as XLSX from 'xlsx';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const VibeReports = () => {
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' or 'export'
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [statsData, setStatsData] = useState({ agency_stats: [], category_stats: {} });
  const [exportStats, setExportStats] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uncontributedData, setUncontributedData] = useState([]);
  const [currentDoc, setCurrentDoc] = useState(null);

  // Custom Report State
  const [customStatsData, setCustomStatsData] = useState([]);
  const [customAgency, setCustomAgency] = useState('all');
  const [customStatus, setCustomStatus] = useState('all');
  const [customAgenciesList, setCustomAgenciesList] = useState([]);
  const [isCustomLoading, setIsCustomLoading] = useState(false);

  useEffect(() => {
    fetchDocuments();
    fetchExportStats();
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
    } catch (error) {
       console.error("Lỗi tải thống kê", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExportStats = async () => {
    try {
      const auth = getAuthHeader();
      const res = await axios.get('/api/documents/explanation_stats/', auth);
      setExportStats(res.data);
    } catch (error) {
      console.error("Lỗi tải thống kê xuất báo cáo", error);
    }
  };

  const fetchCustomAgencies = async (docId) => {
    if (!docId) return;
    try {
      const auth = getAuthHeader();
      const res = await axios.get(`/api/feedbacks/subject_stats/?document_id=${docId}`, auth);
      setCustomAgenciesList((res.data.agency_stats || []).map(a => a.agency));
    } catch (e) {
      console.error("Lỗi lấy danh sách cơ quan custom", e);
    }
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
    } catch (error) {
      console.error("Lỗi xem trước báo cáo tuỳ biến", error);
    } finally {
      setIsCustomLoading(false);
    }
  };

  const handleExportCustomWord = () => {
    if (!selectedDocId) return;
    const token = localStorage.getItem('access_token');
    let url = `/api/feedbacks/export_mau_10/?document_id=${selectedDocId}&token=${token}&status=${customStatus}`;
    if (customAgency && customAgency !== 'all') url += `&agency=${encodeURIComponent(customAgency)}`;
    window.location.href = url;
  };

  const handleExportWord = (docId) => {
    const token = localStorage.getItem('access_token');
    window.location.href = `/api/documents/${docId}/export_report/?token=${token}`;
  };

  const handleViewUncontributed = async (doc) => {
    setCurrentDoc(doc);
    setIsModalOpen(true);
    setLoading(true);
    try {
      const auth = getAuthHeader();
      const res = await axios.get(`/api/feedbacks/uncontributed/?document_id=${doc.id}`, auth);
      setUncontributedData(res.data);
    } catch (error) {
      console.error("Lỗi tải danh sách chưa góp ý", error);
    } finally {
      setLoading(false);
    }
  };

  const categoryMap = { ministry: 'Bộ/Ngành', local: 'Địa phương', organization: 'Tổ chức', enterprise: 'Doanh nghiệp', other: 'Khác' };

  const handleExportExcel = () => {
    if (!statsData.agency_stats || statsData.agency_stats.length === 0) return;
    
    // Chuẩn bị dữ liệu Excel
    const excelData = statsData.agency_stats.map(s => ({
        "Cơ quan / Đơn vị": s.agency,
        "Phân loại": categoryMap[s.category] || s.category,
        "Tổng Góp ý": s.total,
        "Đã giải trình": s.resolved,
        "Tỉ lệ hoàn thành (%)": s.resolve_rate
    }));

    // Tạo Worksheet và Workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Căn chỉnh độ rộng cột cơ bản
    worksheet['!cols'] = [
        { wch: 40 }, // Cơ quan
        { wch: 20 }, // Phân loại
        { wch: 15 }, // Tổng
        { wch: 15 }, // Đã giải trình
        { wch: 25 }, // Tỉ lệ
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Thong Ke Chu The");

    // Khởi tạo tải file
    XLSX.writeFile(workbook, `Thong_Ke_Gop_Y_${selectedDocId || 'Tat_ca'}.xlsx`);
  };
  const pieData = Object.keys(statsData.category_stats || {}).map(key => ({
    name: categoryMap[key] || key,
    value: statsData.category_stats[key]
  }));

  return (
    <div className="flex-1 bg-slate-50 p-6 lg:p-10 space-y-8 overflow-y-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Trung tâm Báo cáo</h1>
          <p className="text-slate-500 mt-1">Phân tích dữ liệu góp ý và xuất báo cáo tổng hợp theo quy định.</p>
        </div>
        <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex">
            <button 
                onClick={() => setActiveTab('stats')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'stats' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-blue-600'}`}
            >
                Thống kê Chủ thể
            </button>
            <button 
                onClick={() => setActiveTab('export')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'export' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-blue-600'}`}
            >
                Xuất Báo cáo
            </button>
        </div>
      </div>

      {activeTab === 'stats' ? (
        <div className="space-y-8">
            {/* Filter */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
               <div className="flex items-center space-x-4 flex-1 w-full">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                        <Filter size={20} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Lọc theo dự thảo</p>
                        <select 
                            className="bg-transparent border-none p-0 font-bold text-slate-800 focus:ring-0 w-full cursor-pointer"
                            value={selectedDocId || ''}
                            onChange={(e) => setSelectedDocId(e.target.value)}
                        >
                            <option value="">-- Tất cả dự thảo --</option>
                            {documents.map(d => <option key={d.id} value={d.id}>{d.project_name}</option>)}
                        </select>
                    </div>
               </div>
               <button 
                onClick={() => fetchSubjectStats(selectedDocId)}
                className="p-4 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
               >
                 <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
               </button>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                    <h3 className="text-lg font-black text-slate-800 flex items-center space-x-2">
                        <TrendingUp className="text-blue-500" size={20} />
                        <span>Top 10 Đơn vị tích cực</span>
                    </h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={(statsData.agency_stats || []).slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="agency" type="category" width={120} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="total" name="Góp ý" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                <Bar dataKey="resolved" name="Đã giải" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                    <h3 className="text-lg font-black text-slate-800 flex items-center space-x-2">
                        <PieIcon className="text-indigo-500" size={20} />
                        <span>Phân bổ theo Nhóm cơ quan</span>
                    </h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Chi tiết Số liệu theo Đơn vị</h3>
                    <button onClick={handleExportExcel} className="text-emerald-600 hover:bg-emerald-50 px-3 py-2 rounded-xl transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                        <Download size={14} />
                        Xuất Excel
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-4">Đơn vị</th>
                                <th className="px-6 py-4">Phân loại</th>
                                <th className="px-6 py-4 text-center">Tổng Góp ý</th>
                                <th className="px-6 py-4 text-center">Đã giải trình</th>
                                <th className="px-6 py-4">Tỉ lệ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm">
                            {(statsData.agency_stats || []).map((s, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4 font-bold text-slate-700">{s.agency}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500 uppercase">
                                            {categoryMap[s.category] || s.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center font-black">{s.total}</td>
                                    <td className="px-6 py-4 text-center text-green-600 font-black">{s.resolved}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: `${s.resolve_rate}%` }}></div>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400">{s.resolve_rate}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      ) : activeTab === 'export' ? (
        /* EXPORT TAB */
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 space-y-8">
            <div className="max-w-2xl">
                 <h2 className="text-xl font-black text-slate-800">Xuất Báo cáo Tiếp thu, Giải trình</h2>
                 <p className="text-slate-500 text-sm mt-2">Dưới đây là danh sách các dự thảo đã được bóc tách ý kiến. Bạn có thể xuất báo cáo hoàn chỉnh định dạng Word hoặc xem danh sách các cơ quan chưa hoàn thành nhiệm vụ.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exportStats.map(doc => (
                    <div key={doc.id} className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 hover:border-blue-200 hover:bg-white transition-all group">
                        <div className="flex items-start justify-between mb-6">
                            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <FileText size={24} />
                            </div>
                            <div className="px-2.5 py-1 bg-white rounded-full text-[10px] font-black uppercase text-slate-400 group-hover:text-blue-600 transition-colors">
                                #{doc.id}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-black text-slate-800 leading-tight min-h-[3rem]">{doc.project_name}</h4>
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-400 uppercase tracking-widest">Tiến độ</span>
                                <span className="text-blue-600">{doc.resolved_feedbacks} / {doc.total_feedbacks} Ý kiến</span>
                            </div>
                            <div className="w-full h-2 bg-white rounded-full overflow-hidden shadow-inner border border-slate-100">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(doc.resolved_feedbacks / (doc.total_feedbacks || 1)) * 100}%` }}></div>
                            </div>
                            <div className="pt-4 flex items-center gap-2">
                                <button 
                                    onClick={() => handleExportWord(doc.id)}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/10 flex items-center justify-center space-x-2 transition-all active:scale-95"
                                >
                                    <Download size={14} />
                                    <span>Xuất Word</span>
                                </button>
                                <button 
                                    onClick={() => handleViewUncontributed(doc)}
                                    className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-2xl transition-all"
                                    title="Xem DS chưa góp ý"
                                >
                                    <Building2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      ) : activeTab === 'custom' ? (
        /* CUSTOM REPORT TAB */
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="max-w-2xl">
                    <h2 className="text-xl font-black text-slate-800">Báo cáo Tổng hợp Ý kiến (Tuỳ biến)</h2>
                    <p className="text-slate-500 text-sm mt-2">Tính năng này cho phép lọc xem trước các ý kiến góp ý theo cơ quan và trạng thái, sau đó trích xuất ra báo cáo định dạng Mẫu 10 chuẩn của Bộ Tư pháp.</p>
                </div>
                <button 
                    onClick={handleExportCustomWord}
                    disabled={!selectedDocId || customStatsData.length === 0}
                    className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 px-6 rounded-2xl text-[12px] uppercase tracking-widest shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2 transition-all active:scale-95"
                >
                    <Download size={16} />
                    <span>Tải Báo Cáo (Word)</span>
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Chọn Dự thảo</label>
                    <div className="relative">
                        <select 
                            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-3 pl-4 pr-10 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
                            value={selectedDocId || ''}
                            onChange={(e) => setSelectedDocId(e.target.value)}
                        >
                            {documents.map(doc => (
                                <option key={doc.id} value={doc.id}>{doc.project_name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Cơ quan góp ý</label>
                    <div className="relative">
                        <select 
                            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-3 pl-4 pr-10 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
                            value={customAgency}
                            onChange={(e) => setCustomAgency(e.target.value)}
                        >
                            <option value="all">Tất cả Cơ quan</option>
                            {customAgenciesList.map((agency, idx) => (
                                <option key={idx} value={agency}>{agency}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Trạng thái giải trình</label>
                    <div className="relative">
                        <select 
                            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-3 pl-4 pr-10 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
                            value={customStatus}
                            onChange={(e) => setCustomStatus(e.target.value)}
                        >
                            <option value="all">Tất cả Ý kiến</option>
                            <option value="unresolved">Chưa giải trình</option>
                            <option value="resolved">Đã giải trình</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="overflow-hidden border border-slate-100 rounded-[2rem] bg-white">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-4 w-12 text-center">TT</th>
                                <th className="px-6 py-4 w-48">Điều / Khoản</th>
                                <th className="px-6 py-4 w-48">Cơ quan góp ý</th>
                                <th className="px-6 py-4 min-w-[250px]">Nội dung góp ý</th>
                                <th className="px-6 py-4 min-w-[250px]">Nội dung giải trình</th>
                                <th className="px-6 py-4 w-32">Chuyên viên</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm">
                            {isCustomLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <RefreshCw className="animate-spin text-blue-500" size={24} />
                                            <span className="font-bold text-xs uppercase tracking-widest">Đang tải dữ liệu...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : customStatsData.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                                                <Filter size={24} />
                                            </div>
                                            <span className="font-bold text-slate-400">Không có dữ liệu phù hợp với bộ lọc</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                customStatsData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 text-center font-black text-slate-400">{row.stt}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700">{row.dieu_khoan}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                                                {row.co_quan}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 whitespace-pre-wrap">{row.noi_dung_gop_y}</td>
                                        <td className="px-6 py-4 text-slate-600 whitespace-pre-wrap">{row.noi_dung_giai_trinh || '-'}</td>
                                        <td className="px-6 py-4 font-medium text-slate-700">{row.chuyen_vien || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      ) : null}

      {/* Uncontributed Agencies Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden">
                <div className="bg-indigo-600 p-8 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black italic">Danh sách Đôn đốc</h2>
                        <p className="text-indigo-100 text-[10px] mt-1 uppercase font-bold tracking-widest">Cơ quan chưa tham gia đóng góp ý kiến</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-indigo-500 rounded-xl transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-8">
                     <div className="bg-slate-50 p-4 rounded-2xl mb-6">
                         <p className="text-xs font-bold text-slate-500">Đối với dự thảo:</p>
                         <h4 className="font-black text-slate-800">{currentDoc?.project_name}</h4>
                     </div>
                     <div className="max-h-80 overflow-y-auto custom-scrollbar border rounded-2xl">
                         <table className="w-full text-left text-sm">
                             <thead className="sticky top-0 bg-white">
                                 <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                     <th className="px-6 py-4">Tên Cơ quan</th>
                                     <th className="px-6 py-4">Phân loại</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                                 {uncontributedData.map((agency, idx) => (
                                     <tr key={idx} className="hover:bg-slate-50/50">
                                         <td className="px-6 py-3 font-bold text-slate-700">{agency.name}</td>
                                         <td className="px-6 py-3">
                                             <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase">
                                                 {categoryMap[agency.category] || agency.category}
                                             </span>
                                         </td>
                                     </tr>
                                 ))}
                                 {uncontributedData.length === 0 && (
                                     <tr>
                                         <td colSpan="2" className="px-6 py-10 text-center italic text-slate-400">
                                             Tất cả các cơ quan đã hoàn thành góp ý!
                                         </td>
                                     </tr>
                                 )}
                             </tbody>
                         </table>
                     </div>
                     <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black mt-6 shadow-xl shadow-indigo-600/20 flex items-center justify-center space-x-2">
                        <Printer size={18} />
                        <span>Xuất danh sách Đôn đốc (PDF)</span>
                     </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default VibeReports;
