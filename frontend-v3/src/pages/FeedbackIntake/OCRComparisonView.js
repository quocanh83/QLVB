import React, { useState } from 'react';
import { Row, Col, Card, CardBody, Button, Badge, Spinner } from 'reactstrap';
import SimpleBar from 'simplebar-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const OCRComparisonView = ({ pages, onConfirm, onCancel, loading }) => {
    const [currentPage, setCurrentPage] = useState(0);

    if (!pages || pages.length === 0) return null;

    const page = pages[currentPage];

    // Tạo URL ảnh an toàn cho môi trường Dev và Production
    const getImageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        if (process.env.NODE_ENV === 'development') {
            return `http://localhost:8000${url}`;
        }
        return url;
    };

    return (
        <Card className="border-0 shadow-lg mt-3 overflow-hidden">
            <div className="card-header bg-primary py-3 d-flex justify-content-between align-items-center">
                <h6 className="card-title text-white mb-0">
                    <i className="ri-scan-2-line align-middle me-2"></i>
                    Đối soát OCR & Trích xuất Mistral AI (Trang {currentPage + 1}/{pages.length})
                </h6>
                <div className="d-flex gap-2">
                    <Button 
                        color="light" 
                        size="sm" 
                        className="btn-label waves-effect waves-light shadow-none"
                        onClick={() => onConfirm(pages.map(p => p.corrected_text).join('\n\n'))}
                        disabled={loading}
                    >
                        {loading ? (
                            <Spinner size="sm" className="me-2" />
                        ) : (
                            <i className="ri-check-line label-icon align-middle fs-16 me-2"></i>
                        )}
                        {loading ? "AI đang bóc tách..." : "Xác nhận tất cả"}
                    </Button>
                    <Button 
                        color="danger" 
                        outline 
                        size="sm" 
                        className="shadow-none border-white text-white"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Hủy bỏ
                    </Button>
                </div>
            </div>
            
            <CardBody className="p-0 bg-light-subtle">
                <Row className="g-0">
                    {/* LEFT SIDE: ORIGINAL IMAGE */}
                    <Col lg={6} className="border-end border-light">
                        <div className="bg-dark p-2 d-flex flex-column" style={{ height: '750px' }}>
                            <div className="d-flex justify-content-between align-items-center mb-2 px-2">
                                <Badge color="dark" className="fs-11 opacity-75">Bản gốc (Scan)</Badge>
                                <div className="btn-group">
                                    <Button 
                                        color="secondary" 
                                        size="sm" 
                                        className="py-0 px-2 shadow-none" 
                                        disabled={currentPage === 0}
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                    >
                                        <i className="ri-arrow-left-s-line"></i>
                                    </Button>
                                    <Button 
                                        color="secondary" 
                                        size="sm" 
                                        className="py-0 px-2 shadow-none" 
                                        disabled={currentPage === pages.length - 1}
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                    >
                                        <i className="ri-arrow-right-s-line"></i>
                                    </Button>
                                </div>
                            </div>
                            <SimpleBar style={{ height: '100%' }} className="bg-dark-subtle rounded">
                                <img 
                                    src={getImageUrl(page.image_url)} 
                                    alt={`Page ${currentPage + 1}`} 
                                    className="img-fluid d-block mx-auto" 
                                    style={{ boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}
                                />
                            </SimpleBar>
                        </div>
                    </Col>

                    {/* RIGHT SIDE: MISTRAL MARKDOWN RENDERING */}
                    <Col lg={6}>
                        <div className="bg-white p-4 h-100 d-flex flex-column" style={{ height: '750px' }}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <Badge color="success" className="fs-11 px-2 py-1">Kết quả Mistral OCR (Markdown)</Badge>
                                <div className="text-muted fs-11">
                                    <span className="me-2 text-info"><i className="ri-table-line align-middle me-1"></i>Hỗ trợ Bảng biểu</span>
                                </div>
                            </div>
                            
                            <SimpleBar className="flex-grow-1 border rounded p-4 bg-white shadow-inner markdown-vkt">
                                <div className="markdown-body">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {page.corrected_text}
                                    </ReactMarkdown>
                                </div>
                            </SimpleBar>

                            <div className="mt-4 p-3 bg-light rounded-3 border border-light-subtle">
                                <div className="d-flex align-items-start gap-3">
                                    <div className="flex-shrink-0">
                                        <div className="avatar-sm">
                                            <div className="avatar-title bg-info-subtle text-info rounded-circle fs-20">
                                                <i className="ri-magic-line"></i>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-grow-1">
                                        <h6 className="fs-14 fw-bold mb-1">Mistral Document Understanding</h6>
                                        <p className="text-muted mb-0 fs-13">
                                            Văn bản đã được trích xuất dưới dạng cấu trúc Markdown. Các bảng biểu và công thức pháp luật được giữ nguyên định dạng chính xác.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Col>
                </Row>
            </CardBody>
            <style jsx="true">{`
                .markdown-vkt .markdown-body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
                    font-size: 14px;
                    line-height: 1.6;
                    color: #24292e;
                }
                .markdown-vkt table {
                    border-collapse: collapse;
                    width: 100%;
                    margin-bottom: 16px;
                }
                .markdown-vkt table th, .markdown-vkt table td {
                    border: 1px solid #dfe2e5;
                    padding: 6px 13px;
                }
                .markdown-vkt table tr:nth-child(2n) {
                    background-color: #f6f8fa;
                }
                .markdown-vkt h1, .markdown-vkt h2, .markdown-vkt h3 {
                    margin-top: 24px;
                    margin-bottom: 16px;
                    font-weight: 600;
                    line-height: 1.25;
                    border-bottom: 1px solid #eaecef;
                    padding-bottom: .3em;
                }
            `}</style>
        </Card>
    );
};

export default OCRComparisonView;
