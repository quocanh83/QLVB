import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Input, Table, Spinner, Form, FormGroup, Label, Nav, NavItem, NavLink, TabContent, TabPane, Badge, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
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
import PageSelector from './PageSelector';

const FeedbackIntake = () => {
    const [documents, setDocuments] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState(null);
    const [nodes, setNodes] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [metadata, setMetadata] = useState({});
    
    // Global Agency Info for DOCX
    const [globalAgency, setGlobalAgency] = useState("");
    const [globalAgencyId, setGlobalAgencyId] = useState(null);
    const [globalDocNumber, setGlobalDocNumber] = useState("");
    const [agencies, setAgencies] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState(null);
    const [file2, setFile2] = useState(null); // For Tab 3 (PDF/Image)
    const [uploading, setUploading] = useState(false);
    const [uploading2, setUploading2] = useState(false); // For Tab 3
    const [saving, setSaving] = useState(false);
    
    // Google Sheets Link State
    const [gsUrl, setGsUrl] = useState("");
    const [analyzingGs, setAnalyzingGs] = useState(false);
    const [saveGsUrl, setSaveGsUrl] = useState(true);
    
    // Tab State
    const [activeTab, setActiveTab] = useState('1');
    const [nodeSearch, setNodeSearch] = useState('');
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    
    // OCR & Page Selection State
    const [pdfInfo, setPdfInfo] = useState(null);
    const [showPageSelector, setShowPageSelector] = useState(false);
    const [ocrResult, setOcrResult] = useState(null);
    const [showOCRReview, setShowOCRReview] = useState(false);
    
    // Manual Input State
    const [manualEntry, setManualEntry] = useState({
        node_id: null,
        contributing_agency: '',
        agency_id: null,
        content: '',
        reason: '',
        note: ''
    });

    // Quick Add Agency Modal State
    const [agencyModal, setAgencyModal] = useState(false);
    const [newAgencyName, setNewAgencyName] = useState("");
    const [newAgencyCategory, setNewAgencyCategory] = useState(null);
    const [categories, setCategories] = useState([]);
    const [addingAgency, setAddingAgency] = useState(false);
    // Track which field is requesting new agency: 'manual' or 'global'
    const [requestSource, setRequestSource] = useState('global');
    
    const toggleAgencyModal = (source = 'global') => {
        setRequestSource(source);
        setAgencyModal(!agencyModal);
        setNewAgencyName("");
        setNewAgencyCategory(null);
    };

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
        if (selectedDocId) {
            fetchNodes(selectedDocId);
            const doc = documents.find(d => d.id === selectedDocId);
            if (doc && doc.google_sheets_url) {
                setGsUrl(doc.google_sheets_url);
            } else {
                setGsUrl(""); // Clear if no link
            }
        }
    }, [selectedDocId, documents]);

    const fetchAgenciesOnly = async () => {
        try {
            const agencyData = await axios.get('/api/settings/agencies/', getAuthHeader());
            setAgencies(Array.isArray(agencyData.results || agencyData) ? (agencyData.results || agencyData) : []);
        } catch (e) {
            console.error("Lỗi khi tải danh sách đơn vị.");
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await axios.get('/api/settings/agency-categories/', getAuthHeader());
            const data = res.results || res;
            setCategories(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Lỗi lấy danh mục phân loại.");
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
            
            // Nếu là phân loại mới gõ vào
            if (newAgencyCategory && newAgencyCategory.__isNew__) {
                const catRes = await axios.post('/api/settings/agency-categories/', { name: newAgencyCategory.label }, getAuthHeader());
                categoryId = catRes.data.id;
                await fetchCategories(); // Refresh list
            }

            const res = await axios.post('/api/settings/agencies/', { 
                name: newAgencyName,
                agency_category: categoryId 
            }, getAuthHeader());
            
            toast.success("Thêm đơn vị mới thành công.");
            await fetchAgenciesOnly();
            
            const newId = res.data.id;
            const newName = res.data.name || newAgencyName;
            
            if (requestSource === 'manual') {
                setManualEntry({ ...manualEntry, agency_id: newId, contributing_agency: newName });
            } else {
                setGlobalAgencyId(newId);
                setGlobalAgency(newName);
            }
            
            toggleAgencyModal();
        } catch (error) {
            console.error("Lỗi khi thêm đơn vị nhanh:", error.response?.data);
            const errorMsg = error.response?.data 
                ? Object.entries(error.response.data)
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
                    .join(" | ")
                : "Lỗi khi thêm đơn vị nhanh. Tên có thể đã tồn tại.";
            toast.error("Lỗi: " + errorMsg);
        } finally {
            setAddingAgency(false);
        }
    };

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [docData, agencyData, categoryData] = await Promise.all([
                axios.get('/api/documents/', getAuthHeader()),
                axios.get('/api/settings/agencies/', getAuthHeader()),
                axios.get('/api/settings/agency-categories/', getAuthHeader())
            ]);
            setDocuments(Array.isArray(docData.results || docData) ? (docData.results || docData) : []);
            setAgencies(Array.isArray(agencyData.results || agencyData) ? (agencyData.results || agencyData) : []);
            setCategories(Array.isArray(categoryData.results || categoryData) ? (categoryData.results || categoryData) : []);
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
            const res = await axios.post('/api/feedbacks/analyze_import/', formData, {
                headers: { ...getAuthHeader().headers, 'Content-Type': 'multipart/form-data' }
            });
            
            const data = (res.results || res.data || res);
            if (data.rows) {
                setFeedbacks(data.rows);
                toast.success(`Đã phân tích xong ${data.rows.length} dòng dữ liệu.`);
            }
        } catch (e) {
            toast.error("Lỗi khi phân rã file góp ý.");
        } finally {
            setUploading(false);
        }
    };

    const handleAnalyzeGsUrl = async () => {
        if (!gsUrl.trim()) {
            toast.warning("Vui lòng nhập đường dẫn Google Sheets.");
            return;
        }
        if (!selectedDocId) {
            toast.warning("Vui lòng chọn Dự thảo văn bản trước!");
            return;
        }

        setAnalyzingGs(true);
        try {
            const res = await axios.post('/api/feedbacks/analyze_import/', {
                document_id: selectedDocId,
                google_sheets_url: gsUrl
            }, getAuthHeader());
            
            const data = (res.results || res.data || res);
            if (data.rows) {
                setFeedbacks(data.rows);
                toast.success(`Đã tải thành công ${data.rows.length} dòng từ Google Sheets.`);
            }
        } catch (e) {
            toast.error("Lỗi khi tải dữ liệu từ Google Sheets. Hãy kiểm tra quyền truy cập của sheet.");
        } finally {
            setAnalyzingGs(false);
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
            // Bước 1: Lấy số trang và preview
            const res = await axios.post('/api/feedbacks/get_pdf_info/', formData, {
                headers: { ...getAuthHeader().headers, 'Content-Type': 'multipart/form-data' }
            });
            
            const data = (res.results || res.data || res);
            setPdfInfo(data);
            setShowPageSelector(true);
            toast.info(`Phát hiện file có ${data.total_pages} trang. Hãy chọn các trang cần quét.`);
        } catch (e) {
            toast.error("Lỗi khi đọc file: " + (e.response?.data?.error || e.message));
        } finally {
            setUploading2(false);
        }
    };

    const startOCR = async (selectedPages) => {
        if (!file2) return;
        
        setUploading2(true);
        const formData = new FormData();
        formData.append('file', file2);
        formData.append('document_id', selectedDocId);
        formData.append('selected_pages', selectedPages);

        try {
            // Bước 2: Thực hiện OCR thực sự
            const res = await axios.post('/api/feedbacks/ocr_parse/', formData, {
                headers: { ...getAuthHeader().headers, 'Content-Type': 'multipart/form-data' }
            });
            
            const data = (res.results || res.data || res);
            if (data.pages && data.pages.length > 0) {
                setOcrResult(data.pages);
                setShowOCRReview(true);
                setShowPageSelector(false);
                toast.success("Đã trích xuất & xử lý AI xong. Mời bạn đối soát kết quả.");
            } else {
                toast.warning("Không tìm thấy văn bản trong các trang đã chọn.");
            }
        } catch (e) {
            toast.error("Lỗi khi xử lý OCR & AI: " + (e.response?.data?.error || e.message));
        } finally {
            setUploading2(false);
        }
    };

    const handleConfirmOCR = async (finalText) => {
        setUploading2(true);
        try {
            const res = await axios.post('/api/feedbacks/ocr_finalize_parse/', {
                document_id: selectedDocId,
                text: finalText
            }, getAuthHeader());
            
            const data = (res.results || res.data || res);
            if (data.feedbacks && data.feedbacks.length > 0) {
                // Đảm bảo agencies được ánh xạ nếu AI tìm thấy tên cơ quan
                const enriched = data.feedbacks.map(fb => {
                    const agencyMatch = agencies.find(a => a.name.toLowerCase() === fb.contributing_agency?.toLowerCase());
                    return {
                        ...fb,
                        agency_id: agencyMatch ? agencyMatch.id : null
                    };
                });
                
                setFeedbacks([...enriched, ...feedbacks]);
                setShowOCRReview(false);
                setOcrResult(null);
                toast.success(`AI đã bóc tách thành công ${enriched.length} đoạn góp ý có cấu trúc.`);
            } else {
                toast.warning("AI không thể nhận diện được cấu trúc góp ý từ văn bản này.");
            }
        } catch (e) {
            toast.error("Lỗi khi AI phân tích cấu trúc: " + (e.response?.data?.error || e.message));
        } finally {
            setUploading2(false);
        }
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
        if (!selectedNodeId) return;
        
        // selectedNodeId ở Tab 1 (sidebar) có thể là node-ID hoặc app-ID tùy theo logic hiển thị
        const nodeItem = nodes.find(n => n.unique_id === selectedNodeId || n.id === selectedNodeId);
        if (!nodeItem) return;

        const isAppendix = nodeItem.unique_id?.startsWith('app-') || nodeItem.type === 'Appendix';
        
        const newFeedback = {
            ...manualEntry,
            key: `manual-${Date.now()}`,
            node_id: isAppendix ? null : nodeItem.id,
            appendix_id: isAppendix ? nodeItem.id : null,
            node_label: nodeItem.label,
            import_mode: 'add_new',
            explanation_status: 'none'
        };
        
        setFeedbacks([newFeedback, ...feedbacks]);
        setManualEntry({ ...manualEntry, content: '', reason: '', note: '' });
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
        if (field === 'node_id' && typeof value === 'string' && (value.startsWith('node-') || value.startsWith('app-'))) {
            const isApp = value.startsWith('app-');
            const realId = parseInt(value.split('-')[1]);
            setFeedbacks(feedbacks.map(f => f.key === key ? { 
                ...f, 
                node_id: isApp ? null : realId,
                appendix_id: isApp ? realId : null
            } : f));
            return;
        }
        setFeedbacks(feedbacks.map(f => f.key === key ? { ...f, [field]: value } : f));
    };

    const handleSave = async () => {
        if (!selectedDocId) return toast.warning("Chưa chọn dự thảo!");
        if (feedbacks.length === 0) return toast.warning("Danh sách góp ý trống!");

        setSaving(true);
        try {
            const endpoint = activeTab === '4' || activeTab === '2' ? '/api/feedbacks/confirm_import/' : '/api/feedbacks/bulk_create/';
            
            const payload = endpoint === '/api/feedbacks/confirm_import/' ? {
                document_id: selectedDocId,
                rows: feedbacks,
                gs_url: gsUrl || null,
                save_gs_url: saveGsUrl
            } : {
                document_id: selectedDocId,
                feedbacks: feedbacks,
                metadata: {
                    ...metadata,
                    contributing_agency: globalAgency,
                    agency_id: globalAgencyId,
                    official_doc_number: globalDocNumber
                }
            };

            const res = await axios.post(endpoint, payload, getAuthHeader());
            toast.success(res.data.message || "Đã nạp toàn bộ góp ý vào hệ thống!");
            navigate(`/feedbacks`);
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
                        <NavItem>
                            <NavLink
                                className={classnames({ active: activeTab === '4' })}
                                onClick={() => toggleTab('4')}
                                style={{ cursor: 'pointer', fontWeight: activeTab === '4' ? '700' : '500', borderRadius: '30px', padding: '10px 25px' }}
                            >
                                <i className="ri-google-line align-bottom me-1"></i> 4. Nhập từ GG sheet
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
                                                                onClick={() => setSelectedNodeId(n.unique_id || n.id)}
                                                            >
                                                                <div className="d-flex justify-content-between align-items-start w-100">
                                                                    <span className={classnames("fs-13 text-truncate", { "fw-bold text-primary": n.type === 'Appendix', "fw-medium": n.type !== 'Appendix' })}>{n.label}</span>
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
                                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                                                <Label className="fs-13 fw-bold text-muted text-uppercase mb-0">Cơ quan tham vấn</Label>
                                                                <Button color="link" size="sm" className="p-0 text-primary fw-medium fs-12" onClick={() => toggleAgencyModal('manual')}>
                                                                    <i className="ri-add-line align-bottom me-1"></i> Thêm nhanh
                                                                </Button>
                                                            </div>
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
                                                        rows={4} 
                                                        className="form-control border-light-subtle bg-light-subtle text-body fs-14" 
                                                        placeholder="Nhập nội dung góp ý chi tiết tại đây..."
                                                        value={manualEntry.content}
                                                        onChange={(e) => setManualEntry({ ...manualEntry, content: e.target.value })}
                                                        disabled={!selectedNodeId}
                                                    />
                                                </FormGroup>
                                                <Row>
                                                    <Col md={6}>
                                                        <FormGroup className="mb-3">
                                                            <Label className="fs-13 fw-bold text-muted text-uppercase mb-1">Lý do / Cơ sở</Label>
                                                            <Input 
                                                                type="text" 
                                                                className="form-control border-light-subtle bg-light-subtle text-body fs-13" 
                                                                placeholder="Nhập lý do..."
                                                                value={manualEntry.reason}
                                                                onChange={(e) => setManualEntry({ ...manualEntry, reason: e.target.value })}
                                                                disabled={!selectedNodeId}
                                                            />
                                                        </FormGroup>
                                                    </Col>
                                                    <Col md={6}>
                                                        <FormGroup className="mb-3">
                                                            <Label className="fs-13 fw-bold text-muted text-uppercase mb-1">Ghi chú</Label>
                                                            <Input 
                                                                type="text" 
                                                                className="form-control border-light-subtle bg-light-subtle text-body fs-13" 
                                                                placeholder="Nhập ghi chú..."
                                                                value={manualEntry.note}
                                                                onChange={(e) => setManualEntry({ ...manualEntry, note: e.target.value })}
                                                                disabled={!selectedNodeId}
                                                            />
                                                        </FormGroup>
                                                    </Col>
                                                </Row>
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

                        {/* TAB 2: DOCX INTAKE */}
                        <TabPane tabId="2">
                            <Row>
                                <Col lg={4}>
                                    <Card className="border-0 shadow-sm h-100 mb-0">
                                        <CardHeader className="bg-light-subtle py-3 mt-0 text-center">
                                            <h6 className="card-title mb-1 fw-bold"><i className="ri-file-word-2-line align-bottom me-1"></i> Tải File (.docx) góp ý</h6>
                                            <p className="text-muted mb-0 fs-11">Hỗ trợ định dạng Word (.docx)</p>
                                        </CardHeader>
                                        <CardBody className="bg-body-tertiary">
                                            <div 
                                                {...getRootProps()} 
                                                className={classnames(
                                                    "p-5 border rounded-3 text-center mb-4 shadow-sm transition-all",
                                                    isDragActive ? "border-primary bg-primary-subtle" : "border-dashed bg-card-custom",
                                                    !selectedDocId ? "opacity-50 grayscale-1" : "cursor-pointer"
                                                )}
                                                style={{ borderStyle: 'dashed', borderWidth: '2px', cursor: !selectedDocId ? 'not-allowed' : 'pointer' }}
                                            >
                                                <input {...getInputProps()} />
                                                <div className="mb-3">
                                                    <i className={classnames(
                                                        "display-4 opacity-50 d-block",
                                                        isDragActive ? "ri-download-cloud-2-line text-primary" : "ri-file-word-line text-muted"
                                                    )}></i>
                                                </div>
                                                {!selectedDocId ? (
                                                    <div className="text-danger fw-medium">
                                                        <i className="ri-information-line align-middle me-1"></i> 
                                                        Vui lòng chọn dự thảo ở trên trước
                                                    </div>
                                                ) : file ? (
                                                    <div>
                                                        <h5 className="text-success fw-bold mb-1">
                                                            <i className="ri-file-word-2-fill align-bottom me-1"></i> {file.name}
                                                        </h5>
                                                        <p className="text-muted small mb-0">{(file.size / 1024).toFixed(2)} KB - Sẵn sàng xử lý</p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <h5 className="fw-bold mb-1">Kéo thả File Word vào đây</h5>
                                                        <p className="text-muted mb-0">Hoặc nhấp để chọn tệp</p>
                                                    </div>
                                                )}
                                            </div>

                                            <Button 
                                                color="primary" 
                                                className="w-100 btn-label waves-effect waves-light shadow-none py-2 mb-3" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    parseFile();
                                                }} 
                                                disabled={!file || uploading}
                                            >
                                                <i className="ri-file-word-line label-icon align-middle fs-16 me-2"></i> 
                                                {uploading ? "Đang xử lý..." : "Phân rã file .docx"}
                                            </Button>

                                            <div className="p-3 bg-secondary-subtle rounded-3 border border-dashed border-secondary shadow-none">
                                                <p className="text-secondary mb-0 fs-12 lh-base">
                                                    <i className="ri-information-line align-middle me-1"></i>
                                                    Hệ thống sẽ tự động nhận diện cấu trúc văn bản góp ý của bạn dựa trên các từ khóa như "Tại Điều...", "Tại Khoản...", "Sửa đổi..." để map vào đúng phần tử dự thảo.
                                                </p>
                                            </div>
                                        </CardBody>
                                    </Card>
                                </Col>

                                <Col lg={8}>
                                    <Card className="border-0 shadow-sm h-100 mb-0 overflow-hidden">
                                        <CardHeader className="bg-primary-subtle py-3 border-bottom border-primary border-opacity-10 d-flex justify-content-between align-items-center">
                                            <h6 className="card-title mb-0 fw-bold">
                                                <i className="ri-list-settings-line align-bottom me-1 text-primary"></i> 
                                                Kết quả phân rã ({feedbacks.filter(f => f.key.startsWith('file')).length})
                                            </h6>
                                        </CardHeader>
                                        <CardBody className="p-3">
                                            {/* Global Agency Info Inputs */}
                                            {feedbacks.filter(f => f.key.startsWith('file')).length > 0 && (
                                                <div className="p-3 bg-light border rounded-3 mb-3 shadow-sm">
                                                    <Row className="g-3">
                                                        <Col md={7}>
                                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                                                <Label className="form-label fw-bold text-uppercase fs-11 text-muted mb-0">Cơ quan góp ý (Góp chung):</Label>
                                                                <Button color="link" size="sm" className="p-0 text-primary fw-medium fs-11" onClick={() => toggleAgencyModal('global')}>
                                                                    <i className="ri-add-line align-bottom me-1"></i> Thêm nhanh
                                                                </Button>
                                                            </div>
                                                            <CreatableSelect
                                                                isClearable
                                                                value={agencies.find(a => a.id === globalAgencyId) ? { value: globalAgencyId, label: agencies.find(a => a.id === globalAgencyId).name } : (globalAgency ? {label: globalAgency, value: null} : null)}
                                                                onChange={(opt) => {
                                                                    setGlobalAgencyId(opt && !opt.__isNew__ ? opt.value : null);
                                                                    setGlobalAgency(opt ? opt.label : '');
                                                                }}
                                                                options={agencies.map(a => ({ value: a.id, label: a.name }))}
                                                                placeholder="Chọn hoặc nhập tên cơ quan..."
                                                                formatCreateLabel={(inputValue) => `Thêm mới: "${inputValue}"`}
                                                                styles={selectStyles}
                                                            />
                                                        </Col>
                                                        <Col md={5}>
                                                            <Label className="form-label fw-bold text-uppercase fs-11 text-muted">Số công văn:</Label>
                                                            <Input 
                                                                type="text" 
                                                                placeholder="Ví dụ: 123/BC-BXD..." 
                                                                value={globalDocNumber}
                                                                onChange={(e) => setGlobalDocNumber(e.target.value)}
                                                                className="form-control border-light-subtle"
                                                            />
                                                        </Col>
                                                    </Row>
                                                </div>
                                            )}

                                            <div className="table-responsive" style={{ maxHeight: '650px' }}>
                                                <Table className="align-middle mb-0 table-hover">
                                                    <thead className="bg-light text-dark fs-13">
                                                        <tr>
                                                            <th scope="col" className="fw-bold" style={{ width: '65%' }}>Nội dung góp ý</th>
                                                            <th scope="col" className="fw-bold" style={{ width: '30%' }}>Điều/Khoản tương ứng</th>
                                                            <th scope="col" className="text-center" style={{ width: '5%' }}>Xóa</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {feedbacks.filter(f => f.key.startsWith('file')).length > 0 ? feedbacks.filter(f => f.key.startsWith('file')).map((fb) => (
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
                                                                <td colSpan="3" className="text-center py-5 text-muted bg-body-tertiary">
                                                                    <div className="py-5">
                                                                        <div className="mb-4">
                                                                            <i className="ri-file-word-line display-3 text-primary opacity-25"></i>
                                                                        </div>
                                                                        <h5 className="text-body fw-bold">Chưa có dữ liệu từ File Word</h5>
                                                                        <p className="fs-14 mb-0">Hệ thống sẽ phân rã nội dung ngay sau khi bạn tải tệp .docx và nhấn nút "Phân rã file .docx".</p>
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
                        </TabPane>

                        {/* TAB 3: IMAGE/PDF INTAKE (Cloned from Tab 2) */}
                        <TabPane tabId="3">
                            {showOCRReview ? (
                                <OCRComparisonView 
                                    pages={ocrResult} 
                                    onConfirm={handleConfirmOCR} 
                                    onCancel={() => setShowOCRReview(false)} 
                                    loading={uploading2}
                                />
                            ) : showPageSelector ? (
                                <PageSelector 
                                    previews={pdfInfo.previews} 
                                    totalPages={pdfInfo.total_pages} 
                                    onProcessedSelect={startOCR} 
                                    loading={uploading2}
                                />
                            ) : (
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
                                                    {uploading2 ? "Đang đọc file..." : "Xem trước & Chọn trang quét"}
                                                </Button>

                                                <div className="p-3 bg-info-subtle rounded-3 border border-dashed border-info shadow-none">
                                                    <p className="text-info mb-0 fs-12 lh-base">
                                                        <i className="ri-information-line align-middle me-1"></i>
                                                        Hệ thống sử dụng công nghệ <b>Mistral AI OCR</b> mới nhất để nhận diện bảng biểu và cấu trúc pháp luật chính xác 99%. Bạn có thể chọn từng trang để tối ưu chi phí.
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
                                                                            <p className="fs-14 mb-0">Hệ thống sẽ bóc tách dữ liệu ngay sau khi bạn tải tệp và nhấn nút "Xem trước & Chọn trang quét".</p>
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
                            )}
                        </TabPane>
                        {/* TAB 4: GOOGLE SHEETS IMPORT */}
                        <TabPane tabId="4">
                            <Card className="border-0 shadow-sm mb-4">
                                <CardHeader className="bg-light-subtle d-flex align-items-center justify-content-between">
                                    <h6 className="card-title mb-0 fw-bold"><i className="ri-google-line align-bottom me-1 text-success"></i> Nhập trực tiếp từ Google Sheets</h6>
                                    <Badge color="info" className="fs-10">Anyone with link can view</Badge>
                                </CardHeader>
                                <CardBody className="bg-body-tertiary">
                                    <div className="p-4 bg-card-custom rounded border border-light-subtle shadow-sm mb-4">
                                        <Row className="align-items-center">
                                            <Col md={7}>
                                                <Label className="form-label fw-bold small text-muted text-uppercase mb-2">Đường dẫn Google Sheets</Label>
                                                <Input 
                                                    type="text" 
                                                    placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=..." 
                                                    value={gsUrl}
                                                    onChange={(e) => setGsUrl(e.target.value)}
                                                    className="form-control-lg border-2"
                                                />
                                            </Col>
                                            <Col md={3}>
                                                <div className="form-check form-switch form-switch-md">
                                                    <Input 
                                                        className="form-check-input" 
                                                        type="checkbox" 
                                                        id="saveGsUrlSwitch" 
                                                        checked={saveGsUrl}
                                                        onChange={(e) => setSaveGsUrl(e.target.checked)}
                                                    />
                                                    <Label className="form-check-label text-muted fs-12" htmlFor="saveGsUrlSwitch">
                                                        Lưu lại đường dẫn này cho dự thảo
                                                    </Label>
                                                </div>
                                            </Col>
                                            <Col md={2}>
                                                <Button 
                                                    color="success" 
                                                    size="lg" 
                                                    className="w-100 shadow-none" 
                                                    onClick={handleAnalyzeGsUrl}
                                                    disabled={analyzingGs || !selectedDocId}
                                                >
                                                    {analyzingGs ? <Spinner size="sm" /> : <><i className="ri-refresh-line align-bottom me-2"></i> Tải</>}
                                                </Button>
                                            </Col>
                                        </Row>
                                    </div>

                                    <style>{`
                                        .corner-badge {
                                            position: absolute;
                                            top: 2px;
                                            right: 2px;
                                            z-index: 10;
                                            font-size: 9px !important;
                                            padding: 2px 4px !important;
                                            pointer-events: none;
                                            border-radius: 4px;
                                            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                                            background-color: rgba(255, 190, 84, 0.9) !important;
                                            color: #835201 !important;
                                        }
                                        .rel-wrapper {
                                            position: relative;
                                            width: 100%;
                                            height: 100%;
                                        }
                                        .is-dup-cell {
                                            background-color: rgba(255, 190, 84, 0.05) !important;
                                        }
                                    `}</style>

                                    {(activeTab === '4' || activeTab === '2') && feedbacks.length > 0 && (
                                        <div className="table-responsive bg-white rounded border">
                                            <Table className="table-hover mb-0 align-middle">
                                                <thead className="table-light fs-11 text-uppercase fw-bold">
                                                    <tr>
                                                        <th style={{ width: '10%' }}>Điều/Khoản</th>
                                                        <th style={{ width: '12%' }}>Đơn vị</th>
                                                        <th style={{ width: '20%' }}>Nội dung</th>
                                                        <th style={{ width: '15%' }}>Lý do</th>
                                                        <th style={{ width: '10%' }}>Ghi chú</th>
                                                        <th style={{ width: '25%' }}>Xử lý Giải trình</th>
                                                        <th style={{ width: '8%' }}>Lưu?</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="fs-13">
                                                    {feedbacks.map((fb, idx) => (
                                                        <tr key={fb.key} className={fb.is_duplicate ? "table-light opacity-75" : ""}>
                                                            <td className="fw-medium">
                                                                <Select
                                                                    value={nodes.find(n => (n.unique_id === `node-${fb.node_id}` || n.unique_id === `app-${fb.appendix_id}`)) ? { 
                                                                        value: fb.appendix_id ? `app-${fb.appendix_id}` : `node-${fb.node_id}`, 
                                                                        label: nodes.find(n => (n.unique_id === `node-${fb.node_id}` || n.unique_id === `app-${fb.appendix_id}`))?.label 
                                                                    } : null}
                                                                    onChange={(opt) => updateFeedbackField(fb.key, 'node_id', opt ? opt.value : null)}
                                                                    options={nodes.map(n => ({ value: n.unique_id || `node-${n.id}`, label: n.label }))}
                                                                    placeholder="Chọn..."
                                                                    styles={selectStyles}
                                                                    menuPortalTarget={document.body}
                                                                />
                                                            </td>
                                                            <td>
                                                                <CreatableSelect
                                                                    isClearable
                                                                    value={agencies.find(a => a.id === fb.agency_id) ? { value: fb.agency_id, label: fb.agency_id ? agencies.find(a => a.id === fb.agency_id).name : fb.agency_name } : (fb.agency_name ? {label: fb.agency_name, value: null} : null)}
                                                                    onChange={(opt) => updateFeedbackField(fb.key, 'agency_id', opt ? opt.value : null)}
                                                                    options={agencies.map(a => ({ value: a.id, label: a.name }))}
                                                                    styles={selectStyles}
                                                                    menuPortalTarget={document.body}
                                                                />
                                                                {fb.official_number && <div className="mt-1"><Badge color="light" className="text-secondary border fs-10">{fb.official_number} - {fb.official_date}</Badge></div>}
                                                            </td>
                                                            <td>
                                                                <div className="rel-wrapper">
                                                                    <Input 
                                                                        type="textarea" 
                                                                        rows={2} 
                                                                        className={`form-control form-control-sm fs-12 px-1 py-0 scrollbar-hide border-0 bg-transparent text-truncate-2-lines ${fb.is_duplicate ? 'is-dup-cell' : ''}`} 
                                                                        value={fb.content}
                                                                        onChange={(e) => updateFeedbackField(fb.key, 'content', e.target.value)}
                                                                    />
                                                                    {fb.is_duplicate && <Badge className="corner-badge">Đã có</Badge>}
                                                                </div>
                                                                {fb.is_duplicate && <div className="mt-1"><Badge color="soft-warning" className="fs-10">Trùng lặp hoàn toàn</Badge></div>}
                                                            </td>
                                                            <td>
                                                                <div className="rel-wrapper">
                                                                    <Input 
                                                                        type="textarea" 
                                                                        rows={1} 
                                                                        className={`form-control form-control-sm fs-11 px-1 py-0 border-0 bg-transparent ${fb.is_duplicate ? 'is-dup-cell' : ''}`} 
                                                                        value={fb.reason}
                                                                        placeholder="..."
                                                                        onChange={(e) => updateFeedbackField(fb.key, 'reason', e.target.value)}
                                                                    />
                                                                    {fb.is_duplicate && <Badge className="corner-badge">Đã có</Badge>}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="rel-wrapper">
                                                                    <Input 
                                                                        type="text" 
                                                                        className={`form-control form-control-sm fs-11 px-1 py-0 border-0 bg-transparent ${fb.is_duplicate ? 'is-dup-cell' : ''}`} 
                                                                        value={fb.note}
                                                                        placeholder="..."
                                                                        onChange={(e) => updateFeedbackField(fb.key, 'note', e.target.value)}
                                                                    />
                                                                    {fb.is_duplicate && <Badge className="corner-badge">Đã có</Badge>}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                {fb.explanation_status === 'none' ? (
                                                                    <span className="text-muted italic fs-11">Không có giải trình</span>
                                                                ) : fb.explanation_status === 'identical' ? (
                                                                    <Badge color="soft-success" className="fs-10">Trùng - Bỏ qua</Badge>
                                                                ) : (
                                                                    <div className="d-flex flex-column gap-1 bg-light p-1 rounded">
                                                                        <div className="d-flex align-items-center gap-1">
                                                                            <Badge color={fb.explanation_status === 'conflict' ? "soft-danger" : "soft-primary"} className="fs-9">
                                                                                {fb.explanation_status === 'conflict' ? "Sửa" : "Mới"}
                                                                            </Badge>
                                                                            <select 
                                                                                className="form-select form-select-sm py-0 h-auto fs-10 border-0 bg-transparent text-primary fw-bold"
                                                                                value={fb.explanation_import_mode}
                                                                                onChange={(e) => updateFeedbackField(fb.key, 'explanation_import_mode', e.target.value)}
                                                                            >
                                                                                <option value="overwrite">Ghi đè</option>
                                                                                <option value="skip">Bỏ qua</option>
                                                                            </select>
                                                                        </div>
                                                                        <div className="text-muted fs-10 text-truncate-2-lines bg-white p-1 rounded" title={fb.explanation_content}>
                                                                            {fb.explanation_content}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="text-center">
                                                                <Input 
                                                                    type="select" 
                                                                    size="sm"
                                                                    value={fb.import_mode}
                                                                    onChange={(e) => updateFeedbackField(fb.key, 'import_mode', e.target.value)}
                                                                    className={fb.import_mode === 'skip' ? 'bg-light' : 'border-primary'}
                                                                >
                                                                    <option value="add_new">Lưu mới toàn bộ</option>
                                                                    <option value="add_if_diff">Lưu nội dung có khác</option>
                                                                    <option value="explanation_only">Chỉ nhập giải trình</option>
                                                                    <option value="overwrite">Ghi đè bản ghi cũ</option>
                                                                    <option value="skip">Bỏ qua</option>
                                                                </Input>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </TabPane>
                    </TabContent>
                </Container>

                {/* Quick Add Agency Modal */}
                <Modal isOpen={agencyModal} toggle={toggleAgencyModal} centered size="sm">
                    <ModalHeader toggle={toggleAgencyModal} className="bg-light p-3">Thêm nhanh đối tượng/đơn vị</ModalHeader>
                    <ModalBody>
                        <FormGroup>
                            <Label className="form-label fw-bold">Tên đơn vị mới <span className="text-danger">*</span></Label>
                            <Input 
                                type="text" 
                                placeholder="Nhập tên đơn vị..." 
                                value={newAgencyName}
                                onChange={(e) => setNewAgencyName(e.target.value)}
                                autoFocus
                            />
                        </FormGroup>
                        <FormGroup className="mb-0">
                            <Label className="form-label fw-bold">Phân loại đơn vị</Label>
                            <CreatableSelect
                                isClearable
                                placeholder="Chọn hoặc gõ để thêm loại mới..."
                                value={newAgencyCategory}
                                onChange={(opt) => setNewAgencyCategory(opt)}
                                options={categories.map(c => ({ value: c.id, label: c.name }))}
                                formatCreateLabel={(inputValue) => `Thêm phân loại mới: "${inputValue}"`}
                                styles={selectStyles}
                            />
                            <p className="text-muted small mt-2 mb-0">
                                Bạn có thể bỏ trống phân loại nếu chưa rõ.
                            </p>
                        </FormGroup>
                    </ModalBody>
                    <ModalFooter className="bg-light p-2">
                        <Button color="link" className="text-muted" onClick={toggleAgencyModal}>Hủy</Button>
                        <Button color="primary" onClick={handleQuickAgencySave} disabled={addingAgency}>
                            {addingAgency ? <Spinner size="sm" className="me-2" /> : <i className="ri-save-line align-bottom me-1"></i>}
                            Lưu đơn vị
                        </Button>
                    </ModalFooter>
                </Modal>
            </div>
        </React.Fragment>
    );
};

export default FeedbackIntake;
