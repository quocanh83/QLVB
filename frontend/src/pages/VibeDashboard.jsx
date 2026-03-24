import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { getAuthHeader } from '../utils/authHelpers';
import { 
  Search, 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  MessageSquare, 
  Send, 
  History, 
  CheckCircle2, 
  Clock, 
  Filter,
  MoreVertical,
  Plus,
  Upload,
  X,
  Loader2,
  FileCheck,
  AlertCircle
} from 'lucide-react';

const VibeDashboard = () => {
  const [searchParams] = useSearchParams();
  const docIdParam = searchParams.get('docId');
  const [filterType, setFilterType] = useState('all'); // all, has_feedback, resolved, unresolved, by_agency
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('');
  const [agencies, setAgencies] = useState([]);
  const [showAgencySuggestions, setShowAgencySuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState('workspace'); // 'structure', 'workspace', 'action'

  // Recursive tree filter helper
  const getFilteredStructure = (nodes, type, search = '') => {
    if (!nodes) return [];
    let result = nodes;

    // First apply search if any
    if (search) {
      result = result.map(node => {
        const filteredChildren = getFilteredStructure(node.children || [], 'all', search);
        const matches = node.node_label.toLowerCase().includes(search.toLowerCase()) || 
                        node.content?.toLowerCase().includes(search.toLowerCase());
        if (matches || filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
        return null;
      }).filter(Boolean);
    }

    // Then apply status filter if not 'all' or 'by_agency' (which is handled by backend)
    if (type === 'all' || type === 'by_agency') return result;
    return result.map(node => {
      const filteredChildren = getFilteredStructure(node.children || [], type, '');
      const matches = (
        (type === 'has_feedback' && node.total_feedbacks > 0) ||
        (type === 'resolved' && node.resolved_feedbacks === node.total_feedbacks && node.total_feedbacks > 0) ||
        (type === 'unresolved' && node.resolved_feedbacks < node.total_feedbacks && node.total_feedbacks > 0)
      );
      if (matches || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    }).filter(Boolean);
  };
  const [isUploading, setIsUploading] = useState(false);
  const [previewStructure, setPreviewStructure] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [structure, setStructure] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [nodeFeedbacks, setNodeFeedbacks] = useState([]);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [explanationContent, setExplanationContent] = useState('');
  const [isSuggestingAI, setIsSuggestingAI] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const feedbackInputRef = useRef(null);

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    const auth = getAuthHeader();
    if (!auth.headers.Authorization.split(' ')[1]) {
      console.warn("No access token found in localStorage");
      return;
    }
    try {
      const res = await axios.get('/api/documents/', auth);
      setDocuments(res.data);
      
      // If docId is in URL, prioritize it
      if (docIdParam) {
        const targetDoc = res.data.find(d => d.id === parseInt(docIdParam));
        if (targetDoc) {
          setActiveDoc(targetDoc);
          return;
        }
      }

      if (res.data.length > 0 && !activeDoc) {
        setActiveDoc(res.data[0]);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách văn bản:", err);
    }
  };

  useEffect(() => {
    if (activeDoc) {
      if (filterType === 'by_agency') {
          fetchAgencies(activeDoc.id);
      }
      // Re-fetch when filter or agency changes
      if (filterType === 'by_agency') {
         if (selectedAgency.length >= 2) {
           fetchStructure(activeDoc.id, 'all', selectedAgency);
         } else if (selectedAgency === '') {
           fetchStructure(activeDoc.id, 'all');
         }
      } else {
         fetchStructure(activeDoc.id, filterType);
      }
    }
  }, [activeDoc, filterType, selectedAgency]);

  useEffect(() => {
    if (selectedNode) {
       fetchFeedbacks(selectedNode.id);
    } else {
       setNodeFeedbacks([]);
       setSelectedFeedback(null);
    }
  }, [selectedNode]);

  const fetchFeedbacks = async (nodeId) => {
    const auth = getAuthHeader();
    try {
      const res = await axios.get(`/api/feedbacks/by_node/?node_id=${nodeId}`, auth);
      setNodeFeedbacks(res.data);
      if (res.data.length > 0) {
        setSelectedFeedback(res.data[0]);
        setExplanationContent(res.data[0].explanation || '');
      } else {
        setSelectedFeedback(null);
        setExplanationContent('');
      }
    } catch (err) {
      console.error("Lỗi tải góp ý:", err);
    }
  };

  const fetchStructure = async (docId, type = 'all', agency = '') => {
    const auth = getAuthHeader();
    if (!auth.headers.Authorization.split(' ')[1]) return;
    setIsLoading(true);
    try {
      // Use specialized endpoint for filtering or if agency specified
      const endpoint = (type === 'all' && !agency) 
        ? `/api/documents/${docId}/nodes/` 
        : `/api/documents/${docId}/feedback_nodes/?filter_type=${type}${agency ? `&agency=${encodeURIComponent(agency)}` : ''}`;
      
      const res = await axios.get(endpoint, auth);
      setStructure(res.data || []);
    } catch (err) {
      console.error("Lỗi tải cấu trúc:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgencies = async (docId) => {
    const auth = getAuthHeader();
    try {
      const res = await axios.get(`/api/feedbacks/subject_stats/?document_id=${docId}`, auth);
      setAgencies((res.data.agency_stats || []).map(a => a.agency));
    } catch (err) {
      console.error("Lỗi tải danh sách cơ quan:", err);
    }
  };

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const authHeader = getAuthHeader();
    setIsUploading(true);
    try {
      const res = await axios.post('/api/documents/parse_preview/', formData, {
        headers: {
          ...authHeader.headers,
          'Content-Type': 'multipart/form-data',
        }
      });
      setPreviewStructure(res.data);
    } catch (err) {
      alert("Lỗi phân tích file. Vui lòng kiểm tra định dạng .docx");
    } finally {
      setIsUploading(false);
    }
  };

  const confirmUpload = async () => {
    if (!fileInputRef.current.files[0]) return;
    
    const formData = new FormData();
    formData.append('attached_file_path', fileInputRef.current.files[0]);
    formData.append('project_name', fileInputRef.current.files[0].name.replace('.docx', ''));
    
    const authHeader = getAuthHeader();
    setIsLoading(true);
    try {
      const res = await axios.post('/api/documents/', formData, {
        headers: {
          ...authHeader.headers,
          'Content-Type': 'multipart/form-data',
        }
      });
      setPreviewStructure(null);
      fetchDocuments();
      setActiveDoc(res.data);
    } catch (err) {
      alert("Lỗi lưu văn bản.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAISuggest = async () => {
    if (!selectedFeedback || !selectedNode) return;
    
    const auth = getAuthHeader();
    setIsSuggestingAI(true);
    try {
      const res = await axios.post('/api/feedbacks/ai_suggest/', {
        document_id: activeDoc.id,
        node_content: selectedNode.content,
        feedback_content: selectedFeedback.content
      }, auth);
      setExplanationContent(res.data.suggestion);
    } catch (err) {
      alert("Lỗi gọi AI suggest.");
    } finally {
      setIsSuggestingAI(false);
    }
  };

  const handleSaveExplanation = async () => {
    if (!selectedFeedback) return;
    
    const auth = getAuthHeader();
    setIsLoading(true);
    try {
      await axios.post('/api/feedbacks/save_explanation/', {
        document_id: activeDoc.id,
        target_type: 'Feedback',
        object_id: selectedFeedback.id,
        content: explanationContent
      }, auth);
      
      // Refresh feedbacks to show updated status
      fetchFeedbacks(selectedNode.id);
      alert("Đã lưu giải trình thành công!");
    } catch (err) {
      alert("Lỗi lưu giải trình.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedbackFileUpload = async (e) => {
     const file = e.target.files[0];
     if (!file) return;
     
     const formData = new FormData();
     formData.append('file', file);
     formData.append('document_id', activeDoc.id);
     
     const authHeader = getAuthHeader();
     setIsUploading(true);
     try {
       // Note: Currently we don't have a separate Preview for Feedbacks, 
       // so we'll just bulk create directly or update the UI later.
       // For this prototype, we'll use parse_file and then bulk_create.
       const res = await axios.post('/api/feedbacks/parse_file/', formData, {
         headers: { ...authHeader.headers, 'Content-Type': 'multipart/form-data' }
       });
       
       // Automaticaly bulk create for now to simplify flow
       await axios.post('/api/feedbacks/bulk_create/', {
          document_id: activeDoc.id,
          feedbacks: res.data.feedbacks,
          metadata: res.data.metadata
       }, authHeader);
       
       if (selectedNode) fetchFeedbacks(selectedNode.id);
       alert(`Đã nhập thành công ${res.data.feedbacks.length} góp ý.`);
     } catch (err) {
       alert("Lỗi nhập file góp ý.");
     } finally {
       setIsUploading(false);
     }
  };

  const handleStatusChange = async (action) => {
    if (!selectedFeedback) return;
    
    const auth = getAuthHeader();
    setIsLoading(true);
    try {
      const endpoint = action === 'submit' ? 'submit_for_review' : 'approve_feedback';
      await axios.post(`/api/feedbacks/${selectedFeedback.id}/${endpoint}/`, {}, auth);
      
      // Refresh feedbacks
      fetchFeedbacks(selectedNode.id);
      alert("Cập nhật trạng thái thành công!");
    } catch (err) {
      alert("Lỗi cập nhật trạng thái: " + (err.response?.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportMau10 = async () => {
    if (!activeDoc) {
      alert("Vui lòng chọn một dự thảo trước khi xuất báo cáo.");
      return;
    }
    
    setIsLoading(true);
    try {
      const auth = getAuthHeader();
      const response = await axios.get(`/api/feedbacks/export_mau_10/?document_id=${activeDoc.id}`, {
        headers: { ...auth.headers },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bao_cao_Mau_10_${activeDoc.id}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      alert("Lỗi xuất báo cáo mẫu 10: " + errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Replace logs state with data from selectedFeedback
  const logData = selectedFeedback?.logs || [
    { id: 1, username: 'Hệ thống', time: '---', action: 'Chưa có dữ liệu ghi vết' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Mobile Tabs (only visible on small screens) */}
      <div className="lg:hidden flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('structure')}
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'structure' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500'}`}
        >
          Cấu trúc
        </button>
        <button 
          onClick={() => setActiveTab('workspace')}
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'workspace' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500'}`}
        >
          Nội dung
        </button>
        <button 
          onClick={() => setActiveTab('action')}
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'action' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500'}`}
        >
          Giải trình
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Panel 1: Sidebar (Structure) */}
        <aside className={`
          w-80 border-r border-slate-200 flex flex-col bg-slate-50/50 transition-all duration-300
          ${activeTab === 'structure' ? 'flex absolute inset-0 z-10 bg-white' : 'hidden lg:flex'}
        `}>
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold flex items-center space-x-2">
                <FileText size={18} className="text-blue-500" />
                <span>Cấu trúc Văn bản</span>
              </h2>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                title="Tải lên dự thảo mới"
              >
                <Upload size={18} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".docx"
              />
            </div>

            {/* Document Selector if multiple */}
            {documents.length > 1 && (
              <select 
                value={activeDoc?.id || ''} 
                onChange={(e) => setActiveDoc(documents.find(d => d.id === parseInt(e.target.value)))}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
              >
                {documents.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.project_name}</option>
                ))}
              </select>
            )}
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Tìm Điều/Khoản..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            {/* Tree Filters Select */}
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Filter className="absolute left-3 top-2.5 text-blue-500" size={14} />
                <select 
                  value={filterType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilterType(val);
                    if (val !== 'by_agency') setSelectedAgency('');
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer hover:border-blue-300 transition-colors"
                >
                  <option value="all">Toàn bộ văn bản</option>
                  <option value="has_feedback">Các mục có góp ý</option>
                  <option value="unresolved">Các mục chưa giải trình</option>
                  <option value="resolved">Các mục đã giải trình xong</option>
                  <option value="by_agency">Lọc theo Cơ quan góp ý</option>
                </select>
                <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>

              {/* Agency Search Input with Autocomplete */}
              {filterType === 'by_agency' && (
                <div className="relative animate-in slide-in-from-top-2 duration-200">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Nhập tên cơ quan..."
                      value={selectedAgency}
                      onChange={(e) => {
                        setSelectedAgency(e.target.value);
                        setShowAgencySuggestions(true);
                      }}
                      onFocus={() => setShowAgencySuggestions(true)}
                      className="w-full pl-3 pr-8 py-2 bg-blue-50/50 border border-blue-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                    />
                    {selectedAgency ? (
                      <button 
                        onClick={() => {
                          setSelectedAgency('');
                          setShowAgencySuggestions(true); // Tiếp tục mở dropdown sau khi xoá
                        }}
                        className="absolute right-2 top-2 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    ) : (
                      <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400">
                        <ChevronDown size={14} />
                      </div>
                    )}
                  </div>

                  {showAgencySuggestions && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-40 overflow-y-auto custom-scrollbar">
                      {agencies
                        .filter(a => a.toLowerCase().includes(selectedAgency.toLowerCase()))
                        .map((agency, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setSelectedAgency(agency);
                              setShowAgencySuggestions(false);
                            }}
                            className="px-3 py-2 text-xs hover:bg-blue-600 hover:text-white cursor-pointer border-b last:border-0 border-slate-50 transition-colors font-medium"
                          >
                            {agency}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400 space-y-2">
                <Loader2 className="animate-spin" size={24} />
                <span className="text-xs">Đang tải cấu trúc...</span>
              </div>
            ) : structure.length > 0 ? (
               <div className="space-y-1">
                 {renderStructure(getFilteredStructure(structure, filterType, searchTerm), 0, selectedNode, setSelectedNode, expandedNodes, toggleNode, null, null, [activeDoc?.project_name])}
               </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
                <div className="w-12 h-12 bg-slate-100/50 rounded-full flex items-center justify-center text-slate-300">
                  <Search size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Không tìm thấy nội dung</p>
                  <p className="text-xs text-slate-400 mt-1">Vui lòng kiểm tra lại bộ lọc hoặc từ khóa tìm kiếm</p>
                </div>
                {(filterType !== 'all' || searchTerm || selectedAgency) && (
                  <button 
                    onClick={() => {
                      setFilterType('all');
                      setSearchTerm('');
                      setSelectedAgency('');
                    }}
                    className="text-xs text-blue-600 font-bold hover:text-blue-700 transition-colors pt-2"
                  >
                    Xóa tất cả bộ lọc
                  </button>
                )}
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <span>Phiên bản hiện tại</span>
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Stable</span>
            </div>
            <p className="text-xs font-bold text-slate-600 mt-1">Vibe V{__APP_VERSION__}</p>
          </div>
        </aside>

        {/* Panel 2: Workspace (Content & Feedbacks) */}
        <section className={`
          flex-1 flex flex-col transition-all duration-300
          ${activeTab === 'workspace' ? 'flex' : 'hidden lg:flex'}
        `}>
          <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0">
            <div className="flex items-center space-x-2 text-sm overflow-hidden whitespace-nowrap max-w-[60%]">
              {selectedNode?.path ? (
                selectedNode.path.map((segment, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span className="text-slate-300">/</span>}
                    <span className={`
                      truncate
                      ${idx === selectedNode.path.length - 1 
                        ? 'font-bold text-slate-900 underline decoration-blue-500 decoration-2 underline-offset-4' 
                        : 'text-slate-400'}
                    `}>
                      {segment}
                    </span>
                  </React.Fragment>
                ))
              ) : (
                <div className="flex items-center space-x-2 text-slate-400 italic">
                  <ChevronRight size={14} />
                  <span>Chọn một mục để xử lý</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => feedbackInputRef.current?.click()}
                className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                title="Nhập góp ý từ file (.docx)"
              >
                <Plus size={14} />
                <span>Nhập Góp ý</span>
              </button>
              <input 
                type="file" 
                ref={feedbackInputRef} 
                onChange={handleFeedbackFileUpload} 
                className="hidden" 
                accept=".docx"
              />
              <button className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-all shadow-sm">
                <MessageSquare size={14} />
                <span>Góp ý mới</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6 bg-slate-50/50 scroll-smooth custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Draft Content Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 leading-relaxed text-slate-800 relative overflow-hidden group min-h-[300px]">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-50"></div>
                {selectedNode ? (
                  <>
                    <h3 className="text-xl font-bold mb-6 text-slate-900 border-b pb-4 flex items-center justify-between leading-tight">
                      <span>
                        {selectedNode.node_type === 'Khoản' 
                          ? `${selectedNode.parent_label}. ${(selectedNode.parent_content || "").split('\n')[0]}` 
                          : `${selectedNode.node_label}. ${(selectedNode.content || "").split('\n')[0]}`}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-lg uppercase tracking-widest shrink-0 ml-4">{selectedNode.node_type}</span>
                    </h3>
                    <div className="prose prose-slate max-w-none">
                       {/* Main Node Content */}
                       {selectedNode.node_type === 'Khoản' ? (
                         <div className="text-slate-700 leading-relaxed italic text-lg">
                            <span className="font-bold mr-2 text-slate-900">{(selectedNode.node_label || "").replace('Khoản ', '')}.</span>
                            {selectedNode.content}
                         </div>
                       ) : (
                         <div className="space-y-4">
                           {/* Floating Clause / Article Intro (lines after the first one) */}
                           {(selectedNode.content || "").split('\n').length > 1 && (
                             <div className="text-slate-700 leading-relaxed mb-6">
                               {(selectedNode.content || "").split('\n').slice(1).map((line, idx) => (
                                 <p key={idx} className="mb-2 last:mb-0 italic">{line}</p>
                               ))}
                             </div>
                           )}

                           {/* Children (Clauses) */}
                           <div className={`space-y-4 pt-2 block ${selectedNode.children?.length > 3 ? 'max-h-[300px] overflow-y-auto pr-3 custom-scrollbar' : ''}`}>
                             {selectedNode.children && selectedNode.children.map(child => (
                               <div key={child.id} className="ml-2 flex items-start space-x-3 text-slate-700 leading-relaxed italic border-b border-slate-50 pb-3 last:border-0 hover:bg-slate-50/50 transition-colors">
                                 <span className="font-bold text-slate-900 shrink-0">{(child.node_label || "").replace('Khoản ', '')}.</span>
                                 <span>{child.content}</span>
                               </div>
                             ))}
                           </div>
                         </div>
                       )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                    <FileText size={48} className="mb-4 opacity-20" />
                    <p>Chọn một Điều hoặc Khoản để xem nội dung</p>
                  </div>
                )}
                {selectedNode && (
                  <div className="mt-8 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium flex items-center space-x-2 w-fit">
                    <Clock size={14} />
                    <span>Cập nhật lần cuối: 2 ngày trước bởi qlvb</span>
                  </div>
                )}
              </div>

              {/* Feedbacks Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center space-x-2">
                    <MessageSquare size={16} />
                    <span>Ý kiến đóng góp ({nodeFeedbacks.length})</span>
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                  {nodeFeedbacks.map((fb) => (
                    <div 
                      key={fb.id} 
                      onClick={() => {
                        setSelectedFeedback(fb);
                        setExplanationContent(fb.explanation || '');
                      }}
                      className={`bg-white border rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all group cursor-pointer ${selectedFeedback?.id === fb.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${fb.agency_category === 'ministry' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                            {(fb.contributing_agency || "A").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold group-hover:text-blue-600 transition-colors uppercase">{fb.contributing_agency}</p>
                            <p className="text-[10px] text-slate-400">{fb.created_at}</p>
                          </div>
                        </div>
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${
                          fb.status === 'approved' ? 'bg-green-100 text-green-700' : 
                          fb.status === 'reviewed' ? 'bg-blue-100 text-blue-700' : 
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {fb.status === 'approved' ? 'Đã phê duyệt' : 
                           fb.status === 'reviewed' ? 'Đã thẩm định' : 'Chờ xử lý'}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">"{fb.content}"</p>
                      {fb.explanation && (
                         <div className="mt-3 p-3 bg-green-50/50 border border-green-100 rounded-lg">
                           <p className="text-[10px] font-bold text-green-700 uppercase mb-1">Giải trình:</p>
                           <p className="text-xs text-slate-600 line-clamp-2">{fb.explanation}</p>
                         </div>
                      )}
                    </div>
                  ))}
                  {nodeFeedbacks.length === 0 && (
                     <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center">
                        <MessageSquare size={32} className="mx-auto text-slate-200 mb-2" />
                        <p className="text-sm text-slate-400">Không có ý kiến góp ý nào cho mục này.</p>
                     </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Panel 3: Action Panel (Explanation & Traceability) */}
        <aside className={`
          w-80 border-l border-slate-200 flex flex-col bg-slate-50/50 transition-all duration-300
          ${activeTab === 'action' ? 'flex absolute inset-0 z-10 bg-white' : 'hidden md:flex'}
        `}>
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold flex items-center space-x-2">
              <CheckCircle2 size={18} className="text-green-500" />
              <span>Tiếp thu, Giải trình</span>
            </h2>
            <button 
              onClick={handleExportMau10}
              disabled={isLoading || !activeDoc}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group relative"
              title="Xuất báo cáo Mẫu 10 (.docx)"
            >
              <FileText size={18} />
              <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity font-bold">Xuất Mẫu 10</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nội dung giải trình mẫu 10</label>
                <button 
                  onClick={handleAISuggest}
                  disabled={isSuggestingAI || !selectedFeedback}
                  className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-bold hover:bg-blue-100 disabled:opacity-50 flex items-center space-x-1"
                >
                  {isSuggestingAI ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                  <span>AI Gợi ý</span>
                </button>
              </div>
              <textarea 
                value={explanationContent}
                onChange={(e) => setExplanationContent(e.target.value)}
                className="w-full h-40 p-4 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-inner resize-none disabled:bg-slate-50 disabled:text-slate-400"
                placeholder={selectedFeedback ? "Nhập nội dung tiếp thu, giải trình cho góp ý này..." : "Chọn một góp ý để bắt đầu giải trình"}
                disabled={!selectedFeedback}
              />
              <button 
                onClick={handleSaveExplanation}
                disabled={isLoading || !selectedFeedback}
                className="w-full flex items-center justify-center space-x-2 bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-transform active:scale-95 shadow-lg shadow-slate-900/10 disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                <span>Lưu Giải trình</span>
              </button>

              {selectedFeedback && (
                 <div className="grid grid-cols-2 gap-3 mt-1">
                    <button 
                      onClick={() => handleStatusChange('submit')}
                      disabled={isLoading || selectedFeedback.status !== 'pending'}
                      className="flex items-center justify-center space-x-1 py-2 px-3 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 disabled:opacity-30 transition-colors"
                    >
                      <Send size={12} />
                      <span>Gửi duyệt</span>
                    </button>
                    <button 
                      onClick={() => handleStatusChange('approve')}
                      disabled={isLoading || selectedFeedback.status === 'approved'}
                      className="flex items-center justify-center space-x-1 py-2 px-3 bg-green-50 text-green-600 rounded-lg text-[10px] font-bold hover:bg-green-100 disabled:opacity-30 transition-colors"
                    >
                      <CheckCircle2 size={12} />
                      <span>Phê duyệt</span>
                    </button>
                 </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center space-x-2">
                  <History size={14} />
                  <span>Nhật ký ghi vết</span>
                </h4>
              </div>
              <div className="space-y-3">
                {logData.map((log, idx) => (
                  <div key={idx} className="relative pl-6 pb-4 border-l-2 border-slate-200 last:border-0 last:pb-0">
                    <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-800">{log.action}</p>
                    <p className="text-[10px] text-slate-400">{log.time} - {log.username}</p>
                    {log.details && (
                       <div className="mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                         <p className="text-[10px] text-slate-500 leading-relaxed italic">{log.details}</p>
                       </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* MODAL: Parser Preview & Confirmation */}
      {previewStructure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                  <FileCheck size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Xác nhận Cấu trúc bóc tách</h3>
                  <p className="text-xs text-slate-500">Vui lòng kiểm tra các Chương/Điều/Khoản trước khi lưu vào hệ thống</p>
                </div>
              </div>
              <button 
                onClick={() => setPreviewStructure(null)}
                className="p-2 hover:bg-slate-100 text-slate-400 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                 <div className="p-4 bg-slate-100/50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                   <span>Thành phần bóc tách</span>
                   <span>Loại node</span>
                 </div>
                 <div className="divide-y divide-slate-100">
                    {renderPreviewNodes(previewStructure)}
                 </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex items-center justify-end space-x-3 bg-white">
              <button 
                onClick={() => setPreviewStructure(null)}
                className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={confirmUpload}
                disabled={isLoading}
                className="px-8 py-2.5 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 flex items-center space-x-2"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                <span>Lưu vào Hệ thống</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay for general actions */}
      {isUploading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-sm font-bold text-slate-900 animate-pulse">Đang bóc tách văn bản...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper for Preview Nodes
const renderPreviewNodes = (nodes, depth = 0) => {
  return nodes.map((node, i) => (
    <React.Fragment key={i}>
      <div className={`flex items-center justify-between p-3 hover:bg-blue-50/50 transition-colors ${depth > 0 ? 'bg-slate-50/30' : ''}`}>
        <div className="flex items-center space-x-3" style={{ paddingLeft: `${depth * 24}px` }}>
          <div className={`w-1.5 h-1.5 rounded-full ${node.node_type === 'Chương' ? 'bg-purple-500' : node.node_type === 'Điều' ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
          <span className="text-sm font-bold text-slate-700">{node.node_label}</span>
          <span className="text-[10px] text-slate-400 truncate max-w-[300px]">{node.content}</span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tighter ${
          node.node_type === 'Chương' ? 'bg-purple-100 text-purple-700' : 
          node.node_type === 'Điều' ? 'bg-blue-100 text-blue-700' : 
          'bg-slate-200 text-slate-600'
        }`}>
          {node.node_type}
        </span>
      </div>
      {node.children && node.children.length > 0 && renderPreviewNodes(node.children, depth + 1)}
    </React.Fragment>
  ));
};

// Helper for Sidebar Structure
const renderStructure = (nodes, depth = 0, selectedNode, setSelectedNode, expandedNodes, toggleNode, parentLabel = null, parentContent = null, currentPath = []) => {
  if (!nodes) return null;
  return nodes.map((node, i) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNode?.id === node.id;
    const hasFeedbacks = node.total_feedbacks > 0;
    const isProcessed = hasFeedbacks && node.resolved_feedbacks === node.total_feedbacks;

    return (
      <div key={node.id || i} className="select-none">
        <div 
          className={`
            group flex items-center py-2 px-3 rounded-xl cursor-pointer transition-all duration-200
            ${isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'hover:bg-slate-200/50 text-slate-700'}
          `}
          style={{ marginLeft: `${depth * 12}px` }}
          onClick={() => {
            setSelectedNode({ 
              ...node, 
              parent_label: parentLabel, 
              parent_content: parentContent,
              path: [...currentPath, node.node_label]
            });
            if (hasChildren && !isExpanded) toggleNode(node.id);
          }}
        >
          <div 
            className="p-1 hover:bg-black/5 rounded-md transition-colors mr-1"
            onClick={(e) => {
              if (hasChildren) {
                e.stopPropagation();
                toggleNode(node.id);
              }
            }}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown size={14} className={isSelected ? 'text-white' : 'text-slate-400'} /> : <ChevronRight size={14} className={isSelected ? 'text-white' : 'text-slate-400'} />
            ) : (
              <div className="w-3.5" />
            )}
          </div>
          
          <div className="flex-1 flex items-center justify-between min-w-0">
             <div className="flex items-center space-x-2 min-w-0">
                <span className={`text-[11px] font-black uppercase tracking-tighter shrink-0 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                  {node.node_type === 'Điều' ? 'Đ' : node.node_type === 'Khoản' ? 'K' : node.node_type === 'Điểm' ? 'p' : (node.node_type || "N").charAt(0)}
                </span>
                <span className={`text-sm truncate ${isSelected ? 'font-bold' : 'font-medium'}`}>
                  {node.node_label}
                </span>
             </div>

             {hasFeedbacks && (
               <div className={`
                 ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-black flex items-center space-x-1 shrink-0
                 ${isSelected ? 'bg-white/20 text-white' : isProcessed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}
               `}>
                 {isProcessed ? <CheckCircle2 size={10} /> : <MessageSquare size={10} />}
                 <span>{node.resolved_feedbacks}/{node.total_feedbacks}</span>
               </div>
             )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1">
            {renderStructure(node.children, depth + 1, selectedNode, setSelectedNode, expandedNodes, toggleNode, node.node_label, node.content, [...currentPath, node.node_label])}
          </div>
        )}
      </div>
    );
  });
};

export default VibeDashboard;
