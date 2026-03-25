import React from 'react';
import { Card, CardBody, Col, Row } from 'reactstrap';
import CountUp from "react-countup";

//Import Icons
import FeatherIcon from "feather-icons-react";

const Widget = ({ reports }) => {
    const widgets = [
        {
            id: 1,
            label: "Tổng số Dự thảo",
            badge: "ri-file-text-line",
            icon: "file-text",
            counter: reports.totalDocs || 0,
            decimals: 0,
            suffix: "",
            prefix: "",
            bgcolor: "primary",
            textcolor: "primary"
        },
        {
            id: 2,
            label: "Tổng số Góp ý",
            badge: "ri-message-2-line",
            icon: "message-square",
            counter: reports.totalFeedbacks || 0,
            decimals: 0,
            suffix: "",
            prefix: "",
            bgcolor: "info",
            textcolor: "info"
        },
        {
            id: 3,
            label: "Đã Giải trình",
            badge: "ri-checkbox-circle-line",
            icon: "check-circle",
            counter: reports.resolvedFeedbacks || 0,
            decimals: 0,
            suffix: "",
            prefix: "",
            bgcolor: "success",
            textcolor: "success"
        },
        {
            id: 4,
            label: "Tỷ lệ Hoàn thành",
            badge: "ri-pulse-line",
            icon: "activity",
            counter: reports.resolveRate || 0,
            decimals: 1,
            suffix: "%",
            prefix: "",
            bgcolor: "warning",
            textcolor: "warning"
        }
    ];

    return (
        <React.Fragment>
            <Row>
                {widgets.map((item, key) => (
                    <Col md={6} key={key}>
                        <Card className="card-animate border-0 shadow-sm">
                            <CardBody>
                                <div className="d-flex justify-content-between">
                                    <div>
                                        <p className="fw-medium text-muted mb-0">{item.label}</p>
                                        <h2 className="mt-4 ff-secondary fw-semibold">
                                            <span className="counter-value">
                                                <CountUp
                                                    start={0}
                                                    end={item.counter}
                                                    decimals={item.decimals}
                                                    duration={2}
                                                />
                                            </span>{item.suffix}
                                        </h2>
                                        <p className="mb-0 text-muted">
                                            <span className={"badge bg-light text-" + item.textcolor + " mb-0"}>
                                                <i className={item.badge + " align-middle"}></i> Hệ thống
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <div className="avatar-sm flex-shrink-0">
                                            <span className={"avatar-title bg-" + item.bgcolor + "-subtle rounded-circle fs-2"}>
                                                <FeatherIcon
                                                    icon={item.icon}
                                                    className={"text-" + item.textcolor}
                                                />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </Col>
                ))}
            </Row>
        </React.Fragment>
    );
};

export default Widget;