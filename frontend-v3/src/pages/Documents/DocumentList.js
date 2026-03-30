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

    // Modals
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [isIssuanceModal, setIsIssuanceModal] = useState(false);
    const [isLeadModal, setIsLeadModal] = useState(false);
    const [isEditModal, setIsEditModal] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, []);

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

    const filteredDocs = documents.filter(doc => 
        doc.project_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Danh sách Dự thảo Văn bản" pageTitle="Quản lý" />
                    <ToastContainer closeButton={false} />

                    <Row className="g-4 mb-3">
                        <Col sm="auto">
                            <Button color="success" onClick={() => navigate('/documents/upload')}>
                                <i className="ri-add-line align-bottom me-1"></i> Tải lên dự thảo mới
                            </Button>
                        </Col>
                        <Col sm="3" className="ms-auto">
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

                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader>
                                    <h5 className="card-title mb-0">Tất cả Dự thảo</h5>
                                </CardHeader>
                                <CardBody>
                                    <div className="table-responsive">
                                        <Table className="table-hover table-bordered align-middle table-nowrap">
                                            <thead className="table-light">
                                                <tr>
                                                    <th style={{ width: '50px' }}>STT</th>
                                                    <th>Tên dự thảo / Dự án</th>
                                                    <th>Loại văn bản</th>
                                                    <th>Cơ quan chủ trì</th>
                                                    <th>Tiến độ giải trình</th>
                                                    <th style={{ width: '100px' }}>Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading ? (
                                                    <tr>
                                                        <td colSpan="6" className="text-center py-5">
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
                                                            <td>
                                                                <Link to={`/documents/${item.id}`} className="fw-medium text-body">
                                                                    {item.project_name}
                                                                </Link>
                                                                {item.lead_name && (
                                                                    <div className="text-muted fs-12 mt-1">
                                                                        <i className="ri-user-line align-bottom me-1"></i> PT: {item.lead_name}
                                                                    </div>
                                                                )}
                                                                {item.issuance_number && (
                                                                    <div className="text-success fs-12 mt-1 fw-bold d-flex align-items-center">
                                                                        <i className="ri-send-plane-line align-bottom me-1"></i> Số: {item.issuance_number} ({item.issuance_date})
                                                                        {item.issuance_file && (
                                                                            <a href={item.issuance_file} target="_blank" rel="noreferrer" className="ms-2 badge badge-soft-info">
                                                                                <i className="ri-download-line align-bottom"></i> Tải về
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td>
                                                                <Badge color="soft-primary" className="text-primary">{item.document_type_name || 'Khác'}</Badge>
                                                            </td>
                                                            <td>{item.drafting_agency || '-'}</td>
                                                            <td>
                                                                <div className="d-flex align-items-center">
                                                                    <Progress value={rate} color={rate === 100 ? "success" : "primary"} className="w-100 me-2" style={{ height: "6px" }} />
                                                                    <span className="fs-12">{rate}%</span>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <UncontrolledDropdown direction='start'>
                                                                    <DropdownToggle tag="button" className="btn btn-sm btn-light btn-icon text-muted p-1">
                                                                        <FeatherIcon icon="more-horizontal" className="icon-sm" />
                                                                    </DropdownToggle>

                                                                    <DropdownMenu className="dropdown-menu-end">
                                                                        <DropdownItem onClick={() => navigate(`/documents/${item.id}`)}>
                                                                            <i className="ri-eye-fill align-bottom me-2 text-muted"></i> Xem chi tiết
                                                                        </DropdownItem>
                                                                        <DropdownItem onClick={() => navigate(`/documents/${item.id}/responses`)}>
                                                                            <i className="ri-file-list-3-fill align-bottom me-2 text-muted"></i> Quản lý VB góp ý
                                                                        </DropdownItem>
                                                                        <DropdownItem onClick={() => handleExport(item.id)}>
                                                                            <i className="ri-download-2-fill align-bottom me-2 text-muted"></i> Xuất báo cáo
                                                                        </DropdownItem>
                                                                        <DropdownItem onClick={() => { setSelectedDoc(item); setIsLeadModal(true); }}>
                                                                            <i className="ri-user-star-line align-bottom me-2 text-muted"></i> Phân công PT
                                                                        </DropdownItem>
                                                                        <DropdownItem onClick={() => { setSelectedDoc(item); setIsIssuanceModal(true); }}>
                                                                            <i className="ri-send-plane-fill align-bottom me-2 text-muted"></i> Phát hành văn bản
                                                                        </DropdownItem>
                                                                        <DropdownItem onClick={() => { setSelectedDoc(item); setIsEditModal(true); }}>
                                                                            <i className="ri-pencil-fill align-bottom me-2 text-muted"></i> Sửa văn bản
                                                                        </DropdownItem>
                                                                        <div className="dropdown-divider"></div>
                                                                        <DropdownItem onClick={() => onClickDelete(item)} className="text-danger">
                                                                            <i className="ri-delete-bin-fill align-bottom me-2 text-danger"></i> Xóa vĩnh viễn
                                                                        </DropdownItem>
                                                                    </DropdownMenu>
                                                                </UncontrolledDropdown>
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
