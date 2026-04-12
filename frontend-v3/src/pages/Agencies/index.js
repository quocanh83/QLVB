import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Input, Table, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem, Badge, Spinner } from 'reactstrap';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { ToastContainer, toast } from 'react-toastify';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import FeatherIcon from "feather-icons-react";
import { 
    ModernCard, ModernTable, ModernBadge, ModernButton, 
    ModernHeader, ModernStatWidget, ModernSearchBox 
} from '../../Components/Common/ModernUI';
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
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedAgencies, setSelectedAgencies] = useState([]);
    const [isBulkDelete, setIsBulkDelete] = useState(false);

    // Category Management State
    const [categoryModal, setCategoryModal] = useState(false);
    const [isCategoryEdit, setIsCategoryEdit] = useState(false);
    const [currentCategory, setCurrentCategory] = useState({ name: '', description: '' });

    // Import state
    const [isImportModal, setIsImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [isResultModal, setIsResultModal] = useState(false);
    
    // New Import Analysis state
    const [analysisResult, setAnalysisResult] = useState(null);
    const [duplicatesMode, setDuplicatesMode] = useState('overwrite'); // 'overwrite' or 'skip'

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
        if (!isImportModal) {
            setImportFile(null);
            setAnalysisResult(null);
            setDuplicatesMode('overwrite');
        }
    };

    const toggleResultModal = () => {
        setIsResultModal(!isResultModal);
        if (isResultModal) {
            setImportResult(null);
            fetchAgencies();
        }
    };

    const handleEditAgency = (agency) => {
        setCurrentAgency(agency);
        setIsEdit(true);
        setModal(true);
    };

    const handleDeleteClick = (agency) => {
        setIsBulkDelete(false);
        setSelectedAgency(agency);
        setIsDeleteModal(true);
    };

    const handleBulkDeleteClick = () => {
        setIsBulkDelete(true);
        setIsDeleteModal(true);
    };

    const handleDeleteAgency = async () => {
        try {
            if (isBulkDelete) {
                await axios.post('/api/settings/agencies/bulk-delete/', { ids: selectedAgencies }, getAuthHeader());
                toast.success("Xóa hàng loạt thành công.");
                setSelectedAgencies([]);
            } else {
                await axios.delete(`/api/settings/agencies/${selectedAgency.id}/`, getAuthHeader());
                toast.success("Xóa đơn vị thành công.");
            }
            fetchAgencies();
            setIsDeleteModal(false);
            setIsBulkDelete(false);
        } catch (e) {
            toast.error(e.response?.data?.error || "Lỗi khi xóa.");
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

    const handleAnalyze = async () => {
        if (!importFile) {
            toast.warning("Vui lòng chọn tệp tin (.xlsx hoặc .csv)");
            return;
        }

        const formData = new FormData();
        formData.append("file", importFile);

        setImporting(true);
        try {
            const res = await axios.post('/api/settings/agencies/analyze_import/', formData, getAuthHeader());
            setAnalysisResult(res.data || res);
        } catch (e) {
            toast.error(e.response?.data?.error || "Lỗi khi kiểm tra tệp.");
        } finally {
            setImporting(false);
        }
    };

    const handleImport = async () => {
        if (!importFile) return;

        const formData = new FormData();
        formData.append("file", importFile);
        formData.append("duplicates_mode", duplicatesMode);

        setImporting(true);
        try {
            const res = await axios.post('/api/settings/agencies/bulk_import/', formData, getAuthHeader());
            const data = res.data || res;
            setImportResult(data);
            setIsImportModal(false); // Close parent
            setIsResultModal(true);
        } catch (e) {
            toast.error(e.response?.data?.error || "Lỗi khi nhập dữ liệu.");
        } finally {
            setImporting(false);
        }
    };

    const filteredAgencies = agencies.filter(a => {
        const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat = selectedCategory === 'all' || a.agency_category === parseInt(selectedCategory);
        return matchesSearch && matchesCat;
    });

    const getCategoryBadge = (agency) => {
        const label = agency.category_name || agency.category || 'Khác';
        
        return (
            <ModernBadge color="info">
                {label}
            </ModernBadge>
        );
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedAgencies(filteredAgencies.map(a => a.id));
        } else {
            setSelectedAgencies([]);
        }
    };

    const handleSelectAgency = (id) => {
        if (selectedAgencies.includes(id)) {
            setSelectedAgencies(selectedAgencies.filter(item => item !== id));
        } else {
            setSelectedAgencies([...selectedAgencies, id]);
        }
    };

    return (
        <React.Fragment>
            <div className="designkit-wrapper">
                <div className="modern-page-content">
                    <ModernHeader 
                        title="Quản lý Đơn vị góp ý" 
                        subtitle="Hệ thống quản trị danh mục đơn vị tham vấn"
                        actions={
                            <div className="d-flex gap-2">
                                <ModernButton variant="primary" onClick={toggle}>
                                    <i className="ri-add-line align-bottom"></i> Thêm mới
                                </ModernButton>
                                <ModernButton variant="ghost" onClick={toggleCategoryModal}>
                                    <i className="ri-list-settings-line align-bottom"></i> Phân loại
                                </ModernButton>
                                <ModernButton variant="ghost" onClick={toggleImport}>
                                    <i className="ri-file-upload-line align-bottom"></i> Nhập tệp
                                </ModernButton>
                            </div>
                        }
                    />
                    
                    <ToastContainer closeButton={false} />

                    <div className="modern-widgets-grid mb-4">
                        <ModernStatWidget 
                            title="Tất cả Đơn vị"
                            value={agencies.length}
                            label="Tổng số"
                            icon="ri-community-line"
                            color="primary"
                            isActive={selectedCategory === 'all'}
                            onClick={() => setSelectedCategory('all')}
                        />

                        {agencyCategories.slice(0, 3).map((cat, idx) => (
                            <ModernStatWidget 
                                key={cat.id}
                                title={cat.name}
                                value={cat.agencies_count || 0}
                                label="Đơn vị"
                                icon="ri-government-line"
                                color={idx % 2 === 0 ? 'info' : 'success'}
                                isActive={selectedCategory === cat.id.toString()}
                                onClick={() => setSelectedCategory(cat.id.toString())}
                            />
                        ))}
                    </div>

                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                        <div className="d-flex align-items-center gap-3">
                            <ModernSearchBox 
                                placeholder="Tìm kiếm cơ quan..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ width: '350px' }}
                            />
                            {selectedAgencies.length > 0 && (
                                <ModernButton variant="ghost" className="text-danger" onClick={handleBulkDeleteClick}>
                                    <i className="ri-delete-bin-line align-bottom"></i> Xóa {selectedAgencies.length} mục
                                </ModernButton>
                            )}
                        </div>
                        
                        <div className="d-flex gap-2 align-items-center">
                            <span className="text-muted fs-12 text-uppercase fw-bold">Lọc:</span>
                            <select 
                                className="form-select form-select-sm bg-transparent border-light-subtle text-white"
                                style={{ width: '200px', borderRadius: '50px', background: 'rgba(255,255,255,0.05)' }}
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="all">Tất cả phân loại</option>
                                {agencyCategories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <ModernCard>
                        <ModernTable>
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>
                                        <div className="form-check">
                                            <input 
                                                className="form-check-input" 
                                                type="checkbox" 
                                                onChange={handleSelectAll}
                                                checked={filteredAgencies.length > 0 && selectedAgencies.length === filteredAgencies.length}
                                            />
                                        </div>
                                    </th>
                                    <th style={{ width: '60px' }}>STT</th>
                                    <th>Tên Đơn vị / Cơ quan / Tổ chức</th>
                                    <th>Phân loại</th>
                                    <th style={{ width: '120px' }} className="text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-5">
                                            <Spinner size="sm" color="primary" />
                                            <span className="ms-2">Đang tải dữ liệu...</span>
                                        </td>
                                    </tr>
                                ) : filteredAgencies.length > 0 ? filteredAgencies.map((agency, index) => (
                                    <tr key={agency.id} className={selectedAgencies.includes(agency.id) ? "table-active" : ""}>
                                        <td>
                                            <div className="form-check">
                                                <input 
                                                    className="form-check-input" 
                                                    type="checkbox" 
                                                    checked={selectedAgencies.includes(agency.id)}
                                                    onChange={() => handleSelectAgency(agency.id)}
                                                />
                                            </div>
                                        </td>
                                        <td className="text-center text-muted">{index + 1}</td>
                                        <td>
                                            <div className="fw-bold text-white">{agency.name}</div>
                                            <div className="small text-muted">ID: #{agency.id}</div>
                                        </td>
                                        <td>{getCategoryBadge(agency)}</td>
                                        <td>
                                            <div className="d-flex gap-2 justify-content-center">
                                                <button className="btn-link-modern" onClick={() => handleEditAgency(agency)}>
                                                    <i className="ri-pencil-fill"></i> SỬA
                                                </button>
                                                <button className="btn-link-modern text-danger" onClick={() => handleDeleteClick(agency)}>
                                                    <i className="ri-delete-bin-fill"></i> XÓA
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="text-center py-5 text-muted">
                                            <i className="ri-file-search-line display-4 d-block mb-3 opacity-20"></i>
                                            Không tìm thấy đơn vị nào phù hợp.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </ModernTable>
                    </ModernCard>
                </div>
            </div>

            {/* Modal Add/Edit */}
            <Modal isOpen={modal} toggle={toggle} centered className="modern-modal">
                <ModalHeader toggle={toggle} className="modern-modal-header">
                    <i className={isEdit ? "ri-pencil-line me-2" : "ri-add-circle-line me-2"}></i>
                    {isEdit ? "Cập nhật Đơn vị" : "Thêm Đơn vị mới"}
                </ModalHeader>
                <Form onSubmit={handleSubmit}>
                    <ModalBody className="p-4">
                        <FormGroup className="mb-4">
                            <Label className="text-white-60 xsmall fw-bold text-uppercase mb-2">Tên Đơn vị / Cơ quan / Tổ chức <span className="text-danger">*</span></Label>
                            <Input 
                                type="text" 
                                className="modern-input"
                                placeholder="Nhập tên đầy đủ..." 
                                value={currentAgency.name}
                                onChange={(e) => setCurrentAgency({ ...currentAgency, name: e.target.value })}
                                required
                            />
                        </FormGroup>
                        <FormGroup className="mb-0">
                            <Label className="text-white-60 xsmall fw-bold text-uppercase mb-2">Phân loại Cơ quan</Label>
                            <Input 
                                type="select" 
                                className="modern-input"
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
                    <ModalFooter className="modern-modal-footer">
                        <ModernButton variant="ghost" onClick={toggle}>Hủy bỏ</ModernButton>
                        <ModernButton variant="success" type="submit">
                            <i className="ri-save-line me-1"></i> {isEdit ? "Cập nhật" : "Lưu dữ liệu"}
                        </ModernButton>
                    </ModalFooter>
                </Form>
            </Modal>
            
            {/* Modal Import */}
            <Modal isOpen={isImportModal} toggle={toggleImport} centered size={analysisResult ? "lg" : "md"}>
                <ModalHeader toggle={toggleImport} className="bg-light p-3">
                    Nhập đơn vị từ tệp tin
                </ModalHeader>
                <ModalBody>
                    {!analysisResult ? (
                        <>
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
                                Tệp tin cần có cột <b>name</b> (tên đơn vị) và cột <b>category</b>.
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="d-flex mb-4 gap-3 text-center">
                                <div className="p-3 border rounded border-success border-dashed flex-grow-1">
                                    <h6 className="text-success mb-1">Đơn vị mới</h6>
                                    <span className="fw-bold fs-20">{analysisResult.new_count}</span>
                                </div>
                                <div className="p-3 border rounded border-warning border-dashed flex-grow-1">
                                    <h6 className="text-warning mb-1">Đơn vị đã tồn tại</h6>
                                    <span className="fw-bold fs-20">{analysisResult.duplicate_count}</span>
                                </div>
                            </div>

                            {analysisResult.duplicate_count > 0 && (
                                <div className="mb-4">
                                    <Label className="form-label fw-semibold">Xử lý các đơn vị đã tồn tại:</Label>
                                    <div className="d-flex gap-4 mt-1">
                                        <div className="form-check">
                                            <Input 
                                                className="form-check-input" 
                                                type="radio" 
                                                name="dupMode" 
                                                id="dupSkip" 
                                                checked={duplicatesMode === 'skip'}
                                                onChange={() => setDuplicatesMode('skip')}
                                            />
                                            <Label className="form-check-label" htmlFor="dupSkip font-weight-normal">
                                                Bỏ qua (Chỉ thêm các đơn vị mới)
                                            </Label>
                                        </div>
                                        <div className="form-check">
                                            <Input 
                                                className="form-check-input" 
                                                type="radio" 
                                                name="dupMode" 
                                                id="dupOverwrite" 
                                                checked={duplicatesMode === 'overwrite'}
                                                onChange={() => setDuplicatesMode('overwrite')}
                                            />
                                            <Label className="form-check-label" htmlFor="dupOverwrite">
                                                Ghi đè (Cập nhật thông tin mới nhất)
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="table-responsive" style={{maxHeight: '250px'}}>
                                <Table className="table-sm table-nowrap align-middle mb-0">
                                    <thead className="table-light sticky-top">
                                        <tr>
                                            <th>Tên Đơn vị (Trùng khớp)</th>
                                            <th>Phân loại</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analysisResult.duplicates.length > 0 ? analysisResult.duplicates.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="fs-13">{item.name}</td>
                                                <td className="fs-13 text-muted">{item.category}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="2" className="text-center text-muted small py-3">Không có đơn vị nào bị trùng.</td>
                                            </tr>
                                        )}
                                        {analysisResult.has_more_duplicates && (
                                            <tr>
                                                <td colSpan="2" className="text-center text-muted xsmall italics py-2">... và {analysisResult.duplicate_count - 100} đơn vị khác ...</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="light" onClick={toggleImport}>Hủy bỏ</Button>
                    {!analysisResult ? (
                        <Button color="primary" onClick={handleAnalyze} disabled={importing || !importFile}>
                            {importing ? <Spinner size="sm" /> : "Kiểm tra dữ liệu"}
                        </Button>
                    ) : (
                        <Button color="success" onClick={handleImport} disabled={importing}>
                            {importing ? <Spinner size="sm" /> : "Xác nhận nhập dữ liệu"}
                        </Button>
                    )}
                </ModalFooter>
            </Modal>

            {/* Modal Category Management */}
            <Modal isOpen={categoryModal} toggle={toggleCategoryModal} centered size="lg" className="modern-modal">
                <ModalHeader toggle={toggleCategoryModal} className="modern-modal-header">
                    <i className="ri-list-settings-line me-2"></i> Quản lý Danh mục Phân loại Cơ quan
                </ModalHeader>
                <ModalBody className="p-4">
                    <Form onSubmit={handleCategorySubmit} className="mb-4 p-4 rounded-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Row className="g-3 align-items-end">
                            <Col md={5}>
                                <Label className="text-white-60 xsmall fw-bold text-uppercase mb-2">Tên phân loại</Label>
                                <Input 
                                    type="text" 
                                    className="modern-input"
                                    value={currentCategory.name} 
                                    onChange={(e) => setCurrentCategory({...currentCategory, name: e.target.value})}
                                    required 
                                    placeholder="Ví dụ: Cấp Trung ương"
                                />
                            </Col>
                            <Col md={5}>
                                <Label className="text-white-60 xsmall fw-bold text-uppercase mb-2">Mô tả</Label>
                                <Input 
                                    type="text" 
                                    className="modern-input"
                                    value={currentCategory.description || ""} 
                                    onChange={(e) => setCurrentCategory({...currentCategory, description: e.target.value})}
                                    placeholder="Nhập ghi chú..."
                                />
                            </Col>
                            <Col md={2}>
                                <ModernButton variant={isCategoryEdit ? "primary" : "success"} type="submit" className="w-100">
                                    <i className={isCategoryEdit ? "ri-save-line" : "ri-add-line"}></i> {isCategoryEdit ? "Lưu" : "Thêm"}
                                </ModernButton>
                            </Col>
                        </Row>
                    </Form>

                    <ModernTable>
                        <thead>
                            <tr>
                                <th>Tên phân loại</th>
                                <th>Mô tả</th>
                                <th className="text-center">Số đơn vị</th>
                                <th style={{ width: '120px' }} className="text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {agencyCategories.map(cat => (
                                <tr key={cat.id}>
                                    <td>
                                        <div className="fw-bold text-white">{cat.name}</div>
                                    </td>
                                    <td className="small text-white-40">{cat.description || "---"}</td>
                                    <td className="text-center">
                                        <ModernBadge color="info">{cat.agencies_count || 0}</ModernBadge>
                                    </td>
                                    <td>
                                        <div className="d-flex justify-content-center gap-3">
                                            <button className="btn-link-modern" onClick={() => handleEditCategory(cat)}>
                                                <i className="ri-pencil-fill"></i> SỬA
                                            </button>
                                            <button className="btn-link-modern text-danger" onClick={() => handleDeleteCategory(cat.id)}>
                                                <i className="ri-delete-bin-fill"></i> XÓA
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </ModernTable>
                </ModalBody>
                <ModalFooter className="modern-modal-footer">
                    <ModernButton variant="ghost" onClick={toggleCategoryModal}>Đóng cửa sổ</ModernButton>
                </ModalFooter>
            </Modal>

            <DeleteModal
                show={isDeleteModal}
                title={isBulkDelete ? "Xác nhận xóa hàng loạt" : "Xác nhận xóa đơn vị"}
                message={isBulkDelete ? `Bạn có chắc chắn muốn xóa ${selectedAgencies.length} đơn vị đã chọn không?` : `Bạn có chắc chắn muốn xóa đơn vị "${selectedAgency?.name}" không?`}
                onDeleteClick={handleDeleteAgency}
                onCloseClick={() => setIsDeleteModal(false)}
            />

            {/* Modal Result Import */}
            <Modal isOpen={isResultModal} toggle={toggleResultModal} centered size="lg">
                <ModalHeader toggle={toggleResultModal} className="bg-light p-3">
                    Kết quả nhập dữ liệu
                </ModalHeader>
                <ModalBody>
                    <div className="d-flex mb-3 gap-3">
                        <div className="p-2 border rounded bg-success-subtle flex-grow-1 text-center">
                            <h6 className="text-success mb-1">Mới</h6>
                            <span className="fw-bold fs-16">{importResult?.created || 0}</span>
                        </div>
                        <div className="p-2 border rounded bg-info-subtle flex-grow-1 text-center">
                            <h6 className="text-info mb-1">Cập nhật</h6>
                            <span className="fw-bold fs-16">{importResult?.updated || 0}</span>
                        </div>
                        <div className="p-2 border rounded bg-light flex-grow-1 text-center">
                            <h6 className="text-muted mb-1">Tổng cộng</h6>
                            <span className="fw-bold fs-16">{importResult?.details?.length || 0}</span>
                        </div>
                    </div>
                    
                    <div className="table-responsive" style={{ maxHeight: '400px' }}>
                        <Table className="table-sm align-middle table-nowrap mb-0">
                            <thead className="table-light sticky-top">
                                <tr>
                                    <th>Tên Đơn vị</th>
                                    <th>Phân loại</th>
                                    <th className="text-center">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {importResult?.details?.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="fs-13">{item.name}</td>
                                        <td className="fs-13">{item.category}</td>
                                        <td className="text-center">
                                            <Badge color={item.status === "Mới" ? "success" : "info"} className="badge-soft-info">
                                                {item.status}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="primary" onClick={toggleResultModal}>Đóng và Cập nhật danh sách</Button>
                </ModalFooter>
            </Modal>
        </React.Fragment>
    );
};

export default Agencies;
