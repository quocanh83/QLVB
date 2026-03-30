import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Table, Spinner, Badge, Pagination, PaginationItem, PaginationLink } from 'reactstrap';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { getAuthHeader } from '../../helpers/api_helper';
import { ToastContainer, toast } from 'react-toastify';
import BreadCrumb from '../../Components/Common/BreadCrumb';

const ClassificationList = () => {
    document.title = "Quản lý Phân loại Dự thảo | QLVB V3.0";

    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchDocuments();
    }, [page]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/documents/?page=${page}`, getAuthHeader());
            const data = res.results || res;
            setDocuments(Array.isArray(data) ? data : []);
            if (res.count) {
                setTotalPages(Math.ceil(res.count / 10)); // Assuming 10 per page
            }
        } catch (e) {
            toast.error("Lỗi khi tải danh sách dự thảo.");
        } finally {
            setLoading(false);
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

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Quản lý Phân loại Dự thảo" pageTitle="QLVB" />
                    <ToastContainer closeButton={false} />

                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader className="border-0">
                                    <div className="d-flex align-items-center">
                                        <h5 className="card-title mb-0 flex-grow-1">Theo dõi tiến độ góp ý theo từng dự thảo</h5>
                                    </div>
                                </CardHeader>
                                <CardBody className="border border-dashed border-start-0 border-end-0">
                                    <div className="table-responsive">
                                        <Table className="table-centered table-nowrap mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th style={{ width: '50px' }}>STT</th>
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
                                                                <td className="text-center">{(page - 1) * 10 + index + 1}</td>
                                                                <td className="fw-medium">
                                                                    <Link to={`/documents/${doc.id}`} className="text-body d-block text-truncate" style={{maxWidth: '400px'}}>
                                                                        {doc.project_name}
                                                                    </Link>
                                                                    <small className="text-muted">{new Date(doc.created_at).toLocaleDateString()}</small>
                                                                </td>
                                                                <td>{doc.drafting_agency}</td>
                                                                <td className="text-center">
                                                                    <Badge color="light" className="text-body border">{doc.consultation_summary?.length || 0}</Badge>
                                                                </td>
                                                                <td className="text-center">
                                                                    <Badge color={badge.color} className="badge-soft-lg">
                                                                        {badge.text}
                                                                    </Badge>
                                                                </td>
                                                                <td className="text-center">
                                                                    <Link to={`/documents/${doc.id}/classification`} className="btn btn-sm btn-soft-primary">
                                                                        <i className="ri-search-eye-line align-bottom me-1"></i> Xem bảng chi tiết
                                                                                                            </Link>
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
                                        <div className="d-flex justify-content-end mt-3">
                                            <Pagination>
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
                        </Col>
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default ClassificationList;
