import React, { useState, useEffect } from 'react';
import { 
    Modal, ModalHeader, ModalBody, ModalFooter, 
    Button, Table, Badge, Spinner, Alert, FormText
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
            const res = await axios.get(`/api/comparisons/versions/${versionId}/gsheet_compare_explanation/?url=${encodeURIComponent(targetUrl)}`, getAuthHeader());
            // res ở đây đã được unwrap bởi axios interceptor
            const responseData = Array.isArray(res) ? res : (res.data || []);
            setData(responseData);
            setSelectedIds([]); 
            setIsConfiguring(false);
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message;
            toast.error("Lỗi GSheet: " + errorMsg);
            setIsConfiguring(true);
            setData([]);
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
            toast.error("Lỗi khi nạp dữ liệu về DB: " + (err.response?.data?.error || err.message));
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
            toast.error("Lỗi khi đẩy dữ liệu lên GSheet: " + (err.response?.data?.error || err.message));
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

    const renderCellWithDiff = (dbVal = "", gsVal = "") => {
        const dbText = dbVal.trim();
        const gsText = gsVal.trim();
        const isDifferent = dbText !== gsText;
        
        if (!isDifferent) {
            return (
                <div className="text-muted small" style={{ maxHeight: "60px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {dbText || <em className="text-muted opacity-50">(Trống)</em>}
                </div>
            );
        }
        
        return (
            <div className="small bg-warning-subtle p-2 rounded border border-warning" style={{ maxHeight: "150px", overflowY: "auto" }}>
                <div className="mb-2 pb-2 border-bottom border-warning-subtle">
                    <Badge color="primary" className="me-1">Hệ thống</Badge> 
                    <span className="text-dark d-block mt-1">{dbText || <em className="text-muted opacity-50">(Trống)</em>}</span>
                </div>
                <div>
                    <Badge color="success" className="me-1">GSheet</Badge> 
                    <span className="text-dark d-block mt-1">{gsText || <em className="text-muted opacity-50">(Trống)</em>}</span>
                </div>
            </div>
        );
    };


    return (
        <Modal isOpen={isOpen} toggle={toggle} size="xl" centered scrollable>
            <ModalHeader toggle={toggle} className="bg-light">
                <i className="ri-google-line me-2 text-warning"></i> 
                Đồng bộ 4 cột [A: Gốc - B: Dự thảo - C: Thuyết minh - D: ID/STT]
            </ModalHeader>
            <ModalBody className="p-0">
                <div className="p-3 border-bottom bg-light-subtle">
                    <div className="d-flex gap-2 align-items-end">
                        <div className="flex-grow-1">
                            <label className="form-label small fw-bold text-uppercase mb-1">
                                Link Google Sheet [A: GỐC, B: DỰ THẢO, C: THUYẾT MINH, D: ID]
                            </label>
                            <input 
                                type="url" 
                                className="form-control mb-1" 
                                placeholder="Dán link Google Sheet tại đây..." 
                                value={gsheetUrl}
                                onChange={(e) => setGsheetUrl(e.target.value)}
                            />
                            <FormText color="muted">
                                * Yêu cầu: Bạn phải cấp quyền <strong>Editor (Người chỉnh sửa)</strong> cho email: <strong className="text-danger user-select-all">feedback-bot@backuphass.iam.gserviceaccount.com</strong>
                            </FormText>
                        </div>
                        <Button color="primary" onClick={handleSaveUrl} disabled={syncing}>
                            {syncing ? <Spinner size="sm" /> : <i className="ri-save-line me-1"></i>} Lưu & Quét
                        </Button>
                        <Button color="soft-info" onClick={() => fetchData()} disabled={syncing || !gsheetUrl}>
                            <i className="ri-refresh-line"></i> Quét lại
                        </Button>
                        {gsheetUrl && (
                            <a href={gsheetUrl} target="_blank" rel="noreferrer" className="btn btn-soft-success" title="Mở trang GSheet">
                                <i className="ri-external-link-line"></i> Mở
                            </a>
                        )}
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
                                                checked={data?.length > 0 && selectedIds.length === data.length}
                                            />
                                        </div>
                                    </th>
                                    <th style={{ minWidth: "120px" }}>Điều / Nhãn</th>
                                    <th style={{ width: "25%", minWidth: "250px" }}>Nội dung Gốc</th>
                                    <th style={{ width: "25%", minWidth: "250px" }}>Nội dung Dự thảo</th>
                                    <th style={{ width: "25%", minWidth: "250px" }}>Thuyết minh</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data && data.map && data.map((item) => (
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
                                        <td>
                                            <div className="fw-medium">{item.label}</div>
                                            {item.row_id && <small className="text-info">{item.row_id}</small>}
                                        </td>
                                        <td style={{ whiteSpace: "normal", verticalAlign: "top" }}>
                                            {renderCellWithDiff(item.db_data?.base, item.gs_data?.base)}
                                        </td>
                                        <td style={{ whiteSpace: "normal", verticalAlign: "top" }}>
                                            {renderCellWithDiff(item.db_data?.draft, item.gs_data?.draft)}
                                        </td>
                                        <td style={{ whiteSpace: "normal", verticalAlign: "top" }}>
                                            {renderCellWithDiff(item.db_data?.exp, item.gs_data?.exp)}
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
