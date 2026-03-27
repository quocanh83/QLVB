import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Col, Row, Badge, Button } from 'reactstrap';
import SimpleBar from "simplebar-react";
import { Link } from 'react-router-dom';

// Using some existing avatars or placeholders
const avatar1 = "https://themesbrand.com/velzon/html/master/assets/images/users/avatar-1.jpg";
const avatar2 = "https://themesbrand.com/velzon/html/master/assets/images/users/avatar-2.jpg";
const avatar3 = "https://themesbrand.com/velzon/html/master/assets/images/users/avatar-3.jpg";

const StaffPerformance = ({ staffData }) => {
    const [selectedStaff, setSelectedStaff] = useState(staffData && staffData.length > 0 ? staffData[0] : null);

    // Update selected staff if staffData changes and none selected
    useEffect(() => {
        if (!selectedStaff && staffData && staffData.length > 0) {
            setSelectedStaff(staffData[0]);
        }
    }, [staffData]);

    if (!staffData || staffData.length === 0) {
        return (
            <Col xl={4}>
                <Card className="card-height-100">
                    <CardHeader><h4 className="card-title mb-0">Hiệu suất Chuyên viên</h4></CardHeader>
                    <CardBody><p className="text-muted">Chưa có dữ liệu chuyên viên.</p></CardBody>
                </Card>
            </Col>
        );
    }

    return (
        <Col xl={4}>
            <Card className="card-height-100">
                <CardHeader className="align-items-center d-flex">
                    <h4 className="card-title mb-0 flex-grow-1">Hiệu suất Chuyên viên</h4>
                    <div className="flex-shrink-0">
                        <Link to="#" className="text-primary fw-medium">Xem tất cả</Link>
                    </div>
                </CardHeader>
                <CardBody className="p-0">
                    <Row className="g-0">
                        <Col lg={6}>
                            <SimpleBar style={{ maxHeight: "310px" }}>
                                <ul className="list-group list-group-flush">
                                    {staffData.map((staff, index) => (
                                        <li 
                                            key={index} 
                                            className={`list-group-item list-group-item-action border-0 ${selectedStaff?.id === staff?.id ? 'bg-light' : ''}`}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setSelectedStaff(staff)}
                                        >
                                            <div className="d-flex align-items-center">
                                                <div className="flex-shrink-0 me-3">
                                                    <img src={staff.avatar} alt="" className="avatar-xs rounded-circle" />
                                                </div>
                                                <div className="flex-grow-1 overflow-hidden">
                                                    <h5 className="fs-13 mb-0 text-truncate">{staff.name}</h5>
                                                    <p className="fs-12 text-muted mb-0">{staff.resolved || 0} giải trình</p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </SimpleBar>
                        </Col>
                        <Col lg={6} className="border-start">
                            <div className="p-3 text-center">
                                <div className="avatar-md mx-auto mb-3">
                                    <img src={selectedStaff?.avatar || avatar1} alt="" className="img-thumbnail rounded-circle" />
                                </div>
                                <h5 className="fs-15 mb-1">{selectedStaff?.name || "N/A"}</h5>
                                <p className="text-muted">{selectedStaff?.role || "N/A"}</p>
                                
                                <div className="mb-3">
                                    <Badge color={selectedStaff?.resolved > 10 ? "success" : "warning"} className="fs-11">
                                        {selectedStaff?.resolved > 10 ? "Hiệu suất cao" : "Đang xử lý"}
                                    </Badge>
                                </div>

                                <Row className="mt-4">
                                    <Col xs={6}>
                                        <h6 className="mb-1">{selectedStaff?.resolved || 0}</h6>
                                        <p className="text-muted fs-12 mb-0">Giải trình</p>
                                    </Col>
                                    <Col xs={6}>
                                        <h6 className="mb-1">{selectedStaff?.total || 0}</h6>
                                        <p className="text-muted fs-12 mb-0">Hồ sơ</p>
                                    </Col>
                                </Row>
                                
                                <div className="mt-4">
                                    <Button color="primary" size="sm" className="w-100">Xem báo cáo</Button>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </CardBody>
            </Card>
        </Col>
    );
};

export default StaffPerformance;
