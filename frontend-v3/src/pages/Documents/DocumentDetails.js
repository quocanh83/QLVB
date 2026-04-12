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
// Modern UI Components
import { 
    ModernCard, ModernTable, ModernBadge, ModernButton, 
    ModernHeader, ModernStatWidget, ModernSearchBox 
} from '../../Components/Common/ModernUI';
import DeleteModal from "../../Components/Common/DeleteModal";
import ImportFeedbackModal from "./ImportFeedbackModal";

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
            const initialData = { [selectedNode.id]: { content: selectedNode.content || '', label: selectedNode.node_label || '' } };
            if (selectedNode.children) {
                selectedNode.children.forEach(child => {
                    initialData[child.id] = { content: child.content || '', label: child.node_label || '' };
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
            setEditedNodesData({ [selectedAppendix.id]: { content: selectedAppendix.content || '', name: selectedAppendix.name || '' } });
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
            const updatePromises = Object.entries(editedNodesData).map(([id, data]) => {
                const originalNode = id === selectedNode.id.toString() 
                    ? selectedNode 
                    : selectedNode.children?.find(c => c.id.toString() === id);
                
                if (data.content !== originalNode?.content || data.label !== originalNode?.node_label) {
                    return axios.patch(`/api/documents/nodes/${id}/`, { 
                        content: data.content,
                        node_label: data.label 
                    }, getAuthHeader());
                }
                return null;
            }).filter(p => p !== null);

            if (updatePromises.length > 0) {
                await Promise.all(updatePromises);
                toast.success("Cập nhật nội dung thành công!");
                fetchStructure();
                
                // Update selected node locally
                const newMain = editedNodesData[selectedNode.id] || { content: selectedNode.content, label: selectedNode.node_label };
                const newChildren = selectedNode.children?.map(child => {
                    const editData = editedNodesData[child.id];
                    return editData ? { ...child, content: editData.content, node_label: editData.label } : child;
                });
                
                setSelectedNode({ 
                    ...selectedNode, 
                    content: newMain.content, 
                    node_label: newMain.label,
                    children: newChildren 
                });
            }
            setIsEditingNode(false);
        } catch (err) {
            toast.error("Lỗi cập nhật nội dung.");
        }
    };

    const handleSaveAppendixTextContent = async () => {
        if (!selectedAppendix) return;
        try {
            const data = editedNodesData[selectedAppendix.id];
            await axios.patch(`/api/documents/appendices/${selectedAppendix.id}/`, { 
                content: data.content,
                name: data.name || data.label // Dùng label hoặc name tùy theo key được gán
            }, getAuthHeader());
            
            toast.success("Cập nhật phụ lục thành công!");
            setSelectedAppendix({ 
                ...selectedAppendix, 
                content: data.content,
                name: data.name || data.label
            });
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
            const link = window.document.createElement('a');
            link.href = blobUrl;
            
            const filename = `Bao_cao_Mau_10_${document.id}.docx`;
            link.setAttribute('download', filename);
            window.document.body.appendChild(link);
            link.click();
            
            setTimeout(() => {
                if (window.document.body.contains(link)) window.document.body.removeChild(link);
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
            const isActive = selectedNode?.id === node.id;

            return (
                <div key={node.id} style={{ marginLeft: depth > 0 ? '12px' : '0' }}>
                    <div 
                        className={`modern-list-item ${isActive ? 'active' : ''} ${hasChildren ? 'has-children' : ''}`}
                        onClick={() => {
                            setSelectedNode(node);
                            setSelectedAppendix(null);
                            if (node.node_type === 'Điều') {
                                setExpandedNodeId(isExpanded ? null : node.id);
                            }
                        }}
                    >
                        <div className="d-flex align-items-center overflow-hidden flex-grow-1">
                            {hasChildren && (
                                <i 
                                    className={`ri-arrow-${isExpanded ? 'down' : 'right'}-s-line me-1 cursor-pointer toggle-icon`}
                                ></i>
                            )}
                            {!hasChildren && <div style={{ width: '1.2rem' }}></div>}
                            <div className="node-content-wrapper text-truncate">
                                <span className="node-type-label text-uppercase">{node.node_type} {node.node_label.replace(node.node_type, '').trim()}</span>
                                <span className="node-preview ms-1 opacity-50 text-truncate">{(node.content || "").substring(0, 40)}</span>
                            </div>
                        </div>
                        
                        {(node.total_feedbacks > 0) && (
                            <span className={`modern-counter-badge ${node.resolved_feedbacks === node.total_feedbacks ? 'success' : 'warning shadow-neon'}`}>
                                {node.resolved_feedbacks}/{node.total_feedbacks}
                            </span>
                        )}
                    </div>
                    {hasChildren && isExpanded && (
                        <div className="tree-branch-container">
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
            <div className="designkit-wrapper designkit-layout-root">
                <div className="modern-page-content" style={{ padding: 0, height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>
                    <Container fluid className="h-100 d-flex flex-column px-0 pb-1">
                    
                        <ModernHeader 
                            title={document?.project_name || "Chi tiết Văn bản"} 
                            subtitle={document?.drafting_agency}
                            showBack={true}
                            onBack={() => window.history.back()}
                            actions={
                                <div className="d-flex gap-2">
                                    <Link to={`/documents/${id}/classification`} className="decoration-none">
                                        <ModernButton variant="info-ghost" size="sm">
                                            <i className="ri-table-line align-bottom me-1"></i> Bảng theo dõi
                                        </ModernButton>
                                    </Link>
                                    <ModernButton variant="primary" size="sm" onClick={handleExportMau10}>
                                        <i className="ri-file-word-2-line align-bottom me-1"></i> Xuất Mẫu 10
                                    </ModernButton>
                                    <ModernButton variant="ghost" size="sm" onClick={() => fetchStructure()}>
                                        <i className="ri-refresh-line"></i>
                                    </ModernButton>
                                </div>
                            }
                        />

                        <Row className="workspace-pane-layout flex-grow-1 overflow-hidden gx-0">
                            
                            {/* LEFT PANE: NAVIGATION (25%) */}
                            <Col lg={3} xl={2} className="pane-sidebar h-100 d-flex flex-column border-end border-white-5 bg-black-20">
                                <div className="pane-header p-3 border-bottom border-white-5">
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <h6 className="pane-title mb-0">
                                            <i className="ri-node-tree text-primary me-2"></i>Cấu trúc Dự thảo
                                        </h6>
                                        <ModernButton variant="ghost" size="sm" className="btn-icon p-0" onClick={() => setShowAddNodeModal(true)}>
                                            <i className="ri-add-line fs-18"></i>
                                        </ModernButton>
                                    </div>
                                    <div className="modern-filter-stack gap-2">
                                        <ModernSearchBox 
                                            placeholder="Tìm kiếm..." 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            size="sm"
                                        />
                                        <div className="modern-select-compact">
                                            <select 
                                                className="form-select form-select-sm"
                                                value={filterType}
                                                onChange={(e) => setFilterType(e.target.value)}
                                            >
                                                <option value="all">Tất cả nội dung</option>
                                                <option value="has_feedback">Mục có góp ý</option>
                                                <option value="unresolved">Chưa giải trình</option>
                                                <option value="resolved">Đã xong</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="pane-body flex-grow-1 overflow-hidden">
                                    <SimpleBar style={{ height: '100%' }} className="px-2 py-3">
                                        {loadingStructure ? (
                                            <div className="text-center py-5"><Spinner size="sm" color="primary" /></div>
                                        ) : filteredStructure.length > 0 ? (
                                            <div className="tree-explorer">
                                                {renderNodeTree(filteredStructure)}
                                                
                                                {/* Appendices Section */}
                                                <div className="mt-4 pt-3 border-top border-white-10">
                                                    <div className="d-flex justify-content-between align-items-center mb-2 px-2">
                                                        <h6 className="xsmall text-uppercase fw-800 tracking-wider text-white-40 mb-0">Phụ lục kèm theo</h6>
                                                        <button className="btn btn-sm btn-link text-primary p-0" onClick={() => setShowAppendixModal(true)}>
                                                            <i className="ri-add-line"></i>
                                                        </button>
                                                    </div>
                                                    <div className="appendix-list">
                                                        {loadingAppendices ? <div className="text-center"><Spinner size="sm"/></div> : appendices.length > 0 ? (
                                                            appendices.map(app => (
                                                                <div key={app.id} className={`modern-list-item ${selectedAppendix?.id === app.id ? 'active' : ''}`} onClick={() => {
                                                                    setSelectedAppendix(app);
                                                                    setSelectedNode(null);
                                                                    fetchAppendicesFeedbacks(app.id);
                                                                }}>
                                                                    <div className="d-flex align-items-center overflow-hidden flex-grow-1">
                                                                        <i className={`ri-${app.file ? 'file-word-2' : 'file-text'} ${selectedAppendix?.id === app.id ? 'text-primary' : 'text-white-40'} me-2`}></i>
                                                                        <span className="node-content text-truncate">{app.name}</span>
                                                                    </div>
                                                                    <button className="action-btn text-danger opacity-0" onClick={(e) => { e.stopPropagation(); handleDeleteAppendix(app.id); }}>
                                                                        <i className="ri-delete-bin-line"></i>
                                                                    </button>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="text-center text-muted xsmall py-3 opacity-40 italic">Chưa có phụ lục</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="modern-empty-state mini">
                                                <i className="ri-search-line mb-2"></i>
                                                <p className="xsmall text-white-40">Không tìm thấy</p>
                                            </div>
                                        )}
                                    </SimpleBar>
                                </div>
                            </Col>

                            {/* MIDDLE PANE: CONTENT EDITOR (40%) */}
                            <Col lg={5} xl={6} className="pane-content h-100 d-flex flex-column border-end border-white-5 bg-black-10">
                                <div className="pane-header p-3 border-bottom border-white-5 d-flex align-items-center justify-content-between bg-black-20">
                                    <h6 className="pane-title mb-0 text-truncate">
                                        <i className="ri-file-list-3-line text-primary me-2"></i>Nội dung Chi tiết
                                    </h6>
                                    {selectedNode && (
                                        <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                            <span className="modern-badge soft-primary text-uppercase xsmall tracking-wider px-2 py-1">
                                                {selectedNode.node_type}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="pane-body flex-grow-1 overflow-hidden">
                                    <SimpleBar style={{ height: '100%' }} className="p-4">
                                        {selectedAppendix ? (
                                            <div className="modern-content-view">
                                                <div className="content-meta-header mb-4 p-3 rounded-3 bg-white-5 border border-white-10">
                                                    <div className="d-flex justify-content-between align-items-start gap-3">
                                                        <div className="overflow-hidden">
                                                            <h4 className="fw-900 mb-1 text-white tracking-tight text-truncate">{selectedAppendix.name}</h4>
                                                            <span className="text-primary-subtle fs-11 text-uppercase fw-bold tracking-widest">Phụ lục đính kèm</span>
                                                        </div>
                                                        <div className="d-flex gap-2 flex-shrink-0">
                                                            {!selectedAppendix.file && (
                                                                !isEditingNode ? (
                                                                    <ModernButton variant="ghost" size="sm" onClick={() => setIsEditingNode(true)}>
                                                                        <i className="ri-pencil-line me-1"></i> Sửa
                                                                    </ModernButton>
                                                                ) : (
                                                                    <div className="d-flex gap-2">
                                                                        <ModernButton variant="primary" size="sm" onClick={handleSaveNodeContent}>Lưu</ModernButton>
                                                                        <ModernButton variant="ghost" size="sm" onClick={() => setIsEditingNode(false)}>Hủy</ModernButton>
                                                                    </div>
                                                                )
                                                            )}
                                                            {selectedAppendix.file && (
                                                                <ModernButton variant="primary" size="sm" onClick={() => window.open(selectedAppendix.file, "_blank")}>
                                                                    <i className="ri-download-2-line me-1"></i> Tải file
                                                                </ModernButton>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="content-body-area fs-15 text-white-85 lh-lg">
                                                    {isEditingNode ? (
                                                        <div className="modern-editor-container">
                                                            <div className="mb-4">
                                                                <label className="xsmall text-uppercase fw-800 text-white-40 mb-2">Tên phụ lục</label>
                                                                <Input 
                                                                    type="text"
                                                                    className="modern-input fw-900 fs-18"
                                                                    value={editedNodesData[selectedAppendix.id]?.name || ''}
                                                                    onChange={(e) => setEditedNodesData({ 
                                                                        ...editedNodesData, 
                                                                        [selectedAppendix.id]: { ...editedNodesData[selectedAppendix.id], name: e.target.value } 
                                                                    })}
                                                                />
                                                            </div>
                                                            <div className="mb-3">
                                                                <label className="xsmall text-uppercase fw-800 text-white-40 mb-2">Nội dung</label>
                                                                <Input 
                                                                    type="textarea" 
                                                                    rows={20} 
                                                                    className="modern-input fs-14" 
                                                                    value={editedNodesData[selectedAppendix.id]?.content || ''} 
                                                                    onChange={(e) => setEditedNodesData({ 
                                                                        ...editedNodesData, 
                                                                        [selectedAppendix.id]: { ...editedNodesData[selectedAppendix.id], content: e.target.value } 
                                                                    })}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        selectedAppendix.file ? (
                                                            <div className="modern-file-placeholder py-5 text-center bg-white-5 rounded-4 border border-white-5">
                                                                <div className="placeholder-icon mb-3">
                                                                    <i className="ri-file-word-2-fill text-primary display-4"></i>
                                                                </div>
                                                                <h5 className="fw-900 text-white">{selectedAppendix.name}</h5>
                                                                <p className="text-white-40 mb-4 px-5">Tệp tin Word đính kèm.</p>
                                                                <ModernButton variant="primary" className="rounded-pill px-4" onClick={() => window.open(selectedAppendix.file, "_blank")}>
                                                                    <i className="ri-external-link-line me-2"></i>Mở tệp
                                                                </ModernButton>
                                                            </div>
                                                        ) : (
                                                            <div className="document-text-render px-2" style={{ whiteSpace: 'pre-wrap' }}>
                                                                {selectedAppendix.content || <em className="text-white-20 italic">Văn bản chưa có nội dung.</em>}
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        ) : selectedNode ? (
                                            <div className="modern-content-view">
                                                <div className="content-meta-header mb-4 p-3 rounded-3 bg-white-5 border border-white-10">
                                                    <div className="d-flex justify-content-between align-items-center gap-3">
                                                        <h5 className="fw-900 mb-0 text-white tracking-tight text-truncate">
                                                            {(() => {
                                                                const nodeLabel = (selectedNode.node_label || "").trim();
                                                                const firstLine = (selectedNode.content || "").split('\n')[0].trim();
                                                                const normalize = (s) => s.toLowerCase().replace(/[:.\s]/g, '');
                                                                if (normalize(firstLine).startsWith(normalize(nodeLabel))) return firstLine;
                                                                return `${nodeLabel}${firstLine ? ': ' + firstLine : ''}`;
                                                            })()}
                                                        </h5>
                                                        <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                                            {!isEditingNode ? (
                                                                <ModernButton variant="ghost" size="sm" className="btn-icon rounded-circle" onClick={() => setIsEditingNode(true)}>
                                                                    <i className="ri-pencil-line"></i>
                                                                </ModernButton>
                                                            ) : (
                                                                <div className="d-flex gap-2">
                                                                    <ModernButton variant="primary" size="sm" onClick={handleSaveNodeContent}>Lưu</ModernButton>
                                                                    <ModernButton variant="ghost" size="sm" onClick={() => setIsEditingNode(false)}>Hủy</ModernButton>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="content-body-area">
                                                    {isEditingNode ? (
                                                        <div className="modern-editor-container">
                                                            <div className="mb-4 pb-4 border-bottom border-white-10">
                                                                <div className="row g-3 mb-3">
                                                                    <div className="col-md-4">
                                                                        <label className="xsmall text-uppercase fw-800 text-white-40 mb-2">Nhãn:</label>
                                                                        <Input 
                                                                            type="text"
                                                                            className="modern-input fw-bold"
                                                                            value={editedNodesData[selectedNode.id]?.label || ''}
                                                                            onChange={(e) => setEditedNodesData({ 
                                                                                ...editedNodesData, 
                                                                                [selectedNode.id]: { ...editedNodesData[selectedNode.id], label: e.target.value } 
                                                                            })}
                                                                        />
                                                                    </div>
                                                                    <div className="col-md-8">
                                                                        <label className="xsmall text-uppercase fw-800 text-white-40 mb-2">Loại:</label>
                                                                        <div className="modern-badge soft-primary d-block py-2 text-center text-uppercase tracking-widest">{selectedNode.node_type}</div>
                                                                    </div>
                                                                </div>
                                                                <label className="xsmall text-uppercase fw-800 text-white-40 mb-2">Nội dung chính</label>
                                                                <Input 
                                                                    type="textarea" 
                                                                    rows={selectedNode.node_type === 'Điều' ? 4 : 15} 
                                                                    className="modern-input fs-14" 
                                                                    value={editedNodesData[selectedNode.id]?.content || ''} 
                                                                    onChange={(e) => setEditedNodesData({ 
                                                                        ...editedNodesData, 
                                                                        [selectedNode.id]: { ...editedNodesData[selectedNode.id], content: e.target.value } 
                                                                    })}
                                                                />
                                                            </div>

                                                            {selectedNode.node_type === 'Điều' && selectedNode.children && selectedNode.children.map(child => (
                                                                <div key={child.id} className="mb-4 p-3 bg-white-5 rounded-3 border-start border-primary border-3">
                                                                    <div className="d-flex align-items-center gap-2 mb-3">
                                                                        <span className="xsmall text-uppercase fw-900 text-primary">{child.node_type}</span>
                                                                        <Input 
                                                                            type="text"
                                                                            className="modern-input-sm w-50"
                                                                            value={editedNodesData[child.id]?.label || ''}
                                                                            onChange={(e) => setEditedNodesData({ 
                                                                                ...editedNodesData, 
                                                                                [child.id]: { ...editedNodesData[child.id], label: e.target.value } 
                                                                            })}
                                                                        />
                                                                    </div>
                                                                    <Input 
                                                                        type="textarea" 
                                                                        rows={5} 
                                                                        className="modern-input fs-13" 
                                                                        value={editedNodesData[child.id]?.content || ''} 
                                                                        onChange={(e) => setEditedNodesData({ 
                                                                            ...editedNodesData, 
                                                                            [child.id]: { ...editedNodesData[child.id], content: e.target.value } 
                                                                        })}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="document-text-render px-2 fs-15 text-white-85 lh-lg">
                                                            {selectedNode.node_type === 'Khoản' ? (
                                                                <div style={{ whiteSpace: 'pre-wrap' }}>
                                                                    <span className="text-primary fw-900 me-2 fs-18">{(selectedNode.node_label || "").replace('Khoản ', '')}.</span>
                                                                    {selectedNode.content}
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-4" style={{ whiteSpace: 'pre-wrap' }}>
                                                                    {(selectedNode.content || "").split('\n').map((line, idx) => {
                                                                        if (selectedNode.node_type === 'Điều' && idx === 0) return null;
                                                                        return <p key={idx} className="mb-4">{line}</p>;
                                                                    })}
                                                                    {selectedNode.children && selectedNode.children.map(child => (
                                                                        <div key={child.id} className="ms-4 mt-4 pb-4 border-bottom border-white-5 border-dashed">
                                                                            <div className="d-flex align-items-start gap-2">
                                                                                <span className="text-primary fw-900 fs-17 mt-1" style={{ minWidth: '24px' }}>{child.node_label.replace('Khoản ', '')}.</span>
                                                                                <span className="flex-grow-1 opacity-90">{child.content}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="modern-empty-state h-100 d-flex flex-column justify-content-center">
                                                <div className="empty-icon-circle mx-auto mb-4">
                                                    <i className="ri-article-line display-4 text-white-20"></i>
                                                </div>
                                                <h5 className="text-white fw-bold">Trình biên tập Dự thảo</h5>
                                                <p className="text-white-40 max-w-300 mx-auto">Chọn một Điều, Khoản hoặc Phụ lục từ danh sách bên trái để bắt đầu xem nội dung và xử lý góp ý.</p>
                                            </div>
                                        )}
                                    </SimpleBar>
                                </div>
                            </Col>

                            {/* RIGHT PANE: FEEDBACKS (35%) */}
                            <Col lg={4} className="pane-detail h-100 d-flex flex-column bg-black-20">
                                <div className="pane-header p-3 border-bottom border-white-5 bg-black-40">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <h6 className="pane-title mb-0">
                                            <i className="ri-discuss-line text-primary me-2"></i>Góp ý & Giải trình
                                        </h6>
                                        <div className="d-flex gap-2">
                                            <ModernBadge color="primary" variant="soft" className="px-2 py-1 fs-11">
                                                {nodeFeedbacks.length} ý kiến
                                            </ModernBadge>
                                        </div>
                                    </div>
                                    <div className="row g-2 mt-1">
                                        <div className="col-6">
                                            <ModernButton 
                                                variant="ghost" 
                                                size="sm" 
                                                className="w-100 fs-11"
                                                onClick={() => setShowImportModal(true)}
                                            >
                                                <i className="ri-file-excel-2-line me-1"></i>Nhập Excel
                                            </ModernButton>
                                        </div>
                                        <div className="col-6">
                                            <ModernButton 
                                                variant="primary" 
                                                size="sm" 
                                                className="w-100 fs-11"
                                                onClick={() => setShowFeedbackModal(true)}
                                                disabled={!selectedNode && !selectedAppendix}
                                            >
                                                <i className="ri-add-line me-1"></i>Thêm Góp ý
                                            </ModernButton>
                                        </div>
                                    </div>
                                </div>

                                <div className="pane-body flex-grow-1 overflow-hidden">
                                    <SimpleBar style={{ height: '100%' }} className="p-3">
                                        {loadingFeedbacks ? (
                                            <div className="text-center py-5"><Spinner size="sm" color="primary"/></div>
                                        ) : nodeFeedbacks.length > 0 ? (
                                            <div className="feedback-stream d-flex flex-column gap-4">
                                                {nodeFeedbacks.map(fb => (
                                                    <div key={fb.id} className="feedback-group">
                                                        {/* Agency Feedback Card */}
                                                        <div className="modern-card p-3 bg-white-5 border border-white-5 mb-2 hover-glow" style={{ borderRadius: '16px 16px 16px 4px' }}>
                                                            <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-white-10">
                                                                <div className="d-flex align-items-center gap-2 overflow-hidden">
                                                                    <div className="avatar-xs rounded-circle bg-primary-opacity d-flex align-items-center justify-content-center flex-shrink-0">
                                                                        <span className="text-primary fw-bold fs-10">{fb.contributing_agency?.charAt(0)}</span>
                                                                    </div>
                                                                    <span className="fw-900 text-white-85 fs-11 text-truncate text-uppercase tracking-wider">{fb.contributing_agency}</span>
                                                                </div>
                                                                <span className="fs-10 text-white-40">{new Date(fb.created_at).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="feedback-content mb-3">
                                                                <p className="fs-13 mb-0 text-white-90 lh-base italic">"{fb.content}"</p>
                                                            </div>
                                                            <div className="feedback-actions d-flex gap-3 align-items-center">
                                                                <button className="modern-btn-minimal" onClick={() => { setReplyingToId(fb.id === replyingToId ? null : fb.id); setExplanationContent(fb.explanation || ''); }}>
                                                                    <i className="ri-reply-line"></i> Phản hồi
                                                                </button>
                                                                <button className="modern-btn-minimal text-primary" onClick={() => { setReplyingToId(fb.id); handleAISuggestForID(fb); }} disabled={isSuggestingAI}>
                                                                    <i className={isSuggestingAI && replyingToId === fb.id ? "ri-loader-4-line spinner" : "ri-magic-line"}></i> AI
                                                                </button>
                                                                <button className="modern-btn-minimal text-warning" onClick={() => handleEditFeedback(fb)}>
                                                                    <i className="ri-edit-2-line"></i> Sửa
                                                                </button>
                                                                <div className="ms-auto">
                                                                    <ModernBadge color={fb.status === 'approved' ? 'success' : fb.status === 'reviewed' ? 'info' : 'warning'} className="rounded-pill p-1 px-2">
                                                                        {fb.status === 'approved' ? 'Hoàn thành' : 'Đang xử lý'}
                                                                    </ModernBadge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Reply/Explanation Box */}
                                                        {replyingToId === fb.id && (
                                                            <div className="reply-editor mb-3 animate-slide-down">
                                                                <div className="modern-card p-3 border-primary bg-primary-opacity shadow-neon-soft">
                                                                    <label className="xsmall text-uppercase fw-900 text-info mb-2">Soạn thảo giải trình</label>
                                                                    <Input 
                                                                        type="textarea" 
                                                                        rows={4} 
                                                                        className="modern-input fs-13 mb-3" 
                                                                        placeholder="Nhập nội dung tiếp thu/giải trình..." 
                                                                        value={explanationContent} 
                                                                        onChange={(e) => setExplanationContent(e.target.value)} 
                                                                        autoFocus 
                                                                    />
                                                                    <div className="d-flex gap-2">
                                                                        <ModernButton variant="primary" size="sm" onClick={() => handleSaveExplanationForID(fb.id)} loading={savingExplanation}>Cập nhật</ModernButton>
                                                                        <ModernButton variant="ghost" size="sm" onClick={() => setReplyingToId(null)}>Hủy bỏ</ModernButton>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Staff Explanation Card */}
                                                        {fb.explanation && replyingToId !== fb.id && (
                                                            <div className="d-flex justify-content-end animate-fade-in mb-2">
                                                                <div className="modern-card p-3 bg-success-opacity border-success-subtle shadow-sm" style={{ maxWidth: '90%', borderRadius: '16px 16px 4px 16px' }}>
                                                                    <div className="d-flex align-items-center mb-2">
                                                                        <i className="ri-shield-check-line text-success me-2 fs-14"></i>
                                                                        <span className="fw-900 fs-10 text-uppercase text-success tracking-widest">Tiếp thu / Giải trình</span>
                                                                    </div>
                                                                    <p className="fs-13 mb-2 text-white-90 lh-base">{fb.explanation}</p>
                                                                    <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top border-white-5">
                                                                        <span className="xsmall text-white-40 italic">Đã giải trình</span>
                                                                        <button className="modern-btn-minimal xsmall text-white-60" onClick={() => { setReplyingToId(fb.id); setExplanationContent(fb.explanation); }}>
                                                                            <i className="ri-edit-line me-1"></i>Sửa nhanh
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="modern-empty-state mini py-5">
                                                <div className="empty-icon-circle mx-auto mb-3">
                                                    <i className="ri-chat-off-line"></i>
                                                </div>
                                                <h6 className="text-white-60">Không có ý kiến</h6>
                                                <p className="xsmall text-white-40">Mục này hiện chưa có góp ý nào từ các đơn vị.</p>
                                                <ModernButton 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="mt-2"
                                                    onClick={() => setShowFeedbackModal(true)}
                                                    disabled={!selectedNode && !selectedAppendix}
                                                >
                                                    Thêm ý kiến đầu tiên
                                                </ModernButton>
                                            </div>
                                        )}
                                    </SimpleBar>
                                </div>
                            </Col>
                            
                        </Row>
                    </Container>

            {/* Manual Feedback Modal */}
            <Modal isOpen={showFeedbackModal} toggle={() => setShowFeedbackModal(false)} centered contentClassName="designkit-wrapper border-0">
                <div className="modern-modal-content">
                    <div className="modal-header-primary p-3 d-flex justify-content-between align-items-center">
                        <h5 className="modal-title xsmall text-uppercase fw-800 tracking-widest text-white">
                            <i className="ri-add-circle-line me-2"></i>Thêm góp ý mới
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={() => setShowFeedbackModal(false)}></button>
                    </div>
                    <div className="modal-body p-4 bg-black-20">
                        {selectedNode || selectedAppendix ? (
                            <div className="mb-4 p-3 bg-white-5 rounded-3 border border-white-10">
                                <span className="xsmall text-uppercase text-white-40 d-block mb-1">Đang góp ý cho:</span>
                                <span className="fw-bold text-primary">{selectedNode?.node_label || selectedAppendix?.name}</span>
                            </div>
                        ) : null}
                        
                        <div className="mb-3">
                            <label className="form-label xsmall text-uppercase fw-700 text-white-60">Cơ quan góp ý</label>
                            <CreatableSelect
                                isClearable
                                options={agencies}
                                styles={selectStyles}
                                value={newFeedbackData.agency}
                                onChange={(newValue) => {
                                    if (newValue && newValue.__isNew__) {
                                        setNewAgencyName(newValue.label);
                                        setAgencyModal(true);
                                        setNewFeedbackData({ ...newFeedbackData, agency: newValue });
                                    } else {
                                        setNewFeedbackData({ ...newFeedbackData, agency: newValue });
                                    }
                                }}
                                placeholder="Chọn hoặc gõ tên đơn vị..."
                                formatCreateLabel={(inputValue) => `Thêm nhanh: "${inputValue}"`}
                            />
                        </div>
                        
                        <div className="mb-0">
                            <label className="form-label xsmall text-uppercase fw-700 text-white-60">Nội dung góp ý chi tiết</label>
                            <Input 
                                type="textarea" 
                                rows={6} 
                                className="modern-input" 
                                placeholder="Nhập nội dung góp ý tại đây..." 
                                value={newFeedbackData.content}
                                onChange={(e) => setNewFeedbackData({ ...newFeedbackData, content: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="modal-footer bg-black-40 p-3 border-top border-white-10">
                        <ModernButton variant="ghost" onClick={() => setShowFeedbackModal(false)}>Hủy bỏ</ModernButton>
                        <ModernButton variant="primary" onClick={handleSaveNewFeedback}>Lưu góp ý</ModernButton>
                    </div>
                </div>
            </Modal>

            {/* Reassign Node Modal */}
            <Modal isOpen={isReassignModalOpen} toggle={() => setIsReassignModalOpen(!isReassignModalOpen)} centered contentClassName="designkit-wrapper border-0">
                <div className="modern-modal-content">
                    <div className="modal-header-warning p-3 d-flex justify-content-between align-items-center">
                        <h5 className="modal-title xsmall text-uppercase fw-800 tracking-widest text-white">
                            <i className="ri-drag-move-line me-2"></i>Chuyển Điều khoản góp ý
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={() => setIsReassignModalOpen(false)}></button>
                    </div>
                    <div className="modal-body p-4 bg-black-20">
                        <p className="xsmall text-white-60 mb-3">
                            Bạn đang chuyển góp ý của <strong className="text-info">{feedbackToReassign?.contributing_agency}</strong> sang một điều khoản khác.
                        </p>
                        <div className="mb-3">
                            <label className="form-label xsmall text-uppercase fw-700 text-white-40">Chọn Điều/Khoản đích</label>
                            <select 
                                className="form-select modern-input" 
                                value={targetNodeId} 
                                onChange={(e) => setTargetNodeId(e.target.value)}
                            >
                                <option value="">-- Chọn Điều/Khoản --</option>
                                {nodeOptions.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="modal-footer bg-black-40 p-3 border-top border-white-10">
                        <ModernButton variant="ghost" onClick={() => setIsReassignModalOpen(false)}>Hủy</ModernButton>
                        <ModernButton variant="warning" onClick={handleReassignFeedback} loading={reassigning} disabled={!targetNodeId}>
                            Xác nhận chuyển
                        </ModernButton>
                    </div>
                </div>
            </Modal>

            {/* Edit Feedback Modal */}
            <Modal id="editFeedbackModal" isOpen={isEditModalOpen} toggle={() => setIsEditModalOpen(!isEditModalOpen)} centered size="lg" contentClassName="designkit-wrapper border-0">
                <div className="modern-modal-content">
                    <div className="modal-header-warning p-3 d-flex justify-content-between align-items-center">
                        <h5 className="modal-title xsmall text-uppercase fw-800 tracking-widest text-white">
                            <i className="ri-edit-box-line me-2"></i>Chỉnh sửa & Gán lại Góp ý
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={() => setIsEditModalOpen(false)}></button>
                    </div>
                    <div className="modal-body p-4 bg-black-20">
                        <Row className="g-3">
                            <Col lg={12}>
                                <label className="form-label xsmall text-uppercase fw-700 text-white-40">Gán lại vào Điều/Khoản:</label>
                                <select 
                                    className={`form-select modern-input ${validationErrors.node ? 'is-invalid' : ''}`}
                                    value={editNodeId}
                                    onChange={(e) => setEditNodeId(e.target.value)}
                                >
                                    <option value="">-- Chọn vị trí mới --</option>
                                    {nodeOptions.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                                    ))}
                                </select>
                                {validationErrors.node && <FormFeedback className="text-danger">{validationErrors.node[0]}</FormFeedback>}
                            </Col>
                            
                            <Col lg={8}>
                                <label className="form-label xsmall text-uppercase fw-700 text-white-40">Cơ quan góp ý:</label>
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
                                <label className="form-label xsmall text-uppercase fw-700 text-white-40">Số hiệu CV:</label>
                                <Input 
                                    type="text" 
                                    className={`modern-input ${validationErrors.official_doc_number ? 'is-invalid' : ''}`}
                                    placeholder="Số hiệu CV..." 
                                    value={editDocNumber}
                                    onChange={(e) => setEditDocNumber(e.target.value)}
                                />
                                {validationErrors.official_doc_number && <FormFeedback className="text-danger">{validationErrors.official_doc_number[0]}</FormFeedback>}
                            </Col>
                            
                            <Col lg={12}>
                                <label className="form-label xsmall text-uppercase fw-700 text-white-40">Nội dung góp ý gốc:</label>
                                <Input
                                    type="textarea"
                                    rows={6}
                                    className={`modern-input ${validationErrors.content ? 'is-invalid' : ''}`}
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                />
                                {validationErrors.content && <FormFeedback className="text-danger">{validationErrors.content[0]}</FormFeedback>}
                            </Col>
                        </Row>
                    </div>
                    <div className="modal-footer bg-black-40 p-3 border-top border-white-10">
                        <ModernButton variant="ghost" onClick={() => setIsEditModalOpen(false)}>Hủy bỏ</ModernButton>
                        <ModernButton variant="warning" onClick={saveFeedbackEdit} loading={isSavingEdit}>
                            <i className="ri-save-line me-1"></i> Lưu thay đổi
                        </ModernButton>
                    </div>
                </div>
            </Modal>

            {/* Quick Add Agency Modal */}
            <Modal isOpen={agencyModal} toggle={() => setAgencyModal(false)} centered contentClassName="designkit-wrapper border-0">
                <div className="modern-modal-content">
                    <div className="modal-header-primary p-3 d-flex justify-content-between align-items-center">
                        <h5 className="modal-title xsmall text-uppercase fw-800 tracking-widest text-white">Thêm nhanh đơn vị mới</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={() => setAgencyModal(false)}></button>
                    </div>
                    <div className="modal-body p-4 bg-black-20">
                        <div className="mb-3">
                            <label className="form-label xsmall text-uppercase fw-700 text-white-40">Tên đơn vị</label>
                            <Input className="modern-input" value={newAgencyName} onChange={(e) => setNewAgencyName(e.target.value)} />
                        </div>
                        <div className="mb-3">
                            <label className="form-label xsmall text-uppercase fw-700 text-white-40">Phân loại đơn vị</label>
                            <CreatableSelect
                                isClearable
                                options={categories}
                                styles={selectStyles}
                                value={newAgencyCategory}
                                onChange={(v) => setNewAgencyCategory(v)}
                                placeholder="Chọn hoặc tạo phân loại..."
                            />
                        </div>
                    </div>
                    <div className="modal-footer bg-black-40 p-3 border-top border-white-10">
                        <ModernButton variant="ghost" onClick={() => setAgencyModal(false)}>Hủy</ModernButton>
                        <ModernButton variant="primary" onClick={handleQuickAgencySave} loading={addingAgency} disabled={!newAgencyName}>
                            Lưu đơn vị
                        </ModernButton>
                    </div>
                </div>
            </Modal>

            {/* Add Appendix Modal */}
            <Modal isOpen={showAppendixModal} toggle={() => setShowAppendixModal(!showAppendixModal)} centered size="lg" contentClassName="designkit-wrapper border-0">
                <div className="modern-modal-content">
                    <div className="modal-header-primary p-3 d-flex justify-content-between align-items-center">
                        <h5 className="modal-title xsmall text-uppercase fw-800 tracking-widest text-white">
                            <i className="ri-file-add-line me-2"></i>Thêm Phụ lục mới
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={() => setShowAppendixModal(false)}></button>
                    </div>
                    <div className="modal-body p-4 bg-black-20">
                        <div className="mb-4">
                            <label className="form-label xsmall text-uppercase fw-700 text-white-40">Hình thức bổ sung</label>
                            <div className="d-flex gap-4 mt-2 p-3 bg-white-5 rounded-3 border border-white-10">
                                <div className="form-check custom-radio">
                                    <Input className="form-check-input" type="radio" name="appType" id="typeText" checked={appendixType === 'text'} onChange={() => {
                                        setAppendixType('text');
                                        setParsedAppendices([]);
                                    }} />
                                    <label className="form-check-label fw-medium text-white-80 ms-1" htmlFor="typeText">Nhập bản văn bản</label>
                                </div>
                                <div className="form-check custom-radio">
                                    <Input className="form-check-input" type="radio" name="appType" id="typeFile" checked={appendixType === 'file'} onChange={() => setAppendixType('file')} />
                                    <label className="form-check-label fw-medium text-white-80 ms-1" htmlFor="typeFile">Đính kèm tệp (.docx)</label>
                                </div>
                            </div>
                        </div>

                        {appendixType === 'text' ? (
                            <div className="animate-fade-in">
                                <div className="mb-3">
                                    <label className="form-label xsmall text-uppercase fw-700 text-white-40">Tên phụ lục</label>
                                    <Input 
                                        className="modern-input"
                                        value={newAppendixData.name} 
                                        onChange={(e) => setNewAppendixData({ ...newAppendixData, name: e.target.value })} 
                                        placeholder="Ví dụ: Phụ lục I - Danh mục chi tiết..."
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label xsmall text-uppercase fw-700 text-white-40">Nội dung phụ lục</label>
                                    <Input 
                                        type="textarea" 
                                        rows={10} 
                                        className="modern-input"
                                        value={newAppendixData.content} 
                                        onChange={(e) => setNewAppendixData({ ...newAppendixData, content: e.target.value })} 
                                        placeholder="Nhập nội dung phụ lục tại đây..."
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="animate-fade-in">
                                <div className="p-4 border-2 border-dashed rounded-3 text-center bg-white-5 border-white-10 mb-3 modern-hover-card">
                                    <i className="ri-upload-cloud-2-line fs-1 display-5 text-primary mb-2"></i>
                                    <h5 className="fs-14 text-white">Chọn tệp văn bản Phụ lục</h5>
                                    <p className="text-white-40 xsmall">Hệ thống sẽ tự động tách các Phụ lục trong tệp</p>
                                    <Input 
                                        type="file" 
                                        accept=".docx"
                                        className="d-none"
                                        id="appendix-file-upload"
                                        onChange={(e) => handleFilePreview(e.target.files[0])} 
                                    />
                                    <label className="btn btn-primary mt-2 rounded-pill px-4" htmlFor="appendix-file-upload">
                                        <i className="ri-file-search-line align-bottom me-1"></i> Chọn tệp .docx
                                    </label>
                                </div>

                                {isParsing && (
                                    <div className="text-center my-4 animate-pulse">
                                        <Spinner size="sm" className="me-2 text-primary" />
                                        <span className="text-white-60 xsmall text-uppercase">Đang phân tích cấu trúc file...</span>
                                    </div>
                                )}

                                {parsedAppendices.length > 0 && (
                                    <div className="mt-4 animate-slide-up">
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <h6 className="xsmall text-uppercase fw-800 text-white-60 mb-0">Đề xuất trích xuất ({parsedAppendices.length})</h6>
                                        </div>
                                        <div className="table-responsive border border-white-10 rounded-3 overflow-hidden" style={{ maxHeight: '400px' }}>
                                            <table className="table modern-table-dark mb-0">
                                                <thead className="xsmall text-uppercase tracking-wider">
                                                    <tr>
                                                        <th style={{ width: '40px' }}>#</th>
                                                        <th>Tên phụ lục</th>
                                                        <th>Nội dung</th>
                                                        <th style={{ width: '80px' }}>Lưu?</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="fs-12">
                                                    {parsedAppendices.map((app, idx) => (
                                                        <tr key={idx} className="border-bottom border-white-5">
                                                            <td className="align-middle text-white-40">{idx + 1}</td>
                                                            <td>
                                                                <Input 
                                                                    className="modern-input-minimal"
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
                                                                    className="modern-input-minimal xsmall"
                                                                    value={app.content}
                                                                    onChange={(e) => {
                                                                        const newList = [...parsedAppendices];
                                                                        newList[idx].content = e.target.value;
                                                                        setParsedAppendices(newList);
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="text-center align-middle">
                                                                <div className="form-check form-switch modern-switch">
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
                    </div>
                    <div className="modal-footer bg-black-40 p-3 border-top border-white-10">
                        <ModernButton variant="ghost" onClick={() => setShowAppendixModal(false)}>Hủy</ModernButton>
                        {appendixType === 'text' ? (
                            <ModernButton variant="primary" onClick={handleSaveAppendix} loading={isSavingAppendix}>
                                Lưu phụ lục
                            </ModernButton>
                        ) : (
                            <ModernButton variant="success" onClick={handleSaveBulkAppendices} loading={isSavingAppendix} disabled={parsedAppendices.length === 0}>
                                Lưu {parsedAppendices.filter(a => a.selected).length} phụ lục
                            </ModernButton>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Add Node Modal */}
            <Modal isOpen={showAddNodeModal} toggle={() => setShowAddNodeModal(!showAddNodeModal)} centered contentClassName="designkit-wrapper border-0">
                <div className="modern-modal-content">
                    <div className="modal-header-info p-3 d-flex justify-content-between align-items-center">
                        <h5 className="modal-title xsmall text-uppercase fw-800 tracking-widest text-white">
                            <i className="ri-add-circle-line me-2"></i>Thêm Tiết/Điều/Khoản mới
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddNodeModal(false)}></button>
                    </div>
                    <div className="modal-body p-4 bg-black-20">
                        <Row className="g-3">
                            <Col lg={6}>
                                <label className="form-label xsmall text-uppercase fw-700 text-white-40">Loại nội dung</label>
                                <select className="form-select modern-input" value={newNodeData.node_type} onChange={(e) => setNewNodeData({ ...newNodeData, node_type: e.target.value })}>
                                    <option value="Chương">Chương</option>
                                    <option value="Điều">Điều</option>
                                    <option value="Khoản">Khoản</option>
                                    <option value="Điểm">Điểm</option>
                                    <option value="Phụ lục">Phụ lục (trong văn bản)</option>
                                    <option value="Vấn đề khác">Vấn đề khác</option>
                                </select>
                            </Col>
                            <Col lg={6}>
                                <label className="form-label xsmall text-uppercase fw-700 text-white-40">Nhãn (Tiêu đề ngắn)</label>
                                <Input className="modern-input" value={newNodeData.node_label} onChange={(e) => setNewNodeData({ ...newNodeData, node_label: e.target.value })} placeholder="VD: Điều 12, Khoản 3..." />
                            </Col>
                            <Col lg={12}>
                                <label className="form-label xsmall text-uppercase fw-700 text-white-40">Nội dung</label>
                                <Input type="textarea" rows={5} className="modern-input" value={newNodeData.content} onChange={(e) => setNewNodeData({ ...newNodeData, content: e.target.value })} placeholder="Nhập nội dung chi tiết..." />
                            </Col>
                            <Col lg={12}>
                                <label className="form-label xsmall text-uppercase fw-700 text-white-40">Gắn vào mục cấp trên (nếu có)</label>
                                <select className="form-select modern-input" value={newNodeData.parent_id || ""} onChange={(e) => setNewNodeData({ ...newNodeData, parent_id: e.target.value || null })}>
                                    <option value="">-- Cấp gốc (Không có cha) --</option>
                                    {nodeOptions.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                                    ))}
                                </select>
                            </Col>
                        </Row>
                    </div>
                    <div className="modal-footer bg-black-40 p-3 border-top border-white-10">
                        <ModernButton variant="ghost" onClick={() => setShowAddNodeModal(false)}>Hủy</ModernButton>
                        <ModernButton variant="info" onClick={handleAddNode} loading={isAddingNode}>
                            Xác nhận thêm
                        </ModernButton>
                    </div>
                </div>
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
        </div>
        </div>
        </React.Fragment>
    );
};

export default DocumentDetails;
