import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Table, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, Spinner } from 'reactstrap';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { getAuthHeader } from '../../helpers/api_helper';
import { ToastContainer, toast } from 'react-toastify';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import DeleteModal from "../../Components/Common/DeleteModal";
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

const ConsultationResponses = () => {
    const { id } = useParams(); // Document ID
    document.title = "Quản lý Văn bản góp ý | QLVB V3.0";

    const [documentInfo, setDocumentInfo] = useState(null);
    const [responses, setResponses] = useState([]);
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal state
    const [modal, setModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [currentResponse, setCurrentResponse] = useState({
        agency: '',
        official_number: '',
        official_date: '',
        attached_file: null
    });
    
    const [isDeleteModal, setIsDeleteModal] = useState(false);
    const [selectedResponse, setSelectedResponse] = useState(null);

    // Quick Add Agency Modal State
    const [agencyModal, setAgencyModal] = useState(false);
    const [newAgencyName, setNewAgencyName] = useState("");
    const [newAgencyCategory, setNewAgencyCategory] = useState(null); // { value, label, __isNew__ }
    const [categories, setCategories] = useState([]);
    const [addingAgency, setAddingAgency] = useState(false);

    const toggleAgencyModal = () => {
        setAgencyModal(!agencyModal);
        setNewAgencyName("");
        setNewAgencyCategory(null);
    };

    useEffect(() => {
        fetchDocumentInfo();
        fetchResponses();
        fetchAgencies();
        fetchCategories();
    }, [id]);

    const fetchDocumentInfo = async () => {
        try {
            const res = await axios.get(`/api/documents/${id}/`, getAuthHeader());
            setDocumentInfo(res);
        } catch (e) {
            toast.error("Lỗi khi tải thông tin dự thảo.");
        }
    };

    const fetchResponses = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/feedbacks/responses/?document_id=${id}`, getAuthHeader());
            const data = res.results || res;
            setResponses(Array.isArray(data) ? data : []);
        } catch (e) {
            toast.error("Lỗi khi tải danh sách văn bản góp ý.");
        } finally {
            setLoading(false);
        }
    };

    const fetchAgencies = async () => {
        try {
            const res = await axios.get('/api/settings/agencies/', getAuthHeader());
            const data = res.results || res;
            setAgencies(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Lỗi lấy danh sách đơn vị.");
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await axios.get('/api/settings/agency-categories/', getAuthHeader());
            const data = res.results || res;
            setCategories(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Lỗi lấy danh mục phân loại.");
        }
    };

    const handleQuickAgencySave = async () => {
        if (!newAgencyName.trim()) {
            toast.warning("Vui lòng nhập tên đơn vị.");
            return;
        }
        setAddingAgency(true);
        try {
            let categoryId = newAgencyCategory?.value;
            
            // Nếu là phân loại mới gõ vào
            if (newAgencyCategory && newAgencyCategory.__isNew__) {
                const catRes = await axios.post('/api/settings/agency-categories/', { name: newAgencyCategory.label }, getAuthHeader());
                categoryId = catRes.data.id;
                await fetchCategories(); // Refresh list cho lần sau
            }

            const res = await axios.post('/api/settings/agencies/', { 
                name: newAgencyName,
                agency_category: categoryId 
            }, getAuthHeader());
            
            toast.success("Thêm đơn vị mới thành công.");
            await fetchAgencies(); // Tải lại danh sách đơn vị
            setCurrentResponse({ ...currentResponse, agency: res.data.id }); // Tự động chọn
            toggleAgencyModal();
        } catch (e) {
            toast.error("Lỗi khi thêm đơn vị nhanh. Tên có thể đã tồn tại.");
        } finally {
            setAddingAgency(false);
        }
    };

    const toggle = () => {
        setModal(!modal);
        if (modal) {
            setCurrentResponse({
                agency: '',
                official_number: '',
                official_date: '',
                attached_file: null
            });
            setIsEdit(false);
        }
    };

    const handleEdit = (resp) => {
        setCurrentResponse({
            ...resp,
            attached_file: null // Don't try to prepopulate file input
        });
        setIsEdit(true);
        setModal(true);
    };

    const handleDeleteClick = (resp) => {
        setSelectedResponse(resp);
        setIsDeleteModal(true);
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`/api/feedbacks/responses/${selectedResponse.id}/`, getAuthHeader());
            toast.success("Xóa văn bản thành công.");
            fetchResponses();
            setIsDeleteModal(false);
        } catch (e) {
            toast.error("Lỗi khi xóa văn bản.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('document', id);
        formData.append('agency', currentResponse.agency);
        formData.append('official_number', currentResponse.official_number);
        formData.append('official_date', currentResponse.official_date);
        if (currentResponse.attached_file) {
            formData.append('attached_file', currentResponse.attached_file);
        }

        try {
            if (isEdit) {
                await axios.patch(`/api/feedbacks/responses/${currentResponse.id}/`, formData, getAuthHeader());
                toast.success("Cập nhật thành công.");
            } else {
                await axios.post('/api/feedbacks/responses/', formData, getAuthHeader());
                toast.success("Thêm văn bản góp ý thành công.");
            }
            fetchResponses();
            toggle();
        } catch (e) {
            toast.error("Lỗi khi lưu dữ liệu.");
        }
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title={`Văn bản góp ý: ${documentInfo?.project_name || '...'}`} pageTitle="Dự thảo" />
                    <ToastContainer closeButton={false} />

                    <div className="mb-3">
                        <Link to="/documents" className="btn btn-soft-secondary btn-sm">
                            <i className="ri-arrow-left-line align-bottom me-1"></i> Quay lại danh sách
                        </Link>
                    </div>

                    <Row className="g-4 mb-3">
                        <Col sm="auto">
                            <Button color="success" onClick={toggle}>
                                <i className="ri-add-line align-bottom me-1"></i> Thêm văn bản góp ý
                            </Button>
                        </Col>
                    </Row>

                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader>
                                    <h5 className="card-title mb-0">Danh mục Công văn / Bản ý kiến phản hồi</h5>
                                </CardHeader>
                                <CardBody>
                                    <div className="table-responsive">
                                        <Table className="table-hover table-bordered align-middle">
                                            <thead className="table-light">
                                                <tr>
                                                    <th style={{ width: '50px' }}>STT</th>
                                                    <th>Đơn vị góp ý</th>
                                                    <th>Số hiệu công văn</th>
                                                    <th>Ngày ban hành</th>
                                                    <th>File đính kèm</th>
                                                    <th style={{ width: '120px' }}>Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading ? (
                                                    <tr>
                                                        <td colSpan="6" className="text-center py-5">
                                                            <Spinner color="primary" />
                                                        </td>
                                                    </tr>
                                                ) : responses.length > 0 ? responses.map((resp, index) => (
                                                    <tr key={resp.id}>
                                                        <td className="text-center">{index + 1}</td>
                                                        <td className="fw-bold">{resp.agency_name}</td>
                                                        <td>{resp.official_number}</td>
                                                        <td>{resp.official_date}</td>
                                                        <td>
                                                            {resp.attached_file ? (
                                                                <a href={resp.attached_file} target="_blank" rel="noreferrer" className="btn btn-soft-primary btn-sm">
                                                                    <i className="ri-download-2-line align-bottom"></i> Tải về
                                                                </a>
                                                            ) : <span className="text-muted small">Không có file</span>}
                                                        </td>
                                                        <td>
                                                            <div className="d-flex gap-2 justify-content-center">
                                                                <Button color="soft-primary" size="sm" onClick={() => handleEdit(resp)}>
                                                                    <i className="ri-pencil-fill"></i>
                                                                </Button>
                                                                <Button color="soft-danger" size="sm" onClick={() => handleDeleteClick(resp)}>
                                                                    <i className="ri-delete-bin-fill"></i>
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan="6" className="text-center py-4 text-muted small">
                                                            Chưa có văn bản góp ý nào được tải lên.
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
            <Modal isOpen={modal} toggle={toggle} centered size="lg">
                <ModalHeader toggle={toggle} className="bg-light p-3">
                    {isEdit ? "Cập nhật Văn bản góp ý" : "Thêm Văn bản góp ý mới"}
                </ModalHeader>
                <Form onSubmit={handleSubmit}>
                    <ModalBody>
                        <Row>
                            <Col lg={12}>
                                <FormGroup>
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <Label className="form-label mb-0">Đơn vị góp ý <span className="text-danger">*</span></Label>
                                        <Button color="link" size="sm" className="p-0 text-primary fw-medium" onClick={toggleAgencyModal}>
                                            <i className="ri-add-line align-bottom me-1"></i> Thêm nhanh đơn vị
                                        </Button>
                                    </div>
                                    <Input 
                                        type="select" 
                                        value={currentResponse.agency}
                                        onChange={(e) => setCurrentResponse({ ...currentResponse, agency: e.target.value })}
                                        required
                                    >
                                        <option value="">Chọn đơn vị...</option>
                                        {agencies.map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </Input>
                                </FormGroup>
                            </Col>
                            <Col lg={6}>
                                <FormGroup>
                                    <Label className="form-label">Số hiệu công văn <span className="text-danger">*</span></Label>
                                    <Input 
                                        type="text" 
                                        placeholder="Ghi số hiệu..." 
                                        value={currentResponse.official_number}
                                        onChange={(e) => setCurrentResponse({ ...currentResponse, official_number: e.target.value })}
                                        required
                                    />
                                </FormGroup>
                            </Col>
                            <Col lg={6}>
                                <FormGroup>
                                    <Label className="form-label">Ngày ban hành <span className="text-danger">*</span></Label>
                                    <Input 
                                        type="date" 
                                        value={currentResponse.official_date}
                                        onChange={(e) => setCurrentResponse({ ...currentResponse, official_date: e.target.value })}
                                        required
                                    />
                                </FormGroup>
                            </Col>
                            <Col lg={12}>
                                <FormGroup>
                                    <Label className="form-label">Tệp đính kèm (PDF/Scan) {isEdit && "(Để trống nếu không thay đổi)"}</Label>
                                    <Input 
                                        type="file" 
                                        onChange={(e) => setCurrentResponse({ ...currentResponse, attached_file: e.target.files[0] })}
                                        required={!isEdit}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="light" onClick={toggle}>Hủy bỏ</Button>
                        <Button color="success" type="submit">
                            {isEdit ? "Cập nhật" : "Lưu dữ liệu"}
                        </Button>
                    </ModalFooter>
                </Form>
            </Modal>

            <DeleteModal
                show={isDeleteModal}
                onDeleteClick={handleDelete}
                onCloseClick={() => setIsDeleteModal(false)}
            />

            {/* Quick Add Agency Modal */}
            <Modal isOpen={agencyModal} toggle={toggleAgencyModal} centered size="sm">
                <ModalHeader toggle={toggleAgencyModal}>Thêm nhanh đơn vị</ModalHeader>
                <ModalBody>
                    <FormGroup>
                        <Label className="form-label">Tên đơn vị/cơ quan mới <span className="text-danger">*</span></Label>
                        <Input 
                            type="text" 
                            placeholder="Nhập tên đơn vị..." 
                            value={newAgencyName}
                            onChange={(e) => setNewAgencyName(e.target.value)}
                            autoFocus
                        />
                    </FormGroup>
                    <FormGroup className="mb-0">
                        <Label className="form-label">Phân loại đơn vị</Label>
                        <CreatableSelect
                            isClearable
                            placeholder="Chọn hoặc gõ để thêm loại mới..."
                            value={newAgencyCategory}
                            onChange={(opt) => setNewAgencyCategory(opt)}
                            options={categories.map(c => ({ value: c.id, label: c.name }))}
                            formatCreateLabel={(inputValue) => `Thêm phân loại mới: "${inputValue}"`}
                        />
                        <p className="text-muted small mt-2 mb-0">
                            Bạn có thể bỏ trống phân loại nếu chưa rõ.
                        </p>
                    </FormGroup>
                </ModalBody>
                <ModalFooter>
                    <Button color="light" size="sm" onClick={toggleAgencyModal}>Hủy</Button>
                    <Button color="primary" size="sm" onClick={handleQuickAgencySave} disabled={addingAgency}>
                        {addingAgency ? <Spinner size="sm" /> : "Lưu đơn vị"}
                    </Button>
                </ModalFooter>
            </Modal>
        </React.Fragment>
    );
};

export default ConsultationResponses;
