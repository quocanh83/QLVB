import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormGroup, Label, Input, Row, Col, Spinner } from 'reactstrap';
import Select from 'react-select';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast } from 'react-toastify';

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
            
            // Merge with existing or replace? User said "đánh dấu các đơn vị", so merge
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
        // ManyToMany field needs multiple entries in FormData or a stringified list depending on backend
        formData.consulted_agencies.forEach(id => {
            data.append('consulted_agencies', id);
        });
        
        if (issuanceFile) {
            data.append('issuance_file', issuanceFile);
        }

        try {
            // Using PATCH for partial update
            await axios.patch(`/api/documents/${doc.id}/`, data, getAuthHeader());
            toast.success("Cập nhật thông tin phát hành thành công.");
            onSuccess();
            toggle();
        } catch (error) {
            toast.error("Lỗi khi cập nhật thông tin phát hành.");
        } finally {
            setLoading(false);
        }
    };

    const agencyOptions = agencies.map(a => ({ value: a.id, label: a.name }));
    const selectedAgencies = agencyOptions.filter(opt => formData.consulted_agencies.includes(opt.value));

    const selectStyles = {
        control: (base, state) => ({
            ...base,
            background: "var(--vz-input-bg)",
            borderColor: state.isFocused ? "var(--vz-input-focus-border-color)" : "var(--vz-input-border)",
            color: "var(--vz-body-color)",
        }),
        menu: (base) => ({
            ...base,
            background: "var(--vz-choices-bg, #ffffff)",
            borderColor: "var(--vz-input-border)",
            zIndex: 9999
        }),
        option: (base, state) => ({
            ...base,
            background: state.isSelected ? "var(--vz-primary)" : state.isFocused ? "var(--vz-primary-light, #eef1f6)" : "transparent",
            color: state.isSelected ? "#fff" : "var(--vz-body-color)",
            cursor: "pointer",
        }),
        multiValue: (base) => ({
            ...base,
            background: "var(--vz-primary-light, #eef1f6)",
            color: "var(--vz-primary, #405189)",
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: "var(--vz-primary, #405189)",
        }),
        singleValue: (base) => ({
            ...base,
            color: "var(--vz-body-color)",
        }),
    };

    return (
        <Modal isOpen={isOpen} toggle={toggle} centered size="lg">
            <ModalHeader toggle={toggle} className="bg-light p-3">
                Phát hành văn bản lấy ý kiến
            </ModalHeader>
            <Form onSubmit={handleSubmit}>
                <ModalBody>
                    <Row>
                        <Col lg={6}>
                            <FormGroup>
                                <Label className="form-label">Số văn bản <span className="text-danger">*</span></Label>
                                <Input 
                                    type="text" 
                                    placeholder="Ví dụ: 123/BXD-VP" 
                                    value={formData.issuance_number}
                                    onChange={(e) => setFormData({ ...formData, issuance_number: e.target.value })}
                                    required
                                />
                            </FormGroup>
                        </Col>
                        <Col lg={6}>
                            <FormGroup>
                                <Label className="form-label">Ngày ban hành <span className="text-danger">*</span></Label>
                                <Input 
                                    type="date" 
                                    value={formData.issuance_date}
                                    onChange={(e) => setFormData({ ...formData, issuance_date: e.target.value })}
                                    required
                                />
                            </FormGroup>
                        </Col>
                        
                        <Col lg={12}>
                            <FormGroup>
                                <Label className="form-label">Đính kèm văn bản phát hành (PDF/Scan)</Label>
                                <Input 
                                    type="file" 
                                    onChange={(e) => setIssuanceFile(e.target.files[0])}
                                />
                            </FormGroup>
                        </Col>

                        <Col lg={12}>
                            <hr className="my-3" />
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <Label className="form-label mb-0">Danh sách đơn vị được lấy ý kiến</Label>
                                <div className="text-end">
                                    <Label for="match-file" className="btn btn-soft-info btn-sm mb-0 cursor-pointer">
                                        <i className="ri-search-eye-line align-bottom me-1"></i> 
                                        Quét danh sách từ tệp 
                                        {matching && <Spinner size="sm" className="ms-1" />}
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
                            
                            <FormGroup>
                                <Select
                                    isMulti
                                    options={agencyOptions}
                                    value={selectedAgencies}
                                    onChange={(selected) => setFormData({ ...formData, consulted_agencies: (selected || []).map(s => s.value) })}
                                    placeholder="Chọn các đơn vị..."
                                    styles={selectStyles}
                                    menuPortalTarget={document.body}
                                />
                                <small className="text-muted mt-1 d-block italic">
                                    * Bạn có thể chọn thủ công hoặc sử dụng chức năng <b>"Quét từ tệp"</b> để hệ thống tự động nhận diện đơn vị.
                                </small>
                            </FormGroup>
                        </Col>
                    </Row>
                </ModalBody>
                <ModalFooter>
                    <Button color="light" onClick={toggle}>Đóng</Button>
                    <Button color="primary" type="submit" disabled={loading || matching}>
                        {loading ? "Đang lưu..." : "Xác nhận phát hành"}
                    </Button>
                </ModalFooter>
            </Form>
        </Modal>
    );
};

export default IssuanceModal;
