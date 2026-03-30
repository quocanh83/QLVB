import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Input, Table, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem, Badge, Spinner } from 'reactstrap';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { ToastContainer, toast } from 'react-toastify';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import FeatherIcon from "feather-icons-react";
import DeleteModal from "../../Components/Common/DeleteModal";

const Agencies = () => {
    document.title = "Quản lý Đơn vị | QLVB V3.0";

    const [agencies, setAgencies] = useState([]);
    const [agencyCategories, setAgencyCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Modal state
    const [modal, setModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [currentAgency, setCurrentAgency] = useState({ name: '', agency_category: '' });
    const [isDeleteModal, setIsDeleteModal] = useState(false);
    const [selectedAgency, setSelectedAgency] = useState(null);

    // Category Management State
    const [categoryModal, setCategoryModal] = useState(false);
    const [isCategoryEdit, setIsCategoryEdit] = useState(false);
    const [currentCategory, setCurrentCategory] = useState({ name: '', description: '' });

    // Import state
    const [isImportModal, setIsImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        fetchAgencies();
        fetchCategories();
    }, []);

    const fetchAgencies = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/settings/agencies/', getAuthHeader());
            const data = res.results || res;
            setAgencies(Array.isArray(data) ? data : []);
        } catch (e) {
            toast.error("Lỗi khi tải danh sách đơn vị.");
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await axios.get('/api/settings/agency-categories/', getAuthHeader());
            const data = res.results || res;
            setAgencyCategories(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Lỗi khi tải danh mục phân loại.");
        }
    };

    const toggle = () => {
        setModal(!modal);
        if (modal) {
            setCurrentAgency({ name: '', agency_category: '' });
            setIsEdit(false);
        }
    };

    const toggleCategoryModal = () => {
        setCategoryModal(!categoryModal);
        if (categoryModal) {
            setCurrentCategory({ name: '', description: '' });
            setIsCategoryEdit(false);
        }
    };

    const toggleImport = () => {
        setIsImportModal(!isImportModal);
        setImportFile(null);
    };

    const handleEditAgency = (agency) => {
        setCurrentAgency(agency);
        setIsEdit(true);
        setModal(true);
    };

    const handleDeleteClick = (agency) => {
        setSelectedAgency(agency);
        setIsDeleteModal(true);
    };

    const handleDeleteAgency = async () => {
        try {
            await axios.delete(`/api/settings/agencies/${selectedAgency.id}/`, getAuthHeader());
            toast.success("Xóa đơn vị thành công.");
            fetchAgencies();
            setIsDeleteModal(false);
        } catch (e) {
            toast.error("Lỗi khi xóa đơn vị.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentAgency.name) {
            toast.warning("Vui lòng nhập tên đơn vị.");
            return;
        }

        try {
            if (isEdit) {
                await axios.put(`/api/settings/agencies/${currentAgency.id}/`, currentAgency, getAuthHeader());
                toast.success("Cập nhật đơn vị thành công.");
            } else {
                await axios.post('/api/settings/agencies/', currentAgency, getAuthHeader());
                toast.success("Thêm đơn vị mới thành công.");
            }
            fetchAgencies();
            toggle();
        } catch (e) {
            toast.error("Lỗi khi lưu dữ liệu.");
        }
    };

    const handleCategorySubmit = async (e) => {
        e.preventDefault();
        try {
            if (isCategoryEdit) {
                await axios.put(`/api/settings/agency-categories/${currentCategory.id}/`, currentCategory, getAuthHeader());
                toast.success("Cập nhật phân loại thành công.");
            } else {
                await axios.post('/api/settings/agency-categories/', currentCategory, getAuthHeader());
                toast.success("Thêm phân loại mới thành công.");
            }
            fetchCategories();
            toggleCategoryModal();
        } catch (e) {
            toast.error("Lỗi khi lưu phân loại.");
        }
    };

    const handleEditCategory = (cat) => {
        setCurrentCategory(cat);
        setIsCategoryEdit(true);
        setCategoryModal(true);
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa phân loại này?")) return;
        try {
            await axios.delete(`/api/settings/agency-categories/${id}/`, getAuthHeader());
            toast.success("Xóa phân loại thành công.");
            fetchCategories();
        } catch (e) {
            toast.error("Lỗi khi xóa phân loại (Có thể phân loại đang được sử dụng).");
        }
    };

    const handleImport = async () => {
        if (!importFile) {
            toast.warning("Vui lòng chọn tệp tin (.xlsx hoặc .csv)");
            return;
        }

        const formData = new FormData();
        formData.append("file", importFile);

        setImporting(true);
        try {
            const res = await axios.post('/api/settings/agencies/bulk_import/', formData, getAuthHeader());
            toast.success(res.message || "Đã nhập dữ liệu thành công.");
            fetchAgencies();
            toggleImport();
        } catch (e) {
            toast.error("Lỗi khi nhập dữ liệu từ tệp.");
        } finally {
            setImporting(false);
        }
    };

    const filteredAgencies = agencies.filter(a => 
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getCategoryBadge = (agency) => {
        const label = agency.category_name || agency.category || 'Khác';
        
        return (
            <span className="text-muted fs-14">
                {label}
            </span>
        );
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Quản lý Đơn vị góp ý" pageTitle="Hệ thống" />
                    <ToastContainer closeButton={false} />

                    <Row className="g-4 mb-3">
                        <Col sm="auto">
                            <div className="d-flex gap-2">
                                <Button color="success" onClick={toggle}>
                                    <i className="ri-add-line align-bottom me-1"></i> Thêm mới
                                </Button>
                                <Button color="info" onClick={toggleCategoryModal}>
                                    <i className="ri-list-settings-line align-bottom me-1"></i> Quản lý phân loại
                                </Button>
                                <Button color="soft-info" onClick={toggleImport}>
                                    <i className="ri-file-upload-line align-bottom me-1"></i> Nhập từ tệp
                                </Button>
                            </div>
                        </Col>
                        <Col sm="3" className="ms-auto">
                            <div className="search-box">
                                <Input 
                                    type="text" 
                                    placeholder="Tìm kiếm đơn vị..." 
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
                                    <h5 className="card-title mb-0">Danh sách Đơn vị / Cơ quan</h5>
                                </CardHeader>
                                <CardBody>
                                    <div className="table-responsive">
                                        <Table className="table-hover table-bordered align-middle">
                                            <thead className="table-light">
                                                <tr>
                                                    <th style={{ width: '50px' }}>STT</th>
                                                    <th>Tên Đơn vị / Tổ chức</th>
                                                    <th>Phân loại</th>
                                                    <th style={{ width: '100px' }}>Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading ? (
                                                    <tr>
                                                        <td colSpan="4" className="text-center py-5">
                                                            <div className="spinner-border text-primary" role="status">
                                                                <span className="sr-only">Đang tải...</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : filteredAgencies.length > 0 ? filteredAgencies.map((agency, index) => (
                                                    <tr key={agency.id}>
                                                        <td className="text-center">{index + 1}</td>
                                                        <td className="fs-15">{agency.name}</td>
                                                        <td>{getCategoryBadge(agency)}</td>
                                                        <td>
                                                            <div className="d-flex gap-2 justify-content-center">
                                                                <Button color="soft-primary" size="sm" onClick={() => handleEditAgency(agency)}>
                                                                    <i className="ri-pencil-fill"></i>
                                                                </Button>
                                                                <Button color="soft-danger" size="sm" onClick={() => handleDeleteClick(agency)}>
                                                                    <i className="ri-delete-bin-fill"></i>
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan="4" className="text-center py-4 text-muted small">
                                                            Không tìm thấy đơn vị nào.
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

            {/* Modal Add/Edit */}
            <Modal isOpen={modal} toggle={toggle} centered>
                <ModalHeader toggle={toggle} className="bg-light p-3">
                    {isEdit ? "Cập nhật Đơn vị" : "Thêm Đơn vị mới"}
                </ModalHeader>
                <Form onSubmit={handleSubmit}>
                    <ModalBody>
                        <FormGroup>
                            <Label className="form-label">Tên Đơn vị / Cơ quan / Tổ chức <span className="text-danger">*</span></Label>
                            <Input 
                                type="text" 
                                placeholder="Nhập tên đầy đủ..." 
                                value={currentAgency.name}
                                onChange={(e) => setCurrentAgency({ ...currentAgency, name: e.target.value })}
                                required
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label className="form-label">Phân loại Cơ quan</Label>
                            <Input 
                                type="select" 
                                value={currentAgency.agency_category || ""}
                                onChange={(e) => setCurrentAgency({ ...currentAgency, agency_category: e.target.value })}
                            >
                                <option value="">-- Chọn phân loại --</option>
                                {agencyCategories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </Input>
                        </FormGroup>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="light" onClick={toggle}>Hủy bỏ</Button>
                        <Button color="success" type="submit">
                            {isEdit ? "Cập nhật" : "Lưu dữ liệu"}
                        </Button>
                    </ModalFooter>
                </Form>
            </Modal>
            
            {/* Modal Import */}
            <Modal isOpen={isImportModal} toggle={toggleImport} centered>
                <ModalHeader toggle={toggleImport} className="bg-light p-3">
                    Nhập đơn vị từ tệp tin
                </ModalHeader>
                <ModalBody>
                    <div className="mb-3">
                        <Label className="form-label">Chọn tệp tin (.xlsx, .xls, .csv)</Label>
                        <Input 
                            type="file" 
                            accept=".xlsx, .xls, .csv" 
                            onChange={(e) => setImportFile(e.target.files[0])}
                        />
                    </div>
                    <div className="alert alert-info py-2 small mb-0">
                        <i className="ri-information-line me-1 align-bottom"></i>
                        Tệp tin cần có cột <b>name</b> (tên đơn vị) và cột <b>category</b> (tên phân loại hoặc: ministry, local...).
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="light" onClick={toggleImport}>Đóng</Button>
                    <Button color="primary" onClick={handleImport} disabled={importing}>
                        {importing ? <Spinner size="sm" /> : "Bắt đầu nhập"}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal Category Management */}
            <Modal isOpen={categoryModal} toggle={toggleCategoryModal} centered size="lg">
                <ModalHeader toggle={toggleCategoryModal} className="bg-light p-3">
                    Quản lý Danh mục Phân loại Cơ quan
                </ModalHeader>
                <ModalBody>
                    <Form onSubmit={handleCategorySubmit} className="mb-4 p-3 border rounded bg-light-subtle">
                        <Row className="g-3">
                            <Col md={5}>
                                <Label className="form-label">Tên phân loại</Label>
                                <Input 
                                    type="text" 
                                    value={currentCategory.name} 
                                    onChange={(e) => setCurrentCategory({...currentCategory, name: e.target.value})}
                                    required 
                                    placeholder="Ví dụ: Cấp Trung ương"
                                />
                            </Col>
                            <Col md={6}>
                                <Label className="form-label">Mô tả</Label>
                                <Input 
                                    type="text" 
                                    value={currentCategory.description || ""} 
                                    onChange={(e) => setCurrentCategory({...currentCategory, description: e.target.value})}
                                    placeholder="Nhập ghi chú..."
                                />
                            </Col>
                            <Col md={1} className="d-flex align-items-end">
                                <Button color={isCategoryEdit ? "primary" : "success"} type="submit">
                                    <i className={isCategoryEdit ? "ri-save-line" : "ri-add-line"}></i>
                                </Button>
                            </Col>
                        </Row>
                    </Form>

                    <Table className="align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>Tên phân loại</th>
                                <th>Mô tả</th>
                                <th>Đang dùng</th>
                                <th style={{ width: '80px' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {agencyCategories.map(cat => (
                                <tr key={cat.id}>
                                    <td>
                                        <span className="fs-14">{cat.name}</span>
                                    </td>
                                    <td className="small text-muted">{cat.description}</td>
                                    <td>{cat.agencies_count} đơn vị</td>
                                    <td>
                                        <div className="d-flex gap-1">
                                            <Button color="soft-primary" size="sm" onClick={() => handleEditCategory(cat)}>
                                                <i className="ri-pencil-fill"></i>
                                            </Button>
                                            <Button color="soft-danger" size="sm" onClick={() => handleDeleteCategory(cat.id)}>
                                                <i className="ri-delete-bin-fill"></i>
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </ModalBody>
                <ModalFooter>
                    <Button color="light" onClick={toggleCategoryModal}>Đóng</Button>
                </ModalFooter>
            </Modal>

            <DeleteModal
                show={isDeleteModal}
                onDeleteClick={handleDeleteAgency}
                onCloseClick={() => setIsDeleteModal(false)}
            />
        </React.Fragment>
    );
};

export default Agencies;
