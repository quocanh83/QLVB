import React from 'react';
import ReactApexChart from 'react-apexcharts';
import { Card, CardBody, CardHeader, Col, Row } from 'reactstrap';
import CountUp from "react-countup";

const DocumentStatistics = ({ stats }) => {
    const series = [
        {
            name: "Dự thảo mới",
            data: [45, 52, 38, 24, 33, 26, 21, 20, 30, 42, 36, 49],
        },
        {
            name: "Đã hoàn thành",
            data: [35, 41, 62, 42, 13, 18, 29, 37, 36, 51, 32, 35],
        },
        {
            name: "Quá hạn",
            data: [10, 5, 8, 12, 5, 3, 2, 5, 4, 3, 6, 2],
        },
    ];

    const options = {
        chart: {
            height: 345,
            type: "line",
            toolbar: { show: false },
            foreColor: '#94a3b8', // Slate 400 for labels
        },
        colors: ["#6366f1", "#10b981", "#ef4444"], // Indigo, Emerald, Red
        dataLabels: { enabled: false },
        stroke: {
            width: [3, 4, 3],
            curve: "smooth",
            dashArray: [0, 8, 5],
        },
        xaxis: {
            categories: ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"],
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        grid: { 
            borderColor: "rgba(255, 255, 255, 0.05)",
            row: { colors: ['transparent', 'transparent'], opacity: 0.5 },
        },
        tooltip: {
            theme: 'dark',
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right',
        }
    };

    return (
        <Col xl={8}>
            <div className="premium-card-dark mb-4">
                <div className="card-header border-0 align-items-center d-flex">
                    <h4 className="card-title mb-0 flex-grow-1">Thống kê Hồ sơ</h4>
                    <div>
                        <button type="button" className="btn btn-soft-light btn-sm text-white">2026</button>
                    </div>
                </div>
                <div className="p-0 border-0 bg-transparent">
                    <Row className="g-0 text-center">
                        <Col sm={4}>
                            <div className="p-3 border-end border-white-05">
                                <h5 className="mb-1 text-white"><CountUp start={0} end={stats?.total || 0} duration={3} /></h5>
                                <p className="label-modern mb-0" style={{ fontSize: '0.7rem' }}>Tổng hồ sơ</p>
                            </div>
                        </Col>
                        <Col sm={4}>
                            <div className="p-3 border-end border-white-05">
                                <h5 className="mb-1 text-success"><CountUp start={0} end={stats?.completed || 0} duration={3} /></h5>
                                <p className="label-modern mb-0" style={{ fontSize: '0.7rem' }}>Hoàn thành</p>
                            </div>
                        </Col>
                        <Col sm={4}>
                            <div className="p-3">
                                <h5 className="mb-1 text-danger"><CountUp start={0} end={stats?.overdue || 0} duration={3} /></h5>
                                <p className="label-modern mb-0" style={{ fontSize: '0.7rem' }}>Quá hạn</p>
                            </div>
                        </Col>
                    </Row>
                </div>
                <div className="card-body p-0 pb-2">
                    <div className="w-100">
                        <ReactApexChart options={options} series={series} type="line" height={345} className="apex-charts" />
                    </div>
                </div>
            </div>
        </Col>
    );
};

export default DocumentStatistics;
