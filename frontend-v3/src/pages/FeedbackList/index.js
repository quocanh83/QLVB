import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Badge, Modal, ModalHeader, ModalBody, ModalFooter, Input, Label, Spinner } from 'reactstrap';
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
    
    // Filters
    const [agencyOptions, setAgencyOptions] = useState([]);
    const [selectedAgency, setSelectedAgency] = useState({ value: 'all', label: 'Tất cả Cơ quan' });
    const [selectedStatus, setSelectedStatus] = useState({ value: 'all', label: 'Tất cả Tình trạng' });
    
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
            const options = Array.isArray(data) ? data.map(doc => ({
                value: doc.id,
                label: doc.project_name
            })) : [];
            setDocuments(options);
            if (options.length > 0) {
                setSelectedDoc(options[0]);
                fetchFeedbacks(options[0].value);
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
            
            // Generate agency options for filter
            const agencies = [...new Set(list.map(fb => fb.contributing_agency))].filter(Boolean);
            setAgencyOptions([
                { value: 'all', label: 'Tất cả Cơ quan' },
                ...agencies.map(a => ({ value: a, label: a }))
            ]);
            
            // Reset filters
            setSelectedAgency({ value: 'all', label: 'Tất cả Cơ quan' });
            setSelectedStatus({ value: 'all', label: 'Tất cả Tình trạng' });
        } catch (e) {
            toast.error("Không thể tải danh sách góp ý.");
            setFeedbacks([]);
            setFilteredFeedbacks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let result = [...feedbacks];
        
        if (selectedAgency && selectedAgency.value !== 'all') {
            result = result.filter(fb => fb.contributing_agency === selectedAgency.value);
        }
        
        if (selectedStatus && selectedStatus.value !== 'all') {
            if (selectedStatus.value === 'resolved') {
                result = result.filter(fb => fb.explanation && fb.explanation.trim() !== '');
            } else {
                result = result.filter(fb => !fb.explanation || fb.explanation.trim() === '');
            }
        }
        
        setFilteredFeedbacks(result);
    }, [selectedAgency, selectedStatus, feedbacks]);

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
                document_id: selectedDoc.value,
                target_type: 'Feedback',
                object_id: currentFeedback.id,
                content: explanation
            }, getAuthHeader());
            
            toast.success("Đã ghi nhận nội dung giải trình.");
            setIsModalOpen(false);
            fetchFeedbacks(selectedDoc.value); // Refresh list
        } catch (e) {
            toast.error("Lỗi khi lưu giải trình.");
        } finally {
            setSaving(false);
        }
    };

    const handleViewNode = async (nodeId, label) => {
        setIsNodeModalOpen(true);
        setNodeLoading(true);
        setSelectedNodeData({ node_label: label, content: 'Đang tải...' });
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

    const columns = useMemo(() => [
        {
            header: "TT",
            accessorKey: "stt",
            cell: (cell) => <span className="fw-medium">{cell.getValue()}</span>,
            enableColumnFilter: false,
        },
        {
            header: "Điều góp ý",
            accessorKey: "node_label",
            cell: (cell) => (
                <div className="d-flex flex-column gap-1">
                    <Button 
                        color="soft-primary" 
                        size="sm" 
                        className="btn-soft-primary d-flex align-items-center justify-content-between text-start fw-bold"
                        onClick={() => handleViewNode(cell.row.original.node_id, cell.getValue())}
                    >
                        <span>{cell.getValue()}</span>
                        <i className="ri-arrow-down-s-line ms-1 fs-14"></i>
                    </Button>
                    <small className="text-muted ps-1">{cell.row.original.node_path}</small>
                </div>
            ),
            enableColumnFilter: false,
        },
        {
            header: "Nội dung góp ý",
            accessorKey: "content",
            cell: (cell) => (
                <div style={{ whiteSpace: 'normal', minWidth: '200px' }}>
                    {cell.getValue()}
                </div>
            ),
            enableColumnFilter: false,
        },
        {
            header: "Cơ quan góp ý",
            accessorKey: "contributing_agency",
            cell: (cell) => <span className="text-primary fw-medium">{cell.getValue()}</span>,
            enableColumnFilter: false,
        },
        {
            header: "Nội dung giải trình",
            accessorKey: "explanation",
            cell: (cell) => (
                <div style={{ whiteSpace: 'normal', minWidth: '200px' }} className="text-muted italic">
                    {cell.getValue() || "---"}
                </div>
            ),
            enableColumnFilter: false,
        },
        {
            header: "Tình trạng",
            accessorKey: "status",
            cell: (cell) => {
                const hasExplanation = cell.row.original.explanation;
                if (hasExplanation) {
                    return <Badge className="badge-soft-success">Đã giải trình</Badge>;
                }
                return <Badge className="badge-soft-warning">Chưa giải trình</Badge>;
            },
            enableColumnFilter: false,
        },
        {
            header: "Hành động",
            cell: (cell) => {
                const fb = cell.row.original;
                const hasExplanation = fb.explanation;
                return (
                    <div className="d-flex gap-2">
                        {!hasExplanation ? (
                            <Button color="primary" size="sm" className="btn-soft-primary" onClick={() => handleAction(fb, 'explain')}>
                                <i className="ri-chat-1-line align-bottom me-1"></i> Giải trình
                            </Button>
                        ) : (
                            <>
                                <Button color="info" size="sm" className="btn-soft-info" onClick={() => handleAction(fb, 'edit')}>
                                    <i className="ri-edit-2-line align-bottom"></i>
                                </Button>
                                <Button color="warning" size="sm" className="btn-soft-warning" onClick={() => handleAction(fb, 're-explain')}>
                                    <i className="ri-restart-line align-bottom me-1"></i> Giải trình lại
                                </Button>
                            </>
                        )}
                    </div>
                );
            },
            enableColumnFilter: false,
        }
    ], [selectedDoc]);

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Danh sách Góp ý" pageTitle="Quản lý" />
                    <Row className="mb-4 align-items-center">
                        <Col lg={4}>
                            <div className="p-3 bg-light rounded-3 shadow-sm card-animate">
                                <Label className="form-label fw-semibold text-uppercase fs-12 text-primary">1. Chọn Dự thảo chủ trì:</Label>
                                <Select
                                    value={selectedDoc}
                                    onChange={(opt) => {
                                        setSelectedDoc(opt);
                                        fetchFeedbacks(opt.value);
                                    }}
                                    options={documents}
                                    placeholder="Tìm kiếm văn bản..."
                                    styles={selectStyles}
                                />
                            </div>
                        </Col>
                        <Col lg={4}>
                            <div className="p-3 bg-light rounded-3 shadow-sm card-animate">
                                <Label className="form-label fw-semibold text-uppercase fs-12 text-info">2. Lọc theo Cơ quan:</Label>
                                <Select
                                    value={selectedAgency}
                                    onChange={(opt) => setSelectedAgency(opt)}
                                    options={agencyOptions}
                                    placeholder="Tất cả cơ quan"
                                    styles={selectStyles}
                                />
                            </div>
                        </Col>
                        <Col lg={4}>
                            <div className="p-3 bg-light rounded-3 shadow-sm card-animate">
                                <Label className="form-label fw-semibold text-uppercase fs-12 text-warning">3. Lọc Tình trạng:</Label>
                                <Select
                                    value={selectedStatus}
                                    onChange={(opt) => setSelectedStatus(opt)}
                                    options={[
                                        { value: 'all', label: 'Tất cả Tình trạng' },
                                        { value: 'unresolved', label: 'Chưa giải trình' },
                                        { value: 'resolved', label: 'Đã giải trình' },
                                    ]}
                                    styles={selectStyles}
                                />
                            </div>
                        </Col>
                    </Row>
                    
                    <Card className="border-0 shadow-sm overflow-hidden mt-4">
                        <CardHeader className="d-flex justify-content-between align-items-center bg-info-subtle py-3">
                            <h5 className="card-title mb-0 fw-bold"><i className="ri-list-check-2 align-bottom me-1"></i> Danh sách Góp ý chi tiết</h5>
                            <Badge className="badge-soft-info fs-12">Tổng số: {filteredFeedbacks.length} ý kiến</Badge>
                        </CardHeader>
                        <CardBody>
                            {loading ? (
                                <div className="text-center py-5">
                                    <Spinner color="primary" />
                                    <p className="mt-2 text-muted">Đang tải dữ liệu góp ý...</p>
                                </div>
                            ) : (
                                <TableContainer
                                    columns={columns}
                                    data={filteredFeedbacks}
                                    isGlobalFilter={true}
                                    customPageSize={10}
                                    divClass="table-responsive table-card mt-3"
                                    tableClass="table-centered align-middle table-nowrap mb-0"
                                    theadClass="text-muted table-light text-uppercase fs-11"
                                    SearchPlaceholder="Tìm kiếm nhanh trên bảng..."
                                />
                            )}
                        </CardBody>
                    </Card>
                </Container>

                <Modal isOpen={isModalOpen} toggle={() => setIsModalOpen(!isModalOpen)} centered size="lg" contentClassName="border-0 shadow">
                    <ModalHeader toggle={() => setIsModalOpen(!isModalOpen)} className="bg-primary-subtle text-primary">
                        <i className="ri-chat-history-line align-bottom me-1"></i> Hành động Giải trình
                    </ModalHeader>
                    <ModalBody>
                        {currentFeedback && (
                            <div className="mb-3 p-3 bg-light rounded">
                                <Row>
                                    <Col lg={6}><strong>Vị trí:</strong> {currentFeedback.node_path}</Col>
                                    <Col lg={6}><strong>Đơn vị:</strong> {currentFeedback.contributing_agency}</Col>
                                </Row>
                                <hr />
                                <div className="mt-2">
                                    <strong>Nội dung góp ý:</strong>
                                    <p className="mt-1">{currentFeedback.content}</p>
                                </div>
                            </div>
                        )}
                        <div className="form-group">
                            <Label className="form-label fw-bold">Nội dung giải trình (Tiếp thu/Giải trình bảo vệ):</Label>
                            <Input 
                                type="textarea" 
                                rows="5" 
                                value={explanation}
                                onChange={(e) => setExplanation(e.target.value)}
                                placeholder="Nhập nội dung giải trình tại đây..."
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter className="bg-light">
                        <Button color="light" className="btn-link text-decoration-none" onClick={() => setIsModalOpen(false)}>Hủy bỏ</Button>
                        <Button color="primary" className="btn-load shadow-none" onClick={saveExplanation} disabled={saving}>
                            {saving ? <><Spinner size="sm" className="me-2"/> Đang lưu...</> : <><i className="ri-save-3-line align-bottom me-1"></i> Lưu Giải trình</>}
                        </Button>
                    </ModalFooter>
                </Modal>

                {/* Modal View Node Content */}
                <Modal isOpen={isNodeModalOpen} toggle={() => setIsNodeModalOpen(!isNodeModalOpen)} centered size="lg" contentClassName="border-0 shadow-lg">
                    <ModalHeader toggle={() => setIsNodeModalOpen(!isNodeModalOpen)} className="bg-info-subtle text-info">
                        <i className="ri-eye-line align-bottom me-1"></i> Chi tiết nội dung: {selectedNodeData?.node_label}
                    </ModalHeader>
                    <ModalBody>
                        {nodeLoading ? (
                            <div className="text-center py-4">
                                <Spinner color="primary" />
                                <p className="mt-2 text-muted">Đang tải nội dung...</p>
                            </div>
                        ) : (
                            <div className="p-3 bg-light rounded border" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                <div style={{ lineHeight: '1.6' }}>
                                    <h5 className="fw-bold">{selectedNodeData?.node_label}</h5>
                                    <div className="mb-3" style={{ whiteSpace: 'pre-wrap' }}>
                                        {selectedNodeData?.content}
                                    </div>
                                    
                                    {selectedNodeData?.children && selectedNodeData.children.length > 0 && (
                                        <div className="ms-3 pt-2 border-top">
                                            {selectedNodeData.children.map(child => (
                                                <div key={child.id} className="mb-2">
                                                    <span className="fw-bold">{child.node_label}:</span>{' '}
                                                    <span style={{ whiteSpace: 'pre-wrap' }}>{child.content}</span>
                                                    
                                                    {child.children && child.children.length > 0 && (
                                                        <div className="ms-3 small text-muted">
                                                            {child.children.map(grand => (
                                                                <div key={grand.id}>
                                                                    <strong>{grand.node_label}:</strong> {grand.content}
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
                    <ModalFooter className="bg-light">
                        <Button color="primary" onClick={() => setIsNodeModalOpen(false)} className="px-4 shadow-none">
                            <i className="ri-close-line align-bottom me-1"></i> Đóng
                        </Button>
                    </ModalFooter>
                </Modal>
            </div>
        </React.Fragment>
    );
};

export default FeedbackList;
