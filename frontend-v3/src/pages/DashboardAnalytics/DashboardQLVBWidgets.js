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
                    <div className="premium-card-dark p-3 mb-4">
                        <div className="d-flex align-items-center mb-3">
                            <div className="flex-grow-1">
                                <p className="label-modern mb-1">{widget.label}</p>
                                <h4 className="stat-value-modern mb-0">
                                    {widget.value}
                                </h4>
                            </div>
                            <div className="flex-shrink-0">
                                <div className="avatar-sm">
                                    <span className="avatar-title bg-white-10 rounded-circle text-white shadow-sm">
                                        <i className={`${widget.icon} fs-22`}></i>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="flex-grow-1">
                                <ReactApexChart
                                    options={{ ...chartOptions, colors: [getComputedStyle(document.documentElement).getPropertyValue(widget.color[0]).trim() || '#405189'] }}
                                    series={widget.series}
                                    type="area"
                                    height={40}
                                    width="100%"
                                    className="apex-charts"
                                />
                            </div>
                            <div className="flex-shrink-0 ms-2">
                                <span className="badge bg-success-subtle text-success border-none" style={{ fontSize: '0.75rem' }}>
                                    <i className="ri-arrow-up-line align-middle"></i> 15%
                                </span>
                            </div>
                        </div>
                    </div>
                </Col>
            ))}
        </React.Fragment>
    );
};

export default DashboardQLVBWidgets;
