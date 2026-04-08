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
            <div className="premium-card-dark mb-4 p-0">
                <div className="card-header align-items-center d-flex border-0">
                    <h4 className="card-title mb-0 flex-grow-1">{title || "Dự thảo gần đây"}</h4>
                    <div className="flex-shrink-0">
                        <Link to="/documents" className="btn btn-soft-light btn-sm text-white-50 border-white-10">
                            <i className="ri-file-list-3-line align-bottom me-1"></i> Xem tất cả
                        </Link>
                    </div>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <Table className="table table-centered align-middle table-nowrap mb-0">
                            <thead className="label-modern bg-white-05 border-0">
                                <tr>
                                    <th scope="col" className="ps-4">Mã hồ sơ</th>
                                    <th scope="col">Tên dự thảo</th>
                                    <th scope="col">Cơ quan chủ trì</th>
                                    <th scope="col" className="text-center">Tổng góp ý</th>
                                    <th scope="col" className="text-center">Giải trình</th>
                                    <th scope="col" className="pe-4 text-center">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="border-0">
                                {tableDocs.map((item, key) => (
                                    <tr key={key} className="border-bottom border-white-05">
                                        <td className="ps-4">
                                            <Link to="/documents" className="fw-semibold text-info" style={{ fontSize: '0.8rem' }}>{item.id}</Link>
                                        </td>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                <div className="flex-grow-1 fw-medium text-white-80" style={{ fontSize: '0.85rem' }}>{item.title}</div>
                                            </div>
                                        </td>
                                        <td className="text-muted" style={{ fontSize: '0.8rem' }}>{item.agency}</td>
                                        <td className="text-center">
                                            <span className="badge bg-warning-subtle text-warning border-none px-2 py-1">{item.total_feedbacks}</span>
                                        </td>
                                        <td className="text-center">
                                            <span className="badge bg-success-subtle text-success border-none px-2 py-1">{item.resolved_feedbacks}</span>
                                        </td>
                                        <td className="pe-4 text-center">
                                            <span className={`badge bg-${item.statusColor}-subtle text-${item.statusColor} border-none px-3 py-1 rounded-pill`} style={{ fontSize: '0.7rem' }}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </div>
            </div>
        </Col>
    );
};

export default RecentDocuments;
