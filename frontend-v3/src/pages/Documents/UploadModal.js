import React, { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, Button, Spinner, Row, Col } from 'reactstrap';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast } from 'react-toastify';

const UploadModal = ({ isOpen, toggle, onSuccess }) => {
    const [formData, setFormData] = useState({ project_name: '', drafting_agency: '', agency_location: '' });
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            toast.warning("Vui lòng chọn tệp Word (.docx)");
            return;
        }

        setLoading(true);
        const data = new FormData();
        data.append('project_name', formData.project_name);
        data.append('drafting_agency', formData.drafting_agency);
        data.append('agency_location', formData.agency_location);
        data.append('attached_file_path', file);

        try {
            await axios.post('/api/documents/', data, {
                headers: { ...getAuthHeader().headers, 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Tải lên và bóc tách thành công!");
            onSuccess();
            toggle();
            setFormData({ project_name: '', drafting_agency: '', agency_location: '' });
            setFile(null);
        } catch (error) {
            const errorMsg = error.response?.data?.error || "Lỗi khi tải lên văn bản.";
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} toggle={toggle} centered size="lg">
            <ModalHeader toggle={toggle} className="bg-primary text-white">
                Tải lên Dự thảo mới
            </ModalHeader>
            <Form onSubmit={handleSubmit}>
                <ModalBody className="p-4">
                    <Row className="gy-4">
                        <Col lg={12}>
                            <FormGroup>
                                <Label for="project_name" className="form-label fw-bold">Tên Dự thảo / Dự án</Label>
                                <Input
                                    type="text"
                                    id="project_name"
                                    placeholder="Ví dụ: Luật Đất đai (sửa đổi)"
                                    value={formData.project_name}
                                    onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                                    required
                                />
                            </FormGroup>
                        </Col>
                        <Col lg={6}>
                            <FormGroup>
                                <Label for="drafting_agency" className="form-label fw-bold">Cơ quan chủ trì soạn thảo</Label>
                                <Input
                                    type="text"
                                    id="drafting_agency"
                                    placeholder="Bộ Tài nguyên và Môi trường"
                                    value={formData.drafting_agency}
                                    onChange={(e) => setFormData({ ...formData, drafting_agency: e.target.value })}
                                />
                            </FormGroup>
                        </Col>
                        <Col lg={6}>
                            <FormGroup>
                                <Label for="agency_location" className="form-label fw-bold">Địa danh</Label>
                                <Input
                                    type="text"
                                    id="agency_location"
                                    placeholder="Hà Nội"
                                    value={formData.agency_location}
                                    onChange={(e) => setFormData({ ...formData, agency_location: e.target.value })}
                                />
                            </FormGroup>
                        </Col>
                        <Col lg={12}>
                            <div className="mt-2">
                                <Label className="form-label fw-bold">Tệp đính kèm (.docx)</Label>
                                <div className="border border-dashed p-4 text-center rounded">
                                    <Input
                                        type="file"
                                        accept=".docx"
                                        onChange={(e) => setFile(e.target.files[0])}
                                        className="d-none"
                                        id="doc-file"
                                    />
                                    <label htmlFor="doc-file" style={{ cursor: 'pointer' }}>
                                        <div className="mb-3">
                                            <i className="display-4 text-muted ri-upload-cloud-2-fill"></i>
                                        </div>
                                        <h5>{file ? file.name : "Nhấp để chọn hoặc kéo thả tệp tại đây"}</h5>
                                        <p className="text-muted">Hệ thống sẽ tự động bóc tách Điều/Khoản bằng AI.</p>
                                    </label>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </ModalBody>
                <ModalFooter>
                    <Button color="light" onClick={toggle} disabled={loading}>Hủy</Button>
                    <Button color="primary" type="submit" disabled={loading}>
                        {loading ? <><Spinner size="sm" className="me-2" /> Đang bóc tách...</> : "Bắt đầu bóc tách"}
                    </Button>
                </ModalFooter>
            </Form>
        </Modal>
    );
};
export default UploadModal;
