import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Table, Modal, ModalHeader, ModalBody, ModalFooter, Input, Label, Spinner } from 'reactstrap';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast } from 'react-toastify';
import moment from 'moment';

const DocumentTypeManagement = () => {
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchTypes();
    }, []);

    const fetchTypes = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/documents/types/', getAuthHeader());
            const data = res.results || res;
            setTypes(Array.isArray(data) ? data : []);
        } catch (e) {
            toast.error("Lỗi khi tải danh sách loại dự thảo");
        } finally {
            setLoading(false);
        }
    };

    const toggleModal = () => setModal(!modal);

    const openCreateModal = () => {
        setIsEdit(false);
        setFormData({ name: '', description: '' });
        toggleModal();
    };

    const openEditModal = (item) => {
        setIsEdit(true);
        setCurrentId(item.id);
        setFormData({ name: item.name, description: item.description || '' });
        toggleModal();
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa loại văn bản này?")) return;
        try {
            await axios.delete(`/api/documents/types/${id}/`, getAuthHeader());
            toast.success("Xóa thành công");
            fetchTypes();
        } catch (e) {
            toast.error("Lỗi khi xóa. Có thể loại văn bản này đang được sử dụng.");
        }
    };

    const handleSave = async () => {
        if (!formData.name) {
            toast.warning("Tên loại văn bản không được để trống");
            return;
        }
        setSaving(true);
        try {
            if (isEdit) {
                await axios.put(`/api/documents/types/${currentId}/`, formData, getAuthHeader());
                toast.success("Cập nhật thành công");
            } else {
                await axios.post('/api/documents/types/', formData, getAuthHeader());
                toast.success("Thêm mới thành công");
            }
            toggleModal();
            fetchTypes();
        } catch (e) {
            toast.error("Có lỗi xảy ra, vui lòng kiểm tra lại. Tên loại văn bản có thể đã tồn tại.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Quản lý Loại dự thảo" pageTitle="Quản trị" />

                    <Card>
                        <CardHeader className="d-flex justify-content-between align-items-center">
                            <h4 className="card-title mb-0">Danh mục Loại dự thảo</h4>
                            <Button color="primary" onClick={openCreateModal}>
                                <i className="ri-add-line align-bottom me-1"></i> Thêm mới
                            </Button>
                        </CardHeader>
                        <CardBody>
                            {loading ? (
                                <div className="text-center p-4">
                                    <Spinner color="primary" />
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <Table className="table-hover table-bordered table-nowrap mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th style={{ width: '50px' }}>STT</th>
                                                <th>Tên loại văn bản</th>
                                                <th>Mô tả</th>
                                                <th>Ngày tạo</th>
                                                <th style={{ width: '120px' }}>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {types.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="text-center p-3 text-muted">
                                                        Chưa có dữ liệu Loại dự thảo.
                                                    </td>
                                                </tr>
                                            ) : (
                                                types.map((item, index) => (
                                                    <tr key={item.id}>
                                                        <td className="text-center">{index + 1}</td>
                                                        <td className="fw-medium">{item.name}</td>
                                                        <td>{item.description}</td>
                                                        <td>{moment(item.created_at).format('DD/MM/YYYY HH:mm')}</td>
                                                        <td>
                                                            <div className="d-flex gap-2">
                                                                <Button color="success" size="sm" outline onClick={() => openEditModal(item)} title="Sửa">
                                                                    <i className="ri-pencil-line"></i>
                                                                </Button>
                                                                <Button color="danger" size="sm" outline onClick={() => handleDelete(item.id)} title="Xoá">
                                                                    <i className="ri-delete-bin-line"></i>
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    <Modal isOpen={modal} toggle={toggleModal} backdrop="static" centered>
                        <ModalHeader toggle={toggleModal}>
                            {isEdit ? "Cập nhật Loại dự thảo" : "Thêm mới Loại dự thảo"}
                        </ModalHeader>
                        <ModalBody>
                            <div className="mb-3">
                                <Label htmlFor="typeName">Tên loại văn bản <span className="text-danger">*</span></Label>
                                <Input 
                                    type="text" 
                                    id="typeName" 
                                    placeholder="Ví dụ: Luật, Nghị định..." 
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="mb-3">
                                <Label htmlFor="typeDescription">Mô tả thêm</Label>
                                <Input 
                                    type="textarea" 
                                    rows={3} 
                                    id="typeDescription" 
                                    placeholder="Viết mô tả..." 
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                />
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="light" onClick={toggleModal} disabled={saving}>Hủy</Button>
                            <Button color="primary" onClick={handleSave} disabled={saving}>
                                {saving ? <Spinner size="sm" /> : "Lưu Thay Đổi"}
                            </Button>
                        </ModalFooter>
                    </Modal>

                </Container>
            </div>
        </React.Fragment>
    );
};

export default DocumentTypeManagement;
