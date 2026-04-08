import React, { useState, useEffect } from 'react';
import { 
    Container, Row, Col, Card, CardBody, CardHeader, Button, 
    Table, Modal, ModalHeader, ModalBody, Input, Label, Form,
    UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem
} from 'reactstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { toast, ToastContainer } from 'react-toastify';
import moment from 'moment';

const ReferenceDashboard = () => {
    const navigate = useNavigate();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    
    // Form state
    const [name, setName] = useState('');
    const [file, setFile] = useState(null);
    const [description, setDescription] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const res = await axios.get('/api/comparisons/reference-reviews/', getAuthHeader());
            setReviews(res.results || res);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching reviews", error);
            setLoading(false);
        }
    };

    const toggle = () => {
        setModal(!modal);
        if (!modal) {
            setName('');
            setFile(null);
            setDescription('');
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !name) return toast.warning("Vui lòng nhập tên và chọn tệp.");

        const formData = new FormData();
        formData.append('name', name);
        formData.append('file', file);
        formData.append('description', description);

        setUploading(true);
        try {
            const res = await axios.post('/api/comparisons/reference-reviews/', formData, {
                headers: {
                    ...getAuthHeader().headers,
                    'Content-Type': 'multipart/form-data'
                }
            });
            toast.success("Tải lên và bóc tách thành công!");
            toggle();
            fetchReviews();
            navigate(`/reference-reviews/${res.data.id}`);
        } catch (error) {
            toast.error("Lỗi khi tải lên văn bản.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa lượt rà soát này?")) return;
        try {
            await axios.delete(`/api/comparisons/reference-reviews/${id}/`, getAuthHeader());
            toast.success("Đã xóa.");
            fetchReviews();
        } catch (error) {
            toast.error("Lỗi khi xóa.");
        }
    };

    return (
        <div className="page-content">
            <Container fluid>
                <BreadCrumb title="Rà soát dẫn chiếu chéo" pageTitle="Rà soát Pháp lý" />
                
                <Row className="mb-3">
                    <Col>
                        <div className="d-flex align-items-center">
                            <h4 className="flex-grow-1 mb-0">Lịch sử Rà soát</h4>
                            <Button color="primary" onClick={toggle}>
                                <i className="ri-add-line align-bottom me-1"></i> Bắt đầu Rà soát mới
                            </Button>
                        </div>
                    </Col>
                </Row>

                <Row>
                    <Col lg={12}>
                        <Card>
                            <CardBody>
                                {loading ? (
                                    <div className="text-center py-5">
                                        <div className="spinner-border text-primary"></div>
                                    </div>
                                ) : (
                                    <div className="table-responsive table-card">
                                        <Table className="table-centered align-middle table-nowrap mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th scope="col">Tên phiên bản</th>
                                                    <th scope="col">Ngày tạo</th>
                                                    <th scope="col">Số mục bóc tách</th>
                                                    <th scope="col">Trạng thái rà soát</th>
                                                    <th scope="col">Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reviews.length > 0 ? reviews.map((item) => (
                                                    <tr key={item.id}>
                                                        <td>
                                                            <div className="d-flex align-items-center">
                                                                <div className="flex-shrink-0 me-2">
                                                                    <i className="ri-file-word-2-fill text-primary fs-20"></i>
                                                                </div>
                                                                <div className="flex-grow-1">
                                                                    <h6 className="fs-14 mb-0">
                                                                        <a href="#!" onClick={() => navigate(`/reference-reviews/${item.id}`)} className="text-reset">
                                                                            {item.name}
                                                                        </a>
                                                                    </h6>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>{moment(item.created_at).format('DD/MM/YYYY HH:mm')}</td>
                                                        <td><span className="badge bg-info-subtle text-info">{item.node_count} mục</span></td>
                                                        <td>
                                                            <span className="badge bg-success">Đã bóc tách</span>
                                                        </td>
                                                        <td>
                                                            <UncontrolledDropdown>
                                                                <DropdownToggle tag="button" className="btn btn-soft-secondary btn-sm dropdown">
                                                                    <i className="ri-more-fill align-middle"></i>
                                                                </DropdownToggle>
                                                                <DropdownMenu className="dropdown-menu-end">
                                                                    <DropdownItem onClick={() => navigate(`/reference-reviews/${item.id}`)}>
                                                                        <i className="ri-eye-fill align-bottom me-2 text-muted"></i> Xem kết quả
                                                                    </DropdownItem>
                                                                    <DropdownItem divider />
                                                                    <DropdownItem onClick={() => handleDelete(item.id)}>
                                                                        <i className="ri-delete-bin-fill align-bottom me-2 text-danger"></i> Xóa
                                                                    </DropdownItem>
                                                                </DropdownMenu>
                                                            </UncontrolledDropdown>
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan="5" className="text-center py-5 text-muted">Chưa có dữ liệu rà soát.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </Table>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </Col>
                </Row>

                {/* Modal Upload */}
                <Modal isOpen={modal} toggle={toggle} className="modal-dialog-centered">
                    <ModalHeader toggle={toggle} className="bg-light p-3">
                        Bắt đầu Rà soát Dẫn chiếu mới
                    </ModalHeader>
                    <Form onSubmit={handleUpload}>
                        <ModalBody>
                            <div className="mb-3">
                                <Label htmlFor="name" className="form-label">Tên văn bản / Phiên bản</Label>
                                <Input 
                                    type="text" 
                                    id="name" 
                                    placeholder="Ví dụ: Dự thảo Nghị định X - Lần 2" 
                                    required 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="mb-3">
                                <Label htmlFor="file" className="form-label">Tệp văn bản (DOCX)</Label>
                                <Input 
                                    type="file" 
                                    id="file" 
                                    accept=".docx" 
                                    required 
                                    onChange={(e) => setFile(e.target.files[0])}
                                />
                            </div>
                            <div className="mb-3">
                                <Label htmlFor="desc" className="form-label">Ghi chú (Tùy chọn)</Label>
                                <Input 
                                    type="textarea" 
                                    id="desc" 
                                    placeholder="Nội dung rà soát tập trung vào..." 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            <div className="mt-4 text-center">
                                <Button color="success" type="submit" className="w-md" disabled={uploading}>
                                    {uploading ? (
                                        <><div className="spinner-border spinner-border-sm me-2"></div> Đang bóc tách...</>
                                    ) : (
                                        "Tải lên & Bóc tách"
                                    )}
                                </Button>
                            </div>
                        </ModalBody>
                    </Form>
                </Modal>

                <ToastContainer />
            </Container>
        </div>
    );
};

export default ReferenceDashboard;
