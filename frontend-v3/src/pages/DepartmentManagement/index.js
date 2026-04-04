import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Row, Col, Card, CardBody, CardHeader,
    Button, Table, Modal, ModalHeader, ModalBody, ModalFooter,
    Form, FormGroup, Label, Input, FormFeedback
} from 'reactstrap';
import axios from 'axios';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { getAuthHeader } from '../../helpers/api_helper';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const DepartmentManagement = () => {
    document.title = "Quản lý Phòng ban | QLVB V3.0";

    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Modal state
    const [modal, setModal] = useState(false);
    const [editingDept, setEditingDept] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        description: ""
    });
    const [errors, setErrors] = useState({});

    const toggle = useCallback(() => {
        if (modal) {
            setModal(false);
            setEditingDept(null);
            setFormData({
                name: "",
                description: ""
            });
            setErrors({});
        } else {
            setModal(true);
        }
    }, [modal]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const authHeader = getAuthHeader();
            const response = await axios.get('/api/accounts/departments/', authHeader);
            setDepartments(response.results || response || []);
        } catch (error) {
            console.error("Error fetching departments:", error);
            toast.error("Không thể tải danh sách phòng ban");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEdit = (dept) => {
        setEditingDept(dept);
        setFormData({
            name: dept.name,
            description: dept.description || ""
        });
        setModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa phòng ban này? Một số cán bộ có thể đang thuộc phòng ban này.")) {
            try {
                const authHeader = getAuthHeader();
                await axios.delete(`/api/accounts/departments/${id}/`, authHeader);
                toast.success("Đã xóa phòng ban thành công");
                fetchData();
            } catch (error) {
                toast.error("Lỗi khi xóa phòng ban");
            }
        }
    };

    const validateForm = () => {
        let newErrors = {};
        if (!formData.name) newErrors.name = "Vui lòng nhập tên phòng ban";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const authHeader = getAuthHeader();
            if (editingDept) {
                await axios.patch(`/api/accounts/departments/${editingDept.id}/`, formData, authHeader);
                toast.success("Cập nhật thông tin thành công");
            } else {
                await axios.post('/api/accounts/departments/', formData, authHeader);
                toast.success("Thêm phòng ban mới thành công");
            }
            toggle();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.name?.[0] || "Lỗi lưu thông tin");
        }
    };

    const filteredDepts = departments.filter(dept => 
        dept.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Quản lý Phòng ban" pageTitle="Cấu hình" />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader className="d-flex align-items-center justify-content-between">
                                    <h4 className="card-title mb-0 flex-grow-1">Danh sách Phòng ban</h4>
                                    <div className="flex-shrink-0 d-flex gap-2">
                                        <div className="search-box">
                                            <Input 
                                                type="text" 
                                                className="form-control px-5" 
                                                placeholder="Tìm kiếm..." 
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                            <i className="ri-search-line search-icon"></i>
                                        </div>
                                        <Button color="success" onClick={toggle}>
                                            <i className="ri-add-line align-bottom me-1"></i> Thêm phòng ban
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardBody>
                                    <div className="table-responsive table-card mt-3 mb-1">
                                        <Table className="align-middle table-nowrap">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Tên phòng ban</th>
                                                    <th>Mô tả</th>
                                                    <th>Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading ? (
                                                    <tr>
                                                        <td colSpan="3" className="text-center py-4">Đang tải...</td>
                                                    </tr>
                                                ) : filteredDepts.length > 0 ? (
                                                    filteredDepts.map((dept, key) => (
                                                        <tr key={key}>
                                                            <td className="fw-medium">{dept.name}</td>
                                                            <td>{dept.description || "---"}</td>
                                                            <td>
                                                                <div className="d-flex gap-2">
                                                                    <button className="btn btn-sm btn-soft-primary" onClick={() => handleEdit(dept)}>
                                                                        <i className="ri-pencil-fill align-bottom"></i>
                                                                    </button>
                                                                    <button className="btn btn-sm btn-soft-danger" onClick={() => handleDelete(dept.id)}>
                                                                        <i className="ri-delete-bin-fill align-bottom"></i>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="3" className="text-center py-4">Không tìm thấy dữ liệu</td>
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

            <Modal isOpen={modal} toggle={toggle} centered>
                <ModalHeader toggle={toggle}>
                    {editingDept ? "Chỉnh sửa Phòng ban" : "Thêm phòng ban mới"}
                </ModalHeader>
                <Form onSubmit={handleSubmit}>
                    <ModalBody>
                        <FormGroup>
                            <Label>Tên phòng ban</Label>
                            <Input
                                type="text"
                                placeholder="Nhập tên phòng ban"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                invalid={!!errors.name}
                            />
                            <FormFeedback>{errors.name}</FormFeedback>
                        </FormGroup>
                        <FormGroup>
                            <Label>Mô tả</Label>
                            <Input
                                type="textarea"
                                placeholder="Nhập mô tả"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            />
                        </FormGroup>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="light" onClick={toggle}>Hủy</Button>
                        <Button color="success" type="submit">
                            {editingDept ? "Lưu thay đổi" : "Thêm mới"}
                        </Button>
                    </ModalFooter>
                </Form>
            </Modal>
            <ToastContainer autoClose={2000} limit={1} />
        </React.Fragment>
    );
};

export default DepartmentManagement;
