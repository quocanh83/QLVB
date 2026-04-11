import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Badge, Modal, ModalHeader, ModalBody, ModalFooter, Input, Label, Spinner, Table } from 'reactstrap';
import TableContainer from "../../Components/Common/TableContainerReactTable";
import BreadCrumb from '../../Components/Common/BreadCrumb';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { toast } from 'react-toastify';

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

const FeedbackList = () => {
    const [documents, setDocuments] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [feedbacks, setFeedbacks] = useState([]);
    const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
    const [loading, setLoading] = useState(false);

    const [docSearch, setDocSearch] = useState("");
    const [tableSearch, setTableSearch] = useState("");

    // Filters
    const [agencyOptions, setAgencyOptions] = useState([]);
    const [selectedAgency, setSelectedAgency] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedSpecialist, setSelectedSpecialist] = useState('all');
    const [selectedNodeId, setSelectedNodeId] = useState('all');
    const [specialists, setSpecialists] = useState([]);
    
    // Assignment State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignTarget, setAssignTarget] = useState(null); // Node ID
    const [assignUserIds, setAssignUserIds] = useState([]); // Selected User IDs
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

    // NEW: Modal state for Editing Feedback
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editContent, setEditContent] = useState("");
    const [editNodeId, setEditNodeId] = useState(null);
    const [editAgencyId, setEditAgencyId] = useState(null);
    const [editDocNumber, setEditDocNumber] = useState("");
    const [docNodes, setDocNodes] = useState([]);
    const [updating, setUpdating] = useState(false);

    // Delete confirmation modal state
    const [deleteModal, setDeleteModal] = useState(false);
    const [feedbackToDelete, setFeedbackToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Full Delete state
    const [fullDeleteModal, setFullDeleteModal] = useState(false);
    const [fullDeleting, setFullDeleting] = useState(false);

    // Quick Agency Add state
    const [agencies, setAgencies] = useState([]);
    const [categories, setCategories] = useState([]);
    const [agencyModal, setAgencyModal] = useState(false);
    const [newAgencyName, setNewAgencyName] = useState("");
    const [newAgencyCategory, setNewAgencyCategory] = useState(null);
    const [addingAgency, setAddingAgency] = useState(false);

    const toggleAgencyModal = () => setAgencyModal(!agencyModal);

    useEffect(() => {
        fetchDocuments();
        fetchAgenciesOnly();
        fetchCategories();
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

    const fetchCategories = async () => {
        try {
            const res = await axios.get('/api/settings/agency-categories/', getAuthHeader());
            const data = res.results || res || [];
            setCategories(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Lỗi khi tải danh sách phân loại đơn vị");
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
            setFilteredFeedbacks(data);
            setTotalCount(res.count || 0);
            setCurrentPage(res.page || page);

        } catch (e) {
            toast.error("Không thể tải danh sách góp ý.");
            setFeedbacks([]);
            setFilteredFeedbacks([]);
        } finally {
            setLoading(false);
        }

        // Also pre-fetch nodes for the dropdown filter
        fetchDocNodes(docId);
    };

    // Trigger fetch when filters or page changes
    useEffect(() => {
        if (selectedDoc) {
            fetchFeedbacks(selectedDoc.id, currentPage);
        }
    }, [selectedNodeId, selectedAgency, selectedSpecialist, selectedStatus, currentPage, tableSearch]);

    // Reset page when filters change
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
            console.error("Lỗi khi tải danh sách Điều/Khoản để gắn lại.");
        }
    };

    // Client-side filtering removed in favor of server-side filtering

    const handleAction = (fb, actionType) => {
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
                if (editNodeId.startsWith('node-')) {
                    nodeVal = parseInt(editNodeId.replace('node-', ''));
                } else if (editNodeId.startsWith('app-')) {
                    appendixVal = parseInt(editNodeId.replace('app-', ''));
                }
            }

            const payload = {
                content: editContent,
                node: nodeVal,
                appendix: appendixVal,
                agency: editAgencyId || null,
                contributing_agency: editAgencyId ? agencies.find(a => a.id === editAgencyId)?.name : (currentFeedback?.contributing_agency || "Cơ quan góp ý"),
                official_doc_number: editDocNumber || "",
                document: selectedDoc?.id || currentFeedback?.document_id
            };

            await axios.patch(`/api/feedbacks/${currentFeedback.id}/`, payload, getAuthHeader());

            toast.success("Đã cập nhật góp ý thành công.");
            setIsEditModalOpen(false);
            fetchFeedbacks(selectedDoc.id);
        } catch (error) {
            console.error("Lỗi khi cập nhật góp ý:", error.response?.data);
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                const errorMsg = typeof errorData === 'object' 
                    ? Object.entries(errorData).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : JSON.stringify(value)}`).join(" | ")
                    : String(errorData);
                toast.error("Lỗi: " + errorMsg);
            } else {
                toast.error("Lỗi không xác định khi cập nhật dữ liệu.");
            }
        } finally {
            setUpdating(false);
        }
    };

    const handleQuickAgencySave = async () => {
        if (!newAgencyName.trim()) {
            toast.warning("Vui lòng nhập tên đơn vị.");
            return;
        }
        setAddingAgency(true);
        try {
            let categoryId = newAgencyCategory?.value;

            // Create category if new
            if (newAgencyCategory && newAgencyCategory.__isNew__) {
                const catRes = await axios.post('/api/settings/agency-categories/', { name: newAgencyCategory.label }, getAuthHeader());
                categoryId = catRes.data.id;
                await fetchCategories();
            }

            const res = await axios.post('/api/settings/agencies/', {
                name: newAgencyName,
                agency_category: categoryId
            }, getAuthHeader());

            toast.success("Thêm đơn vị mới thành công.");
            await fetchAgenciesOnly();

            setEditAgencyId(res.data.id); // Set to new agency
            toggleAgencyModal();
        } catch (error) {
            console.error("Lỗi khi thêm đơn vị nhanh:", error.response?.data);
            toast.error("Lỗi khi thêm đơn vị nhanh.");
        } finally {
            setAddingAgency(false);
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

            toast.success("Đã ghi nhận nội dung giải trình.");
            setIsModalOpen(false);
            fetchFeedbacks(selectedDoc.id); // Refresh list
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

            toast.success("Đã xóa nội dung giải trình.");
            fetchFeedbacks(selectedDoc.id); // Refresh list
        } catch (e) {
            toast.error("Lỗi khi xóa giải trình.");
        }
    };

    const handleDeleteFeedback = (fb) => {
        setFeedbackToDelete(fb);
        setDeleteModal(true);
    };

    const confirmDeleteFeedback = async () => {
        if (!feedbackToDelete) return;
        setDeleting(true);
        try {
            await axios.delete(`/api/feedbacks/${feedbackToDelete.id}/`, getAuthHeader());
            toast.success("Đã xóa nội dung góp ý.");
            setDeleteModal(false);
            setFeedbackToDelete(null);
            fetchFeedbacks(selectedDoc.id);
        } catch (e) {
            const errMsg = e?.response?.data?.detail || e?.response?.data?.error || e?.message || "Lỗi không xác định";
            console.error("[DeleteFeedback] Error:", e?.response?.status, errMsg);
            toast.error(`Lỗi khi xóa góp ý: ${errMsg}`);
        } finally {
            setDeleting(false);
        }
    };

    const confirmDeleteAll = async () => {
        if (!selectedDoc) return;
        setFullDeleting(true);
        try {
            await axios.post('/api/feedbacks/delete_all/', {
                document_id: selectedDoc.id
            }, getAuthHeader());
            toast.success(`Đã xóa toàn bộ nội dung góp ý của dự thảo: ${selectedDoc.project_name}`);
            setFullDeleteModal(false);
            fetchFeedbacks(selectedDoc.id);
        } catch (e) {
            toast.error("Lỗi khi xóa toàn bộ dữ liệu.");
        } finally {
            setFullDeleting(false);
        }
    };

    const handleViewNode = (nodeId, label) => {
        fetchNodeDetails(nodeId, label);
    };

    const handleOpenAssignModal = (fb) => {
        setAssignTarget(fb.id); // SỬA: Lưu Feedback ID thay vì Node ID
        setAssignUserIds(fb.assigned_users ? fb.assigned_users.map(u => u.id) : []);
        setIsAssignModalOpen(true);
    };

    const handleSaveAssignment = async () => {
        if (!selectedDoc || !assignTarget) return;
        setAssigningLoading(true);
        try {
            // SỬA: Gọi API phân công chuyên biệt cho từng góp ý
            await axios.post(`/api/feedbacks/assign_feedbacks/`, {
                document_id: selectedDoc.id,
                assignments: [
                    {
                        feedback_id: assignTarget,
                        user_ids: assignUserIds
                    }
                ]
            }, getAuthHeader());
            
            toast.success("Cập nhật phân công thành công!");
            setIsAssignModalOpen(false);
            fetchFeedbacks(selectedDoc.id, currentPage);
        } catch (error) {
            console.error("Assignment error:", error);
            toast.error("Lỗi khi phân công: " + (error.response?.data?.error || "Vui lòng thử lại sau."));
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
            const data = res.data || res;
            setSelectedNodeData(data);
        } catch (e) {
            toast.error("Không thể tải nội dung Điều.");
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
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Danh sách Góp ý" pageTitle="Hệ thống" />

                    <Row>
                        {/* LEFT: Documents List */}
                        <Col lg={2}>
                            <Card className="shadow-sm border-0">
                                <CardHeader className="bg-light border-0 py-2">
                                    <h5 className="card-title mb-0 fs-12 text-uppercase text-muted fw-bold">Dự thảo chủ trì</h5>
                                </CardHeader>
                                <CardBody className="p-0">
                                    <div className="p-2 bg-light border-bottom">
                                        <div className="search-box">
                                            <Input
                                                type="text"
                                                className="form-control form-control-sm fs-11"
                                                placeholder="Tìm..."
                                                value={docSearch}
                                                onChange={(e) => setDocSearch(e.target.value)}
                                            />
                                            <i className="ri-search-line search-icon fs-11 ms-0"></i>
                                        </div>
                                    </div>
                                    <div style={{ maxHeight: '700px', overflowY: 'auto' }}>
                                        <ul className="list-group list-group-flush border-0">
                                            {sortedDocs.map(doc => (
                                                <li
                                                    key={doc.id}
                                                    className={`list-group-item list-group-item-action cursor-pointer px-2 py-2 ${selectedDoc?.id === doc.id ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setSelectedDoc(doc);
                                                        fetchFeedbacks(doc.id);
                                                    }}
                                                >
                                                    <div className="d-flex align-items-center">
                                                        <div className="flex-grow-1 overflow-hidden">
                                                            <h6 className={`mb-0 fs-13 text-truncate ${selectedDoc?.id === doc.id ? 'text-white' : 'text-body-emphasis'}`} title={doc.project_name}>
                                                                {doc.project_name}
                                                            </h6>
                                                            <div className={`text-truncate fs-12 ${selectedDoc?.id === doc.id ? 'text-white-50' : 'text-muted-emphasis'}`}>
                                                                {doc.drafting_agency || '-'}
                                                            </div>
                                                        </div>
                                                        <div className="flex-shrink-0 ms-1">
                                                            <Badge color={selectedDoc?.id === doc.id ? "light" : "primary"} pill className={`fs-11 ${selectedDoc?.id === doc.id ? 'text-primary' : 'bg-primary-subtle text-primary'}`}>
                                                                {doc.resolved_feedbacks || 0}/{doc.total_feedbacks || 0}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>

                        {/* RIGHT: Feedbacks List */}
                        <Col lg={10}>
                            <Card className="shadow-sm border-0">
                                <CardHeader className="d-flex align-items-center bg-light border-0">
                                    <div className="flex-grow-1">
                                        <h5 className="card-title mb-0 fw-bold">
                                            <i className="ri-discuss-line align-bottom me-1 text-primary"></i>
                                            Ý kiến góp ý: {selectedDoc?.project_name}
                                        </h5>
                                    </div>
                                    <div className="flex-shrink-0 d-flex gap-2">
                                        <div className="search-box">
                                            <Input
                                                type="text"
                                                className="form-control border-light"
                                                placeholder="Tìm trong danh sách..."
                                                value={tableSearch}
                                                onChange={(e) => setTableSearch(e.target.value)}
                                            />
                                            <i className="ri-search-line search-icon"></i>
                                        </div>
                                        <Button 
                                            color="danger" 
                                            outline 
                                            className="btn-icon" 
                                            onClick={() => setFullDeleteModal(true)} 
                                            disabled={loading || feedbacks.length === 0}
                                            title="Xóa toàn bộ góp ý của dự thảo này"
                                        >
                                            <i className="ri-delete-bin-4-line"></i>
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardBody>
                                    {/* Action Row - Filters */}
                                    <Row className="g-2 mb-3">
                                        <Col md={2}>
                                            <div className="input-group input-group-sm">
                                                <Label className="input-group-text bg-light border-light text-muted">Điều/Khoản</Label>
                                                <select
                                                    className="form-select border-light bg-light"
                                                    value={selectedNodeId}
                                                    onChange={(e) => setSelectedNodeId(e.target.value)}
                                                >
                                                    <option value="all">Tất cả Điều/Khoản</option>
                                                    {docNodes.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                                                </select>
                                            </div>
                                        </Col>
                                        <Col md={2}>
                                            <div className="input-group input-group-sm">
                                                <Label className="input-group-text bg-light border-light text-muted">Cơ quan</Label>
                                                <select
                                                    className="form-select border-light bg-light"
                                                    value={selectedAgency}
                                                    onChange={(e) => setSelectedAgency(e.target.value)}
                                                >
                                                    <option value="all">Tất cả Cơ quan</option>
                                                    {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                </select>
                                            </div>
                                        </Col>
                                        <Col md={2}>
                                            <div className="input-group input-group-sm">
                                                <Label className="input-group-text bg-light border-light text-muted">Cán bộ</Label>
                                                <select
                                                    className="form-select border-light bg-light"
                                                    value={selectedSpecialist}
                                                    onChange={(e) => setSelectedSpecialist(e.target.value)}
                                                >
                                                    <option value="all">Tất cả Cán bộ</option>
                                                    <option value="none">Chưa giao</option>
                                                    {specialists.map(s => <option key={s.id} value={s.id}>{s.full_name || s.username}</option>)}
                                                </select>
                                            </div>
                                        </Col>
                                        <Col md={2}>
                                            <div className="input-group input-group-sm">
                                                <Label className="input-group-text bg-light border-light text-muted">Tình trạng</Label>
                                                <select
                                                    className="form-select border-light bg-light"
                                                    value={selectedStatus}
                                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                                >
                                                    <option value="all">Tất cả Ý kiến</option>
                                                    <option value="pending">Chưa giải trình</option>
                                                    <option value="explained">Đã giải trình</option>
                                                    <option value="accepted">Đã tiếp thu</option>
                                                    <option value="partially_accepted">Tiếp thu một phần</option>
                                                    <option value="agreed">Thống nhất với dự thảo</option>
                                                </select>
                                            </div>
                                        </Col>
                                        <Col className="text-end">
                                            <Badge color="soft-info" className="fs-12 p-2">
                                                <i className="ri-information-line align-bottom me-1"></i>
                                                Tổng số {totalCount} ý kiến
                                            </Badge>
                                        </Col>
                                    </Row>

                                    {loading ? (
                                        <div className="text-center py-5">
                                            <Spinner color="primary" />
                                            <p className="mt-2 text-muted small italic">Đang tải dữ liệu góp ý...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="table-responsive">
                                                <Table className="table-bordered table-hover align-middle mb-0">
                                                    <thead className="bg-primary-subtle text-primary fs-13 text-uppercase">
                                                        <tr className="text-center align-middle">
                                                            <th style={{ width: '50px' }}>STT</th>
                                                            <th>Vị trí / Điều</th>
                                                            <th style={{ width: '150px' }}>Cán bộ thụ lý</th>
                                                            <th style={{ minWidth: '250px' }}>Nội dung góp ý</th>
                                                            <th>Cơ quan</th>
                                                            <th style={{ minWidth: '250px' }}>Ý KIẾN GIẢI TRÌNH, TIẾP THU</th>
                                                            <th style={{ width: '120px' }}>Hành động</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredFeedbacks.map((fb, idx) => (
                                                            <tr key={fb.id}>
                                                                <td className="text-center text-muted fw-medium">{(currentPage - 1) * pageSize + idx + 1}</td>
                                                                <td>
                                                                    <Button
                                                                        color="link"
                                                                        className="p-0 text-info fw-semibold text-decoration-none text-start"
                                                                        onClick={() => handleViewNode(fb.node_id, fb.node_label)}
                                                                    >
                                                                        {fb.node_label}
                                                                    </Button>
                                                                    <div className="text-body-secondary fs-12 mt-1 opacity-75 italic">
                                                                        {fb.node_path}
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div className="d-flex flex-wrap gap-1">
                                                                        {fb.assigned_users && fb.assigned_users.length > 0 ? (
                                                                            fb.assigned_users.map(u => (
                                                                                <Badge key={u.id} color="info" className="badge-soft-info border border-info-subtle">
                                                                                    {u.full_name}
                                                                                </Badge>
                                                                            ))
                                                                        ) : (
                                                                            <span className="text-muted fs-11 italic">Chưa phân công</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div style={{ whiteSpace: 'normal', fontSize: '14px' }}>
                                                                        {fb.content}
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <Badge color="soft-info" className="text-info fs-13 mt-1 fw-bold">{fb.contributing_agency}</Badge>
                                                                </td>
                                                                <td>
                                                                    {fb.explanation ? (
                                                                        <div style={{ whiteSpace: 'normal', fontSize: '15px', borderLeft: '4px solid #0ab39c', backgroundColor: 'rgba(10, 179, 156, 0.15)' }} className="p-2 rounded shadow-sm">
                                                                            <span style={{ color: '#ffffff', fontWeight: '600', display: 'block' }}>{fb.explanation}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-white-50 italic opacity-50 px-2 font-italic border-start">Chưa giải trình</span>
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    <div className="d-flex gap-1 justify-content-center">
                                                                        <Button
                                                                            color="primary"
                                                                            size="sm"
                                                                            className="btn-soft-primary btn-icon"
                                                                            onClick={() => handleOpenAssignModal(fb)}
                                                                            title="Phân công cán bộ"
                                                                        >
                                                                            <i className="ri-user-add-line"></i>
                                                                        </Button>
                                                                        <Button
                                                                            color="warning"
                                                                            size="sm"
                                                                            className="btn-soft-warning btn-icon"
                                                                            onClick={() => handleEditFeedback(fb)}
                                                                            title="Sửa nội dung & Gán lại"
                                                                        >
                                                                            <i className="ri-edit-line"></i>
                                                                        </Button>
                                                                        <Button
                                                                            color="danger"
                                                                            size="sm"
                                                                            className="btn-soft-danger btn-icon"
                                                                            onClick={() => handleDeleteFeedback(fb)}
                                                                            title="Xóa góp ý"
                                                                        >
                                                                            <i className="ri-delete-bin-line"></i>
                                                                        </Button>
                                                                        {!fb.explanation ? (
                                                                            <Button
                                                                                color="success"
                                                                                size="sm"
                                                                                className="btn-soft-success btn-icon"
                                                                                onClick={() => handleAction(fb, 'explain')}
                                                                                title="Giải trình"
                                                                            >
                                                                                <i className="ri-chat-1-line"></i>
                                                                            </Button>
                                                                        ) : (
                                                                            <>
                                                                                <Button
                                                                                    color="info"
                                                                                    size="sm"
                                                                                    className="btn-soft-info btn-icon"
                                                                                    onClick={() => handleAction(fb, 'edit')}
                                                                                    title="Sửa giải trình"
                                                                                >
                                                                                    <i className="ri-edit-2-line"></i>
                                                                                </Button>
                                                                                <Button
                                                                                    color="danger"
                                                                                    size="sm"
                                                                                    className="btn-soft-danger btn-icon"
                                                                                    onClick={() => handleDeleteExplanation(fb)}
                                                                                    title="Xóa giải trình"
                                                                                >
                                                                                    <i className="ri-close-line"></i>
                                                                                </Button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}

                                                        {filteredFeedbacks.length === 0 && (
                                                            <tr>
                                                                <td colSpan="7" className="text-center py-5 text-muted small italic">
                                                                    (Không có dữ liệu góp ý phù hợp với bộ lọc)
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </Table>
                                            </div>

                                            {/* Pagination Controls */}
                                            {totalCount > pageSize && (
                                                <div className="d-flex justify-content-between align-items-center mt-3">
                                                    <div className="text-muted fs-13">
                                                        Hiển thị <b>{(currentPage - 1) * pageSize + 1}</b> - <b>{Math.min(currentPage * pageSize, totalCount)}</b> trong tổng số <b>{totalCount}</b> ý kiến
                                                    </div>
                                                    <div className="d-flex gap-2">
                                                        <Button
                                                            color="light"
                                                            size="sm"
                                                            disabled={currentPage === 1}
                                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                        >
                                                            <i className="ri-arrow-left-s-line align-middle me-1"></i> Trước
                                                        </Button>
                                                        {(() => {
                                                            const totalPages = Math.ceil(totalCount / pageSize);
                                                            const pages = [];
                                                            for (let i = 1; i <= totalPages; i++) {
                                                                if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                                                                    pages.push(i);
                                                                } else if (i === currentPage - 2 || i === currentPage + 2) {
                                                                    pages.push('...');
                                                                }
                                                            }
                                                            return [...new Set(pages)].map((p, idx) => (
                                                                p === '...' ? (
                                                                    <span key={`dots-${idx}`} className="px-2">...</span>
                                                                ) : (
                                                                    <Button
                                                                        key={p}
                                                                        color={currentPage === p ? "primary" : "light"}
                                                                        size="sm"
                                                                        onClick={() => setCurrentPage(p)}
                                                                    >
                                                                        {p}
                                                                    </Button>
                                                                )
                                                            ));
                                                        })()}
                                                        <Button
                                                            color="light"
                                                            size="sm"
                                                            disabled={currentPage === Math.ceil(totalCount / pageSize)}
                                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                                        >
                                                            Sau <i className="ri-arrow-right-s-line align-middle ms-1"></i>
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                    {/* Assignment Modal */}
            <Modal isOpen={isAssignModalOpen} toggle={() => setIsAssignModalOpen(false)} centered>
                <ModalHeader toggle={() => setIsAssignModalOpen(false)} className="bg-light p-3">
                    <i className="ri-user-add-line align-middle me-2 text-primary"></i>
                    Phân công Cán bộ Giải trình
                </ModalHeader>
                <ModalBody>
                    <div className="mb-3">
                        <Label className="form-label">Chọn cán bộ (Chuyên viên) thụ lý cho nội dung này:</Label>
                        <Select
                            isMulti
                            options={specialists.map(s => ({ value: s.id, label: s.full_name || s.username }))}
                            value={specialists
                                .filter(s => assignUserIds.includes(s.id))
                                .map(s => ({ value: s.id, label: s.full_name || s.username }))
                            }
                            onChange={(selected) => setAssignUserIds(selected ? selected.map(opt => opt.value) : [])}
                            placeholder="Tìm kiếm và chọn cán bộ..."
                            classNamePrefix="react-select"
                            styles={selectStyles}
                        />
                        <div className="form-text mt-2 text-muted small">
                            <i className="ri-information-line me-1"></i>
                            Phân công này sẽ chỉ áp dụng cho <b>duy nhất</b> nội dung góp ý đang chọn.
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="light" onClick={() => setIsAssignModalOpen(false)} disabled={assigningLoading}>Đóng</Button>
                    <Button color="primary" onClick={handleSaveAssignment} disabled={assigningLoading}>
                        {assigningLoading ? <Spinner size="sm" /> : "Lưu phân công"}
                    </Button>
                </ModalFooter>
            </Modal>
        </Container>

                {/* Explanation Modal */}
                <Modal isOpen={isModalOpen} toggle={() => setIsModalOpen(!isModalOpen)} centered size="lg" contentClassName="border-0 shadow-lg">
                    <ModalHeader toggle={() => setIsModalOpen(!isModalOpen)} className="bg-primary-subtle text-primary">
                        <i className="ri-chat-history-line align-bottom me-1"></i> Hành động Giải trình
                    </ModalHeader>
                    <ModalBody>
                        {currentFeedback && (
                            <div className="mb-4 p-3 bg-light rounded border-start border-primary border-4">
                                <Row className="mb-2">
                                    <Col lg={6}><small className="text-muted d-block font-weight-bold">Điều góp ý:</small> <strong>{currentFeedback.node_label}</strong></Col>
                                    <Col lg={6}><small className="text-muted d-block font-weight-bold">Cơ quan:</small> <strong>{currentFeedback.contributing_agency}</strong></Col>
                                </Row>
                                <div className="mt-2 pt-2 border-top">
                                    <small className="text-muted d-block font-weight-bold mb-1">Nội dung góp ý:</small>
                                    <p className="mb-0 fs-14 italic" style={{ lineHeight: '1.5' }}>"{currentFeedback.content}"</p>
                                </div>
                            </div>
                        )}
                        <div className="form-group">
                            <Label className="form-label fw-bold"><i className="ri-edit-line me-1"></i> Nội dung giải trình (Tiếp thu/Giải trình bảo vệ):</Label>
                            <Input
                                type="textarea"
                                rows="8"
                                className="form-control border-dark-subtle"
                                style={{ backgroundColor: '#fff', color: '#000', fontSize: '14px', minHeight: '150px' }}
                                value={explanation}
                                onChange={(e) => setExplanation(e.target.value)}
                                placeholder="Nhập nội dung giải trình tại đây..."
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter className="bg-light">
                        <Button color="link" className="text-muted text-decoration-none shadow-none" onClick={() => setIsModalOpen(false)}>Hủy bỏ</Button>
                        <Button color="primary" className="btn-load shadow-md px-4" onClick={saveExplanation} disabled={saving}>
                            {saving ? <><Spinner size="sm" className="me-2" /> Đang lưu...</> : <><i className="ri-save-3-line align-bottom me-1"></i> Lưu Giải trình</>}
                        </Button>
                    </ModalFooter>
                </Modal>

                {/* View Node Content Modal */}
                <Modal isOpen={isNodeModalOpen} toggle={() => setIsNodeModalOpen(!isNodeModalOpen)} centered size="lg" contentClassName="border-0 shadow-lg">
                    <ModalHeader toggle={() => setIsNodeModalOpen(!isNodeModalOpen)} className="bg-info-subtle text-info p-3">
                        <div className="d-flex align-items-center">
                            <div className="flex-shrink-0">
                                <i className="ri-article-line fs-22 align-middle me-2"></i>
                            </div>
                            <div className="flex-grow-1">
                                <h5 className="modal-title fs-16 mb-0">Nội dung chi tiết: {selectedNodeData?.node_label}</h5>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="p-4">
                        {nodeLoading ? (
                            <div className="text-center py-5">
                                <Spinner color="info" />
                                <p className="mt-2 text-muted fw-medium">Đang truy xuất dữ liệu từ hệ thống...</p>
                            </div>
                        ) : (
                            <div className="node-content-viewer" style={{ maxHeight: '700px', overflowY: 'auto' }}>
                                <div className="p-3 bg-light-subtle rounded border">
                                    {/* Article Label and Title (Line 1) */}
                                    <h5 className="fw-bold mb-3 text-primary border-bottom pb-2">
                                        {selectedNodeData?.node_label}
                                        {selectedNodeData?.node_type === 'Điều' && selectedNodeData?.content && (
                                            <span className="ms-1">. {selectedNodeData.content.split('\n')[0]}</span>
                                        )}
                                    </h5>

                                    {/* Article Content (Khoản rơi / Line 2+) */}
                                    {selectedNodeData?.content ? (
                                        <div className="text-body fs-15 mb-3" style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                            {selectedNodeData?.node_type === 'Điều' ? (
                                                selectedNodeData.content.split('\n').slice(1).join('\n')
                                            ) : (
                                                selectedNodeData.content
                                            )}
                                        </div>
                                    ) : null}

                                    {/* Children Hierarchy Section - Integrated */}
                                    {selectedNodeData?.children && selectedNodeData.children.length > 0 && (
                                        <div className="ps-0">
                                            {selectedNodeData.children.map(child => (
                                                <div key={child.id} className="mb-2">
                                                    <div className="d-flex align-items-baseline">
                                                        <span className="me-2 text-dark fs-14 fw-medium" style={{ minWidth: '70px' }}>{child.node_label}.</span>
                                                        <div className="fs-14 text-body" style={{ whiteSpace: 'pre-wrap' }}>{child.content}</div>
                                                    </div>

                                                    {/* Grandchildren */}
                                                    {child.children && child.children.length > 0 && (
                                                        <div className="ms-5 mt-1 border-start ps-3">
                                                            {child.children.map(grand => (
                                                                <div key={grand.id} className="mb-1 d-flex align-items-baseline">
                                                                    <span className="me-2 text-muted fs-13" style={{ minWidth: '60px' }}>{grand.node_label}.</span>
                                                                    <span className="text-body fs-13">{grand.content}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter className="bg-light p-3">
                        <Button color="secondary" onClick={() => setIsNodeModalOpen(false)} className="px-4 btn-soft-secondary">
                            Đóng cửa sổ
                        </Button>
                    </ModalFooter>
                </Modal>

                {/* FULL DELETE MODAL */}
                <Modal isOpen={fullDeleteModal} toggle={() => setFullDeleteModal(!fullDeleteModal)} centered size="sm">
                    <ModalHeader className="bg-danger-subtle text-danger py-2">
                        <i className="ri-error-warning-line align-bottom me-1"></i> Xác nhận xóa sạch
                    </ModalHeader>
                    <ModalBody className="text-center p-4">
                        <div className="text-danger mb-3">
                            <i className="ri-delete-bin-fill display-5"></i>
                        </div>
                        <h5 className="fw-bold">Xóa TOÀN BỘ góp ý?</h5>
                        <p className="text-muted">Bạn có chắc chắn muốn xóa sạch toàn bộ <b>{feedbacks.length}</b> nội dung góp ý của dự thảo này không? Hành động này không thể hoàn tác.</p>
                        <div className="d-flex gap-2 justify-content-center mt-4">
                            <Button color="light" onClick={() => setFullDeleteModal(false)} disabled={fullDeleting}>Hủy</Button>
                            <Button color="danger" onClick={confirmDeleteAll} disabled={fullDeleting}>
                                {fullDeleting ? <Spinner size="sm" /> : "Đúng, xóa tất cả"}
                            </Button>
                        </div>
                    </ModalBody>
                </Modal>

                {/* EDIT FEEDBACK MODAL */}
                <Modal isOpen={isEditModalOpen} toggle={() => setIsEditModalOpen(!isEditModalOpen)} centered size="lg" contentClassName="border-0 shadow-lg">
                    <ModalHeader toggle={() => setIsEditModalOpen(!isEditModalOpen)} className="bg-warning-subtle text-warning">
                        <i className="ri-edit-box-line align-bottom me-1"></i> Chỉnh sửa & Gắn lại Góp ý
                    </ModalHeader>
                    <ModalBody>
                        <Row className="g-3">
                            <Col lg={12}>
                                <Label className="form-label fw-bold small text-muted text-uppercase">Gán lại vào Điều/Khoản:</Label>
                                <Select
                                    value={docNodes.find(n => n.value === editNodeId)}
                                    onChange={(opt) => setEditNodeId(opt ? opt.value : null)}
                                    options={docNodes}
                                    placeholder="Chọn vị trí Điều/Khoản mới..."
                                    isClearable
                                    styles={selectStyles}
                                />
                            </Col>
                            <Col lg={8}>
                                <Label className="form-label fw-bold small text-muted text-uppercase">Cơ quan góp ý:</Label>
                                <div className="d-flex gap-2">
                                    <div className="flex-grow-1">
                                        <CreatableSelect
                                            value={agencies.find(a => a.id === editAgencyId) ? { value: editAgencyId, label: agencies.find(a => a.id === editAgencyId).name } : null}
                                            onChange={(opt) => setEditAgencyId(opt ? opt.value : null)}
                                            options={agencies.map(a => ({ value: a.id, label: a.name }))}
                                            placeholder="Chọn hoặc gõ tên đơn vị mới..."
                                            isClearable
                                            styles={selectStyles}
                                            onCreateOption={(name) => {
                                                setNewAgencyName(name);
                                                setAgencyModal(true);
                                            }}
                                        />
                                    </div>
                                    <Button color="success" outline onClick={() => { setNewAgencyName(""); setAgencyModal(true); }} title="Thêm đơn vị mới">
                                        <i className="ri-add-line"></i>
                                    </Button>
                                </div>
                            </Col>
                            <Col lg={4}>
                                <Label className="form-label fw-bold small text-muted text-uppercase">Số hiệu công văn:</Label>
                                <Input
                                    type="text"
                                    className="form-control"
                                    value={editDocNumber}
                                    onChange={(e) => setEditDocNumber(e.target.value)}
                                    placeholder="Số hiệu CV..."
                                />
                            </Col>
                            <Col lg={12}>
                                <Label className="form-label fw-bold small text-muted text-uppercase">Nội dung góp ý gốc:</Label>
                                <Input
                                    type="textarea"
                                    rows="10"
                                    className="form-control border-dark-subtle"
                                    style={{ backgroundColor: '#fff', color: '#000', fontSize: '14px' }}
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    placeholder="Chỉnh sửa nội dung góp ý tại đây..."
                                />
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter className="bg-light">
                        <Button color="link" className="text-muted text-decoration-none shadow-none" onClick={() => setIsEditModalOpen(false)}>Hủy bỏ</Button>
                        <Button color="warning" className="btn-load shadow-md px-4" onClick={saveFeedbackEdit} disabled={updating}>
                            {updating ? <><Spinner size="sm" className="me-2" /> Đang lưu...</> : <><i className="ri-save-3-line align-bottom me-1"></i> Lưu thay đổi</>}
                        </Button>
                    </ModalFooter>
                </Modal>
                {/* QUICK ADD AGENCY MODAL (Nested) */}
                <Modal isOpen={agencyModal} toggle={toggleAgencyModal} centered size="md" style={{ zIndex: 1060 }}>
                    <ModalHeader toggle={toggleAgencyModal} className="bg-success-subtle text-success">
                        <i className="ri-building-line align-bottom me-1"></i> Thêm nhanh đơn vị mới
                    </ModalHeader>
                    <ModalBody>
                        <div className="mb-3">
                            <Label className="form-label">Tên đơn vị:</Label>
                            <Input
                                type="text"
                                value={newAgencyName}
                                onChange={(e) => setNewAgencyName(e.target.value)}
                                placeholder="Nhập tên đơn vị đầy đủ..."
                            />
                        </div>
                        <div className="mb-3">
                            <Label className="form-label">Phân loại đơn vị:</Label>
                            <CreatableSelect
                                isClearable
                                options={categories.map(c => ({ value: c.id, label: c.name }))}
                                value={newAgencyCategory}
                                onChange={(opt) => setNewAgencyCategory(opt)}
                                placeholder="Chọn hoặc gõ phân loại mới..."
                                styles={selectStyles}
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="light" onClick={toggleAgencyModal}>Bỏ qua</Button>
                        <Button color="success" onClick={handleQuickAgencySave} disabled={addingAgency}>
                            {addingAgency ? <Spinner size="sm" /> : "Lưu đơn vị"}
                        </Button>
                    </ModalFooter>
                </Modal>
                {/* DELETE CONFIRMATION MODAL */}
                <Modal isOpen={deleteModal} toggle={() => setDeleteModal(!deleteModal)} centered size="sm">
                    <ModalHeader toggle={() => setDeleteModal(!deleteModal)} className="bg-danger-subtle text-danger">
                        <i className="ri-delete-bin-line align-bottom me-1"></i> Xác nhận xóa
                    </ModalHeader>
                    <ModalBody className="text-center p-4">
                        <div className="text-danger mb-4">
                            <i className="ri-error-warning-line display-4"></i>
                        </div>
                        <h4 className="mb-2">Bạn có chắc chắn?</h4>
                        <p className="text-muted fs-14 mb-0">
                            Bạn đang chuẩn bị xóa nội dung góp ý này. Hành động này không thể hoàn tác.
                        </p>
                    </ModalBody>
                    <ModalFooter className="bg-light p-3">
                        <Button color="link" className="text-muted text-decoration-none shadow-none" onClick={() => setDeleteModal(false)} disabled={deleting}>Hủy bỏ</Button>
                        <Button color="danger" className="px-4" onClick={confirmDeleteFeedback} disabled={deleting}>
                            {deleting ? <><Spinner size="sm" className="me-2" /> Đang xóa...</> : "Xác nhận xóa"}
                        </Button>
                    </ModalFooter>
                </Modal>
            </div>
        </React.Fragment>
    );
};

export default FeedbackList;
