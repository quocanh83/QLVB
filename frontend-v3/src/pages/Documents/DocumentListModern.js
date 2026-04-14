import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Spinner, UncontrolledTooltip, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem, Collapse, Form, FormGroup, Label, Input } from 'reactstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getAuthHeader } from '../../helpers/api_helper';
import { ToastContainer, toast } from 'react-toastify';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { useProfile } from "../../Components/Hooks/UserHooks";
import { 
    ModernCard, ModernTable, ModernBadge, ModernButton, ModernProgress, 
    ModernHeader, ModernStatWidget, ModernSearchBox 
} from '../../Components/Common/ModernUI';
import classnames from 'classnames';

import IssuanceModal from './IssuanceModal';
import LeadModal from './LeadModal';
import EditModal from './EditModal';

const DocumentListModern = () => {
    const navigate = useNavigate();
    const { userProfile } = useProfile();

    const [documents, setDocuments] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("All");
    const [typeStats, setTypeStats] = useState([]);

    // Modal state
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [isIssuanceModal, setIsIssuanceModal] = useState(false);
    const [isLeadModal, setIsLeadModal] = useState(false);
    const [isEditModal, setIsEditModal] = useState(false);
    
    // Upload integration state
    const [showUpload, setShowUpload] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadData, setUploadData] = useState({ project_name: '', drafting_agency: '', agency_location: '', document_type_id: '' });
    const [documentTypes, setDocumentTypes] = useState([]);

    const isAdmin = useMemo(() => {
        if (!userProfile) return false;
        const roles = userProfile.roles || [];
        return (
            userProfile.is_staff === true || 
            userProfile.is_superuser === true || 
            userProfile.role === 'admin' || 
            userProfile.role === 'Admin' ||
            roles.some(r => (typeof r === 'string' ? r === 'Admin' : r.role_name === 'Admin'))
        );
    }, [userProfile]);

    useEffect(() => {
        fetchDocuments();
        fetchTypeStats();
        fetchUsers();
        fetchDocumentTypes();
    }, []);

    const fetchDocumentTypes = async () => {
        try {
            const res = await axios.get('/api/documents/document_types/', getAuthHeader());
            setDocumentTypes(res.results || res || []);
        } catch (error) {
            console.error("Lỗi khi tải loại dự thảo", error);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await axios.get('/api/accounts/users/', getAuthHeader());
            setUsers(res.results || res);
        } catch (e) {
            console.error("Lỗi khi tải danh sách người dùng", e);
        }
    };

    const fetchTypeStats = async () => {
        try {
            const res = await axios.get('/api/documents/type_stats/', getAuthHeader());
            setTypeStats(res);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/documents/', getAuthHeader());
            const data = res.results || res;
            setDocuments(Array.isArray(data) ? data : []);
        } catch (e) {
            toast.error("Lỗi khi tải danh sách dự thảo.");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (item) => {
        try {
            const res = await axios.get(`/api/documents/${item.id}/export_report/`, {
                ...getAuthHeader(),
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `BC_TongHop_${item.project_name.substring(0,20)}.docx`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            toast.error("Lỗi khi xuất báo cáo.");
        }
    };

    const onClickDelete = (item) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa dự thảo: ${item.project_name}? Thao tác này KHÔNG THỂ khôi phục.`)) {
            axios.delete(`/api/documents/${item.id}/`, getAuthHeader())
                .then(() => {
                    toast.success("Xóa thành công.");
                    fetchDocuments();
                })
                .catch(() => toast.error("Lỗi khi xóa. Có thể do ràng buộc dữ liệu."));
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile) {
            toast.warning("Vui lòng chọn tệp Word (.docx)");
            return;
        }

        setUploadLoading(true);
        const data = new FormData();
        data.append('project_name', uploadData.project_name);
        data.append('drafting_agency', uploadData.drafting_agency);
        data.append('agency_location', uploadData.agency_location);
        if (uploadData.document_type_id) {
            data.append('document_type_id', uploadData.document_type_id);
        }
        data.append('attached_file_path', uploadFile);

        try {
            await axios.post('/api/documents/', data, {
                headers: { ...getAuthHeader().headers, 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Tải lên và bóc tách thành công!");
            setUploadFile(null);
            setUploadData({ project_name: '', drafting_agency: '', agency_location: '', document_type_id: '' });
            setShowUpload(false);
            fetchDocuments();
        } catch (error) {
            const errorMsg = error.response?.data?.error || "Lỗi khi tải lên văn bản.";
            toast.error(errorMsg);
        } finally {
            setUploadLoading(false);
        }
    };

    const filteredDocs = documents.filter(doc => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
            doc.project_name.toLowerCase().includes(query) || 
            String(doc.id).includes(query) ||
            (doc.drafting_agency || "").toLowerCase().includes(query);
        
        const matchesType = filterType === "All" || (doc.document_type_name || "Khác") === filterType;
        return matchesSearch && matchesType;
    });

    const stats = {
        Total: documents.length,
        Luat: documents.filter(d => (d.document_type_name || "").includes("Luật")).length,
        NghiDinh: documents.filter(d => (d.document_type_name || "").includes("Nghị định")).length,
        ThongTu: documents.filter(d => (d.document_type_name || "").includes("Thông tư")).length,
    };

    return (
        <React.Fragment>
            <div className="designkit-wrapper designkit-layout-root">
                <div className="modern-page-content mt-4">

                    <ModernHeader 
                        title="Hệ thống Dự thảo" 
                        subtitle="Quản lý vòng đời và tiến độ giải trình văn bản quy phạm"
                        actions={
                            <div className="d-flex gap-2">
                                <ModernButton variant="ghost" onClick={fetchDocuments} disabled={loading}>
                                    <i className="ri-refresh-line"></i>
                                </ModernButton>
                                <ModernButton variant={showUpload ? "ghost" : "primary"} onClick={() => setShowUpload(!showUpload)}>
                                    <i className={showUpload ? "ri-close-line" : "ri-add-line"}></i> {showUpload ? "Đóng lại" : "Tải lên mới"}
                                </ModernButton>
                            </div>
                        }
                    >
                        <div className="mt-4" style={{ maxWidth: '400px' }}>
                            <ModernSearchBox 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                placeholder="Tìm kiếm tên dự án, số ID, cơ quan..."
                            />
                        </div>
                    </ModernHeader>
                    <Collapse isOpen={showUpload}>
                        <ModernCard className="mb-4 p-4" style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                            <Form onSubmit={handleUpload}>
                                <Row className="align-items-end g-3">
                                    <Col lg={4}>
                                        <FormGroup className="mb-0">
                                            <Label className="small fw-bold text-uppercase text-muted mb-2">Tên Dự thảo / Dự án <span className="text-danger">*</span></Label>
                                            <Input 
                                                type="text" 
                                                className="modern-input" 
                                                placeholder="Nhập tên dự thảo..."
                                                value={uploadData.project_name} 
                                                onChange={(e) => setUploadData({ ...uploadData, project_name: e.target.value })} 
                                                required 
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col lg={3}>
                                        <FormGroup className="mb-0">
                                            <Label className="small fw-bold text-uppercase text-muted mb-2">Cơ quan chủ trì</Label>
                                            <Input 
                                                type="text" 
                                                className="modern-input" 
                                                placeholder="VD: Bộ Tư pháp"
                                                value={uploadData.drafting_agency} 
                                                onChange={(e) => setUploadData({ ...uploadData, drafting_agency: e.target.value })} 
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col lg={3}>
                                        <FormGroup className="mb-0">
                                            <Label className="small fw-bold text-uppercase text-muted mb-2">Tệp tin (.DOCX) <span className="text-danger">*</span></Label>
                                            <Input 
                                                type="file" 
                                                className="modern-input w-100" 
                                                accept=".docx" 
                                                style={{ padding: '0.45rem 1rem' }}
                                                onChange={(e) => setUploadFile(e.target.files[0])} 
                                                required 
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col lg={2}>
                                        <ModernButton variant="primary" type="submit" className="w-100 py-2" disabled={uploadLoading}>
                                            {uploadLoading ? <Spinner size="sm" /> : <><i className="ri-flashlight-fill"></i> Bắt đầu</>}
                                        </ModernButton>
                                    </Col>
                                </Row>
                            </Form>
                        </ModernCard>
                    </Collapse>

                    <div className="modern-widgets-grid mb-4">
                        <ModernStatWidget 
                            title="Tổng Dự thảo" 
                            value={stats.Total} 
                            label="Tất cả" 
                            icon="ri-file-list-3-line" 
                            isActive={filterType === 'All'} 
                            onClick={() => setFilterType('All')}
                        />
                        <ModernStatWidget 
                            title="Dự thảo Luật" 
                            value={stats.Luat} 
                            label="Cấp cao" 
                            icon="ri-bank-line" 
                            color="success"
                            isActive={filterType === 'Luật'} 
                            onClick={() => setFilterType('Luật')}
                        />
                        <ModernStatWidget 
                            title="Nghị định" 
                            value={stats.NghiDinh} 
                            label="Chính phủ" 
                            icon="ri-government-line" 
                            color="warning"
                            isActive={filterType === 'Nghị định'} 
                            onClick={() => setFilterType('Nghị định')}
                        />
                        <ModernStatWidget 
                            title="Thông tư" 
                            value={stats.ThongTu} 
                            label="Bộ/Ngành" 
                            icon="ri-file-text-line" 
                            color="info"
                            isActive={filterType === 'Thông tư'} 
                            onClick={() => setFilterType('Thông tư')}
                        />
                    </div>

                    {/* Mobile Category Scroll */}
                    <div className="d-flex d-lg-none overflow-x-auto gap-2 mb-4 pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {typeStats.map(item => (
                            <div 
                                key={item.id}
                                onClick={() => setFilterType(item.name === "Tất cả" ? "All" : item.name)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    whiteSpace: 'nowrap',
                                    background: (filterType === item.name || (filterType === 'All' && item.name === 'Tất cả')) ? 'var(--kit-primary)' : 'var(--kit-surface)',
                                    color: (filterType === item.name || (filterType === 'All' && item.name === 'Tất cả')) ? 'white' : 'var(--kit-text-2)',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    border: '1px solid var(--kit-border)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => {
                                    if (!(filterType === item.name || (filterType === 'All' && item.name === 'Tất cả'))) {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                        e.currentTarget.style.borderColor = 'var(--kit-border-strong)';
                                    }
                                }}
                                onMouseOut={(e) => {
                                    if (!(filterType === item.name || (filterType === 'All' && item.name === 'Tất cả'))) {
                                        e.currentTarget.style.background = 'var(--kit-surface)';
                                        e.currentTarget.style.borderColor = 'var(--kit-border)';
                                    }
                                }}
                            >
                                {item.name} ({item.count})
                            </div>
                        ))}
                    </div>

                    <Row>
                        <Col lg={3} className="d-none d-lg-block">
                            <ModernCard style={{ padding: '0.5rem' }}>
                                <div className="px-3 py-3 border-bottom mb-2" style={{ borderColor: 'rgba(255,255,255,0.1) !important' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase' }}>Phân loại chi tiết</span>
                                </div>
                                {typeStats.map(item => (
                                    <div 
                                        key={item.id}
                                        onClick={() => setFilterType(item.name === "Tất cả" ? "All" : item.name)}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            borderRadius: 'var(--kit-radius-sm)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            background: (filterType === item.name || (filterType === 'All' && item.name === 'Tất cả')) ? 'rgba(255,255,255,0.05)' : 'transparent',
                                            color: (filterType === item.name || (filterType === 'All' && item.name === 'Tất cả')) ? 'var(--kit-primary)' : 'inherit',
                                            fontWeight: (filterType === item.name || (filterType === 'All' && item.name === 'Tất cả')) ? 700 : 400
                                        }}
                                    >
                                        <span>{item.name}</span>
                                        <ModernBadge color="ghost" style={{ border: '1px solid var(--kit-border)' }}>{item.count}</ModernBadge>
                                    </div>
                                ))}
                            </ModernCard>
                        </Col>

                        <Col lg={9}>
                            <ModernTable>
                                <thead>
                                    <tr>
                                        <th style={{ width: '60px' }}>STT</th>
                                        <th>Chi tiết Dự thảo</th>
                                        <th>Cơ quan chủ trì</th>
                                        <th className="text-center">Tiến độ</th>
                                        <th className="text-center" style={{ width: '120px' }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="5" className="text-center py-5"><Spinner size="sm" color="primary" /></td></tr>
                                    ) : filteredDocs.map((item, index) => {
                                        const rate = item.total_feedbacks > 0 ? Math.round((item.resolved_feedbacks / item.total_feedbacks) * 100) : 0;
                                        const docType = item.document_type_name || "Khác";
                                        const docTypeLower = docType.toLowerCase();
                                        const typeClass = docTypeLower.includes("luật") ? "luat" : docTypeLower.includes("nghị định") ? "nghidinh" : "thongtu";
                                        const badgeColor = docTypeLower.includes("luật") ? "success" : docTypeLower.includes("nghị định") ? "warning" : "info";
                                        
                                        return (
                                            <tr key={item.id}>
                                                <td data-label="STT" className="fw-medium text-muted">{String(index + 1).padStart(2, '0')}</td>
                                                <td data-label="Chi tiết" data-full-width="true">
                                                    {/* Mobile Top Bar: Badge + Progress Number */}
                                                    <div className="d-flex d-lg-none mobile-top-bar">
                                                        <ModernBadge color={badgeColor}>{docType}</ModernBadge>
                                                        <span className={classnames("mobile-progress-text", typeClass, { "success-complete": rate === 100 })}>{rate}%</span>
                                                    </div>

                                                    <div className="mobile-title">{item.project_name}</div>
                                                    
                                                    {/* Meta Info */}
                                                    <div className="mobile-meta">
                                                        <span className="d-lg-none"><i className="ri-building-line me-1"></i>{item.drafting_agency || 'N/A'}</span>
                                                        <ModernBadge color={badgeColor} className="d-none d-lg-inline-block me-2">{docType}</ModernBadge>
                                                        {item.lead_name && <span className="d-none d-lg-inline-block me-2"><i className="ri-user-star-line me-1"></i>{item.lead_name}</span>}
                                                        <span><i className="ri-attachment-line me-1"></i>{item.appendices?.length || 0} Phụ lục</span>
                                                    </div>
                                                </td>
                                                <td data-label="Cơ quan" className="d-none d-lg-table-cell">{item.drafting_agency || '-'}</td>
                                                <td data-label="Tiến độ" className="d-none d-lg-table-cell">
                                                    <div className="d-flex flex-column gap-1" style={{ minWidth: '120px' }}>
                                                        <div className="d-flex justify-content-between">
                                                            <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{rate}%</span>
                                                        </div>
                                                        <ModernProgress value={item.resolved_feedbacks} max={item.total_feedbacks || 1} color={rate === 100 ? "success" : "primary"} />
                                                    </div>
                                                </td>
                                                <td data-label="Hành động" className="text-center">
                                                    <UncontrolledDropdown>
                                                        <DropdownToggle tag="button" className="modern-btn ghost">
                                                            <i className="ri-more-2-fill"></i>
                                                        </DropdownToggle>
                                                        <DropdownMenu container="body" className="dropdown-menu-dark" end style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                            <DropdownItem onClick={() => navigate(`/documents/${item.id}`)}><i className="ri-eye-line me-2"></i> Xem chi tiết</DropdownItem>
                                                            <DropdownItem onClick={() => navigate(`/consultation-responses/${item.id}`)}><i className="ri-file-list-3-line me-2"></i> VB góp ý & Giải trình</DropdownItem>
                                                            <DropdownItem onClick={() => handleExport(item)}><i className="ri-download-2-line me-2"></i> Xuất Báo cáo Word</DropdownItem>
                                                            <DropdownItem divider />
                                                            <DropdownItem onClick={() => { setSelectedDoc(item); setIsEditModal(true); }}><i className="ri-pencil-line me-2"></i> Chỉnh sửa Văn bản</DropdownItem>
                                                            <DropdownItem onClick={() => { setSelectedDoc(item); setIsLeadModal(true); }}><i className="ri-user-follow-line me-2"></i> Phân công Cán bộ PT</DropdownItem>
                                                            <DropdownItem onClick={() => navigate(`/draft-consultation/${item.id}`)}><i className="ri-send-plane-fill me-2"></i> Lấy ý kiến dự thảo</DropdownItem>
                                                            {isAdmin && (
                                                                <>
                                                                    <DropdownItem divider />
                                                                    <DropdownItem className="text-danger" onClick={() => onClickDelete(item)}><i className="ri-delete-bin-line me-2"></i> Xóa vĩnh viễn</DropdownItem>
                                                                </>
                                                            )}
                                                        </DropdownMenu>
                                                    </UncontrolledDropdown>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredDocs.length === 0 && !loading && (
                                        <tr><td colSpan="5" className="text-center py-5 text-muted">Không tìm thấy dự thảo nào phù hợp.</td></tr>
                                    )}
                                </tbody>
                            </ModernTable>
                        </Col>
                    </Row>
                </div>
            </div>

            {isIssuanceModal && <IssuanceModal isOpen={isIssuanceModal} toggle={() => setIsIssuanceModal(!isIssuanceModal)} doc={selectedDoc} onSuccess={fetchDocuments} />}
            {isLeadModal && <LeadModal isOpen={isLeadModal} toggle={() => setIsLeadModal(false)} doc={selectedDoc} users={users} onSuccess={fetchDocuments} />}
            {isEditModal && <EditModal isOpen={isEditModal} toggle={() => setIsEditModal(!isEditModal)} document={selectedDoc} onSuccess={fetchDocuments} />}
            <ToastContainer closeButton={false} />
        </React.Fragment>
    );
};

export default DocumentListModern;
