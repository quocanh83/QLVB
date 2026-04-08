import React, { useState } from 'react';
import { 
    Card, CardBody, CardHeader, Button, Nav, NavItem, NavLink, 
    TabContent, TabPane, Input, Label, Badge, Alert, Spinner
} from 'reactstrap';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'react-toastify';

const AIWorkbench = ({ versionId, standaloneId, onHighlightReference }) => {
    const [activeTab, setActiveTab] = useState('1');
    const [loading, setLoading] = useState(false);
    
    // Tab 1: Cross-Reference
    const [references, setReferences] = useState([]);
    
    // Tab 2: Report
    const [summary, setSummary] = useState('');
    const [customRequest, setCustomRequest] = useState('Viết bài tham luận tóm tắt các điểm mới nổi bật');
    const [generatedReport, setGeneratedReport] = useState(null);

    const toggleTab = (tab) => {
        if (activeTab !== tab) setActiveTab(tab);
    };

    const handleCheckReferences = async () => {
        setLoading(true);
        try {
            let res;
            if (standaloneId) {
                res = await axios.post(`/api/comparisons/reference-reviews/${standaloneId}/ai_check/`, {}, getAuthHeader());
            } else {
                res = await axios.post(`/api/comparisons/versions/${versionId}/ai_check_references/`, {}, getAuthHeader());
            }
            // API returns AIResult instance, content is JSON string for reference_check
            const data = JSON.parse(res.content);
            setReferences(data.references || []);
            toast.success("Đã hoàn tất rà soát dẫn chiếu!");
        } catch (error) {
            console.error("AI Check Error", error);
            const msg = error.response?.data?.error || "Lỗi khi rà soát dẫn chiếu AI";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        if (!summary) return toast.warning("Vui lòng nhập văn bản tóm tắt/định hướng");
        setLoading(true);
        try {
            let res;
            if (standaloneId) {
                res = await axios.post(`/api/comparisons/reference-reviews/${standaloneId}/ai_generate_report/`, {
                    summary_text: summary,
                    custom_request: customRequest
                }, getAuthHeader());
            } else {
                res = await axios.post(`/api/comparisons/versions/${versionId}/ai_generate_report/`, {
                    summary_text: summary,
                    custom_request: customRequest
                }, getAuthHeader());
            }
            setGeneratedReport(res);
            toast.success("Đã tạo báo cáo thành công!");
        } catch (error) {
            console.error("AI Report Error", error);
            const msg = error.response?.data?.error || "Lỗi khi tạo báo cáo AI";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadReport = () => {
        if (!generatedReport) return;
        const apiBase = axios.defaults.baseURL || "";
        let url;
        if (standaloneId) {
            url = `${apiBase}/api/comparisons/reference-reviews/export_ai_report/${generatedReport.id}/?token=${localStorage.getItem("authUser") ? JSON.parse(localStorage.getItem("authUser")).token : ''}`;
        } else {
            url = `${apiBase}/api/comparisons/versions/export_ai_report/${generatedReport.id}/?token=${localStorage.getItem("authUser") ? JSON.parse(localStorage.getItem("authUser")).token : ''}`;
        }
        window.open(url, '_blank');
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Valid': return <Badge color="success">Hợp lệ</Badge>;
            case 'Missing': return <Badge color="danger">Thiếu/Bãi bỏ</Badge>;
            case 'Logical Error': return <Badge color="warning">Lỗi Logic</Badge>;
            default: return <Badge color="secondary">{status}</Badge>;
        }
    };

    return (
        <Card className="h-100 shadow-none border-start rounded-0 mb-0">
            <CardHeader className="d-flex align-items-center bg-light py-2">
                <h6 className="card-title mb-0 flex-grow-1"><i className="ri-robot-3-line me-2"></i>AI Workbench</h6>
            </CardHeader>
            <CardBody className="p-0 d-flex flex-column h-100 overflow-hidden">
                <Nav tabs className="nav-tabs-custom nav-success border-bottom p-2">
                    <NavItem>
                        <NavLink className={activeTab === '1' ? "active" : ""} onClick={() => toggleTab('1')}>
                            Rà soát dẫn chiếu
                        </NavLink>
                    </NavItem>
                    <NavItem>
                        <NavLink className={activeTab === '2' ? "active" : ""} onClick={() => toggleTab('2')}>
                            Tạo báo cáo tự động
                        </NavLink>
                    </NavItem>
                </Nav>

                <TabContent activeTab={activeTab} className="flex-grow-1 overflow-auto p-3">
                    <TabPane tabId="1">
                        <div className="mb-3">
                            <Alert color="info" className="mb-3 fs-12">
                                AI sẽ quét toàn bộ văn bản để kiểm tra các dẫn chiếu nội bộ (Điều, Khoản).
                            </Alert>
                            <Button color="primary" className="w-100" onClick={handleCheckReferences} disabled={loading}>
                                {loading && activeTab === '1' ? <Spinner size="sm" className="me-2" /> : <i className="ri-shield-check-line me-1"></i>}
                                Bắt đầu Rà soát Dẫn chiếu
                            </Button>
                        </div>

                        {references.length > 0 && (
                            <div className="mt-3">
                                {references.map((ref, idx) => (
                                    <div key={idx} className="p-3 border rounded mb-3 bg-white shadow-sm">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <span className="fw-bold text-primary fs-13">{ref.source_location}</span>
                                            {getStatusBadge(ref.status)}
                                        </div>
                                        <p className="mb-2 italic text-muted small">"{ref.extracted_text}"</p>
                                        <div className="mb-2">
                                            <span className="text-dark small">Dẫn tới: </span>
                                            <Badge color="soft-dark">{ref.target_location}</Badge>
                                        </div>
                                        <Alert color={ref.status === 'Valid' ? 'success' : ref.status === 'Missing' ? 'danger' : 'warning'} className="p-2 fs-12 mb-0">
                                            <strong>{ref.status === 'Valid' ? 'Xác nhận:' : 'Phát hiện:'}</strong> {ref.reason}
                                            {ref.suggestion && <div className="mt-1">💡 <em>Gợi ý: {ref.suggestion}</em></div>}
                                        </Alert>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabPane>

                    <TabPane tabId="2">
                        <div className="mb-3">
                            <Label className="form-label">Văn bản 1: Tóm tắt điểm mới / Ý kiến chỉ đạo</Label>
                            <Input 
                                type="textarea" 
                                rows="5" 
                                placeholder="Nhập danh sách các quan điểm chỉ đạo hoặc tóm tắt điểm mới tại đây..."
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                            />
                        </div>
                        <div className="mb-3">
                            <Label className="form-label">Yêu cầu cụ thể</Label>
                            <Input 
                                type="text"
                                placeholder="Ví dụ: Viết báo cáo tóm tắt, Lập bảng so sánh..."
                                value={customRequest}
                                onChange={(e) => setCustomRequest(e.target.value)}
                            />
                        </div>
                        <Button color="success" className="w-100 mb-3" onClick={handleGenerateReport} disabled={loading}>
                            {loading && activeTab === '2' ? <Spinner size="sm" className="me-2" /> : <i className="ri-magic-line me-1"></i>}
                            Phân tích & Viết báo cáo
                        </Button>

                        {generatedReport && (
                            <div className="mt-3">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <h6 className="mb-0">Kết quả báo cáo</h6>
                                    <Button color="soft-primary" size="sm" onClick={handleDownloadReport}>
                                        <i className="ri-file-word-line me-1"></i> Tải Word
                                    </Button>
                                </div>
                                <div className="p-3 border rounded bg-white markdown-body fs-13" style={{maxHeight: '400px', overflowY: 'auto'}}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {generatedReport.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </TabPane>
                </TabContent>
            </CardBody>
        </Card>
    );
};

export default AIWorkbench;
