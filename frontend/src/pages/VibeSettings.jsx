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
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Database,
  Globe,
  FileText,
  Plus,
  Trash2,
  GripVertical,
  ToggleLeft,
  ToggleRight,
  History,
  ArrowUp,
  ArrowDown,
  Loader2
} from 'lucide-react';
import { getAuthHeader } from '../utils/authHelpers';

const VibeSettings = () => {
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingValues, setEditingValues] = useState({});
    const [savingId, setSavingId] = useState(null);
    const [showKeys, setShowKeys] = useState({});
    const [updating, setUpdating] = useState(false);

    // ===== Report Template State =====
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

    // ===== Template header editable fields =====
    const [headerOrgName, setHeaderOrgName] = useState('');
    const [headerOrgLocation, setHeaderOrgLocation] = useState('');
    const [footerSignerName, setFooterSignerName] = useState('');
    const [footerSignerTitle, setFooterSignerTitle] = useState('');

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

    useEffect(() => {
        fetchSettings();
        fetchTemplates();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const auth = getAuthHeader();
            const res = await axios.get('/api/settings/', auth);
            setSettings(res.data);
            const initValues = {};
            res.data.forEach(s => { initValues[s.id] = s.value; });
            setEditingValues(initValues);
        } catch (e) {
            console.error('Lỗi tải cấu hình', e);
        } finally {
            setLoading(false);
        }
    };

    // ===== Report Template Functions =====
    const fetchTemplates = async () => {
        setTemplateLoading(true);
        try {
            const auth = getAuthHeader();
            const res = await axios.get('/api/reports/templates/', auth);
            setTemplates(res.data);
            if (res.data.length > 0) {
                selectTemplate(res.data[0]);
            }
        } catch (e) {
            console.error('Lỗi tải mẫu báo cáo', e);
        } finally {
            setTemplateLoading(false);
        }
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
        } catch (e) {
            console.error('Lỗi tải nhật ký', e);
        }
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
        } catch (e) {
            alert('Lỗi khi lưu thông tin hành chính.');
        } finally {
            setSavingTemplate(false);
        }
    };

    const toggleField = async (fieldId, currentValue) => {
        setSavingField(fieldId);
        try {
            const auth = getAuthHeader();
            await axios.patch(`/api/reports/field-configs/${fieldId}/`, {
                is_enabled: !currentValue
            }, auth);
            fetchTemplates();
        } catch (e) {
            alert('Lỗi khi thay đổi trạng thái trường.');
        } finally {
            setSavingField(null);
        }
    };

    const updateFieldLabel = async (fieldId, newLabel) => {
        setSavingField(fieldId);
        try {
            const auth = getAuthHeader();
            await axios.patch(`/api/reports/field-configs/${fieldId}/`, {
                field_label: newLabel
            }, auth);
            fetchTemplates();
        } catch (e) {
            alert('Lỗi khi cập nhật nhãn.');
        } finally {
            setSavingField(null);
        }
    };

    const moveField = async (fieldId, direction) => {
        const idx = fieldConfigs.findIndex(f => f.id === fieldId);
        if (idx < 0) return;
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
        } catch (e) {
            alert('Lỗi khi đổi vị trí.');
        } finally {
            setSavingField(null);
        }
    };

    const addField = async () => {
        if (!activeTemplate || !newFieldKey.trim() || !newFieldLabel.trim()) return;
        setSavingField('new');
        try {
            const auth = getAuthHeader();
            await axios.post(`/api/reports/templates/${activeTemplate.id}/add_field/`, {
                field_key: newFieldKey.trim().toLowerCase().replace(/\s+/g, '_'),
                field_label: newFieldLabel.trim(),
            }, auth);
            setNewFieldKey('');
            setNewFieldLabel('');
            setShowAddField(false);
            fetchTemplates();
        } catch (e) {
            alert(e.response?.data?.error || 'Lỗi khi thêm trường.');
        } finally {
            setSavingField(null);
        }
    };

    const removeField = async (fieldId) => {
        if (!window.confirm('Bạn chắc chắn muốn xoá trường này?')) return;
        setSavingField(fieldId);
        try {
            const auth = getAuthHeader();
            await axios.post(`/api/reports/templates/${activeTemplate.id}/remove_field/`, {
                field_id: fieldId
            }, auth);
            fetchTemplates();
        } catch (e) {
            alert(e.response?.data?.error || 'Lỗi khi xoá trường.');
        } finally {
            setSavingField(null);
        }
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
        } catch (e) {
            alert('Lỗi khi lưu cấu hình.');
        } finally {
            setSavingId(null);
        }
    };

    const toggleShowKey = (id) => {
        setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="flex-1 bg-slate-50 p-6 lg:p-10 space-y-8 overflow-y-auto font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Cấu hình Hệ thống</h1>
                    <p className="text-slate-500 mt-1">Quản lý tham số vận hành, mẫu báo cáo và các thiết lập nâng cao.</p>
                </div>
                <button 
                  onClick={() => { fetchSettings(); fetchTemplates(); }}
                  className="flex items-center space-x-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                >
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                  <span>Làm mới bộ nhớ đệm</span>
                </button>
            </div>

            {/* Info Box */}
            <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden group">
                <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                        <Cpu size={32} />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-xl font-black">AI & Cloud Copilot</h3>
                        <p className="text-blue-100 text-sm mt-1 max-w-2xl">
                            Cấu hình API Key cho các dịch vụ ngôn ngữ lớn (LLMs). Các giá trị này được mã hóa an toàn và mức độ ưu tiên cao hơn biến môi trường phía máy chủ.
                        </p>
                    </div>
                </div>
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 gap-8">
                {settings.length === 0 && !loading && (
                    <div className="bg-white rounded-[2.5rem] p-20 text-center border border-dashed border-slate-200">
                        <p className="text-slate-400 italic">Chưa có tham số cấu hình nào được khởi tạo trong cơ sở dữ liệu.</p>
                    </div>
                )}

                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Database className="text-blue-600" size={24} />
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest text-xs">Tham số vận hành</h3>
                        </div>
                    </div>
                    
                    <div className="divide-y divide-slate-50">
                        {settings.map((s) => (
                            <div key={s.id} className="p-8 hover:bg-slate-50/50 transition-colors group">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                                    <div className="lg:col-span-4 space-y-1">
                                        <span className="text-sm font-black text-slate-800">{s.key}</span>
                                        <p className="text-xs text-slate-400 leading-relaxed max-w-sm font-medium">
                                            {s.description || 'Không có mô tả cho tham số này.'}
                                        </p>
                                    </div>
                                    <div className="lg:col-span-6 relative">
                                        {s.key.includes('KEY') || s.key.includes('SECRET') ? (
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                <input 
                                                    type={showKeys[s.id] ? "text" : "password"}
                                                    placeholder="Nhập mã bí mật..."
                                                    className="w-full pl-11 pr-12 py-3.5 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-mono text-xs"
                                                    value={editingValues[s.id] || ''}
                                                    onChange={(e) => handleValueChange(s.id, e.target.value)}
                                                />
                                                <button onClick={() => toggleShowKey(s.id)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                                                    {showKeys[s.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        ) : s.key === 'EXPORT_DETAIL_LEVEL' ? (
                                            <div className="relative">
                                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                <select 
                                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 appearance-none font-bold text-xs"
                                                    value={editingValues[s.id] || ''}
                                                    onChange={(e) => handleValueChange(s.id, e.target.value)}
                                                >
                                                    <option value="Điều">Chỉ Điều</option>
                                                    <option value="Điều khoản">Điều & Khoản</option>
                                                    <option value="Điều khoản điểm">Đầy đủ (Điều, Khoản, Điểm)</option>
                                                </select>
                                            </div>
                                        ) : (
                                            <input 
                                                type="text"
                                                className="w-full px-5 py-3.5 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-xs font-bold"
                                                value={editingValues[s.id] || ''}
                                                onChange={(e) => handleValueChange(s.id, e.target.value)}
                                            />
                                        )}
                                    </div>
                                    <div className="lg:col-span-2 flex justify-end">
                                        <button 
                                            disabled={savingId === s.id}
                                            onClick={() => saveSetting(s.id)}
                                            className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm
                                                ${editingValues[s.id] !== s.value 
                                                    ? 'bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700' 
                                                    : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
                                        >
                                            {savingId === s.id ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                            <span>Lưu</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ===== REPORT TEMPLATE MANAGEMENT ===== */}
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <FileText className="text-indigo-600" size={24} />
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest text-xs">Quản lý Mẫu Báo cáo</h3>
                            </div>
                            {activeTemplate && (
                                <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                    {activeTemplate.name}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-2 max-w-2xl">
                            Tùy biến các cột dữ liệu và thông tin hành chính khi xuất báo cáo Word. Định dạng tuân thủ Nghị định 30/2020/NĐ-CP.
                        </p>
                    </div>

                    {templateLoading ? (
                        <div className="p-16 flex flex-col items-center space-y-3 text-slate-400">
                            <Loader2 className="animate-spin" size={24} />
                            <span className="text-xs">Đang tải cấu hình mẫu...</span>
                        </div>
                    ) : !activeTemplate ? (
                        <div className="p-16 text-center text-slate-400">
                            <FileText size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="text-sm">Chưa có mẫu báo cáo nào. Chạy lệnh tạo mẫu mặc định trên máy chủ.</p>
                            <code className="text-[10px] bg-slate-100 px-3 py-1 rounded-lg mt-2 inline-block font-mono">
                                python manage.py seed_report_template
                            </code>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {/* Thông tin Hành chính */}
                            <div className="p-8">
                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center space-x-2">
                                    <Globe size={14} />
                                    <span>Thông tin Hành chính (Header / Footer)</span>
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-500">Tên cơ quan chủ trì</label>
                                        <input 
                                            type="text"
                                            className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            value={headerOrgName}
                                            onChange={(e) => setHeaderOrgName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-500">Nơi ban hành</label>
                                        <input 
                                            type="text"
                                            className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            value={headerOrgLocation}
                                            onChange={(e) => setHeaderOrgLocation(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-500">Chức vụ người ký</label>
                                        <input 
                                            type="text"
                                            className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            value={footerSignerTitle}
                                            onChange={(e) => setFooterSignerTitle(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-500">Họ tên người ký</label>
                                        <input 
                                            type="text"
                                            className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            value={footerSignerName}
                                            onChange={(e) => setFooterSignerName(e.target.value)}
                                            placeholder="(Để trống nếu chưa có)"
                                        />
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <button 
                                        onClick={saveTemplateHeader}
                                        disabled={savingTemplate}
                                        className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {savingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        <span>Lưu Thông tin Hành chính</span>
                                    </button>
                                </div>
                            </div>

                            {/* Cấu hình Trường dữ liệu */}
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center space-x-2">
                                        <Database size={14} />
                                        <span>Cấu hình Trường dữ liệu (Cột trong bảng Word)</span>
                                    </h4>
                                    <button 
                                        onClick={() => setShowAddField(!showAddField)}
                                        className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[11px] font-bold hover:bg-indigo-100 transition-colors"
                                    >
                                        <Plus size={12} />
                                        <span>Thêm trường</span>
                                    </button>
                                </div>

                                {/* Add new field form */}
                                {showAddField && (
                                    <div className="mb-6 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-end gap-4">
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[10px] font-bold text-indigo-600">Mã trường (VD: chuyen_vien)</label>
                                            <input 
                                                type="text"
                                                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                value={newFieldKey}
                                                onChange={(e) => setNewFieldKey(e.target.value)}
                                                placeholder="ghi_chu"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[10px] font-bold text-indigo-600">Nhãn hiển thị</label>
                                            <input 
                                                type="text"
                                                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                value={newFieldLabel}
                                                onChange={(e) => setNewFieldLabel(e.target.value)}
                                                placeholder="Ghi chú"
                                            />
                                        </div>
                                        <button 
                                            onClick={addField}
                                            disabled={savingField === 'new'}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center space-x-1"
                                        >
                                            {savingField === 'new' ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                            <span>Thêm</span>
                                        </button>
                                    </div>
                                )}

                                {/* Field list */}
                                <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                                    <div className="grid grid-cols-12 gap-2 p-3 bg-slate-100/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        <div className="col-span-1 text-center">#</div>
                                        <div className="col-span-3">Mã trường</div>
                                        <div className="col-span-4">Nhãn cột</div>
                                        <div className="col-span-1 text-center">Bật/Tắt</div>
                                        <div className="col-span-3 text-center">Hành động</div>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {fieldConfigs.map((field, idx) => (
                                            <div key={field.id} className="grid grid-cols-12 gap-2 p-3 items-center hover:bg-white/80 transition-colors">
                                                <div className="col-span-1 text-center">
                                                    <span className="text-xs text-slate-400 font-mono">{idx + 1}</span>
                                                </div>
                                                <div className="col-span-3">
                                                    <div className="flex items-center space-x-2">
                                                        {field.is_default && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" title="Trường mặc định"></span>
                                                        )}
                                                        <code className="text-xs font-mono text-slate-600 bg-slate-200/50 px-1.5 py-0.5 rounded">{field.field_key}</code>
                                                    </div>
                                                </div>
                                                <div className="col-span-4">
                                                    <input 
                                                        type="text"
                                                        className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-300 rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                                                        value={field.field_label}
                                                        onChange={(e) => {
                                                            setFieldConfigs(prev => prev.map(f => f.id === field.id ? {...f, field_label: e.target.value} : f));
                                                        }}
                                                        onBlur={(e) => {
                                                            if (e.target.value !== field.field_label) {
                                                                updateFieldLabel(field.id, e.target.value);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="col-span-1 flex justify-center">
                                                    <button 
                                                        onClick={() => toggleField(field.id, field.is_enabled)}
                                                        disabled={savingField === field.id}
                                                        className="transition-colors"
                                                    >
                                                        {field.is_enabled ? (
                                                            <ToggleRight size={22} className="text-green-500" />
                                                        ) : (
                                                            <ToggleLeft size={22} className="text-slate-300" />
                                                        )}
                                                    </button>
                                                </div>
                                                <div className="col-span-3 flex items-center justify-center space-x-1">
                                                    <button 
                                                        onClick={() => moveField(field.id, 'up')}
                                                        disabled={idx === 0}
                                                        className="p-1 hover:bg-slate-200 rounded text-slate-400 disabled:opacity-20 transition-colors"
                                                    >
                                                        <ArrowUp size={12} />
                                                    </button>
                                                    <button 
                                                        onClick={() => moveField(field.id, 'down')}
                                                        disabled={idx === fieldConfigs.length - 1}
                                                        className="p-1 hover:bg-slate-200 rounded text-slate-400 disabled:opacity-20 transition-colors"
                                                    >
                                                        <ArrowDown size={12} />
                                                    </button>
                                                    {!field.is_default && (
                                                        <button 
                                                            onClick={() => removeField(field.id)}
                                                            className="p-1 hover:bg-red-100 rounded text-slate-300 hover:text-red-500 transition-colors ml-1"
                                                            title="Xoá trường"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Nhật ký thay đổi */}
                            <div className="p-8">
                                <button 
                                    onClick={() => { setShowLogs(!showLogs); if (!showLogs && activeTemplate) fetchFieldLogs(activeTemplate.id); }}
                                    className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                                >
                                    <History size={14} />
                                    <span>Nhật ký thay đổi ({fieldLogs.length})</span>
                                    {showLogs ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                                {showLogs && (
                                    <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                                        {fieldLogs.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic p-4">Chưa có thay đổi nào được ghi nhận.</p>
                                        ) : fieldLogs.map((log, idx) => (
                                            <div key={idx} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                                                <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                                    <History size={12} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-slate-700">{log.action}</p>
                                                    {log.old_value && (
                                                        <p className="text-[10px] text-slate-400">
                                                            <span className="line-through text-red-400">{log.old_value}</span>
                                                            {log.new_value && <span> → <span className="text-green-600 font-medium">{log.new_value}</span></span>}
                                                        </p>
                                                    )}
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                        {log.changed_by_name} · {new Date(log.changed_at).toLocaleString('vi-VN')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* System Update Box */}
                <div className="bg-slate-900 rounded-[3rem] p-8 md:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
                    <div className="relative z-10 space-y-2 flex-1">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-slate-800 rounded-xl">
                                <RefreshCw size={24} className={updating ? 'animate-spin text-blue-400' : 'text-slate-300'} />
                            </div>
                            <h3 className="text-xl font-black">Cập nhật Phiên bản (Từ Git)</h3>
                        </div>
                        <p className="text-slate-400 text-sm max-w-xl pr-4">
                            Phiên bản hiện tại: <span className="font-mono text-blue-400 font-bold bg-slate-800 px-2 py-0.5 rounded">V{__APP_VERSION__}</span>.<br/> Bấm cập nhật để máy chủ tự động tải mã nguồn mới nhất từ kho lưu trữ và khởi động lại.
                        </p>
                    </div>
                    <div className="relative z-10 w-full md:w-auto">
                        <button 
                            onClick={handleSystemUpdate}
                            disabled={updating}
                            className={`w-full md:w-auto px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center space-x-3 transition-all
                                ${updating 
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95'}`}
                        >
                            {updating ? (
                                <><RefreshCw size={18} className="animate-spin" /><span>Đang Update...</span></>
                            ) : (
                                <><span>Bắt đầu Cập nhật</span><ChevronRight size={18} /></>
                            )}
                        </button>
                    </div>
                </div>

                {/* Footer Help */}
                <div className="flex items-start space-x-4 bg-amber-50 p-6 rounded-[2.5rem] border border-amber-100">
                    <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <h4 className="font-black text-amber-800 italic underline decoration-amber-300 decoration-2 underline-offset-4 mb-2">Lưu ý bảo mật</h4>
                        <p className="text-sm text-amber-700 leading-relaxed font-medium">
                            Các thay đổi cấu hình sẽ có hiệu lực ngay lập tức. Vui lòng không chia sẻ màn hình khi có chứa API Key. Hệ thống log sẽ ghi vết mọi thay đổi cấu hình của người quản trị.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VibeSettings;
