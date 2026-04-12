import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Input, Table, Spinner, Form, FormGroup, Label, Nav, NavItem, NavLink, TabContent, TabPane, Badge, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import classnames from 'classnames';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast } from 'react-toastify';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { 
    ModernCard, ModernBadge, ModernButton, 
    ModernHeader, ModernSearchBox, ModernTable 
} from '../../Components/Common/ModernUI';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import SimpleBar from 'simplebar-react';
import { useDropzone } from 'react-dropzone';
import OCRComparisonView from './OCRComparisonView';
import PageSelector from './PageSelector';
import './FeedbackIntake.css';

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
    const [filterMode, setFilterMode] = useState('all'); // 'all', 'diff', 'unassigned'
    
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
        note: '',
        need_opinion: ''
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
            background: "var(--vz-input-bg, rgba(255,255,255,0.05))",
            borderColor: state.isFocused ? "var(--vz-primary, #405189)" : "var(--vz-input-border, rgba(255,255,255,0.1))",
            color: "var(--vz-body-color, #ffffff)",
            borderRadius: '12px',
            padding: '4px 8px',
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
            borderRadius: '12px',
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
            padding: "12px 15px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            borderBottom: "1px solid rgba(255,255,255,0.03)",
            ":last-child": {
                borderBottom: "none"
            },
            ":active": {
                background: "var(--vz-primary, #405189)",
                color: "#fff"
            }
        }),
        singleValue: (base) => ({
            ...base,
            color: "#ffffff",
            fontSize: "15px",
            fontWeight: "600",
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
        })
    };

    const compactSelectStyles = {
        ...selectStyles,
        control: (base, state) => ({
            ...selectStyles.control(base, state),
            minHeight: '28px',
            padding: '0',
            border: 'none',
            background: 'transparent'
        }),
        valueContainer: (base) => ({
            ...base,
            padding: '0 4px',
        }),
        singleValue: (base) => ({
            ...base,
            fontSize: '11px',
            fontWeight: '600',
            color: 'var(--vz-primary)',
            margin: '0'
        }),
        indicatorsContainer: (base) => ({
            ...base,
            height: '28px',
        }),
        input: (base) => ({
            ...base,
            fontSize: '11px',
            margin: '0',
            padding: '0'
        }),
        placeholder: (base) => ({
            ...base,
            fontSize: '11px',
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
        setManualEntry({ ...manualEntry, content: '', reason: '', note: '', need_opinion: '' });
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
            const updatedFeedbacks = feedbacks.map(f => f.key === key ? { 
                ...f, 
                node_id: isApp ? null : realId,
                appendix_id: isApp ? realId : null
            } : f);
            setFeedbacks(updatedFeedbacks);
            return;
        }

        const updatedFeedbacks = feedbacks.map(f => {
            if (f.key === key) {
                let updated = { ...f, [field]: value };
                // Nếu chọn 'Lưu mới' hoặc 'Cập nhật GT' hoặc 'Ghi đè' thì mặc định Giải trình cũng là 'Ghi đè'
                if (field === 'import_mode' && (value === 'add_new' || value === 'explanation_only' || value === 'overwrite')) {
                    if (updated.explanation_status !== 'none') {
                        updated.explanation_import_mode = 'overwrite';
                    }
                }
                return updated;
            }
            return f;
        });
        setFeedbacks(updatedFeedbacks);
    };

    const handleSave = async () => {
        if (!selectedDocId) return toast.warning("Chưa chọn dự thảo!");
        const activeFeedbacks = feedbacks.filter(f => f.import_mode !== 'skip');
        if (activeFeedbacks.length === 0) return toast.warning("Danh sách góp ý trống!");
        
        const missingAgencies = activeFeedbacks.filter(f => !f.agency_id);
        if (missingAgencies.length > 0) {
            return toast.error(`Có ${missingAgencies.length} dòng chưa chọn Đơn vị góp ý. Vui lòng kiểm tra lại (được đánh dấu đỏ)!`);
        }

        setSaving(true);
        try {
            const endpoint = activeTab === '4' || activeTab === '2' ? '/api/feedbacks/confirm_import/' : '/api/feedbacks/bulk_create/';
            
            const payload = endpoint === '/api/feedbacks/confirm_import/' ? {
                document_id: selectedDocId,
                rows: activeFeedbacks,
                gs_url: gsUrl || null,
                save_gs_url: saveGsUrl
            } : {
                document_id: selectedDocId,
                feedbacks: activeFeedbacks,
                metadata: {
                    ...metadata,
                    contributing_agency: globalAgency,
                    agency_id: globalAgencyId,
                    official_doc_number: globalDocNumber
                }
            };

            const res = await axios.post(endpoint, payload, getAuthHeader());
            toast.success(res.data.message || "Đã nạp toàn bộ góp ý vào hệ thống!");
            // Tải lại dữ liệu dự thảo để cập nhật link GS mới lưu
            fetchInitialData(); 
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
            <div className="designkit-wrapper">
                <div className="modern-page-content">
                    <ModernHeader 
                        title="Tiếp nhận Góp ý" 
                        subtitle="Nhập liệu, bóc tách DOCX và OCR/AI"
                        actions={
                            <div className="d-flex gap-2">
                                <ModernButton variant="ghost" onClick={() => navigate(-1)}>
                                    <i className="ri-arrow-left-line"></i> Quay lại
                                </ModernButton>
                                <ModernButton 
                                    variant="primary" 
                                    onClick={handleSave} 
                                    disabled={saving || feedbacks.filter(f => f.import_mode !== 'skip').length === 0 || !selectedDocId}
                                >
                                    {saving ? <Spinner size="sm" /> : <><i className="ri-save-3-line"></i> Lưu {feedbacks.filter(f => f.import_mode !== 'skip').length} góp ý</>}
                                </ModernButton>
                            </div>
                        }
                    />

                    <Container fluid className="px-0">
                        <ModernCard className="mb-4 shadow-sm border-0" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                            <Row className="align-items-center g-3 p-2">
                                <Col lg={6}>
                                    <div className="p-3">
                                        <Label className="text-muted fw-bold small text-uppercase mb-2">Dự thảo văn bản cần góp ý <span className="text-danger">*</span></Label>
                                        <Select
                                            value={documents.find(d => d.id === selectedDocId) ? { value: selectedDocId, label: documents.find(d => d.id === selectedDocId).project_name } : null}
                                            onChange={(opt) => setSelectedDocId(opt ? opt.value : null)}
                                            options={documents.map(d => ({ value: d.id, label: d.project_name }))}
                                            placeholder="-- Tìm và chọn dự thảo --"
                                            styles={selectStyles}
                                            menuPortalTarget={document.body}
                                        />
                                    </div>
                                </Col>
                                <Col lg={6} className="d-flex align-items-end justify-content-lg-end gap-3 p-3">
                                    {selectedDocId && (
                                        <div className="p-2 px-3 rounded-pill bg-primary-subtle border border-primary-subtle d-flex align-items-center gap-2">
                                            <div className="pulse-dot"></div>
                                            <span className="text-primary fw-bold fs-12">Đang nạp dữ liệu cho: {documents.find(d => d.id === selectedDocId)?.project_name}</span>
                                        </div>
                                    )}
                                </Col>
                            </Row>
                        </ModernCard>

                        <div className="modern-tabs-container mb-4">
                            <Nav pills className="nav-pills-custom">
                                <NavItem>
                                    <NavLink
                                        className={classnames("tab-manual", { active: activeTab === '1' })}
                                        onClick={() => toggleTab('1')}
                                    >
                                        <div className="tab-icon-wrap"><i className="ri-edit-box-line"></i></div>
                                        <span>NHẬP THỦ CÔNG</span>
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink
                                        className={classnames("tab-word", { active: activeTab === '2' })}
                                        onClick={() => toggleTab('2')}
                                    >
                                        <div className="tab-icon-wrap"><i className="ri-file-word-line"></i></div>
                                        <span>NHẬP FILE WORD</span>
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink
                                        className={classnames("tab-ai", { active: activeTab === '3' })}
                                        onClick={() => toggleTab('3')}
                                    >
                                        <div className="tab-icon-wrap"><i className="ri-camera-lens-line"></i></div>
                                        <span>QUÉT ẢNH / PDF (AI)</span>
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink
                                        className={classnames("tab-gsheet", { active: activeTab === '4' })}
                                        onClick={() => toggleTab('4')}
                                    >
                                        <div className="tab-icon-wrap"><i className="ri-google-fill"></i></div>
                                        <span>GOOGLE SHEETS</span>
                                    </NavLink>
                                </NavItem>
                            </Nav>
                        </div>

                    <TabContent activeTab={activeTab}>
                        {/* TAB 1: MANUAL NODE ENTRY */}
                        <TabPane tabId="1">
                            <div className="workspace-pane-layout">
                                {/* Sidebar: Danh mục Điều/Khoản */}
                                <div className="pane-sidebar">
                                    <ModernCard className="h-100 p-0 overflow-hidden d-flex flex-column border-0 shadow-sm">
                                        <div className="p-3 border-bottom border-white-5">
                                            <h6 className="text-white-60 fw-bold small text-uppercase mb-3">Cấu trúc dự thảo</h6>
                                            <div className="position-relative">
                                                <Input 
                                                    type="text" 
                                                    className="form-control ps-5 bg-white-5 border-white-10 text-white" 
                                                    placeholder="Tìm nhanh..." 
                                                    value={nodeSearch}
                                                    onChange={(e) => setNodeSearch(e.target.value)}
                                                />
                                                <i className="ri-search-2-line position-absolute top-50 start-0 translate-middle-y ms-3 text-white-40"></i>
                                            </div>
                                        </div>
                                        <div className="flex-grow-1 overflow-auto p-2" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                                            {filteredNodes.length > 0 ? (
                                                <div className="node-list-modern">
                                                    {filteredNodes.map((n) => (
                                                        <div 
                                                            key={n.id} 
                                                            className={classnames("node-item-modern", {
                                                                "active": selectedNodeId === n.unique_id || selectedNodeId === n.id
                                                            })}
                                                            onClick={() => setSelectedNodeId(n.unique_id || n.id)}
                                                        >
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div className={classnames("node-indicator", n.type === 'Appendix' ? 'bg-indigo' : 'bg-primary')}></div>
                                                                <span className="node-label text-truncate">{n.label}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-5 text-muted small italic">Chưa chọn dự thảo hoặc không tìm thấy dữ liệu</div>
                                            )}
                                        </div>
                                    </ModernCard>
                                </div>

                                {/* Content: Form nhập liệu thủ công */}
                                <div className="pane-content flex-grow-1">
                                    <ModernCard className="border-0 bg-transparent p-0 shadow-none">
                                        <div className="p-4 rounded-4 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div className="d-flex align-items-center justify-content-between mb-4">
                                                <h5 className="mb-0 text-white d-flex align-items-center gap-2">
                                                    <i className="ri-edit-circle-line text-primary"></i>
                                                    Nhập góp ý cho: <span className="text-primary-gradient fw-bold">
                                                        {nodes.find(n => n.id === selectedNodeId || n.unique_id === selectedNodeId)?.label || "---"}
                                                    </span>
                                                </h5>
                                                {selectedNodeId && <ModernBadge color="primary">ĐANG SOẠN THẢO</ModernBadge>}
                                            </div>

                                            <Row className="g-4">
                                                <Col lg={7} md={12}>
                                                    <FormGroup className="mb-4">
                                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                                            <Label className="text-muted fw-bold small text-uppercase mb-0">Đơn vị góp ý</Label>
                                                            <ModernButton variant="ghost" className="btn-sm py-0" onClick={() => toggleAgencyModal('manual')}>
                                                                <i className="ri-add-line"></i> THÊM NHANH
                                                            </ModernButton>
                                                        </div>
                                                        <CreatableSelect
                                                            isClearable
                                                            value={agencies.find(a => a.id === manualEntry.agency_id) ? { value: manualEntry.agency_id, label: agencies.find(a => a.id === manualEntry.agency_id).name } : (manualEntry.contributing_agency ? {label: manualEntry.contributing_agency, value: null} : null)}
                                                            onChange={(opt) => setManualEntry({
                                                                ...manualEntry,
                                                                agency_id: opt && !opt.__isNew__ ? opt.value : null,
                                                                contributing_agency: opt ? opt.label : ''
                                                            })}
                                                            options={agencies.map(a => ({ value: a.id, label: a.name }))}
                                                            placeholder="Chọn hoặc nhập tên đơn vị..."
                                                            styles={selectStyles}
                                                            menuPortalTarget={document.body}
                                                        />
                                                    </FormGroup>

                                                    <FormGroup className="mb-4">
                                                        <Label className="text-muted fw-bold small text-uppercase mb-2">Nội dung góp ý <span className="text-danger">*</span></Label>
                                                        <Input 
                                                            type="textarea" 
                                                            rows={6} 
                                                            className="bg-transparent border-light-subtle text-white fs-15 lh-base" 
                                                            style={{ borderRadius: '15px', padding: '15px' }}
                                                            placeholder="Nhập nội dung góp ý chi tiết tại đây..."
                                                            value={manualEntry.content}
                                                            onChange={(e) => setManualEntry({ ...manualEntry, content: e.target.value })}
                                                            disabled={!selectedNodeId}
                                                        />
                                                    </FormGroup>
                                                </Col>

                                                <Col lg={5} md={12}>
                                                    <div className="d-flex flex-column gap-3 h-100">
                                                        <FormGroup className="mb-0">
                                                            <Label className="text-muted fw-bold small text-uppercase mb-2">Lý do / Cơ sở pháp lý</Label>
                                                            <Input 
                                                                type="textarea" 
                                                                rows={3}
                                                                className="bg-transparent border-light-subtle text-white fs-13" 
                                                                placeholder="Nhập lý do hoặc căn cứ..."
                                                                value={manualEntry.reason}
                                                                onChange={(e) => setManualEntry({ ...manualEntry, reason: e.target.value })}
                                                                disabled={!selectedNodeId}
                                                            />
                                                        </FormGroup>

                                                        <FormGroup className="mb-0">
                                                            <Label className="text-danger fw-bold small text-uppercase mb-2 d-flex align-items-center gap-1">
                                                                <i className="ri-error-warning-line"></i> Nội dung cần xin ý kiến lãnh đạo
                                                            </Label>
                                                            <Input 
                                                                type="textarea" 
                                                                rows={3}
                                                                className="bg-danger-subtle border-danger-subtle text-white fs-13" 
                                                                placeholder="Nhập nội dung cần xin ý kiến chuyên sâu..."
                                                                value={manualEntry.need_opinion}
                                                                onChange={(e) => setManualEntry({ ...manualEntry, need_opinion: e.target.value })}
                                                                disabled={!selectedNodeId}
                                                            />
                                                        </FormGroup>

                                                        <div className="mt-auto pt-3">
                                                            <ModernButton 
                                                                variant="primary" 
                                                                className="w-100 py-3 shadow-neon" 
                                                                onClick={handleAddManualToSession} 
                                                                disabled={!selectedNodeId || !manualEntry.content}
                                                            >
                                                                <i className="ri-add-fill fs-18"></i> THÊM VÀO GIỎ CHỜ
                                                            </ModernButton>
                                                        </div>
                                                    </div>
                                                </Col>
                                            </Row>
                                        </div>

                                        <div className="mt-4">
                                            <div className="d-flex align-items-center justify-content-between mb-3 px-2">
                                                <h6 className="text-muted fw-bold small text-uppercase mb-0">Danh sách chờ lưu ({feedbacks.filter(f => f.key.startsWith('manual')).length})</h6>
                                            </div>
                                            <div className="overflow-auto pe-2" style={{ maxHeight: '400px' }}>
                                                <div className="d-flex flex-column gap-3">
                                                    {feedbacks.filter(f => f.key.startsWith('manual')).map((fb) => (
                                                        <ModernCard key={fb.key} className="p-3 border-0" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <ModernBadge color="primary">{fb.node_label}</ModernBadge>
                                                                    <span className="text-white fw-bold fs-13">{fb.contributing_agency}</span>
                                                                </div>
                                                                <button className="btn btn-sm btn-ghost-danger p-0" onClick={() => removeFeedback(fb.key)}>
                                                                    <i className="ri-delete-bin-line fs-16"></i>
                                                                </button>
                                                            </div>
                                                            <p className="mb-0 text-muted-light fs-14 lh-base text-justify">{fb.content}</p>
                                                        </ModernCard>
                                                    ))}
                                                    {feedbacks.filter(f => f.key.startsWith('manual')).length === 0 && (
                                                        <div className="text-center py-5 rounded-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.05)' }}>
                                                            <i className="ri-inbox-line display-6 text-muted d-block mb-2"></i>
                                                            <p className="text-muted small mb-0 opacity-50 italic">Bạn chưa nhập góp ý nào...</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </ModernCard>
                                </div>
                            </div>
                        </TabPane>

                        {/* TAB 2: DOCX INTAKE */}
                        <TabPane tabId="2">
                            <Row className="g-4">
                                <Col lg={4} md={12}>
                                    <ModernCard className="h-100 border-0 shadow-sm overflow-hidden">
                                        <div className="p-3 text-center border-bottom border-light-subtle bg-indigo-subtle bg-opacity-10">
                                            <h6 className="fw-bold mb-1 indigo-text"><i className="ri-file-word-2-line align-bottom me-1"></i> Nhập chuẩn từ File (.docx)</h6>
                                            <p className="text-muted mb-0 small">Hỗ trợ tự động bóc tách AI</p>
                                        </div>
                                        <div className="p-4">
                                            <div 
                                                {...getRootProps()} 
                                                className={classnames(
                                                    "modern-dropzone p-5 mb-4",
                                                    isDragActive ? "active" : "",
                                                    !selectedDocId ? "disabled" : ""
                                                )}
                                            >
                                                <input {...getInputProps()} />
                                                <div className="dz-icon mb-3">
                                                    <i className={classnames(
                                                        "display-4",
                                                        isDragActive ? "ri-download-cloud-2-line indigo-text" : "ri-file-word-line text-muted"
                                                    )}></i>
                                                </div>
                                                {!selectedDocId ? (
                                                    <div className="text-danger small fw-bold">
                                                        <i className="ri-error-warning-line me-1"></i> Vui lòng chọn dự thảo
                                                    </div>
                                                ) : file ? (
                                                    <div>
                                                        <h6 className="text-primary fw-bold mb-1 text-truncate px-2">{file.name}</h6>
                                                        <p className="text-muted small">{(file.size / 1024).toFixed(2)} KB</p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <h6 className="fw-bold mb-1 text-white">Kéo thả File Word vào đây</h6>
                                                        <p className="text-muted small mb-0">Hoặc nhấp để chọn tệp</p>
                                                    </div>
                                                )}
                                            </div>

                                            <ModernButton 
                                                variant="primary" 
                                                className="w-100 py-3 mb-3 shadow-neon" 
                                                onClick={(e) => { e.stopPropagation(); parseFile(); }} 
                                                disabled={!file || uploading}
                                            >
                                                {uploading ? <Spinner size="sm" /> : <><i className="ri-magic-line me-2"></i> BẮT ĐẦU PHÂN TÍCH AI</>}
                                            </ModernButton>

                                            <div className="p-3 rounded-4 bg-indigo bg-opacity-10 border border-indigo border-opacity-10">
                                                <p className="text-indigo-subtle mb-0 small lh-base italic">
                                                    <i className="ri-information-line me-1"></i>
                                                    Hệ thống AI sẽ tự động map nội dung vào các Điều/Khoản tương ứng trong dự thảo.
                                                </p>
                                            </div>
                                        </div>
                                    </ModernCard>
                                </Col>

                                <Col lg={8} md={12}>
                                    <ModernCard className="h-100 border-0 shadow-sm p-0 overflow-hidden">
                                        <div className="p-3 border-bottom border-light-subtle d-flex justify-content-between align-items-center bg-dark bg-opacity-10">
                                            <h6 className="fw-bold mb-0">
                                                <i className="ri-check-double-line text-success me-2"></i>
                                                Kết quả bóc tách ({feedbacks.filter(f => f.key.startsWith('file')).length})
                                            </h6>
                                        </div>
                                        <div className="p-0">
                                            {/* Global Setting for Word Import */}
                                            {feedbacks.filter(f => f.key.startsWith('file')).length > 0 && (
                                                <div className="p-3 border-bottom border-light-subtle bg-light bg-opacity-5">
                                                    <Row className="g-3 align-items-end">
                                                        <Col md={7}>
                                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                                <Label className="text-muted fw-bold small text-uppercase mb-0">Đơn vị góp ý (Áp dụng chung)</Label>
                                                            </div>
                                                            <CreatableSelect
                                                                isClearable
                                                                value={agencies.find(a => a.id === globalAgencyId) ? { value: globalAgencyId, label: agencies.find(a => a.id === globalAgencyId).name } : (globalAgency ? {label: globalAgency, value: null} : null)}
                                                                onChange={(opt) => {
                                                                    setGlobalAgencyId(opt && !opt.__isNew__ ? opt.value : null);
                                                                    setGlobalAgency(opt ? opt.label : '');
                                                                }}
                                                                options={agencies.map(a => ({ value: a.id, label: a.name }))}
                                                                placeholder="Tìm hoặc gõ tên đơn vị..."
                                                                styles={selectStyles}
                                                                menuPortalTarget={document.body}
                                                            />
                                                        </Col>
                                                        <Col md={5}>
                                                            <Label className="text-muted fw-bold small text-uppercase mb-2">Số/Ký hiệu công văn</Label>
                                                            <Input 
                                                                type="text" 
                                                                placeholder="VD: 123/BC-BXD" 
                                                                value={globalDocNumber}
                                                                onChange={(e) => setGlobalDocNumber(e.target.value)}
                                                                className="bg-light-subtle border-light-subtle"
                                                            />
                                                        </Col>
                                                    </Row>
                                                </div>
                                            )}

                                            <div className="table-responsive">
                                                <ModernTable 
                                                    headers={[
                                                        { key: 'content', label: 'NỘI DUNG PHÁT HIỆN', width: '55%' },
                                                        { key: 'node', label: 'ĐIỀU/KHOẢN MAP', width: '30%' },
                                                        { key: 'delete', label: '', className: 'text-center', width: '50px' }
                                                    ]}
                                                >
                                                    {feedbacks.filter(f => f.key.startsWith('file')).length > 0 ? feedbacks.filter(f => f.key.startsWith('file')).map((fb) => (
                                                        <tr key={fb.key}>
                                                            <td>
                                                                <Input 
                                                                    type="textarea" 
                                                                    rows={2} 
                                                                    value={fb.content} 
                                                                    onChange={(e) => updateFeedbackField(fb.key, 'content', e.target.value)}
                                                                    className="table-input-modern fs-13"
                                                                />
                                                            </td>
                                                            <td>
                                                                <Select
                                                                    value={nodes.find(n => n.id === fb.node_id) ? { value: fb.node_id, label: nodes.find(n => n.id === fb.node_id).label } : { value: null, label: 'Chung' }}
                                                                    onChange={(opt) => updateFeedbackField(fb.key, 'node_id', opt ? opt.value : null)}
                                                                    options={[
                                                                        { value: null, label: 'Góp ý chung' },
                                                                        ...nodes.filter(n => n.type !== 'Văn bản').map(n => ({ value: n.id, label: n.label }))
                                                                    ]}
                                                                    styles={compactSelectStyles}
                                                                    menuPortalTarget={document.body}
                                                                />
                                                            </td>
                                                            <td className="text-center">
                                                                <button className="btn btn-sm btn-ghost-danger p-0" onClick={() => removeFeedback(fb.key)}>
                                                                    <i className="ri-delete-bin-line fs-16"></i>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    )) : (
                                                        <tr>
                                                            <td colSpan="3" className="text-center py-5 border-0 bg-transparent text-muted small italic opacity-50">
                                                                <i className="ri-file-word-line display-6 d-block mb-2"></i>
                                                                Dữ liệu AI bóc tách sẽ hiển thị tại đây...
                                                            </td>
                                                        </tr>
                                                    )}
                                                </ModernTable>
                                            </div>
                                        </div>
                                    </ModernCard>
                                </Col>
                            </Row>
                        </TabPane>

                        {/* TAB 3: IMAGE/PDF INTAKE (AI/OCR) */}
                        <TabPane tabId="3">
                            <div className="workspace-pane-layout d-block">
                                {showOCRReview ? (
                                    <div className="w-100">
                                        <OCRComparisonView 
                                            pages={ocrResult} 
                                            onConfirm={handleConfirmOCR} 
                                            onCancel={() => setShowOCRReview(false)} 
                                            loading={uploading2}
                                        />
                                    </div>
                                ) : showPageSelector ? (
                                    <div className="w-100">
                                        <PageSelector 
                                            previews={pdfInfo.previews} 
                                            totalPages={pdfInfo.total_pages} 
                                            onProcessedSelect={startOCR} 
                                            loading={uploading2}
                                        />
                                    </div>
                                ) : (
                                    <Row className="g-4">
                                        <Col xl={4} lg={12}>
                                            <ModernCard className="h-100 border-0 shadow-sm overflow-hidden">
                                                <div className="p-3 text-center border-bottom border-light-subtle bg-info-subtle bg-opacity-10">
                                                    <h6 className="fw-bold mb-1 text-info"><i className="ri-camera-lens-line align-bottom me-1"></i> Quét Ảnh / PDF (AI)</h6>
                                                    <p className="text-muted mb-0 small">Hỗ trợ .pdf, .jpg, .png</p>
                                                </div>
                                                <div className="p-4">
                                                    <div 
                                                        {...getRootProps2()} 
                                                        className={classnames(
                                                            "modern-dropzone p-5 mb-4",
                                                            isDragActive2 ? "active" : "",
                                                            !selectedDocId ? "disabled" : ""
                                                        )}
                                                    >
                                                        <input {...getInputProps2()} />
                                                        <div className="dz-icon mb-3">
                                                            <i className={classnames(
                                                                "display-4",
                                                                isDragActive2 ? "ri-download-cloud-2-line text-info" : "ri-camera-lens-line text-muted"
                                                            )}></i>
                                                        </div>
                                                        {!selectedDocId ? (
                                                            <div className="text-danger small fw-bold text-center">
                                                                <i className="ri-error-warning-line me-1"></i> Vui lòng chọn dự thảo
                                                            </div>
                                                        ) : file2 ? (
                                                            <div className="text-center">
                                                                <h6 className="text-info fw-bold mb-1 text-truncate px-2">{file2.name}</h6>
                                                                <p className="text-muted small">{(file2.size / 1024).toFixed(2)} KB</p>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center">
                                                                <h6 className="fw-bold mb-1 text-white">Kéo thả Ảnh/PDF vào đây</h6>
                                                                <p className="text-muted small mb-0">Hoặc nhấp để chọn tệp</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <ModernButton 
                                                        variant="info" 
                                                        className="w-100 py-3 mb-3 shadow-sm border-0" 
                                                        onClick={(e) => { e.stopPropagation(); parseFile2(); }} 
                                                        disabled={!file2 || uploading2}
                                                    >
                                                        {uploading2 ? <Spinner size="sm" /> : <><i className="ri-scan-2-line me-2"></i> XEM TRƯỚC & QUÉT</>}
                                                    </ModernButton>

                                                    <div className="p-3 rounded-4 bg-info bg-opacity-5 border border-info border-opacity-10">
                                                        <p className="text-info-subtle mb-0 small lh-base italic text-center">
                                                            <i className="ri-information-line me-1"></i>
                                                            Công nghệ AI mới nhất giúp nhận diện bảng biểu và cấu trúc pháp luật chính xác.
                                                        </p>
                                                    </div>
                                                </div>
                                            </ModernCard>
                                        </Col>
                                        <Col lg={8} md={12}>
                                            <ModernCard className="h-100 border-0 shadow-sm p-0 overflow-hidden">
                                                <div className="p-3 border-bottom border-light-subtle d-flex justify-content-between align-items-center bg-dark bg-opacity-10">
                                                    <h6 className="fw-bold mb-0">
                                                        <i className="ri-ai-generate text-info me-2"></i>
                                                        Kết quả quét AI ({feedbacks.filter(f => f.key.startsWith('ocr')).length})
                                                    </h6>
                                                </div>
                                                <div className="p-0">
                                                    <div className="table-responsive text-white">
                                                        <ModernTable 
                                                            headers={[
                                                                { key: 'content', label: 'NỘI DUNG BÓC TÁCH', width: '45%' },
                                                                { key: 'agency', label: 'ĐƠN VỊ', width: '25%' },
                                                                { key: 'node', label: 'ĐIỀU/KHOẢN MAP', width: '25%' },
                                                                { key: 'delete', label: '', className: 'text-center', width: '40px' }
                                                            ]}
                                                        >
                                                            {feedbacks.filter(f => f.key.startsWith('ocr')).length > 0 ? feedbacks.filter(f => f.key.startsWith('ocr')).map((fb) => (
                                                                <tr key={fb.key}>
                                                                    <td>
                                                                        <Input 
                                                                            type="textarea" 
                                                                            rows={2} 
                                                                            value={fb.content} 
                                                                            onChange={(e) => updateFeedbackField(fb.key, 'content', e.target.value)}
                                                                            className="table-input-modern fs-13"
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
                                                                            styles={compactSelectStyles}
                                                                            menuPortalTarget={document.body}
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <Select
                                                                            value={nodes.find(n => n.id === fb.node_id) ? { value: fb.node_id, label: nodes.find(n => n.id === fb.node_id).label } : { value: null, label: 'Chung' }}
                                                                            onChange={(opt) => updateFeedbackField(fb.key, 'node_id', opt ? opt.value : null)}
                                                                            options={[
                                                                                { value: null, label: 'Góp ý chung' },
                                                                                ...nodes.filter(n => n.type !== 'Văn bản').map(n => ({ value: n.id, label: n.label }))
                                                                            ]}
                                                                            styles={compactSelectStyles}
                                                                            menuPortalTarget={document.body}
                                                                        />
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <button className="btn btn-sm btn-ghost-danger p-0" onClick={() => removeFeedback(fb.key)}>
                                                                            <i className="ri-delete-bin-line fs-16"></i>
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            )) : (
                                                                <tr>
                                                                    <td colSpan="4" className="text-center py-5 border-0 bg-transparent text-muted small italic opacity-50">
                                                                        <i className="ri-camera-lens-line display-6 d-block mb-2"></i>
                                                                        Dữ liệu bóc tách từ ảnh/PDF sẽ hiển thị tại đây...
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </ModernTable>
                                                    </div>
                                                </div>
                                            </ModernCard>
                                        </Col>
                                    </Row>
                                )}
                            </div>
                        </TabPane>
                        {/* TAB 4: GOOGLE SHEETS IMPORT */}
                        <TabPane tabId="4">
                            <ModernCard className="border-0 shadow-sm overflow-hidden mb-4">
                                <div className="p-3 border-bottom border-light-subtle d-flex align-items-center justify-content-between bg-success-subtle bg-opacity-10">
                                    <h6 className="card-title mb-0 fw-bold success-text"><i className="ri-google-fill align-bottom me-2"></i> Đồng bộ trực tiếp từ Google Sheets</h6>
                                    <ModernBadge color="success">KẾT NỐI API</ModernBadge>
                                </div>
                                <div className="p-4">
                                    <div className="p-4 rounded-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <Row className="align-items-end g-4">
                                            <Col lg={7} md={12}>
                                                <Label className="text-muted fw-bold small text-uppercase mb-2">Đường dẫn Google Sheets</Label>
                                                <div className="position-relative">
                                                    <Input 
                                                        type="text" 
                                                        placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=..." 
                                                        value={gsUrl}
                                                        onChange={(e) => setGsUrl(e.target.value)}
                                                        className="form-control-lg bg-light-subtle ps-5 border-light-subtle text-white fs-14"
                                                    />
                                                    <i className="ri-links-line position-absolute top-50 start-0 translate-middle-y ms-3 text-muted fs-18"></i>
                                                </div>
                                            </Col>
                                            <Col lg={3} md={12}>
                                                <div className="form-check form-switch form-switch-md mb-2 pb-1">
                                                    <Input 
                                                        className="form-check-input" 
                                                        type="checkbox" 
                                                        id="saveGsUrlSwitch" 
                                                        checked={saveGsUrl}
                                                        onChange={(e) => setSaveGsUrl(e.target.checked)}
                                                    />
                                                    <Label className="form-check-label text-muted small fw-bold" htmlFor="saveGsUrlSwitch">
                                                        Ghi nhớ liên kết cho văn bản này
                                                    </Label>
                                                </div>
                                            </Col>
                                            <Col lg={2} md={12}>
                                                <ModernButton 
                                                    variant="success" 
                                                    className="w-100 py-3 shadow-neon-success" 
                                                    onClick={handleAnalyzeGsUrl}
                                                    disabled={analyzingGs || !selectedDocId}
                                                >
                                                    {analyzingGs ? <Spinner size="sm" /> : <><i className="ri-refresh-line me-2"></i> TẢI DỮ LIỆU</>}
                                                </ModernButton>
                                            </Col>
                                        </Row>
                                    </div>
                                    <div className="mt-3 p-3 rounded-4 bg-success bg-opacity-5 border border-success border-opacity-10">
                                        <p className="text-success-subtle mb-0 small lh-base italic text-center">
                                            <i className="ri-shield-check-line me-1"></i>
                                            Dữ liệu sẽ được so sánh với các bản ghi hiện có để phát hiện trùng lặp hoặc mâu thuẫn.
                                        </p>
                                    </div>
                                </div>
                            </ModernCard>
                        </TabPane>
                    </TabContent>

                   {/* TAB 2 & 4 PREVIEW TABLE */}
                    {(activeTab === '4' || activeTab === '2') && feedbacks.filter(f => !f.key.startsWith('manual') && !f.key.startsWith('ocr')).length > 0 && (
                        <div className="mt-4 px-2">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div className="d-flex align-items-center gap-3">
                                    <h5 className="mb-0 text-white fw-bold"><i className="ri-table-line text-primary me-2"></i> Bảng đối soát kết quả</h5>
                                    <div className="modern-pills-filter">
                                        <div 
                                            className={classnames("filter-item", { active: filterMode === 'all' })}
                                            onClick={() => setFilterMode('all')}
                                        >
                                            Tất cả ({feedbacks.length})
                                        </div>
                                        <div 
                                            className={classnames("filter-item", { active: filterMode === 'diff' })}
                                            onClick={() => setFilterMode('diff')}
                                        >
                                            Dữ liệu mới ({feedbacks.filter(f => !f.is_duplicate || f.explanation_status === 'new' || f.explanation_status === 'conflict').length})
                                        </div>
                                        <div 
                                            className={classnames("filter-item", { active: filterMode === 'unassigned' })}
                                            onClick={() => setFilterMode('unassigned')}
                                        >
                                            Chưa map Điều ({feedbacks.filter(f => !f.node_id && !f.appendix_id).length})
                                        </div>
                                    </div>
                                </div>
                                <div className="text-primary-subtle small fw-bold">
                                    ĐANG HIỂN THỊ: {feedbacks.filter(f => {
                                        if (f.key.startsWith('manual') || f.key.startsWith('ocr')) return false;
                                        if (filterMode === 'diff') return !f.is_duplicate || f.explanation_status === 'new' || f.explanation_status === 'conflict';
                                        if (filterMode === 'unassigned') return !f.node_id && !f.appendix_id;
                                        return true;
                                    }).length} DÒNG
                                </div>
                            </div>

                            <ModernTable 
                                headers={[
                                    { key: 'node', label: 'ĐIỀU/KHOẢN', width: '130px' },
                                    { key: 'agency', label: 'ĐƠN VỊ GÓP Ý', width: '200px' },
                                    { key: 'content', label: 'NỘI DUNG GÓP Ý' },
                                    { key: 'explanation', label: 'GIẢI TRÌNH (AI)', width: '300px' },
                                    { key: 'opinion', label: 'GHI CHÚ', width: '120px' },
                                    { key: 'mode', label: 'QUY TRÌNH', width: '120px' }
                                ]}
                                loading={analyzingGs}
                            >
                                {feedbacks.filter(f => {
                                    if (f.key.startsWith('manual') || f.key.startsWith('ocr')) return false;
                                    if (filterMode === 'diff') return !f.is_duplicate || f.explanation_status === 'new' || f.explanation_status === 'conflict';
                                    if (filterMode === 'unassigned') return !f.node_id && !f.appendix_id;
                                    return true;
                                }).map((fb) => {
                                    const isUnassigned = !fb.node_id && !fb.appendix_id;
                                    const isDiff = !fb.is_duplicate || fb.explanation_status === 'new' || fb.explanation_status === 'conflict';
                                    
                                    return (
                                        <tr key={fb.key} className={classnames(
                                            fb.is_duplicate ? "is-duplicate-row" : "",
                                            isUnassigned ? "is-unassigned-row" : "",
                                            isDiff && !fb.is_duplicate ? "is-diff-row" : ""
                                        )}>
                                            <td>
                                                <Select
                                                    value={nodes.find(n => (n.unique_id === `node-${fb.node_id}` || n.unique_id === `app-${fb.appendix_id}`)) ? { 
                                                        value: fb.appendix_id ? `app-${fb.appendix_id}` : `node-${fb.node_id}`, 
                                                        label: nodes.find(n => (n.unique_id === `node-${fb.node_id}` || n.unique_id === `app-${fb.appendix_id}`))?.label 
                                                    } : null}
                                                    onChange={(opt) => updateFeedbackField(fb.key, opt?.value?.startsWith('app-') ? 'appendix_id' : 'node_id', opt?.value?.split('-')[1])}
                                                    options={nodes.map(n => ({ value: n.unique_id || `node-${n.id}`, label: n.label }))}
                                                    placeholder="..."
                                                    styles={compactSelectStyles}
                                                    menuPortalTarget={document.body}
                                                />
                                            </td>
                                            <td>
                                                <CreatableSelect
                                                    isClearable
                                                    value={agencies.find(a => a.id === fb.agency_id) ? { value: fb.agency_id, label: agencies.find(a => a.id === fb.agency_id).name } : (fb.agency_name ? {label: fb.agency_name, value: null} : null)}
                                                    onChange={(opt) => updateFeedbackField(fb.key, 'agency_id', opt ? opt.value : null)}
                                                    options={agencies.map(a => ({ value: a.id, label: a.name }))}
                                                    styles={compactSelectStyles}
                                                    menuPortalTarget={document.body}
                                                    placeholder="..."
                                                />
                                                {fb.official_number && <div className="mt-1 small-badge">{fb.official_number}</div>}
                                            </td>
                                            <td>
                                                <div className="position-relative">
                                                    <Input 
                                                        type="textarea" 
                                                        rows={2} 
                                                        className="table-input-modern" 
                                                        value={fb.content}
                                                        onChange={(e) => updateFeedbackField(fb.key, 'content', e.target.value)}
                                                    />
                                                    {fb.is_duplicate && <div className="corner-tag warning">TRÙNG</div>}
                                                </div>
                                            </td>
                                            <td>
                                                {fb.explanation_status === 'none' ? (
                                                    <span className="text-muted italic small opacity-50">Không có giải trình</span>
                                                ) : (
                                                    <div className={classnames("explanation-compact-card shadow-sm", fb.explanation_status)}>
                                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                                            <span className="status-badge">
                                                                {fb.explanation_status === 'conflict' ? "CẬP NHẬT" : (fb.explanation_status === 'identical' ? "TRÙNG LẶP" : "MỚI")}
                                                            </span>
                                                            <select 
                                                                className="import-mode-select fs-11"
                                                                value={fb.explanation_import_mode}
                                                                onChange={(e) => updateFeedbackField(fb.key, 'explanation_import_mode', e.target.value)}
                                                            >
                                                                <option value="overwrite">Ghi đè</option>
                                                                <option value="skip">Bỏ qua</option>
                                                            </select>
                                                        </div>
                                                        <div className="exp-content fs-12 lh-base">
                                                            {fb.explanation_status === 'conflict' ? (
                                                                <>
                                                                    <div className="text-primary-gradient fw-bold mb-1">Mới: {fb.explanation_content || "[Trống]"}</div>
                                                                    <div className="text-muted-light border-top border-light border-opacity-10 pt-1 mt-1 opacity-75">Cũ: {fb.existing_explanation}</div>
                                                                </>
                                                            ) : fb.explanation_content}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <Input 
                                                    type="textarea" 
                                                    rows={2} 
                                                    className={classnames("table-input-modern", fb.need_opinion ? 'bg-danger-subtle bg-opacity-10 text-danger' : '')} 
                                                    value={fb.need_opinion || ""}
                                                    placeholder="..."
                                                    onChange={(e) => updateFeedbackField(fb.key, 'need_opinion', e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <Input 
                                                    type="select" 
                                                    size="sm"
                                                    value={fb.import_mode}
                                                    onChange={(e) => updateFeedbackField(fb.key, 'import_mode', e.target.value)}
                                                    className={classnames("modern-select-sm", fb.import_mode === 'skip' ? 'text-muted' : 'text-primary fw-bold')}
                                                >
                                                    <option value="add_new">Lưu mới</option>
                                                    <option value="explanation_only">Cập nhật GT</option>
                                                    <option value="overwrite">Ghi đè</option>
                                                    <option value="skip">Bỏ qua</option>
                                                </Input>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </ModernTable>
                        </div>
                    )}
                </Container>

                {/* Quick Add Agency Modal */}
                <Modal isOpen={agencyModal} toggle={toggleAgencyModal} centered size="sm">
                    <ModalHeader toggle={toggleAgencyModal} className="bg-white-5 border-bottom border-white-10 p-3">Thêm nhanh đơn vị</ModalHeader>
                    <ModalBody>
                        <FormGroup>
                            <Label className="form-label fw-bold">Tên đơn vị <span className="text-danger">*</span></Label>
                            <Input 
                                type="text" 
                                placeholder="Nhập tên đơn vị..." 
                                value={newAgencyName}
                                onChange={(e) => setNewAgencyName(e.target.value)}
                                autoFocus
                            />
                        </FormGroup>
                        <FormGroup className="mb-0">
                            <Label className="form-label fw-bold">Phân loại</Label>
                            <CreatableSelect
                                isClearable
                                placeholder="Chọn hoặc thêm mới..."
                                value={newAgencyCategory}
                                onChange={(opt) => setNewAgencyCategory(opt)}
                                options={categories.map(c => ({ value: c.id, label: c.name }))}
                                formatCreateLabel={(inputValue) => `Thêm mới: "${inputValue}"`}
                                styles={selectStyles}
                                menuPortalTarget={document.body}
                            />
                        </FormGroup>
                    </ModalBody>
                    <ModalFooter className="bg-white-5 border-top border-white-10 p-2">
                        <Button color="link" className="text-white-50" onClick={toggleAgencyModal}>Hủy</Button>
                        <Button color="primary" onClick={handleQuickAgencySave} disabled={addingAgency}>
                            {addingAgency ? <Spinner size="sm" className="me-2" /> : <i className="ri-save-line align-bottom me-1"></i>}
                            Lưu đơn vị
                        </Button>
                    </ModalFooter>
                </Modal>
            </div>
        </div>
        </React.Fragment>
    );
};

export default FeedbackIntake;
