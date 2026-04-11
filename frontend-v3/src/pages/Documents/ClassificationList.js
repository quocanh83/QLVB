import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Table, Spinner, Badge, Pagination, PaginationItem, PaginationLink } from 'reactstrap';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { getAuthHeader } from '../../helpers/api_helper';
import { ToastContainer, toast } from 'react-toastify';
import BreadCrumb from '../../Components/Common/BreadCrumb';

const ClassificationList = () => {
    document.title = "Tiến độ góp ý | QLVB V3.0";

    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    // Master-Detail state
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (!selectedDoc) {
            fetchDocuments();
        }
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

    const handleExport = async (docId) => {
        setExporting(true);
        try {
            const response = await axios.get(`/api/documents/${docId}/export_consultation_status/`, {
                ...getAuthHeader(),
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Tien_do_gop_y_${docId}.docx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Đã tải xuống báo cáo tiến độ!");
        } catch (e) {
            toast.error("Lỗi khi xuất báo cáo.");
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
        const summary = selectedDoc.consultation_summary || [];
        return (
            <div className="fade-in">
                <div className="mb-4 d-flex justify-content-between align-items-center">
                    <div>
                        <Button color="light" onClick={() => setSelectedDoc(null)} className="btn-label waves-effect">
                            <i className="ri-arrow-left-line label-icon align-middle fs-16 me-2"></i> Quay lại danh sách
                        </Button>
                    </div>
                    <div>
                        <Button color="success" onClick={() => handleExport(selectedDoc.id)} disabled={exporting} className="shadow-none">
                            {exporting ? <Spinner size="sm" className="me-2" /> : <i className="ri-file-word-line align-bottom me-1"></i>}
                            Xuất báo cáo tiến độ
                        </Button>
                    </div>
                </div>

                <Card className="border-0 shadow-sm overflow-hidden">
                    <CardHeader className="p-3 bg-primary-subtle border-0">
                        <div className="d-flex justify-content-between align-items-center">
                            <h5 className="card-title mb-0 fw-bold text-primary">Theo dõi lấy ý kiến: {selectedDoc.project_name}</h5>
                            <span className="badge bg-primary text-white px-3 py-2 fs-12">
                                Tổng số: {summary.length} cơ quan
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
                                                Chưa có cơ quan nào được chọn để lấy ý kiến cho bản dự thảo này.
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
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title={selectedDoc ? "Chi tiết tiến độ" : "Tiến độ góp ý"} pageTitle="QLVB" />
                    <ToastContainer closeButton={false} />

                    <Row>
                        <Col lg={12}>
                            {selectedDoc ? renderDetailView() : (
                                <Card className="border-0 shadow-sm">
                                    <CardHeader className="border-0 bg-light-subtle">
                                        <div className="d-flex align-items-center">
                                            <h5 className="card-title mb-0 flex-grow-1 fw-bold">Theo dõi tiến độ góp ý theo từng dự thảo</h5>
                                        </div>
                                    </CardHeader>
                                    <CardBody className="p-0">
                                        <div className="table-responsive">
                                            <Table className="table-centered table-nowrap mb-0 table-hover">
                                                <thead className="table-light text-muted uppercase fs-11">
                                                    <tr>
                                                        <th className="text-center" style={{ width: '50px' }}>STT</th>
                                                        <th>Tên Dự thảo</th>
                                                        <th>Đơn vị chủ trì</th>
                                                        <th className="text-center">Số đơn vị mời</th>
                                                        <th className="text-center">Tiến độ phản hồi</th>
                                                        <th className="text-center">Thao tác</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {loading ? (
                                                        <tr>
                                                            <td colSpan="6" className="text-center py-5">
                                                                <Spinner color="primary" />
                                                            </td>
                                                        </tr>
                                                    ) : documents.length > 0 ? (
                                                        documents.map((doc, index) => {
                                                            const badge = getProgressBadge(doc.consultation_summary);
                                                            return (
                                                                <tr key={doc.id}>
                                                                    <td className="text-center text-muted">{(page - 1) * 10 + index + 1}</td>
                                                                    <td className="fw-medium">
                                                                        <Link to="#" onClick={(e) => { e.preventDefault(); setSelectedDoc(doc); }} className="text-white d-block text-truncate fw-bold" style={{maxWidth: '450px'}}>
                                                                            {doc.project_name}
                                                                        </Link>
                                                                        <small className="text-muted-emphasis">{new Date(doc.created_at).toLocaleDateString()}</small>
                                                                    </td>
                                                                    <td className="text-body-emphasis">{doc.drafting_agency}</td>
                                                                    <td className="text-center">
                                                                        <Badge color="light" className="text-body border">{doc.consultation_summary?.length || 0}</Badge>
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <Badge color={badge.color} className="badge-soft-lg fs-11" style={{ minWidth: '100px' }}>
                                                                            {badge.text}
                                                                        </Badge>
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <Button color="info" outline size="sm" className="btn-icon" onClick={() => setSelectedDoc(doc)}>
                                                                            <i className="ri-search-eye-line fs-15"></i>
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="6" className="text-center py-4 text-muted">Không tìm thấy dự thảo nào.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </Table>
                                        </div>

                                        {totalPages > 1 && (
                                            <div className="d-flex justify-content-end p-3 border-top">
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
                                    </CardBody>
                                </Card>
                            )}
                        </Col>
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default ClassificationList;
