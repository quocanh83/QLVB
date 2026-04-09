import React, { useState, useEffect } from 'react';
import { 
    Container, Row, Col, Card, CardBody, CardHeader, Button, 
    Table, Modal, ModalHeader, ModalBody, ModalFooter,
    Form, FormGroup, Label, Input, Badge, UncontrolledTooltip
} from 'reactstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { toast, ToastContainer } from 'react-toastify';

const ComparisonDashboard = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    
    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [baseDocumentName, setBaseDocumentName] = useState('');
    const [draftDocumentName, setDraftDocumentName] = useState('');
    const [baseFile, setBaseFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await axios.get('/api/comparisons/projects/', getAuthHeader());
            const data = res.results || res;
            setProjects(Array.isArray(data) ? data : []);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching projects", error);
            toast.error("Không thể tải danh sách dự án");
        }
    };

    const toggleModal = () => {
        setModal(!modal);
        if(!modal) {
            setName('');
            setDescription('');
            setBaseDocumentName('');
            setDraftDocumentName('');
            setBaseFile(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!baseFile) {
            toast.warning("Vui lòng chọn văn bản gốc (.docx)");
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('base_document_name', baseDocumentName);
        formData.append('draft_document_name', draftDocumentName);
        formData.append('base_file', baseFile);

        const config = {
            ...getAuthHeader(),
            headers: { 
                ...getAuthHeader().headers,
                'Content-Type': 'multipart/form-data' 
            }
        };

        setSubmitting(true);
        try {
            await axios.post('/api/comparisons/projects/', formData, config);
            toast.success("Tạo dự án so sánh thành công!");
            toggleModal();
            fetchProjects();
        } catch (error) {
            console.error("Error creating project", error);
            toast.error("Lỗi khi tạo dự án");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="page-content">
            <Container fluid>
                <BreadCrumb title="So sánh Văn bản" pageTitle="QLVB" />
                
                <Row className="mb-3">
                    <Col>
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <h4 className="mb-0">Dự án So sánh</h4>
                                <p className="text-muted mb-0">Quản lý và đối chiếu các phiên bản dự thảo với văn bản gốc.</p>
                            </div>
                            <Button color="primary" onClick={toggleModal}>
                                <i className="ri-add-line align-bottom me-1"></i> Tạo Dự án Mới
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
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="sr-only">Đang tải...</span>
                                        </div>
                                    </div>
                                ) : projects.length === 0 ? (
                                    <div className="text-center py-5">
                                        <div className="avatar-lg mx-auto mb-4">
                                            <div className="avatar-title bg-light text-primary display-4 rounded-circle">
                                                <i className="ri-file-search-line"></i>
                                            </div>
                                        </div>
                                        <h5>Chưa có dự án nào</h5>
                                        <p className="text-muted">Bắt đầu bằng cách tạo một dự án so sánh và tải lên văn bản gốc.</p>
                                        <Button color="primary" outline onClick={toggleModal}>Tạo ngay</Button>
                                    </div>
                                ) : (
                                    <div className="table-responsive table-card">
                                        <Table className="table-centered align-middle table-nowrap mb-0">
                                            <thead className="table-light text-muted">
                                                <tr>
                                                    <th>Tên Dự án</th>
                                                    <th>Văn bản gốc</th>
                                                    <th>Số phiên bản</th>
                                                    <th>Ngày tạo</th>
                                                    <th>Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {projects.map((item) => (
                                                    <tr key={item.id}>
                                                        <td>
                                                            <Link to={`/comparisons/${item.id}`} className="fw-medium link-primary">
                                                                {item.name}
                                                            </Link>
                                                            {item.description && (
                                                                <p className="text-muted mb-0 small">{item.description}</p>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <i className="ri-file-word-2-fill text-primary me-1"></i>
                                                            {item.base_file ? item.base_file.split('/').pop() : "Chưa tải lên"}
                                                        </td>
                                                        <td>
                                                            <Badge color="info" pill className="fs-12">
                                                                {item.versions?.length || 0} bản
                                                            </Badge>
                                                        </td>
                                                        <td>{new Date(item.created_at).toLocaleDateString('vi-VN')}</td>
                                                        <td>
                                                            <Link to={`/comparisons/${item.id}`} className="btn btn-sm btn-soft-info me-2" id={`view-${item.id}`}>
                                                                <i className="ri-eye-fill"></i>
                                                            </Link>
                                                            <UncontrolledTooltip placement="top" target={`view-${item.id}`}>Xem chi tiết & Lịch sử</UncontrolledTooltip>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </Col>
                </Row>

                {/* Modal Tạo Dự án */}
                <Modal isOpen={modal} toggle={toggleModal} centered size="lg">
                    <ModalHeader toggle={toggleModal}>Tạo Dự án So sánh Mới</ModalHeader>
                    <Form onSubmit={handleSubmit}>
                        <ModalBody>
                            <Row className="g-3">
                                <Col lg={12}>
                                    <Label for="projectName">Tên dự án <span className="text-danger">*</span></Label>
                                    <Input 
                                        type="text" 
                                        id="projectName" 
                                        placeholder="Ví dụ: So khớp Dự thảo Luật Đất đai (sửa đổi)" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </Col>
                                <Col lg={12}>
                                    <Label for="description">Mô tả (Không bắt buộc)</Label>
                                    <Input 
                                        type="textarea" 
                                        id="description" 
                                        rows="3"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </Col>
                                <Col lg={12}>
                                    <Label>Văn bản Gốc (Mốc đối chiếu) <span className="text-danger">*</span></Label>
                                    <div className="border border-dashed p-4 text-center rounded">
                                        <i className="display-4 text-muted ri-upload-cloud-2-fill"></i>
                                        <div className="mt-3">
                                            <input 
                                                type="file" 
                                                className="form-control" 
                                                accept=".docx"
                                                onChange={(e) => setBaseFile(e.target.files[0])}
                                                required
                                            />
                                            <p className="fs-12 text-muted mt-2">Chỉ chấp nhận định dạng .docx</p>
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="light" onClick={toggleModal} disabled={submitting}>Hủy</Button>
                            <Button color="primary" type="submit" disabled={submitting}>
                                {submitting ? "Đang xử lý..." : "Bắt đầu Dự án"}
                            </Button>
                        </ModalFooter>
                    </Form>
                </Modal>
                <ToastContainer />
            </Container>
        </div>
    );
};

export default ComparisonDashboard;
