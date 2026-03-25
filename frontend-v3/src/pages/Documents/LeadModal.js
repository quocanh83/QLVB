import React, { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, Button, Spinner, Alert } from 'reactstrap';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast } from 'react-toastify';

const LeadModal = ({ isOpen, toggle, doc, users, onSuccess }) => {
    const [leadId, setLeadId] = useState(doc?.lead || '');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`/api/documents/${doc.id}/set_lead/`, { lead_id: leadId || null }, getAuthHeader());
            toast.success("Phân công cán bộ chủ trì thành công!");
            onSuccess();
            toggle();
        } catch (error) {
            toast.error("Lỗi khi phân công công việc.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} toggle={toggle} centered>
            <ModalHeader toggle={toggle} className="bg-info text-white">
                Phân công Cán bộ Chủ trì
            </ModalHeader>
            <Form onSubmit={handleSubmit}>
                <ModalBody className="p-4">
                    <p className="text-muted mb-4 uppercase fs-11 fw-bold">Dự thảo: {doc?.project_name}</p>
                    <FormGroup>
                        <Label for="lead_id" className="form-label fw-bold">Chọn Cán bộ</Label>
                        <Input
                            type="select"
                            id="lead_id"
                            value={leadId}
                            onChange={(e) => setLeadId(e.target.value)}
                        >
                            <option value="">-- Để trống = Gỡ bỏ chủ trì --</option>
                            {(users || []).map(u => (
                                <option key={u.id} value={u.id}>{u.full_name || u.username} ({u.role_name || u.username})</option>
                            ))}
                        </Input>
                    </FormGroup>
                    <Alert color="warning" className="mt-3 fs-12 mb-0 border-dashed border-warning">
                        <i className="ri-information-line me-2"></i>
                        Người chủ trì sẽ có quyền phê duyệt các nội dung giải trình trong dự thảo này.
                    </Alert>
                </ModalBody>
                <ModalFooter>
                    <Button color="light" onClick={toggle} disabled={loading}>Hủy</Button>
                    <Button color="info" type="submit" disabled={loading} className="text-white">
                        {loading ? <Spinner size="sm" /> : "Xác nhận Phân công"}
                    </Button>
                </ModalFooter>
            </Form>
        </Modal>
    );
};

export default LeadModal;
