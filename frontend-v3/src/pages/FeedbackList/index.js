import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Badge, Modal, ModalHeader, ModalBody, ModalFooter, Input, Label, Spinner, Table } from 'reactstrap';
import TableContainer from "../../Components/Common/TableContainerReactTable";
import BreadCrumb from '../../Components/Common/BreadCrumb';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import Select from 'react-select';
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
        background: "var(--vz-choices-bg)",
        zIndex: 5
    }),
    option: (base, state) => ({
        ...base,
        background: state.isSelected 
            ? "var(--vz-primary)" 
            : state.isFocused 
                ? "var(--vz-light)" 
                : "transparent",
        color: state.isSelected 
            ? "#fff" 
            : "var(--vz-body-color)",
        "&:hover": {
            background: "var(--vz-light)",
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
    
    // Modal state for Explanation
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentFeedback, setCurrentFeedback] = useState(null);
    const [explanation, setExplanation] = useState('');
    const [saving, setSaving] = useState(false);

    // Modal state for Viewing Node Content
    const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
    const [selectedNodeData, setSelectedNodeData] = useState(null);
    const [nodeLoading, setNodeLoading] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, []);

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

    const fetchFeedbacks = async (docId) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/feedbacks/by_document/?document_id=${docId}`, getAuthHeader());
            const data = res.results || res || [];
            const list = Array.isArray(data) ? data : [];
            setFeedbacks(list);
            setFilteredFeedbacks(list);
            
            // Generate unique agency options
            const agencies = [...new Set(list.map(fb => fb.contributing_agency))].filter(Boolean);
            setAgencyOptions(agencies);
            
            // Reset filters
            setSelectedAgency('all');
            setSelectedStatus('all');
        } catch (e) {
            toast.error("Không thể tải danh sách góp ý.");
            setFeedbacks([]);
            setFilteredFeedbacks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let result = feedbacks.filter(fb => {
            const matchesAgency = selectedAgency === 'all' || fb.contributing_agency === selectedAgency;
            const matchesStatus = selectedStatus === 'all' || 
                (selectedStatus === 'resolved' ? (fb.explanation && fb.explanation.trim() !== '') : (!fb.explanation || fb.explanation.trim() === ''));
            const matchesSearch = tableSearch === '' || 
                fb.content?.toLowerCase().includes(tableSearch.toLowerCase()) || 
                fb.node_label?.toLowerCase().includes(tableSearch.toLowerCase()) ||
                fb.contributing_agency?.toLowerCase().includes(tableSearch.toLowerCase());
            
            return matchesAgency && matchesStatus && matchesSearch;
        });
        
        setFilteredFeedbacks(result);
    }, [selectedAgency, selectedStatus, feedbacks, tableSearch]);

    const handleAction = (fb, actionType) => {
        setCurrentFeedback(fb);
        setExplanation(fb.explanation || '');
        setIsModalOpen(true);
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

    const handleViewNode = async (nodeId, label) => {
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
                                                            <h6 className={`mb-0 fs-13 text-truncate ${selectedDoc?.id === doc.id ? 'text-white' : ''}`} title={doc.project_name}>
                                                                {doc.project_name}
                                                            </h6>
                                                            <div className={`text-truncate fs-12 ${selectedDoc?.id === doc.id ? 'text-white-50' : 'text-muted'}`}>
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
                                    </div>
                                </CardHeader>
                                <CardBody>
                                    {/* Action Row - Filters */}
                                    <Row className="g-2 mb-3">
                                        <Col md={3}>
                                            <div className="input-group input-group-sm">
                                                <Label className="input-group-text bg-light border-light text-muted">Cơ quan</Label>
                                                <select 
                                                    className="form-select border-light bg-light" 
                                                    value={selectedAgency}
                                                    onChange={(e) => setSelectedAgency(e.target.value)}
                                                >
                                                    <option value="all">Tất cả đơn vị</option>
                                                    {agencyOptions.map(a => <option key={a} value={a}>{a}</option>)}
                                                </select>
                                            </div>
                                        </Col>
                                        <Col md={3}>
                                            <div className="input-group input-group-sm">
                                                <Label className="input-group-text bg-light border-light text-muted">Tình trạng</Label>
                                                <select 
                                                    className="form-select border-light bg-light" 
                                                    value={selectedStatus}
                                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                                >
                                                    <option value="all">Tất cả tình trạng</option>
                                                    <option value="unresolved">Chưa giải trình</option>
                                                    <option value="resolved">Đã giải trình</option>
                                                </select>
                                            </div>
                                        </Col>
                                        <Col className="text-end">
                                            <Badge color="soft-info" className="fs-12 p-2">
                                                <i className="ri-information-line align-bottom me-1"></i>
                                                Hiển thị {filteredFeedbacks.length} ý kiến
                                            </Badge>
                                        </Col>
                                    </Row>

                                    {loading ? (
                                        <div className="text-center py-5">
                                            <Spinner color="primary" />
                                            <p className="mt-2 text-muted small italic">Đang tải dữ liệu góp ý...</p>
                                        </div>
                                    ) : (
                                        <div className="table-responsive">
                                            <Table className="table-bordered table-hover align-middle mb-0">
                                                <thead className="bg-primary-subtle text-primary fs-13 text-uppercase">
                                                    <tr className="text-center align-middle">
                                                        <th style={{ width: '50px' }}>STT</th>
                                                        <th>Vị trí / Điều góp ý</th>
                                                        <th style={{ minWidth: '250px' }}>Nội dung góp ý</th>
                                                        <th>Cơ quan</th>
                                                        <th style={{ minWidth: '250px' }}>Nội dung giải trình</th>
                                                        <th style={{ width: '100px' }}>Hành động</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredFeedbacks.map((fb, idx) => (
                                                        <tr key={fb.id}>
                                                            <td className="text-center text-muted fw-medium">{idx + 1}</td>
                                                            <td>
                                                                <Button 
                                                                    color="link" 
                                                                    className="p-0 text-primary fw-medium text-decoration-none text-start"
                                                                    onClick={() => handleViewNode(fb.node_id, fb.node_label)}
                                                                >
                                                                    {fb.node_label}
                                                                </Button>
                                                                <div className="text-muted fs-12 mt-1 font-italic">
                                                                    {fb.node_path}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div style={{ whiteSpace: 'normal', fontSize: '14px' }}>
                                                                    {fb.content}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <Badge color="soft-info" className="text-info">{fb.contributing_agency}</Badge>
                                                            </td>
                                                            <td>
                                                                {fb.explanation ? (
                                                                    <div style={{ whiteSpace: 'normal', fontSize: '14px', borderLeft: '3px solid var(--vz-success)' }} className="p-2 bg-light-subtle rounded text-body">
                                                                        <span className="fw-medium">{fb.explanation}</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-muted small italic opacity-50 px-2 font-italic border-start">Chưa giải trình</span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                <div className="d-flex gap-1">
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
                                                                                <i className="ri-delete-bin-line"></i>
                                                                            </Button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}

                                                    {filteredFeedbacks.length === 0 && (
                                                        <tr>
                                                            <td colSpan="6" className="text-center py-5 text-muted small italic">
                                                                (Không có dữ liệu góp ý phù hợp với bộ lọc)
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </Table>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
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
                            {saving ? <><Spinner size="sm" className="me-2"/> Đang lưu...</> : <><i className="ri-save-3-line align-bottom me-1"></i> Lưu Giải trình</>}
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
            </div>
        </React.Fragment>
    );
};

export default FeedbackList;
