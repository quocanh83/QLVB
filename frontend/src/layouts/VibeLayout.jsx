import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  MenuIcon,
  XIcon,
  LayoutDashboard,
  FileText,
  BarChart3,
  Users,
  Settings,
  Bell,
  Search,
  User,
  LogOut,
  UploadCloud,
  PieChart,
  ClipboardList
} from 'lucide-react';
import { logout } from '../utils/authHelpers';
import NotificationBell from '../components/NotificationBell';

const VibeLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Tổng quan', href: '/', icon: LayoutDashboard },
    { name: 'Dự thảo văn bản', href: '/documents', icon: FileText },
    { name: 'Tiếp nhận Góp ý', href: '/feedback-intake', icon: UploadCloud },
    { name: 'Xử lý & Giải trình', href: '/vibe-dashboard', icon: ClipboardList },
    { name: 'Báo cáo thống kê', href: '/reports', icon: PieChart },
    { name: 'Người dùng', href: '/users', icon: Users },
    { name: 'Cài đặt hệ thống', href: '/settings', icon: Settings },
  ];

  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 h-16 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-500 hover:text-slate-600 lg:hidden"
          >
            <MenuIcon size={24} />
          </button>
          
          <div className="ml-4 flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">Q</div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 hidden sm:block">
              QLVB Vibe 2.0
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center bg-slate-100 rounded-full px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
            <Search size={18} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm..." 
              className="bg-transparent border-none focus:outline-none ml-2 text-sm w-48"
            />
          </div>
          
          <div className="flex items-center">
            <NotificationBell />
          </div>
          
          <div className="flex items-center space-x-3 border-l pl-4 border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold">Cán bộ QLVB</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
            <button 
              onClick={logout}
              className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 hover:bg-red-100 hover:text-red-600 cursor-pointer transition-colors"
              title="Đăng xuất"
            >
              <LogOut size={18} />
            </button>
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 hover:bg-blue-100 hover:text-blue-600 cursor-pointer transition-colors">
              <User size={20} title="Trang cá nhân"/>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 bg-slate-900 text-white w-64 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-6 flex items-center justify-between lg:hidden border-b border-slate-800">
            <span className="font-bold text-lg">Menu</span>
            <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-slate-800 rounded">
              <XIcon size={20} />
            </button>
          </div>
          
          <nav className="p-4 space-y-1 mt-2">
            {navigation.map((item) => {
              const isActive = currentPath === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group
                    ${isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                  `}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon size={20} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
            <button
              onClick={logout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:bg-red-500/10 hover:text-red-500 group"
            >
              <LogOut size={20} className="text-slate-500 group-hover:text-red-500" />
              <span className="font-medium">Đăng xuất</span>
            </button>
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-2">Phiên bản hiện tại</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Vibe {__APP_VERSION__}</span>
                <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-bold rounded uppercase tracking-wider border border-green-500/20 text-blue-400">Stable</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-slate-50 flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default VibeLayout;
