import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardBody, Container, Row, Col, Form, FormGroup, Label, Input, Button, Spinner } from 'reactstrap';
import Select from 'react-select';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast, ToastContainer } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';
import BreadCrumb from '../../Components/Common/BreadCrumb';

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
    const selectedNewAgencies = availableNewAgencies.filter(opt => newConsultedAgencies.includes(opt.value));

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

    document.title = "Lấy ý kiến dự thảo | QLVB V3.0";

    return (
        <div className="page-content">
            <Container fluid>
                <BreadCrumb title="Lấy ý kiến dự thảo" pageTitle="Dự thảo" />
                <Row className="justify-content-center">
                    <Col lg={10}>
                        <Card>
                            <CardBody className="p-4">
                                <div className="mb-4">
                                    <h5 className="mb-2">Chọn chọn văn bản lấy ý kiến</h5>
                                    <Select 
                                        options={documentOptions}
                                        value={selectedDocumentOption}
                                        onChange={(opt) => navigate(`/draft-consultation/${opt.value}`)}
                                        placeholder="Tìm kiếm dự thảo..."
                                        styles={selectStyles}
                                    />
                                    {doc && (
                                        <p className="mt-3 text-muted">
                                            <i className="ri-information-line align-middle me-1"></i>
                                            Đang xử lý dự thảo: <strong>{doc.project_name}</strong>
                                        </p>
                                    )}
                                </div>

                                {fetchingDoc ? (
                                    <div className="text-center py-5">
                                        <Spinner color="primary" />
                                        <p className="mt-2 text-muted">Đang tải thông tin dự thảo...</p>
                                    </div>
                                ) : doc ? (
                                    <Form onSubmit={handleSubmit}>
                                        <hr className="my-4" />
                                        
                                        <Row>
                                            <Col lg={6}>
                                                <FormGroup>
                                                    <Label className="form-label">Số văn bản lấy ý kiến <span className="text-danger">*</span></Label>
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
                                                    <Label className="form-label">Ngày lấy ý kiến <span className="text-danger">*</span></Label>
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
                                                    <Label className="form-label">Đính kèm văn bản lấy ý kiến (PDF/Scan)</Label>
                                                    <Input 
                                                        type="file" 
                                                        onChange={(e) => setIssuanceFile(e.target.files[0])}
                                                    />
                                                    {doc?.issuance_file && (
                                                        <small className="text-success mt-1 d-block italic">
                                                            <i className="ri-check-line"></i> Đã có tệp đính kèm. Upload mới để thay thế.
                                                        </small>
                                                    )}
                                                </FormGroup>
                                            </Col>

                                            <Col lg={12}>
                                                <hr className="my-4" />
                                                
                                                <div className="border border-dashed p-3 rounded mb-4">
                                                    <h6 className="mb-2 text-primary"><i className="ri-community-line me-1"></i> Các đơn vị đã được lấy ý kiến</h6>
                                                    <div className="d-flex flex-wrap gap-2">
                                                        {alreadyConsulted.length > 0 ? alreadyConsulted.map(item => (
                                                            <span key={item.value} className="badge rounded-pill bg-info-subtle text-info fs-12 p-2">
                                                                {item.label}
                                                            </span>
                                                        )) : <span className="text-muted italic fs-13">Chưa có đơn vị nào được mời.</span>}
                                                    </div>
                                                </div>

                                                <div className="d-flex justify-content-between align-items-center mb-3">
                                                    <h5 className="mb-0">Phát hành thêm các đơn vị chưa được lấy ý kiến</h5>
                                                    <div className="text-end d-flex gap-2">
                                                        <Button 
                                                            type="button"
                                                            color="soft-primary" 
                                                            size="sm" 
                                                            onClick={() => setNewConsultedAgencies(availableNewAgencies.map(a => a.value))}
                                                            disabled={availableNewAgencies.length === 0}
                                                        >
                                                            <i className="ri-check-double-line align-bottom me-1"></i> Chọn tất cả đơn vị còn lại
                                                        </Button>
                                                        <Label for="match-file" className="btn btn-soft-info btn-sm mb-0 cursor-pointer">
                                                            <i className="ri-search-eye-line align-bottom me-1"></i> 
                                                            Quét thêm từ tệp 
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
                                                        options={availableNewAgencies}
                                                        value={selectedNewAgencies}
                                                        onChange={(selected) => setNewConsultedAgencies((selected || []).map(s => s.value))}
                                                        placeholder="Chọn thêm các đơn vị mới..."
                                                        styles={selectStyles}
                                                    />
                                                    <small className="text-muted mt-2 d-block">
                                                        * Hệ thống chỉ hiển thị các đơn vị <b>chưa</b> được lấy ý kiến cho dự thảo này.
                                                    </small>
                                                </FormGroup>
                                            </Col>
                                        </Row>
                                        
                                        <div className="mt-4 pt-2 text-end">
                                            <Button color="light" className="me-2" onClick={() => navigate(-1)}>Quay lại</Button>
                                            <Button color="primary" type="submit" disabled={loading || matching}>
                                                {loading ? <Spinner size="sm" /> : "Xác nhận phát hành thêm"}
                                            </Button>
                                        </div>
                                    </Form>
                                ) : (
                                    <div className="text-center py-5 border rounded border-dashed">
                                        <i className="ri-file-search-line display-4 text-muted mb-2"></i>
                                        <p className="text-muted">Vui lòng chọn một dự thảo phía trên để thực hiện cấp ý kiến.</p>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            </Container>
            <ToastContainer />
        </div>
    );
};

export default DraftConsultation;
