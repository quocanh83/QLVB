import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Table, Badge, UncontrolledTooltip, Spinner } from 'reactstrap';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import LeadModal from './LeadModal';
import NodeAssignmentModal from './NodeAssignmentModal';
import { useProfile } from "../../Components/Hooks/UserHooks";

const ProjectAssignment = () => {
    const { userProfile } = useProfile();
    const [documents, setDocuments] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal state
    const [leadModal, setLeadModal] = useState(false);
    const [nodeModal, setNodeModal] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);

    const isAdmin = useMemo(() => {
        if (!userProfile) return false;
        // Kiểm tra nhiều trường hợp: Django (is_staff) hoặc FakeBackend (role === 'admin')
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
            
            // docsRes và usersRes đã là response.data do interceptor
            const docsData = docsRes.results || docsRes;
            const usersData = usersRes.results || usersRes;

            setDocuments(Array.isArray(docsData) ? docsData : []);
            setUsers(Array.isArray(usersData) ? usersData : []);
            
            console.log("Fetched docs:", docsData);
            console.log("User profile:", userProfile);
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

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Phân công Dự thảo" pageTitle="Quản lý Văn bản" />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader className="d-flex align-items-center">
                                    <h5 className="card-title mb-0 flex-grow-1">Danh sách Dự thảo & Phân công</h5>
                                    <Button color="primary" size="sm" onClick={fetchData} disabled={loading}>
                                        {loading ? <Spinner size="sm" /> : <i className="ri-refresh-line"></i>} Làm mới
                                    </Button>
                                </CardHeader>
                                <CardBody>
                                    <div className="table-responsive">
                                        <Table className="align-middle table-nowrap mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th style={{ width: "50px" }}>STT</th>
                                                    <th>Tên Dự thảo</th>
                                                    <th>Cán bộ Chủ trì</th>
                                                    <th className="text-center">Số Chuyên viên</th>
                                                    <th className="text-center">Tiến độ Giải trình</th>
                                                    <th className="text-center">Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {documents.map((doc, index) => {
                                                    const leads = doc.leads_detail || [];
                                                    const userId = userProfile?.id || userProfile?.uid || userProfile?.idx;
                                                    const isLeadOfThisDoc = leads.some(l => l.id == userId || l.uid == userId);
                                                    const canAssignNodes = isAdmin || isLeadOfThisDoc;

                                                    return (
                                                        <tr key={doc.id}>
                                                            <td>{index + 1}</td>
                                                            <td>
                                                                <div className="fw-medium">{doc.project_name}</div>
                                                                <small className="text-muted">{doc.document_type_name}</small>
                                                            </td>
                                                            <td>
                                                                {leads.length > 0 ? (
                                                                    <div className="d-flex flex-wrap gap-1">
                                                                        {leads.map(l => (
                                                                            <Badge key={l.id} color="info" className="badge-soft-info">
                                                                                {l.full_name || l.username}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-danger fs-12 italic">Chưa phân công</span>
                                                                )}
                                                            </td>
                                                            <td className="text-center">
                                                                <Badge color="light" className="text-body border">
                                                                    {doc.specialists_count || 0}
                                                                </Badge>
                                                            </td>
                                                            <td className="text-center">
                                                                <div className="d-flex align-items-center justify-content-center gap-2">
                                                                    <div className="flex-grow-1" style={{ minWidth: "80px", maxWidth: "120px" }}>
                                                                        <div className="progress progress-sm">
                                                                            <div 
                                                                                className="progress-bar bg-success" 
                                                                                role="progressbar" 
                                                                                style={{ width: `${(doc.resolved_feedbacks / (doc.total_feedbacks || 1)) * 100}%` }}
                                                                            ></div>
                                                                        </div>
                                                                    </div>
                                                                    <span className="fs-12">{doc.resolved_feedbacks}/{doc.total_feedbacks}</span>
                                                                </div>
                                                            </td>
                                                            <td className="text-center">
                                                                <div className="d-flex justify-content-center gap-2">
                                                                    {isAdmin && (
                                                                        <Button 
                                                                            color="info" 
                                                                            size="sm" 
                                                                            className="btn-soft-info"
                                                                            onClick={() => handleAssignLead(doc)}
                                                                            id={`lead-btn-${doc.id}`}
                                                                        >
                                                                            <i className="ri-user-star-line"></i> Chủ trì
                                                                            <UncontrolledTooltip target={`lead-btn-${doc.id}`}>Gán người lãnh đạo</UncontrolledTooltip>
                                                                        </Button>
                                                                    )}
                                                                    
                                                                    <Button 
                                                                        color="success" 
                                                                        size="sm" 
                                                                        className="btn-soft-success"
                                                                        disabled={!canAssignNodes}
                                                                        onClick={() => handleAssignNodes(doc)}
                                                                        id={`node-btn-${doc.id}`}
                                                                    >
                                                                        <i className="ri-user-add-line"></i> Chuyên viên
                                                                        <UncontrolledTooltip target={`node-btn-${doc.id}`}>Gán chuyên viên giải trình</UncontrolledTooltip>
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {documents.length === 0 && !loading && (
                                                    <tr>
                                                        <td colSpan="6" className="text-center py-4 text-muted">
                                                            Sẵn sàng cho các dự thảo mới...
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
        </React.Fragment>
    );
};

export default ProjectAssignment;
