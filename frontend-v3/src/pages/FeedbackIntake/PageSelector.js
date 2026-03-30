import React, { useState, useEffect } from 'react';
import { Row, Col, Card, CardBody, Button, Badge, Input, Label, FormGroup } from 'reactstrap';
import SimpleBar from 'simplebar-react';

const PageSelector = ({ previews, totalPages, onProcessedSelect, loading }) => {
    const [selectedPages, setSelectedPages] = useState([]);
    const [rangeText, setRangeText] = useState('');

    // Khởi tạo: mặc định chọn tất cả
    useEffect(() => {
        const all = Array.from({ length: totalPages }, (_, i) => i + 1);
        setSelectedPages(all);
        setRangeText(all.join(', '));
    }, [totalPages]);

    // Đồng bộ từ Checkbox sang RangeText
    const togglePage = (pageNumber) => {
        let newSelection;
        if (selectedPages.includes(pageNumber)) {
            newSelection = selectedPages.filter(p => p !== pageNumber);
        } else {
            newSelection = [...selectedPages, pageNumber].sort((a, b) => a - b);
        }
        setSelectedPages(newSelection);
        setRangeText(newSelection.join(', '));
    };

    // Đồng bộ từ RangeText sang Checkbox (khi người dùng gõ xong)
    const handleRangeChange = (e) => {
        const val = e.target.value;
        setRangeText(val);
        
        // Parse range: "1, 2, 4-6"
        const indices = new Set();
        const parts = val.split(',').map(p => p.trim());
        parts.forEach(part => {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                if (start && end) {
                    for (let i = start; i <= end; i++) {
                        if (i >= 1 && i <= totalPages) indices.add(i);
                    }
                }
            } else {
                const num = parseInt(part);
                if (num >= 1 && num <= totalPages) indices.add(num);
            }
        });
        setSelectedPages(Array.from(indices).sort((a, b) => a - b));
    };

    const handleConfirm = () => {
        onProcessedSelect(rangeText);
    };

    return (
        <Card className="border-0 shadow-lg mt-3 overflow-hidden">
            <CardBody className="p-0">
                <div className="bg-light p-4 border-bottom d-flex justify-content-between align-items-center">
                    <div>
                        <h5 className="fw-bold mb-1">Thiết lập phạm vi quét OCR</h5>
                        <p className="text-muted mb-0 small">Chọn các trang chứa nội dung góp ý để tiết kiệm chi phí Mistral AI.</p>
                    </div>
                    <div className="text-end">
                        <Button 
                            color="primary" 
                            className="px-4 shadow-none" 
                            onClick={handleConfirm}
                            disabled={selectedPages.length === 0 || loading}
                        >
                            {loading ? "Đang tải file..." : `Bắt đầu trích xuất ${selectedPages.length} trang`}
                        </Button>
                    </div>
                </div>

                <div className="p-4 bg-body">
                    <FormGroup className="mb-4">
                        <Label className="fw-bold fs-13 text-uppercase text-primary mb-2">Nhập dải trang (VD: 1, 3, 5-10)</Label>
                        <Input 
                            type="text" 
                            className="form-control-lg border-primary border-opacity-25 shadow-sm"
                            placeholder="Ví dụ: 2, 4 hoặc 1-5"
                            value={rangeText}
                            onChange={handleRangeChange}
                        />
                    </FormGroup>

                    <h6 className="fw-bold fs-13 text-uppercase text-muted mb-3">Hoặc tích chọn trực quan:</h6>
                    
                    <SimpleBar style={{ maxHeight: '500px' }} className="pe-2">
                        <Row className="row-cols-2 row-cols-md-4 row-cols-lg-5 g-3">
                            {previews.map((url, idx) => {
                                const pageNum = idx + 1;
                                const isSelected = selectedPages.includes(pageNum);
                                return (
                                    <Col key={idx}>
                                        <div 
                                            className={`position-relative rounded-3 border-2 transition-all p-1 cursor-pointer ${isSelected ? 'border-primary bg-primary-subtle shadow-sm' : 'border-light hover-border-primary'}`}
                                            onClick={() => togglePage(pageNum)}
                                            style={{ cursor: 'pointer', borderStyle: 'solid' }}
                                        >
                                            <div className="position-absolute top-0 end-0 m-2 z-3">
                                                <div className={`rounded-circle d-flex align-items-center justify-content-center shadow-sm ${isSelected ? 'bg-primary text-white' : 'bg-white border'}`} style={{ width: '24px', height: '24px' }}>
                                                    {isSelected && <i className="ri-check-line fs-14"></i>}
                                                </div>
                                            </div>
                                            <img 
                                                src={url.startsWith('http') ? url : (process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '')) + url} 
                                                alt={`Trang ${pageNum}`}
                                                className="img-fluid rounded shadow-sm d-block mx-auto mb-2"
                                                style={{ height: '180px', objectFit: 'contain' }}
                                            />
                                            <div className="text-center pb-1">
                                                <span className={`fw-bold fs-12 ${isSelected ? 'text-primary' : 'text-muted'}`}>TRANG {pageNum}</span>
                                            </div>
                                        </div>
                                    </Col>
                                );
                            })}
                        </Row>
                    </SimpleBar>
                </div>
            </CardBody>
            <style jsx="true">{`
                .hover-border-primary:hover {
                    border-color: rgba(64, 81, 137, 0.5) !important;
                }
                .transition-all {
                    transition: all 0.2s ease-in-out;
                }
            `}</style>
        </Card>
    );
};

export default PageSelector;
