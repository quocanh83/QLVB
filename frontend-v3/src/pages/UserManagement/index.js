import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Row, Col, Card, CardBody, CardHeader,
    Button, Table, Modal, ModalHeader, ModalBody, ModalFooter,
    Form, FormGroup, Label, Input, Badge, UncontrolledDropdown,
    DropdownToggle, DropdownMenu, DropdownItem, FormFeedback
} from 'reactstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { getAuthHeader } from '../../helpers/api_helper';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Select from 'react-select';

const UserManagement = () => {
    document.title = "Quản lý Cán bộ | QLVB V3.0";

    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Import Modal state
    const [importModal, setImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    
    // Modal state
    const [modal, setModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Form state
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        full_name: "",
        email: "",
        role_ids: [],
        department_id: ""
    });
    const [errors, setErrors] = useState({});

    const toggle = useCallback(() => {
        if (modal) {
            setModal(false);
            setEditingUser(null);
            setFormData({
                username: "",
                password: "",
                full_name: "",
                email: "",
                role_ids: [],
                department_id: ""
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
            const [usersRes, rolesRes, deptRes] = await Promise.all([
                axios.get('/api/accounts/users/', authHeader),
                axios.get('/api/accounts/roles/', authHeader),
                axios.get('/api/accounts/departments/', authHeader)
            ]);
            
            // Axios interceptor in api_helper.js returns response.data directly
            setUsers(usersRes.results || usersRes || []);
            setRoles(rolesRes.results || rolesRes || []);
            setDepartments(deptRes.results || deptRes || []);
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Không thể tải danh sách cán bộ");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: "",
            full_name: user.full_name || "",
            email: user.email || "",
            role_ids: (user.roles || []).map(r => typeof r === 'object' ? r.id : r),
            department_id: user.department?.id || ""
        });
        setModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Bạn có chắc chắn muốn thu hồi tài khoản này?")) {
            try {
                const authHeader = getAuthHeader();
                await axios.delete(`/api/accounts/users/${id}/`, authHeader);
                toast.success("Đã thu hồi tài khoản thành công");
                fetchData();
            } catch (error) {
                toast.error("Lỗi khi xóa tài khoản");
            }
        }
    };

    const validateForm = () => {
        let newErrors = {};
        if (!editingUser && !formData.username) newErrors.username = "Vui lòng nhập tên đăng nhập";
        if (!editingUser && !formData.password) newErrors.password = "Vui lòng nhập mật khẩu";
        if (!formData.full_name) newErrors.full_name = "Vui lòng nhập họ tên";
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const authHeader = getAuthHeader();
            const payload = { ...formData };
            if (editingUser && !payload.password) delete payload.password;

            if (editingUser) {
                await axios.patch(`/api/accounts/users/${editingUser.id}/`, payload, authHeader);
                toast.success("Cập nhật thông tin thành công");
            } else {
                await axios.post('/api/accounts/users/', payload, authHeader);
                toast.success("Cấp tài khoản mới thành công");
            }
            toggle();
            fetchData();
        } catch (error) {
            const errorMsg = error.response?.data?.detail || error.response?.data?.username?.[0] || "Lỗi lưu thông tin";
            toast.error(errorMsg);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const authHeader = getAuthHeader();
            const response = await axios.get('/api/accounts/users/template/', {
                ...authHeader,
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Mau_nhap_lieu_can_bo.xlsx');
            document.body.appendChild(link);
            link.click();
        } catch (error) {
            toast.error("Không thể tải bảng mẫu");
        }
    };

    const handleImport = async () => {
        if (!importFile) return;
        setImporting(true);
        const data = new FormData();
        data.append('file', importFile);
        try {
            const authHeader = getAuthHeader();
            await axios.post('/api/accounts/users/import/', data, {
                headers: {
                    ...authHeader.headers,
                    'Content-Type': 'multipart/form-data'
                }
            });
            toast.success("Nhập cán bộ thành công");
            setImportModal(false);
            setImportFile(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Lỗi khi nhập Excel");
        }
        setImporting(false);
    };

    const filteredUsers = users.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const roleOptions = roles.map(r => ({
        value: r.id,
        label: r.role_name
    }));

    const deptOptions = departments.map(d => ({
        value: d.id,
        label: d.name
    }));

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Quản lý Cán bộ" pageTitle="Cấu hình" />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader className="d-flex align-items-center justify-content-between">
                                    <h4 className="card-title mb-0 flex-grow-1">Danh sách Tài khoản Cán bộ</h4>
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
                                        <Button color="info" outline onClick={handleDownloadTemplate}>
                                            <i className="ri-download-2-line align-bottom me-1"></i> Tải mẫu
                                        </Button>
                                        <Button color="info" onClick={() => setImportModal(true)}>
                                            <i className="ri-file-excel-2-line align-bottom me-1"></i> Nhập Excel
                                        </Button>
                                        <Button color="success" onClick={toggle}>
                                            <i className="ri-add-line align-bottom me-1"></i> Cấp tài khoản mới
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardBody>
                                    <div className="table-responsive table-card mt-3 mb-1">
                                        <Table className="align-middle table-nowrap" id="userTable">
                                            <thead className="table-light">
                                                <tr>
                                                    <th className="sort" data-sort="username">Tên đăng nhập</th>
                                                    <th className="sort" data-sort="fullname">Họ và tên</th>
                                                    <th className="sort" data-sort="email">Email</th>
                                                    <th className="sort" data-sort="dept">Phòng ban</th>
                                                    <th className="sort" data-sort="roles">Nhóm quyền</th>
                                                    <th className="sort" data-sort="action">Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody className="list form-check-all">
                                                {loading ? (
                                                    <tr>
                                                        <td colSpan="5" className="text-center py-5">
                                                            <div className="spinner-border text-primary" role="status">
                                                                <span className="visually-hidden">Loading...</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : filteredUsers.length > 0 ? (
                                                    filteredUsers.map((user, key) => (
                                                        <tr key={key}>
                                                            <td className="username">
                                                                <div className="d-flex align-items-center">
                                                                    <div className="flex-shrink-0 me-2">
                                                                        <div className="avatar-xs">
                                                                            <div className="avatar-title rounded-circle bg-soft-info text-info">
                                                                                {user.username.charAt(0).toUpperCase()}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-grow-1">
                                                                        <span className="fw-medium">{user.username}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="fullname">{user.full_name}</td>
                                                            <td className="email">{user.email || "---"}</td>
                                                            <td className="dept">
                                                                <Badge color="light" className="text-body border fw-normal">
                                                                    {user.department?.name || "Chưa phân phòng"}
                                                                </Badge>
                                                            </td>
                                                            <td className="roles">
                                                                {(user.roles || []).map((r, i) => (
                                                                    <Badge key={i} color="info" className="badge-soft-info me-1">
                                                                        {typeof r === 'object' ? r.role_name : r}
                                                                    </Badge>
                                                                ))}
                                                            </td>
                                                            <td>
                                                                <div className="d-flex gap-2">
                                                                    <div className="edit">
                                                                        <button className="btn btn-sm btn-soft-primary edit-item-btn" onClick={() => handleEdit(user)}>
                                                                            <i className="ri-pencil-fill align-bottom"></i>
                                                                        </button>
                                                                    </div>
                                                                    <div className="remove">
                                                                        <button className="btn btn-sm btn-soft-danger remove-item-btn" onClick={() => handleDelete(user.id)}>
                                                                            <i className="ri-delete-bin-fill align-bottom"></i>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="5" className="text-center py-5">
                                                            <lord-icon src="https://cdn.lordicon.com/msoeawqm.json" trigger="loop" colors="primary:#121331,secondary:#08a88a" style={{ width: "75px", height: "75px" }}></lord-icon>
                                                            <h5 className="mt-2">Không tìm thấy dữ liệu</h5>
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

            {/* User Modal */}
            <Modal isOpen={modal} toggle={toggle} centered className="border-0">
                <ModalHeader className="p-3 bg-soft-info" toggle={toggle}>
                    {editingUser ? "Chỉnh sửa Cán bộ" : "Cấp tài khoản mới"}
                </ModalHeader>
                <Form className="tablelist-form" autoComplete="off" onSubmit={handleSubmit}>
                    <ModalBody className="p-4">
                        <Row className="g-3">
                            <Col lg={12}>
                                <div>
                                    <Label htmlFor="username-field" className="form-label">Tên đăng nhập</Label>
                                    <Input
                                        type="text"
                                        id="username-field"
                                        className="form-control"
                                        placeholder="Nhập tên đăng nhập"
                                        value={formData.username}
                                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                                        disabled={!!editingUser}
                                        invalid={!!errors.username}
                                    />
                                    <FormFeedback>{errors.username}</FormFeedback>
                                </div>
                            </Col>
                            <Col lg={12}>
                                <div>
                                    <Label htmlFor="password-field" className="form-label">Mật khẩu {editingUser && "(Để trống nếu không đổi)"}</Label>
                                    <Input
                                        type="password"
                                        id="password-field"
                                        className="form-control"
                                        placeholder="Nhập mật khẩu"
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        invalid={!!errors.password}
                                    />
                                    <FormFeedback>{errors.password}</FormFeedback>
                                </div>
                            </Col>
                            <Col lg={12}>
                                <div>
                                    <Label htmlFor="fullname-field" className="form-label">Họ và tên</Label>
                                    <Input
                                        type="text"
                                        id="fullname-field"
                                        className="form-control"
                                        placeholder="Nhập họ và tên"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                        invalid={!!errors.full_name}
                                    />
                                    <FormFeedback>{errors.full_name}</FormFeedback>
                                </div>
                            </Col>
                            <Col lg={12}>
                                <div>
                                    <Label htmlFor="email-field" className="form-label">Email</Label>
                                    <Input
                                        type="email"
                                        id="email-field"
                                        className="form-control"
                                        placeholder="Nhập email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    />
                                </div>
                            </Col>
                            <Col lg={12}>
                                <div>
                                    <Label htmlFor="dept-field" className="form-label">Phòng ban</Label>
                                    <Select
                                        options={deptOptions}
                                        classNamePrefix="select"
                                        placeholder="Chọn phòng ban..."
                                        value={deptOptions.find(opt => opt.value === formData.department_id)}
                                        onChange={(selected) => setFormData({...formData, department_id: selected ? selected.value : ""})}
                                        isClearable
                                    />
                                </div>
                            </Col>
                            <Col lg={12}>
                                <div>
                                    <Label htmlFor="role-field" className="form-label">Nhóm quyền</Label>
                                    <Select
                                        isMulti
                                        options={roleOptions}
                                        classNamePrefix="select"
                                        placeholder="Chọn nhóm quyền..."
                                        value={roleOptions.filter(opt => (formData.role_ids || []).includes(opt.value))}
                                        onChange={(selected) => setFormData({...formData, role_ids: selected ? selected.map(s => s.value) : []})}
                                    />
                                </div>
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <div className="hstack gap-2 justify-content-end">
                            <Button color="light" onClick={toggle}>Hủy</Button>
                            <Button type="submit" color="success" id="add-btn">
                                {editingUser ? "Lưu thay đổi" : "Khởi tạo tài khoản"}
                            </Button>
                        </div>
                    </ModalFooter>
                </Form>
            </Modal>
            {/* Import Modal */}
            <Modal isOpen={importModal} toggle={() => setImportModal(false)} centered>
                <ModalHeader toggle={() => setImportModal(false)}>Nhập cán bộ từ Excel</ModalHeader>
                <ModalBody>
                    <div className="text-center p-3">
                        <div className="mb-3">
                            <i className="ri-file-excel-2-line display-4 text-success"></i>
                        </div>
                        <p className="text-muted">Đính kèm file Excel (.xlsx) chứa danh sách cán bộ theo mẫu.</p>
                        <Input 
                            type="file" 
                            accept=".xlsx" 
                            onChange={(e) => setImportFile(e.target.files[0])} 
                            className="mb-3"
                        />
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="light" onClick={() => setImportModal(false)}>Hủy</Button>
                    <Button color="success" onClick={handleImport} disabled={!importFile || importing}>
                        {importing ? "Đang xử lý..." : "Bắt đầu nhập"}
                    </Button>
                </ModalFooter>
            </Modal>
            <ToastContainer autoClose={2000} limit={1} />
        </React.Fragment>
    );
};

export default UserManagement;
