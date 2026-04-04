import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Button, Spinner, Alert } from 'reactstrap';
import Select from 'react-select';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast } from 'react-toastify';

const LeadModal = ({ isOpen, toggle, doc, users, onSuccess }) => {
    // Chuyển danh sách ID sang format của react-select { value, label }
    const [selectedLeads, setSelectedLeads] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (doc && doc.leads) {
            const currentLeads = (users || []).filter(u => (doc.leads || []).includes(u.id)).map(u => ({
                value: u.id,
                label: u.full_name || u.username
            }));
            setSelectedLeads(currentLeads);
        } else if (doc && doc.leads_detail) {
            setSelectedLeads((doc.leads_detail || []).map(l => ({
                value: l.id,
                label: l.full_name || l.username
            })));
        } else {
            setSelectedLeads([]);
        }
    }, [doc, users]);

    const userOptions = (users || []).map(u => ({
        value: u.id,
        label: `${u.full_name || u.username} (${u.role_name || 'Cán bộ'})`
    }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const leadIds = selectedLeads.map(item => item.value);
            await axios.post(`/api/documents/${doc.id}/set_lead/`, { lead_ids: leadIds }, getAuthHeader());
            toast.success("Cập nhật Cán bộ Chủ trì thành công!");
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
                    <FormGroup className="mb-3">
                        <Label className="form-label fw-bold">Chọn Cán bộ Chủ trì (có thể chọn nhiều)</Label>
                        <Select
                            isMulti
                            options={userOptions}
                            value={selectedLeads}
                            onChange={(newValue) => setSelectedLeads(newValue)}
                            placeholder="Tìm kiếm và chọn..."
                            classNamePrefix="react-select"
                        />
                    </FormGroup>
                    <Alert color="warning" className="mt-3 fs-12 mb-0 border-dashed border-warning">
                        <i className="ri-information-line me-2"></i>
                        Những người được chọn sẽ có quyền Phân công chuyên viên và Phê duyệt giải trình cho dự thảo này.
                    </Alert>
                </ModalBody>
                <ModalFooter>
                    <Button color="light" onClick={toggle} disabled={loading}>Hủy</Button>
                    <Button color="info" type="submit" disabled={loading} className="text-white">
                        {loading ? <Spinner size="sm" /> : "Xác nhận Lựa chọn"}
                    </Button>
                </ModalFooter>
            </Form>
        </Modal>
    );
};

export default LeadModal;
