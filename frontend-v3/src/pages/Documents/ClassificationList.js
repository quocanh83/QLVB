import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Table, Spinner, Badge, Pagination, PaginationItem, PaginationLink, Input, Label, FormGroup } from 'reactstrap';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { getAuthHeader } from '../../helpers/api_helper';
import { ToastContainer, toast } from 'react-toastify';
import BreadCrumb from '../../Components/Common/BreadCrumb';

// Modern UI Components
import { 
    ModernHeader, ModernCard, ModernTable, ModernBadge 
} from '../../Components/Common/ModernUI';

const ClassificationList = () => {
    document.title = "Tiến độ góp ý | QLVB V3.0";

    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    // Master-Detail state
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [exporting, setExporting] = useState(false);

    // Filters
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        if (!selectedDoc) {
            fetchDocuments();
        }
        fetchCategories();
    }, [page, selectedDoc]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/documents/?page=${page}`, getAuthHeader());
            const data = (res.data && res.data.results) || res.results || res;
            setDocuments(Array.isArray(data) ? data : []);
            const count = res.data?.count || res.count || 0;
            if (count) {
                setTotalPages(Math.ceil(count / 10)); 
            }
        } catch (e) {
            toast.error("Lỗi khi tải danh sách dự thảo.");
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await axios.get('/api/settings/agency-categories/', getAuthHeader());
            const data = res.data?.results || res.results || res || [];
            setCategories(data);
        } catch (e) {
            console.error("Lỗi tải danh mục đơn vị", e);
        }
    };

    const handleExport = async (docId) => {
        setExporting(true);
        try {
            const response = await axios.get(`/api/documents/${docId}/export_consultation_status/`, {
                ...getAuthHeader(),
                params: {
                    status: filterStatus,
                    category_id: filterCategory
                },
                responseType: 'blob'
            });

            // Kiểm tra nếu trả về không phải là blob Word (có thể là lỗi JSON nếu interceptor không bắt được)
            if (response && response.type === 'application/json') {
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const errorData = JSON.parse(reader.result);
                        toast.error("Lỗi xuất file: " + (errorData.error || "Không xác định"));
                    } catch (e) {
                        toast.error("Lỗi hệ thống khi xuất báo cáo.");
                    }
                };
                reader.readAsText(response);
                return;
            }

            // Với interceptor trả về response.data, response ở đây chính là Blob
            const url = window.URL.createObjectURL(new Blob([response]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Tien_do_gop_y_${docId}.docx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Đã tải xuống báo cáo tiến độ!");
        } catch (e) {
            toast.error("Lỗi kết nối khi xuất báo cáo.");
        } finally {
            setExporting(false);
        }
    };

    const getProgressBadge = (summary) => {
        if (!summary || summary.length === 0) return { color: 'secondary', text: 'Chưa mời đơn vị' };
        const total = summary.length;
        const responded = summary.filter(s => s.has_response).length;
        
        if (responded === total) return { color: 'success', text: `Hoàn tất (${responded}/${total})` };
        if (responded === 0) return { color: 'warning', text: `Đang chờ (${responded}/${total})` };
        return { color: 'info', text: `Đang xử lý (${responded}/${total})` };
    };

    const renderDetailView = () => {
        let summary = selectedDoc.consultation_summary || [];
        
        // Frontend local filtering for UI display
        if (filterStatus === 'responded') summary = summary.filter(item => item.has_response);
        else if (filterStatus === 'pending') summary = summary.filter(item => !item.has_response);
        
        if (filterCategory !== 'all') {
            summary = summary.filter(item => String(item.agency_category_id) === String(filterCategory));
        }
        
        return (
            <div className="fade-in">
                <div className="mb-4 d-flex justify-content-between align-items-center">
                    <div>
                        <Button color="light" onClick={() => setSelectedDoc(null)} className="btn-label waves-effect">
                            <i className="ri-arrow-left-line label-icon align-middle fs-16 me-2"></i> Quay lại danh sách
                        </Button>
                    </div>
                    <div className="d-flex gap-2">
                        <Button color="success" onClick={() => handleExport(selectedDoc.id)} disabled={exporting} className="shadow-none btn-label waves-effect waves-light">
                            <i className="ri-file-word-line label-icon align-middle fs-16 me-2"></i> 
                            {exporting ? "Đang xử lý..." : "Xuất báo cáo Word"}
                        </Button>
                    </div>
                </div>

                <Card className="border-0 shadow-sm overflow-hidden mb-4">
                    <CardBody className="bg-light-subtle py-3">
                        <Row className="align-items-end g-3">
                            <Col md={4}>
                                <Label className="form-label text-muted fs-12 mb-1">Trạng thái góp ý</Label>
                                <Input type="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="form-select-sm">
                                    <option value="all">Tất cả đơn vị</option>
                                    <option value="responded">Đã góp ý</option>
                                    <option value="pending">Chưa góp ý</option>
                                </Input>
                            </Col>
                            <Col md={4}>
                                <Label className="form-label text-muted fs-12 mb-1">Nhóm đơn vị</Label>
                                <Input type="select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="form-select-sm">
                                    <option value="all">Tất cả nhóm</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </Input>
                            </Col>
                            <Col md={4}>
                                <div className="text-end text-muted fs-11 italic">
                                    * Bộ lọc sẽ được áp dụng khi xuất báo cáo.
                                </div>
                            </Col>
                        </Row>
                    </CardBody>
                </Card>

                <Card className="border-0 shadow-sm overflow-hidden">
                    <CardHeader className="p-3 bg-primary-subtle border-0">
                        <div className="d-flex justify-content-between align-items-center">
                            <h5 className="card-title mb-0 fw-bold text-primary">Theo dõi lấy ý kiến: {selectedDoc.project_name}</h5>
                            <span className="badge bg-primary text-white px-3 py-2 fs-12">
                                Hiển thị: {summary.length} cơ quan
                            </span>
                        </div>
                    </CardHeader>
                    <CardBody className="p-0">
                        <div className="table-responsive">
                            <Table className="table table-bordered align-middle mb-0">
                                <thead className="bg-light text-muted uppercase fs-12">
                                    <tr className="text-center">
                                        <th style={{ width: '50px' }}>STT</th>
                                        <th className="text-start">Cơ quan được lấy ý kiến</th>
                                        <th>Số hiệu văn bản góp ý</th>
                                        <th>Ngày ban hành</th>
                                        <th>Tệp đính kèm</th>
                                        <th>Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.length > 0 ? summary.map((item, index) => (
                                        <tr key={index}>
                                            <td className="text-center text-muted fw-bold">{index + 1}</td>
                                            <td className="fw-semibold text-white">{item.agency_name}</td>
                                            <td className="text-center">
                                                {item.has_response ? (
                                                    <span className="text-info fw-bold">{item.official_number}</span>
                                                ) : (
                                                    <span className="text-white-50 italic fs-12 opacity-50">Chưa có ý kiến</span>
                                                )}
                                            </td>
                                            <td className="text-center text-white-50">{item.official_date || '-'}</td>
                                            <td className="text-center">
                                                {item.attached_file ? (
                                                    <a href={item.attached_file} target="_blank" rel="noreferrer" className="btn btn-sm btn-soft-info px-2 py-1">
                                                        <i className="ri-download-2-line fs-14"></i> Tải về
                                                    </a>
                                                ) : <span className="text-muted">---</span>}
                                            </td>
                                            <td className="text-center">
                                                {item.has_response ? (
                                                    <Badge color="success" className="badge-outline-success px-3">Đã góp ý</Badge>
                                                ) : (
                                                    <Badge color="warning" className="badge-outline-warning px-3">Đang chờ</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" className="text-center py-5 text-muted italic">
                                                Không tìm thấy đơn vị nào thỏa mãn bộ lọc.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </CardBody>
                </Card>
            </div>
        );
    };

    return (
        <React.Fragment>
            <div className="designkit-wrapper designkit-layout-root">
                <div className="modern-page-content">
                    <Container fluid>
                        <ModernHeader 
                            title="Quản lý Tham vấn Dự thảo" 
                            subtitle="Theo dõi tiến độ lấy ý kiến và phản hồi từ các cơ quan cho từng dự thảo"
                        />
                        <ToastContainer closeButton={false} />

                        <Row className="mt-4">
                            <Col lg={12}>
                                <ModernCard>
                                    <ModernTable>
                                        <thead>
                                            <tr>
                                                <th className="text-center" style={{ width: '60px' }}>STT</th>
                                                <th>Tên Dự thảo</th>
                                                <th>Đơn vị chủ trì</th>
                                                <th className="text-center">Đơn vị tham vấn</th>
                                                <th className="text-center">Trạng thái phản hồi</th>
                                                <th className="text-center" style={{ width: '120px' }}>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="6" className="text-center py-5"><Spinner color="primary" /></td></tr>
                                            ) : documents.length > 0 ? (
                                                documents.map((doc, index) => {
                                                    const badge = getProgressBadge(doc.consultation_summary);
                                                    return (
                                                        <tr key={doc.id}>
                                                            <td className="text-center text-muted">{(page - 1) * 10 + index + 1}</td>
                                                            <td>
                                                                <Link to={`/documents/${doc.id}/consultation`} className="fw-bold text-white d-block">
                                                                    {doc.project_name}
                                                                </Link>
                                                                <small className="opacity-50 italic">Cập nhật: {new Date(doc.updated_at || doc.created_at).toLocaleDateString()}</small>
                                                            </td>
                                                            <td>{doc.drafting_agency || "Đang cập nhật"}</td>
                                                            <td className="text-center">
                                                                <ModernBadge color="secondary">
                                                                    {doc.consultation_summary?.length || 0}
                                                                </ModernBadge>
                                                            </td>
                                                            <td className="text-center">
                                                                <ModernBadge color={badge.color}>
                                                                    {badge.text}
                                                                </ModernBadge>
                                                            </td>
                                                            <td className="text-center">
                                                                <Link to={`/documents/${doc.id}/consultation`} className="modern-btn primary btn-sm">
                                                                    <i className="ri-arrow-right-up-line me-1"></i> Tham vấn
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr><td colSpan="6" className="text-center py-5 text-muted">Không tìm thấy dự thảo nào.</td></tr>
                                            )}
                                        </tbody>
                                    </ModernTable>

                                    {totalPages > 1 && (
                                        <div className="d-flex justify-content-end p-3 border-top" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                            <Pagination size="sm" className="pagination-separated mb-0">
                                                <PaginationItem disabled={page === 1}>
                                                    <PaginationLink previous onClick={() => setPage(page - 1)} />
                                                </PaginationItem>
                                                {[...Array(totalPages)].map((_, i) => (
                                                    <PaginationItem active={i + 1 === page} key={i}>
                                                        <PaginationLink onClick={() => setPage(i + 1)}>
                                                            {i + 1}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                ))}
                                                <PaginationItem disabled={page === totalPages}>
                                                    <PaginationLink next onClick={() => setPage(page + 1)} />
                                                </PaginationItem>
                                            </Pagination>
                                        </div>
                                    )}
                                </ModernCard>
                            </Col>
                        </Row>
                    </Container>
                </div>
            </div>
        </React.Fragment>
    );
};

export default ClassificationList;
