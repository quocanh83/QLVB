import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';

const Login = () => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('/api/accounts/login/', formData);
            localStorage.setItem('access_token', res.data.access);
            localStorage.setItem('refresh_token', res.data.refresh);
            navigate('/');
        } catch (error) {
            console.error("Login error detail:", error.response?.data || error.message);
            setError('Tên đăng nhập hoặc mật khẩu không chính xác.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Animated Background Elements */}
            <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-0 -right-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px] animate-pulse delay-700"></div>
            
            <div className="w-full max-w-md relative z-10">
                {/* Logo Area */}
                <div className="flex flex-col items-center mb-10 text-center">
                    <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl shadow-2xl flex items-center justify-center text-white mb-6 transform rotate-12 hover:rotate-0 transition-transform duration-500 cursor-default">
                        <Cpu size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
                        Vibe <span className="text-blue-500 italic">2.0</span>
                    </h1>
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-widest px-4 py-1 bg-slate-800/50 rounded-full border border-slate-700/50">
                        Hệ thống Quản lý Văn bản Thông minh
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-slate-800/40 backdrop-blur-2xl border border-slate-700/50 rounded-[2.5rem] p-10 shadow-2xl shadow-black/50 overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-bold flex items-center space-x-3 transition-all animate-in fade-in slide-in-from-top-2">
                                <ShieldCheck size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">Tên đăng nhập</label>
                            <div className="relative group/input">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-blue-500 transition-colors">
                                    <User size={18} />
                                </div>
                                <input 
                                    type="text"
                                    name="username"
                                    required
                                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-bold"
                                    placeholder="admin..."
                                    value={formData.username}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">Mật khẩu</label>
                            <div className="relative group/input">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-blue-500 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input 
                                    type="password"
                                    name="password"
                                    required
                                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-bold"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-bold px-1">
                            <label className="flex items-center space-x-2 text-slate-500 cursor-pointer hover:text-slate-300 transition-colors">
                                <input type="checkbox" className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0" />
                                <span>Ghi nhớ tôi</span>
                            </label>
                            <a href="#" className="text-blue-500 hover:text-blue-400 transition-colors">Quên mật khẩu?</a>
                        </div>

                        <button 
                            type="submit"
                            disabled={loading}
                            className={`
                                w-full py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 flex items-center justify-center space-x-3 transition-all active:scale-[0.98] mt-4
                                ${loading ? 'opacity-70 cursor-wait' : 'hover:shadow-blue-500/40 hover:-translate-y-0.5'}
                            `}
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span>Đăng nhập ngay</span>
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="mt-12 text-center">
                    <p className="text-slate-500 text-xs font-bold">
                        &copy; 2026 QLVB Vibe Project. Bảo mật & Chuyên nghiệp.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
