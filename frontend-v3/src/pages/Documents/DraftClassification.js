import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Table, Spinner } from 'reactstrap';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { getAuthHeader } from '../../helpers/api_helper';
import { ToastContainer, toast } from 'react-toastify';
import BreadCrumb from '../../Components/Common/BreadCrumb';

const DraftClassification = () => {
    const { id } = useParams(); // Document ID
    document.title = "Bảng phân loại Dự thảo | QLVB V3.0";

    const [documentInfo, setDocumentInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDocumentInfo();
    }, [id]);

    const fetchDocumentInfo = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/documents/${id}/`, getAuthHeader());
            const data = res.results || res;
            setDocumentInfo(data);
        } catch (e) {
            toast.error("Lỗi khi tải thông tin dự thảo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Bảng phân loại Dự thảo" pageTitle={documentInfo?.project_name || "Dự thảo"} />
                    <ToastContainer closeButton={false} />

                    <div className="mb-3 d-flex justify-content-between align-items-center">
                        <Link to={`/documents/${id}`} className="btn btn-soft-secondary btn-sm">
                            <i className="ri-arrow-left-line align-bottom me-1"></i> Quay lại chi tiết
                        </Link>
                        <div className="d-flex gap-2">
                             <Link to={`/documents/${id}/responses`} className="btn btn-sm btn-soft-primary">
                                <i className="ri-external-link-line align-bottom me-1"></i> Quản lý văn bản góp ý
                            </Link>
                        </div>
                    </div>

                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader className="p-3 bg-light-subtle">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <h5 className="card-title mb-0 fw-bold">Theo dõi lấy ý kiến các cơ quan</h5>
                                        <span className="badge bg-primary-subtle text-primary">
                                            Tổng số: {documentInfo?.consultation_summary?.length || 0} cơ quan
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardBody>
                                    <div className="table-responsive">
                                        <Table className="table table-bordered table-hover align-middle mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th className="text-center" style={{ width: '50px' }}>STT</th>
                                                    <th>Cơ quan được lấy ý kiến</th>
                                                    <th>Số hiệu văn bản góp ý</th>
                                                    <th>Ngày ban hành</th>
                                                    <th className="text-center">Tệp đính kèm</th>
                                                    <th className="text-center">Trạng thái</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading ? (
                                                    <tr>
                                                        <td colSpan="6" className="text-center py-5">
                                                            <Spinner color="primary" />
                                                        </td>
                                                    </tr>
                                                ) : documentInfo?.consultation_summary && documentInfo.consultation_summary.length > 0 ? (
                                                    documentInfo.consultation_summary.map((item, index) => (
                                                        <tr key={index}>
                                                            <td className="text-center">{index + 1}</td>
                                                            <td className="fw-medium text-dark">{item.agency_name}</td>
                                                            <td>
                                                                {item.has_response ? (
                                                                    <span className="text-primary fw-medium">{item.official_number}</span>
                                                                ) : (
                                                                    <span className="text-danger fw-medium">Chưa có ý kiến</span>
                                                                )}
                                                            </td>
                                                            <td>{item.official_date || '-'}</td>
                                                            <td className="text-center">
                                                                {item.attached_file ? (
                                                                    <a href={item.attached_file} target="_blank" rel="noreferrer" className="btn btn-sm btn-soft-primary px-2 py-1">
                                                                        <i className="ri-download-2-line fs-14"></i> Tải về
                                                                    </a>
                                                                ) : '-'}
                                                            </td>
                                                            <td className="text-center">
                                                                {item.has_response ? (
                                                                    <span className="badge bg-success-subtle text-success border border-success-subtle px-3">Đã góp ý</span>
                                                                ) : (
                                                                    <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-3">Đang chờ</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="6" className="text-center py-5">
                                                            <div className="text-muted">
                                                                <i className="ri-information-line fs-24 mb-2 d-block text-warning"></i>
                                                                Chưa có cơ quan nào được chọn để lấy ý kiến cho bản dự thảo này.
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </Table>
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

export default DraftClassification;
