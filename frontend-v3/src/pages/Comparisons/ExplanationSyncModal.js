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

    const getAuthHeader = () => {
        const token = localStorage.getItem("access_token");
        return { headers: { Authorization: `Bearer ${token}` } };
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/comparisons/versions/${versionId}/gsheet_compare_explanation/`, getAuthHeader());
            setData(res.data);
            setSelectedIds([]); // Reset selection
        } catch (err) {
            toast.error("Lỗi khi tải dữ liệu so sánh GSheet");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

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
            toast.success("Cập nhật vào hệ thống thành công!");
            onSyncSuccess();
            toggle();
        } catch (err) {
            toast.error("Lỗi khi cập nhật vào hệ thống");
        } finally {
            setSyncing(false);
        }
    };

    const handlePush = async () => {
        if (selectedIds.length === 0) return toast.warning("Vui lòng chọn ít nhất một mục");
        
        setSyncing(true);
        try {
            await axios.post(`/api/comparisons/versions/${versionId}/gsheet_push_selected_explanation/`, { node_ids: selectedIds }, getAuthHeader());
            toast.success("Đẩy lên Google Sheet thành công!");
            fetchData(); // Refresh statuses
        } catch (err) {
            toast.error("Lỗi khi đẩy lên Google Sheet");
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
            <ModalHeader toggle={toggle}>
                <i className="ri-google-line me-2 text-warning"></i> 
                So sánh & Đồng bộ Thuyết minh với Google Sheet
            </ModalHeader>
            <ModalBody className="p-0">
                {loading ? (
                    <div className="text-center py-5">
                        <Spinner color="primary" />
                        <p className="mt-2">Đang quét dữ liệu Google Sheet...</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <Table className="align-middle table-nowrap mb-0">
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
                                    <tr key={item.id} className={item.status !== 'match' ? 'table-soft-warning' : ''}>
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
                                        <td style={{ maxWidth: "300px", whiteSpace: "normal" }}>
                                            <div className="text-truncate-two">{item.db_content || <em className="text-muted">(Trống)</em>}</div>
                                        </td>
                                        <td style={{ maxWidth: "300px", whiteSpace: "normal" }}>
                                            <div className="text-truncate-two">{item.gsheet_content || <em className="text-muted">(Trống)</em>}</div>
                                        </td>
                                        <td>{getStatusBadge(item.status)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}
            </ModalBody>
            <ModalFooter className="justify-content-between">
                <div>
                    <span className="text-muted">Đã chọn: <strong>{selectedIds.length}</strong> mục</span>
                </div>
                <div>
                    <Button color="light" onClick={toggle} disabled={syncing} className="me-2">Đóng</Button>
                    <Button color="primary" outline onClick={handlePull} disabled={syncing || selectedIds.length === 0} className="me-2">
                        <i className="ri-download-2-line me-1"></i> Cập nhật vào Hệ thống
                    </Button>
                    <Button color="warning" outline onClick={handlePush} disabled={syncing || selectedIds.length === 0}>
                        <i className="ri-upload-2-line me-1"></i> Đẩy lên Google Sheet
                    </Button>
                </div>
            </ModalFooter>
        </Modal>
    );
};

export default ExplanationSyncModal;
