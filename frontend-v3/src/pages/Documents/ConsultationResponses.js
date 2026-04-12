import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Table, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, Spinner,
    UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAuthHeader } from '../../helpers/api_helper';
import { ToastContainer, toast } from 'react-toastify';
import classnames from 'classnames';

// Modern UI Components
import { 
    ModernCard, ModernTable, ModernBadge, ModernButton, 
    ModernHeader, ModernStatWidget 
} from '../../Components/Common/ModernUI';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import DeleteModal from "../../Components/Common/DeleteModal";

const ConsultationResponses = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    document.title = "Văn bản góp ý & Giải trình | QLVB V3.0";

    const [allDocuments, setAllDocuments] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState(id || "");
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
    const [newAgencyCategory, setNewAgencyCategory] = useState(null); 
    const [categories, setCategories] = useState([]);
    const [addingAgency, setAddingAgency] = useState(false);

    const toggleAgencyModal = () => {
        setAgencyModal(!agencyModal);
        setNewAgencyName("");
        setNewAgencyCategory(null);
    };

    useEffect(() => {
        fetchDocuments();
        fetchAgencies();
        fetchCategories();
    }, []);

    useEffect(() => {
        if (id) {
            setSelectedDocId(id);
            fetchDocumentInfo(id);
            fetchResponses(id);
        } else {
            setDocumentInfo(null);
            setResponses([]);
        }
    }, [id]);

    const fetchDocuments = async () => {
        try {
            const res = await axios.get('/api/documents/', getAuthHeader());
            const data = res.results || res;
            setAllDocuments(Array.isArray(data) ? data : []);
        } catch (e) {
            toast.error("Lỗi khi tải danh sách dự thảo.");
        }
    };

    const fetchDocumentInfo = async (docId) => {
        try {
            const res = await axios.get(`/api/documents/${docId}/`, getAuthHeader());
            setDocumentInfo(res);
        } catch (e) {
            console.error("Lỗi khi tải thông tin dự thảo.");
        }
    };

    const fetchResponses = async (docId) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/feedbacks/responses/?document_id=${docId}`, getAuthHeader());
            const data = res.results || res;
            setResponses(Array.isArray(data) ? data : []);
        } catch (e) {
            toast.error("Lỗi khi tải danh sách văn bản góp ý.");
        } finally {
            setLoading(false);
        }
    };

    const handleDocumentChange = (selectedOption) => {
        const docId = selectedOption ? selectedOption.value : "";
        setSelectedDocId(docId);
        if (docId) {
            navigate(`/consultation-responses/${docId}`);
        } else {
            navigate(`/consultation-responses`);
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
            if (newAgencyCategory && newAgencyCategory.__isNew__) {
                const catRes = await axios.post('/api/settings/agency-categories/', { name: newAgencyCategory.label }, getAuthHeader());
                categoryId = catRes.data.id;
                await fetchCategories();
            }

            const res = await axios.post('/api/settings/agencies/', { 
                name: newAgencyName,
                agency_category: categoryId 
            }, getAuthHeader());
            
            toast.success("Thêm đơn vị mới thành công.");
            await fetchAgencies();
            setCurrentResponse({ ...currentResponse, agency: res.data.id });
            toggleAgencyModal();
        } catch (e) {
            toast.error("Lỗi khi thêm đơn vị nhanh.");
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
            attached_file: null
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
            fetchResponses(selectedDocId);
            setIsDeleteModal(false);
        } catch (e) {
            toast.error("Lỗi khi xóa văn bản.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!id) {
            toast.warning("Vui lòng chọn dự thảo trước.");
            return;
        }

        const formData = new FormData();
        formData.append('document', id);
        if (currentResponse.agency) formData.append('agency', currentResponse.agency);
        formData.append('official_number', currentResponse.official_number);
        formData.append('official_date', currentResponse.official_date);
        if (currentResponse.attached_file && typeof currentResponse.attached_file !== 'string') {
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
            fetchResponses(id);
            toggle();
        } catch (error) {
            toast.error("Lỗi khi lưu dữ liệu.");
        }
    };

    return (
        <div className="designkit-wrapper designkit-layout-root">
            <div className="modern-page-content">
                <Container fluid>
                    <ToastContainer closeButton={false} />

                    <ModernHeader 
                        title="Văn bản góp ý & Giải trình" 
                        subtitle="Quản lý chi tiết các bản ý kiến phản hồi và công văn góp ý từ các đơn vị"
                        actions={
                            <div className="d-flex gap-2">
                                <Link to="/documents" className="modern-btn ghost">
                                    <i className="ri-arrow-left-line me-1"></i> Dự thảo
                                </Link>
                                <ModernButton variant="success" onClick={toggle} disabled={!id}>
                                    <i className="ri-add-line me-1"></i> Thêm văn bản
                                </ModernButton>
                            </div>
                        }
                    >
                        <div className="mt-4" style={{ maxWidth: '600px' }}>
                            <Label className="text-muted small text-uppercase fw-bold mb-2">Chọn Dự thảo để hiển thị chi tiết:</Label>
                            <Select
                                placeholder="Tìm kiếm tên dự thảo..."
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        background: 'rgba(255,255,255,0.05)',
                                        borderColor: 'rgba(255,255,255,0.1)',
                                        color: 'white'
                                    }),
                                    menu: (base) => ({ ...base, background: '#1e2027', zIndex: 100 }),
                                    singleValue: (base) => ({ ...base, color: 'white' }),
                                    option: (base, state) => ({
                                        ...base,
                                        background: state.isFocused ? 'rgba(255,255,255,0.1)' : 'transparent',
                                        color: 'white'
                                    })
                                }}
                                options={allDocuments.map(doc => ({
                                    value: doc.id,
                                    label: `${doc.project_name} (${doc.document_type_name || 'Văn bản'})`
                                }))}
                                value={id ? { 
                                    value: id, 
                                    label: documentInfo ? `${documentInfo.project_name} (${documentInfo.document_type_name || 'Văn bản'})` : "Đang tải..." 
                                } : null}
                                onChange={handleDocumentChange}
                                isClearable
                            />
                        </div>
                    </ModernHeader>

                    {id && (
                        <Row className="mb-4 d-none d-lg-flex">
                            <Col lg={4}>
                                <ModernStatWidget 
                                    title="Tổng số văn bản" 
                                    value={responses.length} 
                                    label="Góp ý" 
                                    icon="ri-file-list-3-line" 
                                    color="primary" 
                                />
                            </Col>
                            <Col lg={4}>
                                <ModernStatWidget 
                                    title="Cơ quan phản hồi" 
                                    value={new Set(responses.map(r => r.agency)).size} 
                                    label="Đơn vị" 
                                    icon="ri-building-line" 
                                    color="info" 
                                />
                            </Col>
                            <Col lg={4}>
                                <ModernStatWidget 
                                    title="Tiến độ chung" 
                                    value={documentInfo?.resolved_feedbacks || 0} 
                                    label={`${documentInfo?.total_feedbacks || 0} Ý kiến`} 
                                    icon="ri-checkbox-circle-line" 
                                    color="success" 
                                />
                            </Col>
                        </Row>
                    )}

                    <ModernCard>
                        {!id ? (
                            <div className="text-center py-5">
                                <div className="avatar-lg mx-auto mb-4">
                                    <div className="avatar-title bg-light text-primary rounded-circle display-4 opacity-25">
                                        <i className="ri-file-search-line"></i>
                                    </div>
                                </div>
                                <h5 className="text-white">Chưa chọn dự thảo</h5>
                                <p className="text-muted">Vui lòng chọn một dự thảo phía trên để quản lý văn bản góp ý.</p>
                            </div>
                        ) : (
                            <ModernTable>
                                <thead>
                                    <tr>
                                        <th style={{ width: '60px' }}>STT</th>
                                        <th>Đơn vị góp ý</th>
                                        <th>Số hiệu công văn</th>
                                        <th>Ngày ban hành</th>
                                        <th>File đính kèm</th>
                                        <th style={{ width: '100px' }} className="text-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="6" className="text-center py-5"><Spinner color="primary" /></td></tr>
                                    ) : responses.length > 0 ? responses.map((resp, index) => (
                                        <tr key={resp.id}>
                                            <td className="d-none d-lg-table-cell text-center text-muted fw-medium">{String(index + 1).padStart(2, '0')}</td>
                                            <td data-label="Chi tiết" data-full-width="true">
                                                {/* Mobile Top Bar */}
                                                <div className="d-flex d-lg-none mobile-top-bar">
                                                    <ModernBadge color="info">VĂN BẢN GÓP Ý</ModernBadge>
                                                    <span className="text-muted small fw-bold"><i className="ri-calendar-line me-1"></i>{resp.official_date}</span>
                                                </div>

                                                <div className="mobile-title">{resp.agency_name}</div>
                                                
                                                <div className="mobile-meta">
                                                    <span><i className="ri-hashtag me-1"></i>{resp.official_number}</span>
                                                    {resp.attached_file && (
                                                        <a href={resp.attached_file} target="_blank" rel="noreferrer" className="ms-3 text-info">
                                                            <i className="ri-download-cloud-line me-1"></i> Tải về
                                                        </a>
                                                    )}
                                                </div>
                                            </td>

                                            <td data-label="Số hiệu" className="d-none d-lg-table-cell">{resp.official_number}</td>
                                            <td data-label="Ngày" className="d-none d-lg-table-cell">{resp.official_date}</td>
                                            <td data-label="File" className="d-none d-lg-table-cell">
                                                {resp.attached_file ? (
                                                    <a href={resp.attached_file} target="_blank" rel="noreferrer" className="btn btn-soft-info btn-sm">
                                                        <i className="ri-file-pdf-line me-1"></i> Xem File
                                                    </a>
                                                ) : <span className="text-muted small italic">Chưa có file</span>}
                                            </td>
                                            <td data-label="Hành động" className="text-center">
                                                <UncontrolledDropdown>
                                                    <DropdownToggle tag="button" className="modern-btn ghost">
                                                        <i className="ri-more-2-fill"></i>
                                                    </DropdownToggle>
                                                    <DropdownMenu container="body" className="dropdown-menu-dark" end style={{ background: '#1e2027', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                        <DropdownItem onClick={() => handleEdit(resp)}><i className="ri-pencil-line me-2"></i> Chỉnh sửa</DropdownItem>
                                                        <DropdownItem divider />
                                                        <DropdownItem onClick={() => handleDeleteClick(resp)} className="text-danger"><i className="ri-delete-bin-line me-2"></i> Xóa bỏ</DropdownItem>
                                                    </DropdownMenu>
                                                </UncontrolledDropdown>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="6" className="text-center py-5 text-muted">Chưa có văn bản góp ý nào được tải lên.</td></tr>
                                    )}
                                </tbody>
                            </ModernTable>
                        )}
                    </ModernCard>
                </Container>
            </div>

            {/* Modal Add/Edit */}
            <Modal isOpen={modal} toggle={toggle} centered size="lg" contentClassName="designkit-wrapper">
                <ModalHeader toggle={toggle} className="modal-header-info">
                    {isEdit ? "Cập nhật Văn bản góp ý" : "Thêm Văn bản góp ý mới"}
                </ModalHeader>
                <Form onSubmit={handleSubmit} className="modern-form">
                    <ModalBody className="p-4">
                        <Row>
                            <Col lg={12}>
                                <FormGroup>
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <Label className="text-muted small text-uppercase fw-bold">Đơn vị góp ý <span className="text-danger">*</span></Label>
                                        <ModernButton variant="ghost" className="p-0 text-info" onClick={toggleAgencyModal}>
                                            <i className="ri-add-line me-1"></i> Thêm nhanh đơn vị
                                        </ModernButton>
                                    </div>
                                    <Input 
                                        type="select" 
                                        className="modern-input"
                                        value={currentResponse.agency}
                                        onChange={(e) => setCurrentResponse({ ...currentResponse, agency: e.target.value })}
                                        required
                                    >
                                        <option value="">Chọn đơn vị phản hồi...</option>
                                        {agencies.map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </Input>
                                </FormGroup>
                            </Col>
                            <Col lg={6}>
                                <FormGroup>
                                    <Label className="text-muted small text-uppercase fw-bold">Số hiệu công văn <span className="text-danger">*</span></Label>
                                    <Input 
                                        type="text" 
                                        className="modern-input"
                                        placeholder="Vd: 123/BXD-VP..." 
                                        value={currentResponse.official_number}
                                        onChange={(e) => setCurrentResponse({ ...currentResponse, official_number: e.target.value })}
                                        required
                                    />
                                </FormGroup>
                            </Col>
                            <Col lg={6}>
                                <FormGroup>
                                    <Label className="text-muted small text-uppercase fw-bold">Ngày ban hành <span className="text-danger">*</span></Label>
                                    <Input 
                                        type="date" 
                                        className="modern-input"
                                        value={currentResponse.official_date}
                                        onChange={(e) => setCurrentResponse({ ...currentResponse, official_date: e.target.value })}
                                        required
                                    />
                                </FormGroup>
                            </Col>
                            <Col lg={12}>
                                <FormGroup>
                                    <Label className="text-muted small text-uppercase fw-bold">Tệp đính kèm (PDF/Scan)</Label>
                                    <div className="modern-file-upload">
                                        <Input 
                                            type="file" 
                                            className="form-control"
                                            onChange={(e) => setCurrentResponse({ ...currentResponse, attached_file: e.target.files[0] })}
                                            required={!isEdit}
                                        />
                                        {isEdit && <p className="text-muted xsmall mt-2 italic">Để trống nếu không muốn thay đổi tệp đã tải lên.</p>}
                                    </div>
                                </FormGroup>
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter className="bg-light-opacity">
                        <ModernButton variant="ghost" onClick={toggle}>Hủy bỏ</ModernButton>
                        <ModernButton variant="info" type="submit">
                            {isEdit ? "Cơ bản" : "Lưu dữ liệu"}
                        </ModernButton>
                    </ModalFooter>
                </Form>
            </Modal>

            {/* Quick Add Agency Modal */}
            <Modal isOpen={agencyModal} toggle={toggleAgencyModal} centered size="sm" contentClassName="designkit-wrapper">
                <ModalHeader toggle={toggleAgencyModal} className="modal-header-primary">Thêm nhanh đơn vị</ModalHeader>
                <ModalBody className="p-4">
                    <FormGroup>
                        <Label className="text-muted small text-uppercase fw-bold">Tên đơn vị/cơ quan <span className="text-danger">*</span></Label>
                        <Input 
                            type="text" 
                            className="modern-input"
                            placeholder="Nhập tên đơn vị..." 
                            value={newAgencyName}
                            onChange={(e) => setNewAgencyName(e.target.value)}
                            autoFocus
                        />
                    </FormGroup>
                    <FormGroup className="mb-0">
                        <Label className="text-muted small text-uppercase fw-bold">Phân loại đơn vị</Label>
                        <CreatableSelect
                            isClearable
                            styles={{
                                control: (base) => ({ ...base, background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }),
                                menu: (base) => ({ ...base, background: '#1e2027' }),
                                singleValue: (base) => ({ ...base, color: 'white' }),
                                option: (base, state) => ({
                                    ...base,
                                    background: state.isFocused ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    color: 'white'
                                })
                            }}
                            placeholder="Chọn hoặc gõ để thêm..."
                            value={newAgencyCategory}
                            onChange={(opt) => setNewAgencyCategory(opt)}
                            options={categories.map(c => ({ value: c.id, label: c.name }))}
                            formatCreateLabel={(inputValue) => `Thêm mới: "${inputValue}"`}
                        />
                    </FormGroup>
                </ModalBody>
                <ModalFooter className="bg-light-opacity">
                    <ModernButton variant="ghost" onClick={toggleAgencyModal}>Hủy</ModernButton>
                    <ModernButton variant="primary" onClick={handleQuickAgencySave} disabled={addingAgency}>
                        {addingAgency ? <Spinner size="sm" /> : "Lưu đơn vị"}
                    </ModernButton>
                </ModalFooter>
            </Modal>

            <DeleteModal
                show={isDeleteModal}
                onDeleteClick={handleDelete}
                onCloseClick={() => setIsDeleteModal(false)}
            />
        </div>
    );
};

export default ConsultationResponses;
