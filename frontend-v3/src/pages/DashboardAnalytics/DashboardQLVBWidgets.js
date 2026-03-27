import React from "react";
import { Card, CardBody, Col, Row } from "reactstrap";
import ReactApexChart from "react-apexcharts";

const DashboardQLVBWidgets = ({ stats }) => {
    const qlvbWidgets = [
        {
            id: 1,
            label: "Tổng số dự thảo",
            value: stats?.total || 0,
            series: [{ name: "Dự thảo", data: [30, 45, 32, 70, 40, 60, 50] }],
            color: ["--vz-primary"],
            icon: "ri-file-list-3-line"
        },
        {
            id: 2,
            label: "Tổng số góp ý",
            value: stats?.totalFeedbacks || 0,
            series: [{ name: "Góp ý", data: [10, 20, 15, 40, 25, 50, 35] }],
            color: ["--vz-warning"],
            icon: "ri-discuss-line"
        },
        {
            id: 3,
            label: "Tổng số giải trình",
            value: stats?.totalResolved || 0,
            series: [{ name: "Giải trình", data: [20, 25, 17, 30, 15, 10, 15] }],
            color: ["--vz-success"],
            icon: "ri-chat-check-line"
        },
        {
            id: 4,
            label: "Cơ quan góp ý",
            value: stats?.totalAgencies || 0,
            series: [{ name: "Cơ quan", data: [5, 10, 5, 20, 10, 5, 2] }],
            color: ["--vz-info"],
            icon: "ri-bank-line"
        }
    ];

    const chartOptions = {
        chart: { type: "area", height: 46, sparkline: { enabled: true }, toolbar: { show: false } },
        stroke: { curve: "smooth", width: 2 },
        fill: { type: "gradient", gradient: { shadeIntensity: 1, inverseColors: false, opacityFrom: 0.45, opacityTo: 0.05, stops: [20, 100, 100, 100] } },
        tooltip: { fixed: { enabled: false }, x: { show: false }, y: { title: { formatter: (e) => "" } }, marker: { show: false } }
    };

    return (
        <React.Fragment>
            {qlvbWidgets.map((widget, key) => (
                <Col xl={3} md={6} key={key}>
                    <Card className="card-animate overflow-hidden">
                        <CardBody>
                            <div className="d-flex align-items-center">
                                <div className="flex-grow-1 overflow-hidden">
                                    <p className="text-uppercase fw-medium text-muted text-truncate mb-3">{widget.label}</p>
                                    <h4 className="fs-22 fw-semibold ff-secondary mb-0">
                                        {widget.value}
                                    </h4>
                                </div>
                                <div className="flex-shrink-0">
                                    <ReactApexChart
                                        options={{ ...chartOptions, colors: [getComputedStyle(document.documentElement).getPropertyValue(widget.color[0]).trim() || '#405189'] }}
                                        series={widget.series}
                                        type="area"
                                        height={46}
                                        width={80}
                                        className="apex-charts"
                                    />
                                </div>
                            </div>
                            <div className="d-flex align-items-end justify-content-between mt-3">
                                <div>
                                    <span className="badge bg-light text-success mb-0">
                                        <i className="ri-arrow-up-line align-middle"></i> 15%
                                    </span>
                                    <span className="text-muted ms-1">So với tháng trước</span>
                                </div>
                                <div className="avatar-sm flex-shrink-0">
                                    <span className={`avatar-title bg-light rounded-circle fs-3 text-primary shadow`}>
                                        <i className={`${widget.icon} fs-22`}></i>
                                    </span>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
            ))}
        </React.Fragment>
    );
};

export default DashboardQLVBWidgets;
