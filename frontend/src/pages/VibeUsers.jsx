import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Search, 
  Users, 
  Shield, 
  Mail, 
  User as UserIcon,
  MoreVertical, 
  Edit2, 
  Trash2, 
  RefreshCw,
  X,
  CheckCircle2,
  Lock,
  ChevronRight
} from 'lucide-react';
import { getAuthHeader } from '../utils/authHelpers';

const VibeUsers = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const auth = getAuthHeader();
      const [usersRes, rolesRes] = await Promise.all([
        axios.get('/api/accounts/users/', auth),
        axios.get('/api/accounts/roles/', auth)
      ]);
      const usersData = usersRes.data.results || usersRes.data;
      const rolesData = rolesRes.data.results || rolesRes.data;
      setUsers(Array.isArray(usersData) ? usersData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu người dùng.", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id, username) => {
    if (!window.confirm(`Bạn có chắc muốn thu hồi tài khoản ${username}?`)) return;
    try {
      const auth = getAuthHeader();
      await axios.delete(`/api/accounts/users/${id}/`, auth);
      fetchData();
    } catch (e) {
      alert('Lỗi khi xoá tài khoản.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 bg-slate-50 p-6 lg:p-10 space-y-8 overflow-y-auto font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Cán bộ & Phân quyền</h1>
          <p className="text-slate-500 mt-1">Quản lý đội ngũ chuyên viên, lãnh đạo và các nhóm quyền hệ thống.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="p-3 text-slate-500 hover:bg-white hover:text-blue-600 rounded-2xl border border-transparent hover:border-slate-200 transition-all active:scale-95"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-sm"
          >
            <Plus size={18} />
            <span>Thêm Cán bộ Mới</span>
          </button>
        </div>
      </div>

      {/* Search & Grid Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center">
            <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Tìm theo tên đăng nhập, họ tên hoặc email..." 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>
        <div className="bg-blue-600 p-4 rounded-3xl shadow-lg shadow-blue-600/20 flex items-center justify-between text-white">
            <div className="pl-2">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Tổng nhân sự</p>
                <h3 className="text-2xl font-black tracking-tighter">{users.length}</h3>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Users size={24} />
            </div>
        </div>
      </div>

      {/* Users Table (Full Tailwind) */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Cán bộ</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Liên hệ</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Vai trò / Phân quyền</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-20 text-center text-slate-400 italic font-medium">Đang tải dữ liệu...</td>
                </tr>
              ) : filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-4">
                        <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:scale-110 shadow-sm">
                            {(u.full_name || u.username).substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-slate-800">{u.username}</p>
                            <p className="text-xs text-slate-400">{u.full_name || 'Họ tên chưa cập nhật'}</p>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2 text-slate-600">
                            <Mail size={14} className="text-slate-400" />
                            <span className="text-xs">{u.email || 'N/A'}</span>
                        </div>
                     </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex flex-wrap gap-2">
                        {(u.roles || []).map((r, idx) => (
                          <span key={idx} className="bg-blue-50 text-blue-600 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border border-blue-100 flex items-center space-x-1">
                             <Shield size={10} />
                             <span>{r.role_name || r}</span>
                          </span>
                        ))}
                     </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingUser(u); setIsModalOpen(true); }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-100 transition-all"
                        title="Sửa thông tin"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-100 transition-all"
                        title="Xoá tài khoản"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && !loading && (
                <tr>
                  <td colSpan="4" className="px-6 py-20 text-center">
                    <p className="text-slate-400 italic">Không tìm thấy tài khoản nào khớp với từ khóa.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Modal (Tailwind) */}
      <VibeUserModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={editingUser}
        roles={roles}
        onSuccess={fetchData}
      />
    </div>
  );
};

const VibeUserModal = ({ isOpen, onClose, user, roles, onSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role_ids: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        password: '',
        full_name: user.full_name || '',
        email: user.email || '',
        role_ids: (user.roles || []).map(r => r.id || r)
      });
    } else {
      setFormData({ username: '', password: '', full_name: '', email: '', role_ids: [] });
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const auth = getAuthHeader();
      const payload = { ...formData };
      if (user && !payload.password) delete payload.password;

      if (user) {
        await axios.patch(`/api/accounts/users/${user.id}/`, payload, auth);
      } else {
        await axios.post('/api/accounts/users/', payload, auth);
      }
      onSuccess();
      onClose();
    } catch (err) {
      alert('Lỗi thao tác trên tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (roleId) => {
    const newRoles = formData.role_ids.includes(roleId)
      ? formData.role_ids.filter(id => id !== roleId)
      : [...formData.role_ids, roleId];
    setFormData({ ...formData, role_ids: newRoles });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden">
        <div className="bg-blue-600 p-8 text-white flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-black">{user ? 'Chỉnh sửa Cán bộ' : 'Cấp tài khoản Mới'}</h2>
                <p className="text-blue-100 text-[10px] mt-1 uppercase font-bold tracking-widest">Thiết lập quyền truy cập hệ thống</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-blue-500 rounded-xl transition-colors">
                <X size={24} />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tên đăng nhập (Username)</label>
                <input 
                    disabled={!!user}
                    required
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold disabled:opacity-50"
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                />
            </div>
            
            <div className="space-y-1.5 md:col-span-2 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                    {user ? 'Mật khẩu mới (Để trống nếu không đổi)' : 'Mật khẩu truy cập'}
                </label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                        required={!user}
                        type="password" 
                        className="w-full pl-11 pr-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Họ và tên</label>
                <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                    value={formData.full_name}
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Địa chỉ Email</label>
                <input 
                    type="email" 
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Phân quyền Vai trò</label>
            <div className="grid grid-cols-2 gap-3">
                {roles.map(r => (
                    <div 
                        key={r.id} 
                        onClick={() => toggleRole(r.id)}
                        className={`
                            p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between
                            ${formData.role_ids.includes(r.id) 
                                ? 'bg-blue-50 border-blue-200 text-blue-600 ring-2 ring-blue-500/10' 
                                : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-300'}
                        `}
                    >
                        <div className="flex items-center space-x-3">
                            <Shield size={16} />
                            <span className="text-xs font-bold">{r.role_name}</span>
                        </div>
                        {formData.role_ids.includes(r.id) && <CheckCircle2 size={16} />}
                    </div>
                ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center space-x-2"
          >
            {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
                <>
                    <UserIcon size={20} />
                    <span>{user ? 'Lưu thay đổi Cán bộ' : 'Khởi tạo Tài khoản'}</span>
                </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VibeUsers;
