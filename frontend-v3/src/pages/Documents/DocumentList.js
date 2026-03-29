import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardBody, Col, DropdownItem, DropdownMenu, DropdownToggle, Input, Row, UncontrolledDropdown, Progress, Table, Badge, Button } from 'reactstrap';
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
    
    // Types filter
    const [types, setTypes] = useState([]);
    const [selectedType, setSelectedType] = useState('all');

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
        fetchTypes();
    }, [selectedType]);

    const fetchTypes = async () => {
        try {
            const res = await axios.get('/api/documents/types/', getAuthHeader());
            const data = res.results || res;
            setTypes(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Lỗi lấy danh mục:", e);
        }
    };

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const url = selectedType === 'all' 
                ? '/api/documents/' 
                : `/api/documents/?document_type=${selectedType}`;
            const data = await axios.get(url, getAuthHeader());
            setDocs(data.results || data);
        } catch (error) {
            toast.error("Không thể lấy danh sách văn bản.");
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await axios.get('/api/accounts/users/', getAuthHeader());
            const results = data.results || data;
            setUsers(Array.isArray(results) ? results : []);
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
        const baseUrl = process.env.REACT_APP_API_URL || '';
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
                    {/* Left Panel: Document Types */}
                    <Col lg={3}>
                        <Card>
                            <CardBody className="p-0">
                                <ul className="list-group list-group-flush border-dashed border-0">
                                    <li 
                                        className={`list-group-item list-group-item-action cursor-pointer ${selectedType === 'all' ? 'active' : ''}`}
                                        onClick={() => setSelectedType('all')}
                                    >
                                        <i className="ri-folder-2-line align-middle me-2"></i> Tất cả dự thảo
                                    </li>
                                    {types.map(t => (
                                        <li 
                                            key={t.id}
                                            className={`list-group-item list-group-item-action cursor-pointer ${selectedType === t.id ? 'active' : ''}`}
                                            onClick={() => setSelectedType(t.id)}
                                        >
                                            <i className="ri-file-list-3-line align-middle me-2"></i> {t.name}
                                        </li>
                                    ))}
                                </ul>
                            </CardBody>
                        </Card>
                    </Col>

                    {/* Right Panel: Table List */}
                    <Col lg={9}>
                        <Card>
                            <CardBody>
                                <div className="table-responsive">
                                    <Table className="table-hover table-bordered table-nowrap align-middle mb-0">
                                        <thead className="table-light text-muted">
                                            <tr>
                                                <th style={{ width: '50px' }}>STT</th>
                                                <th>Tên dự thảo</th>
                                                <th>Loại</th>
                                                <th>Cơ quan chủ trì</th>
                                                <th>Tiến độ giải trình</th>
                                                <th style={{ width: '100px' }}>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredDocs.map((item, index) => {
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
                                                                    <DropdownItem onClick={() => handleExport(item.id)}>
                                                                        <i className="ri-download-2-fill align-bottom me-2 text-muted"></i> Xuất báo cáo
                                                                    </DropdownItem>
                                                                    <DropdownItem onClick={() => { setSelectedDoc(item); setIsLeadModal(true); }}>
                                                                        <i className="ri-user-star-line align-bottom me-2 text-muted"></i> Phân công PT
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
                                            
                                            {/* Fill empty rows to make at least 10 rows */}
                                            {filteredDocs.length < 10 && [...Array(10 - filteredDocs.length)].map((_, i) => (
                                                <tr key={`empty-${i}`} style={{ height: '59px' }}>
                                                    <td className="text-center text-muted small">{filteredDocs.length + i + 1}</td>
                                                    <td></td>
                                                    <td></td>
                                                    <td></td>
                                                    <td></td>
                                                    <td></td>
                                                </tr>
                                            ))}

                                            {filteredDocs.length === 0 && (
                                                <tr>
                                                    <td colSpan="6" className="text-center py-4 text-muted small italic">
                                                        (Không có dữ liệu dự thảo trong thư mục này)
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

            {/* Modals Implementation */}
            <UploadModal 
                isOpen={isUploadModal} 
                toggle={() => setIsUploadModal(!isUploadModal)} 
                onSuccess={fetchDocuments} 
                types={types}
            />
            
            <EditModal 
                isOpen={isEditModal} 
                toggle={() => setIsEditModal(!isEditModal)} 
                doc={selectedDoc} 
                onSuccess={fetchDocuments} 
                types={types}
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
