import React, { useState } from 'react';
import { Row, Col, Card, CardBody, Button, Badge } from 'reactstrap';
import SimpleBar from 'simplebar-react';

const OCRComparisonView = ({ pages, onConfirm, onCancel }) => {
    const [currentPage, setCurrentPage] = useState(0);

    if (!pages || pages.length === 0) return null;

    const page = pages[currentPage];

    // Helper to render diffs with highlighting
    const renderWithHighlights = (diffs) => {
        return diffs.map((segment, idx) => {
            if (segment.type === 'added') {
                return (
                    <span 
                        key={idx} 
                        className="bg-success-subtle text-success px-1 rounded mx-1 fw-medium border-bottom border-success border-opacity-25"
                        title="AI đã thêm/sửa đoạn này"
                    >
                        {segment.text}
                    </span>
                );
            }
            if (segment.type === 'removed') {
                return (
                    <span 
                        key={idx} 
                        className="text-danger text-decoration-line-through mx-1 opacity-50"
                        style={{ fontSize: '0.9em' }}
                        title="Nguyên bản (bị AI thay thế)"
                    >
                        {segment.text}
                    </span>
                );
            }
            return <span key={idx}>{segment.text}</span>;
        });
    };

    return (
        <Card className="border-0 shadow-lg mt-3 overflow-hidden">
            <div className="card-header bg-primary py-3 d-flex justify-content-between align-items-center">
                <h6 className="card-title text-white mb-0">
                    <i className="ri-scan-2-line align-middle me-2"></i>
                    Đối soát OCR & Hiệu chỉnh AI (Trang {currentPage + 1}/{pages.length})
                </h6>
                <div className="d-flex gap-2">
                    <Button 
                        color="light" 
                        size="sm" 
                        className="btn-label waves-effect waves-light shadow-none"
                        onClick={() => onConfirm(pages.map(p => p.corrected_text).join('\n\n'))}
                    >
                        <i className="ri-check-line label-icon align-middle fs-16 me-2"></i> Xác nhận tất cả
                    </Button>
                    <Button 
                        color="danger" 
                        outline 
                        size="sm" 
                        className="shadow-none border-white text-white"
                        onClick={onCancel}
                    >
                        Hủy bỏ
                    </Button>
                </div>
            </div>
            
            <CardBody className="p-0 bg-light-subtle">
                <Row className="g-0">
                    {/* LEFT SIDE: ORIGINAL IMAGE */}
                    <Col lg={6} className="border-end border-light">
                        <div className="bg-dark p-2 d-flex flex-column" style={{ height: '700px' }}>
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
                                    src={page.image_url} 
                                    alt={`Page ${currentPage + 1}`} 
                                    className="img-fluid d-block mx-auto" 
                                    style={{ boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}
                                />
                            </SimpleBar>
                        </div>
                    </Col>

                    {/* RIGHT SIDE: CORRECTED TEXT */}
                    <Col lg={6}>
                        <div className="bg-white p-4 h-100 d-flex flex-column" style={{ height: '700px' }}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <Badge color="success" className="fs-11 px-2 py-1">Văn bản đã chuẩn hóa bởi AI</Badge>
                                <div className="text-muted fs-11">
                                    <span className="me-2"><i className="ri-checkbox-blank-circle-fill text-success fs-10 align-middle"></i> AI Sửa</span>
                                    <span><i className="ri-checkbox-blank-circle-fill text-danger fs-10 align-middle opacity-50"></i> Gốc (Bỏ)</span>
                                </div>
                            </div>
                            
                            <SimpleBar className="flex-grow-1 border rounded p-4 bg-body-tertiary shadow-inner">
                                <div 
                                    className="fs-15 lh-lg text-body font-monospace" 
                                    style={{ whiteSpace: 'pre-wrap', fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}
                                >
                                    {renderWithHighlights(page.diffs)}
                                </div>
                            </SimpleBar>

                            <div className="mt-4 p-3 bg-light rounded-3 border border-light-subtle">
                                <div className="d-flex align-items-start gap-3">
                                    <div className="flex-shrink-0">
                                        <div className="avatar-sm">
                                            <div className="avatar-title bg-info-subtle text-info rounded-circle fs-20">
                                                <i className="ri-lightbulb-flash-line"></i>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-grow-1">
                                        <h6 className="fs-14 fw-bold mb-1">Gợi ý</h6>
                                        <p className="text-muted mb-0 fs-13">
                                            AI đã tự động sửa các lỗi chính tả phổ biến và bù đắp các chữ mờ dựa trên ngữ cảnh pháp luật. 
                                            Bạn hãy kiểm tra kỹ các vùng <span className="text-success fw-bold">màu xanh</span> trước khi xác nhận.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Col>
                </Row>
            </CardBody>
        </Card>
    );
};

export default OCRComparisonView;
