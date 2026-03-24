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
  Database,
  Globe
} from 'lucide-react';
import { getAuthHeader } from '../utils/authHelpers';

const VibeSettings = () => {
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingValues, setEditingValues] = useState({});
    const [savingId, setSavingId] = useState(null);
    const [showKeys, setShowKeys] = useState({});

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const auth = getAuthHeader();
            const res = await axios.get('/api/settings/', auth);
            setSettings(res.data);
            
            const initValues = {};
            res.data.forEach(s => {
                initValues[s.id] = s.value;
            });
            setEditingValues(initValues);
        } catch (e) {
            console.error('Lỗi tải cấu hình', e);
        } finally {
            setLoading(false);
        }
    };

    const handleValueChange = (id, value) => {
        setEditingValues(prev => ({ ...prev, [id]: value }));
    };

    const saveSetting = async (id) => {
        setSavingId(id);
        try {
            const auth = getAuthHeader();
            await axios.patch(`/api/settings/${id}/`, {
                value: editingValues[id]
            }, auth);
            // Refresh to confirm
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

    const categories = [
        { id: 'ai', name: 'AI & Copilot', icon: Cpu, color: 'text-purple-600', bg: 'bg-purple-50' },
        { id: 'system', name: 'Hệ thống & Xuất bản', icon: Settings, color: 'text-blue-600', bg: 'bg-blue-50' },
        { id: 'security', name: 'Bảo mật', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' }
    ];

    return (
        <div className="flex-1 bg-slate-50 p-6 lg:p-10 space-y-8 overflow-y-auto font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Cấu hình Hệ thống</h1>
                    <p className="text-slate-500 mt-1">Quản lý tham số vận hành, kết nối AI và các thiết lập nâng cao.</p>
                </div>
                <button 
                  onClick={fetchSettings}
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
                            Cấu hình API Key cho các dịch vụ ngôn ngữ lớn (LLMs). Các giá trị này được mã hóa an toàn và mức độ ưu tiên cao hơn biến môi trường (Environment Variables) phía máy chủ.
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
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-black text-slate-800">{s.key}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed max-w-sm font-medium">
                                            {s.description || 'Không có mô tả cho tham số này.'}
                                        </p>
                                    </div>

                                    <div className="lg:col-span-6 relative">
                                        <div className="relative group/input">
                                            {s.key.includes('KEY') || s.key.includes('SECRET') ? (
                                                <>
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                                                        <Lock size={16} />
                                                    </div>
                                                    <input 
                                                        type={showKeys[s.id] ? "text" : "password"}
                                                        placeholder="Nhập mã bí mật..."
                                                        className="w-full pl-11 pr-12 py-3.5 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-mono text-xs"
                                                        value={editingValues[s.id] || ''}
                                                        onChange={(e) => handleValueChange(s.id, e.target.value)}
                                                    />
                                                    <button 
                                                        onClick={() => toggleShowKey(s.id)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                                                    >
                                                        {showKeys[s.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </>
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
                                    </div>

                                    <div className="lg:col-span-2 flex justify-end">
                                        <button 
                                            disabled={savingId === s.id}
                                            onClick={() => saveSetting(s.id)}
                                            className={`
                                                flex items-center space-x-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm
                                                ${editingValues[s.id] !== s.value 
                                                    ? 'bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700' 
                                                    : 'bg-slate-50 text-slate-400 border border-slate-100'}
                                            `}
                                        >
                                            {savingId === s.id ? (
                                                <RefreshCw size={14} className="animate-spin" />
                                            ) : (
                                                <Save size={14} />
                                            )}
                                            <span>Lưu</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
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
                            Các thay đổi cấu hình sẽ có hiệu lực ngay lập tức cho các yêu cầu AI kế tiếp. Vui lòng không chia sẻ màn hình cấu hình khi có chứa API Key thực tế. Hệ thống log sẽ ghi vết mọi thay đổi cấu hình của người quản trị.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VibeSettings;
