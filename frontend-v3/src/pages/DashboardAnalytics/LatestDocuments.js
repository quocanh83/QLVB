import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody, CardHeader, Col } from 'reactstrap';

const LatestDocuments = ({ docs }) => {
    return (
        <React.Fragment>
            <Col xl={12}>
                <Card>
                    <CardHeader className="align-items-center d-flex">
                        <h4 className="card-title mb-0 flex-grow-1">Danh sách Văn bản mới nhất</h4>
                        <div className="flex-shrink-0">
                            <Link to="/documents" className="btn btn-soft-info btn-sm">
                                Xem tất cả
                            </Link>
                        </div>
                    </CardHeader>
                    <CardBody>
                        <div className="table-responsive table-card">
                            <table className="table align-middle table-borderless table-centered table-nowrap mb-0">
                                <thead className="text-muted table-light">
                                    <tr>
                                        <th scope="col">Tên Dự thảo</th>
                                        <th scope="col">Tổng Góp ý</th>
                                        <th scope="col">Đã Giải trình</th>
                                        <th scope="col">Tỷ lệ</th>
                                        <th scope="col">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(docs || []).slice(0, 5).map((item, index) => (
                                        <tr key={index}>
                                            <td>
                                                <Link to={`/documents/${item.id}`} className="fw-medium link-primary">
                                                    {item.project_name}
                                                </Link>
                                            </td>
                                            <td>{item.total_feedbacks}</td>
                                            <td>{item.resolved_feedbacks}</td>
                                            <td>
                                                <span className="text-success">
                                                    {item.total_feedbacks > 0 
                                                        ? Math.round((item.resolved_feedbacks / item.total_feedbacks) * 100) 
                                                        : 0}%
                                                </span>
                                            </td>
                                            <td>
                                                <span className={"badge bg-" + (item.total_feedbacks === item.resolved_feedbacks && item.total_feedbacks > 0 ? "success" : "warning") + "-subtle text-" + (item.total_feedbacks === item.resolved_feedbacks && item.total_feedbacks > 0 ? "success" : "warning")}>
                                                    {item.total_feedbacks === item.resolved_feedbacks && item.total_feedbacks > 0 ? "Hoàn thành" : "Đang xử lý"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardBody>
                </Card>
            </Col>
        </React.Fragment>
    );
};

export default LatestDocuments;
