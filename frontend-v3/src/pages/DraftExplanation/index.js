import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Input, Table, Spinner, Badge } from 'reactstrap';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast } from 'react-toastify';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import SimpleBar from 'simplebar-react';
import FeatherIcon from 'feather-icons-react';
import ExplanationTable from './ExplanationTable';

const DraftExplanation = () => {
    const [view, setView] = useState('overview'); // 'overview' or 'detail'
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Detail View States
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [structure, setStructure] = useState([]);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [filterType, setFilterType] = useState('has_feedback');
    const [expandedNodeId, setExpandedNodeId] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        if (view === 'overview') {
            fetchStats();
        }
    }, [view]);

    useEffect(() => {
        if (view === 'detail' && selectedDoc) {
            fetchStructure();
        }
    }, [selectedDoc, filterType]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/documents/explanation_stats/', getAuthHeader());
            const data = res.results || res || [];
            setStats(Array.isArray(data) ? data : []);
        } catch (e) {
            toast.error("Lỗi khi tải thống kê giải trình.");
        } finally {
            setLoading(false);
        }
    };

    const fetchStructure = async () => {
        setLoading(true);
        try {
            // Updated endpoint to use feedback_nodes which filters nodes based on feedbacks
            const endpoint = `/api/documents/${selectedDoc.id}/feedback_nodes/?filter_type=${filterType}`;
            const res = await axios.get(endpoint, getAuthHeader());
            const data = res.results || res || [];
            setStructure(Array.isArray(data) ? data : []);
            
            // Auto-select first node if none selected
            if (data.length > 0 && !selectedNodeId) {
                setSelectedNodeId(data[0].id);
                setExpandedNodeId(data[0].id);
            }
        } catch (e) {
            toast.error("Lỗi khi tải danh mục dự thảo.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDetail = (doc) => {
        setSelectedDoc(doc);
        setView('detail');
        setSelectedNodeId(null);
        setExpandedNodeId(null);
    };

    const renderNodeTree = (nodes, depth = 0) => {
        if (!nodes || !Array.isArray(nodes)) return null;
        return nodes.map(node => {
            const hasChildren = node.children && node.children.length > 0;
            const isExpanded = expandedNodeId === node.id;
            
            return (
                <div key={node.id} className="mb-1">
                    <div 
                        className={`p-2 px-3 rounded-3 cursor-pointer transition-all fs-13 mb-1 ${selectedNodeId === node.id ? 'bg-primary text-white shadow-lg active-node' : 'hover:bg-primary-subtle text-body'}`}
                        style={{ marginLeft: `${depth * 15}px`, minWidth: 0, border: selectedNodeId === node.id ? '1px solid var(--vz-primary)' : '1px solid transparent' }}
                        onClick={() => {
                            setSelectedNodeId(node.id);
                            if (node.node_type === 'Điều') {
                                setExpandedNodeId(isExpanded ? null : node.id);
                            }
                        }}
                    >
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center overflow-hidden">
                                <i className={`ri-${node.node_type === 'Khoản' ? 'file-list-3-line' : (isExpanded ? 'arrow-down-s-line' : 'arrow-right-s-line')} fs-16 me-2 ${selectedNodeId === node.id ? 'text-white' : 'text-primary opacity-75'}`}></i>
                                <span className={`fw-medium text-truncate ${selectedNodeId === node.id ? 'text-white' : ''}`}>
                                    {node.node_label}
                                </span>
                            </div>
                            <Badge className={`badge-soft-${node.resolved_feedbacks === node.total_feedbacks ? 'success' : 'warning'} rounded-pill ms-2 shrink-0 ${selectedNodeId === node.id ? 'bg-white text-primary' : ''}`}>
                                {node.resolved_feedbacks}/{node.total_feedbacks}
                            </Badge>
                        </div>
                    </div>
                    {hasChildren && isExpanded && (
                        <div className="mt-1">
                            {renderNodeTree(node.children, depth + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    if (view === 'overview') {
        return (
            <React.Fragment>
                <div className="page-content">
                    <Container fluid>
                        <BreadCrumb title="Giải trình Dự thảo" pageTitle="Quản lý" />
                        <Card className="border-0 shadow-sm card-animate overflow-hidden">
                            <CardHeader className="bg-primary-subtle py-3 d-flex justify-content-between align-items-center border-0">
                                <h5 className="card-title mb-0 fw-bold blue-700"><i className="ri-article-line align-bottom me-1"></i> Các Dự thảo đang xử lý giải trình</h5>
                                <Badge className="badge-soft-primary fs-12">Tổng: {stats.length}</Badge>
                            </CardHeader>
                            <CardBody className="p-0">
                                <div className="table-responsive table-card">
                                    <Table className="align-middle table-nowrap mb-0 table-hover table-centered">
                                        <thead className="table-light text-muted text-uppercase fs-11">
                                            <tr>
                                                <th scope="col" style={{ width: '40%' }}>Tên Dự thảo / Thời gian</th>
                                                <th scope="col" className="text-center" style={{ width: '15%' }}>Tổng góp ý</th>
                                                <th scope="col" className="text-center" style={{ width: '15%' }}>Đã xử lý</th>
                                                <th scope="col" className="text-center" style={{ width: '20%' }}>Tiến độ giải trình</th>
                                                <th scope="col" className="text-center" style={{ width: '10%' }}>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="5" className="text-center py-5"><Spinner color="primary" /></td></tr>
                                            ) : (Array.isArray(stats) ? stats : []).map(doc => {
                                                const progress = doc.total_feedbacks > 0 ? Math.round((doc.resolved_feedbacks / doc.total_feedbacks) * 100) : 100;
                                                return (
                                                    <tr key={doc.id}>
                                                        <td>
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div className="flex-shrink-0">
                                                                    <div className="avatar-sm">
                                                                        <div className="avatar-title bg-soft-primary text-primary rounded-circle fs-16">
                                                                            <i className="ri-file-text-line"></i>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex-grow-1 overflow-hidden">
                                                                    <h6 className="text-truncate mb-1"><Link to="#" onClick={(e) => { e.preventDefault(); handleOpenDetail(doc); }} className="text-reset fw-bold">{doc.project_name}</Link></h6>
                                                                    <p className="text-muted text-truncate mb-0 fs-11">Ngày nhập: {new Date(doc.updated_at).toLocaleDateString('vi-VN')}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="text-center"><Badge className="badge-soft-info fs-12 px-2">{doc.total_feedbacks}</Badge></td>
                                                        <td className="text-center"><Badge className="badge-soft-success fs-12 px-2">{doc.resolved_feedbacks}</Badge></td>
                                                        <td className="text-center">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div className="progress progress-sm flex-grow-1" style={{ height: '5px' }}>
                                                                    <div className="progress-bar bg-success" role="progressbar" style={{ width: `${progress}%` }}></div>
                                                                </div>
                                                                <span className="fs-11 fw-medium">{progress}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="text-center">
                                                            <Button color="primary" className="btn-soft-primary btn-sm btn-icon waves-effect waves-light" onClick={() => handleOpenDetail(doc)}>
                                                                <i className="ri-arrow-right-line"></i>
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </Table>
                                </div>
                            </CardBody>
                        </Card>
                    </Container>
                </div>
            </React.Fragment>
        );
    }

    return (
        <React.Fragment>
            <div className="page-content" style={{ padding: 0, height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>
                <Container fluid className="h-100 d-flex flex-column px-0">
                    <div className="bg-card border-bottom p-3">
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-3">
                                <Button color="soft-secondary" size="sm" onClick={() => setView('overview')}>
                                    <i className="ri-arrow-left-line align-bottom"></i> Quay lại
                                </Button>
                                <h5 className="mb-0 fw-bold">{selectedDoc?.project_name}</h5>
                            </div>
                            <div className="d-flex gap-2 align-items-center">
                                <span className="text-muted fs-12">Bộ lọc hiển thị:</span>
                                <Input 
                                    type="select" 
                                    size="sm" 
                                    className="form-select-sm" 
                                    style={{ width: '200px' }}
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                >
                                    <option value="has_feedback">Có góp ý</option>
                                    <option value="unresolved">Chưa giải trình</option>
                                    <option value="resolved">Đã giải trình</option>
                                    <option value="all">Toàn bộ dự thảo</option>
                                </Input>
                            </div>
                        </div>
                    </div>

                    <Row className="flex-grow-1 g-0 overflow-hidden">
                        <Col lg={3} className="h-100 border-end bg-light-subtle d-flex flex-column">
                            <CardHeader className="bg-transparent border-bottom p-3">
                                <h6 className="card-title mb-0">Danh mục cấu trúc</h6>
                            </CardHeader>
                            <SimpleBar style={{ height: '100%' }} className="p-3">
                                {loading ? (
                                    <div className="text-center py-4"><Spinner size="sm" color="primary" /></div>
                                ) : structure.length > 0 ? (
                                    renderNodeTree(structure)
                                ) : (
                                    <div className="text-center text-muted fs-12 py-5">Không có dữ liệu theo bộ lọc hiện tại.</div>
                                )}
                            </SimpleBar>
                        </Col>
                        <Col lg={9} className="h-100 d-flex flex-column overflow-hidden bg-body">
                            <SimpleBar style={{ height: '100%' }} className="p-4">
                                {selectedNodeId ? (
                                    <ExplanationTable 
                                        documentId={selectedDoc?.id} 
                                        nodeId={selectedNodeId} 
                                        filterType={filterType} 
                                    />
                                ) : (
                                    <div className="d-flex flex-column justify-content-center align-items-center h-100 text-muted">
                                        <div className="avatar-lg mb-3">
                                            <div className="avatar-title bg-primary-subtle text-primary rounded-circle fs-32">
                                                <i className="ri-inbox-line"></i>
                                            </div>
                                        </div>
                                        <h5>Bắt đầu Giải trình</h5>
                                        <p>Vui lòng chọn một Điều hoặc Khoản bên trái để xem và nhập giải trình.</p>
                                    </div>
                                )}
                            </SimpleBar>
                        </Col>
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default DraftExplanation;
