import React, { useState, useEffect, useCallback } from 'react';
import { 
    Container, Row, Col, Nav, NavItem, NavLink, TabContent, TabPane, 
    Form, FormGroup, Label, Input, Spinner, Modal, ModalHeader, ModalBody, ModalFooter,
    UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem 
} from 'reactstrap';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast, ToastContainer } from 'react-toastify';
import classnames from 'classnames';

// Modern UI Components
import { 
    ModernCard, ModernTable, ModernBadge, ModernButton, 
    ModernHeader, ModernStatWidget, ModernProgress 
} from '../../Components/Common/ModernUI';
import DeleteModal from "../../Components/Common/DeleteModal";

const ConsultationHub = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('1');
    const [loading, setLoading] = useState(true);
    const [documentInfo, setDocumentInfo] = useState(null);
    const [agencies, setAgencies] = useState([]);

    // Tab 1 state (Issuance)
    const [issuanceData, setIssuanceData] = useState({ issuance_number: '', issuance_date: '', consulted_agencies: [] });
    const [newAgenciesSelection, setNewAgenciesSelection] = useState([]);
    const [issuanceFile, setIssuanceFile] = useState(null);
    const [matching, setMatching] = useState(false);

    // Tab 3 state (Responses)
    const [responses, setResponses] = useState([]);
    const [respModal, setRespModal] = useState(false);
    const [isEditResp, setIsEditResp] = useState(false);
    const [currentResp, setCurrentResp] = useState({ agency: '', official_number: '', official_date: '', attached_file: null });
    const [isDeleteModal, setIsDeleteModal] = useState(false);
    const [selectedResp, setSelectedResp] = useState(null);

    // Draft Selection State
    const [allDocuments, setAllDocuments] = useState([]);
    const [docsLoading, setDocsLoading] = useState(false);

    // Quick Add Agency state
    const [agencyModal, setAgencyModal] = useState(false);
    const [newAgencyName, setNewAgencyName] = useState("");
    const [categories, setCategories] = useState([]);
    const [pageSize] = useState(10);
    const [page2, setPage2] = useState(1);
    const [page3, setPage3] = useState(1);

    // Filters for Tab 2
    const [filterCategory2, setFilterCategory2] = useState(null);
    const [filterStatus2, setFilterStatus2] = useState(null); // {value: 'done'/'pending', label: '...'}
    const [searchAgency2, setSearchAgency2] = useState("");

    // Filters for Tab 3
    const [searchAgency3, setSearchAgency3] = useState("");

    useEffect(() => {
        fetchAllDocuments();
    }, []);

    useEffect(() => {
        if (id) {
            fetchInitialData();
        } else {
            setDocumentInfo(null);
            setLoading(false);
        }
    }, [id]);

    const fetchAllDocuments = async () => {
        setDocsLoading(true);
        try {
            const res = await axios.get('/api/documents/', getAuthHeader());
            const data = res.results || res || [];
            setAllDocuments(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Lỗi tải danh sách dự thảo");
        } finally {
            setDocsLoading(false);
        }
    };

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [docRes, agencyRes, catRes] = await Promise.all([
                axios.get(`/api/documents/${id}/`, getAuthHeader()),
                axios.get('/api/settings/agencies/', getAuthHeader()),
                axios.get('/api/settings/agency-categories/', getAuthHeader())
            ]);

            setDocumentInfo(docRes);
            setAgencies(agencyRes.results || agencyRes || []);
            setCategories(catRes.results || catRes || []);

            setIssuanceData({
                issuance_number: docRes.issuance_number || '',
                issuance_date: docRes.issuance_date || '',
                consulted_agencies: docRes.consulted_agencies || []
            });

            fetchResponses();
        } catch (e) {
            toast.error("Lỗi khi tải dữ liệu khởi tạo.");
        } finally {
            setLoading(false);
        }
    };

    const formatDateVN = (dateStr) => {
        if (!dateStr) return "";
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            const d = String(date.getDate()).padStart(2, '0');
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const y = date.getFullYear();
            return `${d}-${m}-${y}`;
        } catch (e) {
            return dateStr;
        }
    };

    const fetchResponses = async () => {
        try {
            const res = await axios.get(`/api/feedbacks/responses/?document_id=${id}`, getAuthHeader());
            setResponses(res.results || res || []);
        } catch (e) {
            console.error("Lỗi tải danh sách góp ý.");
        }
    };

    const handleUpdateDoc = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        const data = new FormData();
        data.append('issuance_number', issuanceData.issuance_number);
        data.append('issuance_date', issuanceData.issuance_date);
        
        const allAgencies = new Set([...issuanceData.consulted_agencies, ...newAgenciesSelection]);
        allAgencies.forEach(agId => data.append('consulted_agencies', agId));
        
        if (issuanceFile) data.append('issuance_file', issuanceFile);

        try {
            await axios.patch(`/api/documents/${id}/`, data, getAuthHeader());
            toast.success("Cập nhật thông tin phát hành tham vấn thành công.");
            fetchInitialData();
        } catch (error) {
            toast.error("Lỗi khi cập nhật.");
        } finally {
            setLoading(false);
        }
    };

    const handleRespSubmit = async (e) => {
        e.preventDefault();
        const data = new FormData();
        data.append('document', id);
        if (currentResp.agency) data.append('agency', currentResp.agency);
        data.append('official_number', currentResp.official_number);
        data.append('official_date', currentResp.official_date);
        if (currentResp.attached_file && typeof currentResp.attached_file !== 'string') {
            data.append('attached_file', currentResp.attached_file);
        }

        try {
            if (isEditResp) {
                await axios.patch(`/api/feedbacks/responses/${currentResp.id}/`, data, getAuthHeader());
                toast.success("Cập nhật thành công.");
            } else {
                await axios.post('/api/feedbacks/responses/', data, getAuthHeader());
                toast.success("Thêm văn bản góp ý thành công.");
            }
            fetchResponses();
            fetchInitialData(); // To update Tab 2 tracking
            setRespModal(false);
        } catch (error) {
            toast.error("Lỗi khi lưu dữ liệu.");
        }
    };

    const handleFileMatch = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const data = new FormData();
        data.append('file', file);
        setMatching(true);
        try {
            const res = await axios.post('/api/documents/match_agencies_from_file/', data, getAuthHeader());
            const matchedIds = res.matched_ids || [];
            const existingIds = new Set(issuanceData.consulted_agencies);
            const currentNewIds = new Set(newAgenciesSelection);
            matchedIds.forEach(id => { if (!existingIds.has(id)) currentNewIds.add(id); });
            setNewAgenciesSelection(Array.from(currentNewIds));
            toast.success(`Đã tự động nhận diện được ${matchedIds.length} đơn vị từ tệp.`);
        } catch (err) {
            toast.error("Lỗi khi quét danh sách đơn vị.");
        } finally {
            setMatching(false);
        }
    };

    const handleQuickAgencySave = async () => {
        if (!newAgencyName.trim()) return toast.warning("Nhập tên đơn vị");
        try {
            const res = await axios.post('/api/settings/agencies/', { name: newAgencyName }, getAuthHeader());
            toast.success("Thêm đơn vị thành công");
            const agencyRes = await axios.get('/api/settings/agencies/', getAuthHeader());
            setAgencies(agencyRes.results || agencyRes || []);
            setAgencyModal(false);
            setNewAgencyName("");
        } catch (e) { toast.error("Lỗi thêm đơn vị"); }
    };

    const selectStyles = {
        control: (base, state) => ({
            ...base,
            background: "rgba(255, 255, 255, 0.05)",
            borderColor: state.isFocused ? "var(--kit-primary)" : "rgba(255, 255, 255, 0.1)",
            color: "white",
            borderRadius: "10px",
            minHeight: "45px",
            boxShadow: "none"
        }),
        singleValue: (base) => ({ ...base, color: "white" }),
        menu: (base) => ({ ...base, backgroundColor: "#1e2027", zIndex: 1070 }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected ? "var(--kit-primary)" : state.isFocused ? "rgba(255, 255, 255, 0.1)" : "transparent",
            color: "white"
        }),
        placeholder: (base) => ({ ...base, color: "rgba(255, 255, 255, 0.5)" }),
        multiValue: (base) => ({ ...base, background: "rgba(255, 255, 255, 0.1)", borderRadius: "6px" }),
        multiValueLabel: (base) => ({ ...base, color: "white" }),
        input: (base) => ({ ...base, color: "white" })
    };

    if (loading && !documentInfo) return <div className="text-center py-5"><Spinner color="primary" /></div>;

    return (
        <div className="designkit-wrapper designkit-layout-root">
            <div className="modern-page-content modern-content-wrapper">
                <ModernHeader 
                    title="Quản lý Tham vấn Dự thảo" 
                    subtitle={
                        <div className="d-flex align-items-center gap-3 mt-2 flex-wrap">
                            <div style={{ minWidth: '300px' }}>
                                <Select
                                    isLoading={docsLoading}
                                    options={allDocuments.map(d => ({ value: d.id, label: d.project_name }))}
                                    value={id ? { value: id, label: documentInfo?.project_name || "Đang tải..." } : null}
                                    onChange={(opt) => navigate(`/consultation-hub/${opt.value}`)}
                                    placeholder="--- Chọn dự thảo văn bản ---"
                                    styles={selectStyles}
                                />
                            </div>
                            {id && <span className="text-white-40 italic small">| {documentInfo?.drafting_agency}</span>}
                        </div>
                    }
                    actions={
                        <div className="d-flex gap-2">
                            <ModernButton variant="ghost" onClick={() => navigate(-1)}>
                                <i className="ri-arrow-left-line"></i> Quay lại
                            </ModernButton>
                            {activeTab === '1' && (
                                <ModernButton variant="primary" onClick={handleUpdateDoc}>
                                    <i className="ri-send-plane-fill"></i> Cập nhật & Phát hành
                                </ModernButton>
                            )}
                            {activeTab === '3' && (
                                <ModernButton variant="success" onClick={() => { setRespModal(true); setIsEditResp(false); }}>
                                    <i className="ri-add-line"></i> Thêm tệp góp ý
                                </ModernButton>
                            )}
                        </div>
                    }
                />

                <style>
                    {`
                        @media (max-width: 768px) {
                            /* Clear Previous Messy Rules */
                            .modern-table { display: none !important; }
                            
                            /* Layout fix for TabPane */
                            .tab-pane {
                                padding-bottom: 151px !important; /* Space for pagination and bottom nav */
                            }

                            /* Individual Mobile Card Styling */
                            .mobile-hub-card {
                                margin-bottom: 1.25rem !important;
                                padding: 1.25rem !important;
                                position: relative;
                            }

                            .mobile-hub-card .agency-name {
                                font-size: 14px !important;
                                font-weight: 500 !important;
                                color: var(--kit-text) !important;
                                line-height: 1.4;
                                margin-bottom: 0.75rem;
                                padding-right: 30px; /* space for edit button */
                            }

                            .mobile-hub-card .info-row {
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                width: 100%;
                            }

                            .mobile-hub-card .info-item {
                                font-size: 14px !important;
                                color: var(--kit-text-3) !important;
                            }

                            .mobile-hub-card .info-value {
                                color: var(--kit-info) !important;
                                font-weight: 500;
                            }
                            
                            .mobile-hub-card .date-value {
                                color: var(--kit-text) !important;
                            }

                            .mobile-hub-card .action-btn-top {
                                position: absolute;
                                top: 1.25rem;
                                right: 1rem;
                                color: var(--kit-text-3);
                            }

                            /* Pagination styling fix - Glassmorphism style */
                            .hub-pagination-fixed {
                                border: 1px solid rgba(255,255,255,0.08) !important;
                                border-radius: 16px !important;
                                padding: 0.75rem 1rem !important;
                                margin-top: 1.5rem !important;
                                background: rgba(255,255,255,0.03) !important;
                                backdrop-filter: blur(10px);
                                position: relative;
                                z-index: 5;
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important;
                            }
                            
                            .hub-pagination-fixed .pagination-label {
                                font-size: 13px;
                                color: var(--kit-text-3);
                                font-weight: 500;
                            }

                            .hub-pagination-fixed .btn-pagination {
                                background: rgba(255,255,255,0.05) !important;
                                border: 1px solid rgba(255,255,255,0.1) !important;
                                padding: 6px 14px !important;
                                border-radius: 10px !important;
                                font-size: 13px !important;
                                color: white !important;
                                transition: all 0.2s ease;
                            }

                            .hub-pagination-fixed .btn-pagination:disabled {
                                opacity: 0.3;
                                background: transparent !important;
                            }
                        }
                    `}
                </style>

                <ToastContainer closeButton={false} />

                {id ? (
                    <>
                        <Nav tabs className="modern-nav-tabs mb-4 px-1 gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <NavItem>
                        <NavLink className={classnames({ active: activeTab === '1' })} onClick={() => setActiveTab('1')} style={{ cursor: 'pointer', border: 'none', color: activeTab === '1' ? 'var(--kit-primary)' : 'var(--kit-text-3)', fontWeight: activeTab === '1' ? '700' : '500', paddingBottom: '12px', borderBottom: activeTab === '1' ? '2px solid var(--kit-primary)' : 'none' }}>
                            <i className="ri-send-plane-2-line me-1"></i> 1. Phát hành & Lấy ý kiến
                        </NavLink>
                    </NavItem>
                    <NavItem>
                        <NavLink className={classnames({ active: activeTab === '2' })} onClick={() => setActiveTab('2')} style={{ cursor: 'pointer', border: 'none', color: activeTab === '2' ? 'var(--kit-primary)' : 'var(--kit-text-3)', fontWeight: activeTab === '2' ? '700' : '500', paddingBottom: '12px', borderBottom: activeTab === '2' ? '2px solid var(--kit-primary)' : 'none' }}>
                            <i className="ri-checkbox-circle-line me-1"></i> 2. Theo dõi Đơn vị
                        </NavLink>
                    </NavItem>
                    <NavItem>
                        <NavLink className={classnames({ active: activeTab === '3' })} onClick={() => setActiveTab('3')} style={{ cursor: 'pointer', border: 'none', color: activeTab === '3' ? 'var(--kit-primary)' : 'var(--kit-text-3)', fontWeight: activeTab === '3' ? '700' : '500', paddingBottom: '12px', borderBottom: activeTab === '3' ? '2px solid var(--kit-primary)' : 'none' }}>
                            <i className="ri-file-text-line me-1"></i> 3. Chi tiết Văn bản góp ý
                        </NavLink>
                    </NavItem>
                </Nav>

                <TabContent activeTab={activeTab}>
                    {/* HUB TAB 1 - DRAFT CONSULTATION */}
                    <TabPane tabId="1">
                        <Row>
                            <Col lg={12}>
                                <ModernCard className="p-4 mb-4">
                                    <h6 className="text-white fw-bold mb-4">Thông tin Phát hành Văn bản Tham vấn</h6>
                                    <Row className="gy-4">
                                        <Col lg={6}>
                                            <FormGroup>
                                                <Label className="text-muted small fw-bold text-uppercase">Số văn bản phát hành</Label>
                                                <Input type="text" className="modern-input" placeholder="VD: 123/BXD-VP" value={issuanceData.issuance_number} onChange={(e) => setIssuanceData({ ...issuanceData, issuance_number: e.target.value })} />
                                            </FormGroup>
                                        </Col>
                                        <Col lg={6}>
                                            <FormGroup>
                                                <Label className="text-muted small fw-bold text-uppercase">Ngày phát hành</Label>
                                                <Input type="date" className="modern-input" value={issuanceData.issuance_date} onChange={(e) => setIssuanceData({ ...issuanceData, issuance_date: e.target.value })} />
                                            </FormGroup>
                                        </Col>
                                        <Col lg={12}>
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <Label className="text-muted small fw-bold text-uppercase mb-0">Danh sách đơn vị tham vấn mới</Label>
                                                <div className="d-flex gap-2">
                                                    <Label for="match-file-hub" className="modern-btn ghost btn-sm mb-0 p-0 text-info" style={{ cursor: 'pointer' }}>
                                                        <i className="ri-qr-scan-2-line"></i> Quét từ tệp tệp {matching && <Spinner size="sm" />}
                                                    </Label>
                                                    <Input type="file" id="match-file-hub" className="d-none" onChange={handleFileMatch} accept=".docx,.xlsx" />
                                                </div>
                                            </div>
                                            <Select
                                                isMulti
                                                options={agencies.filter(a => !issuanceData.consulted_agencies.includes(a.id)).map(a => ({ value: a.id, label: a.name }))}
                                                value={agencies.filter(a => newAgenciesSelection.includes(a.id)).map(a => ({ value: a.id, label: a.name }))}
                                                onChange={(selected) => setNewAgenciesSelection((selected || []).map(s => s.value))}
                                                styles={selectStyles}
                                                placeholder="Tìm kiếm và thêm đơn vị..."
                                            />
                                        </Col>
                                        <Col lg={12}>
                                            <FormGroup className="mb-0">
                                                <Label className="text-muted small fw-bold text-uppercase">Đính kèm văn bản phát hành (PDF/Scan)</Label>
                                                <div className="modern-upload-zone p-3 rounded text-center" style={{ border: '2px dashed rgba(255,255,255,0.1)', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
                                                    <Input type="file" className="position-absolute opacity-0" style={{ height: '60px', width: '100%', left: 0, cursor: 'pointer' }} onChange={(e) => setIssuanceFile(e.target.files[0])} />
                                                    <i className="ri-upload-cloud-2-line fs-24 text-muted d-block mb-1"></i>
                                                    <div className="text-white small fw-bold">{issuanceFile ? issuanceFile.name : (documentInfo?.issuance_file ? "Đã có tệp - Nhấn để thay đổi" : "Chọn tệp phát hành hoặc kéo thả")}</div>
                                                </div>
                                            </FormGroup>
                                        </Col>
                                    </Row>
                                </ModernCard>
                            </Col>
                        </Row>
                    </TabPane>

                    {/* HUB TAB 2 - TRACKING (FROM CLASSIFICATION) */}
                    <TabPane tabId="2">
                        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                            <h6 className="mb-0 text-white">Theo dõi tiến độ góp ý của các Cơ quan</h6>
                            <ModernBadge color="primary">
                                {(() => {
                                    const filtered = (documentInfo?.consultation_summary || []).filter(item => {
                                        const matchSearch = !searchAgency2 || item.agency_name.toLowerCase().includes(searchAgency2.toLowerCase());
                                        const matchStatus = !filterStatus2 || (filterStatus2.value === 'done' ? item.has_response : !item.has_response);
                                        const agencyObj = agencies.find(a => a.id === item.agency_id || a.name === item.agency_name);
                                        const matchType = !filterCategory2 || agencyObj?.category === filterCategory2.value;
                                        return matchSearch && matchStatus && matchType;
                                    });
                                    return filtered.length;
                                })()} / {documentInfo?.consultation_summary?.length || 0} Đơn vị
                            </ModernBadge>
                        </div>

                        {/* Filter Bar for Tab 2 */}
                        <Row className="mb-4 g-3">
                            <Col lg={4} md={6}>
                                <Input 
                                    className="modern-input" 
                                    placeholder="Tìm tên đơn vị..." 
                                    value={searchAgency2} 
                                    onChange={(e) => { setSearchAgency2(e.target.value); setPage2(1); }} 
                                />
                            </Col>
                            <Col lg={4} md={6}>
                                <Select
                                    isClearable
                                    options={categories.map(c => ({ value: c.id, label: c.name }))}
                                    value={filterCategory2}
                                    onChange={(opt) => { setFilterCategory2(opt); setPage2(1); }}
                                    placeholder="-- Lọc theo phân loại --"
                                    styles={selectStyles}
                                />
                            </Col>
                            <Col lg={4} md={6}>
                                <Select
                                    isClearable
                                    options={[
                                        { value: 'done', label: 'Đã góp ý' },
                                        { value: 'pending', label: 'Chưa góp ý' }
                                    ]}
                                    value={filterStatus2}
                                    onChange={(opt) => { setFilterStatus2(opt); setPage2(1); }}
                                    placeholder="-- Lọc theo trạng thái --"
                                    styles={selectStyles}
                                />
                            </Col>
                        </Row>
                        
                        {/* Desktop Table View */}
                        <div className="d-none d-lg-block">
                            <ModernCard>
                                <ModernTable>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '60px' }}>STT</th>
                                            <th>Cơ quan tham vấn</th>
                                            <th>Trạng thái</th>
                                            <th>Thông tin góp ý</th>
                                            <th className="text-center">Kết quả</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(documentInfo?.consultation_summary || []).filter(item => {
                                            const matchSearch = !searchAgency2 || item.agency_name.toLowerCase().includes(searchAgency2.toLowerCase());
                                            const matchStatus = !filterStatus2 || (filterStatus2.value === 'done' ? item.has_response : !item.has_response);
                                            const agencyObj = agencies.find(a => a.id === item.agency_id || a.name === item.agency_name);
                                            const matchType = !filterCategory2 || agencyObj?.category === filterCategory2.value;
                                            return matchSearch && matchStatus && matchType;
                                        }).slice((page2 - 1) * pageSize, page2 * pageSize).map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="text-muted">{(page2 - 1) * pageSize + idx + 1}</td>
                                                <td className="fw-bold text-white">{item.agency_name}</td>
                                                <td>
                                                    <ModernBadge color={item.has_response ? "success" : "warning"}>
                                                        {item.has_response ? "Đã góp ý" : "Đang chờ ý kiến"}
                                                    </ModernBadge>
                                                </td>
                                                <td>
                                                    {item.has_response ? (
                                                        <div className="small">
                                                            <span className="text-info">{item.official_number}</span>
                                                            <span className="ms-2 opacity-50">({formatDateVN(item.official_date)})</span>
                                                        </div>
                                                    ) : <span className="opacity-25 italic small">Chưa ghi nhận phản hồi</span>}
                                                </td>
                                                <td className="text-center">
                                                    {item.attached_file && (
                                                        <a href={item.attached_file} target="_blank" rel="noreferrer" className="modern-btn ghost btn-sm">
                                                            <i className="ri-download-cloud-line"></i>
                                                        </a>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </ModernTable>
                            </ModernCard>
                        </div>

                        {/* Mobile Card List View */}
                        <div className="d-block d-lg-none">
                            {(documentInfo?.consultation_summary || []).filter(item => {
                                const matchSearch = !searchAgency2 || item.agency_name.toLowerCase().includes(searchAgency2.toLowerCase());
                                const matchStatus = !filterStatus2 || (filterStatus2.value === 'done' ? item.has_response : !item.has_response);
                                const agencyObj = agencies.find(a => a.id === item.agency_id || a.name === item.agency_name);
                                const matchType = !filterCategory2 || agencyObj?.category === filterCategory2.value;
                                return matchSearch && matchStatus && matchType;
                            }).slice((page2 - 1) * pageSize, page2 * pageSize).map((item, idx) => (
                                <ModernCard key={idx} className="mobile-hub-card">
                                    <div className="agency-name">{item.agency_name}</div>
                                    <div className="info-row">
                                        <div className="info-item">
                                            Số: <span className={classnames("info-value", { "text-white-20": !item.official_number })}>{item.official_number || "---"}</span>
                                        </div>
                                        <div className="info-item">
                                            Ngày: <span className="date-value">{formatDateVN(item.official_date) || "---"}</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 d-flex justify-content-between align-items-center">
                                        <ModernBadge color={item.has_response ? "success" : "warning"} className="xsmall">
                                            {item.has_response ? "Đã góp ý" : "Chờ ý kiến"}
                                        </ModernBadge>
                                        {item.attached_file && (
                                            <a href={item.attached_file} target="_blank" rel="noreferrer" className="text-info small">
                                                <i className="ri-download-cloud-line me-1"></i>Tải tệp
                                            </a>
                                        )}
                                    </div>
                                </ModernCard>
                            ))}
                        </div>

                        {/* Common Pagination */}
                        {(() => {
                            const filtered = (documentInfo?.consultation_summary || []).filter(item => {
                                const matchSearch = !searchAgency2 || item.agency_name.toLowerCase().includes(searchAgency2.toLowerCase());
                                const matchStatus = !filterStatus2 || (filterStatus2.value === 'done' ? item.has_response : !item.has_response);
                                const agencyObj = agencies.find(a => a.id === item.agency_id || a.name === item.agency_name);
                                const matchType = !filterCategory2 || agencyObj?.category === filterCategory2.value;
                                return matchSearch && matchStatus && matchType;
                            });
                            if (filtered.length <= pageSize) return null;
                            return (
                                <div className="hub-pagination-fixed">
                                    <div className="pagination-label">
                                        {Math.min(page2 * pageSize, filtered.length)} / {filtered.length}
                                    </div>
                                    <div className="d-flex gap-2">
                                        <ModernButton variant="ghost" size="sm" className="btn-pagination" disabled={page2 === 1} onClick={() => setPage2(p => p - 1)}>
                                            <i className="ri-arrow-left-s-line me-1"></i>Trước
                                        </ModernButton>
                                        <ModernButton variant="ghost" size="sm" className="btn-pagination" disabled={page2 * pageSize >= filtered.length} onClick={() => setPage2(p => p + 1)}>
                                            Sau<i className="ri-arrow-right-s-line ms-1"></i>
                                        </ModernButton>
                                    </div>
                                </div>
                            );
                        })()}
                    </TabPane>

                    {/* HUB TAB 3 - RESPONSES (FILES) */}
                    <TabPane tabId="3">
                        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                            <h6 className="mb-0 text-white">Danh sách các Văn bản Góp ý đã nhận</h6>
                            <Input 
                                className="modern-input" 
                                style={{ maxWidth: '250px' }}
                                placeholder="Tìm theo tên đơn vị..." 
                                value={searchAgency3} 
                                onChange={(e) => { setSearchAgency3(e.target.value); setPage3(1); }} 
                            />
                        </div>

                        {/* Desktop Table View */}
                        <div className="d-none d-lg-block">
                            <ModernCard>
                                <ModernTable>
                                    <thead>
                                        <tr>
                                            <th>STT</th>
                                            <th>Đơn vị gửi góp ý</th>
                                            <th>Công văn số</th>
                                            <th>Ngày văn bản</th>
                                            <th className="text-center">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {responses.filter(r => !searchAgency3 || r.agency_name.toLowerCase().includes(searchAgency3.toLowerCase()))
                                          .slice((page3 - 1) * pageSize, page3 * pageSize).map((resp, idx) => (
                                            <tr key={resp.id}>
                                                <td className="text-muted">{(page3 - 1) * pageSize + idx + 1}</td>
                                                <td className="fw-bold">{resp.agency_name}</td>
                                                <td><span className="badge bg-primary-10 text-primary">{resp.official_number}</span></td>
                                                <td>{formatDateVN(resp.official_date)}</td>
                                                <td className="text-center">
                                                    <div className="d-flex justify-content-center gap-2">
                                                        <ModernButton variant="ghost" className="btn-sm" onClick={() => { setCurrentResp(resp); setIsEditResp(true); setRespModal(true); }}>
                                                            <i className="ri-pencil-line"></i>
                                                        </ModernButton>
                                                        {resp.attached_file && (
                                                            <a href={resp.attached_file} target="_blank" rel="noreferrer" className="modern-btn ghost btn-sm">
                                                                <i className="ri-download-2-line"></i>
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {responses.length === 0 && (
                                            <tr><td colSpan="5" className="text-center py-5 opacity-50 italic">Chưa có văn bản góp ý nào được tải lên.</td></tr>
                                        )}
                                    </tbody>
                                </ModernTable>
                            </ModernCard>
                        </div>

                        {/* Mobile Card List View */}
                        <div className="d-block d-lg-none">
                            {responses.filter(r => !searchAgency3 || r.agency_name.toLowerCase().includes(searchAgency3.toLowerCase()))
                              .slice((page3 - 1) * pageSize, page3 * pageSize).map((resp, idx) => (
                                <ModernCard key={resp.id} className="mobile-hub-card">
                                    <div className="agency-name">{resp.agency_name}</div>
                                    <div className="info-row">
                                        <div className="info-item">
                                            Số: <span className="info-value">{resp.official_number}</span>
                                        </div>
                                        <div className="info-item">
                                            Ngày: <span className="date-value">{formatDateVN(resp.official_date)}</span>
                                        </div>
                                    </div>
                                    <div className="action-btn-top">
                                        <ModernButton variant="ghost" size="sm" className="p-0" onClick={() => { setCurrentResp(resp); setIsEditResp(true); setRespModal(true); }}>
                                            <i className="ri-pencil-line fs-18"></i>
                                        </ModernButton>
                                    </div>
                                    {resp.attached_file && (
                                        <div className="mt-2 text-end">
                                            <a href={resp.attached_file} target="_blank" rel="noreferrer" className="text-info xsmall">
                                                <i className="ri-file-download-line me-1"></i>Tệp đính kèm
                                            </a>
                                        </div>
                                    )}
                                </ModernCard>
                            ))}
                            {responses.length === 0 && (
                                <div className="text-center py-5 opacity-50 italic text-white-40">Chưa có văn bản góp ý nào.</div>
                            )}
                        </div>

                        {/* Common Pagination */}
                        {(() => {
                            const filtered = responses.filter(r => !searchAgency3 || r.agency_name.toLowerCase().includes(searchAgency3.toLowerCase()));
                            if (filtered.length <= pageSize) return null;
                            return (
                                <div className="hub-pagination-fixed">
                                    <div className="pagination-label">
                                        {Math.min(page3 * pageSize, filtered.length)} / {filtered.length}
                                    </div>
                                    <div className="d-flex gap-2">
                                        <ModernButton variant="ghost" size="sm" className="btn-pagination" disabled={page3 === 1} onClick={() => setPage3(p => p - 1)}>
                                            <i className="ri-arrow-left-s-line me-1"></i>Trước
                                        </ModernButton>
                                        <ModernButton variant="ghost" size="sm" className="btn-pagination" disabled={page3 * pageSize >= filtered.length} onClick={() => setPage3(p => p + 1)}>
                                            Sau<i className="ri-arrow-right-s-line ms-1"></i>
                                        </ModernButton>
                                    </div>
                                </div>
                            );
                        })()}
                    </TabPane>
                        </TabContent>
                    </>
                ) : (
                    <div className="d-flex flex-column align-items-center justify-content-center py-5 text-center" style={{ minHeight: '400px' }}>
                        <div className="avatar-xl mb-4 p-4 rounded-circle bg-white-5 border border-white-5 shadow-lg">
                            <i className="ri-file-list-3-line display-4 text-white-10"></i>
                        </div>
                        <h4 className="fw-bold text-white mb-2">Trung tâm Tham vấn & Góp ý</h4>
                        <p className="text-white-40 max-w-500 mx-auto">Vui lòng chọn một dự thảo văn bản từ bộ chọn ở trên để bắt đầu phát hành tham vấn hoặc theo dõi tiến độ góp ý của các cơ quan.</p>
                        <div className="mt-4">
                            <Link to="/documents-modern" className="modern-btn primary">
                                <i className="ri-arrow-left-line"></i> Về danh sách dự thảo
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Response */}
            <Modal isOpen={respModal} toggle={() => setRespModal(false)} centered size="lg" contentClassName="designkit-wrapper">
                <ModalHeader className="border-bottom-0 pb-0 text-white">
                    {isEditResp ? "Chỉnh sửa văn bản góp ý" : "Thêm văn bản góp ý mới"}
                </ModalHeader>
                <ModalBody className="p-4">
                    <Row className="gy-4">
                        <Col lg={12}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <Label className="text-muted small fw-bold mb-0">1. CHỌN ĐƠN VỊ GÓP Ý</Label>
                                <ModernButton variant="ghost" className="p-0 text-info small" onClick={() => setAgencyModal(true)}>
                                    <i className="ri-add-line"></i> Thêm nhanh đơn vị
                                </ModernButton>
                            </div>
                            <Select
                                options={agencies.map(a => ({ value: a.id, label: a.name }))}
                                value={agencies.filter(a => a.id === Number(currentResp.agency)).map(a => ({ value: a.id, label: a.name }))[0]}
                                onChange={(opt) => setCurrentResp({ ...currentResp, agency: opt.value })}
                                styles={selectStyles}
                            />
                        </Col>
                        <Col lg={6}>
                            <Label className="text-muted small fw-bold">2. SỐ CÔNG VĂN</Label>
                            <Input type="text" className="modern-input" value={currentResp.official_number} onChange={(e) => setCurrentResp({ ...currentResp, official_number: e.target.value })} />
                        </Col>
                        <Col lg={6}>
                            <Label className="text-muted small fw-bold">3. NGÀY BAN HÀNH</Label>
                            <Input type="date" className="modern-input" value={currentResp.official_date} onChange={(e) => setCurrentResp({ ...currentResp, official_date: e.target.value })} />
                        </Col>
                        <Col lg={12}>
                            <Label className="text-muted small fw-bold">4. TỆP ĐÍNH KÈM (PDF/WORD)</Label>
                            <Input type="file" className="modern-input" onChange={(e) => setCurrentResp({ ...currentResp, attached_file: e.target.files[0] })} />
                        </Col>
                    </Row>
                </ModalBody>
                <ModalFooter className="border-top-0 pt-0">
                    <ModernButton variant="ghost" onClick={() => setRespModal(false)}>Hủy</ModernButton>
                    <ModernButton variant="primary" onClick={handleRespSubmit}>Thực hiện</ModernButton>
                </ModalFooter>
            </Modal>

            {/* Quick Add Agency Modal */}
            <Modal isOpen={agencyModal} toggle={() => setAgencyModal(false)} centered size="sm" contentClassName="designkit-wrapper">
                <ModalHeader className="border-bottom-0 text-white">Thêm nhanh cơ quan/đơn vị</ModalHeader>
                <ModalBody>
                    <FormGroup>
                        <Label className="text-muted small fw-bold">TÊN ĐƠN VỊ</Label>
                        <Input type="text" className="modern-input" value={newAgencyName} onChange={(e) => setNewAgencyName(e.target.value)} placeholder="Nhập tên đơn vị..." />
                    </FormGroup>
                </ModalBody>
                <ModalFooter className="border-top-0 pt-0">
                    <ModernButton variant="ghost" onClick={() => setAgencyModal(false)}>Hủy</ModernButton>
                    <ModernButton variant="primary" onClick={handleQuickAgencySave}>Lưu nhanh</ModernButton>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default ConsultationHub;
