import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Spinner, Badge } from 'reactstrap';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast } from 'react-toastify';

const ExplanationTable = ({ documentId, nodeId, filterType }) => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [savingRow, setSavingRow] = useState(null);
    const [aiLoading, setAiLoading] = useState(null);
    const [isSavingAll, setIsSavingAll] = useState(false);

    useEffect(() => {
        if (nodeId) {
            fetchFeedbacks();
        }
    }, [nodeId, filterType]);

    const fetchFeedbacks = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/feedbacks/by_node/?node_id=${nodeId}&filter_type=${filterType}`, getAuthHeader());
            const data = res.results || res || [];
            setFeedbacks(Array.isArray(data) ? data : []);
        } catch (e) {
            toast.error("Lỗi khi tải danh sách góp ý.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateContent = (id, value) => {
        setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, explanation: value } : f));
    };

    const handleAiSuggest = async (record) => {
        setAiLoading(record.id);
        setAiLoading(record.id);
        try {
            const res = await axios.post('/api/feedbacks/ai_suggest/', {
                document_id: documentId,
                node_content: record.node_content,
                feedback_content: record.content
            }, getAuthHeader());
            
            const suggestion = res.data.suggestion || res.data.results?.suggestion || "";
            handleUpdateContent(record.id, suggestion);
            toast.success("AI đã đưa ra gợi ý giải trình!");
        } catch (e) {
            toast.error("Lỗi khi gọi AI gợi ý.");
        } finally {
            setAiLoading(null);
        }
    };

    const handleSaveRow = async (record) => {
        setSavingRow(record.id);
        try {
            await axios.post('/api/feedbacks/save_explanation/', {
                document_id: documentId,
                target_type: 'Feedback',
                object_id: record.id,
                content: record.explanation
            }, getAuthHeader());
            toast.success("Đã lưu giải trình cho đơn vị: " + record.contributing_agency);
        } catch (e) {
            toast.error("Lỗi khi lưu giải trình.");
        } finally {
            setSavingRow(null);
        }
    };

    const handleSaveAll = async () => {
        setIsSavingAll(true);
        try {
            const promises = feedbacks.map(f => 
                axios.post('/api/feedbacks/save_explanation/', {
                    document_id: documentId,
                    target_type: 'Feedback',
                    object_id: f.id,
                    content: f.explanation
                }, getAuthHeader())
            );
            await Promise.all(promises);
            toast.success(`Đã lưu tất cả ${feedbacks.length} dòng giải trình!`);
        } catch (e) {
            toast.error("Có lỗi xảy ra khi lưu tất cả.");
        } finally {
            setIsSavingAll(false);
        }
    };

    if (loading) return <div className="text-center py-5"><Spinner color="primary" /></div>;

    return (
        <div className="explanation-table-wrapper">
            <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-light-subtle rounded-3 shadow-sm border">
                <h6 className="mb-0 fw-bold text-primary"><i className="ri-feedback-line align-bottom me-1"></i> Danh sách Góp ý cần xử lý ({feedbacks.length})</h6>
                <Button 
                    color="primary" 
                    size="sm"
                    className="btn-label rounded-pill shadow-none"
                    onClick={handleSaveAll}
                    disabled={isSavingAll || feedbacks.length === 0}
                >
                    <i className="ri-save-3-line label-icon align-middle fs-16 me-2"></i> Lưu tất cả giải trình
                </Button>
            </div>
            
            <div className="table-responsive table-card">
                <Table className="align-middle table-nowrap mb-0 border-0">
                    <thead className="table-light text-muted text-uppercase fs-11">
                        <tr>
                            <th style={{ width: '50px' }} className="text-center">STT</th>
                            <th style={{ width: '200px' }}>Cơ quan góp ý</th>
                            <th style={{ width: '35%' }}>Nội dung góp ý</th>
                            <th>Nội dung Giải trình</th>
                            <th style={{ width: '80px' }} className="text-center">Lưu</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(Array.isArray(feedbacks) && feedbacks.length > 0) ? feedbacks.map((fb, index) => (
                            <tr key={fb.id}>
                                <td className="text-center">{index + 1}</td>
                                <td>
                                    <div className="fw-semibold text-body">{fb.contributing_agency}</div>
                                    <div className="mt-1">
                                        <Badge className={`badge-soft-${fb.status === 'approved' ? 'success' : fb.status === 'reviewed' ? 'info' : 'warning'} fs-10`}>
                                            {fb.status === 'approved' ? 'Đã duyệt' : fb.status === 'reviewed' ? 'Đã thẩm định' : 'Chờ xử lý'}
                                        </Badge>
                                    </div>
                                </td>
                                <td>
                                    <div className="text-muted fs-13" style={{ whiteSpace: 'pre-wrap' }}>
                                        {fb.content}
                                    </div>
                                </td>
                                <td>
                                    <Input 
                                        type="textarea" 
                                        rows={3}
                                        value={fb.explanation || ""} 
                                        onChange={(e) => handleUpdateContent(fb.id, e.target.value)}
                                        placeholder="Nhập nội dung tiếp thu, giải trình..."
                                        className="form-control-sm bg-light-subtle"
                                    />
                                    <div className="d-flex justify-content-end mt-1 gap-1">
                                        <Button 
                                            size="sm" 
                                            color="soft-info" 
                                            className="btn-icon"
                                            onClick={() => handleAiSuggest(fb)}
                                            disabled={aiLoading === fb.id}
                                            title="AI Gợi ý"
                                        >
                                            {aiLoading === fb.id ? <Spinner size="sm" /> : <i className="ri-magic-line"></i>}
                                        </Button>
                                    </div>
                                </td>
                                <td className="text-center">
                                    <Button 
                                        color="soft-primary" 
                                        size="sm"
                                        className="btn-icon shadow-none"
                                        onClick={() => handleSaveRow(fb)}
                                        disabled={savingRow === fb.id}
                                        title="Lưu dòng này"
                                    >
                                        {savingRow === fb.id ? <Spinner size="sm" /> : <i className="ri-save-line fs-14"></i>}
                                    </Button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5" className="text-center py-4 text-muted">
                                    Không có góp ý nào cần giải trình cho mục này.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>
        </div>
    );
};

export default ExplanationTable;
