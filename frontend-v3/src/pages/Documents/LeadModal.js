import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Spinner, Alert } from 'reactstrap';
import Select from 'react-select';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast } from 'react-toastify';
import { ModernButton } from '../../Components/Common/ModernUI';

const LeadModal = ({ isOpen, toggle, doc, users, onSuccess }) => {
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
        <Modal isOpen={isOpen} toggle={toggle} centered contentClassName="designkit-wrapper">
            <ModalHeader toggle={toggle} className="modal-header-indigo">
                <i className="ri-user-star-line me-2 text-primary"></i>
                Phân công Cán bộ Chủ trì
            </ModalHeader>
            <Form onSubmit={handleSubmit}>
                <ModalBody className="p-4">
                    <p className="mb-4" style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase' }}>
                        Dự thảo: {doc?.project_name}
                    </p>
                    <FormGroup className="mb-3">
                        <Label className="fw-bold mb-2" style={{ color: 'var(--kit-text-2)' }}>Chọn Cán bộ Chủ trì (có thể chọn nhiều)</Label>
                        <Select
                            isMulti
                            options={userOptions}
                            value={selectedLeads}
                            onChange={(newValue) => setSelectedLeads(newValue)}
                            placeholder="Tìm kiếm và chọn..."
                            className="react-select-container"
                            classNamePrefix="react-select"
                        />
                    </FormGroup>
                    <Alert color="warning" className="mt-3 fs-12 mb-0 border-dashed border-warning" style={{ background: 'rgba(245, 158, 11, 0.05)', color: '#f59e0b' }}>
                        <i className="ri-information-line me-2"></i>
                        Những người được chọn sẽ có quyền Phân công chuyên viên và Phê duyệt giải trình cho dự thảo này.
                    </Alert>
                </ModalBody>
                <ModalFooter>
                    <ModernButton variant="ghost" onClick={toggle} disabled={loading}>Hủy</ModernButton>
                    <ModernButton variant="primary" type="submit" loading={loading}>
                        Xác nhận Lựa chọn
                    </ModernButton>
                </ModalFooter>
            </Form>
        </Modal>
    );
};

export default LeadModal;
