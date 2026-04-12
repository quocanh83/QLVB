import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, FormGroup, Label, Input, Spinner } from 'reactstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast, ToastContainer } from 'react-toastify';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { 
    ModernCard, ModernButton, ModernHeader, ModernProgress 
} from '../../Components/Common/ModernUI';

const DocumentUpload = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ 
        project_name: '', 
        drafting_agency: '', 
        agency_location: '', 
        document_type_id: '' 
    });
    const [file, setFile] = useState(null);
    const [documentTypes, setDocumentTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingTypes, setFetchingTypes] = useState(false);

    useEffect(() => {
        fetchDocumentTypes();
    }, []);

    const fetchDocumentTypes = async () => {
        setFetchingTypes(true);
        try {
            const res = await axios.get('/api/documents/document_types/', getAuthHeader());
            setDocumentTypes(res.results || res || []);
        } catch (error) {
            console.error("Lỗi khi tải loại dự thảo", error);
        } finally {
            setFetchingTypes(false);
        }
    };

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
        if (formData.document_type_id) {
            data.append('document_type_id', formData.document_type_id);
        }
        data.append('attached_file_path', file);

        try {
            const response = await axios.post('/api/documents/', data, {
                headers: { ...getAuthHeader().headers, 'Content-Type': 'multipart/form-data' }
            });
            const newDoc = response.results || response;
            toast.success("Tải lên và bóc tách thành công!");
            
            // Redirect to details page
            setTimeout(() => {
                navigate(`/documents/${newDoc.id}`);
            }, 1500);
        } catch (error) {
            const errorMsg = error.response?.data?.error || "Lỗi khi tải lên văn bản.";
            toast.error(errorMsg);
            setLoading(false);
        }
    };

    const modernInputStyle = {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: 'white',
        borderRadius: '12px',
        padding: '12px 16px',
        fontSize: '14px',
    };

    return (
        <React.Fragment>
            <div className="designkit-wrapper designkit-layout-root">
                <div className="modern-page-content">
                    <div className="mb-3 d-none d-lg-block">
                        <BreadCrumb title="Tải lên Dự thảo" pageTitle="Quản lý Văn bản" />
                    </div>

                    <ModernHeader 
                        title="Tải lên Dự thảo mới" 
                        subtitle="Hệ thống tự động bóc tách Điều/Khoản bằng công nghệ AI bóc tách văn bản"
                        showBack={true}
                        onBack={() => navigate('/documents')}
                    />

                    <ToastContainer closeButton={false} />

                    <Row className="justify-content-center mt-4">
                        <Col lg={10}>
                            <Form onSubmit={handleSubmit}>
                                <Row>
                                    <Col lg={7}>
                                        <ModernCard className="p-4 h-100">
                                            <h6 className="text-muted text-uppercase fw-bold mb-4 fs-12">Thông tin cơ bản</h6>
                                            <Row className="gy-4">
                                                <Col lg={12}>
                                                    <FormGroup>
                                                        <Label className="text-white-50 fw-bold small text-uppercase mb-2">Tên Dự thảo / Dự án <span className="text-danger">*</span></Label>
                                                        <Input
                                                            style={modernInputStyle}
                                                            type="text"
                                                            placeholder="Ví dụ: Luật Đất đai (sửa đổi)"
                                                            value={formData.project_name}
                                                            onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                                                            required
                                                        />
                                                    </FormGroup>
                                                </Col>
                                                <Col lg={12}>
                                                    <FormGroup>
                                                        <Label className="text-white-50 fw-bold small text-uppercase mb-2">Loại dự thảo</Label>
                                                        <Input
                                                            style={modernInputStyle}
                                                            type="select"
                                                            value={formData.document_type_id}
                                                            onChange={(e) => setFormData({ ...formData, document_type_id: e.target.value })}
                                                            disabled={fetchingTypes}
                                                        >
                                                            <option value="">-- Chọn loại dự thảo (không bắt buộc) --</option>
                                                            {documentTypes.map(t => (
                                                                <option key={t.id} value={t.id}>{t.name}</option>
                                                            ))}
                                                        </Input>
                                                    </FormGroup>
                                                </Col>
                                                <Col lg={6}>
                                                    <FormGroup>
                                                        <Label className="text-white-50 fw-bold small text-uppercase mb-2">Cơ quan chủ trì</Label>
                                                        <Input
                                                            style={modernInputStyle}
                                                            type="text"
                                                            placeholder="Bộ Tài nguyên và Môi trường"
                                                            value={formData.drafting_agency}
                                                            onChange={(e) => setFormData({ ...formData, drafting_agency: e.target.value })}
                                                        />
                                                    </FormGroup>
                                                </Col>
                                                <Col lg={6}>
                                                    <FormGroup>
                                                        <Label className="text-white-50 fw-bold small text-uppercase mb-2">Địa danh</Label>
                                                        <Input
                                                            style={modernInputStyle}
                                                            type="text"
                                                            placeholder="Hà Nội"
                                                            value={formData.agency_location}
                                                            onChange={(e) => setFormData({ ...formData, agency_location: e.target.value })}
                                                        />
                                                    </FormGroup>
                                                </Col>
                                            </Row>
                                        </ModernCard>
                                    </Col>

                                    <Col lg={5}>
                                        <ModernCard className="p-4 h-100 d-flex flex-column">
                                            <h6 className="text-muted text-uppercase fw-bold mb-4 fs-12">Tệp dữ liệu bóc tách</h6>
                                            
                                            <div className="flex-grow-1 d-flex flex-column justify-content-center">
                                                <div 
                                                    className={`modern-upload-zone p-5 rounded text-center mb-4 ${file ? 'active' : ''}`}
                                                    style={{ 
                                                        border: '2px dashed rgba(255,255,255,0.1)', 
                                                        background: 'rgba(255,255,255,0.02)',
                                                        transition: 'all 0.3s ease',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => document.getElementById('doc-file').click()}
                                                >
                                                    <Input
                                                        type="file"
                                                        accept=".docx"
                                                        onChange={(e) => setFile(e.target.files[0])}
                                                        className="d-none"
                                                        id="doc-file"
                                                    />
                                                    <i className={`ri-file-word-2-fill display-4 mb-3 d-block ${file ? 'text-primary' : 'text-muted'}`}></i>
                                                    <h5 className="text-white">{file ? file.name : "Chọn tệp Word (.docx)"}</h5>
                                                    <p className="text-muted small">Kéo thả hoặc nhấp để tải tệp lên</p>
                                                </div>

                                                <div className="p-3 rounded bg-info-subtle border-info border-dashed border text-info fs-12 mb-4">
                                                    <i className="ri-information-line me-1"></i>
                                                    AI sẽ tự động nhận diện cấu trúc Chương, Mục, Điều, Khoản từ tệp của bạn.
                                                </div>
                                            </div>

                                            <ModernButton 
                                                variant="primary" 
                                                type="submit" 
                                                className="w-100 py-3" 
                                                disabled={loading}
                                                style={{ fontSize: '1rem' }}
                                            >
                                                {loading ? (
                                                    <><Spinner size="sm" className="me-2" /> Đang bóc tách dữ liệu...</>
                                                ) : (
                                                    <><i className="ri-flashlight-fill me-2"></i> Bắt đầu bóc tách</>
                                                )}
                                            </ModernButton>
                                        </ModernCard>
                                    </Col>
                                </Row>
                                
                                {loading && (
                                    <div className="mt-4 px-3">
                                        <div className="d-flex justify-content-between mb-2 small text-muted">
                                            <span>Tiến trình bóc tách bằng AI...</span>
                                            <span>Vui lòng không đóng trình duyệt</span>
                                        </div>
                                        <ModernProgress value={60} color="primary" animated label="60%" />
                                    </div>
                                )}
                            </Form>
                        </Col>
                    </Row>
                </div>
            </div>
        </React.Fragment>
    );
};

export default DocumentUpload;
