import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Badge, Modal, ModalHeader, ModalBody, ModalFooter, Input, Label, Spinner, Table,
    UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem, FormGroup } from 'reactstrap';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { toast, ToastContainer } from 'react-toastify';
import classnames from 'classnames';
import SimpleBar from 'simplebar-react';

// Modern UI Components
import { 
    ModernCard, ModernTable, ModernBadge, ModernButton, 
    ModernHeader, ModernStatWidget, ModernSearchBox 
} from '../../Components/Common/ModernUI';
import DeleteModal from "../../Components/Common/DeleteModal";

const selectStyles = {
    control: (base, state) => ({
        ...base,
        background: "var(--vz-input-bg, rgba(255,255,255,0.05))",
        borderColor: state.isFocused ? "var(--vz-primary, #405189)" : "var(--vz-input-border, rgba(255,255,255,0.1))",
        color: "var(--vz-body-color, #ffffff)",
        borderRadius: '8px',
        padding: '2px',
        boxShadow: 'none',
        '&:hover': {
            borderColor: "var(--vz-primary, #405189)"
        }
    }),
    menu: (base) => ({
        ...base,
        background: "var(--vz-choices-bg, #1a1b1e)",
        borderColor: "rgba(255,255,255,0.1)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        zIndex: 9999,
        borderRadius: '8px',
        overflow: 'hidden'
    }),
    option: (base, state) => ({
        ...base,
        background: state.isSelected 
            ? "var(--vz-primary, #405189)" 
            : state.isFocused 
                ? "rgba(64, 81, 137, 0.15)" 
                : "transparent",
        color: state.isSelected 
            ? "#fff" 
            : "#ced4da",
        padding: "10px 15px",
        fontSize: "13px",
        fontWeight: "500",
        cursor: "pointer",
        ":active": {
            background: "var(--vz-primary, #405189)",
            color: "#fff"
        }
    }),
    singleValue: (base) => ({
        ...base,
        color: "#ffffff",
        fontSize: "14px",
    }),
    input: (base) => ({
        ...base,
        color: "#ffffff",
    }),
    placeholder: (base) => ({
        ...base,
        color: "rgba(255,255,255,0.5)",
    }),
    dropdownIndicator: (base) => ({
        ...base,
        color: "rgba(255,255,255,0.3)",
    }),
    indicatorSeparator: (base) => ({
        ...base,
        backgroundColor: "rgba(255,255,255,0.1)",
    }),
    multiValue: (base) => ({
        ...base,
        background: "rgba(64, 81, 137, 0.2)",
    }),
    multiValueLabel: (base) => ({
        ...base,
        color: "#fff",
    }),
    multiValueRemove: (base) => ({
        ...base,
        color: "#fff",
        '&:hover': {
            background: "var(--vz-primary)",
            color: "#fff",
        }
    })
};

const FeedbackList = () => {
    const [documents, setDocuments] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(false);

    const [docSearch, setDocSearch] = useState("");
    const [tableSearch, setTableSearch] = useState("");

    // Filters
    const [selectedAgency, setSelectedAgency] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedSpecialist, setSelectedSpecialist] = useState('all');
    const [selectedNodeId, setSelectedNodeId] = useState('all');
    const [specialists, setSpecialists] = useState([]);
    
    // Assignment State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignTarget, setAssignTarget] = useState(null); 
    const [assignUserIds, setAssignUserIds] = useState([]); 
    const [assigningLoading, setAssigningLoading] = useState(false);
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);

    // Modal state for Explanation
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentFeedback, setCurrentFeedback] = useState(null);
    const [explanation, setExplanation] = useState('');
    const [saving, setSaving] = useState(false);

    // Modal state for Viewing Node Content
    const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
    const [selectedNodeData, setSelectedNodeData] = useState(null);
    const [nodeLoading, setNodeLoading] = useState(false);

    // Editing Feedback
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editContent, setEditContent] = useState("");
    const [editNodeId, setEditNodeId] = useState(null);
    const [editAgencyId, setEditAgencyId] = useState(null);
    const [editDocNumber, setEditDocNumber] = useState("");
    const [docNodes, setDocNodes] = useState([]);
    const [updating, setUpdating] = useState(false);

    // Deletion
    const [deleteModal, setDeleteModal] = useState(false);
    const [feedbackToDelete, setFeedbackToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [fullDeleteModal, setFullDeleteModal] = useState(false);
    const [fullDeleting, setFullDeleting] = useState(false);

    // Agencies
    const [agencies, setAgencies] = useState([]);

    useEffect(() => {
        fetchDocuments();
        fetchAgenciesOnly();
        fetchSpecialists();
    }, []);

    const fetchSpecialists = async () => {
        try {
            const res = await axios.get('/api/accounts/users/', getAuthHeader());
            setSpecialists(res.data || res || []);
        } catch (e) {
            console.error("Lỗi khi tải danh sách cán bộ");
        }
    };

    const fetchAgenciesOnly = async () => {
        try {
            const res = await axios.get('/api/settings/agencies/', getAuthHeader());
            const data = res.results || res || [];
            setAgencies(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Lỗi khi tải danh sách đơn vị");
        }
    };

    const fetchDocuments = async () => {
        try {
            const res = await axios.get('/api/documents/', getAuthHeader());
            const data = res.results || res || [];
            const list = Array.isArray(data) ? data : [];
            setDocuments(list);
            if (list.length > 0) {
                const first = list[0];
                setSelectedDoc(first);
                fetchFeedbacks(first.id);
            }
        } catch (e) {
            toast.error("Không thể tải danh sách dự thảo.");
        }
    };

    const fetchFeedbacks = async (docId, page = 1) => {
        if (!docId) return;
        setLoading(true);
        try {
            let url = `/api/feedbacks/by_document/?document_id=${docId}&page=${page}&page_size=${pageSize}`;
            if (selectedNodeId && selectedNodeId !== 'all') url += `&node_id=${selectedNodeId}`;
            if (selectedAgency && selectedAgency !== 'all') url += `&agency=${selectedAgency}`;
            if (selectedSpecialist && selectedSpecialist !== 'all') url += `&specialist=${selectedSpecialist}`;
            if (selectedStatus && selectedStatus !== 'all') url += `&status=${selectedStatus}`;
            if (tableSearch) url += `&search=${encodeURIComponent(tableSearch)}`;

            const res = await axios.get(url, getAuthHeader());
            const data = res.results || [];
            setFeedbacks(data);
            setTotalCount(res.count || 0);
            setCurrentPage(res.page || page);
        } catch (e) {
            setFeedbacks([]);
        } finally {
            setLoading(false);
        }
        fetchDocNodes(docId);
    };

    useEffect(() => {
        if (selectedDoc) {
            fetchFeedbacks(selectedDoc.id, currentPage);
        }
    }, [selectedNodeId, selectedAgency, selectedSpecialist, selectedStatus, currentPage, tableSearch]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedNodeId, selectedAgency, selectedSpecialist, selectedStatus, tableSearch]);

    const fetchDocNodes = async (docId) => {
        try {
            const res = await axios.get(`/api/feedbacks/get_document_nodes/?document_id=${docId}`, getAuthHeader());
            const data = res.data || res || [];
            if (Array.isArray(data)) {
                setDocNodes(data.map(n => ({ value: n.value, label: n.label, type: n.type })));
            }
        } catch (e) {
            console.error("Lỗi khi tải danh sách Điều/Khoản.");
        }
    };

    const handleAction = (fb) => {
        setCurrentFeedback(fb);
        setExplanation(fb.explanation || '');
        setIsModalOpen(true);
    };

    const handleEditFeedback = (fb) => {
        setCurrentFeedback(fb);
        setEditContent(fb.content || '');
        let initialVal = null;
        if (fb.node_id) initialVal = `node-${fb.node_id}`;
        else if (fb.appendix_id) initialVal = `app-${fb.appendix_id}`;
        setEditNodeId(initialVal);
        setEditAgencyId(fb.agency);
        setEditDocNumber(fb.official_doc_number || '');
        setIsEditModalOpen(true);
    };

    const saveFeedbackEdit = async () => {
        if (!editContent.trim()) {
            toast.warning("Vui lòng nhập nội dung góp ý.");
            return;
        }
        setUpdating(true);
        try {
            let nodeVal = null;
            let appendixVal = null;
            if (editNodeId) {
                if (editNodeId.startsWith('node-')) nodeVal = parseInt(editNodeId.replace('node-', ''));
                else if (editNodeId.startsWith('app-')) appendixVal = parseInt(editNodeId.replace('app-', ''));
            }

            const payload = {
                content: editContent,
                node: nodeVal,
                appendix: appendixVal,
                agency: editAgencyId || null,
                official_doc_number: editDocNumber || "",
                document: selectedDoc?.id || currentFeedback?.document_id
            };

            await axios.patch(`/api/feedbacks/${currentFeedback.id}/`, payload, getAuthHeader());
            toast.success("Cập nhật góp ý thành công.");
            setIsEditModalOpen(false);
            fetchFeedbacks(selectedDoc.id);
        } catch (error) {
            toast.error("Lỗi khi cập nhật dữ liệu.");
        } finally {
            setUpdating(false);
        }
    };

    const saveExplanation = async () => {
        if (!explanation.trim()) {
            toast.warning("Vui lòng nhập nội dung giải trình.");
            return;
        }
        setSaving(true);
        try {
            await axios.post('/api/feedbacks/save_explanation/', {
                document_id: selectedDoc.id,
                target_type: 'Feedback',
                object_id: currentFeedback.id,
                content: explanation
            }, getAuthHeader());
            toast.success("Đã lưu giải trình.");
            setIsModalOpen(false);
            fetchFeedbacks(selectedDoc.id);
        } catch (e) {
            toast.error("Lỗi khi lưu giải trình.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteExplanation = async (fb) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa nội dung giải trình này không?")) return;
        try {
            await axios.post('/api/feedbacks/delete_explanation/', {
                document_id: selectedDoc.id,
                target_type: 'Feedback',
                object_id: fb.id
            }, getAuthHeader());
            toast.success("Đã xóa giải trình.");
            fetchFeedbacks(selectedDoc.id);
        } catch (e) {
            toast.error("Lỗi khi xóa giải trình.");
        }
    };

    const handleDeleteFeedback = (fb) => {
        setFeedbackToDelete(fb);
        setDeleteModal(true);
    };

    const confirmDeleteFeedback = async () => {
        setDeleting(true);
        try {
            await axios.delete(`/api/feedbacks/${feedbackToDelete.id}/`, getAuthHeader());
            toast.success("Đã xóa nội dung góp ý.");
            setDeleteModal(false);
            fetchFeedbacks(selectedDoc.id);
        } catch (e) {
            toast.error("Lỗi khi xóa góp ý.");
        } finally {
            setDeleting(false);
        }
    };

    const confirmDeleteAll = async () => {
        setFullDeleting(true);
        try {
            await axios.post('/api/feedbacks/delete_all/', { document_id: selectedDoc.id }, getAuthHeader());
            toast.success("Đã xóa toàn bộ nội dung góp ý.");
            setFullDeleteModal(false);
            fetchFeedbacks(selectedDoc.id);
        } catch (e) {
            toast.error("Lỗi khi xóa dữ liệu.");
        } finally {
            setFullDeleting(false);
        }
    };

    const handleViewNode = (nodeId, label) => {
        fetchNodeDetails(nodeId, label);
    };

    const handleOpenAssignModal = (fb) => {
        setAssignTarget(fb.id);
        setAssignUserIds(fb.assigned_users ? fb.assigned_users.map(u => u.id) : []);
        setIsAssignModalOpen(true);
    };

    const handleSaveAssignment = async () => {
        setAssigningLoading(true);
        try {
            await axios.post(`/api/feedbacks/assign_feedbacks/`, {
                document_id: selectedDoc.id,
                assignments: [{ feedback_id: assignTarget, user_ids: assignUserIds }]
            }, getAuthHeader());
            toast.success("Phân công thành công!");
            setIsAssignModalOpen(false);
            fetchFeedbacks(selectedDoc.id, currentPage);
        } catch (error) {
            toast.error("Lỗi khi phân công.");
        } finally {
            setAssigningLoading(false);
        }
    };

    const fetchNodeDetails = async (nodeId, label) => {
        setIsNodeModalOpen(true);
        setNodeLoading(true);
        setSelectedNodeData({ node_label: label, content: 'Đang tải...', node_type: '' });
        try {
            const res = await axios.get(`/api/documents/nodes/${nodeId}/full_context/`, getAuthHeader());
            setSelectedNodeData(res.data || res);
        } catch (e) {
            setSelectedNodeData({ node_label: label, content: 'Lỗi khi tải nội dung.' });
        } finally {
            setNodeLoading(false);
        }
    };

    const sortedDocs = documents.filter(doc =>
        doc.project_name?.toLowerCase().includes(docSearch.toLowerCase()) ||
        doc.drafting_agency?.toLowerCase().includes(docSearch.toLowerCase())
    );

    return (
        <div className="designkit-wrapper designkit-layout-root">
            <style>
                {`
                    @media (max-width: 768px) {
                        .workspace-pane-layout {
                            flex-direction: column !important;
                            overflow-y: auto !important;
                        }
                        .pane-sidebar {
                            width: 100% !important;
                            max-height: 250px !important;
                            border-right: none !important;
                            border-bottom: 1px solid rgba(255,255,255,0.1) !important;
                        }
                        .pane-content {
                            width: 100% !important;
                            height: auto !important;
                        }
                        .modern-filter-row {
                            flex-direction: column !important;
                            gap: 10px !important;
                        }
                        .filter-item {
                            width: 100% !important;
                        }
                        .modern-header {
                            padding: 2.5rem 1rem 1rem 1rem !important; /* Increase top padding for header */
                            margin-bottom: 1.5rem !important;
                        }
                        .header-actions {
                            margin-top: 10px;
                            width: 100%;
                            justify-content: flex-start !important;
                        }

                        /* Fix Pagination Overlap with Bottom Nav */
                        .modern-page-content {
                            padding-bottom: 90px !important;
                        }

                        /* Shrink Widgets on Mobile */
                        .modern-widget-item {
                            padding: 0.75rem !important;
                        }
                        .modern-widget-item h3 {
                            font-size: 1.25rem !important;
                            margin-bottom: 0.25rem !important;
                        }
                        .modern-widget-item span[style*="font-size: 0.75rem"] {
                            font-size: 0.65rem !important;
                        }

                        /* Reorganize Table Cards for Science/Organization */
                        .modern-table tbody tr {
                            position: relative;
                            padding-top: 3.5rem !important; 
                            margin-bottom: 1.25rem !important;
                            border: 1px solid rgba(255,255,255,0.05) !important;
                            border-radius: 12px !important;
                            background: rgba(255,255,255,0.02) !important;
                            display: block !important;
                        }
                        .modern-table tbody td[data-label="STT"] {
                            position: absolute;
                            top: 15px;
                            left: 15px;
                            display: flex !important;
                            background: rgba(99, 102, 241, 0.15);
                            color: var(--kit-primary) !important;
                            width: 28px;
                            height: 28px;
                            align-items: center;
                            justify-content: center;
                            border-radius: 6px;
                            font-size: 0.75rem !important;
                            border: 1px solid rgba(99, 102, 241, 0.2) !important;
                            z-index: 2;
                        }
                        .modern-table tbody td[data-label="Thao tác"] {
                            position: absolute;
                            top: 10px;
                            right: 10px;
                            display: block !important;
                            z-index: 2;
                        }
                        .modern-table tbody td:not([data-label="STT"]):not([data-label="Thao tác"]) {
                            display: flex !important;
                            flex-direction: column;
                            margin-bottom: 0.75rem;
                            padding: 0 1rem !important;
                            text-align: left !important;
                        }
                        .modern-table tbody td[data-label="Điều/Khoản"] {
                            border-bottom: 1px solid rgba(255,255,255,0.05);
                            padding-bottom: 0.75rem !important;
                            margin-bottom: 1rem !important;
                            background: rgba(255,255,255,0.03);
                            padding-top: 0.75rem !important;
                        }
                        .modern-table tbody td[data-label="Điều/Khoản"] .fw-900 {
                            margin-left: 35px; /* Space for STT */
                        }
                    }
                `}
            </style>
            <div className="modern-page-content" style={{ padding: 0, minHeight: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>
                <Container fluid className="h-100 d-flex flex-column px-0 pb-1">
                    <ToastContainer closeButton={false} />
                    
                    <ModernHeader 
                        title="Dashboard Quản lý Ý kiến góp ý"
                        subtitle="Phân loại, phân công giải trình và theo dõi tiến độ tiếp thu góp ý"
                        actions={
                            <div className="d-flex gap-2">
                                <ModernButton variant="ghost" size="sm" onClick={() => fetchFeedbacks(selectedDoc?.id, currentPage)}>
                                    <i className="ri-refresh-line me-1"></i> Làm mới
                                </ModernButton>
                                <ModernButton variant="danger-ghost" size="sm" onClick={() => setFullDeleteModal(true)} disabled={!selectedDoc}>
                                    <i className="ri-delete-bin-line me-1"></i> Xóa hết
                                </ModernButton>
                            </div>
                        }
                    />

                    <div className="workspace-pane-layout flex-grow-1 overflow-hidden d-flex flex-column flex-md-row">
                        
                        {/* LEFT PANE: DOCUMENTS (25%) */}
                        <div className="pane-sidebar h-content d-flex flex-column border-end border-white-5 bg-black-20 w-100" style={{ maxWidth: '100%', flexBasis: 'auto', minWidth: 'auto' }}>
                            <div className="pane-header p-3 border-bottom border-white-5">
                                <h6 className="xsmall text-uppercase fw-800 tracking-wider text-white-40 mb-3">Dự thảo đang xử lý</h6>
                                <div className="modern-search-bar">
                                    <i className="ri-search-line"></i>
                                    <input 
                                        type="text" 
                                        placeholder="Tìm tên dự thảo..." 
                                        value={docSearch}
                                        onChange={(e) => setDocSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="pane-body flex-grow-1 overflow-hidden">
                                <SimpleBar style={{ height: '100%' }} className="px-2 py-3">
                                    {sortedDocs.map(doc => (
                                        <div 
                                            key={doc.id}
                                            className={classnames("modern-list-item", { "active": selectedDoc?.id === doc.id })}
                                            onClick={() => { setSelectedDoc(doc); fetchFeedbacks(doc.id); }}
                                        >
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div className="flex-grow-1 overflow-hidden">
                                                    <div className="item-title text-truncate">{doc.project_name}</div>
                                                    <div className="item-subtitle text-truncate">{doc.drafting_agency}</div>
                                                </div>
                                                <div className="ms-2 flex-shrink-0">
                                                    <span className={`modern-counter-badge ${doc.resolved_feedbacks === doc.total_feedbacks ? 'success' : 'info'}`}>
                                                        {doc.resolved_feedbacks}/{doc.total_feedbacks}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </SimpleBar>
                            </div>
                        </div>

                        {/* RIGHT PANE: FEEDBACK CONTENT (75%) */}
                        <div className="pane-content flex-grow-1 h-100 d-flex flex-column bg-black-10 overflow-hidden">
                            <SimpleBar style={{ height: '100%' }} className="p-4">
                                {selectedDoc ? (
                                    <>
                                        {/* Statistics Row */}
                                        <Row className="mb-4 g-3">
                                            <Col xs={6} md={4}>
                                                <ModernStatWidget title="Tổng góp ý" value={totalCount} label="Ý kiến" icon="ri-discuss-line" color="info" />
                                            </Col>
                                            <Col xs={6} md={4}>
                                                <ModernStatWidget title="Đã giải trình" value={selectedDoc.resolved_feedbacks || 0} label="Hoàn thành" icon="ri-checkbox-circle-line" color="success" />
                                            </Col>
                                            <Col xs={6} md={4}>
                                                <ModernStatWidget title="Cán bộ thụ lý" value={new Set(feedbacks.flatMap(f => f.assigned_users?.map(u => u.id) || [])).size} label="Đang làm việc" icon="ri-user-star-line" color="primary" />
                                            </Col>
                                        </Row>

                                        {/* Main Table Container */}
                                        <div className="modern-card p-4 bg-white-5 backdrop-blur">
                                            <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-4">
                                                <div className="d-flex align-items-center gap-3">
                                                    <h5 className="text-white mb-0 fw-bold tracking-tight">Vấn đề Góp ý</h5>
                                                    <ModernBadge color="primary" variant="soft" className="px-3">
                                                        {totalCount} ý kiến
                                                    </ModernBadge>
                                                </div>
                                                <ModernSearchBox 
                                                    placeholder="Tìm kiếm nội dung, cơ quan..." 
                                                    value={tableSearch} 
                                                    onChange={(e) => setTableSearch(e.target.value)} 
                                                    style={{ width: '350px' }}
                                                />
                                            </div>

                                            {/* Unified Filter Bar */}
                                            <div className="modern-filter-row mb-4 p-3 rounded-3 bg-white-5 border border-white-5 gap-3 d-flex flex-wrap">
                                                <div className="filter-item flex-grow-1">
                                                    <label className="xsmall text-uppercase fw-800 text-white-40 mb-2 ms-1">Mục nội dung</label>
                                                    <Select styles={selectStyles} placeholder="Tất cả vị trí" options={[{ value: 'all', label: 'Tất cả vị trí' }, ...docNodes]} value={docNodes.find(n => n.value == selectedNodeId) || { value: 'all', label: 'Tất cả vị trí' }} onChange={(opt) => setSelectedNodeId(opt.value)} />
                                                </div>
                                                <div className="filter-item flex-grow-1">
                                                    <label className="xsmall text-uppercase fw-800 text-white-40 mb-2 ms-1">Cơ quan</label>
                                                    <Select styles={selectStyles} placeholder="Tất cả Cơ quan" options={[{ value: 'all', label: 'Tất cả Cơ quan' }, ...agencies.map(a => ({ value: a.id, label: a.name }))]} value={agencies.find(a => a.id == selectedAgency) ? { value: selectedAgency, label: agencies.find(a => a.id == selectedAgency).name } : { value: 'all', label: 'Tất cả Cơ quan' }} onChange={(opt) => setSelectedAgency(opt.value)} />
                                                </div>
                                                <div className="filter-item flex-grow-1">
                                                    <label className="xsmall text-uppercase fw-800 text-white-40 mb-2 ms-1">Thụ lý</label>
                                                    <Select styles={selectStyles} placeholder="Tất cả cán bộ" options={[{ value: 'all', label: 'Tất cả cán bộ' }, { value: 'none', label: 'Chưa giao' }, ...specialists.map(s => ({ value: s.id, label: s.full_name || s.username }))]} value={specialists.find(s => s.id == selectedSpecialist) ? { value: selectedSpecialist, label: specialists.find(s => s.id == selectedSpecialist).full_name } : { value: 'all', label: 'Tất cả cán bộ' }} onChange={(opt) => setSelectedSpecialist(opt.value)} />
                                                </div>
                                                <div className="filter-item flex-grow-1">
                                                    <label className="xsmall text-uppercase fw-800 text-white-40 mb-2 ms-1">Trạng thái</label>
                                                    <Select styles={selectStyles} placeholder="Trạng thái" options={[{ value: 'all', label: 'Tất cả ý kiến' }, { value: 'pending', label: 'Chưa giải trình' }, { value: 'explained', label: 'Đã giải trình' }]} value={{ value: selectedStatus, label: selectedStatus === 'all' ? 'Tất cả ý kiến' : selectedStatus === 'pending' ? 'Chưa giải trình' : 'Đã giải trình' }} onChange={(opt) => setSelectedStatus(opt.value)} />
                                                </div>
                                            </div>

                                            <ModernTable>
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '50px' }} className="text-center">STT</th>
                                                        <th style={{ width: '150px' }}>Điều/Khoản</th>
                                                        <th style={{ width: '180px' }}>Cơ quan</th>
                                                        <th>Nội dung góp ý</th>
                                                        <th>Giải trình/Tiếp thu</th>
                                                        <th style={{ width: '150px' }}>Thụ lý</th>
                                                        <th style={{ width: '80px' }} className="text-center">Thao tác</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {loading ? (
                                                        <tr><td colSpan="7" className="text-center py-5"><Spinner color="primary" size="sm" /></td></tr>
                                                    ) : feedbacks.length > 0 ? feedbacks.map((fb, idx) => (
                                                        <tr key={fb.id}>
                                                            <td className="text-center text-white-20 fw-bold xsmall" data-label="STT">{(currentPage - 1) * pageSize + idx + 1}</td>
                                                            <td data-label="Điều/Khoản">
                                                                <div className="fw-900 text-primary cursor-pointer hover-underline fs-15" onClick={() => handleViewNode(fb.node_id, fb.node_label)}>
                                                                    {fb.node_label}
                                                                </div>
                                                                {fb.node_path && fb.node_path !== fb.node_label && (
                                                                    <div className="xsmall text-white-40 mt-1 italic text-truncate" style={{ maxWidth: '200px' }}>{fb.node_path}</div>
                                                                )}
                                                            </td>
                                                            <td data-label="Cơ quan">
                                                                <div className="fw-semibold text-white-85 fs-13 d-flex align-items-center gap-2">
                                                                    <i className="ri-community-line text-white-30"></i> {fb.contributing_agency}
                                                                </div>
                                                                {fb.official_doc_number && <div className="mt-1 xsmall text-info opacity-70">Số: {fb.official_doc_number}</div>}
                                                            </td>
                                                            <td data-label="Nội dung góp ý">
                                                                <div className="text-white-70 lh-base fs-13" style={{ maxWidth: '400px' }}>{fb.content}</div>
                                                            </td>
                                                            <td data-label="Giải trình/Tiếp thu">
                                                                {fb.explanation ? (
                                                                    <div className="p-2 rounded bg-success-opacity border-start border-success border-2">
                                                                        <div className="text-white-90 lh-base fs-13 italic">"{fb.explanation}"</div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-white-20 xsmall italic">Chưa giải trình</span>
                                                                )}
                                                            </td>
                                                            <td data-label="Thụ lý">
                                                                <div className="d-flex flex-wrap gap-1">
                                                                    {fb.assigned_users?.length > 0 ? fb.assigned_users.map(u => (
                                                                        <span key={u.id} className="modern-badge soft-primary px-2 py-0 fs-10" style={{ height: 'min-content' }}>{u.full_name}</span>
                                                                    )) : <span className="text-white-20 xsmall">Chưa giao</span>}
                                                                </div>
                                                            </td>
                                                            <td className="text-center" data-label="Thao tác">
                                                                <UncontrolledDropdown>
                                                                    <DropdownToggle tag="button" className="modern-btn-minimal">
                                                                        <i className="ri-more-2-fill"></i>
                                                                    </DropdownToggle>
                                                                    <DropdownMenu container="body" className="dropdown-menu-dark p-2" end style={{ background: '#1e2027', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                                                                        <DropdownItem className="rounded-2" onClick={() => handleAction(fb)}>
                                                                            <i className={classnames("ri-chat-1-line me-2", { "text-success": fb.explanation })} ></i> 
                                                                            {fb.explanation ? "Sửa giải trình" : "Giải trình"}
                                                                        </DropdownItem>
                                                                        <DropdownItem className="rounded-2" onClick={() => handleOpenAssignModal(fb)}>
                                                                            <i className="ri-user-follow-line me-2 text-primary"></i> Phân công
                                                                        </DropdownItem>
                                                                        <DropdownItem divider className="border-white-5" />
                                                                        <DropdownItem className="rounded-2" onClick={() => handleEditFeedback(fb)}>
                                                                            <i className="ri-edit-line me-2 text-warning"></i> Sửa dữ liệu
                                                                        </DropdownItem>
                                                                        {fb.explanation && (
                                                                            <DropdownItem className="rounded-2 text-danger" onClick={() => handleDeleteExplanation(fb)}>
                                                                                <i className="ri-close-circle-line me-2"></i> Xóa giải trình
                                                                            </DropdownItem>
                                                                        )}
                                                                        <DropdownItem className="rounded-2 text-danger" onClick={() => handleDeleteFeedback(fb)}>
                                                                            <i className="ri-delete-bin-line me-2"></i> Xóa góp ý
                                                                        </DropdownItem>
                                                                    </DropdownMenu>
                                                                </UncontrolledDropdown>
                                                            </td>
                                                        </tr>
                                                    )) : (
                                                        <tr><td colSpan="7" className="text-center py-5 text-white-40 italic">Không tìm thấy ý kiến góp ý phù hợp.</td></tr>
                                                    )}
                                                </tbody>
                                            </ModernTable>

                                            {/* Pagination Bar */}
                                            {totalCount > pageSize && !loading && (
                                                <div className="d-flex justify-content-between align-items-center mt-4 pt-4 border-top border-white-5">
                                                    <div className="text-white-40 xsmall fw-bold">Trình bày {Math.min(currentPage * pageSize - pageSize + 1, totalCount)} - {Math.min(currentPage * pageSize, totalCount)} trên {totalCount} kết quả</div>
                                                    <div className="d-flex gap-2">
                                                        <ModernButton variant="ghost" size="sm" className="px-3" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                                                            <i className="ri-arrow-left-s-line me-1"></i> Trước
                                                        </ModernButton>
                                                        <ModernButton variant="ghost" size="sm" className="px-3" disabled={currentPage * pageSize >= totalCount} onClick={() => setCurrentPage(p => p + 1)}>
                                                            Sau <i className="ri-arrow-right-s-line ms-1"></i>
                                                        </ModernButton>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center py-5">
                                        <div className="avatar-xl mb-4 p-4 rounded-circle bg-white-5 border border-white-5">
                                            <i className="ri-file-search-line display-3 text-white-10"></i>
                                        </div>
                                        <h4 className="fw-900 text-white">Chưa chọn Dự thảo</h4>
                                        <p className="text-white-40 max-w-400 mx-auto">Vui lòng chọn một dự thảo văn bản từ danh sách bên trái để xem tổng hợp các ý kiến góp ý.</p>
                                    </div>
                                )}
                            </SimpleBar>
                        </div>
                    </div>
                </Container>
            </div>

            {/* Modal: Explanation */}
            <Modal isOpen={isModalOpen} toggle={() => setIsModalOpen(false)} centered size="lg" contentClassName="designkit-wrapper border-0">
                <div className="modern-modal-content">
                    <div className="modal-header-success p-3 d-flex justify-content-between align-items-center">
                        <h5 className="modal-title xsmall text-uppercase fw-800 tracking-widest text-white">
                            <i className="ri-discuss-line me-2"></i>Giải trình & Tiếp thu ý kiến
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={() => setIsModalOpen(false)}></button>
                    </div>
                    <div className="modal-body p-4 bg-black-20">
                        {currentFeedback && (
                            <div className="mb-4 bg-white-5 p-3 rounded-3 border border-white-10">
                                <label className="xsmall text-uppercase fw-800 text-white-40 d-block mb-1">Nội dung góp ý gốc:</label>
                                <div className="text-white-90 italic">"{currentFeedback.content}"</div>
                            </div>
                        )}
                        <FormGroup className="mb-0">
                            <label className="xsmall text-uppercase fw-800 text-white-40 d-block mb-2">Nội dung giải trình / Ý kiến tiếp thu <span className="text-danger">*</span></label>
                            <Input type="textarea" rows="8" className="modern-input" placeholder="Nhập chi tiết nội dung giải trình hoặc lý do tiếp thu/không tiếp thu..." value={explanation} onChange={(e) => setExplanation(e.target.value)} />
                        </FormGroup>
                    </div>
                    <div className="modal-footer bg-black-40 p-3 border-top border-white-10">
                        <ModernButton variant="ghost" onClick={() => setIsModalOpen(false)}>Đóng</ModernButton>
                        <ModernButton variant="success" onClick={saveExplanation} loading={saving}>Lưu giải trình</ModernButton>
                    </div>
                </div>
            </Modal>

            {/* Modal: Assign */}
            <Modal isOpen={isAssignModalOpen} toggle={() => setIsAssignModalOpen(false)} centered contentClassName="designkit-wrapper border-0">
                <div className="modern-modal-content">
                    <div className="modal-header-primary p-3 d-flex justify-content-between align-items-center">
                        <h5 className="modal-title xsmall text-uppercase fw-800 tracking-widest text-white">
                            <i className="ri-user-follow-line me-2"></i>Phân công cán bộ thụ lý
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={() => setIsAssignModalOpen(false)}></button>
                    </div>
                    <div className="modal-body p-4 bg-black-20">
                        <FormGroup className="mb-0">
                            <label className="xsmall text-uppercase fw-800 text-white-40 d-block mb-2">Chọn cán bộ (có thể nhiều người)</label>
                            <Select isMulti styles={selectStyles} options={specialists.map(s => ({ value: s.id, label: s.full_name || s.username }))} value={specialists.filter(s => assignUserIds.includes(s.id)).map(s => ({ value: s.id, label: s.full_name }))} onChange={(opts) => setAssignUserIds(opts ? opts.map(o => o.value) : [])} placeholder="Tìm kiếm cán bộ..." />
                        </FormGroup>
                    </div>
                    <div className="modal-footer bg-black-40 p-3 border-top border-white-10">
                        <ModernButton variant="ghost" onClick={() => setIsAssignModalOpen(false)}>Hủy</ModernButton>
                        <ModernButton variant="primary" onClick={handleSaveAssignment} loading={assigningLoading}>Xác nhận phân công</ModernButton>
                    </div>
                </div>
            </Modal>

            {/* Modal: Edit Feedback */}
            <Modal isOpen={isEditModalOpen} toggle={() => setIsEditModalOpen(false)} centered size="lg" contentClassName="designkit-wrapper border-0">
                <div className="modern-modal-content">
                    <div className="modal-header-warning p-3 d-flex justify-content-between align-items-center">
                        <h5 className="modal-title xsmall text-uppercase fw-800 tracking-widest text-white">
                            <i className="ri-edit-box-line me-2"></i>Hiệu chỉnh bản ghi Góp ý
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={() => setIsEditModalOpen(false)}></button>
                    </div>
                    <div className="modal-body p-4 bg-black-20">
                        <Row className="g-3">
                            <Col lg={12}>
                                <label className="xsmall text-uppercase fw-800 text-white-40 mb-2">Nội dung góp ý</label>
                                <Input type="textarea" rows="5" className="modern-input" value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                            </Col>
                            <Col lg={6}>
                                <label className="xsmall text-uppercase fw-800 text-white-40 mb-2">Ví trí/Điều gán lại</label>
                                <Select styles={selectStyles} options={docNodes} value={docNodes.find(n => n.value === editNodeId)} onChange={(opt) => setEditNodeId(opt.value)} placeholder="Chọn vị trí mới..." />
                            </Col>
                            <Col lg={6}>
                                <label className="xsmall text-uppercase fw-800 text-white-40 mb-2">Số hiệu công văn</label>
                                <Input type="text" className="modern-input" value={editDocNumber} onChange={(e) => setEditDocNumber(e.target.value)} placeholder="VD: 123/BC-STC..." />
                            </Col>
                        </Row>
                    </div>
                    <div className="modal-footer bg-black-40 p-3 border-top border-white-10">
                        <ModernButton variant="ghost" onClick={() => setIsEditModalOpen(false)}>Hủy</ModernButton>
                        <ModernButton variant="warning" onClick={saveFeedbackEdit} loading={updating}>Cập nhật dữ liệu</ModernButton>
                    </div>
                </div>
            </Modal>

            <DeleteModal show={deleteModal} onDeleteClick={confirmDeleteFeedback} onCloseClick={() => setDeleteModal(false)} />
            <DeleteModal show={fullDeleteModal} onDeleteClick={confirmDeleteAll} onCloseClick={() => setFullDeleteModal(false)} />
            
            {/* Modal Quick Node Details */}
            <Modal isOpen={isNodeModalOpen} toggle={() => setIsNodeModalOpen(false)} centered size="xl" contentClassName="designkit-wrapper border-0">
                <div className="modern-modal-content">
                    <div className="modal-header-info p-3 d-flex justify-content-between align-items-center">
                        <h5 className="modal-title xsmall text-uppercase fw-800 tracking-widest text-white">
                            <i className="ri-file-list-3-line me-2"></i>Nội dung dự thảo: {selectedNodeData?.node_label}
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={() => setIsNodeModalOpen(false)}></button>
                    </div>
                    <div className="modal-body p-4 bg-black-20" style={{ minHeight: '400px' }}>
                        {nodeLoading ? (
                            <div className="text-center py-5"><Spinner color="primary" /></div>
                        ) : (
                            <div className="document-text-render p-4 rounded-3 bg-white-5 border border-white-10 text-white-90 fs-16 lh-lg" style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: selectedNodeData?.content }} />
                        )}
                    </div>
                    <div className="modal-footer bg-black-40 p-3 border-top border-white-10">
                        <ModernButton variant="ghost" onClick={() => setIsNodeModalOpen(false)}>Đóng</ModernButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default FeedbackList;
