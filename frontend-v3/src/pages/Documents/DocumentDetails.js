import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card, CardBody, CardHeader, Input, Button, Spinner, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast } from 'react-toastify';
import SimpleBar from 'simplebar-react';
import FeatherIcon from 'feather-icons-react';

const DocumentDetails = () => {
    const { id } = useParams();
    const [document, setDocument] = useState(null);
    const [structure, setStructure] = useState([]);
    const [filteredStructure, setFilteredStructure] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [nodeFeedbacks, setNodeFeedbacks] = useState([]);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [explanationContent, setExplanationContent] = useState('');
    const [expandedNodeId, setExpandedNodeId] = useState(null);
    
    // States for UI
    const [loading, setLoading] = useState(true);
    const [loadingStructure, setLoadingStructure] = useState(false);
    const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
    const [isSuggestingAI, setIsSuggestingAI] = useState(false);
    const [savingExplanation, setSavingExplanation] = useState(false);
    const [uploadingFeedback, setUploadingFeedback] = useState(false);
    const fileInputRef = useRef(null);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        if (id) {
            fetchDocumentDetails();
            fetchStructure('all');
        }
    }, [id]);

    useEffect(() => {
        if (selectedNode) {
            fetchFeedbacks(selectedNode.id);
        } else {
            setNodeFeedbacks([]);
            setSelectedFeedback(null);
        }
    }, [selectedNode]);

    useEffect(() => {
        applyFilters();
    }, [searchTerm, filterType, structure]);

    const fetchDocumentDetails = async () => {
        try {
            const data = await axios.get(`/api/documents/${id}/`, getAuthHeader());
            setDocument(data.results || data);
        } catch (error) {
            toast.error("Không thể tải thông tin văn bản.");
        } finally {
            setLoading(false);
        }
    };

    const fetchStructure = async (type = 'all') => {
        setLoadingStructure(true);
        try {
            const endpoint = `/api/documents/${id}/nodes/`;
            const data = await axios.get(endpoint, getAuthHeader());
            const results = data.results || data || [];
            setStructure(results);
            setFilteredStructure(results);
        } catch (error) {
            toast.error("Không thể tải cấu trúc văn bản.");
        } finally {
            setLoadingStructure(false);
        }
    };

    const fetchFeedbacks = async (nodeId) => {
        setLoadingFeedbacks(true);
        try {
            const data = await axios.get(`/api/feedbacks/by_node/?node_id=${nodeId}`, getAuthHeader());
            const results = data.results || data || [];
            setNodeFeedbacks(results);
            if (results.length > 0) {
                setSelectedFeedback(results[0]);
                setExplanationContent(results[0].explanation || '');
            } else {
                setSelectedFeedback(null);
                setExplanationContent('');
            }
        } catch (error) {
            toast.error("Không thể tải danh sách góp ý.");
        } finally {
            setLoadingFeedbacks(false);
        }
    };

    const applyFilters = () => {
        if (!structure) return;
        
        let result = JSON.parse(JSON.stringify(structure)); // Deep copy

        const filterTree = (nodes, term, type) => {
            if (!nodes) return [];
            return nodes.map(node => {
                const children = filterTree(node.children || [], term, type);
                
                let textMatch = true;
                if (term) {
                    textMatch = node.node_label?.toLowerCase().includes(term.toLowerCase()) || 
                                node.content?.toLowerCase().includes(term.toLowerCase());
                }

                let typeMatch = true;
                if (type === 'has_feedback') typeMatch = node.total_feedbacks > 0;
                if (type === 'resolved') typeMatch = node.resolved_feedbacks === node.total_feedbacks && node.total_feedbacks > 0;
                if (type === 'unresolved') typeMatch = node.resolved_feedbacks < node.total_feedbacks && node.total_feedbacks > 0;

                if ((textMatch && typeMatch) || children.length > 0) {
                    return { ...node, children };
                }
                return null;
            }).filter(Boolean);
        };

        setFilteredStructure(filterTree(result, searchTerm, filterType));
    };

    const handleAISuggest = async () => {
        if (!selectedFeedback || !selectedNode || !document) return;
        
        setIsSuggestingAI(true);
        try {
            const data = await axios.post('/api/feedbacks/ai_suggest/', {
                document_id: document.id,
                node_content: selectedNode.content,
                feedback_content: selectedFeedback.content
            }, getAuthHeader());
            setExplanationContent(data.suggestion);
            toast.success("AI đã tạo gợi ý giải trình!");
        } catch (err) {
            toast.error("Lỗi khi kết nối với AI.");
        } finally {
            setIsSuggestingAI(false);
        }
    };

    const handleSaveExplanation = async () => {
        if (!selectedFeedback || !document) return;
        
        setSavingExplanation(true);
        try {
            await axios.post('/api/feedbacks/save_explanation/', {
                document_id: document.id,
                target_type: 'Feedback',
                object_id: selectedFeedback.id,
                content: explanationContent
            }, getAuthHeader());
            
            toast.success("Đã lưu giải trình!");
            fetchFeedbacks(selectedNode.id); // Refresh
        } catch (err) {
            toast.error("Lỗi khi lưu giải trình.");
        } finally {
            setSavingExplanation(false);
        }
    };

    const handleStatusChange = async (action) => {
        if (!selectedFeedback) return;
        try {
            const endpoint = action === 'submit' ? 'submit_for_review' : 'approve_feedback';
            await axios.post(`/api/feedbacks/${selectedFeedback.id}/${endpoint}/`, {}, getAuthHeader());
            toast.success("Cập nhật trạng thái thành công!");
            fetchFeedbacks(selectedNode.id);
        } catch (err) {
            toast.error("Lỗi cập nhật trạng thái.");
        }
    };

    const handleExportMau10 = async () => {
        if (!document) return;
        try {
            const token = localStorage.getItem('access_token');
            const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
            const url = `${baseUrl}/api/feedbacks/export_mau_10/?document_id=${document.id}&token=${token}`;
            window.open(url, "_blank");
        } catch (err) {
            toast.error("Lỗi khi xuất báo cáo.");
        }
    };

    const handleFeedbackFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !document) return;
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_id', document.id);
        
        setUploadingFeedback(true);
        try {
            const res = await axios.post('/api/feedbacks/parse_file/', formData, {
                headers: { ...getAuthHeader().headers, 'Content-Type': 'multipart/form-data' }
            });
            const parseData = res.results || res;
            await axios.post('/api/feedbacks/bulk_create/', {
                document_id: document.id,
                feedbacks: parseData.feedbacks,
                metadata: parseData.metadata
            }, getAuthHeader());
            
            toast.success(`Đã nhập thành công ${parseData.feedbacks.length} góp ý.`);
            if (selectedNode) fetchFeedbacks(selectedNode.id);
            // reset file input
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (err) {
            toast.error("Lỗi khi nhập file góp ý.");
        } finally {
            setUploadingFeedback(false);
        }
    };

    const renderNodeTree = (nodes, depth = 0) => {
        if (!nodes) return null;
        return nodes.map(node => {
            const hasChildren = node.children && node.children.length > 0;
            const isExpanded = expandedNodeId === node.id;
            
            return (
                <div key={node.id} className="mb-1">
                    <div 
                        className={`p-2 rounded cursor-pointer transition-colors fs-13 ${selectedNode?.id === node.id ? 'bg-primary text-white shadow-sm' : 'hover:bg-light text-body'}`}
                        style={{ marginLeft: `${depth * 15}px` }}
                        onClick={() => {
                            setSelectedNode(node);
                            if (node.node_type === 'Điều') {
                                setExpandedNodeId(isExpanded ? null : node.id);
                            }
                        }}
                    >
                        <div className="d-flex align-items-center">
                            <FeatherIcon 
                                icon={node.node_type === 'Khoản' ? 'file-text' : (isExpanded ? 'chevron-down' : 'chevron-right')} 
                                className="icon-xs me-2 opacity-75" 
                            />
                            <span className="fw-medium text-truncate flex-grow-1">
                                {node.node_label}: {(node.content || "").substring(0, 30)}...
                            </span>
                            {node.total_feedbacks > 0 && (
                                <span className={`badge ${node.resolved_feedbacks === node.total_feedbacks ? 'bg-success' : 'bg-warning'} ms-2`}>
                                    {node.resolved_feedbacks}/{node.total_feedbacks}
                                </span>
                            )}
                        </div>
                    </div>
                    {hasChildren && isExpanded && (
                        <div className="mt-1">
                            {renderNodeTree(node.children, depth + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    window.document.title = document ? `Chi tiết: ${document.project_name} | QLVB V3.0` : "Chi tiết Văn bản | QLVB V3.0";

    if (loading) {
        return (
            <div className="page-content d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
                <Spinner color="primary" />
            </div>
        );
    }

    return (
        <React.Fragment>
            <div className="page-content" style={{ padding: 0, height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>
                <Container fluid className="h-100 d-flex flex-column px-0 pb-1">
                    
                    {/* Header Bar */}
                    <div className="bg-card border-bottom p-2 mb-1 shrink-0 rounded shadow-sm">
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-3">
                                <Link to="/documents" className="btn btn-sm btn-soft-secondary">
                                    <i className="ri-arrow-left-line align-bottom"></i> Quay lại
                                </Link>
                                <h4 className="mb-0 fw-bold header-title text-truncate" style={{ maxWidth: '600px' }}>
                                    {document?.project_name}
                                </h4>
                                <span className="badge bg-primary-subtle text-primary">{document?.status}</span>
                            </div>
                            <div className="d-flex gap-2">
                                <Button color="success" className="btn-sm" onClick={handleExportMau10}>
                                    <i className="ri-file-word-2-line align-bottom me-1"></i> Xuất Mẫu 10
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* 3 Columns Workspace */}
                    <Row className="flex-grow-1 g-3 overflow-hidden m-0" style={{ minHeight: 0 }}>
                        
                        {/* LEFT COLUMN: STRUCTURE (3/12) */}
                        <Col lg={3} className="h-100 d-flex flex-column">
                            <Card className="h-100 border-0 shadow-sm mb-0">
                                <CardHeader className="border-bottom p-3 bg-light-subtle">
                                    <h6 className="card-title mb-3 fw-bold"><i className="ri-node-tree align-bottom me-1 text-primary"></i> Cấu trúc Dự thảo</h6>
                                    <div className="search-box mb-2">
                                        <Input 
                                            type="text" 
                                            className="form-control form-control-sm" 
                                            placeholder="Tìm kiếm Điều/Khoản..." 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        <i className="ri-search-line search-icon"></i>
                                    </div>
                                    <Input 
                                        type="select" 
                                        className="form-select form-select-sm"
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                    >
                                        <option value="all">Tất cả nội dung</option>
                                        <option value="has_feedback">Mục có góp ý</option>
                                        <option value="unresolved">Chưa giải trình xong</option>
                                        <option value="resolved">Đã giải trình</option>
                                    </Input>
                                </CardHeader>
                                <CardBody className="p-0 overflow-hidden">
                                    <SimpleBar style={{ height: '100%' }} className="p-3">
                                        {loadingStructure ? (
                                            <div className="text-center py-4"><Spinner size="sm" color="primary" /></div>
                                        ) : filteredStructure.length > 0 ? (
                                            renderNodeTree(filteredStructure)
                                        ) : (
                                            <div className="text-center text-muted py-4 fs-13">Không tìm thấy nội dung phù hợp.</div>
                                        )}
                                    </SimpleBar>
                                </CardBody>
                            </Card>
                        </Col>

                        {/* MIDDLE COLUMN: CONTENT (5/12) */}
                        <Col lg={5} className="h-100 d-flex flex-column">
                            <Card className="h-100 border-0 shadow-sm mb-0">
                                <CardHeader className="border-bottom p-3">
                                    <h6 className="card-title mb-0 fw-bold"><i className="ri-file-list-3-line align-bottom me-1 text-primary"></i> Nội dung Chi tiết</h6>
                                </CardHeader>
                                <CardBody className="p-0 overflow-hidden bg-body-tertiary bg-opacity-50">
                                    <SimpleBar style={{ height: '100%' }} className="p-4">
                                        {selectedNode ? (
                                            <div className="bg-card p-4 rounded shadow-sm border border-light-subtle">
                                                <h5 className="fw-bold mb-3 pb-2 border-bottom border-light d-flex justify-content-between align-items-center">
                                                    <span>
                                                        {selectedNode.node_type === 'Khoản' 
                                                            ? `${selectedNode.parent_label || 'Văn bản'}. ${selectedNode.parent_content?.split('\n')[0] || ''}` 
                                                            : `${selectedNode.node_label}: ${selectedNode.content?.split('\n')[0] || ''}`}
                                                    </span>
                                                    <span className="badge bg-light-subtle text-muted border border-light-subtle">{selectedNode.node_type}</span>
                                                </h5>
                                                <div className="fs-14 text-body lh-base" style={{ whiteSpace: 'pre-wrap' }}>
                                                    {selectedNode.node_type === 'Khoản' ? (
                                                        <span><span className="text-body me-2">{(selectedNode.node_label || "").replace('Khoản ', '')}.</span>{selectedNode.content}</span>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {(selectedNode.content || "").split('\n').map((line, idx) => {
                                                                if (selectedNode.node_type === 'Điều' && idx === 0) return null;
                                                                return <p key={idx} className="mb-1">{line}</p>;
                                                            })}
                                                            {selectedNode.children && selectedNode.children.map(child => (
                                                                <div key={child.id} className="ms-3 mt-2 pb-2 border-bottom border-light border-opacity-50 border-dashed">
                                                                    <span className="text-body me-2">{child.node_label.replace('Khoản ', '')}.</span>
                                                                    <span>{child.content}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="d-flex flex-column justify-content-center align-items-center h-100 text-muted">
                                                <div className="avatar-md mb-3">
                                                    <div className="avatar-title bg-light-subtle text-primary rounded-circle fs-24">
                                                        <i className="ri-article-line"></i>
                                                    </div>
                                                </div>
                                                <h5>Chưa chọn Điều/Khoản</h5>
                                                <p className="fs-13">Vui lòng chọn một mục bên trái để xem nội dung.</p>
                                            </div>
                                        )}
                                    </SimpleBar>
                                </CardBody>
                            </Card>
                        </Col>

                        {/* RIGHT COLUMN: FEEDBACKS (4/12) */}
                        <Col lg={4} className="h-100 d-flex flex-column">
                            <Card className="h-100 border-0 shadow-sm mb-0">
                                <CardHeader className="border-bottom p-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <h6 className="card-title mb-0 fw-bold">
                                            <i className="ri-discuss-line align-bottom me-1 text-primary"></i> 
                                            Ý kiến & Giải trình ({nodeFeedbacks.length})
                                        </h6>
                                        <div>
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                onChange={handleFeedbackFileUpload} 
                                                className="d-none" 
                                                accept=".docx"
                                            />
                                            <Button 
                                                color="light" 
                                                size="sm" 
                                                className="btn-icon" 
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploadingFeedback}
                                                title="Nhập Góp ý từ file Word"
                                            >
                                                {uploadingFeedback ? <Spinner size="sm" /> : <i className="ri-upload-cloud-2-line fs-14"></i>}
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardBody className="p-0 d-flex flex-column overflow-hidden bg-body-tertiary">
                                    {/* Feedbacks List (Top Half) */}
                                    <div className="flex-grow-1 overflow-hidden" style={{ minHeight: '40%' }}>
                                        <SimpleBar style={{ height: '100%' }} className="p-3">
                                            {loadingFeedbacks ? (
                                                <div className="text-center py-3"><Spinner size="sm" color="primary"/></div>
                                            ) : nodeFeedbacks.length > 0 ? (
                                                nodeFeedbacks.map(fb => (
                                                    <div 
                                                        key={fb.id} 
                                                        className={`card mb-2 border rounded cursor-pointer transition-shadow ${selectedFeedback?.id === fb.id ? 'border-primary shadow' : 'border-0 shadow-none'}`}
                                                        onClick={() => { setSelectedFeedback(fb); setExplanationContent(fb.explanation || ''); }}
                                                    >
                                                        <div className="card-body p-3">
                                                            <div className="d-flex justify-content-between mb-2">
                                                                <span className="fw-bold fs-12 text-uppercase text-primary">{fb.contributing_agency}</span>
                                                                <span className={`badge ${fb.status === 'approved' ? 'bg-success-subtle text-success' : fb.status === 'reviewed' ? 'bg-info-subtle text-info' : 'bg-warning-subtle text-warning'}`}>
                                                                    {fb.status === 'approved' ? 'Đã duyệt' : fb.status === 'reviewed' ? 'Đã thẩm định' : 'Chờ xử lý'}
                                                                </span>
                                                            </div>
                                                            <p className="fs-13 mb-0 text-body bg-light-subtle p-2 rounded">"{fb.content}"</p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center text-muted py-4 fs-13 bg-card rounded border border-dashed">
                                                    Không có ý kiến cho mục này.
                                                </div>
                                            )}
                                        </SimpleBar>
                                    </div>

                                    {/* Explanation Editor (Bottom Half) */}
                                    <div className="bg-card border-top p-3 shrink-0">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <label className="form-label mb-0 fw-bold fs-12 text-uppercase text-muted">Nội dung Giải trình</label>
                                            <Button 
                                                color="info" 
                                                className="btn-sm btn-label text-nowrap rounded-pill" 
                                                onClick={handleAISuggest} 
                                                disabled={!selectedFeedback || isSuggestingAI}
                                            >
                                                <i className="ri-magic-line label-icon align-middle rounded-pill fs-16 me-2"></i> AI Gợi ý
                                            </Button>
                                        </div>
                                        <Input
                                            type="textarea"
                                            rows={3}
                                            className="form-control bg-light-subtle border-light-subtle mb-3"
                                            placeholder={selectedFeedback ? "Nhập nội dung tiếp thu/giải trình..." : "Chọn ý kiến để giải trình."}
                                            value={explanationContent}
                                            onChange={(e) => setExplanationContent(e.target.value)}
                                            disabled={!selectedFeedback}
                                        />
                                        <div className="d-flex gap-2">
                                            <Button 
                                                color="primary" 
                                                className="w-100" 
                                                onClick={handleSaveExplanation} 
                                                disabled={!selectedFeedback || savingExplanation}
                                            >
                                                {savingExplanation ? <Spinner size="sm"/> : <><i className="ri-save-3-line align-bottom me-1"></i> Lưu Giải trình</>}
                                            </Button>
                                            
                                            {selectedFeedback && selectedFeedback.status === 'pending' && (
                                                <Button color="success" outline onClick={() => handleStatusChange('submit')}>
                                                    Trình duyệt
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                        
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default DocumentDetails;
