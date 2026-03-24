import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getAuthHeader } from '../utils/authHelpers';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Bell, CheckCircle2, Clock, X, MessageSquare, ExternalLink } from 'lucide-react';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        
        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            clearInterval(interval);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await axios.get('/api/notifications/', getAuthHeader());
            setNotifications(res.data);
        } catch (error) {
            console.error('Lỗi khi tải thông báo:', error);
        }
    };

    const handleMarkAsRead = async (id, link) => {
        try {
            await axios.post(`/api/notifications/${id}/mark_read/`, {}, getAuthHeader());
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
            if (link) {
                navigate(link);
                setIsOpen(false);
            }
        } catch (error) {
            console.error('Lỗi khi cập nhật trạng thái thông báo:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            setLoading(true);
            await axios.post('/api/notifications/mark_all_read/', {}, getAuthHeader());
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Lỗi đánh dấu tất cả đã đọc:', error);
        } finally {
            setLoading(false);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-slate-400 hover:text-blue-600 transition-colors relative group"
            >
                <Bell size={20} className={unreadCount > 0 ? 'animate-wiggle' : ''} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white ring-1 ring-red-500/20">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center">
                            <Bell size={16} className="mr-2 text-blue-600" />
                            Thông báo
                        </h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={handleMarkAllAsRead}
                                disabled={loading}
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center"
                            >
                                <CheckCircle2 size={12} className="mr-1" />
                                Đọc tất cả
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-10 text-center">
                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Bell size={24} className="text-slate-300" />
                                </div>
                                <p className="text-xs text-slate-500 font-medium">Bạn chưa có thông báo nào</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {notifications.map((item) => (
                                    <div 
                                        key={item.id}
                                        onClick={() => handleMarkAsRead(item.id, item.link)}
                                        className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer group relative ${!item.is_read ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <div className="flex items-start space-x-3">
                                            <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                !item.is_read ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                                <MessageSquare size={14} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs leading-relaxed ${!item.is_read ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                                                    {item.message}
                                                </p>
                                                <div className="mt-2 flex items-center text-[10px] text-slate-400">
                                                    <Clock size={10} className="mr-1" />
                                                    {dayjs(item.created_at).fromNow ? dayjs(item.created_at).format('HH:mm DD/MM/YYYY') : dayjs(item.created_at).format('HH:mm DD/MM/YYYY')}
                                                    {!item.is_read && (
                                                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center">
                            <button 
                                onClick={() => { setIsOpen(false); navigate('/settings?tab=notifications'); }}
                                className="text-[11px] font-bold text-slate-500 hover:text-slate-700 flex items-center justify-center mx-auto"
                            >
                                Xem tất cả cài đặt thông báo
                                <ExternalLink size={10} className="ml-1" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
