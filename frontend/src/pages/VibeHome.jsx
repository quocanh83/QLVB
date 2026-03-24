import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthHeader } from '../utils/authHelpers';
import { 
  FileText, 
  MessageSquare, 
  CheckCircle2, 
  Users, 
  TrendingUp, 
  ArrowUpRight,
  Clock,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const VibeHome = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    cards: { totalDocs: 0, totalFeedbacks: 0, resolvedFeedbacks: 0, agenciesCount: 0 },
    topDocs: [],
    trendData: [],
    recentActivity: []
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const auth = getAuthHeader();
      const res = await axios.get('/api/documents/dashboard_stats/', auth);
      setData(res.data);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu tổng quan", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Đang tải dữ liệu tổng quan...</p>
        </div>
      </div>
    );
  }

  const { cards, topDocs, trendData, recentActivity } = data;

  return (
    <div className="flex-1 bg-slate-50 p-6 lg:p-10 space-y-8 overflow-y-auto">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Tổng quan Hệ thống</h1>
          <p className="text-slate-500 mt-1">Chào mừng bạn quay lại! Đây là tình hình xử lý góp ý văn bản hôm nay.</p>
        </div>
        <button 
          onClick={() => navigate('/vibe-dashboard')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-sm"
        >
          <FileText size={18} />
          <span>Bắt đầu Xử lý Dự thảo</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Tổng số Dự thảo', value: cards.totalDocs, icon: FileText, color: 'blue' },
          { label: 'Tổng số Góp ý', value: cards.totalFeedbacks, icon: MessageSquare, color: 'pink' },
          { label: 'Đã Giải trình', value: cards.resolvedFeedbacks, icon: CheckCircle2, color: 'green', suffix: `/ ${cards.totalFeedbacks}` },
          { label: 'Cơ quan Đóng góp', value: cards.agenciesCount, icon: Users, color: 'amber' },
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl bg-${card.color}-50 flex items-center justify-center text-${card.color}-600 group-hover:scale-110 transition-transform`}>
                <card.icon size={24} />
              </div>
              <div className="flex items-center space-x-1 text-green-500 bg-green-50 px-2 py-1 rounded-full text-[10px] font-bold">
                <TrendingUp size={12} />
                <span>+12%</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
              <div className="flex items-baseline space-x-1">
                <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{card.value}</h3>
                {card.suffix && <span className="text-xs text-slate-400 font-bold">{card.suffix}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Drafts with Most Feedback */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-bold text-slate-800">Top Dự thảo nhận nhiều Góp ý</h2>
            <button className="text-blue-600 text-xs font-bold flex items-center space-x-1 hover:underline">
              <span>Xem chi tiết</span>
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-50">
              {topDocs.map((doc, idx) => (
                <div key={idx} className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between cursor-pointer group" onClick={() => navigate(`/vibe-dashboard?docId=${doc.id}`)}>
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-black text-sm group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{doc.name}</p>
                      <p className="text-xs text-slate-400 italic">Cập nhật lúc: 14:30 23/03/2026</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-black text-slate-800">{doc.feedbacks}</span>
                      <MessageSquare size={14} className="text-pink-400" />
                    </div>
                    <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (doc.feedbacks / (topDocs[0]?.feedbacks || 1)) * 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-bold text-slate-800">Hoạt động Mới nhất</h2>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
            {recentActivity.map((activity, idx) => (
              <div key={idx} className="flex space-x-4 relative">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full mt-1.5 ring-4 ${activity.type === 'feedback' ? 'bg-pink-500 ring-pink-50' : 'bg-green-500 ring-green-50'}`}></div>
                  {idx !== recentActivity.length - 1 && <div className="w-0.5 flex-1 bg-slate-100 my-1"></div>}
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-xs leading-relaxed text-slate-600">
                    <span className="font-bold text-slate-900">{activity.user}</span> {activity.content} trong <span className="text-blue-600 font-bold italic">{activity.document}</span>
                  </p>
                  <div className="flex items-center space-x-2 mt-1 text-[10px] text-slate-400">
                    <Clock size={10} />
                    <span>{new Date(activity.time).toLocaleTimeString()} - {new Date(activity.time).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <div className="text-center py-10 space-y-2">
                <Clock size={32} className="mx-auto text-slate-200" />
                <p className="text-sm text-slate-400 italic">Chưa có hoạt động nào hôm nay.</p>
              </div>
            )}
            <button className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-bold rounded-2xl transition-colors border border-dashed border-slate-200 uppercase tracking-widest">
              Xem toàn bộ nhật ký
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VibeHome;
