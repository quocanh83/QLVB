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
            <div className="premium-card-dark mb-4 card-height-100">
                <div className="card-header align-items-center d-flex border-0">
                    <h4 className="card-title mb-0 flex-grow-1">Hiệu suất Chuyên viên</h4>
                    <div className="flex-shrink-0">
                        <Link to="#" className="text-info fw-medium" style={{ fontSize: '0.8rem' }}>Xem tất cả</Link>
                    </div>
                </div>
                <div className="card-body p-0">
                    <Row className="g-0">
                        <Col lg={6}>
                            <SimpleBar style={{ maxHeight: "310px" }}>
                                <ul className="list-group list-group-flush border-0">
                                    {staffData.map((staff, index) => (
                                        <li 
                                            key={index} 
                                            className={`list-group-item list-group-item-action border-0 bg-transparent ${selectedStaff?.id === staff?.id ? 'bg-white-05' : ''}`}
                                            style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                                            onClick={() => setSelectedStaff(staff)}
                                        >
                                            <div className="d-flex align-items-center p-1">
                                                <div className="flex-shrink-0 me-3">
                                                    <img src={staff.avatar} alt="" className="avatar-xs rounded-circle border border-white-10" />
                                                </div>
                                                <div className="flex-grow-1 overflow-hidden">
                                                    <h5 className="fs-13 mb-0 text-truncate text-white-80">{staff.name}</h5>
                                                    <p className="fs-11 text-muted mb-0">{staff.resolved || 0} giải trình</p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </SimpleBar>
                        </Col>
                        <Col lg={6} className="border-start border-white-05">
                            <div className="p-3 text-center">
                                <div className="avatar-md mx-auto mb-3">
                                    <img src={selectedStaff?.avatar || avatar1} alt="" className="img-thumbnail rounded-circle bg-transparent border-white-10 p-1" />
                                </div>
                                <h5 className="fs-15 mb-1 text-white">{selectedStaff?.name || "N/A"}</h5>
                                <p className="text-muted fs-12">{selectedStaff?.role || "N/A"}</p>
                                
                                <div className="mb-3">
                                    <span className={`badge ${selectedStaff?.resolved > 10 ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning"} fs-11 px-3 py-1 rounded-pill`}>
                                        {selectedStaff?.resolved > 10 ? "Hiệu suất cao" : "Đang xử lý"}
                                    </span>
                                </div>

                                <Row className="mt-4 gx-0">
                                    <Col xs={6} className="border-end border-white-05">
                                        <h6 className="mb-1 text-white">{selectedStaff?.resolved || 0}</h6>
                                        <p className="label-modern fs-10 mb-0">Giải trình</p>
                                    </Col>
                                    <Col xs={6}>
                                        <h6 className="mb-1 text-white">{selectedStaff?.total || 0}</h6>
                                        <p className="label-modern fs-10 mb-0">Hồ sơ</p>
                                    </Col>
                                </Row>
                                
                                <div className="mt-4">
                                    <Button color="light" size="sm" className="btn-modern-ghost w-100 border-white-10 text-white-50">Xem báo cáo</Button>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>
            </div>
        </Col>
    );
};

export default StaffPerformance;
