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
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Modal state
    const [modal, setModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [currentAgency, setCurrentAgency] = useState({ name: '', category: 'other' });
    const [isDeleteModal, setIsDeleteModal] = useState(false);
    const [selectedAgency, setSelectedAgency] = useState(null);

    // Import state
    const [isImportModal, setIsImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);

    const categories = [
        { id: 'ministry', label: 'Bộ, cơ quan ngang Bộ' },
        { id: 'local', label: 'Địa phương (UBND tỉnh/thành phố)' },
        { id: 'organization', label: 'Sở, Ban, Ngành, Tổ chức, Đoàn thể' },
        { id: 'citizen', label: 'Công dân, Doanh nghiệp' },
        { id: 'other', label: 'Khác' }
    ];

    useEffect(() => {
        fetchAgencies();
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

    const toggle = () => {
        setModal(!modal);
        if (modal) {
            setCurrentAgency({ name: '', category: 'other' });
            setIsEdit(false);
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

    const getCategoryBadge = (cat) => {
        const found = categories.find(c => c.id === cat);
        const label = found ? found.label : 'Khác';
        let color = "secondary";
        if (cat === 'ministry') color = "danger";
        if (cat === 'local') color = "primary";
        if (cat === 'organization') color = "info";
        if (cat === 'citizen') color = "success";
        
        return <Badge color={`soft-${color}`} className={`text-${color}`}>{label}</Badge>;
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
                                                        <td className="fw-bold">{agency.name}</td>
                                                        <td>{getCategoryBadge(agency.category)}</td>
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
                            <Label className="form-label">Phân loại hệ thống</Label>
                            <Input 
                                type="select" 
                                value={currentAgency.category}
                                onChange={(e) => setCurrentAgency({ ...currentAgency, category: e.target.value })}
                            >
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.label}</option>
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
                        Tệp tin cần có cột <b>name</b> (tên đơn vị) và cột <b>category</b> (tùy chọn: ministry, local, organization, citizen, other).
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="light" onClick={toggleImport}>Đóng</Button>
                    <Button color="primary" onClick={handleImport} disabled={importing}>
                        {importing ? <Spinner size="sm" /> : "Bắt đầu nhập"}
                    </Button>
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
