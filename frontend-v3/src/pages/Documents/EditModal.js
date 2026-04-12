import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, Row, Col } from 'reactstrap';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast } from 'react-toastify';
import { ModernButton } from '../../Components/Common/ModernUI';

const EditModal = ({ isOpen, toggle, document: doc, onSuccess, types }) => {
    const [formData, setFormData] = useState({ 
        project_name: '', 
        drafting_agency: '', 
        agency_location: '',
        document_type_id: '',
        status: 'Draft' 
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (doc) {
            setFormData({
                project_name: doc.project_name || '',
                drafting_agency: doc.drafting_agency || '',
                agency_location: doc.agency_location || '',
                document_type_id: doc.document_type_id || '',
                status: doc.status || 'Draft'
            });
        }
    }, [doc]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const submitData = { ...formData };
        if (!submitData.document_type_id) {
            submitData.document_type_id = null;
        }

        try {
            await axios.patch(`/api/documents/${doc.id}/`, submitData, getAuthHeader());
            toast.success("Cập nhật thông tin thành công!");
            onSuccess();
            toggle();
        } catch (error) {
            toast.error("Lỗi khi cập nhật thông tin.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} toggle={toggle} centered size="lg" contentClassName="designkit-wrapper">
            <ModalHeader toggle={toggle} className="modal-header-warning">
                <i className="ri-pencil-line me-2 text-warning"></i>
                Chỉnh sửa thông tin Dự thảo
            </ModalHeader>
            <Form onSubmit={handleSubmit}>
                <ModalBody className="p-4">
                    <Row className="gy-3">
                        <Col lg={12}>
                            <FormGroup className="mb-3">
                                <Label className="fw-bold mb-2">Tên Dự thảo</Label>
                                <Input
                                    className="bg-dark-light border-dark text-white"
                                    type="text"
                                    value={formData.project_name}
                                    onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                                    required
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--kit-border)', color: 'white' }}
                                />
                            </FormGroup>
                        </Col>
                        <Col lg={12}>
                            <FormGroup className="mb-3">
                                <Label className="fw-bold mb-2">Loại dự thảo</Label>
                                <Input
                                    className="bg-dark-light border-dark text-white form-select"
                                    type="select"
                                    value={formData.document_type_id}
                                    onChange={(e) => setFormData({ ...formData, document_type_id: e.target.value })}
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--kit-border)', color: 'white' }}
                                >
                                    <option value="">-- Chọn loại dự thảo (không bắt buộc) --</option>
                                    {(types || []).map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </Input>
                            </FormGroup>
                        </Col>
                        <Col lg={6}>
                            <FormGroup className="mb-3">
                                <Label className="fw-bold mb-2">Cơ quan chủ trì</Label>
                                <Input
                                    className="bg-dark-light border-dark text-white"
                                    type="text"
                                    value={formData.drafting_agency}
                                    onChange={(e) => setFormData({ ...formData, drafting_agency: e.target.value })}
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--kit-border)', color: 'white' }}
                                />
                            </FormGroup>
                        </Col>
                        <Col lg={6}>
                            <FormGroup className="mb-3">
                                <Label className="fw-bold mb-2">Trạng thái</Label>
                                <Input
                                    className="bg-dark-light border-dark text-white form-select"
                                    type="select"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--kit-border)', color: 'white' }}
                                >
                                    <option value="Draft">Draft (Nháp)</option>
                                    <option value="Reviewing">Reviewing (Đang duyệt)</option>
                                    <option value="Completed">Completed (Hoàn thành)</option>
                                </Input>
                            </FormGroup>
                        </Col>
                    </Row>
                </ModalBody>
                <ModalFooter>
                    <ModernButton variant="ghost" onClick={toggle} disabled={loading}>Hủy</ModernButton>
                    <ModernButton variant="primary" type="submit" loading={loading}>
                        Lưu thay đổi
                    </ModernButton>
                </ModalFooter>
            </Form>
        </Modal>
    );
};

export default EditModal;
