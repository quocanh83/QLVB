import React, { useState, useEffect } from 'react';
import { 
    Container, Row, Col, Card, CardBody, CardHeader, Button, 
    Table, Modal, ModalHeader, ModalBody, ModalFooter,
    Form, FormGroup, Label, Input, Badge, ListGroup, ListGroupItem,
    Dropdown, DropdownToggle, DropdownMenu, DropdownItem, FormText
} from 'reactstrap';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { toast, ToastContainer } from 'react-toastify';

const ComparisonProjectDetail = () => {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    
    // Upload version state
    const [userNote, setUserNote] = useState('');
    const [file, setFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Replace base file state
    const [replaceModal, setReplaceModal] = useState(false);
    const [newBaseFile, setNewBaseFile] = useState(null);

    // Edit project info state
    const [editModal, setEditModal] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editBaseDoc, setEditBaseDoc] = useState('');
    const [editDraftDoc, setEditDraftDoc] = useState('');
    
    // Explanation state
    const [activeVersionId, setActiveVersionId] = useState(null);
    const [activeVersionEx, setActiveVersionEx] = useState(null);
    const [gsheetModal, setGsheetModal] = useState(false);
    const [gsheetUrl, setGsheetUrl] = useState("");
    const fileInputRef = React.useRef(null);

    useEffect(() => {
        fetchProject();
    }, [id]);

    const fetchProject = async () => {
        try {
            const res = await axios.get(`/api/comparisons/projects/${id}/`, getAuthHeader());
            setProject(res);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching project", error);
            toast.error("Không thể tải thông tin dự án");
        }
    };

    const toggleModal = () => {
        setModal(!modal);
        if(!modal) {
            setUserNote('');
            setFile(null);
        }
    };

    const toggleReplaceModal = () => {
        setReplaceModal(!replaceModal);
        if(!replaceModal) setNewBaseFile(null);
    };

    const handleUploadVersion = async (e) => {
        e.preventDefault();
        if (!file) {
            toast.warning("Vui lòng chọn tệp dự thảo");
            return;
        }

        const formData = new FormData();
        formData.append('project', id);
        formData.append('user_note', userNote);
        formData.append('file_path', file);

        const config = {
            ...getAuthHeader(),
            headers: { 
                ...getAuthHeader().headers,
                'Content-Type': 'multipart/form-data' 
            }
        };

        setSubmitting(true);
        try {
            await axios.post('/api/comparisons/versions/', formData, config);
            toast.success("Tải lên phiên bản mới thành công!");
            toggleModal();
            fetchProject();
        } catch (error) {
            console.error("Error uploading version", error);
            toast.error("Lỗi khi tải lên phiên bản");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReplaceBaseFile = async (e) => {
        e.preventDefault();
        if (!newBaseFile) {
            toast.warning("Vui lòng chọn tệp bản gốc mới");
            return;
        }

        const formData = new FormData();
        formData.append('base_file', newBaseFile);

        const config = {
            ...getAuthHeader(),
            headers: { 
                ...getAuthHeader().headers,
                'Content-Type': 'multipart/form-data' 
            }
        };

        setSubmitting(true);
        try {
            await axios.post(`/api/comparisons/projects/${id}/replace_base_file/`, formData, config);
            toast.success("Thay thế văn bản gốc thành công!");
            toggleReplaceModal();
            fetchProject();
        } catch (error) {
            console.error("Error replacing base file", error);
            toast.error("Lỗi khi thay thế bản gốc");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteVersion = async (versionId) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa phiên bản dự thảo này? Dữ liệu so sánh liên quan cũng sẽ bị xóa.")) return;
        
        try {
            await axios.delete(`/api/comparisons/versions/${versionId}/`, getAuthHeader());
            toast.success("Đã xóa phiên bản!");
            fetchProject();
        } catch (error) {
            console.error("Error deleting version", error);
            toast.error("Lỗi khi xóa phiên bản");
        }
    };

    const handleExportMappings = (versionId) => {
        const token = localStorage.getItem("access_token");
        const apiBase = axios.defaults.baseURL || "";
        const url = `${apiBase}/api/comparisons/versions/${versionId}/export_mappings/?token=${token}`;
        window.open(url, '_blank');
    };

    const handleOpenGsheetModal = (v) => {
        setActiveVersionEx(v);
        setGsheetUrl(v.explanation_sheet_url || "");
        setGsheetModal(true);
    };

    const handleSyncGsheet = async () => {
        if (!gsheetUrl) return toast.error("Vui lòng nhập URL Google Sheet");
        try {
            await axios.post(`/api/comparisons/versions/${activeVersionEx.id}/sync_gsheet_explanation/`, { sheet_url: gsheetUrl }, getAuthHeader());
            toast.success("Đồng bộ thành công!");
            setGsheetModal(false);
            fetchProject();
        } catch (err) {
            toast.error("Đồng bộ thất bại: " + (err.response?.data?.error || err.message));
        }
    };

    const handleFileChange = async (e, versionId) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        const config = getAuthHeader();
        config.headers['Content-Type'] = 'multipart/form-data';

        try {
            await axios.post(`/api/comparisons/versions/${versionId}/upload_explanation/`, formData, config);
            toast.success("Cập nhật thuyết minh thành công!");
            e.target.value = null;
        } catch (err) {
            toast.error("Cập nhật thất bại: " + (err.response?.data?.error || err.message));
        }
    };

    const triggerFileUpload = (vId) => {
        setActiveVersionEx({id: vId});
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const toggleEditModal = () => {
        setEditModal(!editModal);
        if(!editModal && project) {
            setEditName(project.name);
            setEditDesc(project.description || '');
            setEditBaseDoc(project.base_document_name || '');
            setEditDraftDoc(project.draft_document_name || '');
        }
    };

    const handleEditProject = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await axios.patch(`/api/comparisons/projects/${id}/`, {
                name: editName,
                description: editDesc,
                base_document_name: editBaseDoc,
                draft_document_name: editDraftDoc
            }, getAuthHeader());
            toast.success("Cập nhật thông tin dự án thành công!");
            setEditModal(false);
            fetchProject();
        } catch (error) {
            console.error("Error editing project", error);
            toast.error("Lỗi khi cập nhật thông tin");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="page-content text-center py-5"><div className="spinner-border text-primary"></div></div>;
    if (!project) return <div className="page-content">Dự án không tồn tại.</div>;

    return (
        <div className="page-content">
            <Container fluid>
                <BreadCrumb title="Chi tiết Dự án" pageTitle="So sánh Văn bản" />
                
                <Row>
                    <Col lg={4}>
                        <Card>
                            <CardHeader className="bg-primary-subtle">
                                <h5 className="card-title mb-0 text-primary">Thông tin Dự án</h5>
                            </CardHeader>
                            <CardBody>
                                <div className="mb-3">
                                    <Label className="text-muted mb-1">Tên dự án</Label>
                                    <h6 className="fs-14">{project.name}</h6>
                                </div>
                                <div className="mb-3">
                                    <Label className="text-muted mb-1">Mô tả</Label>
                                    <p>{project.description || "Không có mô tả"}</p>
                                </div>
                                <div className="mb-3">
                                    <Label className="text-muted mb-1">Văn bản gốc</Label>
                                    <div className="d-flex align-items-center p-2 border rounded bg-light">
                                        <i className="ri-file-word-2-fill fs-24 text-primary me-2"></i>
                                        <div className="flex-grow-1 overflow-hidden">
                                            <h6 className="fs-13 mb-0 text-truncate">
                                                {project.base_file ? project.base_file.split('/').pop() : "Chưa tải lên"}
                                            </h6>
                                            <small className="text-muted">{project.base_node_count} mục được bóc tách</small>
                                        </div>
                                    </div>
                                </div>
                                <Row className="mb-3">
                                    <Col sm={6}>
                                        <Label className="text-muted mb-1 small">Định danh VB gốc</Label>
                                        <p className="fw-medium mb-0">{project.base_document_name || "-"}</p>
                                    </Col>
                                    <Col sm={6}>
                                        <Label className="text-muted mb-1 small">Định danh VB dự thảo</Label>
                                        <p className="fw-medium mb-0">{project.draft_document_name || "-"}</p>
                                    </Col>
                                </Row>

                                <div className="mt-3 gap-2 d-flex flex-column">
                                    <Button color="soft-info" size="sm" onClick={toggleEditModal}>
                                        <i className="ri-edit-line me-1"></i> Sửa thông tin dự án
                                    </Button>
                                    <Link to={`/comparisons/${id}/base-nodes`} className="btn btn-sm btn-soft-primary w-100">
                                        <i className="ri-edit-box-line me-1"></i> Hiệu chỉnh cấu trúc bản gốc
                                    </Link>
                                    <Button color="soft-warning" size="sm" className="w-100" onClick={toggleReplaceModal}>
                                        <i className="ri-refresh-line me-1"></i> Thay thế bản gốc mới
                                    </Button>
                                </div>
                                <div className="mt-4">
                                    <Button color="primary" className="w-100" onClick={toggleModal}>
                                        <i className="ri-upload-2-line align-bottom me-1"></i> Tải lên Dự thảo mới
                                    </Button>
                                </div>
                            </CardBody>
                        </Card>
                    </Col>

                    <Col lg={8}>
                        <Card>
                            <CardHeader className="d-flex align-items-center">
                                <h5 className="card-title mb-0 flex-grow-1">Lịch sử Phiên bản Dự thảo</h5>
                                <Badge color="primary">Tổng cộng {project.versions.length} bản</Badge>
                            </CardHeader>
                            <CardBody>
                                {project.versions.length === 0 ? (
                                    <div className="text-center py-5">
                                        <p className="text-muted">Chưa có phiên bản dự thảo nào được tải lên.</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <Table className="table-hover mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Phiên bản</th>
                                                    <th>Ghi chú</th>
                                                    <th>Cấu trúc dự thảo</th>
                                                    <th>Ngày tải lên</th>
                                                    <th className="text-end">Hành động</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {project.versions.map((v) => (
                                                    <tr key={v.id}>
                                                        <td>
                                                            <div className="d-flex align-items-center">
                                                                <div className="flex-shrink-0 avatar-xs">
                                                                    <div className="avatar-title bg-info-subtle text-info rounded">
                                                                        V
                                                                    </div>
                                                                </div>
                                                                <div className="flex-grow-1 ms-2">
                                                                    <h6 className="mb-0 fs-13">{v.version_label}</h6>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="text-muted small">{v.user_note || "-"}</td>
                                                        <td>
                                                            <Link to={`/comparisons/${id}/v/${v.id}/nodes`} className="btn btn-sm btn-soft-info">
                                                                <i className="ri-list-settings-line me-1"></i> Hiệu chỉnh
                                                            </Link>
                                                        </td>
                                                        <td>{new Date(v.created_at).toLocaleString('vi-VN')}</td>
                                                        <td className="text-end">
                                                            <div className="d-flex justify-content-end gap-2">
                                                                <Dropdown isOpen={activeVersionId === v.id} toggle={() => setActiveVersionId(activeVersionId === v.id ? null : v.id)}>
                                                                    <DropdownToggle size="sm" color="soft-info" className="btn-icon">
                                                                        <i className="ri-more-2-fill"></i>
                                                                    </DropdownToggle>
                                                                    <DropdownMenu className="dropdown-menu-end">
                                                                        <DropdownItem onClick={() => handleExportMappings(v.id)}>
                                                                            <i className="ri-file-excel-line me-2 align-middle text-success"></i> Xuất bộ nhớ Excel
                                                                        </DropdownItem>
                                                                        <DropdownItem onClick={() => triggerFileUpload(v.id)}>
                                                                            <i className="ri-file-word-line me-2 align-middle text-primary"></i> Nạp Thuyết minh (Word)
                                                                        </DropdownItem>
                                                                        <DropdownItem onClick={() => handleOpenGsheetModal(v)}>
                                                                            <i className="ri-google-line me-2 align-middle text-warning"></i> Đồng bộ GSheet
                                                                        </DropdownItem>
                                                                        <DropdownItem divider />
                                                                        <DropdownItem onClick={() => handleDeleteVersion(v.id)} className="text-danger">
                                                                            <i className="ri-delete-bin-fill me-2 align-middle"></i> Xóa phiên bản
                                                                        </DropdownItem>
                                                                    </DropdownMenu>
                                                                </Dropdown>
                                                                
                                                                <Link to={`/comparisons/${id}/v/${v.id}`} className="btn btn-sm btn-primary">
                                                                    <i className="ri-arrow-left-right-line me-1"></i> So sánh
                                                                </Link>
                                                            </div>
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

                {/* Modal Upload Phiên bản */}
                <Modal isOpen={modal} toggle={toggleModal} centered>
                    <ModalHeader toggle={toggleModal}>Tải lên Phiên bản Dự thảo mới</ModalHeader>
                    <Form onSubmit={handleUploadVersion}>
                        <ModalBody>
                            <div className="mb-3">
                                <Label for="file">Chọn file dự thảo (.docx) <span className="text-danger">*</span></Label>
                                <Input 
                                    type="file" 
                                    id="file" 
                                    accept=".docx" 
                                    onChange={(e) => setFile(e.target.files[0])}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <Label for="note">Ghi chú (Ví dụ: Dự thảo sau họp ngày...)</Label>
                                <Input 
                                    type="text" 
                                    id="note" 
                                    placeholder="Ghi chú nội dung phiên bản..."
                                    value={userNote}
                                    onChange={(e) => setUserNote(e.target.value)}
                                />
                                <small className="text-muted">Hệ thống sẽ tự động thêm ngày giờ vào tên phiên bản.</small>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="light" onClick={toggleModal}>Hủy</Button>
                            <Button color="primary" type="submit" disabled={submitting}>
                                {submitting ? "Đang xử lý..." : "Tải lên & Đối chiếu"}
                            </Button>
                        </ModalFooter>
                    </Form>
                </Modal>
                {/* Modal Thay thế Bản gốc */}
                <Modal isOpen={replaceModal} toggle={toggleReplaceModal} centered>
                    <ModalHeader toggle={toggleReplaceModal}>Thay thế Văn bản gốc</ModalHeader>
                    <Form onSubmit={handleReplaceBaseFile}>
                        <ModalBody>
                            <div className="p-3 bg-warning-subtle text-warning rounded mb-3">
                                <i className="ri-error-warning-line me-1"></i>
                                <strong>Chú ý:</strong> Khi thay thế bản gốc, toàn bộ các mục (Điều/Khoản) cũ sẽ bị xóa và bóc tách lại từ file mới. Các ánh xạ hiện tại có thể bị ảnh hưởng.
                            </div>
                            <div className="mb-3">
                                <Label for="newBase">Chọn file .docx mới <span className="text-danger">*</span></Label>
                                <Input 
                                    type="file" 
                                    id="newBase" 
                                    accept=".docx" 
                                    onChange={(e) => setNewBaseFile(e.target.files[0])}
                                    required
                                />
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="light" onClick={toggleReplaceModal}>Hủy</Button>
                            <Button color="warning" type="submit" disabled={submitting}>
                                {submitting ? "Đang xử lý..." : "Xác nhận Thay thế"}
                            </Button>
                        </ModalFooter>
                    </Form>
                </Modal>

                {/* Modal Sửa thông tin Dự án */}
                <Modal isOpen={editModal} toggle={toggleEditModal} centered size="lg">
                    <ModalHeader toggle={toggleEditModal}>Chỉnh sửa Thông tin Dự án</ModalHeader>
                    <Form onSubmit={handleEditProject}>
                        <ModalBody>
                            <Row className="g-3">
                                <Col lg={12}>
                                    <Label for="e_name">Tên dự án <span className="text-danger">*</span></Label>
                                    <Input value={editName} onChange={e => setEditName(e.target.value)} required />
                                </Col>
                                <Col lg={12}>
                                    <Label for="e_desc">Mô tả</Label>
                                    <Input type="textarea" rows="2" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                                </Col>
                                <Col lg={6}>
                                    <Label>Tên văn bản gốc <span className="text-danger">*</span></Label>
                                    <Input value={editBaseDoc} onChange={e => setEditBaseDoc(e.target.value)} required />
                                </Col>
                                <Col lg={6}>
                                    <Label>Tên văn bản dự thảo <span className="text-danger">*</span></Label>
                                    <Input value={editDraftDoc} onChange={e => setEditDraftDoc(e.target.value)} required />
                                </Col>
                            </Row>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="light" onClick={toggleEditModal}>Hủy</Button>
                            <Button color="primary" type="submit" disabled={submitting}>Lưu thay đổi</Button>
                        </ModalFooter>
                    </Form>
                </Modal>

                {/* --- Explanation UI Components --- */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: "none" }} 
                  accept=".docx" 
                  onChange={(e) => handleFileChange(e, activeVersionEx?.id)} 
                />

                <Modal isOpen={gsheetModal} toggle={() => setGsheetModal(!gsheetModal)} centered>
                    <ModalHeader toggle={() => setGsheetModal(!gsheetModal)}>Đồng bộ Thuyết minh từ Google Sheets</ModalHeader>
                    <ModalBody>
                        <div className="mb-3">
                            <Label className="form-label">Link Google Sheet</Label>
                            <Input 
                                type="url" 
                                placeholder="https://docs.google.com/spreadsheets/d/..." 
                                value={gsheetUrl}
                                onChange={(e) => setGsheetUrl(e.target.value)}
                            />
                            <FormText color="muted">
                                Đảm bảo bạn đã chia sẻ quyền Viewer cho Email công vụ của hệ thống (Service Account).
                            </FormText>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="light" onClick={() => setGsheetModal(false)}>Hủy</Button>
                        <Button color="warning" onClick={handleSyncGsheet}>
                           <i className="ri-refresh-line me-1"></i> Bắt đầu Đồng bộ
                        </Button>
                    </ModalFooter>
                </Modal>

                <ToastContainer />
            </Container>
        </div>
    );
};

export default ComparisonProjectDetail;
