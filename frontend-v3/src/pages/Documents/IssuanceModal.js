import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, Row, Col } from 'reactstrap';
import Select from 'react-select';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast } from 'react-toastify';
import { ModernButton } from '../../Components/Common/ModernUI';

const IssuanceModal = ({ isOpen, toggle, doc, onSuccess }) => {
    const [formData, setFormData] = useState({
        issuance_number: '',
        issuance_date: '',
        consulted_agencies: []
    });
    const [issuanceFile, setIssuanceFile] = useState(null);
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [matching, setMatching] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchAgencies();
            if (doc) {
                setFormData({
                    issuance_number: doc.issuance_number || '',
                    issuance_date: doc.issuance_date || '',
                    consulted_agencies: doc.consulted_agencies || []
                });
            }
        }
    }, [isOpen, doc]);

    const fetchAgencies = async () => {
        try {
            const res = await axios.get('/api/settings/agencies/', getAuthHeader());
            const data = res.results || res;
            setAgencies(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Lỗi lấy danh sách đơn vị:", e);
        }
    };

    const handleFileMatch = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const data = new FormData();
        data.append('file', file);

        setMatching(true);
        try {
            const res = await axios.post('/api/documents/match_agencies_from_file/', data, getAuthHeader());
            const matchedIds = res.matched_ids || [];
            
            const currentIds = new Set(formData.consulted_agencies);
            matchedIds.forEach(id => currentIds.add(id));
            
            setFormData({ ...formData, consulted_agencies: Array.from(currentIds) });
            toast.success(`Đã tự động nhận diện và quét được ${matchedIds.length} đơn vị từ tệp.`);
        } catch (err) {
            toast.error("Lỗi khi quét danh sách đơn vị từ tệp.");
        } finally {
            setMatching(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const data = new FormData();
        data.append('issuance_number', formData.issuance_number);
        data.append('issuance_date', formData.issuance_date);
        formData.consulted_agencies.forEach(id => {
            data.append('consulted_agencies', id);
        });
        
        if (issuanceFile) {
            data.append('issuance_file', issuanceFile);
        }

        try {
            await axios.patch(`/api/documents/${doc.id}/`, data, getAuthHeader());
            toast.success("Cập nhật thông tin lấy ý kiến dự thảo thành công.");
            onSuccess();
            toggle();
        } catch (error) {
            toast.error("Lỗi khi cập nhật thông tin lấy ý kiến dự thảo.");
        } finally {
            setLoading(false);
        }
    };

    const agencyOptions = agencies.map(a => ({ value: a.id, label: a.name }));
    const selectedAgencies = agencyOptions.filter(opt => formData.consulted_agencies.includes(opt.value));

    return (
        <Modal isOpen={isOpen} toggle={toggle} centered size="lg" contentClassName="designkit-wrapper">
            <ModalHeader toggle={toggle} className="modal-header-info">
                <i className="ri-send-plane-fill me-2 text-info"></i>
                Lấy ý kiến dự thảo
            </ModalHeader>
            <Form onSubmit={handleSubmit}>
                <ModalBody className="p-4">
                    <Row>
                        <Col lg={6}>
                            <FormGroup className="mb-3">
                                <Label className="fw-bold mb-2">Số văn bản lấy ý kiến <span className="text-danger">*</span></Label>
                                <Input 
                                    className="bg-dark-light border-dark text-white"
                                    type="text" 
                                    placeholder="Ví dụ: 123/BXD-VP" 
                                    value={formData.issuance_number}
                                    onChange={(e) => setFormData({ ...formData, issuance_number: e.target.value })}
                                    required
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--kit-border)', color: 'white' }}
                                />
                            </FormGroup>
                        </Col>
                        <Col lg={6}>
                            <FormGroup className="mb-3">
                                <Label className="fw-bold mb-2">Ngày lấy ý kiến <span className="text-danger">*</span></Label>
                                <Input 
                                    className="bg-dark-light border-dark text-white"
                                    type="date" 
                                    value={formData.issuance_date}
                                    onChange={(e) => setFormData({ ...formData, issuance_date: e.target.value })}
                                    required
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--kit-border)', color: 'white' }}
                                />
                            </FormGroup>
                        </Col>
                        
                        <Col lg={12}>
                            <FormGroup className="mb-3">
                                <Label className="fw-bold mb-2">Đính kèm văn bản lấy ý kiến (PDF/Scan)</Label>
                                <Input 
                                    className="bg-dark-light border-dark text-white"
                                    type="file" 
                                    onChange={(e) => setIssuanceFile(e.target.files[0])}
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--kit-border)', color: 'white' }}
                                />
                            </FormGroup>
                        </Col>

                        <Col lg={12}>
                            <div className="border-top my-4" style={{ borderColor: 'var(--kit-border) !important' }}></div>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <Label className="fw-bold mb-0">Đơn vị nhận ý kiến</Label>
                                <div className="text-end">
                                    <Label for="match-file" className="btn btn-soft-info btn-sm mb-0 cursor-pointer" style={{ borderRadius: '20px' }}>
                                        <i className="ri-search-eye-line align-bottom me-1"></i> 
                                        {matching ? "Đang quét..." : "Quét từ tệp"}
                                    </Label>
                                    <Input 
                                        type="file" 
                                        id="match-file" 
                                        className="d-none" 
                                        onChange={handleFileMatch}
                                        accept=".docx,.xlsx"
                                    />
                                </div>
                            </div>
                            
                            <FormGroup className="mb-0">
                                <Select
                                    isMulti
                                    options={agencyOptions}
                                    value={selectedAgencies}
                                    onChange={(selected) => setFormData({ ...formData, consulted_agencies: (selected || []).map(s => s.value) })}
                                    placeholder="Chọn các đơn vị..."
                                    classNamePrefix="react-select"
                                    menuPortalTarget={document.body}
                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                />
                                <div className="mt-3 p-3 rounded" style={{ background: 'rgba(6, 182, 212, 0.05)', border: '1px dashed rgba(6, 182, 212, 0.3)' }}>
                                    <p className="text-info fs-12 mb-0 italic">
                                        <i className="ri-information-line me-2"></i>
                                        Sử dụng chức năng <b>"Quét từ tệp"</b> (Word/Excel) để hệ thống tự động nhận diện danh sách đơn vị từ nội dung văn bản.
                                    </p>
                                </div>
                            </FormGroup>
                        </Col>
                    </Row>
                </ModalBody>
                <ModalFooter>
                    <ModernButton variant="ghost" onClick={toggle} disabled={loading}>Hủy</ModernButton>
                    <ModernButton variant="primary" type="submit" loading={loading} disabled={matching}>
                        Xác nhận Lấy ý kiến
                    </ModernButton>
                </ModalFooter>
            </Form>
        </Modal>
    );
};

export default IssuanceModal;
