import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardBody, Col, DropdownItem, DropdownMenu, DropdownToggle, Input, Row, UncontrolledDropdown, Progress } from 'reactstrap';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import FeatherIcon from "feather-icons-react";
import { ToastContainer, toast } from 'react-toastify';
import DeleteModal from "../../Components/Common/DeleteModal";

// Import Custom Modals
import UploadModal from './UploadModal';
import EditModal from './EditModal';
import LeadModal from './LeadModal';

const DocumentList = () => {
    const [docs, setDocs] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Modals Control
    const [isUploadModal, setIsUploadModal] = useState(false);
    const [isEditModal, setIsEditModal] = useState(false);
    const [isLeadModal, setIsLeadModal] = useState(false);
    const [isDeleteModal, setIsDeleteModal] = useState(false);
    
    const [selectedDoc, setSelectedDoc] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchDocuments();
        fetchUsers();
    }, []);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/documents/', getAuthHeader());
            setDocs(response.data);
        } catch (error) {
            toast.error("Không thể lấy danh sách văn bản.");
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await axios.get('/api/accounts/users/', getAuthHeader());
            const data = res.data.results || res.data;
            setUsers(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Lỗi lấy danh sách user:", e);
        }
    };

    const onClickDelete = (doc) => {
        setSelectedDoc(doc);
        setIsDeleteModal(true);
    };

    const handleDeleteDoc = async () => {
        if (selectedDoc) {
            try {
                await axios.delete(`/api/documents/${selectedDoc.id}/`, getAuthHeader());
                toast.success("Xóa dự thảo thành công.");
                fetchDocuments();
                setIsDeleteModal(false);
            } catch (error) {
                toast.error("Lỗi khi xóa dự thảo.");
            }
        }
    };

    const handleExport = (id) => {
        const token = localStorage.getItem('access_token');
        const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
        const url = `${baseUrl}/api/documents/${id}/export_report/?token=${token}`;
        window.open(url, "_blank");
    };

    const filteredDocs = docs.filter(doc => 
        doc.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.drafting_agency?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <React.Fragment>
            <ToastContainer closeButton={false} />
            
            {/* Nav & Search */}
            <Row className="g-4 mb-3">
                <div className="col-sm-auto">
                    <div>
                        <button className="btn btn-success" onClick={() => setIsUploadModal(true)}>
                            <i className="ri-add-line align-bottom me-1"></i> Tải lên Dự thảo
                        </button>
                    </div>
                </div>
                <div className="col-sm-3 ms-auto">
                    <div className="search-box">
                        <Input 
                            type="text" 
                            className="form-control" 
                            placeholder="Tìm kiếm dự thảo..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <i className="ri-search-line search-icon"></i>
                    </div>
                </div>
            </Row>

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="sr-only">Đang tải...</span>
                    </div>
                </div>
            ) : (
                <Row>
                    {filteredDocs.map((item, index) => {
                        const rate = item.total_feedbacks > 0 
                            ? Math.round((item.resolved_feedbacks / item.total_feedbacks) * 100) 
                            : 0;
                        
                        return (
                            <Col xxl={3} sm={6} key={index} className="project-card">
                                <Card className="card-height-100 border-0 shadow-sm card-animate">
                                    <CardBody>
                                        <div className={`p-3 mt-n3 mx-n3 bg-${item.status === 'Completed' ? 'success' : 'primary'}-subtle rounded-top`}>
                                            <div className="d-flex align-items-center">
                                                <div className="flex-grow-1">
                                                    <h5 className="mb-0 fs-14 text-truncate">
                                                        <Link to={`/documents/${item.id}`} className="text-body fw-bold">{item.project_name}</Link>
                                                    </h5>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    <UncontrolledDropdown direction='start'>
                                                        <DropdownToggle tag="button" className="btn btn-link text-muted p-1 mt-n2 py-0 text-decoration-none fs-15">
                                                            <FeatherIcon icon="more-horizontal" className="icon-sm" />
                                                        </DropdownToggle>

                                                        <DropdownMenu className="dropdown-menu-end">
                                                            <DropdownItem onClick={() => navigate(`/documents/${item.id}`)}>
                                                                <i className="ri-eye-fill align-bottom me-2 text-muted"></i> Nội dung chi tiết
                                                            </DropdownItem>
                                                            <DropdownItem onClick={() => handleExport(item.id)}>
                                                                <i className="ri-download-2-fill align-bottom me-2 text-muted"></i> Xuất báo cáo
                                                            </DropdownItem>
                                                            <DropdownItem onClick={() => { setSelectedDoc(item); setIsLeadModal(true); }}>
                                                                <i className="ri-user-star-line align-bottom me-2 text-muted"></i> Phân công chủ trì
                                                            </DropdownItem>
                                                            <DropdownItem onClick={() => { setSelectedDoc(item); setIsEditModal(true); }}>
                                                                <i className="ri-pencil-fill align-bottom me-2 text-muted"></i> Hiệu chỉnh
                                                            </DropdownItem>
                                                            <div className="dropdown-divider"></div>
                                                            <DropdownItem onClick={() => onClickDelete(item)} className="text-danger">
                                                                <i className="ri-delete-bin-fill align-bottom me-2 text-danger"></i> Xóa vĩnh viễn
                                                            </DropdownItem>
                                                        </DropdownMenu>
                                                    </UncontrolledDropdown>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="py-3">
                                            <Row className="gy-3">
                                                <Col xs={6}>
                                                    <div>
                                                        <p className="text-muted mb-1 text-uppercase fs-11">Cơ quan chủ trì</p>
                                                        <div className="fs-12 fw-medium text-truncate" title={item.drafting_agency}>{item.drafting_agency || "Chưa rõ"}</div>
                                                    </div>
                                                </Col>
                                                <Col xs={6}>
                                                    <div>
                                                        <p className="text-muted mb-1 text-uppercase fs-11">Cấu trúc AI</p>
                                                        <h5 className="fs-12">{item.total_dieu} Điều | {item.total_khoan} Khoản</h5>
                                                    </div>
                                                </Col>
                                            </Row>

                                            <div className="d-flex align-items-center mt-3">
                                                <p className="text-muted mb-0 me-2 fs-11">Người phụ trách:</p>
                                                <div className={"badge bg-" + (item.lead_name ? "info" : "light") + "-subtle text-" + (item.lead_name ? "info" : "muted")}>
                                                    {item.lead_name || "Trống"}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-auto">
                                            <div className="d-flex mb-2">
                                                <div className="flex-grow-1">
                                                    <div className="fs-12 text-muted">Giải trình góp ý</div>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    <div className="fs-12 fw-bold">{rate}%</div>
                                                </div>
                                            </div>
                                            <Progress value={rate} color={rate === 100 ? "success" : "primary"} className="animated-progess progress-sm" />
                                        </div>
                                    </CardBody>
                                </Card>
                            </Col>
                        );
                    })}

                    {filteredDocs.length === 0 && !loading && (
                        <Col lg={12}>
                            <div className="text-center py-5">
                                <div className="avatar-lg mx-auto mb-4">
                                    <div className="avatar-title bg-light text-primary display-5 rounded-circle">
                                        <i className="ri-file-search-line"></i>
                                    </div>
                                </div>
                                <h5>Không tìm thấy kết quả</h5>
                                <p className="text-muted">Vui lòng thử lại với từ khóa khác hoặc tải lên văn bản mới.</p>
                            </div>
                        </Col>
                    )}
                </Row>
            )}

            {/* Modals Implementation */}
            <UploadModal 
                isOpen={isUploadModal} 
                toggle={() => setIsUploadModal(!isUploadModal)} 
                onSuccess={fetchDocuments} 
            />
            
            <EditModal 
                isOpen={isEditModal} 
                toggle={() => setIsEditModal(!isEditModal)} 
                doc={selectedDoc} 
                onSuccess={fetchDocuments} 
            />

            <LeadModal 
                isOpen={isLeadModal} 
                toggle={() => setIsLeadModal(!isLeadModal)} 
                doc={selectedDoc} 
                users={users} 
                onSuccess={fetchDocuments} 
            />

            <DeleteModal
                show={isDeleteModal}
                onDeleteClick={handleDeleteDoc}
                onCloseClick={() => setIsDeleteModal(false)}
            />

        </React.Fragment>
    );
};

export default DocumentList;
