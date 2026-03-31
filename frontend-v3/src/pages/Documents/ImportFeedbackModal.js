import React, { useState, useEffect } from 'react';
import {
    Modal, ModalHeader, ModalBody, ModalFooter,
    Button, Table, Input, Badge, Spinner, Alert,
    UncontrolledTooltip
} from 'reactstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

const ImportFeedbackModal = ({ show, onHide, documentId, onImportSuccess }) => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [importing, setImporting] = useState(false);
    const [agencies, setAgencies] = useState([]);
    const [nodes, setNodes] = useState([]);

    useEffect(() => {
        if (show) {
            fetchAgencies();
            fetchNodes();
        } else {
            setFile(null);
            setPreviewData(null);
        }
    }, [show]);

    const fetchAgencies = async () => {
        try {
            const res = await axios.get('/api/settings/agencies/');
            setAgencies(res.data);
        } catch (e) { toast.error("Không thể tải danh mục cơ quan"); }
    };

    const fetchNodes = async () => {
        try {
            // Sử dụng API lấy danh sách node có phân cấp label
            const res = await axios.get('/api/feedbacks/get_document_nodes/', { params: { document_id: documentId } });
            setNodes(res.data);
        } catch (e) { toast.error("Không thể tải danh mục Điều/Khoản"); }
    };

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) setFile(e.target.files[0]);
    };

    const handleAnalyze = async () => {
        if (!file) {
            toast.warning("Vui lòng chọn tệp tin");
            return;
        }
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_id', documentId);

        try {
            const res = await axios.post('/api/feedbacks/analyze_import/', formData);
            setPreviewData(res.data.rows);
        } catch (e) {
            toast.error(e.response?.data?.error || "Lỗi phân biệt file. Hãy đảm bảo file đúng định dạng.");
        } finally { setLoading(false); }
    };

    const handleModeChange = (key, mode) => {
        setPreviewData(prev => prev.map(row => row.key === key ? { ...row, import_mode: mode } : row));
    };

    const handleAgencyChange = (key, agencyId) => {
        const agency = agencies.find(a => a.id === parseInt(agencyId));
        setPreviewData(prev => prev.map(row => row.key === key ? { 
            ...row, 
            agency_id: agency ? agency.id : null, 
            agency_name: agency ? agency.name : row.original_agency 
        } : row));
    };

    const handleNodeChange = (key, nodeId) => {
        setPreviewData(prev => prev.map(row => row.key === key ? { ...row, node_id: nodeId ? parseInt(nodeId) : null } : row));
    };

    const handleConfirmImport = async () => {
        const dataToImport = previewData.filter(r => r.import_mode !== 'skip');
        if (dataToImport.length === 0) {
            toast.warning("Không có dòng nào được chọn để nhập.");
            return;
        }

        setImporting(true);
        try {
            const res = await axios.post('/api/feedbacks/confirm_import/', {
                document_id: documentId,
                rows: previewData
            });
            toast.success(res.data.message);
            if (onImportSuccess) onImportSuccess();
            onHide();
        } catch (e) {
            toast.error(e.response?.data?.error || "Lỗi khi lưu dữ liệu import");
        } finally { setImporting(false); }
    };

    return (
        <Modal isOpen={show} toggle={onHide} size="xl" className="modal-dialog-centered" scrollable>
            <ModalHeader toggle={onHide} className="bg-light">
                <div className="d-flex align-items-center">
                    <i className="ri-file-excel-2-line fs-20 text-success me-2"></i>
                    <h5 className="modal-title mb-0">Nhập góp ý từ Bảng tính (Excel/CSV)</h5>
                </div>
            </ModalHeader>
            <ModalBody className="p-4">
                {!previewData ? (
                    <div className="text-center py-5 border-2 border-dashed rounded-3 bg-light-subtle">
                        <i className="ri-upload-cloud-2-line display-4 text-primary opacity-50"></i>
                        <h5 className="mt-3 fw-bold">Tải lên tệp danh sách góp ý</h5>
                        <p className="text-muted mb-4 mx-auto" style={{ maxWidth: '400px' }}>
                            Hỗ trợ tệp .xlsx, .xls, .csv. Hệ thống sẽ tự động ghép cột Nội dung, Lý do và Ghi chú, đồng thời kiểm tra trùng lặp.
                        </p>
                        <div className="d-flex justify-content-center">
                            <div className="position-relative" style={{ width: '400px' }}>
                                <Input 
                                    type="file" 
                                    className="form-control form-control-lg pe-5" 
                                    onChange={handleFileChange} 
                                    accept=".xlsx,.xls,.csv" 
                                />
                                <i className="ri-attachment-line position-absolute top-50 end-0 translate-middle-y me-3 fs-18 text-muted"></i>
                            </div>
                        </div>
                        <Button 
                            color="primary" 
                            className="mt-4 px-5 py-2 fw-bold" 
                            onClick={handleAnalyze} 
                            disabled={!file || loading}
                        >
                            {loading ? (
                                <><Spinner size="sm" className="me-2" /> Đang phân tích...</>
                            ) : "Bắt đầu phân tích dữ liệu"}
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <Alert color="info" className="p-2 fs-12 mb-0 flex-grow-1 border-0 shadow-sm border-start border-3 border-info">
                                <i className="ri-information-line me-2 fs-14 align-middle"></i>
                                <strong>Phân tích hoàn tất:</strong> Tìm thấy {previewData.length} dòng. Vui lòng rà soát cột "Trạng thái" và "Hành động" (đặc biệt các dòng trùng lặp).
                            </Alert>
                            <Button color="soft-danger" size="sm" className="ms-3" onClick={() => setPreviewData(null)}>
                                <i className="ri-refresh-line me-1"></i> Làm lại
                            </Button>
                        </div>

                        <div className="table-responsive border rounded shadow-sm">
                            <Table className="align-middle table-nowrap table-hover mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: '180px' }}>Điều/Khoản/Phụ lục</th>
                                        <th style={{ width: '220px' }}>Cơ quan</th>
                                        <th>Nội dung góp ý (Đã định dạng)</th>
                                        <th className="text-center" style={{ width: '100px' }}>Trạng thái</th>
                                        <th style={{ width: '150px' }}>Xử lý trùng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.map((row, idx) => (
                                        <tr key={row.key} className={row.is_duplicate ? 'bg-warning-subtle' : ''}>
                                            <td className="white-space-normal" style={{ verticalAlign: 'top' }}>
                                                <select 
                                                    className="form-select form-select-sm border-dashed" 
                                                    value={row.node_id || ''} 
                                                    onChange={(e) => handleNodeChange(row.key, e.target.value)}
                                                >
                                                    <option value="">-- Chọn Điều/Khoản --</option>
                                                    {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                                                </select>
                                                <div className="fs-10 text-muted mt-1 fst-italic">
                                                    Gốc: <span className="text-dark">{row.original_node || 'Chung'}</span>
                                                </div>
                                            </td>
                                            <td className="white-space-normal" style={{ verticalAlign: 'top' }}>
                                                <select 
                                                    className={`form-select form-select-sm ${!row.agency_id ? 'border-danger' : 'border-dashed'}`}
                                                    value={row.agency_id || ''} 
                                                    onChange={(e) => handleAgencyChange(row.key, e.target.value)}
                                                >
                                                    <option value="">-- Chọn Cơ quan --</option>
                                                    {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                </select>
                                                <div className="fs-10 text-muted mt-1 fst-italic">
                                                    Gốc: <span className="text-dark">{row.original_agency}</span>
                                                </div>
                                                {row.agency_suggestions?.length > 0 && !row.agency_id && (
                                                    <div className="mt-1">
                                                        <span className="fs-10 text-primary fw-bold me-1">Gợi ý:</span>
                                                        {row.agency_suggestions.map(s => (
                                                            <Badge 
                                                                key={s.id} 
                                                                color="soft-primary" 
                                                                className="me-1 cursor-pointer fs-9"
                                                                onClick={() => handleAgencyChange(row.key, s.id)}
                                                            >
                                                                {s.name}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="text-wrap fs-12 scrollbar-hide" style={{ maxHeight: '80px', overflowY: 'auto' }}>
                                                    {row.content}
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                {row.is_duplicate ? (
                                                    <Badge color="warning" className="badge-outline-warning" id={`dup-tool-${idx}`}>TRÙNG LẶP</Badge>
                                                ) : (
                                                    <Badge color="success" className="badge-outline-success">MỚI</Badge>
                                                )}
                                                {row.is_duplicate && (
                                                    <UncontrolledTooltip target={`dup-tool-${idx}`}>
                                                        Hệ thống phát hiện nội dung này đã tồn tại trong dự thảo.
                                                    </UncontrolledTooltip>
                                                )}
                                            </td>
                                            <td>
                                                {row.is_duplicate ? (
                                                    <select 
                                                        className="form-select form-select-sm bg-warning-subtle border-warning fw-medium"
                                                        value={row.import_mode} 
                                                        onChange={(e) => handleModeChange(row.key, e.target.value)}
                                                    >
                                                        <option value="skip">Bỏ qua</option>
                                                        <option value="overwrite">Ghi đè</option>
                                                        <option value="add_new">Nhập mới</option>
                                                    </select>
                                                ) : (
                                                    <div className="text-center">
                                                        <i className="ri-checkbox-circle-line fs-18 text-success"></i>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </>
                )}
            </ModalBody>
            <ModalFooter className="bg-light">
                <Button color="link" className="link-danger fw-medium" onClick={onHide}>Hủy bỏ</Button>
                {previewData && (
                    <Button color="success" className="px-4 fw-bold" onClick={handleConfirmImport} disabled={importing}>
                        {importing ? (
                            <><Spinner size="sm" className="me-2" /> Đang lưu...</>
                        ) : (
                            <><i className="ri-check-line me-1"></i> Xác nhận Import ({previewData.filter(r => r.import_mode !== 'skip').length} dòng)</>
                        )}
                    </Button>
                )}
            </ModalFooter>
        </Modal>
    );
};

export default ImportFeedbackModal;
