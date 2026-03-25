import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, Button, Spinner, Row, Col } from 'reactstrap';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast } from 'react-toastify';

const EditModal = ({ isOpen, toggle, doc, onSuccess }) => {
    const [formData, setFormData] = useState({ 
        project_name: '', 
        drafting_agency: '', 
        agency_location: '',
        status: 'Draft' 
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (doc) {
            setFormData({
                project_name: doc.project_name || '',
                drafting_agency: doc.drafting_agency || '',
                agency_location: doc.agency_location || '',
                status: doc.status || 'Draft'
            });
        }
    }, [doc]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.patch(`/api/documents/${doc.id}/`, formData, getAuthHeader());
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
        <Modal isOpen={isOpen} toggle={toggle} centered size="lg">
            <ModalHeader toggle={toggle} className="bg-dark text-white">
                Hiệu chỉnh Dự thảo
            </ModalHeader>
            <Form onSubmit={handleSubmit}>
                <ModalBody className="p-4">
                    <Row className="gy-3">
                        <Col lg={12}>
                            <FormGroup>
                                <Label for="project_name" className="form-label fw-bold">Tên Dự thảo</Label>
                                <Input
                                    type="text"
                                    id="project_name"
                                    value={formData.project_name}
                                    onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                                    required
                                />
                            </FormGroup>
                        </Col>
                        <Col lg={6}>
                            <FormGroup>
                                <Label for="drafting_agency" className="form-label fw-bold">Cơ quan chủ trì</Label>
                                <Input
                                    type="text"
                                    id="drafting_agency"
                                    value={formData.drafting_agency}
                                    onChange={(e) => setFormData({ ...formData, drafting_agency: e.target.value })}
                                />
                            </FormGroup>
                        </Col>
                        <Col lg={6}>
                            <FormGroup>
                                <Label for="status" className="form-label fw-bold">Trạng thái</Label>
                                <Input
                                    type="select"
                                    id="status"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
                    <Button color="light" onClick={toggle} disabled={loading}>Hủy</Button>
                    <Button color="dark" type="submit" disabled={loading}>
                        {loading ? <Spinner size="sm" /> : "Cập nhật thay đổi"}
                    </Button>
                </ModalFooter>
            </Form>
        </Modal>
    );
};

export default EditModal;
