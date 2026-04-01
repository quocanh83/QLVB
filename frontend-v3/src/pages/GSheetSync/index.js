import React, { useState, useEffect } from 'react';
import {
    Container, Row, Col, Card, CardBody, CardHeader,
    Button, Input, Table, Spinner, FormGroup, Label,
    Badge, Alert, InputGroup
} from 'reactstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import Select from 'react-select';
import { getAuthHeader } from '../../helpers/api_helper';
import classnames from 'classnames';

const GSheetSync = () => {
    const [documents, setDocuments] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState(null);
    const [gsUrl, setGsUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [comparing, setComparing] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [results, setResults] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [showSynced, setShowSynced] = useState(false);

    // Select styles consistent with the app
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
            boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
            zIndex: 9999
        }),
        option: (base, state) => ({
            ...base,
            background: state.isSelected 
                ? "var(--vz-primary)" 
                : state.isFocused 
                    ? "var(--vz-primary-light, #eef1f6)" 
                    : "var(--vz-choices-bg, #ffffff)",
            color: state.isSelected 
                ? "#fff" 
                : state.isFocused 
                    ? "var(--vz-primary, #405189)" 
                    : "var(--vz-body-color)",
            padding: "10px 15px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
        }),
        singleValue: (base) => ({
            ...base,
            color: "var(--vz-body-color)",
            fontSize: "14px",
            fontWeight: "500",
        })
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    useEffect(() => {
        if (selectedDocId) {
            const doc = documents.find(d => d.id === selectedDocId);
            if (doc && doc.google_sheets_url) {
                setGsUrl(doc.google_sheets_url);
            } else {
                setGsUrl("");
            }
            setResults(null);
            setSelectedIds([]);
        }
    }, [selectedDocId, documents]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/documents/', getAuthHeader());
            setDocuments(Array.isArray(res.results || res) ? (res.results || res) : []);
        } catch (e) {
            toast.error("Không thể tải danh sách dự thảo.");
        } finally {
            setLoading(false);
        }
    };

    const handleCompare = async () => {
        if (!selectedDocId || !gsUrl.trim()) {
            toast.warning("Vui lòng chọn Dự thảo và nhập Google Sheet URL.");
            return;
        }

        setComparing(true);
        try {
            const res = await axios.post('/api/feedbacks/gsheet_compare/', {
                document_id: selectedDocId,
                gs_url: gsUrl
            }, getAuthHeader());
            setResults(res.feedbacks);
            // Mặc định chọn các dòng Chưa có trong GS (new_in_db)
            const newIds = res.feedbacks.filter(f => !f.is_in_gs).map(f => f.id);
            setSelectedIds(newIds);
            toast.success("Đã hoàn tất đối chiếu dữ liệu.");
        } catch (e) {
            toast.error(e.response?.data?.error || "Lỗi khi đối chiếu Google Sheet.");
        } finally {
            setComparing(true); // Wait, should be false
            setComparing(false);
        }
    };

    const handlePush = async () => {
        if (selectedIds.length === 0) {
            toast.warning("Vui lòng chọn ít nhất một dòng để đẩy lên.");
            return;
        }

        setPushing(true);
        try {
            const pushItems = selectedIds.map(id => {
                const item = results.find(r => r.id === id);
                return { id: item.id, gs_row: item.gs_row };
            });

            const res = await axios.post('/api/feedbacks/gsheet_push/', {
                document_id: selectedDocId,
                gs_url: gsUrl,
                push_items: pushItems
            }, getAuthHeader());
            toast.success(res.data?.message || "Đã đẩy dữ liệu thành công.");
            
            // Refresh comparison
            handleCompare();
        } catch (e) {
            toast.error(e.response?.data?.error || "Lỗi khi đẩy dữ liệu lên Google Sheet.");
        } finally {
            setPushing(false);
        }
    };

    const toggleSelectAll = () => {
        const visibleRows = results.filter(r => showSynced || r.status !== 'synced');
        const visibleNewAndDiff = visibleRows.filter(r => r.status !== 'synced');
        
        if (selectedIds.length === visibleNewAndDiff.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(visibleNewAndDiff.map(r => r.id));
        }
    };

    const toggleSelectRow = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    return (
        <div className="page-content">
            <Container fluid>
                <BreadCrumb title="Đồng bộ Google Sheet" pageTitle="Góp ý" />

                <Row>
                    <Col lg={12}>
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="bg-light-subtle py-3">
                                <h6 className="card-title mb-0 fw-bold">
                                    <i className="ri-google-fill align-bottom me-1 text-primary"></i>
                                    Cấu hình đồng bộ
                                </h6>
                            </CardHeader>
                            <CardBody className="p-4">
                                <Row className="g-4">
                                    <Col md={5}>
                                        <FormGroup className="mb-0">
                                            <Label className="fw-bold fs-12 text-muted text-uppercase mb-2">Dự thảo văn bản</Label>
                                            <Select
                                                value={documents.find(d => d.id === selectedDocId) ? { value: selectedDocId, label: documents.find(d => d.id === selectedDocId).project_name } : null}
                                                onChange={(opt) => setSelectedDocId(opt ? opt.value : null)}
                                                options={documents.map(d => ({ value: d.id, label: d.project_name }))}
                                                placeholder="Chọn dự thảo..."
                                                isLoading={loading}
                                                styles={selectStyles}
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col md={5}>
                                        <FormGroup className="mb-0">
                                            <Label className="fw-bold fs-12 text-muted text-uppercase mb-2">Link Google Sheet (Edit mode)</Label>
                                            <InputGroup>
                                                <Input 
                                                    type="url" 
                                                    className="form-control border-dashed" 
                                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                                    value={gsUrl}
                                                    onChange={(e) => setGsUrl(e.target.value)}
                                                />
                                            </InputGroup>
                                            <div className="fs-11 text-muted mt-1 italic">
                                                Lưu ý: Sheet phải được chia sẻ quyền chỉnh sửa cho email service account của hệ thống.
                                            </div>
                                        </FormGroup>
                                    </Col>
                                    <Col md={2} className="d-flex align-items-end">
                                        <Button color="primary" className="w-100 fw-bold" onClick={handleCompare} disabled={comparing || !selectedDocId}>
                                            {comparing ? <><Spinner size="sm" className="me-1" /> Đang quét...</> : "So sánh ngay"}
                                        </Button>
                                    </Col>
                                </Row>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>

                {results && (
                    <Row className="mt-3">
                        <Col lg={12}>
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="bg-light-subtle py-3 d-flex align-items-center justify-content-between">
                                    <div>
                                        <h6 className="card-title mb-0 fw-bold">Kết quả đối chiếu</h6>
                                        <p className="text-muted mb-0 fs-12">Tìm thấy {results.length} góp ý trong hệ thống.</p>
                                    </div>
                                    <div className="d-flex gap-2">
                                        <Button color="success" size="sm" onClick={handlePush} disabled={pushing || selectedIds.length === 0}>
                                            {pushing ? <Spinner size="sm" /> : <><i className="ri-upload-cloud-line me-1"></i> Đẩy {selectedIds.length} dòng lên GG Sheet</>}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardBody>
                                    <Alert color="info" className="fs-12 border-0 shadow-none border-start border-3 border-info mb-4">
                                        <i className="ri-information-line me-2 fs-14 align-middle"></i>
                                        <strong>Nguyên tắc:</strong> Hệ thống tìm kiếm các dòng trong Google Sheet khớp về <b>Nội dung góp ý</b> và <b>Đơn vị góp ý</b>. 
                                        Những dòng màu xanh là đã tồn tại trên Sheet, dòng màu trắng (chưa đồng bộ) sẽ được chọn mặc định để đẩy lên.
                                    </Alert>

                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div className="text-muted fs-13">
                                            Hiển thị <b>{results.filter(r => showSynced || r.status !== 'synced').length}</b> / {results.length} dòng bản ghi.
                                        </div>
                                        <div className="form-check form-switch form-switch-right form-switch-md">
                                            <Input 
                                                className="form-check-input code-switcher" 
                                                type="checkbox" 
                                                id="show-synced-switch" 
                                                checked={showSynced} 
                                                onChange={(e) => setShowSynced(e.target.checked)} 
                                            />
                                            <Label className="form-check-label text-muted fs-12" htmlFor="show-synced-switch">Hiện các dòng đã khớp nội dung</Label>
                                        </div>
                                    </div>

                                    <div className="table-responsive table-card">
                                        <Table className="align-middle table-hover table-bordered mb-0" style={{ tableLayout: 'fixed', minWidth: '1000px' }}>
                                            <thead className="table-light text-muted text-center align-middle">
                                            <tr>
                                                <th scope="col" style={{ width: "3%", minWidth: "40px" }}>
                                                    <div className="form-check d-flex justify-content-center">
                                                        <Input 
                                                            type="checkbox" 
                                                            className="form-check-input"
                                                            checked={results.filter(r => showSynced || r.status !== 'synced').filter(r => r.status !== 'synced').length > 0 && selectedIds.length === results.filter(r => showSynced || r.status !== 'synced').filter(r => r.status !== 'synced').length}
                                                            onChange={toggleSelectAll}
                                                        />
                                                    </div>
                                                </th>
                                                <th style={{ width: "12%", minWidth: "100px" }}>Vị trí</th>
                                                <th style={{ width: "15%", minWidth: "120px" }}>Đơn vị</th>
                                                <th style={{ width: "32%", minWidth: "250px" }}>Nội dung góp ý</th>
                                                <th style={{ width: "23%", minWidth: "250px" }}>Giải trình</th>
                                                <th style={{ width: "15%", minWidth: "140px" }}>Trạng thái Sheet</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {results.filter(item => showSynced || item.status !== 'synced').map((item) => {
                                                const isMissingExpOnGs = item.is_in_gs && !item.gs_explanation && item.explanation;
                                                const hasExpDiff = item.is_exp_diff;

                                                return (
                                                    <tr key={item.id} className={classnames(item.is_in_gs ? "bg-success-subtle" : "", hasExpDiff ? "bg-danger-subtle opacity-100" : "")}>
                                                        <td className="text-center align-middle">
                                                            <div className="form-check d-flex justify-content-center">
                                                                <Input 
                                                                    type="checkbox" 
                                                                    className="form-check-input"
                                                                    disabled={item.is_in_gs && !hasExpDiff && !isMissingExpOnGs}
                                                                    checked={selectedIds.includes(item.id)}
                                                                    onChange={() => toggleSelectRow(item.id)}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="white-space-normal">
                                                            <span className="fw-bold text-primary fs-12">{item.node_label}</span>
                                                        </td>
                                                        <td className="white-space-normal">
                                                            <span className="fs-12 fw-medium text-dark">{item.agency}</span>
                                                        </td>
                                                        <td>
                                                            <div className={classnames("p-2 border rounded fs-12 mb-1", item.is_content_diff ? "bg-white border-danger shadow-sm" : "bg-light-subtle")}>
                                                                <div className="fw-medium text-dark">DB: {item.content}</div>
                                                                {item.is_content_diff && (
                                                                    <div className="mt-2 pt-2 border-top border-danger-subtle text-danger">
                                                                        <i className="ri-error-warning-fill me-1"></i>
                                                                        <strong>Sheet:</strong> {item.gs_content}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className={classnames("p-2 border rounded fs-12", hasExpDiff ? "bg-white border-danger shadow-sm" : isMissingExpOnGs ? "bg-warning-subtle border-warning shadow-sm" : "bg-light-subtle")}>
                                                                <div className="fw-medium text-dark italic">DB: {item.explanation || <em className="text-muted">Trống</em>}</div>
                                                                {hasExpDiff && (
                                                                    <div className="mt-2 pt-2 border-top border-danger-subtle text-danger">
                                                                        <i className="ri-error-warning-fill me-1"></i>
                                                                        <strong>Sheet:</strong> {item.gs_explanation || <em className="text-muted">Trống</em>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="text-center">
                                                            {item.is_in_gs ? (
                                                                <div className="d-flex flex-column align-items-center gap-1">
                                                                    <Badge color={hasExpDiff ? "danger" : "success"} className={hasExpDiff ? "" : "badge-outline-success"}>
                                                                        <i className={hasExpDiff ? "ri-error-warning-line me-1" : "ri-check-line me-1"}></i> 
                                                                        {hasExpDiff ? "Lệch dữ liệu" : `Khớp (Dòng ${item.gs_row})`}
                                                                    </Badge>
                                                                    {hasExpDiff && <span className="fs-10 text-danger fw-bold animate-pulse text-uppercase">Cần cập nhật</span>}
                                                                </div>
                                                            ) : (
                                                                <Badge color="warning" className="badge-outline-warning">
                                                                    Mới hoàn toàn
                                                                </Badge>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {results.length === 0 && (
                                                <tr>
                                                    <td colSpan="6" className="text-center py-5 text-muted italic">
                                                        Dự thảo này chưa có nội dung góp ý nào trong hệ thống.
                                                    </td>
                                                </tr>
                                            )}
                                            </tbody>
                                        </Table>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                )}
            </Container>
        </div>
    );
};

export default GSheetSync;
