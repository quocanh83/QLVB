import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card, CardBody, CardHeader, Input, Button, Spinner, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast, ToastContainer } from 'react-toastify';
import SimpleBar from 'simplebar-react';
import FeatherIcon from 'feather-icons-react';
import CreatableSelect from 'react-select/creatable';
import { Label, FormFeedback } from 'reactstrap';
import ImportFeedbackModal from './ImportFeedbackModal';

const selectStyles = {
    control: (base, state) => ({
        ...base,
        background: "var(--vz-input-bg)",
        borderColor: state.isFocused ? "var(--vz-input-focus-border-color)" : "var(--vz-input-border-color)",
        color: "var(--vz-body-color)",
    }),
    singleValue: (base) => ({
        ...base,
        color: "var(--vz-body-color)",
    }),
    menu: (base) => ({
        ...base,
        backgroundColor: "var(--vz-choices-bg, #fff)", 
        zIndex: 1070,
        border: "1px solid var(--vz-border-color)",
        boxShadow: "0 5px 10px rgba(30,32,37,.12)"
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected 
            ? "var(--vz-primary)" 
            : state.isFocused 
                ? "var(--vz-light)" 
                : "var(--vz-choices-bg, #fff)",
        color: state.isSelected 
            ? "#fff" 
            : "var(--vz-body-color)",
        "&:hover": {
            backgroundColor: "var(--vz-light)",
            color: "var(--vz-body-color)"
        }
    }),
    placeholder: (base) => ({
        ...base,
        color: "var(--vz-input-placeholder-color)"
    }),
    input: (base) => ({
        ...base,
        color: "var(--vz-body-color)"
    })
};

const DocumentDetails = () => {
    const { id } = useParams();
    const [document, setDocument] = useState(null);
    const [structure, setStructure] = useState([]);
    const [filteredStructure, setFilteredStructure] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [nodeFeedbacks, setNodeFeedbacks] = useState([]);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [explanationContent, setExplanationContent] = useState('');
    const [expandedNodeId, setExpandedNodeId] = useState(null);
    const [replyingToId, setReplyingToId] = useState(null);
    const [isEditingNode, setIsEditingNode] = useState(false);
    const [editedNodesData, setEditedNodesData] = useState({}); // { id: content }
    
    // States for UI
    const [loading, setLoading] = useState(true);
    const [loadingStructure, setLoadingStructure] = useState(false);
    const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
    const [isSuggestingAI, setIsSuggestingAI] = useState(false);
    const [savingExplanation, setSavingExplanation] = useState(false);
    
    // Manual Feedback Modal States
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [newFeedbackData, setNewFeedbackData] = useState({ agency: null, content: '' });
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    // Reassign Node States
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [nodeOptions, setNodeOptions] = useState([]);
    const [feedbackToReassign, setFeedbackToReassign] = useState(null);
    const [targetNodeId, setTargetNodeId] = useState('');
    const [reassigning, setReassigning] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    // Edit Feedback States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFeedbackId, setEditFeedbackId] = useState(null);
    const [editAgencyId, setEditAgencyId] = useState(null);
    const [editDocNumber, setEditDocNumber] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editNodeId, setEditNodeId] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [agencies, setAgencies] = useState([]);
    const [validationErrors, setValidationErrors] = useState({});

    // Quick Add Agency Modal State
    const [agencyModal, setAgencyModal] = useState(false);
    const [newAgencyName, setNewAgencyName] = useState("");
    const [newAgencyCategory, setNewAgencyCategory] = useState(null);
    const [categories, setCategories] = useState([]);
    const [addingAgency, setAddingAgency] = useState(false);
    
    // Appendix States
    const [appendices, setAppendices] = useState([]);
    const [loadingAppendices, setLoadingAppendices] = useState(false);
    const [showAppendixModal, setShowAppendixModal] = useState(false);
    const [appendixType, setAppendixType] = useState('text'); // 'text' or 'file'
    const [newAppendixData, setNewAppendixData] = useState({ name: '', content: '', file: null });
    const [isSavingAppendix, setIsSavingAppendix] = useState(false);
    const [parsedAppendices, setParsedAppendices] = useState([]);
    const [isParsing, setIsParsing] = useState(false);
    const [selectedAppendix, setSelectedAppendix] = useState(null);
    
    // Add Node States
    const [showAddNodeModal, setShowAddNodeModal] = useState(false);
    const [newNodeData, setNewNodeData] = useState({ node_type: 'Điều', node_label: '', content: '', parent_id: null });
    const [isAddingNode, setIsAddingNode] = useState(false);

    useEffect(() => {
        if (id) {
            fetchDocumentDetails();
            fetchStructure('all');
            fetchAgencies();
            fetchCategories();
            fetchAppendices();
        }
    }, [id]);

    useEffect(() => {
        if (selectedNode) {
            setSelectedAppendix(null);
            fetchFeedbacks(selectedNode.id);
            setIsEditingNode(false);
            const initialData = { [selectedNode.id]: selectedNode.content || '' };
            if (selectedNode.children) {
                selectedNode.children.forEach(child => {
                    initialData[child.id] = child.content || '';
                });
            }
            setEditedNodesData(initialData);
        } else {
            setNodeFeedbacks([]);
            setSelectedFeedback(null);
            setIsEditingNode(false);
        }
    }, [selectedNode]);

    useEffect(() => {
        if (selectedAppendix) {
            setSelectedNode(null);
            fetchAppendicesFeedbacks(selectedAppendix.id);
            setIsEditingNode(false);
            setEditedNodesData({ [selectedAppendix.id]: selectedAppendix.content || '' });
        }
    }, [selectedAppendix]);

    useEffect(() => {
        applyFilters();
    }, [searchTerm, filterType, structure]);

    const fetchDocumentDetails = async () => {
        try {
            const data = await axios.get(`/api/documents/${id}/`, getAuthHeader());
            setDocument(data.results || data);
        } catch (error) {
            toast.error("Không thể tải thông tin văn bản.");
        } finally {
            setLoading(false);
        }
    };

    const fetchStructure = async (type = 'all') => {
        setLoadingStructure(true);
        try {
            const endpoint = `/api/documents/${id}/nodes/`;
            const data = await axios.get(endpoint, getAuthHeader());
            const results = data.results || data || [];
            setStructure(results);
            setFilteredStructure(results);
        } catch (error) {
            toast.error("Không thể tải cấu trúc văn bản.");
        } finally {
            setLoadingStructure(false);
        }
    };

    const fetchAppendices = async () => {
        setLoadingAppendices(true);
        try {
            const res = await axios.get(`/api/documents/appendices/?document_id=${id}`, getAuthHeader());
            setAppendices(res.results || res || []);
        } catch (error) {
            console.error("Lỗi tải phụ lục:", error);
        } finally {
            setLoadingAppendices(false);
        }
    };

    const fetchFeedbacks = async (nodeId) => {
        setLoadingFeedbacks(true);
        try {
            const data = await axios.get(`/api/feedbacks/by_node/?node_id=${nodeId}`, getAuthHeader());
            const results = data.results || data || [];
            setNodeFeedbacks(results);
            if (results.length > 0) {
                setSelectedFeedback(results[0]);
                setExplanationContent(results[0].explanation || '');
            } else {
                setSelectedFeedback(null);
                setExplanationContent('');
            }
        } catch (error) {
            toast.error("Không thể tải danh sách góp ý.");
        } finally {
            setLoadingFeedbacks(false);
        }
    };

    const fetchAppendicesFeedbacks = async (appendixId) => {
        setLoadingFeedbacks(true);
        try {
            const data = await axios.get(`/api/feedbacks/by_appendix/?appendix_id=${appendixId}`, getAuthHeader());
            const results = data.results || data || [];
            setNodeFeedbacks(results);
            if (results.length > 0) {
                setSelectedFeedback(results[0]);
                setExplanationContent(results[0].explanation || '');
            } else {
                setSelectedFeedback(null);
                setExplanationContent('');
            }
        } catch (error) {
            toast.error("Không thể tải danh sách góp ý của phụ lục.");
        } finally {
            setLoadingFeedbacks(false);
        }
    };

    const applyFilters = () => {
        if (!structure) return;
        
        let result = JSON.parse(JSON.stringify(structure)); // Deep copy

        const filterTree = (nodes, term, type) => {
            if (!nodes) return [];
            return nodes.map(node => {
                const children = filterTree(node.children || [], term, type);
                
                let textMatch = true;
                if (term) {
                    textMatch = node.node_label?.toLowerCase().includes(term.toLowerCase()) || 
                                node.content?.toLowerCase().includes(term.toLowerCase());
                }

                let typeMatch = true;
                if (type === 'has_feedback') typeMatch = node.total_feedbacks > 0;
                if (type === 'resolved') typeMatch = node.resolved_feedbacks === node.total_feedbacks && node.total_feedbacks > 0;
                if (type === 'unresolved') typeMatch = node.resolved_feedbacks < node.total_feedbacks && node.total_feedbacks > 0;

                if ((textMatch && typeMatch) || children.length > 0) {
                    return { ...node, children };
                }
                return null;
            }).filter(Boolean);
        };

        setFilteredStructure(filterTree(result, searchTerm, filterType));
    };

    const handleAISuggestForID = async (fb) => {
        if (!fb || !selectedNode || !document) return;
        
        setIsSuggestingAI(true);
        try {
            const data = await axios.post('/api/feedbacks/ai_suggest/', {
                document_id: document.id,
                node_content: selectedNode.content,
                feedback_content: fb.content
            }, getAuthHeader());
            setExplanationContent(data.suggestion);
            toast.success("AI đã tạo gợi ý giải trình!");
        } catch (err) {
            toast.error("Lỗi khi kết nối với AI.");
        } finally {
            setIsSuggestingAI(false);
        }
    };

    const handleSaveExplanationForID = async (fbId) => {
        if (!fbId || !document) return;
        
        setSavingExplanation(true);
        try {
            await axios.post('/api/feedbacks/save_explanation/', {
                document_id: document.id,
                target_type: 'Feedback',
                object_id: fbId,
                content: explanationContent
            }, getAuthHeader());
            
            toast.success("Đã lưu giải trình!");
            setReplyingToId(null);
            fetchFeedbacks(selectedNode.id); // Refresh
        } catch (err) {
            toast.error("Lỗi khi lưu giải trình.");
        } finally {
            setSavingExplanation(false);
        }
    };

    const handleSaveNodeContent = async () => {
        if (selectedAppendix) {
            handleSaveAppendixTextContent();
            return;
        }
        if (!selectedNode) return;
        try {
            const updatePromises = Object.entries(editedNodesData).map(([id, content]) => {
                // Chỉ gửi PATCH nếu nội dung thực sự thay đổi (tối ưu hóa)
                const originalContent = id === selectedNode.id.toString() 
                    ? selectedNode.content 
                    : selectedNode.children?.find(c => c.id.toString() === id)?.content;
                
                if (content !== originalContent) {
                    return axios.patch(`/api/nodes/${id}/`, { content }, getAuthHeader());
                }
                return null;
            }).filter(p => p !== null);

            if (updatePromises.length > 0) {
                await Promise.all(updatePromises);
                toast.success("Cập nhật nội dung thành công!");
                fetchStructure();
                // Update selected node locally
                const newMainContent = editedNodesData[selectedNode.id] || selectedNode.content;
                const newChildren = selectedNode.children?.map(child => ({
                    ...child,
                    content: editedNodesData[child.id] || child.content
                }));
                setSelectedNode({ ...selectedNode, content: newMainContent, children: newChildren });
            }
            setIsEditingNode(false);
        } catch (err) {
            toast.error("Lỗi cập nhật nội dung.");
        }
    };

    const handleSaveAppendixTextContent = async () => {
        if (!selectedAppendix) return;
        try {
            const newContent = editedNodesData[selectedAppendix.id];
            await axios.patch(`/api/documents/appendices/${selectedAppendix.id}/`, { content: newContent }, getAuthHeader());
            toast.success("Cập nhật nội dung phụ lục thành công!");
            setSelectedAppendix({ ...selectedAppendix, content: newContent });
            fetchAppendices();
            setIsEditingNode(false);
        } catch (err) {
            toast.error("Lỗi cập nhật phụ lục.");
        }
    };

    const handleSaveAppendix = async () => {
        if (!newAppendixData.name) {
            toast.warning("Vui lòng nhập tên phụ lục.");
            return;
        }
        setIsSavingAppendix(true);
        try {
            const formData = new FormData();
            formData.append('document', id);
            formData.append('name', newAppendixData.name);
            if (appendixType === 'text') {
                formData.append('content', newAppendixData.content);
            } else if (newAppendixData.file) {
                formData.append('file', newAppendixData.file);
            }

            await axios.post('/api/documents/appendices/', formData, {
                headers: {
                    ...getAuthHeader().headers,
                    'Content-Type': 'multipart/form-data'
                }
            });
            toast.success("Đã thêm phụ lục thành công!");
            setShowAppendixModal(false);
            setNewAppendixData({ name: '', content: '', file: null });
            fetchAppendices();
        } catch (err) {
            toast.error("Lỗi khi thêm phụ lục.");
        } finally {
            setIsSavingAppendix(false);
        }
    };

    const handleFilePreview = async (file) => {
        if (!file) return;
        setIsParsing(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post('/api/documents/appendices/preview_parse/', formData, {
                headers: { ...getAuthHeader().headers, 'Content-Type': 'multipart/form-data' }
            });
            // Mark all as selected by default
            setParsedAppendices((res.results || res || []).map(item => ({ ...item, selected: true })));
        } catch (err) {
            toast.error("Lỗi khi đọc file phụ lục.");
        } finally {
            setIsParsing(false);
        }
    };

    const handleSaveBulkAppendices = async () => {
        const toSave = parsedAppendices.filter(a => a.selected);
        if (toSave.length === 0) {
            toast.warning("Vui lòng chọn ít nhất một phụ lục để lưu.");
            return;
        }
        setIsSavingAppendix(true);
        try {
            await axios.post('/api/documents/appendices/bulk_create/', {
                document_id: id,
                appendices: toSave
            }, getAuthHeader());
            toast.success(`Đã lưu ${toSave.length} phụ lục thành công!`);
            setShowAppendixModal(false);
            setParsedAppendices([]);
            fetchAppendices();
        } catch (err) {
            toast.error("Lỗi khi lưu danh sách phụ lục.");
        } finally {
            setIsSavingAppendix(false);
        }
    };

    const handleDeleteAppendix = async (appendixId) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa phụ lục này?")) return;
        try {
            await axios.delete(`/api/documents/appendices/${appendixId}/`, getAuthHeader());
            toast.success("Đã xóa phụ lục.");
            fetchAppendices();
        } catch (err) {
            toast.error("Lỗi khi xóa phụ lục.");
        }
    };

    const handleAddNode = async () => {
        if (!newNodeData.node_label) {
            toast.warning("Vui lòng nhập nhãn (ví dụ: Điều 1, Khoản 1).");
            return;
        }
        setIsAddingNode(true);
        try {
            await axios.post(`/api/documents/${id}/add_node/`, {
                ...newNodeData,
                document: id
            }, getAuthHeader());
            toast.success("Đã thêm mục mới!");
            setShowAddNodeModal(false);
            setNewNodeData({ node_type: 'Điều', node_label: '', content: '', parent_id: null });
            fetchStructure();
        } catch (err) {
            toast.error("Lỗi khi thêm mục mới.");
        } finally {
            setIsAddingNode(false);
        }
    };

    const handleExportMau10 = async () => {
        if (!document) return;
        try {
            const baseUrl = process.env.REACT_APP_API_URL || '';
            const url = `${baseUrl}/api/feedbacks/export_mau_10/?document_id=${document.id}&report_type=mau_10`;
            
            const auth = getAuthHeader();
            const fetchResponse = await fetch(url, {
                method: 'GET',
                headers: {
                    ...auth.headers,
                }
            });

            if (!fetchResponse.ok) {
                const errData = await fetchResponse.json().catch(() => ({}));
                throw new Error(errData.error || "Lỗi tải báo cáo từ máy chủ.");
            }

            const blob = await fetchResponse.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            
            const filename = `Bao_cao_Mau_10_${document.id}.docx`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            
            setTimeout(() => {
                if (document.body.contains(link)) document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
            }, 10000);

            toast.success("Xuất báo cáo thành công!");
        } catch (err) {
            console.error("Lỗi xuất word:", err);
            toast.error(err.message || "Lỗi khi xuất báo cáo.");
        }
    };

    const fetchAgencies = async () => {
        try {
            const res = await axios.get('/api/settings/agencies/', getAuthHeader());
            const data = res.results || res || [];
            setAgencies(data.map(a => ({ value: a.id, label: a.name })));
        } catch (e) {
            console.error(e);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await axios.get('/api/settings/agency-categories/', getAuthHeader());
            const data = res.results || res || [];
            setCategories(data.map(c => ({ value: c.id, label: c.name })));
        } catch (e) {
            console.error(e);
        }
    };

    const handleEditFeedback = (fb) => {
        setEditFeedbackId(fb.id);
        setEditAgencyId(fb.agency ? { value: fb.agency, label: fb.contributing_agency } : { value: null, label: fb.contributing_agency });
        setEditDocNumber(fb.official_doc_number || '');
        setEditContent(fb.content || '');
        setEditNodeId(fb.node || '');
        setValidationErrors({});
        setIsEditModalOpen(true);
        
        // Load node options if not loaded
        if (nodeOptions.length === 0) {
            axios.get(`/api/feedbacks/get_document_nodes/?document_id=${id}`, getAuthHeader())
                .then(res => setNodeOptions(res.results || res || []))
                .catch(err => console.error(err));
        }
    };

    const saveFeedbackEdit = async () => {
        if (!editFeedbackId) return;
        setIsSavingEdit(true);
        setValidationErrors({});
        try {
            const payload = {
                agency: editAgencyId?.value || null,
                contributing_agency: editAgencyId?.label || "Cơ quan góp ý",
                official_doc_number: editDocNumber || "",
                content: editContent,
                node: editNodeId || null,
                document: id // id extracted from useParams()
            };

            await axios.patch(`/api/feedbacks/${editFeedbackId}/`, payload, getAuthHeader());
            
            toast.success("Cập nhật góp ý thành công!");
            setIsEditModalOpen(false);
            if (selectedNode) fetchFeedbacks(selectedNode.id);
            if (selectedAppendix) fetchAppendicesFeedbacks(selectedAppendix.id);
            if (editNodeId !== selectedNode?.id) {
                fetchStructure(); // Refresh tree if node changed
            }
        } catch (err) {
            console.error("Lỗi khi cập nhật góp ý:", err.response?.data);
            if (err.response && err.response.data) {
                setValidationErrors(err.response.data);
                const errorData = err.response.data;
                const errorMsg = typeof errorData === 'object' 
                    ? JSON.stringify(errorData)
                    : String(errorData);
                toast.error("Lỗi: " + errorMsg);
            } else {
                toast.error("Lỗi khi cập nhật góp ý.");
            }
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleQuickAgencySave = async () => {
        if (!newAgencyName) return;
        setAddingAgency(true);
        try {
            let categoryId = newAgencyCategory?.value;
            if (newAgencyCategory?.__isNew__) {
                const catRes = await axios.post(`/api/settings/agency-categories/`, { name: newAgencyCategory.label }, getAuthHeader());
                categoryId = catRes.id;
                fetchCategories();
            }

            const res = await axios.post(`/api/settings/agencies/`, {
                name: newAgencyName,
                category: categoryId
            }, getAuthHeader());

            const newOption = { value: res.id, label: res.name };
            setAgencies(prev => [newOption, ...prev]);
            
            // Assign to whichever modal is active
            if (showFeedbackModal) {
                setNewFeedbackData(prev => ({ ...prev, agency: newOption }));
            } else if (isEditModalOpen) {
                setEditAgencyId(newOption);
            }
            
            setAgencyModal(false);
            toast.success("Đã thêm đơn vị mới!");
            fetchAgencies(); // Refresh the main agencies list
        } catch (e) {
            toast.error("Không thể thêm đơn vị.");
        } finally {
            setAddingAgency(false);
        }
    };

    const handleSaveNewFeedback = async () => {
        if (!selectedNode && !selectedAppendix) {
            toast.warning("Vui lòng chọn Điều/Khoản hoặc Phụ lục để thêm góp ý.");
            return;
        }
        if (!newFeedbackData.content) {
            toast.warning("Vui lòng nhập nội dung góp ý.");
            return;
        }
        
        try {
            const postData = {
                document: id,
                agency: newFeedbackData.agency ? newFeedbackData.agency.value : null,
                contributing_agency: newFeedbackData.agency ? newFeedbackData.agency.label : "Cơ quan góp ý",
                content: newFeedbackData.content,
                status: 'pending'
            };

            if (selectedNode) postData.node = selectedNode.id;
            if (selectedAppendix) postData.appendix = selectedAppendix.id;

            await axios.post(`/api/feedbacks/`, postData, getAuthHeader());
            
            toast.success("Đã thêm góp ý thành công!");
            setShowFeedbackModal(false);
            setNewFeedbackData({ agency: null, content: '' });
            
            if (selectedNode) fetchFeedbacks(selectedNode.id);
            if (selectedAppendix) fetchAppendicesFeedbacks(selectedAppendix.id);
            fetchStructure(); // Refresh counts in tree
        } catch (err) {
            toast.error("Lỗi khi thêm góp ý.");
        }
    };

    const handleOpenReassignModal = async (fb) => {
        setFeedbackToReassign(fb);
        setIsReassignModalOpen(true);
        if (nodeOptions.length === 0) {
            try {
                const res = await axios.get(`/api/feedbacks/get_document_nodes/?document_id=${id}`, getAuthHeader());
                setNodeOptions(res.results || res || []);
            } catch (err) {
                toast.error("Không thể tải danh sách điều khoản.");
            }
        }
        setTargetNodeId(fb.node_id);
    };

    const handleReassignFeedback = async () => {
        if (!targetNodeId || !feedbackToReassign) return;
        setReassigning(true);
        try {
            await axios.post(`/api/feedbacks/${feedbackToReassign.id}/reassign_node/`, {
                node_id: targetNodeId
            }, getAuthHeader());
            
            toast.success("Đã chuyển điều khoản thành công!");
            setIsReassignModalOpen(false);
            if (selectedNode) fetchFeedbacks(selectedNode.id);
            if (selectedAppendix) fetchAppendicesFeedbacks(selectedAppendix.id);
            fetchStructure(); // Refresh tree counts
        } catch (err) {
            toast.error("Lỗi khi chuyển điều khoản.");
        } finally {
            setReassigning(false);
        }
    };

    const renderNodeTree = (nodes, depth = 0) => {
        if (!nodes) return null;
        return nodes.map(node => {
            const hasChildren = node.children && node.children.length > 0;
            const isExpanded = expandedNodeId === node.id;
            
            return (
                <div key={node.id} className="mb-1">
                    <div 
                        className={`p-2 rounded cursor-pointer transition-colors fs-13 ${selectedNode?.id === node.id ? 'bg-primary text-white shadow-sm' : 'hover:bg-light text-body'}`}
                        style={{ marginLeft: `${depth * 15}px` }}
                        onClick={() => {
                            setSelectedNode(node);
                            if (node.node_type === 'Điều') {
                                setExpandedNodeId(isExpanded ? null : node.id);
                            }
                        }}
                    >
                        <div className="d-flex align-items-center">
                            <FeatherIcon 
                                icon={node.node_type === 'Khoản' ? 'file-text' : (isExpanded ? 'chevron-down' : 'chevron-right')} 
                                className="icon-xs me-2 opacity-75" 
                            />
                            <span className="fw-medium text-truncate flex-grow-1">
                                {node.node_label}: {(node.content || "").substring(0, 30)}...
                            </span>
                            {node.total_feedbacks > 0 && (
                                <span className={`badge ${node.resolved_feedbacks === node.total_feedbacks ? 'bg-success' : 'bg-warning'} ms-2`}>
                                    {node.resolved_feedbacks}/{node.total_feedbacks}
                                </span>
                            )}
                        </div>
                    </div>
                    {hasChildren && isExpanded && (
                        <div className="mt-1">
                            {renderNodeTree(node.children, depth + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    window.document.title = document ? `Chi tiết: ${document.project_name} | QLVB V3.0` : "Chi tiết Văn bản | QLVB V3.0";

    if (loading) {
        return (
            <div className="page-content d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
                <Spinner color="primary" />
            </div>
        );
    }

    return (
        <React.Fragment>
            <div className="page-content" style={{ padding: 0, height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>
                <Container fluid className="h-100 d-flex flex-column px-0 pb-1">
                    
                    {/* Header Bar */}
                    <div className="bg-card border-bottom p-2 mb-1 shrink-0 rounded shadow-sm">
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-3">
                                <Link to="/documents" className="btn btn-sm btn-soft-secondary">
                                    <i className="ri-arrow-left-line align-bottom"></i> Quay lại
                                </Link>
                                <h4 className="mb-0 fw-bold header-title text-truncate" style={{ maxWidth: '600px' }}>
                                    {document?.project_name}
                                </h4>
                                <span className="badge bg-primary-subtle text-primary">{document?.status}</span>
                            </div>
                            <div className="d-flex gap-2">
                                <Link to={`/documents/${id}/classification`} className="btn btn-sm btn-info d-flex align-items-center">
                                    <i className="ri-table-line align-bottom me-1"></i> Bảng theo dõi góp ý
                                </Link>
                                <Button color="success" className="btn-sm" onClick={handleExportMau10}>
                                    <i className="ri-file-word-2-line align-bottom me-1"></i> Xuất Mẫu 10
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* 3 Columns Workspace */}
                    <Row className="flex-grow-1 g-3 overflow-hidden m-0" style={{ minHeight: 0 }}>
                        
                        {/* LEFT COLUMN: STRUCTURE (3/12) */}
                        <Col lg={3} className="h-100 d-flex flex-column">
                            <Card className="h-100 border-0 shadow-sm mb-0">
                                <CardHeader className="border-bottom p-3 bg-light-subtle">
                                    <h6 className="card-title mb-3 fw-bold"><i className="ri-node-tree align-bottom me-1 text-primary"></i> Cấu trúc Dự thảo</h6>
                                    <div className="search-box mb-2">
                                        <Input 
                                            type="text" 
                                            className="form-control form-control-sm" 
                                            placeholder="Tìm kiếm Điều/Khoản..." 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        <i className="ri-search-line search-icon"></i>
                                    </div>
                                    <Input 
                                        type="select" 
                                        className="form-select form-select-sm"
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                    >
                                        <option value="all">Tất cả nội dung</option>
                                        <option value="has_feedback">Mục có góp ý</option>
                                        <option value="unresolved">Chưa giải trình xong</option>
                                        <option value="resolved">Đã giải trình</option>
                                    </Input>
                                </CardHeader>
                                <CardBody className="p-0 overflow-hidden">
                                    <SimpleBar style={{ height: '100%' }} className="p-3">
                                        {loadingStructure ? (
                                            <div className="text-center py-4"><Spinner size="sm" color="primary" /></div>
                                        ) : filteredStructure.length > 0 ? (
                                            <>
                                                {renderNodeTree(filteredStructure)}
                                                
                                                {/* Appendices Section */}
                                                <div className="mt-4 pt-3 border-top">
                                                    <div className="d-flex justify-content-between align-items-center mb-2 px-1">
                                                        <h6 className="card-title mb-0 fs-12 text-uppercase fw-bold text-muted">Phụ lục kèm theo</h6>
                                                        <Button color="soft-primary" size="sm" className="btn-icon rounded-circle" onClick={() => setShowAppendixModal(true)}>
                                                            <i className="ri-add-line"></i>
                                                        </Button>
                                                    </div>
                                                    <div className="px-1">
                                                        {loadingAppendices ? <div className="text-center"><Spinner size="sm"/></div> : appendices.length > 0 ? (
                                                            appendices.map(app => (
                                                                <div key={app.id} className={`d-flex align-items-center justify-content-between p-2 mb-1 rounded shadow-xs transition-all ${selectedAppendix?.id === app.id ? 'bg-primary bg-opacity-10 border border-primary-subtle' : 'bg-body-secondary hover:bg-light-subtle'}`}>
                                                                    <div className="d-flex align-items-center overflow-hidden flex-grow-1 cursor-pointer" onClick={() => {
                                                                        setSelectedAppendix(app);
                                                                        setSelectedNode(null);
                                                                        fetchAppendicesFeedbacks(app.id);
                                                                    }}>
                                                                        <i className={`ri-${app.file ? 'file-list-2' : 'text-spacing'} ${selectedAppendix?.id === app.id ? 'text-primary' : 'text-muted'} me-2 fs-16`}></i>
                                                                        <span className={`text-truncate fs-12 ${selectedAppendix?.id === app.id ? 'fw-bold text-primary' : 'fw-medium'}`}>{app.name}</span>
                                                                    </div>
                                                                    <Button color="link" size="sm" className="p-0 text-danger ms-2" onClick={(e) => { e.stopPropagation(); handleDeleteAppendix(app.id); }}>
                                                                        <i className="ri-delete-bin-line fs-14"></i>
                                                                    </Button>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="text-center text-muted fs-11 py-2 opacity-75">Chưa có phụ lục.</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center text-muted py-4 fs-13">Không tìm thấy nội dung phù hợp.</div>
                                        )}
                                    </SimpleBar>
                                </CardBody>
                            </Card>
                        </Col>

                        {/* MIDDLE COLUMN: CONTENT (5/12) */}
                        <Col lg={5} className="h-100 d-flex flex-column">
                            <Card className="h-100 border-0 shadow-sm mb-0">
                                <CardHeader className="border-bottom p-3">
                                    <h6 className="card-title mb-0 fw-bold"><i className="ri-file-list-3-line align-bottom me-1 text-primary"></i> Nội dung Chi tiết</h6>
                                </CardHeader>
                                <CardBody className="p-0 overflow-hidden bg-body-tertiary bg-opacity-50">
                                    <SimpleBar style={{ height: '100%' }} className="p-4">
                                        {selectedAppendix ? (
                                            <div className="bg-card p-4 rounded shadow-sm border border-primary-subtle border-opacity-25">
                                                <div className="d-flex justify-content-between align-items-start mb-3 pb-2 border-bottom">
                                                    <div>
                                                        <h5 className="fw-bold mb-1 text-primary">{selectedAppendix.name}</h5>
                                                        <span className="badge bg-primary-subtle text-primary fs-10 text-uppercase">Phụ lục đính kèm</span>
                                                    </div>
                                                    <div className="d-flex gap-2">
                                                        {!selectedAppendix.file && (
                                                            !isEditingNode ? (
                                                                <Button color="light" size="sm" className="btn-icon" onClick={() => setIsEditingNode(true)}>
                                                                    <i className="ri-pencil-line fs-14"></i>
                                                                </Button>
                                                            ) : (
                                                                <div className="d-flex gap-1">
                                                                    <Button color="success" size="sm" onClick={handleSaveNodeContent}>Lưu</Button>
                                                                    <Button color="light" size="sm" onClick={() => setIsEditingNode(false)}>Hủy</Button>
                                                                </div>
                                                            )
                                                        )}
                                                        {selectedAppendix.file && (
                                                            <Button color="primary" size="sm" className="btn-label" onClick={() => window.open(selectedAppendix.file, "_blank")}>
                                                                <i className="ri-download-2-line label-icon align-middle fs-16 me-2"></i> Tải file
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="fs-14 text-body lh-base" style={{ whiteSpace: 'pre-wrap' }}>
                                                    {isEditingNode ? (
                                                        <Input 
                                                            type="textarea" 
                                                            rows={20} 
                                                            className="form-control bg-white shadow-sm border-primary-subtle" 
                                                            value={editedNodesData[selectedAppendix.id] || ''} 
                                                            onChange={(e) => setEditedNodesData({ ...editedNodesData, [selectedAppendix.id]: e.target.value })}
                                                        />
                                                    ) : (
                                                        selectedAppendix.file ? (
                                                            <div className="text-center py-5">
                                                                <div className="avatar-lg mx-auto mb-3">
                                                                    <div className="avatar-title bg-light text-primary rounded-circle display-6">
                                                                        <i className="ri-file-word-2-line"></i>
                                                                    </div>
                                                                </div>
                                                                <h6 className="fw-bold">{selectedAppendix.name}</h6>
                                                                <p className="text-muted small mb-4">Nội dung nằm trong tệp tin đính kèm</p>
                                                                <Button color="soft-primary" onClick={() => window.open(selectedAppendix.file, "_blank")}>
                                                                    Xem chi tiết file
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            selectedAppendix.content || <div className="text-muted italic">Không có nội dung văn bản.</div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        ) : selectedNode ? (
                                            <div className="bg-card p-4 rounded shadow-sm border border-light-subtle">
                                                <h5 className="fw-bold mb-3 pb-2 border-bottom border-light d-flex justify-content-between align-items-center">
                                                    <span>
                                                        {selectedNode.node_type === 'Khoản' 
                                                            ? `${selectedNode.parent_label || 'Văn bản'}. ${selectedNode.parent_content?.split('\n')[0] || ''}` 
                                                            : `${selectedNode.node_label}: ${selectedNode.content?.split('\n')[0] || ''}`}
                                                    </span>
                                                    <div className="d-flex align-items-center gap-2">
                                                        {!isEditingNode ? (
                                                            <Button color="light" size="sm" className="btn-icon" onClick={() => setIsEditingNode(true)}>
                                                                <i className="ri-pencil-line fs-14"></i>
                                                            </Button>
                                                        ) : (
                                                            <div className="d-flex gap-1">
                                                                <Button color="success" size="sm" onClick={handleSaveNodeContent}>Lưu</Button>
                                                                <Button color="light" size="sm" onClick={() => setIsEditingNode(false)}>Hủy</Button>
                                                            </div>
                                                        )}
                                                        <span className="badge bg-light-subtle text-muted border border-light-subtle">{selectedNode.node_type}</span>
                                                    </div>
                                                </h5>
                                                <div className="fs-14 text-body lh-base">
                                                    {isEditingNode ? (
                                                        <div className="space-y-4">
                                                            {/* Edit Main Node (Điều hoặc Khoản đơn lẻ) */}
                                                            <div className="mb-4">
                                                                <label className="form-label fs-12 text-uppercase text-muted fw-bold">
                                                                    {selectedNode.node_label} (Nội dung chính)
                                                                </label>
                                                                <Input 
                                                                    type="textarea" 
                                                                    rows={selectedNode.node_type === 'Điều' ? 3 : 10} 
                                                                    className="form-control bg-white shadow-sm border-info-subtle" 
                                                                    value={editedNodesData[selectedNode.id] || ''} 
                                                                    onChange={(e) => setEditedNodesData({ ...editedNodesData, [selectedNode.id]: e.target.value })}
                                                                />
                                                            </div>

                                                            {/* Edit Sub-nodes (Nếu là Điều có các Khoản) */}
                                                            {selectedNode.node_type === 'Điều' && selectedNode.children && selectedNode.children.map(child => (
                                                                <div key={child.id} className="mb-3 ps-3 border-start border-info border-2">
                                                                    <label className="form-label fs-12 text-uppercase text-muted fw-bold">
                                                                        {child.node_label}
                                                                    </label>
                                                                    <Input 
                                                                        type="textarea" 
                                                                        rows={4} 
                                                                        className="form-control bg-white shadow-sm" 
                                                                        value={editedNodesData[child.id] || ''} 
                                                                        onChange={(e) => setEditedNodesData({ ...editedNodesData, [child.id]: e.target.value })}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        selectedNode.node_type === 'Khoản' ? (
                                                            <div style={{ whiteSpace: 'pre-wrap' }}>
                                                                <span className="text-body me-2">{(selectedNode.node_label || "").replace('Khoản ', '')}.</span>{selectedNode.content}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-3" style={{ whiteSpace: 'pre-wrap' }}>
                                                                {(selectedNode.content || "").split('\n').map((line, idx) => {
                                                                    if (selectedNode.node_type === 'Điều' && idx === 0) return null;
                                                                    return <p key={idx} className="mb-1">{line}</p>;
                                                                })}
                                                                {selectedNode.children && selectedNode.children.map(child => (
                                                                    <div key={child.id} className="ms-3 mt-2 pb-2 border-bottom border-light border-opacity-50 border-dashed">
                                                                        <span className="text-body me-2">{child.node_label.replace('Khoản ', '')}.</span>
                                                                        <span>{child.content}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="d-flex flex-column justify-content-center align-items-center h-100 text-muted">
                                                <div className="avatar-md mb-3">
                                                    <div className="avatar-title bg-light-subtle text-primary rounded-circle fs-24">
                                                        <i className="ri-article-line"></i>
                                                    </div>
                                                </div>
                                                <h5>Chưa chọn Điều/Khoản</h5>
                                                <p className="fs-13">Vui lòng chọn một mục bên trái để xem nội dung.</p>
                                            </div>
                                        )}
                                    </SimpleBar>
                                </CardBody>
                            </Card>
                        </Col>

                        {/* RIGHT COLUMN: FEEDBACKS (4/12) */}
                        <Col lg={4} className="h-100 d-flex flex-column">
                            <Card className="h-100 border-0 shadow-sm mb-0">
                                <CardHeader className="border-bottom p-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <h6 className="card-title mb-0 fw-bold">
                                            <i className="ri-discuss-line align-bottom me-1 text-primary"></i> 
                                            Ý kiến & Giải trình ({nodeFeedbacks.length})
                                        </h6>
                                        <div>
                                            <Button 
                                                color="success" 
                                                size="sm" 
                                                className="btn-label waves-effect waves-light me-2"
                                                onClick={() => setShowImportModal(true)}
                                            >
                                                <i className="ri-file-excel-2-line label-icon align-middle fs-16 me-2"></i> Nhập từ bảng tính
                                            </Button>
                                            <Button 
                                                color="primary" 
                                                size="sm" 
                                                className="btn-label waves-effect waves-light"
                                                onClick={() => setShowFeedbackModal(true)}
                                                disabled={!selectedNode && !selectedAppendix}
                                                title={(!selectedNode && !selectedAppendix) ? "Vui lòng chọn Điều/Khoản hoặc Phụ lục để thêm góp ý" : "Thêm góp ý thủ công"}
                                            >
                                                <i className="ri-add-line label-icon align-middle fs-16 me-2"></i> Thêm góp ý
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardBody className="p-0 d-flex flex-column overflow-hidden bg-body-tertiary">
                                    {/* Feedbacks List (Vertical Chat Thread) */}
                                    <div className="flex-grow-1 overflow-hidden">
                                        <SimpleBar style={{ height: '100%' }} className="p-3">
                                            {loadingFeedbacks ? (
                                                <div className="text-center py-3"><Spinner size="sm" color="primary"/></div>
                                            ) : nodeFeedbacks.length > 0 ? (
                                                <div className="d-flex flex-column gap-3">
                                                    {nodeFeedbacks.map(fb => (
                                                        <div key={fb.id} className="feedback-thread">
                                                            {/* Feedback Bubble (The "Question") */}
                                                            <div className="d-flex justify-content-start mb-2">
                                                                <div className="card border-0 mb-0 shadow-sm overflow-hidden" style={{ maxWidth: '85%', borderRadius: '15px 15px 15px 2px' }}>
                                                                    <div className="card-header py-1 px-3 bg-light-subtle border-0">
                                                                        <div className="d-flex justify-content-between align-items-center">
                                                                            <span className="fw-bold fs-11 text-uppercase text-info">{fb.contributing_agency}</span>
                                                                            <span className="fs-10 text-muted ms-2">{new Date(fb.created_at).toLocaleDateString()}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="card-body p-3 border-top border-light-subtle">
                                                                        <p className="fs-13 mb-2 text-body">"{fb.content}"</p>
                                                                        <div className="d-flex gap-2 align-items-center">
                                                                            <Button 
                                                                                color="link" 
                                                                                size="sm" 
                                                                                className="p-0 text-decoration-none fs-12 fw-medium"
                                                                                onClick={() => {
                                                                                    if (replyingToId === fb.id) {
                                                                                        setReplyingToId(null);
                                                                                    } else {
                                                                                        setReplyingToId(fb.id);
                                                                                        setExplanationContent(fb.explanation || '');
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <i className="ri-reply-line me-1"></i> Phản hồi
                                                                            </Button>
                                                                            <Button 
                                                                                color="link" 
                                                                                size="sm" 
                                                                                className="p-0 text-decoration-none fs-12 fw-medium text-info"
                                                                                onClick={() => {
                                                                                    setReplyingToId(fb.id);
                                                                                    handleAISuggestForID(fb);
                                                                                }}
                                                                                disabled={isSuggestingAI}
                                                                            >
                                                                                <i className="ri-magic-line me-1"></i> AI Gợi ý
                                                                            </Button>
                                                                            <Button 
                                                                                color="link" 
                                                                                size="sm" 
                                                                                className="p-0 text-decoration-none fs-12 fw-medium text-warning"
                                                                                onClick={() => handleOpenReassignModal(fb)}
                                                                            >
                                                                                <i className="ri-drag-move-line me-1"></i> Gắn lại
                                                                            </Button>
                                                                            <Button 
                                                                                color="link" 
                                                                                size="sm" 
                                                                                className="p-0 text-decoration-none fs-12 fw-medium text-danger"
                                                                                onClick={() => handleEditFeedback(fb)}
                                                                            >
                                                                                <i className="ri-edit-2-line me-1"></i> Sửa
                                                                            </Button>
                                                                            <span className={`badge ${fb.status === 'approved' ? 'bg-success-subtle text-success' : fb.status === 'reviewed' ? 'bg-info-subtle text-info' : 'bg-warning-subtle text-warning'} ms-auto fs-10`}>
                                                                                {fb.status === 'approved' ? 'Đã duyệt' : fb.status === 'reviewed' ? 'Đã thẩm định' : 'Chờ xử lý'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Inline Input (If replying) */}
                                                            {replyingToId === fb.id && (
                                                                <div className="ms-5 mb-3 mt-1">
                                                                    <Input
                                                                        type="textarea"
                                                                        rows={2}
                                                                        className="form-control form-control-sm border-info-subtle shadow-sm mb-2"
                                                                        placeholder="Nhập nội dung giải tiếp thu/giải trình..."
                                                                        value={explanationContent}
                                                                        onChange={(e) => setExplanationContent(e.target.value)}
                                                                        autoFocus
                                                                    />
                                                                    <div className="d-flex gap-2">
                                                                        <Button 
                                                                            color="primary" 
                                                                            size="sm" 
                                                                            className="px-3"
                                                                            onClick={() => handleSaveExplanationForID(fb.id)}
                                                                            disabled={savingExplanation}
                                                                        >
                                                                            {savingExplanation ? <Spinner size="sm"/> : "Lưu giải trình"}
                                                                        </Button>
                                                                        <Button color="light" size="sm" onClick={() => setReplyingToId(null)}>Hủy</Button>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Explanation Bubble (The "Reply") - If exists */}
                                                            {fb.explanation && replyingToId !== fb.id && (
                                                                <div className="d-flex justify-content-end mt-1">
                                                                    <div className="card border-0 mb-0 shadow-xs bg-light-subtle rounded-3" style={{ maxWidth: '85%', borderRadius: '15px 15px 2px 15px' }}>
                                                                        <div className="card-body p-3">
                                                                            <div className="d-flex align-items-center mb-1">
                                                                                <i className="ri-shield-user-line text-info me-1 fs-12"></i>
                                                                                <span className="fw-bold fs-11 text-uppercase text-info">Cơ quan soạn thảo</span>
                                                                            </div>
                                                                            <p className="fs-13 mb-0 text-muted lh-base">
                                                                                {fb.explanation}
                                                                            </p>
                                                                            <div className="mt-2 text-end">
                                                                                <Button 
                                                                                    color="link" 
                                                                                    size="sm" 
                                                                                    className="p-0 text-decoration-none fs-11 text-muted"
                                                                                    onClick={() => {
                                                                                        setReplyingToId(fb.id);
                                                                                        setExplanationContent(fb.explanation);
                                                                                    }}
                                                                                >
                                                                                    Sửa giải trình
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center text-muted py-5 fs-14 bg-card rounded border-dashed border">
                                                    <i className="ri-chat-off-line fs-24 d-block mb-2 opacity-25"></i>
                                                    Không có ý kiến cho mục này.
                                                </div>
                                            )}
                                        </SimpleBar>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                        
                    </Row>
                </Container>
            </div>

            {/* Manual Feedback Modal */}
            <div className={`modal fade ${showFeedbackModal ? 'show d-block' : ''}`} tabIndex="-1" style={{ background: showFeedbackModal ? 'rgba(0,0,0,0.5)' : 'none' }}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content border-0 shadow">
                        <div className="modal-header bg-primary p-3">
                            <h5 className="modal-title text-white">Thêm góp ý mới</h5>
                            <button type="button" className="btn-close btn-close-white" onClick={() => setShowFeedbackModal(false)}></button>
                        </div>
                        <div className="modal-body p-4">
                            {selectedNode || selectedAppendix ? (
                                <p className="text-muted mb-4 fs-13">
                                    Góp ý cho: <span className="fw-bold text-primary">{selectedNode?.node_label || selectedAppendix?.name}</span>
                                </p>
                            ) : null}
                            <div className="mb-3">
                                <label className="form-label fw-bold small">Cơ quan góp ý</label>
                                <CreatableSelect
                                    isClearable
                                    options={agencies}
                                    styles={selectStyles}
                                    value={newFeedbackData.agency}
                                    onChange={(newValue) => {
                                        if (newValue && newValue.__isNew__) {
                                            setNewAgencyName(newValue.label);
                                            setAgencyModal(true);
                                            // Bridge the choice to newFeedbackData after potential modal save
                                            // Handle this in handleQuickAgencySave or set it here
                                            setNewFeedbackData({ ...newFeedbackData, agency: newValue });
                                        } else {
                                            setNewFeedbackData({ ...newFeedbackData, agency: newValue });
                                        }
                                    }}
                                    placeholder="Chọn hoặc gõ tên đơn vị mới..."
                                    formatCreateLabel={(inputValue) => `Thêm nhanh đơn vị: "${inputValue}"`}
                                />
                            </div>
                            <div className="mb-0">
                                <label className="form-label fw-bold small">Nội dung góp ý</label>
                                <Input 
                                    type="textarea" 
                                    rows={5} 
                                    className="form-control" 
                                    placeholder="Nhập nội dung góp ý chi tiết..." 
                                    value={newFeedbackData.content}
                                    onChange={(e) => setNewFeedbackData({ ...newFeedbackData, content: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="modal-footer bg-light p-3">
                            <Button color="light" onClick={() => setShowFeedbackModal(false)}>Hủy</Button>
                            <Button color="primary" onClick={handleSaveNewFeedback}>Lưu góp ý</Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reassign Node Modal */}
            <Modal isOpen={isReassignModalOpen} toggle={() => setIsReassignModalOpen(!isReassignModalOpen)} centered>
                <ModalHeader toggle={() => setIsReassignModalOpen(!isReassignModalOpen)} className="bg-warning-subtle text-warning">
                    <i className="ri-drag-move-line align-bottom me-1"></i> Chuyển Điều khoản góp ý
                </ModalHeader>
                <ModalBody>
                    <p className="fs-13 text-muted mb-3">
                        Bạn đang chuyển nội dung góp ý của <strong>{feedbackToReassign?.contributing_agency}</strong> sang một điều khoản khác.
                    </p>
                    <div className="mb-3">
                        <label className="form-label fw-bold small">Chọn Điều/Khoản đích</label>
                        <select 
                            className="form-select" 
                            value={targetNodeId} 
                            onChange={(e) => setTargetNodeId(e.target.value)}
                        >
                            <option value="">-- Chọn Điều/Khoản --</option>
                            {nodeOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="light" onClick={() => setIsReassignModalOpen(false)}>Hủy</Button>
                    <Button color="warning" onClick={handleReassignFeedback} disabled={reassigning || !targetNodeId}>
                        {reassigning ? <Spinner size="sm"/> : "Xác nhận chuyển"}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Edit Feedback Modal */}
            <Modal id="editFeedbackModal" isOpen={isEditModalOpen} toggle={() => setIsEditModalOpen(!isEditModalOpen)} centered size="lg">
                <ModalHeader className="bg-light p-3" toggle={() => setIsEditModalOpen(!isEditModalOpen)}>
                    <i className="ri-edit-box-line align-bottom me-1"></i> Chỉnh sửa & Gắn lại Góp ý
                </ModalHeader>
                <ModalBody>
                    <Row className="g-3">
                        <Col lg={12}>
                            <Label className="form-label fw-bold small text-muted text-uppercase">Gán lại vào Điều/Khoản:</Label>
                            <select 
                                className={`form-select ${validationErrors.node ? 'is-invalid' : ''}`}
                                value={editNodeId}
                                onChange={(e) => setEditNodeId(e.target.value)}
                            >
                                <option value="">-- Chọn vị trí mới --</option>
                                {nodeOptions.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                ))}
                            </select>
                            {validationErrors.node && <FormFeedback>{validationErrors.node[0]}</FormFeedback>}
                        </Col>
                        
                        <Col lg={8}>
                            <Label className="form-label fw-bold small text-muted text-uppercase">Cơ quan góp ý:</Label>
                            <CreatableSelect
                                isClearable
                                options={agencies}
                                styles={selectStyles}
                                value={editAgencyId}
                                onChange={(newValue) => {
                                    if (newValue && newValue.__isNew__) {
                                        setNewAgencyName(newValue.label);
                                        setAgencyModal(true);
                                    } else {
                                        setEditAgencyId(newValue);
                                    }
                                }}
                                placeholder="Chọn hoặc gõ tên đơn vị mới..."
                                formatCreateLabel={(inputValue) => `Thêm nhanh đơn vị: "${inputValue}"`}
                            />
                        </Col>
                        
                        <Col lg={4}>
                            <Label className="form-label fw-bold small text-muted text-uppercase">Số hiệu CV:</Label>
                            <Input 
                                type="text" 
                                className={validationErrors.official_doc_number ? 'is-invalid' : ''}
                                placeholder="Số hiệu CV..." 
                                value={editDocNumber}
                                onChange={(e) => setEditDocNumber(e.target.value)}
                            />
                            {validationErrors.official_doc_number && <FormFeedback>{validationErrors.official_doc_number[0]}</FormFeedback>}
                        </Col>
                        
                        <Col lg={12}>
                            <Label className="form-label fw-bold small text-muted text-uppercase">Nội dung góp ý gốc:</Label>
                            <Input
                                type="textarea"
                                rows={6}
                                className={validationErrors.content ? 'is-invalid' : ''}
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                            />
                            {validationErrors.content && <FormFeedback>{validationErrors.content[0]}</FormFeedback>}
                        </Col>
                    </Row>
                </ModalBody>
                <ModalFooter className="bg-light">
                    <Button color="link" className="link-success fw-medium shadow-none" onClick={() => setIsEditModalOpen(false)}>Hủy bỏ</Button>
                    <Button color="warning" onClick={saveFeedbackEdit} disabled={isSavingEdit}>
                        {isSavingEdit ? <Spinner size="sm"/> : <><i className="ri-save-line align-bottom me-1"></i> Lưu thay đổi</>}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Quick Add Agency Modal */}
            <Modal isOpen={agencyModal} toggle={() => setAgencyModal(false)} centered>
                <ModalHeader toggle={() => setAgencyModal(false)}>Thêm nhanh đơn vị mới</ModalHeader>
                <ModalBody>
                    <div className="mb-3">
                        <Label>Tên đơn vị</Label>
                        <Input value={newAgencyName} onChange={(e) => setNewAgencyName(e.target.value)} />
                    </div>
                    <div className="mb-3">
                        <Label>Phân loại đơn vị</Label>
                        <CreatableSelect
                            isClearable
                            options={categories}
                            styles={selectStyles}
                            value={newAgencyCategory}
                            onChange={(v) => setNewAgencyCategory(v)}
                            placeholder="Chọn hoặc tạo phân loại..."
                        />
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="light" onClick={() => setAgencyModal(false)}>Hủy</Button>
                    <Button color="primary" onClick={handleQuickAgencySave} disabled={addingAgency || !newAgencyName}>
                        {addingAgency ? <Spinner size="sm" /> : "Lưu đơn vị"}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Add Appendix Modal */}
            <Modal isOpen={showAppendixModal} toggle={() => setShowAppendixModal(!showAppendixModal)} centered size="lg">
                <ModalHeader toggle={() => setShowAppendixModal(!showAppendixModal)} className="bg-primary text-white">
                    <i className="ri-file-add-line align-bottom me-1"></i> Thêm Phụ lục mới
                </ModalHeader>
                <ModalBody>
                    <div className="mb-3">
                        <Label className="fw-bold fs-13 text-muted text-uppercase">Hình thức bổ sung</Label>
                        <div className="d-flex gap-4 mt-2 p-3 bg-light rounded-3 border">
                            <div className="form-check custom-radio">
                                <Input className="form-check-input" type="radio" name="appType" id="typeText" checked={appendixType === 'text'} onChange={() => {
                                    setAppendixType('text');
                                    setParsedAppendices([]);
                                }} />
                                <Label className="form-check-label fw-medium" for="typeText">Nhập văn bản thủ công</Label>
                            </div>
                            <div className="form-check custom-radio">
                                <Input className="form-check-input" type="radio" name="appType" id="typeFile" checked={appendixType === 'file'} onChange={() => setAppendixType('file')} />
                                <Label className="form-check-label fw-medium" for="typeFile">Đính kèm tệp tin (.docx)</Label>
                            </div>
                        </div>
                    </div>

                    {appendixType === 'text' ? (
                        <>
                            <div className="mb-3">
                                <Label className="fw-bold">Tên phụ lục</Label>
                                <Input 
                                    value={newAppendixData.name} 
                                    onChange={(e) => setNewAppendixData({ ...newAppendixData, name: e.target.value })} 
                                    placeholder="Ví dụ: Phụ lục I - Danh mục chi tiết..."
                                />
                            </div>
                            <div className="mb-3">
                                <Label className="fw-bold">Nội dung phụ lục</Label>
                                <Input 
                                    type="textarea" 
                                    rows={10} 
                                    value={newAppendixData.content} 
                                    onChange={(e) => setNewAppendixData({ ...newAppendixData, content: e.target.value })} 
                                    placeholder="Nhập nội dung phụ lục tại đây..."
                                />
                            </div>
                        </>
                    ) : (
                        <div className="mb-3">
                            <div className="p-4 border-2 border-dashed rounded-3 text-center bg-light mb-3">
                                <i className="ri-upload-cloud-2-line fs-1 display-5 text-muted mb-2"></i>
                                <h5 className="fs-14">Chọn tệp văn bản Phụ lục</h5>
                                <p className="text-muted fs-12">Hệ thống sẽ tự động tách các Phụ lục trong tệp</p>
                                <Input 
                                    type="file" 
                                    accept=".docx"
                                    className="d-none"
                                    id="appendix-file-upload"
                                    onChange={(e) => handleFilePreview(e.target.files[0])} 
                                />
                                <label size="sm" className="btn btn-primary mt-2" htmlFor="appendix-file-upload">
                                    <i className="ri-file-search-line align-bottom me-1"></i> Chọn tệp .docx
                                </label>
                            </div>

                            {isParsing && (
                                <div className="text-center my-4">
                                    <Spinner size="sm" className="me-2" />
                                    <span className="text-muted">Đang phân tích cấu trúc file...</span>
                                </div>
                            )}

                            {parsedAppendices.length > 0 && (
                                <div className="mt-4">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <h6 className="fw-bold mb-0">Đề xuất trích xuất ({parsedAppendices.length})</h6>
                                        <small className="text-muted italic">Bạn có thể chỉnh sửa trước khi lưu</small>
                                    </div>
                                    <div className="table-responsive border rounded" style={{ maxHeight: '400px' }}>
                                        <table className="table table-nowrap table-hover mb-0">
                                            <thead className="table-light sticky-top">
                                                <tr>
                                                    <th style={{ width: '40px' }}>#</th>
                                                    <th>Tên phụ lục</th>
                                                    <th>Xem trước nội dung</th>
                                                    <th style={{ width: '80px' }}>Lưu?</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {parsedAppendices.map((app, idx) => (
                                                    <tr key={idx}>
                                                        <td className="align-middle">{idx + 1}</td>
                                                        <td>
                                                            <Input 
                                                                size="sm" 
                                                                value={app.name} 
                                                                onChange={(e) => {
                                                                    const newList = [...parsedAppendices];
                                                                    newList[idx].name = e.target.value;
                                                                    setParsedAppendices(newList);
                                                                }}
                                                            />
                                                        </td>
                                                        <td>
                                                            <Input 
                                                                type="textarea"
                                                                rows={1}
                                                                size="sm"
                                                                style={{ fontSize: '11px' }}
                                                                value={app.content}
                                                                onChange={(e) => {
                                                                    const newList = [...parsedAppendices];
                                                                    newList[idx].content = e.target.value;
                                                                    setParsedAppendices(newList);
                                                                }}
                                                            />
                                                        </td>
                                                        <td className="text-center align-middle">
                                                            <div className="form-check form-switch form-switch-right">
                                                                <Input 
                                                                    className="form-check-input" 
                                                                    type="checkbox" 
                                                                    checked={app.selected}
                                                                    onChange={(e) => {
                                                                        const newList = [...parsedAppendices];
                                                                        newList[idx].selected = e.target.checked;
                                                                        setParsedAppendices(newList);
                                                                    }}
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </ModalBody>
                <ModalFooter className="bg-light">
                    <Button color="link" className="link-danger fw-medium shadow-none" onClick={() => setShowAppendixModal(false)}>Hủy</Button>
                    {appendixType === 'text' ? (
                        <Button color="primary" onClick={handleSaveAppendix} disabled={isSavingAppendix}>
                            {isSavingAppendix ? <Spinner size="sm"/> : "Lưu phụ lục"}
                        </Button>
                    ) : (
                        <Button color="success" onClick={handleSaveBulkAppendices} disabled={isSavingAppendix || parsedAppendices.length === 0}>
                            {isSavingAppendix ? <Spinner size="sm"/> : `Lưu ${parsedAppendices.filter(a => a.selected).length} phụ lục`}
                        </Button>
                    )}
                </ModalFooter>
            </Modal>

            {/* Add Node Modal */}
            <Modal isOpen={showAddNodeModal} toggle={() => setShowAddNodeModal(!showAddNodeModal)} centered>
                <ModalHeader toggle={() => setShowAddNodeModal(!showAddNodeModal)} className="bg-info text-white">
                    <i className="ri-add-circle-line align-bottom me-1"></i> Thêm Tiết/Điều/Khoản mới
                </ModalHeader>
                <ModalBody>
                    <div className="mb-3">
                        <Label className="fw-bold">Loại nội dung</Label>
                        <select className="form-select" value={newNodeData.node_type} onChange={(e) => setNewNodeData({ ...newNodeData, node_type: e.target.value })}>
                            <option value="Chương">Chương</option>
                            <option value="Điều">Điều</option>
                            <option value="Khoản">Khoản</option>
                            <option value="Điểm">Điểm</option>
                            <option value="Phụ lục">Phụ lục (trong văn bản)</option>
                            <option value="Vấn đề khác">Vấn đề khác</option>
                        </select>
                    </div>
                    <div className="mb-3">
                        <Label className="fw-bold">Nhãn (Tiêu đề ngắn)</Label>
                        <Input value={newNodeData.node_label} onChange={(e) => setNewNodeData({ ...newNodeData, node_label: e.target.value })} placeholder="VD: Điều 12, Khoản 3..." />
                    </div>
                    <div className="mb-3">
                        <Label className="fw-bold">Nội dung</Label>
                        <Input type="textarea" rows={5} value={newNodeData.content} onChange={(e) => setNewNodeData({ ...newNodeData, content: e.target.value })} placeholder="Nhập nội dung chi tiết..." />
                    </div>
                    <div className="mb-3">
                        <Label className="fw-bold">Gắn vào mục cấp trên (nếu có)</Label>
                        <select className="form-select" value={newNodeData.parent_id || ""} onChange={(e) => setNewNodeData({ ...newNodeData, parent_id: e.target.value || null })}>
                            <option value="">-- Cấp gốc (Không có cha) --</option>
                            {nodeOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="light" onClick={() => setShowAddNodeModal(false)}>Hủy</Button>
                    <Button color="info" onClick={handleAddNode} disabled={isAddingNode}>
                        {isAddingNode ? <Spinner size="sm"/> : "Xác nhận thêm"}
                    </Button>
                </ModalFooter>
            </Modal>
            <ToastContainer />

            {/* Import Feedback Modal */}
            <ImportFeedbackModal 
                show={showImportModal} 
                onHide={() => setShowImportModal(false)} 
                documentId={id} 
                onImportSuccess={() => {
                    if (selectedNode) fetchFeedbacks(selectedNode.id);
                    else if (selectedAppendix) fetchAppendicesFeedbacks(selectedAppendix.id);
                    fetchStructure();
                }}
            />
        </React.Fragment>
    );
};

export default DocumentDetails;
