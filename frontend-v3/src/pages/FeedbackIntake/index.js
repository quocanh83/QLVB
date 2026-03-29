import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Input, Table, Spinner, Form, FormGroup, Label, Nav, NavItem, NavLink, TabContent, TabPane, Badge } from 'reactstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import classnames from 'classnames';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast } from 'react-toastify';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import SimpleBar from 'simplebar-react';
import { useDropzone } from 'react-dropzone';
import OCRComparisonView from './OCRComparisonView';

const FeedbackIntake = () => {
    const [documents, setDocuments] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState(null);
    const [nodes, setNodes] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [metadata, setMetadata] = useState({});
    const [agencies, setAgencies] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState(null);
    const [file2, setFile2] = useState(null); // For Tab 3 (PDF/Image)
    const [uploading, setUploading] = useState(false);
    const [uploading2, setUploading2] = useState(false); // For Tab 3
    const [saving, setSaving] = useState(false);
    
    // Tab State
    const [activeTab, setActiveTab] = useState('1');
    const [nodeSearch, setNodeSearch] = useState('');
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    
    // OCR Review State
    const [ocrResult, setOcrResult] = useState(null);
    const [showOCRReview, setShowOCRReview] = useState(false);
    
    // Manual Input State
    const [manualEntry, setManualEntry] = useState({
        agency_id: null,
        contributing_agency: '',
        content: ''
    });

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
            background: "var(--vz-choices-bg, #ffffff)",
            borderColor: "var(--vz-input-border)",
            boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
            zIndex: 9999
        }),
        option: (base, state) => ({
            ...base,
            background: state.isSelected 
                ? "var(--vz-primary)" 
                : state.isFocused 
                    ? "var(--vz-primary-light, #eef1f6)" 
                    : "var(--vz-choices-bg, #ffffff)",
            color: state.isSelected 
                ? "#fff" 
                : state.isFocused 
                    ? "var(--vz-primary, #405189)" 
                    : "var(--vz-body-color)",
            borderBottom: "1px solid var(--vz-input-border)",
            padding: "12px 15px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer",
            ":last-child": {
                borderBottom: "none"
            },
            ":active": {
                background: "var(--vz-primary)",
                color: "#fff"
            }
        }),
        singleValue: (base) => ({
            ...base,
            color: "var(--vz-body-color)",
            fontSize: "15px",
            fontWeight: "600",
        }),
        input: (base) => ({
            ...base,
            color: "var(--vz-body-color)",
            fontSize: "15px",
            fontWeight: "600",
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

    // Dropzone handles file selection

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
            const meta = parseData.metadata || {};
            
            // Try to find a default agency from metadata if current is empty
            const defaultAgencyName = meta.drafting_agency || "";
            const defaultAgency = agencies.find(a => a.name === defaultAgencyName);

            const enriched = (parseData.feedbacks || []).map((f, i) => {
                const guessedNodeId = guessNodeFromText(f.content, nodes);
                return {
                    ...f,
                    key: `file-${i}-${Date.now()}`,
                    node_id: f.node_id || guessedNodeId || null,
                    // If backend didn't provide agency, use metadata's drafting agency as a guess
                    agency_id: f.agency_id || (defaultAgency ? defaultAgency.id : null),
                    contributing_agency: f.contributing_agency || defaultAgencyName
                };
            });
            
            setFeedbacks(enriched);
            setMetadata(meta);
            toast.success(`Đã phân rã được ${enriched.length} đoạn góp ý từ file.`);
        } catch (e) {
            toast.error("Lỗi khi phân rã file góp ý.");
        } finally {
            setUploading(false);
        }
    };

    const parseFile2 = async () => {
        if (!file2) return;
        if (!selectedDocId) {
            toast.warning("Vui lòng chọn Dự thảo văn bản trước!");
            return;
        }

        setUploading2(true);
        const formData = new FormData();
        formData.append('file', file2);
        formData.append('document_id', selectedDocId);

        try {
            // New OCR endpoint
            const res = await axios.post('/api/feedbacks/ocr_parse/', formData, {
                headers: { ...getAuthHeader().headers, 'Content-Type': 'multipart/form-data' }
            });
            
            const data = (res.results || res.data || res);
            if (data.pages && data.pages.length > 0) {
                setOcrResult(data.pages);
                setShowOCRReview(true);
                toast.success("Đã trích xuất & xử lý AI xong. Mời bạn đối soát kết quả.");
            } else {
                toast.warning("Không tìm thấy văn bản trong tệp tải lên.");
            }
        } catch (e) {
            toast.error("Lỗi khi xử lý OCR & AI: " + (e.response?.data?.error || e.message));
        } finally {
            setUploading2(false);
        }
    };

    const handleConfirmOCR = (finalText) => {
        // Break final text into paragraphs and guess nodes
        const paragraphs = finalText.split('\n\n').filter(p => p.trim());
        
        const defaultAgencyName = metadata.drafting_agency || "";
        const defaultAgency = agencies.find(a => a.name === defaultAgencyName);

        const enriched = paragraphs.map((content, i) => {
            const guessedNodeId = guessNodeFromText(content, nodes);
            return {
                key: `ocr-${i}-${Date.now()}`,
                node_id: guessedNodeId || null,
                node_label: nodes.find(n => n.id === guessedNodeId)?.label || "Vấn đề khác",
                agency_id: defaultAgency ? defaultAgency.id : null,
                contributing_agency: defaultAgencyName,
                content: content.trim()
            };
        });

        setFeedbacks([...enriched, ...feedbacks]);
        setShowOCRReview(false);
        setOcrResult(null);
        toast.success(`Đã xác nhận và thêm ${enriched.length} đoạn góp ý vào danh sách chờ.`);
    };

    const guessNodeFromText = (text, nodesList) => {
        if (!text) return null;
        const match = text.match(/Điều\s*(\d+)/i);
        if (match) {
            const articleNum = match[1];
            const found = nodesList.find(n => n.label.includes(`Điều ${articleNum}`));
            return found ? found.id : null;
        }
        return null;
    };

    const handleMetadataChange = (field, value) => {
        setMetadata(prev => ({ ...prev, [field]: value }));
    };

    const handleAddManualToSession = () => {
        if (!selectedNodeId) return toast.warning("Vui lòng chọn Điều/Khoản trước!");
        if (!manualEntry.content) return toast.warning("Vui lòng nhập nội dung góp ý!");
        
        const node = nodes.find(n => n.id === selectedNodeId);
        const newFb = {
            key: `manual-${Date.now()}`,
            node_label: node ? node.label : '',
            node_id: selectedNodeId,
            contributing_agency: manualEntry.contributing_agency,
            agency_id: manualEntry.agency_id,
            content: manualEntry.content
        };
        
        setFeedbacks([newFb, ...feedbacks]);
        setManualEntry({ ...manualEntry, content: '' }); // Clear content only to keep agency
        toast.success("Đã thêm góp ý vào danh sách chờ.");
    };

    const toggleTab = (tab) => {
        if (activeTab !== tab) setActiveTab(tab);
    };

    const filteredNodes = nodes.filter(n => 
        n.label.toLowerCase().includes(nodeSearch.toLowerCase()) || (n.type && n.type.toLowerCase().includes(nodeSearch.toLowerCase()))
    );

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

    // Dropzone configuration for Tab 2 (DOCX)
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (acceptedFiles) => {
            if (!selectedDocId) {
                toast.warning("Vui lòng chọn Dự thảo văn bản trước khi tải file!");
                return;
            }
            if (acceptedFiles.length > 0) {
                setFile(acceptedFiles[0]);
                toast.success(`Đã chọn file: ${acceptedFiles[0].name}`);
            }
        },
        onDropRejected: () => {
            toast.error("Định dạng file không hợp lệ. Vui lòng chọn file .docx");
        },
        accept: {
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
        },
        multiple: false
    });

    // Dropzone configuration for Tab 3 (Image/PDF)
    const { 
        getRootProps: getRootProps2, 
        getInputProps: getInputProps2, 
        isDragActive: isDragActive2 
    } = useDropzone({
        onDrop: (acceptedFiles) => {
            if (!selectedDocId) {
                toast.warning("Vui lòng chọn Dự thảo văn bản trước khi tải file!");
                return;
            }
            if (acceptedFiles.length > 0) {
                setFile2(acceptedFiles[0]);
                toast.success(`Đã chọn tệp: ${acceptedFiles[0].name}`);
            }
        },
        onDropRejected: () => {
            toast.error("Định dạng không hợp lệ. Vui lòng chọn PDF hoặc Ảnh (.jpg, .png)");
        },
        accept: {
            'application/pdf': ['.pdf'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png']
        },
        multiple: false
    });

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Tiếp nhận Góp ý" pageTitle="Quản lý" />
                    
                    <Card className="border-0 shadow-sm mb-4">
                        <CardBody className="p-3">
                            <Row className="align-items-center">
                                <Col md={6}>
                                    <FormGroup className="mb-0">
                                        <Label className="form-label fw-bold text-muted text-uppercase fs-11 mb-1">Dự thảo văn bản cần góp ý</Label>
                                        <Select
                                            id="docSelect"
                                            value={documents.find(d => d.id === selectedDocId) ? { value: selectedDocId, label: documents.find(d => d.id === selectedDocId).project_name } : null}
                                            onChange={(opt) => setSelectedDocId(opt ? opt.value : null)}
                                            options={documents.map(d => ({ value: d.id, label: d.project_name }))}
                                            placeholder="Chọn dự thảo..."
                                            isClearable
                                            styles={selectStyles}
                                            menuPortalTarget={document.body}
                                            menuPosition="fixed"
                                        />
                                    </FormGroup>
                                </Col>
                                <Col md={6} className="text-end pt-3 pt-md-0">
                                    <Button 
                                        color="primary" 
                                        className="btn-label waves-effect waves-light shadow-none px-4" 
                                        onClick={handleSave} 
                                        disabled={saving || feedbacks.length === 0 || !selectedDocId}
                                    >
                                        <i className="ri-save-3-line label-icon align-middle fs-16 me-2"></i> 
                                        {saving ? "Đang lưu..." : `Lưu ${feedbacks.length} góp ý vào hệ thống`}
                                    </Button>
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>

                    <Nav pills className="nav-pills nav-custom nav-primary mb-3">
                        <NavItem>
                            <NavLink
                                className={classnames({ active: activeTab === '1' })}
                                onClick={() => toggleTab('1')}
                                style={{ cursor: 'pointer', fontWeight: activeTab === '1' ? '700' : '500', borderRadius: '30px', padding: '10px 25px' }}
                            >
                                <i className="ri-edit-2-line align-bottom me-1"></i> 1. Nhập theo Điều/Khoản
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink
                                className={classnames({ active: activeTab === '2' })}
                                onClick={() => toggleTab('2')}
                                style={{ cursor: 'pointer', fontWeight: activeTab === '2' ? '700' : '500', borderRadius: '30px', padding: '10px 25px' }}
                            >
                                <i className="ri-file-upload-line align-bottom me-1"></i> 2. Nhập từ File (.docx)
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink
                                className={classnames({ active: activeTab === '3' })}
                                onClick={() => toggleTab('3')}
                                style={{ cursor: 'pointer', fontWeight: activeTab === '3' ? '700' : '500', borderRadius: '30px', padding: '10px 25px' }}
                            >
                                <i className="ri-image-line align-bottom me-1"></i> 3. Nhập từ ảnh và PDF
                            </NavLink>
                        </NavItem>
                    </Nav>

                    <TabContent activeTab={activeTab}>
                        {/* TAB 1: MANUAL NODE ENTRY */}
                        <TabPane tabId="1">
                            <Row>
                                <Col lg={2}>
                                    <Card className="border-0 shadow-sm mb-0" style={{ minHeight: '600px' }}>
                                        <CardHeader className="bg-light-subtle py-2 border-bottom border-light">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="flex-grow-1 position-relative">
                                                    <Input 
                                                        type="text" 
                                                        className="form-control form-control-sm ps-5" 
                                                        placeholder="Tìm..." 
                                                        value={nodeSearch}
                                                        onChange={(e) => setNodeSearch(e.target.value)}
                                                    />
                                                    <i className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardBody className="p-0 overflow-hidden">
                                            <SimpleBar style={{ maxHeight: '550px' }} className="p-2">
                                                {!selectedDocId ? (
                                                    <div className="text-center py-5 text-muted small italic">Chọn dự thảo...</div>
                                                ) : filteredNodes.length > 0 ? (
                                                    <div className="list-group list-group-flush border-dashed">
                                                        {filteredNodes.map((n) => (
                                                            <button 
                                                                key={n.id} 
                                                                type="button" 
                                                                className={classnames("list-group-item list-group-item-action border-0 mb-1 rounded-1 py-1 px-2 d-flex flex-column", {
                                                                    "active bg-primary-subtle text-primary": selectedNodeId === n.id
                                                                })}
                                                                onClick={() => setSelectedNodeId(n.id)}
                                                            >
                                                                <div className="d-flex justify-content-between align-items-start w-100">
                                                                    <span className="fw-bold fs-13 text-truncate">{n.label}</span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-5 text-muted small">Trống...</div>
                                                )}
                                            </SimpleBar>
                                        </CardBody>
                                    </Card>
                                </Col>

                                <Col lg={10}>
                                    <Card className="border-0 shadow-sm mb-0">
                                        <CardHeader className="bg-light-subtle py-3">
                                            <h6 className="card-title mb-0 fw-bold">
                                                <i className="ri-reply-line align-bottom me-1 text-primary"></i> 
                                                Nhập nội dung góp ý cho: <span className="text-primary">{nodes.find(n => n.id === selectedNodeId)?.label || "..."}</span>
                                            </h6>
                                        </CardHeader>
                                        <CardBody className="bg-body-tertiary">
                                            <div className="p-3 bg-card-custom rounded border border-light-subtle shadow-sm mb-4">
                                                <Row>
                                                    <Col md={6}>
                                                        <FormGroup>
                                                            <Label className="fs-13 fw-bold text-muted text-uppercase mb-1">Cơ quan tham vấn</Label>
                                                            <CreatableSelect
                                                                isClearable
                                                                value={agencies.find(a => a.id === manualEntry.agency_id) ? { value: manualEntry.agency_id, label: agencies.find(a => a.id === manualEntry.agency_id).name } : (manualEntry.contributing_agency ? {label: manualEntry.contributing_agency, value: null} : null)}
                                                                onChange={(opt) => {
                                                                    setManualEntry({
                                                                        ...manualEntry,
                                                                        agency_id: opt && !opt.__isNew__ ? opt.value : null,
                                                                        contributing_agency: opt ? opt.label : ''
                                                                    });
                                                                }}
                                                                options={agencies.map(a => ({ value: a.id, label: a.name }))}
                                                                placeholder="Chọn hoặc nhập tên cơ quan..."
                                                                formatCreateLabel={(inputValue) => `Thêm cơ quan mới: "${inputValue}"`}
                                                                styles={selectStyles}
                                                                menuPortalTarget={document.body}
                                                                menuPosition="fixed"
                                                            />
                                                        </FormGroup>
                                                    </Col>
                                                </Row>
                                                <FormGroup className="mb-3">
                                                    <Label className="fs-13 fw-bold text-muted text-uppercase mb-1">Nội dung góp ý</Label>
                                                    <Input 
                                                        type="textarea" 
                                                        rows={6} 
                                                        className="form-control border-light-subtle bg-light-subtle text-body fs-14" 
                                                        placeholder="Nhập nội dung góp ý chi tiết tại đây..."
                                                        value={manualEntry.content}
                                                        onChange={(e) => setManualEntry({ ...manualEntry, content: e.target.value })}
                                                        disabled={!selectedNodeId}
                                                    />
                                                </FormGroup>
                                                <div className="text-end">
                                                    <Button color="success" className="px-4 shadow-none" onClick={handleAddManualToSession} disabled={!selectedNodeId || !manualEntry.content}>
                                                        <i className="ri-add-line align-middle me-1"></i> Thêm vào danh sách chờ
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* List of currently added feedbacks in this session */}
                                            <h6 className="fw-bold mb-3 d-flex align-items-center">
                                                <i className="ri-list-check-2 align-bottom me-2 text-success"></i> 
                                                Danh sách đã nhập ({feedbacks.filter(f => f.key.startsWith('manual')).length})
                                            </h6>
                                            <div style={{ maxHeight: '350px', overflowY: 'auto' }} className="pe-2">
                                                {feedbacks.filter(f => f.key.startsWith('manual')).map((fb) => (
                                                    <Card key={fb.key} className="border-0 mb-2 shadow-sm bg-card-custom">
                                                        <CardBody className="p-2 position-relative">
                                                            <div className="d-flex justify-content-between align-items-start mb-1 pe-4">
                                                                <span className="badge bg-primary-subtle text-primary fs-12">{fb.node_label}</span>
                                                                <span className="text-muted fs-12 fw-bold">{fb.contributing_agency}</span>
                                                            </div>
                                                            <p className="mb-0 fs-14 text-body">{fb.content}</p>
                                                            <Button 
                                                                color="soft-danger" 
                                                                size="sm" 
                                                                className="btn-icon position-absolute top-0 end-0 m-2 shadow-none" 
                                                                onClick={() => removeFeedback(fb.key)}
                                                                style={{ width: '24px', height: '24px' }}
                                                            >
                                                                <i className="ri-close-line fs-14"></i>
                                                            </Button>
                                                        </CardBody>
                                                    </Card>
                                                ))}
                                                {feedbacks.filter(f => f.key.startsWith('manual')).length === 0 && (
                                                    <div className="text-center py-4 bg-light-subtle rounded border border-dashed text-muted fs-12">
                                                        Chưa có góp ý nào được nhập thủ công.
                                                    </div>
                                                )}
                                            </div>
                                        </CardBody>
                                    </Card>
                                </Col>
                            </Row>
                        </TabPane>

                        {/* TAB 3: IMAGE/PDF INTAKE (Cloned from Tab 2) */}
                        <TabPane tabId="3">
                            {!showOCRReview ? (
                                <Row>
                                    <Col lg={4}>
                                        <Card className="border-0 shadow-sm h-100 mb-0">
                                            <CardHeader className="bg-light-subtle py-3 mt-0 text-center">
                                                <h6 className="card-title mb-1 fw-bold"><i className="ri-image-add-line align-bottom me-1"></i> Tải Ảnh hoặc PDF góp ý</h6>
                                                <p className="text-muted mb-0 fs-11">Hỗ trợ .pdf, .jpg, .png</p>
                                            </CardHeader>
                                            <CardBody className="bg-body-tertiary">
                                                <div 
                                                    {...getRootProps2()} 
                                                    className={classnames(
                                                        "p-5 border rounded-3 text-center mb-4 shadow-sm transition-all",
                                                        isDragActive2 ? "border-primary bg-primary-subtle" : "border-dashed bg-card-custom",
                                                        !selectedDocId ? "opacity-50 grayscale-1" : "cursor-pointer"
                                                    )}
                                                    style={{ borderStyle: 'dashed', borderWidth: '2px', cursor: !selectedDocId ? 'not-allowed' : 'pointer' }}
                                                >
                                                    <input {...getInputProps2()} />
                                                    <div className="mb-3">
                                                        <i className={classnames(
                                                            "display-4 opacity-50 d-block",
                                                            isDragActive2 ? "ri-download-cloud-2-line text-primary" : "ri-camera-lens-line text-muted"
                                                        )}></i>
                                                    </div>
                                                    {!selectedDocId ? (
                                                        <div className="text-danger fw-medium">
                                                            <i className="ri-information-line align-middle me-1"></i> 
                                                            Vui lòng chọn dự thảo ở trên trước
                                                        </div>
                                                    ) : file2 ? (
                                                        <div>
                                                            <h5 className="text-success fw-bold mb-1">
                                                                <i className="ri-file-pdf-line align-bottom me-1"></i> {file2.name}
                                                            </h5>
                                                            <p className="text-muted small mb-0">{(file2.size / 1024).toFixed(2)} KB - Sẵn sàng xử lý</p>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <h5 className="fw-bold mb-1">Kéo thả Ảnh/PDF vào đây</h5>
                                                            <p className="text-muted mb-0">Hoặc nhấp để chọn tệp</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <Button 
                                                    color="info" 
                                                    className="w-100 btn-label waves-effect waves-light shadow-none py-2 mb-3" 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        parseFile2();
                                                    }} 
                                                    disabled={!file2 || uploading2}
                                                >
                                                    <i className="ri-scan-2-line label-icon align-middle fs-16 me-2"></i> 
                                                    {uploading2 ? "Đang xử lý bằng AI..." : "Bắt đầu Trích xuất OCR & AI"}
                                                </Button>

                                                <div className="p-3 bg-info-subtle rounded-3 border border-dashed border-info shadow-none">
                                                    <p className="text-info mb-0 fs-12 lh-base">
                                                        <i className="ri-information-line align-middle me-1"></i>
                                                        Hệ thống sẽ sử dụng <b>PaddleOCR</b> để nhận diện và <b>AI (GPT-4o)</b> để tự động sửa lỗi chính tả, bù từ mờ dựa trên ngữ cảnh pháp luật. Dữ liệu sẽ hiển thị đối soát song song sau khi xử lý.
                                                    </p>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    </Col>

                                    <Col lg={8}>
                                        <Card className="border-0 shadow-sm h-100 mb-0 overflow-hidden">
                                            <CardHeader className="bg-info-subtle py-3 border-bottom border-info border-opacity-10 d-flex justify-content-between align-items-center">
                                                <h6 className="card-title mb-0 fw-bold">
                                                    <i className="ri-list-settings-line align-bottom me-1 text-info"></i> 
                                                    Kết quả trích xuất ({feedbacks.filter(f => f.key.startsWith('ocr')).length})
                                                </h6>
                                            </CardHeader>
                                            <CardBody className="p-3">
                                                <div className="table-responsive" style={{ maxHeight: '650px' }}>
                                                    <Table className="align-middle mb-0 table-hover">
                                                        <thead className="bg-light text-dark fs-13">
                                                            <tr>
                                                                <th scope="col" className="fw-bold" style={{ width: '45%' }}>Nội dung góp ý</th>
                                                                <th scope="col" className="fw-bold" style={{ width: '25%' }}>Cơ quan góp ý</th>
                                                                <th scope="col" className="fw-bold" style={{ width: '25%' }}>Điều/Khoản tương ứng</th>
                                                                <th scope="col" className="text-center" style={{ width: '5%' }}>Thao tác</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {feedbacks.filter(f => f.key.startsWith('ocr')).length > 0 ? feedbacks.filter(f => f.key.startsWith('ocr')).map((fb) => (
                                                                <tr key={fb.key}>
                                                                    <td className="p-2">
                                                                        <Input 
                                                                            type="textarea" 
                                                                            rows={4} 
                                                                            value={fb.content} 
                                                                            onChange={(e) => updateFeedbackField(fb.key, 'content', e.target.value)}
                                                                            className="form-control border-light-subtle bg-light-subtle text-body fs-14"
                                                                            style={{ padding: '12px' }}
                                                                        />
                                                                    </td>
                                                                    <td className="p-2">
                                                                        <CreatableSelect
                                                                            isClearable
                                                                            value={agencies.find(a => a.id === fb.agency_id) ? { value: fb.agency_id, label: agencies.find(a => a.id === fb.agency_id).name } : (fb.contributing_agency ? {label: fb.contributing_agency, value: null} : null)}
                                                                            onChange={(opt) => {
                                                                                updateFeedbackField(fb.key, 'agency_id', opt && !opt.__isNew__ ? opt.value : null);
                                                                                updateFeedbackField(fb.key, 'contributing_agency', opt ? opt.label : '');
                                                                            }}
                                                                            options={agencies.map(a => ({ value: a.id, label: a.name }))}
                                                                            placeholder="Cơ quan..."
                                                                            formatCreateLabel={(inputValue) => `Mới: "${inputValue}"`}
                                                                            menuPortalTarget={document.body}
                                                                            menuPosition="fixed"
                                                                            styles={selectStyles}
                                                                        />
                                                                    </td>
                                                                    <td className="p-2">
                                                                        <Select
                                                                            value={nodes.find(n => n.id === fb.node_id) ? { value: fb.node_id, label: nodes.find(n => n.id === fb.node_id).label } : { value: null, label: 'Chung' }}
                                                                            onChange={(opt) => updateFeedbackField(fb.key, 'node_id', opt ? opt.value : null)}
                                                                            options={[
                                                                                { value: null, label: 'Chung' },
                                                                                ...nodes.filter(n => n.type !== 'Văn bản').map(n => ({ value: n.id, label: n.label }))
                                                                            ]}
                                                                            placeholder="Mức..."
                                                                            isClearable
                                                                            menuPortalTarget={document.body}
                                                                            menuPosition="fixed"
                                                                            styles={selectStyles}
                                                                        />
                                                                    </td>
                                                                    <td className="text-center p-2">
                                                                        <Button color="soft-danger" size="sm" className="btn-icon shadow-none" onClick={() => removeFeedback(fb.key)}>
                                                                            <i className="ri-delete-bin-line fs-16"></i>
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            )) : (
                                                                <tr>
                                                                    <td colSpan="4" className="text-center py-5 text-muted bg-body-tertiary">
                                                                        <div className="py-5">
                                                                            <div className="mb-4">
                                                                                <i className="ri-camera-lens-line display-3 text-info opacity-25"></i>
                                                                            </div>
                                                                            <h5 className="text-body fw-bold">Chưa có dữ liệu từ Ảnh/PDF</h5>
                                                                            <p className="fs-14 mb-0">Hệ thống sẽ bóc tách dữ liệu ngay sau khi bạn tải tệp và nhấn nút "Bắt đầu Trích xuất".</p>
                                                                        </div>
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
                            ) : (
                                <OCRComparisonView 
                                    pages={ocrResult} 
                                    onConfirm={handleConfirmOCR} 
                                    onCancel={() => setShowOCRReview(false)} 
                                />
                            )}
                        </TabPane>
                    </TabContent>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default FeedbackIntake;
