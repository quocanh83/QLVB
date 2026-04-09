import React, { useState, useEffect } from 'react';
import { 
    Modal, ModalHeader, ModalBody, ModalFooter, 
    Button, Table, Badge, Spinner, Alert
} from 'reactstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

const ExplanationSyncModal = ({ isOpen, toggle, versionId, onSyncSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [syncing, setSyncing] = useState(false);
    const [gsheetUrl, setGsheetUrl] = useState("");
    const [isConfiguring, setIsConfiguring] = useState(false);

    const getAuthHeader = () => {
        const token = localStorage.getItem("access_token");
        return { headers: { Authorization: `Bearer ${token}` } };
    };

    const fetchCurrentConfig = async () => {
        try {
            const res = await axios.get(`/api/comparisons/versions/${versionId}/workspace_data/`, getAuthHeader());
            if (res.explanation_sheet_url) {
                setGsheetUrl(res.explanation_sheet_url);
                fetchData(res.explanation_sheet_url);
            } else {
                setIsConfiguring(true);
            }
        } catch (err) {
            console.error("Lỗi lấy cấu hình", err);
        }
    };

    const fetchData = async (url) => {
        const targetUrl = url || gsheetUrl;
        if (!targetUrl) return;
        
        setLoading(true);
        try {
            const res = await axios.get(`/api/comparisons/versions/${versionId}/gsheet_compare_explanation/`, getAuthHeader());
            setData(res.data);
            setSelectedIds([]); 
            setIsConfiguring(false);
        } catch (err) {
            toast.error("Lỗi khi tải dữ liệu so sánh GSheet. Vui lòng kiểm tra lại link hoặc quyền truy cập.");
            setIsConfiguring(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchCurrentConfig();
        }
    }, [isOpen]);

    const handleSaveUrl = async () => {
        if (!gsheetUrl) return toast.warning("Vui lòng nhập link Google Sheet");
        setSyncing(true);
        try {
            await axios.post(`/api/comparisons/versions/${versionId}/save_gsheet_url/`, { sheet_url: gsheetUrl }, getAuthHeader());
            toast.success("Đã lưu cấu hình!");
            fetchData(gsheetUrl);
        } catch (err) {
            toast.error("Lỗi khi lưu link");
        } finally {
            setSyncing(false);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(data.map(item => item.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleToggleSelect = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handlePull = async () => {
        if (selectedIds.length === 0) return toast.warning("Vui lòng chọn ít nhất một mục");
        
        setSyncing(true);
        try {
            const selectedItems = data
                .filter(item => selectedIds.includes(item.id))
                .map(item => ({ id: item.id, content: item.gsheet_content }));

            await axios.post(`/api/comparisons/versions/${versionId}/gsheet_sync_selected_explanation/`, { items: selectedItems }, getAuthHeader());
            toast.success("Đã nạp thành công từ GSheet về DB!");
            onSyncSuccess();
            fetchData();
        } catch (err) {
            toast.error("Lỗi khi nạp dữ liệu về DB");
        } finally {
            setSyncing(false);
        }
    };

    const handlePush = async () => {
        if (selectedIds.length === 0) return toast.warning("Vui lòng chọn ít nhất một mục");
        
        setSyncing(true);
        try {
            await axios.post(`/api/comparisons/versions/${versionId}/gsheet_push_selected_explanation/`, { node_ids: selectedIds }, getAuthHeader());
            toast.success("Đã đẩy thành công từ DB lên GSheet!");
            fetchData(); 
        } catch (err) {
            toast.error("Lỗi khi đẩy dữ liệu lên GSheet. Hãy đảm bảo link đã cấp quyền ghi.");
        } finally {
            setSyncing(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'match': return <Badge color="success">Khớp</Badge>;
            case 'mismatch': return <Badge color="warning">Khác biệt</Badge>;
            case 'missing_db': return <Badge color="danger">Thiếu ở HT</Badge>;
            case 'missing_gsheet': return <Badge color="info">Thiếu ở GSheet</Badge>;
            default: return null;
        }
    };

    return (
        <Modal isOpen={isOpen} toggle={toggle} size="xl" centered scrollable>
            <ModalHeader toggle={toggle} className="bg-light">
                <i className="ri-google-line me-2 text-warning"></i> 
                Đồng bộ Thuyết minh Hai chiều (Hệ thống {"<=>"} GSheet)
            </ModalHeader>
            <ModalBody className="p-0">
                <div className="p-3 border-bottom bg-light-subtle">
                    <div className="d-flex gap-2 align-items-end">
                        <div className="flex-grow-1">
                            <label className="form-label small fw-bold text-uppercase">Link Google Sheet Thuyết minh (Cột A: Điều, Cột C: Thuyết minh)</label>
                            <input 
                                type="url" 
                                className="form-control" 
                                placeholder="Dán link Google Sheet tại đây..." 
                                value={gsheetUrl}
                                onChange={(e) => setGsheetUrl(e.target.value)}
                            />
                        </div>
                        <Button color="primary" onClick={handleSaveUrl} disabled={syncing}>
                            {syncing ? <Spinner size="sm" /> : <i className="ri-save-line me-1"></i>} Lưu & Quét
                        </Button>
                        <Button color="soft-info" onClick={() => fetchData()} disabled={syncing || !gsheetUrl}>
                            <i className="ri-refresh-line"></i> Quét lại
                        </Button>
                    </div>
                </div>

                {isConfiguring ? (
                    <div className="p-5 text-center">
                        <i className="ri-settings-4-line ri-3x text-muted mb-3 d-block"></i>
                        <h5>Chưa có cấu hình hoặc cần kiểm tra lại link</h5>
                        <p className="text-muted">Vui lòng nhập link GSheet ở trên và nhấn "Lưu & Quét" để bắt đầu đồng bộ hai chiều.</p>
                    </div>
                ) : loading ? (
                    <div className="text-center py-5">
                        <Spinner color="primary" />
                        <p className="mt-2 text-muted">Đang phân tích và đối soát dữ liệu...</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <Table className="align-middle table-hover mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th style={{ width: "40px" }}>
                                        <div className="form-check">
                                            <input 
                                                className="form-check-input" 
                                                type="checkbox" 
                                                onChange={handleSelectAll}
                                                checked={selectedIds.length === data.length && data.length > 0}
                                            />
                                        </div>
                                    </th>
                                    <th>Điều / Nhãn</th>
                                    <th>Nội dung trong Hệ thống</th>
                                    <th>Nội dung trên GSheet</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item) => (
                                    <tr key={item.id} className={item.status !== 'match' ? 'bg-light-subtle' : ''}>
                                        <td>
                                            <div className="form-check">
                                                <input 
                                                    className="form-check-input" 
                                                    type="checkbox" 
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={() => handleToggleSelect(item.id)}
                                                />
                                            </div>
                                        </td>
                                        <td className="fw-medium">{item.label}</td>
                                        <td style={{ maxWidth: "350px", minWidth: "200px", whiteSpace: "normal" }}>
                                            <div className="text-muted small" style={{ maxHeight: "60px", overflow: "hidden" }}>
                                                {item.db_content || <em className="text-muted opacity-50">(Trống)</em>}
                                            </div>
                                        </td>
                                        <td style={{ maxWidth: "350px", minWidth: "200px", whiteSpace: "normal" }}>
                                            <div className="text-muted small" style={{ maxHeight: "60px", overflow: "hidden" }}>
                                                {item.gsheet_content || <em className="text-muted opacity-50">(Trống)</em>}
                                            </div>
                                        </td>
                                        <td>{getStatusBadge(item.status)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}
            </ModalBody>
            <ModalFooter className="bg-light d-flex justify-content-between align-items-center">
                <div className="text-muted small">
                    Đã chọn: <strong className="text-primary">{selectedIds.length}</strong> mục
                </div>
                <div className="d-flex gap-2">
                    <Button color="light" onClick={toggle} disabled={syncing}>Đóng</Button>
                    <div className="vr mx-2"></div>
                    <Button color="info" onClick={handlePull} disabled={syncing || selectedIds.length === 0}>
                        <i className="ri-download-2-fill me-1"></i> <span className="fw-bold">NẠP VỀ HỆ THỐNG</span>
                    </Button>
                    <Button color="warning" onClick={handlePush} disabled={syncing || selectedIds.length === 0}>
                        <i className="ri-upload-2-fill me-1"></i> <span className="fw-bold">ĐẨY LÊN GSHEET</span>
                    </Button>
                </div>
            </ModalFooter>
        </Modal>
    );
};


export default ExplanationSyncModal;
