import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, UncontrolledTooltip, Spinner } from 'reactstrap';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import LeadModal from './LeadModal';
import NodeAssignmentModal from './NodeAssignmentModal';
import { useProfile } from "../../Components/Hooks/UserHooks";
import { 
    ModernTable, ModernBadge, ModernButton, ModernProgress, 
    ModernHeader, ModernStatWidget, ModernSearchBox 
} from '../../Components/Common/ModernUI';
import { ToastContainer, toast } from 'react-toastify';

const ProjectAssignmentModern = () => {
    const { userProfile } = useProfile();
    const [documents, setDocuments] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("All");

    // Modal state
    const [leadModal, setLeadModal] = useState(false);
    const [nodeModal, setNodeModal] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);

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

    const fetchData = async () => {
        setLoading(true);
        try {
            const [docsRes, usersRes] = await Promise.all([
                axios.get('/api/documents/', getAuthHeader()),
                axios.get('/api/accounts/users/', getAuthHeader())
            ]);
            
            const docsData = docsRes.results || docsRes;
            const usersData = usersRes.results || usersRes;

            setDocuments(Array.isArray(docsData) ? docsData : []);
            setUsers(Array.isArray(usersData) ? usersData : []);
        } catch (error) {
            console.error("Error fetching data", error);
            toast.error("Không thể tải danh sách dự thảo.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const toggleLeadModal = () => setLeadModal(!leadModal);
    const toggleNodeModal = () => setNodeModal(!nodeModal);

    const handleAssignLead = (doc) => {
        setSelectedDoc(doc);
        toggleLeadModal();
    };

    const handleAssignNodes = (doc) => {
        setSelectedDoc(doc);
        toggleNodeModal();
    };

    const filteredDocs = documents.filter(doc => {
        const matchesSearch = doc.project_name.toLowerCase().includes(searchQuery.toLowerCase());
        const leads = doc.leads_detail || [];
        const isUnassigned = leads.length === 0;
        const isCompleted = doc.total_feedbacks > 0 && doc.resolved_feedbacks === doc.total_feedbacks;
        const isInProgress = leads.length > 0 && !isCompleted;

        if (filterType === "Unassigned") return matchesSearch && isUnassigned;
        if (filterType === "InProgress") return matchesSearch && isInProgress;
        if (filterType === "Completed") return matchesSearch && isCompleted;
        return matchesSearch;
    });

    const stats = {
        Total: documents.length,
        Unassigned: documents.filter(d => (!d.leads_detail || d.leads_detail.length === 0)).length,
        InProgress: documents.filter(d => (d.leads_detail?.length > 0 && d.resolved_feedbacks < d.total_feedbacks)).length,
        Completed: documents.filter(d => (d.total_feedbacks > 0 && d.resolved_feedbacks === d.total_feedbacks)).length,
    };

    return (
        <React.Fragment>
            <div className="designkit-wrapper designkit-layout-root">
                <div className="modern-page-content">
                    <ModernHeader 
                        title="Phân công Dự thảo" 
                        subtitle="Quản lý chủ trì và đội ngũ chuyên viên giải trình nội dung"
                        actions={
                            <ModernButton variant="ghost" onClick={fetchData} disabled={loading}>
                                {loading ? <Spinner size="sm" /> : <i className="ri-refresh-line"></i>} Làm mới
                            </ModernButton>
                        }
                    >
                        <div className="mt-4" style={{ maxWidth: '400px' }}>
                            <ModernSearchBox 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                placeholder="Tìm kiếm tên dự án..."
                            />
                        </div>
                    </ModernHeader>

                    <div className="modern-widgets-grid mb-4">
                        <ModernStatWidget 
                            title="Tổng Dự thảo" 
                            value={stats.Total} 
                            label="Tất cả" 
                            icon="ri-bubble-chart-line" 
                            isActive={filterType === 'All'} 
                            onClick={() => setFilterType('All')}
                        />
                        <ModernStatWidget 
                            title="Chưa Chủ trì" 
                            value={stats.Unassigned} 
                            label="Cần phân công" 
                            icon="ri-user-unfollow-line" 
                            color="error"
                            isActive={filterType === 'Unassigned'} 
                            onClick={() => setFilterType('Unassigned')}
                        />
                        <ModernStatWidget 
                            title="Đang thực hiện" 
                            value={stats.InProgress} 
                            label="Chuyên viên xử lý" 
                            icon="ri-loader-4-line" 
                            color="warning"
                            isActive={filterType === 'InProgress'} 
                            onClick={() => setFilterType('InProgress')}
                        />
                        <ModernStatWidget 
                            title="Đã hoàn thành" 
                            value={stats.Completed} 
                            label="Giải trình xong" 
                            icon="ri-checkbox-circle-line" 
                            color="success"
                            isActive={filterType === 'Completed'} 
                            onClick={() => setFilterType('Completed')}
                        />
                    </div>

                    <ModernTable>
                        <thead>
                            <tr>
                                <th style={{ width: "60px" }}>STT</th>
                                <th>Thông tin Dự thảo</th>
                                <th>Đội ngũ Chủ trì</th>
                                <th className="text-center">Số Chuyên viên</th>
                                <th className="text-center" style={{ width: "220px" }}>Tiến độ Giải trình</th>
                                <th className="text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDocs.map((doc, index) => {
                                const leads = doc.leads_detail || [];
                                const userId = userProfile?.id || userProfile?.uid || userProfile?.idx;
                                const isLeadOfThisDoc = leads.some(l => l.id == userId || l.uid == userId);
                                const canAssignNodes = isAdmin || isLeadOfThisDoc;
                                const completionRate = doc.total_feedbacks > 0 ? Math.round((doc.resolved_feedbacks / doc.total_feedbacks) * 100) : 0;

                                return (
                                    <tr key={doc.id}>
                                        <td data-label="STT" className="fw-medium text-center" style={{ opacity: 0.5 }}>{String(index + 1).padStart(2, '0')}</td>
                                        
                                        <td data-label="Dự thảo" data-full-width="true">
                                            {/* Mobile Header: Title + Actions */}
                                            <div className="mobile-top-bar d-md-none mb-2">
                                                <div className="mobile-title mb-0" style={{ fontSize: '1rem' }}>{doc.project_name}</div>
                                                <div className="d-flex gap-1" style={{ position: 'absolute', top: '1.25rem', right: '1.25rem' }}>
                                                    {isAdmin && (
                                                        <ModernButton 
                                                            variant="ghost" 
                                                            onClick={(e) => { e.stopPropagation(); handleAssignLead(doc); }}
                                                            style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.05)' }}
                                                        >
                                                            <i className="ri-user-star-line"></i>
                                                        </ModernButton>
                                                    )}
                                                    <ModernButton 
                                                        variant="primary" 
                                                        disabled={!canAssignNodes} 
                                                        onClick={(e) => { e.stopPropagation(); handleAssignNodes(doc); }}
                                                        style={{ padding: '0.4rem' }}
                                                    >
                                                        <i className="ri-user-add-line"></i>
                                                    </ModernButton>
                                                </div>
                                            </div>

                                            {/* Desktop Title */}
                                            <div className="d-none d-md-block" style={{ marginBottom: '4px' }}>
                                                <span className="fw-bold fs-15 text-white">{doc.project_name}</span>
                                            </div>

                                            {/* Meta Info Row */}
                                            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                                <ModernBadge color="info">{doc.document_type_name}</ModernBadge>
                                                <span style={{ fontSize: '0.75rem', opacity: 0.6, fontWeight: 500 }}>ID: #{doc.id}</span>
                                                
                                                {/* Specialists Count integrated for Mobile */}
                                                <div className="d-md-none d-flex align-items-center gap-1 ms-auto" style={{ 
                                                    background: 'rgba(255,255,255,0.05)', 
                                                    padding: '2px 8px', 
                                                    borderRadius: '6px',
                                                    border: '1px solid rgba(255,255,255,0.1)'
                                                }}>
                                                    <i className="ri-team-line text-primary" style={{ fontSize: '0.9rem' }}></i>
                                                    <span className="fw-bold fs-12">{doc.specialists_count || 0} chuyên viên</span>
                                                </div>
                                            </div>

                                            {/* Leads (Integrated for Mobile) */}
                                            <div className="mobile-meta mt-1 d-md-none">
                                                <i className="ri-user-follow-line text-info"></i>
                                                <span className="fs-12">
                                                    {leads.length > 0 ? (
                                                        <span className="text-white-80">{leads.map(l => l.full_name || l.username).join(', ')}</span>
                                                    ) : (
                                                        <span className="text-danger italic">Chưa chỉ định chủ trì</span>
                                                    )}
                                                </span>
                                            </div>
                                        </td>

                                        <td data-label="Chủ trì" className="d-none d-md-table-cell">
                                            {leads.length > 0 ? (
                                                <div className="d-flex flex-wrap gap-2">
                                                    {leads.map(l => (
                                                        <div key={l.id} className="d-flex align-items-center gap-2" style={{
                                                            padding: '4px 12px',
                                                            background: 'var(--kit-surface-2)',
                                                            border: '1px solid var(--kit-border)',
                                                            borderRadius: 'var(--kit-radius-full)',
                                                            fontSize: '0.8rem'
                                                        }}>
                                                            <div className="bg-primary rounded-circle" style={{ width: 8, height: 8 }} />
                                                            <span className="fw-semibold text-white">{l.full_name || l.username}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-danger fs-12 fst-italic">Chưa chỉ định</span>
                                            )}
                                        </td>

                                        <td data-label="C.Viên" className="text-center d-none d-md-table-cell">
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                background: 'var(--kit-bg)',
                                                borderRadius: '10px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'var(--kit-primary)',
                                                fontWeight: '700',
                                                border: '1px solid var(--kit-border)'
                                            }}>
                                                {doc.specialists_count || 0}
                                            </div>
                                        </td>

                                        <td data-label="Tiến độ">
                                            <div className="d-flex flex-column gap-1" style={{ minWidth: '150px' }}>
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--kit-text-3)', textTransform: 'uppercase' }}>Tỷ lệ</span>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: completionRate === 100 ? 'var(--kit-success)' : 'var(--kit-text)' }}>
                                                        {completionRate}% {completionRate === 100 && '✓'}
                                                    </span>
                                                </div>
                                                <ModernProgress 
                                                    value={doc.resolved_feedbacks} 
                                                    max={doc.total_feedbacks || 1} 
                                                    color={completionRate === 100 ? "success" : "primary"} 
                                                />
                                            </div>
                                        </td>

                                        <td data-label="Thao tác" className="text-center d-none d-md-table-cell">
                                            <div className="d-flex justify-content-center gap-2">
                                                {isAdmin && (
                                                    <>
                                                        <ModernButton 
                                                            variant="ghost" 
                                                            onClick={() => handleAssignLead(doc)}
                                                            id={`lead-btn-${doc.id}`}
                                                            style={{ padding: '0.5rem' }}
                                                        >
                                                            <i className="ri-user-star-line"></i>
                                                        </ModernButton>
                                                        <UncontrolledTooltip target={`lead-btn-${doc.id}`} fade={false} trigger="hover" placement="top">
                                                            Chủ trì
                                                        </UncontrolledTooltip>
                                                    </>
                                                )}
                                                
                                                <>
                                                    <ModernButton 
                                                        variant="primary"
                                                        disabled={!canAssignNodes}
                                                        onClick={() => handleAssignNodes(doc)}
                                                        id={`node-btn-${doc.id}`}
                                                        style={{ padding: '0.5rem' }}
                                                    >
                                                        <i className="ri-user-add-line"></i>
                                                    </ModernButton>
                                                    <UncontrolledTooltip target={`node-btn-${doc.id}`} fade={false} trigger="hover" placement="top">
                                                        Chuyên viên
                                                    </UncontrolledTooltip>
                                                </>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredDocs.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="6" className="text-center py-5">
                                        <div style={{ opacity: 0.3, marginBottom: '20px' }}>
                                            <i className="ri-inbox-archive-line" style={{ fontSize: '3rem' }}></i>
                                        </div>
                                        <h6 className="fw-bold mb-1">Trống</h6>
                                        <p className="text-muted fs-13">Không tìm thấy dữ liệu phù hợp.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </ModernTable>
                </div>
            </div>

            {leadModal && (
                <LeadModal 
                    isOpen={leadModal} 
                    toggle={toggleLeadModal} 
                    doc={selectedDoc} 
                    users={users} 
                    onSuccess={fetchData} 
                />
            )}

            {nodeModal && (
                <NodeAssignmentModal 
                    isOpen={nodeModal} 
                    toggle={toggleNodeModal} 
                    doc={selectedDoc} 
                    onSuccess={fetchData} 
                />
            )}
            <ToastContainer />
        </React.Fragment>
    );
};

export default ProjectAssignmentModern;
