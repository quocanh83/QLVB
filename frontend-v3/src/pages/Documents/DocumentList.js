import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Input, Table, Badge, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem, Progress } from 'reactstrap';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { getAuthHeader } from '../../helpers/api_helper';
import { ToastContainer, toast } from 'react-toastify';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import FeatherIcon from "feather-icons-react";
import IssuanceModal from './IssuanceModal';
import LeadModal from './LeadModal';
import EditModal from './EditModal';

const DocumentList = () => {
    document.title = "Danh sách Dự thảo | QLVB V3.0";
    const navigate = useNavigate();

    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("All");
    const [typeStats, setTypeStats] = useState([]); // State cho bảng phân loại bên trái

    // Modals
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [isIssuanceModal, setIsIssuanceModal] = useState(false);
    const [isLeadModal, setIsLeadModal] = useState(false);
    const [isEditModal, setIsEditModal] = useState(false);

    useEffect(() => {
        fetchDocuments();
        fetchTypeStats();
    }, []);

    const fetchTypeStats = async () => {
        try {
            const res = await axios.get('/api/documents/type_stats/', getAuthHeader());
            setTypeStats(res);
        } catch (e) {
            console.error("Lỗi khi tải thống kê loại văn bản", e);
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

    const handleExport = async (id) => {
        try {
            const res = await axios.get(`/api/documents/${id}/export_report/`, {
                ...getAuthHeader(),
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Bao_cao_tong_hop_${id}.docx`);
            document.body.appendChild(link);
            link.click();
        } catch (e) {
            toast.error("Lỗi khi xuất báo cáo.");
        }
    };

    const onClickDelete = (item) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa dự thảo: ${item.project_name}?`)) {
            axios.delete(`/api/documents/${item.id}/`, getAuthHeader())
                .then(() => {
                    toast.success("Xóa thành công.");
                    fetchDocuments();
                })
                .catch(() => toast.error("Lỗi khi xóa."));
        }
    };

    const filteredDocs = documents.filter(doc => {
        const matchesSearch = doc.project_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === "All" || (doc.document_type_name || "Khác") === filterType;
        return matchesSearch && matchesType;
    });

    const getStats = () => {
        const stats = {
            Total: documents.length,
            Luat: documents.filter(d => (d.document_type_name || "").includes("Luật")).length,
            NghiDinh: documents.filter(d => (d.document_type_name || "").includes("Nghị định")).length,
            ThongTu: documents.filter(d => (d.document_type_name || "").includes("Thông tư")).length,
        };
        return stats;
    };

    const stats = getStats();

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Danh sách Dự thảo Văn bản" pageTitle="Quản lý" />
                    <ToastContainer closeButton={false} />

                    {/* Widgets Section */}
                    <Row className="mb-4">
                        <Col xl={3} md={6}>
                            <Card className={`card-animate cursor-pointer ${filterType === 'All' ? 'border-primary border' : ''}`} onClick={() => setFilterType('All')}>
                                <CardBody>
                                    <div className="d-flex align-items-center">
                                        <div className="flex-grow-1 overflow-hidden">
                                            <p className="text-uppercase fw-medium text-muted text-truncate mb-0"> Tổng Dự thảo</p>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-end justify-content-between mt-4">
                                        <div>
                                            <h4 className="fs-22 fw-semibold ff-secondary mb-4">{stats.Total}</h4>
                                            <span className="badge bg-primary-subtle text-primary">Tất cả</span>
                                        </div>
                                        <div className="avatar-sm flex-shrink-0">
                                            <span className="avatar-title bg-primary-subtle rounded fs-3">
                                                <i className="ri-file-list-3-line text-primary"></i>
                                            </span>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col xl={3} md={6}>
                            <Card className={`card-animate cursor-pointer ${filterType === 'Luật' ? 'border-success border' : ''}`} onClick={() => setFilterType('Luật')}>
                                <CardBody>
                                    <div className="d-flex align-items-center">
                                        <div className="flex-grow-1 overflow-hidden">
                                            <p className="text-uppercase fw-medium text-muted text-truncate mb-0"> Dự thảo Luật</p>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-end justify-content-between mt-4">
                                        <div>
                                            <h4 className="fs-22 fw-semibold ff-secondary mb-4">{stats.Luat}</h4>
                                            <span className="badge bg-success-subtle text-success">Cấp cao nhất</span>
                                        </div>
                                        <div className="avatar-sm flex-shrink-0">
                                            <span className="avatar-title bg-success-subtle rounded fs-3">
                                                <i className="ri-bank-line text-success"></i>
                                            </span>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col xl={3} md={6}>
                            <Card className={`card-animate cursor-pointer ${filterType === 'Nghị định' ? 'border-warning border' : ''}`} onClick={() => setFilterType('Nghị định')}>
                                <CardBody>
                                    <div className="d-flex align-items-center">
                                        <div className="flex-grow-1 overflow-hidden">
                                            <p className="text-uppercase fw-medium text-muted text-truncate mb-0"> Nghị định</p>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-end justify-content-between mt-4">
                                        <div>
                                            <h4 className="fs-22 fw-semibold ff-secondary mb-4">{stats.NghiDinh}</h4>
                                            <span className="badge bg-warning-subtle text-warning">Chính phủ</span>
                                        </div>
                                        <div className="avatar-sm flex-shrink-0">
                                            <span className="avatar-title bg-warning-subtle rounded fs-3">
                                                <i className="ri-government-line text-warning"></i>
                                            </span>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col xl={3} md={6}>
                            <Card className={`card-animate cursor-pointer ${filterType === 'Thông tư' ? 'border-info border' : ''}`} onClick={() => setFilterType('Thông tư')}>
                                <CardBody>
                                    <div className="d-flex align-items-center">
                                        <div className="flex-grow-1 overflow-hidden">
                                            <p className="text-uppercase fw-medium text-muted text-truncate mb-0"> Thông tư</p>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-end justify-content-between mt-4">
                                        <div>
                                            <h4 className="fs-22 fw-semibold ff-secondary mb-4">{stats.ThongTu}</h4>
                                            <span className="badge bg-info-subtle text-info">Bộ/Ngành</span>
                                        </div>
                                        <div className="avatar-sm flex-shrink-0">
                                            <span className="avatar-title bg-info-subtle rounded fs-3">
                                                <i className="ri-file-text-line text-info"></i>
                                            </span>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>

                    <Row>
                        {/* Cột trái: Bảng phân loại văn bản */}
                        <Col lg={3}>
                            <Card>
                                <CardHeader className="bg-light">
                                    <h5 className="card-title mb-0"><i className="ri-filter-3-line align-bottom me-1"></i> Phân loại văn bản</h5>
                                </CardHeader>
                                <CardBody className="p-0">
                                    <div className="table-responsive">
                                        <Table className="table-hover mb-0">
                                            <tbody>
                                                {typeStats.map((item) => (
                                                    <tr
                                                        key={item.id}
                                                        onClick={() => setFilterType(item.name === "Tất cả" ? "All" : item.name)}
                                                        className={`cursor-pointer ${((filterType === "All" && item.name === "Tất cả") || filterType === item.name) ? 'table-active fw-bold' : ''}`}
                                                    >
                                                        <td className="ps-3 border-0">
                                                            <div className="d-flex align-items-center">
                                                                <div className="flex-grow-1">
                                                                    {item.name}
                                                                </div>
                                                                <div className="flex-shrink-0">
                                                                    <Badge color="light" className="text-body border">{item.count}</Badge>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                </CardBody>
                            </Card>

                            <div className="mt-3 text-center d-none d-lg-block">
                                <p className="text-muted fs-12">Nhấn vào loại văn bản để lọc nhanh danh sách</p>
                            </div>
                        </Col>

                        {/* Cột phải: Ưidgets và Danh sách */}
                        <Col lg={9}>
                            <Row className="g-4 mb-3">
                                <Col sm="auto">
                                    <Button color="success" onClick={() => navigate('/documents/upload')}>
                                        <i className="ri-add-line align-bottom me-1"></i> Tải lên dự thảo mới
                                    </Button>
                                </Col>
                                <Col sm={4} className="ms-auto">
                                    <div className="search-box">
                                        <Input
                                            type="text"
                                            placeholder="Tìm kiếm dự thảo..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                        <i className="ri-search-line search-icon"></i>
                                    </div>
                                </Col>
                            </Row>

                            <Card>
                                <CardHeader className="d-flex align-items-center border-0">
                                    <h5 className="card-title mb-0 flex-grow-1">
                                        {filterType === 'All' ? 'Tất cả Dự thảo' : `Dự thảo loại: ${filterType}`}
                                    </h5>
                                    <div className="flex-shrink-0">
                                        <Badge color="info-subtle" className="text-info fs-12">{filteredDocs.length} kết quả</Badge>
                                    </div>
                                </CardHeader>
                                <CardBody>
                                    <div className="table-responsive">
                                        <Table className="table-hover table-bordered align-middle table-nowrap mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th style={{ width: '50px' }}>STT</th>
                                                    <th>Tên dự thảo / Dự án</th>
                                                    <th>Cơ quan chủ trì</th>
                                                    <th>Tiến độ giải trình</th>
                                                    <th style={{ width: '180px' }}>Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading ? (
                                                    <tr>
                                                        <td colSpan="5" className="text-center py-5">
                                                            <Spinner color="primary" />
                                                        </td>
                                                    </tr>
                                                ) : filteredDocs.map((item, index) => {
                                                    const rate = item.total_feedbacks > 0
                                                        ? Math.round((item.resolved_feedbacks / item.total_feedbacks) * 100)
                                                        : 0;
                                                    return (
                                                        <tr key={item.id}>
                                                            <td className="text-center">{index + 1}</td>
                                                            <td style={{ whiteSpace: 'normal', minWidth: '300px' }}>
                                                                <Link to={`/documents/${item.id}`} className="fw-medium text-body d-block">
                                                                    {item.project_name}
                                                                </Link>
                                                                <div className="d-flex gap-2 mt-1">
                                                                    <Badge color="soft-primary" className="text-primary">{item.document_type_name || 'Khác'}</Badge>
                                                                    {item.lead_name && (
                                                                        <span className="text-muted fs-12">
                                                                            <i className="ri-user-line align-bottom me-1"></i> PT: {item.lead_name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td>{item.drafting_agency || '-'}</td>
                                                            <td>
                                                                <div className="d-flex align-items-center" style={{ minWidth: '150px' }}>
                                                                    <Progress value={rate} color={rate === 100 ? "success" : "primary"} className="w-100 me-2" style={{ height: "6px" }} />
                                                                    <span className="fs-12">{rate}%</span>
                                                                </div>
                                                            </td>
                                                            <td className="text-center">
                                                                <ul className="list-inline hstack gap-1 justify-content-center mb-0">
                                                                    <li className="list-inline-item" title="Xem chi tiết">
                                                                        <Button color="soft-info" size="sm" className="btn-icon p-1" onClick={() => navigate(`/documents/${item.id}`)}>
                                                                            <i className="ri-eye-fill align-bottom">Xem chi tiết</i>
                                                                        </Button>
                                                                    </li>
                                                                    <li className="list-inline-item" title="Quản lý VB góp ý">
                                                                        <Button color="soft-primary" size="sm" className="btn-icon p-1" onClick={() => navigate(`/documents/${item.id}/responses`)}>
                                                                            <i className="ri-file-list-3-fill align-bottom"></i>
                                                                        </Button>
                                                                    </li>
                                                                    <li className="list-inline-item" title="Xuất báo cáo">
                                                                        <Button color="soft-success" size="sm" className="btn-icon p-1" onClick={() => handleExport(item.id)}>
                                                                            <i className="ri-download-2-fill align-bottom"></i>
                                                                        </Button>
                                                                    </li>
                                                                    <li className="list-inline-item" title="Sửa văn bản">
                                                                        <Button color="soft-warning" size="sm" className="btn-icon p-1" onClick={() => { setSelectedDoc(item); setIsEditModal(true); }}>
                                                                            <i className="ri-pencil-fill align-bottom"></i>
                                                                        </Button>
                                                                    </li>
                                                                    <li className="list-inline-item" title="Phân công PT">
                                                                        <Button color="soft-secondary" size="sm" className="btn-icon p-1" onClick={() => { setSelectedDoc(item); setIsLeadModal(true); }}>
                                                                            <i className="ri-user-star-line align-bottom"></i>
                                                                        </Button>
                                                                    </li>
                                                                    <li className="list-inline-item" title="Phát hành văn bản">
                                                                        <Button color="soft-dark" size="sm" className="btn-icon p-1" onClick={() => { setSelectedDoc(item); setIsIssuanceModal(true); }}>
                                                                            <i className="ri-send-plane-fill align-bottom"></i>
                                                                        </Button>
                                                                    </li>
                                                                    <li className="list-inline-item" title="Xóa vĩnh viễn">
                                                                        <Button color="soft-danger" size="sm" className="btn-icon p-1" onClick={() => onClickDelete(item)}>
                                                                            <i className="ri-delete-bin-fill align-bottom"></i>
                                                                        </Button>
                                                                    </li>
                                                                </ul>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </Table>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>

            <IssuanceModal
                isOpen={isIssuanceModal}
                toggle={() => setIsIssuanceModal(!isIssuanceModal)}
                doc={selectedDoc}
                onSuccess={fetchDocuments}
            />

            <LeadModal
                show={isLeadModal}
                onCloseClick={() => setIsLeadModal(false)}
                documentId={selectedDoc?.id}
                currentLead={selectedDoc?.lead}
                onSuccess={fetchDocuments}
            />

            <EditModal
                isOpen={isEditModal}
                toggle={() => setIsEditModal(!isEditModal)}
                document={selectedDoc}
                onSuccess={fetchDocuments}
            />

        </React.Fragment>
    );
};

const Spinner = ({ color }) => (
    <div className={`spinner-border text-${color}`} role="status">
        <span className="sr-only">Loading...</span>
    </div>
);

export default DocumentList;
