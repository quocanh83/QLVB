import React, { useEffect, useMemo, useState } from 'react';
import {
    Container, Row, Col, Card, CardBody, CardHeader, Button, Badge, Modal, ModalHeader, ModalBody, ModalFooter, Input, Label, Spinner, Table,
    UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem, FormGroup, Collapse
} from 'reactstrap';
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
import Pagination from "../../Components/Common/Pagination";

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
    const [explanation, setExplanation] = useState("");
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

    // Mobile specific UI state
    const [showFilters, setShowFilters] = useState(false);
    const [showDocSelect, setShowDocSelect] = useState(false);
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
            console.error("Loi khi tai danh sach can bo");
        }
    };

    const fetchAgenciesOnly = async () => {
        try {
            const res = await axios.get('/api/settings/agencies/', getAuthHeader());
            const data = res.results || res || [];
            setAgencies(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Loi khi tai danh sach don vi");
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
            toast.error("Khong the tai danh sach du thao.");
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
            console.error("Loi khi tai danh sach Dieu/Khoan.");
        }
    };

    const handleAction = (fb) => {
        setCurrentFeedback(fb);
        setExplanation(fb.explanation || "");
        setIsModalOpen(true);
    };

    const handleEditFeedback = (fb) => {
        setCurrentFeedback(fb);
        setEditContent(fb.content || "");
        let initialVal = null;
        if (fb.node_id) initialVal = `node-${fb.node_id}`;
        else if (fb.appendix_id) initialVal = `app-${fb.appendix_id}`;
        setEditNodeId(initialVal);
        setEditAgencyId(fb.agency);
        setEditDocNumber(fb.official_doc_number || "");
        setIsEditModalOpen(true);
    };

    const saveFeedbackEdit = async () => {
        if (!editContent.trim()) {
            toast.warning("Vui long nhap noi dung gop y.");
            return;
        }
        setUpdating(true);
        try {
            let nodeVal = null;
            let appendixVal = null;
            if (editNodeId) {
                if (editNodeId.startsWith("node-")) nodeVal = parseInt(editNodeId.replace("node-", ""));
                else if (editNodeId.startsWith("app-")) appendixVal = parseInt(editNodeId.replace("app-", ""));
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
            toast.success("Cap nhat gop y thanh cong.");
            setIsEditModalOpen(false);
            fetchFeedbacks(selectedDoc.id);
        } catch (error) {
            toast.error("Loi khi cap nhat du lieu.");
        } finally {
            setUpdating(false);
        }
    };

    const saveExplanation = async () => {
        if (!explanation.trim()) {
            toast.warning("Vui long nhap noi dung giai trinh.");
            return;
        }
        setSaving(true);
        try {
            await axios.post("/api/feedbacks/save_explanation/", {
                document_id: selectedDoc.id,
                target_type: "Feedback",
                object_id: currentFeedback.id,
                explanation: explanation
            }, getAuthHeader());
            toast.success("Da luu giai trinh.");
            setIsModalOpen(false);
            fetchFeedbacks(selectedDoc.id);
        } catch (e) {
            toast.error("Loi khi luu giai trinh.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteExplanation = async (fb) => {
        if (!window.confirm("Ban co chac chan muon xoa giai trinh?")) return;
        try {
            await axios.post("/api/feedbacks/delete_explanation/", {
                document_id: selectedDoc.id,
                target_type: "Feedback",
                object_id: fb.id
            }, getAuthHeader());
            toast.success("Da xoa giai trinh.");
            fetchFeedbacks(selectedDoc.id);
        } catch (e) {
            toast.error("Loi khi xoa giai trinh.");
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
            toast.success("Da xoa gop y.");
            setDeleteModal(false);
            fetchFeedbacks(selectedDoc.id);
        } catch (e) {
            toast.error("Loi khi xoa gop y.");
        } finally {
            setDeleting(false);
        }
    };

    const confirmDeleteAll = async () => {
        setFullDeleting(true);
        try {
            await axios.post("/api/feedbacks/delete_all/", { document_id: selectedDoc.id }, getAuthHeader());
            toast.success("Da xoa toan bo gop y.");
            setFullDeleteModal(false);
            fetchFeedbacks(selectedDoc.id);
        } catch (e) {
            toast.error("Loi khi xoa du lieu.");
        } finally {
            setFullDeleting(false);
        }
    };

    const handleViewNode = (nodeId, label) => {
        setIsNodeModalOpen(true);
        setNodeLoading(true);
        setSelectedNodeData({ node_label: label, content: 'Dang tai...', node_type: '' });
        axios.get(`/api/documents/nodes/${nodeId}/full_context/`, getAuthHeader())
            .then(res => setSelectedNodeData(res.data || res))
            .catch(() => setSelectedNodeData({ node_label: label, content: 'Loi tai noi dung.' }))
            .finally(() => setNodeLoading(false));
    };

    const handleOpenAssignModal = (fb) => {
        setAssignTarget(fb.id);
        setAssignUserIds(fb.assigned_users ? fb.assigned_users.map(u => u.id) : []);
        setIsAssignModalOpen(true);
    };

    const handleSaveAssignment = async () => {
        setAssigningLoading(true);
        try {
            await axios.post("/api/feedbacks/assign_feedbacks/", {
                document_id: selectedDoc.id,
                assignments: [{ feedback_id: assignTarget, user_ids: assignUserIds }]
            }, getAuthHeader());
            toast.success("Phan cong thanh cong!");
            setIsAssignModalOpen(false);
            fetchFeedbacks(selectedDoc.id, currentPage);
        } catch (error) {
            toast.error("Loi khi phan cong.");
        } finally {
            setAssigningLoading(false);
        }
    };

    const selectStyles = {
        control: (base) => ({
            ...base,
            background: "rgba(255, 255, 255, 0.05)",
            borderColor: "rgba(255, 255, 255, 0.1)",
            color: "white",
            "&:hover": { borderColor: "rgba(255, 255, 255, 0.2)" }
        }),
        menu: (base) => ({
            ...base,
            background: "#1e2027",
            border: "1px solid rgba(255,255,255,0.1)",
            zIndex: 9999
        }),
        option: (base, { isFocused, isSelected }) => ({
            ...base,
            background: isSelected ? "var(--kit-primary)" : isFocused ? "rgba(255,255,255,0.05)" : "transparent",
            color: "white"
        }),
        singleValue: (base) => ({ ...base, color: "white" }),
        input: (base) => ({ ...base, color: "white" }),
        placeholder: (base) => ({ ...base, color: "rgba(255,255,255,0.3)" })
    };

    return (
        <div className="designkit-wrapper designkit-layout-root">
            <style>
                {`
                    @media (max-width: 991px) {
                        html, body, #layout-wrapper, .main-content, .page-content, .modern-page-content {
                            height: auto !important;
                            min-height: 100vh !important;
                            overflow-y: visible !important;
                            overflow-x: hidden !important;
                        }
                        .main-content { display: block !important; }
                    }
                    @media (max-width: 768px) {
                        .modern-table tbody tr {
                            display: block !important;
                            margin-bottom: 1.25rem !important;
                            border: 1px solid rgba(255,255,255,0.08) !important;
                            padding: 1rem !important;
                            background: rgba(255,255,255,0.02) !important;
                        }
                        .modern-table tbody td {
                            display: flex !important;
                            flex-direction: column;
                            padding: 0.5rem 0 !important;
                            text-align: left !important;
                            border: none !important;
                        }
                    }
                `}
            </style>
            
            <div className="modern-page-content" style={{ padding: 0, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
                <Container fluid className="px-0 pb-0">
                    <ToastContainer closeButton={false} />

                    <ModernHeader
                        title="Quan ly Gop y"
                        subtitle={!selectedDoc ? "Chua chon du thao" : selectedDoc.project_name}
                        actions={
                            <div className="d-flex gap-2">
                                <ModernButton variant="primary-ghost" className="d-md-none" onClick={() => setShowDocSelect(!showDocSelect)}>
                                    <i className={showDocSelect ? "ri-filter-off-line" : "ri-filter-3-line"}></i>
                                </ModernButton>
                                <ModernButton variant="ghost" size="sm" onClick={() => fetchFeedbacks(selectedDoc?.id, currentPage)} className="d-none d-md-flex">
                                    Refresh
                                </ModernButton>
                            </div>
                        }
                    />

                    <div className="workspace-pane-layout">
                        <div className="pane-content">
                            <div className="feedback-main-scroll p-2 p-md-4" style={{ paddingBottom: "100px" }}>
                                
                                {/* Document Select */}
                                <div className={classnames("mb-4", { "d-none d-lg-block": !showDocSelect })}>
                                    <div className="modern-card p-3 p-md-4 bg-white-5 border-white-10">
                                        <Select
                                            styles={selectStyles}
                                            options={documents.map(doc => ({ value: doc.id, label: doc.project_name, data: doc }))}
                                            value={selectedDoc ? { value: selectedDoc.id, label: selectedDoc.project_name } : null}
                                            onChange={(opt) => { setSelectedDoc(opt.data); fetchFeedbacks(opt.value, 1); }}
                                            placeholder="Chon du thao..."
                                        />
                                    </div>
                                </div>

                                {selectedDoc ? (
                                    <>
                                        <div className="modern-card p-4 bg-white-5">
                                            <div className="d-flex justify-content-between align-items-center mb-4">
                                                <h5 className="text-white mb-0">Ket qua: {totalCount}</h5>
                                                <ModernSearchBox placeholder="Tim kiem..." value={tableSearch} onChange={(e) => setTableSearch(e.target.value)} style={{maxWidth:"200px"}} />
                                            </div>

                                            <ModernTable>
                                                <tbody>
                                                    {loading ? (
                                                        <tr><td className="text-center py-5"><Spinner color="primary" /></td></tr>
                                                    ) : feedbacks.length > 0 ? feedbacks.map((fb, idx) => (
                                                        <tr key={fb.id}>
                                                            <td data-label="STT" style={{width:"40px"}}>#{(currentPage-1)*pageSize + idx + 1}</td>
                                                            <td data-label="Vi tri">
                                                                <div className="text-primary fw-bold cursor-pointer" onClick={() => handleViewNode(fb.node_id, fb.node_label)}>{fb.node_label}</div>
                                                            </td>
                                                            <td data-label="Co quan">{fb.contributing_agency}</td>
                                                            <td data-label="Noi dung" className="text-white-70">{fb.content}</td>
                                                            <td data-label="Giai trinh">
                                                                {fb.explanation ? <div className="p-2 rounded bg-success-opacity text-white-90 Small italic">"{fb.explanation}"</div> : <span className="text-white-20 Small">Chua giai trinh</span>}
                                                            </td>
                                                            <td data-label="Thao tac" className="text-center">
                                                                <UncontrolledDropdown>
                                                                    <DropdownToggle tag="button" className="modern-btn-minimal"><i className="ri-more-2-fill"></i></DropdownToggle>
                                                                    <DropdownMenu container="body" className="dropdown-menu-dark">
                                                                        <DropdownItem onClick={() => handleAction(fb)}>Giai trinh</DropdownItem>
                                                                        <DropdownItem onClick={() => handleEditFeedback(fb)}>Sua du lieu</DropdownItem>
                                                                        <DropdownItem onClick={() => handleDeleteFeedback(fb)} className="text-danger">Xoa</DropdownItem>
                                                                    </DropdownMenu>
                                                                </UncontrolledDropdown>
                                                            </td>
                                                        </tr>
                                                    )) : (
                                                        <tr><td className="text-center py-5 text-white-40">Khong co du lieu.</td></tr>
                                                    )}
                                                </tbody>
                                            </ModernTable>
                                        </div>

                                        {/* Mobile Pagination */}
                                        <div className="d-md-none mt-4 pb-5">
                                            {totalCount > pageSize && !loading && (
                                                <div className="d-flex flex-column gap-2 text-center">
                                                    <div className="text-white-40 Small">{Math.min(currentPage*pageSize-pageSize+1, totalCount)}-{Math.min(currentPage*pageSize, totalCount)}/{totalCount}</div>
                                                    <div className="d-flex gap-2">
                                                        <ModernButton variant="ghost" className="flex-grow-1" disabled={currentPage === 1} onClick={() => { setCurrentPage(p => p - 1); window.scrollTo(0,0); }}>Truoc</ModernButton>
                                                        <ModernButton variant="ghost" className="flex-grow-1" disabled={currentPage * pageSize >= totalCount} onClick={() => { setCurrentPage(p => p + 1); window.scrollTo(0,0); }}>Sau</ModernButton>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-5 text-white-40">Vui long chon du thao.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </Container>
            </div>

            {/* Modals are kept minimal for rescue */}
            <Modal isOpen={isModalOpen} toggle={() => setIsModalOpen(false)} centered>
                <div className="modern-modal-content">
                    <div className="modal-header bg-success p-2 text-white">Giai trinh</div>
                    <div className="modal-body p-3 bg-black-20">
                        <Input type="textarea" rows="8" className="modern-input" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
                    </div>
                    <div className="modal-footer"><Button color="success" onClick={saveExplanation}>Luu</Button></div>
                </div>
            </Modal>
            
            <DeleteModal show={deleteModal} onDeleteClick={confirmDeleteFeedback} onCloseClick={() => setDeleteModal(false)} />
        </div>
    );
};

export default FeedbackList;
