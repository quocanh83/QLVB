import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Input, Table, Spinner, Form, FormGroup, Label } from 'reactstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast } from 'react-toastify';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

const FeedbackIntake = () => {
    const [documents, setDocuments] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState(null);
    const [nodes, setNodes] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [metadata, setMetadata] = useState({});
    const [agencies, setAgencies] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Custom styles for react-select to match Velzon dynamic light/dark theme
    const selectStyles = {
        control: (base, state) => ({
            ...base,
            background: "var(--vz-input-bg)",
            borderColor: state.isFocused ? "var(--vz-input-focus-border-color)" : "var(--vz-input-border)",
            color: "var(--vz-body-color)",
        }),
        menu: (base) => ({
            ...base,
            background: "var(--vz-choices-bg-color, var(--vz-input-bg))",
            borderColor: "var(--vz-input-border)",
            zIndex: 9999
        }),
        option: (base, state) => ({
            ...base,
            background: state.isFocused ? "var(--vz-primary-light, #eef1f6)" : "transparent",
            color: state.isFocused ? "var(--vz-primary, #405189)" : "var(--vz-body-color)",
            cursor: "pointer",
            ":active": {
                background: "var(--vz-primary)",
                color: "#fff"
            }
        }),
        singleValue: (base) => ({
            ...base,
            color: "var(--vz-body-color)",
        }),
        input: (base) => ({
            ...base,
            color: "var(--vz-body-color)",
        }),
        multiValue: (base) => ({
            ...base,
            background: "var(--vz-primary-light, #eef1f6)",
            color: "var(--vz-primary, #405189)",
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: "var(--vz-primary, #405189)",
        }),
        placeholder: (base) => ({
            ...base,
            color: "var(--vz-input-placeholder-color, #adb5bd)",
        }),
        dropdownIndicator: (base) => ({
            ...base,
            color: "var(--vz-input-placeholder-color)",
        }),
        indicatorSeparator: (base) => ({
            ...base,
            backgroundColor: "var(--vz-input-border)",
        })
    };

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const queryDocId = new URLSearchParams(location.search).get('docId');
        if (queryDocId) setSelectedDocId(parseInt(queryDocId));
        fetchInitialData();
    }, [location]);

    useEffect(() => {
        if (selectedDocId) fetchNodes(selectedDocId);
    }, [selectedDocId]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [docData, agencyData] = await Promise.all([
                axios.get('/api/documents/', getAuthHeader()),
                axios.get('/api/settings/agencies/', getAuthHeader())
            ]);
            setDocuments(Array.isArray(docData.results || docData) ? (docData.results || docData) : []);
            setAgencies(Array.isArray(agencyData.results || agencyData) ? (agencyData.results || agencyData) : []);
        } catch (e) {
            toast.error("Lỗi khi tải dữ liệu khởi tạo.");
        } finally {
            setLoading(false);
        }
    };

    const fetchNodes = async (docId) => {
        try {
            const res = await axios.get(`/api/feedbacks/get_document_nodes/?document_id=${docId}`, getAuthHeader());
            const data = res.results || res || [];
            setNodes(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Failed to fetch nodes", e);
        }
    };

    const handleFileUpload = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const parseFile = async () => {
        if (!file) return;
        if (!selectedDocId) {
            toast.warning("Vui lòng chọn Dự thảo văn bản trước!");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_id', selectedDocId);

        try {
            const res = await axios.post('/api/feedbacks/parse_file/', formData, {
                headers: { ...getAuthHeader().headers, 'Content-Type': 'multipart/form-data' }
            });
            
            const parseData = res.results || res.data || res;
            const enriched = (parseData.feedbacks || []).map((f, i) => ({
                ...f,
                key: `file-${i}-${Date.now()}`,
                node_id: f.node_id || null
            }));
            
            setFeedbacks(enriched);
            setMetadata(parseData.metadata || {});
            toast.success(`Đã phân rã được ${enriched.length} đoạn góp ý từ file.`);
        } catch (e) {
            toast.error("Lỗi khi phân rã file góp ý.");
        } finally {
            setUploading(false);
        }
    };

    const addManualFeedback = () => {
        const newFb = {
            key: `manual-${Date.now()}`,
            node_label: '',
            node_id: null,
            contributing_agency: '',
            agency_id: null,
            content: ''
        };
        setFeedbacks([...feedbacks, newFb]);
    };

    const removeFeedback = (key) => {
        setFeedbacks(feedbacks.filter(f => f.key !== key));
    };

    const updateFeedbackField = (key, field, value) => {
        setFeedbacks(feedbacks.map(f => f.key === key ? { ...f, [field]: value } : f));
    };

    const handleSave = async () => {
        if (!selectedDocId) return toast.warning("Chưa chọn dự thảo!");
        if (feedbacks.length === 0) return toast.warning("Danh sách góp ý trống!");

        setSaving(true);
        try {
            await axios.post('/api/feedbacks/bulk_create/', {
                document_id: selectedDocId,
                feedbacks: feedbacks,
                metadata: metadata
            }, getAuthHeader());
            toast.success("Đã nạp toàn bộ góp ý vào hệ thống!");
            navigate(`/documents/${selectedDocId}`);
        } catch (e) {
            toast.error("Lỗi khi lưu góp ý.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Tiếp nhận Góp ý" pageTitle="Quản lý" />
                    
                    <Row>
                        <Col lg={4}>
                            <Card className="border-0 shadow-sm card-animate">
                                <CardHeader className="bg-primary-subtle py-3">
                                    <h5 className="card-title mb-0 fw-bold"><i className="ri-information-line align-bottom me-1"></i> 1. Thông tin nguồn</h5>
                                </CardHeader>
                                <CardBody>
                                    <Form>
                                        <FormGroup>
                                            <Label for="docSelect">Dự thảo cần góp ý</Label>
                                            <Select
                                                id="docSelect"
                                                value={documents.find(d => d.id === selectedDocId) ? { value: selectedDocId, label: documents.find(d => d.id === selectedDocId).project_name } : null}
                                                onChange={(opt) => setSelectedDocId(opt ? opt.value : null)}
                                                options={documents.map(d => ({ value: d.id, label: d.project_name }))}
                                                placeholder="Chọn dự thảo..."
                                                isClearable
                                                styles={selectStyles}
                                            />
                                        </FormGroup>

                                        <div className="mt-4 border-top pt-3">
                                            <Label className="form-label fw-semibold text-muted text-uppercase fs-12">Tải File dự thảo (.docx)</Label>
                                            <div className="d-flex gap-2 mt-2">
                                                <div className="flex-grow-1">
                                                    <Input 
                                                        type="file" 
                                                        className="form-control" 
                                                        onChange={handleFileUpload}
                                                        disabled={!selectedDocId || uploading}
                                                        accept=".docx"
                                                    />
                                                </div>
                                                <Button 
                                                    color="primary" 
                                                    className="btn-soft-primary btn-icon flex-shrink-0" 
                                                    onClick={parseFile} 
                                                    disabled={!file || uploading}
                                                    title="Phân rã dữ liệu"
                                                >
                                                    {uploading ? <Spinner size="sm"/> : <i className="ri-magic-line"></i>}
                                                </Button>
                                            </div>
                                            <p className="text-muted mt-2 fs-12 mb-0">
                                                <i className="ri-information-fill align-bottom me-1"></i> Hệ thống sẽ tự động bóc tách Điều/Khoản từ file phụ lục.
                                            </p>
                                        </div>

                                        <div className="mt-4 border-top pt-3">
                                            <Label className="form-label fw-semibold text-muted text-uppercase fs-12">Thao tác thủ công</Label>
                                            <Button color="success" className="w-100 btn-soft-success" onClick={addManualFeedback}>
                                                <i className="ri-add-circle-line align-bottom me-1"></i> Thêm hàng góp ý mới
                                            </Button>
                                        </div>
                                    </Form>

                                    {metadata && metadata.drafting_agency && (
                                        <div className="mt-4 p-3 bg-primary-subtle rounded-3 border border-primary-subtle">
                                            <h6 className="text-primary fw-bold mb-3 fs-13"><i className="ri-file-search-line align-bottom me-1"></i> Metadata File trích xuất</h6>
                                            <div className="list-group list-group-flush border-dashed">
                                                <div className="list-group-item bg-transparent px-0 py-2 d-flex justify-content-between">
                                                    <span className="text-muted">Cơ quan chủ trì:</span>
                                                    <span className="fw-medium">{metadata.drafting_agency}</span>
                                                </div>
                                                <div className="list-group-item bg-transparent px-0 py-2 d-flex justify-content-between">
                                                    <span className="text-muted">Địa danh:</span>
                                                    <span className="fw-medium">{metadata.agency_location}</span>
                                                </div>
                                                <div className="list-group-item bg-transparent px-0 py-2 d-flex justify-content-between">
                                                    <span className="text-muted">Số CQ tham vấn:</span>
                                                    <span className="fw-medium">{metadata.total_consulted_doc}</span>
                                                </div>
                                                <div className="list-group-item bg-transparent px-0 py-2 d-flex justify-content-between border-0">
                                                    <span className="text-muted">Góp ý tìm thấy:</span>
                                                    <span className="badge badge-soft-primary">{metadata.total_feedbacks_doc}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </Col>

                        <Col lg={8}>
                            <Card className="border-0 shadow-sm card-animate overflow-hidden">
                                <CardHeader className="bg-success-subtle py-3 d-flex justify-content-between align-items-center">
                                    <h5 className="card-title mb-0 fw-bold"><i className="ri-edit-box-line align-bottom me-1"></i> 2. Dashboard Review & Mapping ({feedbacks.length})</h5>
                                    <div className="flex-shrink-0 gap-2 d-flex">
                                        <Button color="primary" className="btn-sm px-3 shadow-none fw-semibold" onClick={handleSave} disabled={saving || feedbacks.length === 0}>
                                            {saving ? <Spinner size="sm"/> : <><i className="ri-upload-cloud-2-line align-bottom me-1"></i> Lưu vào Hệ thống</>}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardBody className="p-0">
                                    <div className="table-responsive table-card" style={{ maxHeight: '650px' }}>
                                        <Table className="align-middle table-nowrap mb-0 table-hover">
                                            <thead className="table-light text-muted text-uppercase fs-11">
                                                <tr>
                                                    <th scope="col" style={{ width: '45%' }}>Nội dung góp ý</th>
                                                    <th scope="col" style={{ width: '25%' }}>Cơ quan</th>
                                                    <th scope="col" style={{ width: '25%' }}>Điều/Khoản</th>
                                                    <th scope="col" className="text-center" style={{ width: '5%' }}>Xóa</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {feedbacks.length > 0 ? feedbacks.map((fb) => (
                                                    <tr key={fb.key}>
                                                        <td>
                                                            <Input 
                                                                type="textarea" 
                                                                rows={4} 
                                                                value={fb.content} 
                                                                onChange={(e) => updateFeedbackField(fb.key, 'content', e.target.value)}
                                                                className="form-control-sm"
                                                            />
                                                        </td>
                                                        <td>
                                                            <CreatableSelect
                                                                isClearable
                                                                value={agencies.find(a => a.id === fb.agency_id) ? { value: fb.agency_id, label: agencies.find(a => a.id === fb.agency_id).name } : (fb.contributing_agency ? {label: fb.contributing_agency, value: null} : null)}
                                                                onChange={(opt) => {
                                                                    updateFeedbackField(fb.key, 'agency_id', opt && !opt.__isNew__ ? opt.value : null);
                                                                    updateFeedbackField(fb.key, 'contributing_agency', opt ? opt.label : '');
                                                                }}
                                                                options={agencies.map(a => ({ value: a.id, label: a.name }))}
                                                                placeholder="Chọn hoặc nhập mới..."
                                                                formatCreateLabel={(inputValue) => `Thêm mới: "${inputValue}"`}
                                                                menuPortalTarget={document.body}
                                                                styles={{ ...selectStyles, menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                            />
                                                        </td>
                                                        <td>
                                                            <Select
                                                                value={nodes.find(n => n.id === fb.node_id) ? { value: fb.node_id, label: nodes.find(n => n.id === fb.node_id).label } : null}
                                                                onChange={(opt) => updateFeedbackField(fb.key, 'node_id', opt ? opt.value : null)}
                                                                options={nodes.filter(n => n.type !== 'Văn bản').map(n => ({ value: n.id, label: n.label }))}
                                                                placeholder="Chọn mục..."
                                                                isClearable
                                                                menuPortalTarget={document.body}
                                                                styles={{ ...selectStyles, menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                            />
                                                        </td>
                                                        <td className="text-center">
                                                            <Button color="soft-danger" size="sm" className="btn-icon" onClick={() => removeFeedback(fb.key)}>
                                                                <i className="ri-delete-bin-line"></i>
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan="4" className="text-center py-5 text-muted">
                                                            Chưa có dữ liệu. Vui lòng tải file hoặc thêm thủ công.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </Table>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default FeedbackIntake;
