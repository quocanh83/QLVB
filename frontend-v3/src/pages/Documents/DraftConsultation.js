import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardBody, Container, Row, Col, Form, FormGroup, Label, Input, Button, Spinner } from 'reactstrap';
import Select from 'react-select';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast, ToastContainer } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { 
    ModernCard, ModernBadge, ModernButton, 
    ModernHeader, ModernSearchBox 
} from '../../Components/Common/ModernUI';

const DraftConsultation = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        issuance_number: '',
        issuance_date: '',
        consulted_agencies: [] // These are existing ones from DB
    });
    const [newConsultedAgencies, setNewConsultedAgencies] = useState([]); // These are additional ones
    const [documents, setDocuments] = useState([]);
    const [doc, setDoc] = useState(null);
    const [issuanceFile, setIssuanceFile] = useState(null);
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingDoc, setFetchingDoc] = useState(false);
    const [matching, setMatching] = useState(false);

    const fetchDocuments = useCallback(async () => {
        try {
            const res = await axios.get('/api/documents/', getAuthHeader());
            const data = res.results || res;
            setDocuments(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Lỗi lấy danh sách dự thảo:", e);
        }
    }, []);

    const fetchAgencies = useCallback(async () => {
        try {
            const res = await axios.get('/api/settings/agencies/', getAuthHeader());
            const data = res.results || res;
            setAgencies(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Lỗi lấy danh sách đơn vị:", e);
        }
    }, []);

    const fetchDocument = useCallback(async (docId) => {
        setFetchingDoc(true);
        try {
            const res = await axios.get(`/api/documents/${docId}/`, getAuthHeader());
            setDoc(res);
            setFormData({
                issuance_number: res.issuance_number || '',
                issuance_date: res.issuance_date || '',
                consulted_agencies: res.consulted_agencies || []
            });
            setNewConsultedAgencies([]);
        } catch (e) {
            toast.error("Không tìm thấy thông tin dự thảo.");
        } finally {
            setFetchingDoc(false);
        }
    }, []);

    useEffect(() => {
        fetchAgencies();
        fetchDocuments();
        if (id) {
            fetchDocument(id);
        }
    }, [id, fetchAgencies, fetchDocument, fetchDocuments]);

    const handleFileMatch = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const data = new FormData();
        data.append('file', file);

        setMatching(true);
        try {
            const res = await axios.post('/api/documents/match_agencies_from_file/', data, getAuthHeader());
            const matchedIds = res.matched_ids || [];
            
            // Merge with "new" selection only (excluding ones already in the doc)
            const existingIds = new Set(formData.consulted_agencies);
            const currentNewIds = new Set(newConsultedAgencies);
            
            matchedIds.forEach(id => {
                if (!existingIds.has(id)) {
                    currentNewIds.add(id);
                }
            });
            
            setNewConsultedAgencies(Array.from(currentNewIds));
            toast.success(`Đã tự động nhận diện và quét được ${matchedIds.length} đơn vị từ tệp.`);
        } catch (err) {
            toast.error("Lỗi khi quét danh sách đơn vị từ tệp.");
        } finally {
            setMatching(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!id && !doc) {
            toast.warning("Vui lòng chọn dự thảo.");
            return;
        }

        setLoading(true);
        const data = new FormData();
        data.append('issuance_number', formData.issuance_number);
        data.append('issuance_date', formData.issuance_date);
        
        // Merge both lists: existing from DB and new ones selected
        const allAgencies = new Set([...formData.consulted_agencies, ...newConsultedAgencies]);
        allAgencies.forEach(agId => {
            data.append('consulted_agencies', agId);
        });
        
        if (issuanceFile) {
            data.append('issuance_file', issuanceFile);
        }

        try {
            await axios.patch(`/api/documents/${id || doc.id}/`, data, getAuthHeader());
            toast.success("Cập nhật thông tin lấy ý kiến dự thảo thành công.");
            if (id) fetchDocument(id); // Reload to update "already consulted" UI
        } catch (error) {
            toast.error("Lỗi khi cập nhật thông tin lấy ý kiến dự thảo.");
        } finally {
            setLoading(false);
        }
    };

    const documentOptions = documents.map(d => ({ value: d.id, label: d.project_name }));
    const selectedDocumentOption = documentOptions.find(opt => opt.value === Number(id)) || null;

    const agencyOptions = agencies.map(a => ({ value: a.id, label: a.name }));
    
    // Existing:
    const alreadyConsulted = agencyOptions.filter(opt => formData.consulted_agencies.includes(opt.value));
    // Available new ones:
    const availableNewAgencies = agencyOptions.filter(opt => !formData.consulted_agencies.includes(opt.value));
    const selectedNewAgencies = agencyOptions.filter(opt => newConsultedAgencies.includes(opt.value));
    const selectStyles = {
        control: (base, state) => ({
            ...base,
            background: "rgba(255, 255, 255, 0.05)",
            borderColor: state.isFocused ? "var(--kit-primary)" : "rgba(255, 255, 255, 0.1)",
            color: "white",
            borderRadius: "10px",
            minHeight: "45px",
            boxShadow: "none"
        }),
        singleValue: (base) => ({
            ...base,
            color: "white",
        }),
        menu: (base) => ({
            ...base,
            backgroundColor: "#1e2027",
            zIndex: 1070,
            border: "1px solid rgba(255, 255, 255, 0.1)",
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected
                ? "var(--kit-primary)"
                : state.isFocused
                    ? "rgba(255, 255, 255, 0.1)"
                    : "transparent",
            color: "white",
            "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
            }
        }),
        placeholder: (base) => ({ ...base, color: "rgba(255, 255, 255, 0.5)" }),
        multiValue: (base) => ({
            ...base,
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "6px",
            padding: "2px 4px"
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: "white",
            fontSize: "12px",
            fontWeight: "600"
        }),
        multiValueRemove: (base) => ({
            ...base,
            color: "white",
            "&:hover": { background: "transparent", color: "#ff4d4d" }
        }),
        input: (base) => ({ ...base, color: "white" })
    };

    const modernInputStyle = {
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        color: 'white',
        borderRadius: '12px',
        padding: '12px 16px',
        fontSize: '14px',
    };

    document.title = "Lấy ý kiến dự thảo | QLVB V3.0";

    return (
        <React.Fragment>
            <div className="designkit-wrapper designkit-layout-root">
                <div className="modern-page-content">
                    <ModernHeader 
                        title="Lấy ý kiến dự thảo" 
                        subtitle="Dự thảo & Phát hành văn bản tham vấn"
                        actions={
                            <div className="d-flex gap-2">
                                <ModernButton variant="ghost" onClick={() => navigate(-1)}>
                                    <i className="ri-arrow-left-line"></i> Quay lại
                                </ModernButton>
                                {doc && (
                                    <ModernButton variant="primary" onClick={handleSubmit} disabled={loading || matching}>
                                        {loading ? <Spinner size="sm" /> : <><i className="ri-send-plane-fill"></i> Xác nhận phát hành</>}
                                    </ModernButton>
                                )}
                            </div>
                        }
                    />

                    <ToastContainer closeButton={false} />

                    <Row className="justify-content-center">
                        <Col lg={11}>
                            <ModernCard className="p-4 mb-4" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                <div className="mb-0">
                                    <h6 className="text-muted text-uppercase fw-bold mb-3 fs-12">1. Chọn văn bản lấy ý kiến</h6>
                                    <Select 
                                        options={documentOptions}
                                        value={selectedDocumentOption}
                                        onChange={(opt) => navigate(`/draft-consultation/${opt.value}`)}
                                        placeholder="Tìm kiếm dự thảo hoặc dự án Luật/Nghị định..."
                                        styles={selectStyles}
                                    />
                                    {doc && (
                                        <div className="mt-3 p-3 rounded" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="avatar-xs flex-shrink-0">
                                                    <div className="avatar-title bg-primary-10 text-primary rounded fs-16" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                                                        <i className="ri-file-text-line"></i>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h6 className="mb-0 text-white">{doc.project_name}</h6>
                                                    <small className="text-muted">Đang xử lý cấp ý kiến cho dự thảo này</small>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ModernCard>

                            {fetchingDoc ? (
                                <div className="text-center py-5">
                                    <Spinner color="primary" />
                                    <p className="mt-2 text-muted">Đang phân tích thông tin dự thảo...</p>
                                </div>
                            ) : doc ? (
                                <Form onSubmit={handleSubmit}>
                                    <ModernCard className="p-4 mb-4" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        <h6 className="text-muted text-uppercase fw-bold mb-4 fs-12">2. Thông tin phát hành</h6>
                                        <Row className="g-4">
                                            <Col lg={6}>
                                                <FormGroup className="mb-0">
                                                    <Label className="text-white-50 fw-bold small text-uppercase mb-2">Số văn bản <span className="text-danger">*</span></Label>
                                                    <Input 
                                                        style={modernInputStyle}
                                                        type="text" 
                                                        placeholder="Ví dụ: 123/BXD-VP" 
                                                        value={formData.issuance_number}
                                                        onChange={(e) => setFormData({ ...formData, issuance_number: e.target.value })}
                                                        required
                                                    />
                                                </FormGroup>
                                            </Col>
                                            <Col lg={6}>
                                                <FormGroup className="mb-0">
                                                    <Label className="text-white-50 fw-bold small text-uppercase mb-2">Ngày phát hành <span className="text-danger">*</span></Label>
                                                    <Input 
                                                        style={modernInputStyle}
                                                        type="date" 
                                                        value={formData.issuance_date}
                                                        onChange={(e) => setFormData({ ...formData, issuance_date: e.target.value })}
                                                        required
                                                    />
                                                </FormGroup>
                                            </Col>
                                            
                                            <Col lg={12}>
                                                <FormGroup className="mb-0">
                                                    <Label className="text-muted fw-bold small">ĐÍNH KÈM VĂN BẢN (PDF/SCAN)</Label>
                                                    <div className="modern-upload-zone p-4 rounded text-center" style={{ border: '2px dashed rgba(255,255,255,0.1)', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
                                                        <Input 
                                                            type="file" 
                                                            className="position-absolute opacity-0"
                                                            style={{ height: '40px', width: '100%', left: 0, cursor: 'pointer' }}
                                                            onChange={(e) => setIssuanceFile(e.target.files[0])}
                                                        />
                                                        <i className="ri-upload-cloud-2-line display-6 text-muted mb-2 d-block"></i>
                                                        <div className="text-white fw-bold">{issuanceFile ? issuanceFile.name : "Chọn tệp tin hoặc kéo thả vào đây"}</div>
                                                        <div className="text-muted small">Hỗ trợ các định dạng PDF, DOCX, Hình ảnh</div>
                                                    </div>
                                                    {doc?.issuance_file && (
                                                        <div className="mt-2 text-success small d-flex align-items-center gap-1">
                                                            <i className="ri-check-double-line"></i> Bản quét cũ đã tồn tại trên hệ thống
                                                        </div>
                                                    )}
                                                </FormGroup>
                                            </Col>
                                        </Row>
                                    </ModernCard>

                                    <ModernCard className="p-4" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        <div className="d-flex justify-content-between align-items-center mb-4">
                                            <h6 className="text-muted text-uppercase fw-bold mb-0 fs-12">3. Danh sách đơn vị tham vấn</h6>
                                            <div className="d-flex gap-2">
                                                <ModernButton 
                                                    type="button"
                                                    variant="ghost"
                                                    className="btn-sm"
                                                    onClick={() => setNewConsultedAgencies(availableNewAgencies.map(a => a.value))}
                                                    disabled={availableNewAgencies.length === 0}
                                                >
                                                    <i className="ri-check-double-line"></i> Chọn tất cả
                                                </ModernButton>
                                                <Label for="match-file" className="modern-btn ghost btn-sm mb-0">
                                                    <i className="ri-qr-scan-2-line"></i> 
                                                    Quét từ tệp tệp 
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

                                        <div className="p-3 rounded mb-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                            <div className="text-white-50 small mb-2 fw-bold text-uppercase opacity-50">Đã được lấy ý kiến trước đó:</div>
                                            <div className="d-flex flex-wrap gap-2">
                                                {alreadyConsulted.length > 0 ? alreadyConsulted.map(item => (
                                                    <ModernBadge key={item.value} color="success">
                                                        {item.label}
                                                    </ModernBadge>
                                                )) : <span className="text-muted italic fs-13 opacity-50">Chưa có đơn vị nào trong danh sách cũ.</span>}
                                            </div>
                                        </div>
                                        
                                        <FormGroup>
                                            <Label className="text-muted fw-bold small">CHỌN THÊM CÁC ĐƠN VỊ MỚI</Label>
                                            <Select
                                                isMulti
                                                options={availableNewAgencies}
                                                value={selectedNewAgencies}
                                                onChange={(selected) => setNewConsultedAgencies((selected || []).map(s => s.value))}
                                                placeholder="Tìm kiếm và chọn thêm đơn vị..."
                                                styles={selectStyles}
                                            />
                                            <div className="mt-3 p-2 rounded bg-info-10 border border-info border-dashed text-info fs-12" style={{ background: 'rgba(41, 156, 219, 0.05)' }}>
                                                <i className="ri-information-line me-1"></i> Danh sách này chỉ hiển thị các đơn vị <strong>chưa</strong> có trong đợt lấy ý kiến trước.
                                            </div>
                                        </FormGroup>
                                    </ModernCard>
                                </Form>
                            ) : (
                                <div className="text-center py-5 mt-4" style={{ background: 'rgba(255,255,255,0.02)', border: '2px dashed var(--kit-border)', borderRadius: '20px' }}>
                                    <div className="avatar-lg mx-auto mb-4">
                                        <div className="avatar-title bg-white-5 text-muted rounded-circle display-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                            <i className="ri-folder-search-line"></i>
                                        </div>
                                    </div>
                                    <h5 className="text-white">Chưa chọn văn bản</h5>
                                    <p className="text-muted mx-auto" style={{ maxWidth: '350px' }}>Vui lòng chọn một dự thảo ở ô phía trên để bắt đầu quy trình phát hành văn bản lấy ý kiến.</p>
                                </div>
                            )}
                        </Col>
                    </Row>
                </div>
            </div>
            <ToastContainer closeButton={false} />
        </React.Fragment>
    );
};

export default DraftConsultation;
