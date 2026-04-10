import React, { useState, useEffect } from 'react';
import { 
    Button, Table, Badge, Spinner, Row, Col, Card, CardBody, Input, Label 
} from 'reactstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getAuthHeader } from '../../helpers/api_helper';

const ComparisonSyncTab = ({ versionId, onSyncSuccess, gsheetUrlProp }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [syncing, setSyncing] = useState(false);
    const [gsheetUrl, setGsheetUrl] = useState(gsheetUrlProp || "");

    useEffect(() => {
        if (gsheetUrlProp) {
            setGsheetUrl(gsheetUrlProp);
            fetchData(gsheetUrlProp);
        }
    }, [gsheetUrlProp]);

    const fetchData = async (url) => {
        const targetUrl = url || gsheetUrl;
        if (!targetUrl) return;
        
        setLoading(true);
        try {
            const res = await axios.get(`/api/comparisons/versions/${versionId}/gsheet_compare_explanation/`, getAuthHeader());
            const responseData = Array.isArray(res) ? res : (res.data || []);
            setData(responseData);
            // Mặc định chọn các dòng có sự khác biệt hoặc thiếu ở GSheet
            const diffIds = responseData.filter(item => item.status !== 'match').map(item => item.id);
            setSelectedIds(diffIds);
        } catch (err) {
            toast.error("Lỗi GSheet: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleSaveUrl = async () => {
        if (!gsheetUrl) return toast.warning("Vui lòng nhập link Google Sheet");
        setSyncing(true);
        try {
            await axios.post(`/api/comparisons/versions/${versionId}/save_gsheet_url/`, { sheet_url: gsheetUrl }, getAuthHeader());
            toast.success("Đã lưu liên kết Google Sheet!");
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
            toast.success("Đã nạp thành công dữ liệu từ GSheet về hệ thống!");
            if (onSyncSuccess) onSyncSuccess();
            fetchData();
        } catch (err) {
            toast.error("Lỗi khi nạp dữ liệu: " + (err.response?.data?.error || err.message));
        } finally {
            setSyncing(false);
        }
    };

    const handlePush = async () => {
        if (selectedIds.length === 0) return toast.warning("Vui lòng chọn ít nhất một mục");
        
        setSyncing(true);
        try {
            await axios.post(`/api/comparisons/versions/${versionId}/gsheet_push_selected_explanation/`, { node_ids: selectedIds }, getAuthHeader());
            toast.success("Đã đẩy thành công dữ liệu lên GSheet!");
            fetchData(); 
        } catch (err) {
            toast.error("Lỗi khi đẩy dữ liệu: " + (err.response?.data?.error || err.message));
        } finally {
            setSyncing(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'match': return <Badge color="success-subtle" className="text-success">Khớp</Badge>;
            case 'mismatch': return <Badge color="warning-subtle" className="text-warning">Khác biệt</Badge>;
            case 'missing_db': return <Badge color="danger-subtle" className="text-danger">Thiếu ở HT</Badge>;
            case 'missing_gsheet': return <Badge color="info-subtle" className="text-info">Thiếu ở GSheet</Badge>;
            default: return null;
        }
    };

    const renderCellWithDiff = (dbVal = "", gsVal = "") => {
        const dbText = (dbVal || "").trim();
        const gsText = (gsVal || "").trim();
        
        // Chuẩn hóa phía frontend để quyết định hiển thị box khác biệt (khớp với logic backend)
        const normalize = (t) => {
            if (!t) return "";
            let text = t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            const placeholders = [
                '(trống)', 'trống', '(trong)', 'trong',
                '(dòng mới)', 'dòng mới', '(dong moi)', 'dong moi',
                '(mới)', 'mới', '(moi)', 'moi',
                '(bãi bỏ)', 'bãi bỏ', '(bai bo)', 'bai bo',
                'x', '-', '...', 'none', 'null'
            ];
            if (placeholders.includes(text.toLowerCase())) return "";
            return text;
        };
        const isDifferent = normalize(dbText) !== normalize(gsText);
        
        if (!isDifferent) {
            return (
                <div className="text-muted small text-truncate-2">
                    <span dangerouslySetInnerHTML={{ __html: dbText || '<em class="opacity-50">(Trống)</em>' }} />
                </div>
            );
        }
        
        return (
            <div className="small p-2 rounded border shadow-sm" style={{ backgroundColor: "rgba(255, 191, 0, 0.08)", borderColor: "rgba(255, 191, 0, 0.3)" }}>
                <div className="mb-2 pb-2 border-bottom border-light">
                    <div className="d-flex align-items-center mb-1">
                        <Badge color="info" className="me-2 px-2">Hệ thống (HT)</Badge>
                        <small className="text-muted">Nội dung hiện tại trong DB</small>
                    </div>
                    <div className="text-white-50 ps-1" dangerouslySetInnerHTML={{ __html: dbText || '<em class="opacity-50">(Trống)</em>' }} />
                </div>
                <div>
                    <div className="d-flex align-items-center mb-1">
                        <Badge color="success" className="me-2 px-2">GSheet (GS)</Badge>
                        <small className="text-muted">Nội dung trên Google Sheet</small>
                    </div>
                    <div className="text-info ps-1 fw-medium">{gsText || <em className="opacity-50">(Trống)</em>}</div>
                </div>
            </div>
        );
    };

    return (
        <React.Fragment>
            <Card className="bg-transparent border-0 mb-0 shadow-none">
                <CardBody className="p-0">
                    <div className="p-3 bg-dark-subtle border-bottom rounded-top d-flex gap-3 align-items-center">
                        <div className="flex-grow-1">
                            <Label className="form-label small fw-bold text-uppercase text-white-50 mb-1">Google Sheet URL [A: Gốc - B: Dự thảo - C: Thuyết minh - D: ID]</Label>
                            <Input 
                                type="url" 
                                className="form-control bg-dark border-secondary text-white" 
                                placeholder="Dán link Google Sheet tại đây..." 
                                value={gsheetUrl}
                                onChange={(e) => setGsheetUrl(e.target.value)}
                            />
                        </div>
                        <div className="d-flex gap-2">
                            <Button color="primary" onClick={handleSaveUrl} disabled={syncing}>
                                {syncing ? <Spinner size="sm" /> : <i className="ri-save-line me-1"></i>} Lưu & Quét
                            </Button>
                            <Button color="soft-info" onClick={() => fetchData()} disabled={syncing || !gsheetUrl}>
                                <i className="ri-refresh-line me-1"></i> Quét lại
                            </Button>
                        </div>
                    </div>

                    <div className="p-3 bg-light-subtle border-bottom d-flex justify-content-between align-items-center">
                        <div className="d-flex gap-4">
                            <div className="text-muted small">
                                Tổng số dòng: <strong>{data.length}</strong>
                            </div>
                            <div className="text-muted small">
                                Đã chọn: <strong className="text-primary">{selectedIds.length}</strong>
                            </div>
                        </div>
                        <div className="d-flex gap-2">
                            <Button color="info" size="sm" onClick={handlePull} disabled={syncing || selectedIds.length === 0}>
                                <i className="ri-download-2-fill me-1"></i> Nạp về Hệ thống
                            </Button>
                            <Button color="warning" size="sm" onClick={handlePush} disabled={syncing || selectedIds.length === 0}>
                                <i className="ri-upload-2-fill me-1"></i> Đẩy lên GSheet
                            </Button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner color="primary" className="mb-2" />
                            <p className="text-muted">Đang phân tích dữ liệu giữa Hệ thống và Google Sheet...</p>
                        </div>
                    ) : (
                        <div className="table-responsive" style={{ maxHeight: "calc(100vh - 350px)" }}>
                            <Table className="align-middle table-nowrap table-hover mb-0 custom-sync-table" style={{ tableLayout: "fixed" }}>
                                <thead className="table-dark sticky-top">
                                    <tr>
                                        <th style={{ width: "40px" }}>
                                            <div className="form-check">
                                                <Input 
                                                    className="form-check-input" 
                                                    type="checkbox" 
                                                    onChange={handleSelectAll}
                                                    checked={data.length > 0 && selectedIds.length === data.length}
                                                />
                                            </div>
                                        </th>
                                        <th style={{ width: "120px" }}>Điều/Nhãn</th>
                                        <th>Nội dung Gốc</th>
                                        <th>Nội dung Dự thảo</th>
                                        <th>Thuyết minh</th>
                                        <th style={{ width: "120px" }} className="text-center">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.length > 0 ? data.map((item) => (
                                        <tr key={item.id} className={item.status !== 'match' ? 'bg-soft-warning-row' : ''}>
                                            <td>
                                                <div className="form-check">
                                                    <Input 
                                                        className="form-check-input" 
                                                        type="checkbox" 
                                                        checked={selectedIds.includes(item.id)}
                                                        onChange={() => handleToggleSelect(item.id)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="text-wrap">
                                                <div className="fw-bold fs-13 text-primary">{item.label}</div>
                                                <div className="text-muted x-small mt-1" style={{ fontSize: '9px', opacity: 0.7 }}>{item.row_id}</div>
                                            </td>
                                            <td className="text-wrap" style={{ verticalAlign: "top" }}>
                                                {renderCellWithDiff(item.db_data?.base, item.gs_data?.base)}
                                            </td>
                                            <td className="text-wrap" style={{ verticalAlign: "top" }}>
                                                {renderCellWithDiff(item.db_data?.draft, item.gs_data?.draft)}
                                            </td>
                                            <td className="text-wrap" style={{ verticalAlign: "top" }}>
                                                {renderCellWithDiff(item.db_data?.exp, item.gs_data?.exp)}
                                            </td>
                                            <td className="text-center">
                                                {getStatusBadge(item.status)}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" className="text-center py-5 text-muted">
                                                <i className="ri-information-line ri-2x mb-2 d-block"></i>
                                                Chưa có dữ liệu đối soát. Hãy nhấn "Lưu & Quét" để bắt đầu.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </CardBody>
            </Card>

            <style>{`
                .text-truncate-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .x-small { font-size: 10px; }
                .bg-soft-warning-row { background-color: rgba(255, 191, 0, 0.03) !important; }
                .custom-sync-table th { padding: 12px 15px; font-size: 12px; }
                .custom-sync-table td { padding: 12px 15px; border-color: rgba(255, 255, 255, 0.05); }
                .text-wrap { word-break: break-word; white-space: normal !important; }
            `}</style>
        </React.Fragment>
    );
};

export default ComparisonSyncTab;
