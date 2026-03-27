import React, { useState, useEffect } from "react";
import { Card, CardBody, CardHeader, Col, Table, Badge } from "reactstrap";
import { Link } from "react-router-dom";

const RecentDocuments = ({ docs, title }) => {
    const tableDocs = (docs || []).map(d => ({
        id: d.id ? `#QLVB-${d.id.toString().slice(-3)}` : "N/A",
        title: d.project_name || "Không có tiêu đề",
        agency: d.drafting_agency || "Đang cập nhật",
        total_feedbacks: d.total_feedbacks || 0,
        resolved_feedbacks: d.resolved_feedbacks || 0,
        status: d.status || "Đang xử lý",
        statusColor: (d.status === 'Completed' || d.status === 'Hoàn thành') ? 'success' : (d.status === 'Overdue' || d.status === 'Quá hạn') ? 'danger' : 'warning'
    }));

    return (
        <Col xl={12}>
            <Card>
                <CardHeader className="align-items-center d-flex">
                    <h4 className="card-title mb-0 flex-grow-1">{title || "Dự thảo gần đây"}</h4>
                    <div className="flex-shrink-0">
                        <Link to="/documents" className="btn btn-soft-info btn-sm">
                            <i className="ri-file-list-3-line align-bottom"></i> Xem tất cả
                        </Link>
                    </div>
                </CardHeader>
                <CardBody>
                    <div className="table-responsive table-card">
                        <Table className="table table-borderless table-centered align-middle table-nowrap mb-0">
                            <thead className="text-muted table-light">
                                <tr>
                                    <th scope="col">Mã hồ sơ</th>
                                    <th scope="col">Tên dự thảo</th>
                                    <th scope="col">Cơ quan chủ trì</th>
                                    <th scope="col">Tổng góp ý</th>
                                    <th scope="col">Giải trình</th>
                                    <th scope="col">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableDocs.map((item, key) => (
                                    <tr key={key}>
                                        <td><Link to="/documents" className="fw-medium link-primary">{item.id}</Link></td>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                <div className="flex-grow-1 fw-medium">{item.title}</div>
                                            </div>
                                        </td>
                                        <td>{item.agency}</td>
                                        <td><Badge color="warning" className="badge-soft-warning">{item.total_feedbacks}</Badge></td>
                                        <td><Badge color="success" className="badge-soft-success">{item.resolved_feedbacks}</Badge></td>
                                        <td>
                                            <Badge color={item.statusColor} className="badge-soft-vibrant">{item.status}</Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </CardBody>
            </Card>
        </Col>
    );
};

export default RecentDocuments;
