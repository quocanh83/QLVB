import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Nav, NavItem, NavLink, TabContent, TabPane, Button, Input, Table, Progress, Badge } from 'reactstrap';
import classnames from 'classnames';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { api } from '../../config';
import { toast } from 'react-toastify';
import FeatherIcon from 'feather-icons-react';
import ReactApexChart from "react-apexcharts";
import ReportConfigTab from './ReportConfigTab';

const Reports = () => {
    const [activeTab, setActiveTab] = useState('1');
    const [documents, setDocuments] = useState([]);

    // Custom Reports State
    const [selectedDocId, setSelectedDocId] = useState('');
    const [reportMode, setReportMode] = useState('mau10');
    const [customAgency, setCustomAgency] = useState('all');
    const [customStatus, setCustomStatus] = useState('all');
    const [customSpecialist, setCustomSpecialist] = useState('all');
    const [customOnlyOpinion, setCustomOnlyOpinion] = useState(false);
    const [specialists, setSpecialists] = useState([]);
    const [customAgenciesList, setCustomAgenciesList] = useState([]);
    const [customStatsData, setCustomStatsData] = useState([]);
    const [isCustomLoading, setIsCustomLoading] = useState(false);

    // Personnel Stats State
    const [personnelStats, setPersonnelStats] = useState({ by_user: [], by_department: [] });
    const [isPersonnelLoading, setIsPersonnelLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // Stats State
    const [statsData, setStatsData] = useState({ agency_stats: [], category_stats: {}, invited_category_stats: {}, available_categories: [] });
    const [isStatsLoading, setIsStatsLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');

    const [reportTemplates, setReportTemplates] = useState([]);
    const [activeTemplate, setActiveTemplate] = useState(null);

    useEffect(() => {
        fetchDocuments();
        fetchTemplates();
        fetchSpecialists();
        checkAdmin();
    }, []);

    const checkAdmin = async () => {
        try {
            const res = await axios.get('/api/accounts/profile/', getAuthHeader());
            const user = res.data || res;
            const admin = user.is_staff || user.is_superuser || (user.roles || []).some(r => (typeof r === 'string' ? r === 'Admin' : r.role_name === 'Admin'));
            setIsAdmin(admin);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (reportTemplates.length > 0) {
            const mode = reportMode === 'mau10' ? 'mau_10' : 'custom';
            const tpl = reportTemplates.find(t => t.template_type === mode) || reportTemplates[0];
            setActiveTemplate(tpl);
        }
    }, [reportMode, reportTemplates]);

    const fetchTemplates = async () => {
        try {
            const res = await axios.get('/api/reports/templates/', getAuthHeader());
            setReportTemplates(res);
        } catch (e) {
            console.error("Lỗi tải mẫu báo cáo", e);
        }
    };

    const fetchSpecialists = async () => {
        try {
            const res = await axios.get('/api/accounts/users/', getAuthHeader());
            setSpecialists(res);
        } catch (e) {
            console.error("Lỗi tải danh sách chuyên viên", e);
        }
    };

    const fetchDocuments = async () => {
        try {
            const res = await axios.get('/api/documents/', getAuthHeader());
            setDocuments(res);
            if (res.length > 0) setSelectedDocId(res[0].id);
        } catch (e) {
            toast.error("Lỗi tải danh sách dự thảo");
        }
    };

    useEffect(() => {
        if (activeTab === '1') {
            fetchSubjectStats(selectedDocId);
        } else if (activeTab === '2') {
            fetchCustomAgencies(selectedDocId);
            fetchCustomPreview(selectedDocId, customAgency, customStatus, customSpecialist, customOnlyOpinion);
        } else if (activeTab === '4') {
            fetchPersonnelStats();
        }
    }, [selectedDocId, activeTab, customAgency, customStatus, customSpecialist, reportMode, customOnlyOpinion]);

    const fetchPersonnelStats = async () => {
        setIsPersonnelLoading(true);
        try {
            const res = await axios.get('/api/accounts/personnel-stats/', getAuthHeader());
            setPersonnelStats(res);
        } catch (e) {
            toast.error("Không thể tải thống kê cán bộ");
        }
        setIsPersonnelLoading(false);
    };

    const fetchSubjectStats = async (docId) => {
        setIsStatsLoading(true);
        try {
            const url = `/api/feedbacks/subject_stats/${docId ? `?document_id=${docId}` : ''}`;
            const res = await axios.get(url, getAuthHeader());
            setStatsData(res);
            // Tự động chọn category đầu tiên nếu chưa chọn
            if (res.available_categories && res.available_categories.length > 0) {
                if (!selectedCategory || !res.available_categories.includes(selectedCategory)) {
                    setSelectedCategory(res.available_categories[0]);
                }
            }
        } catch (error) {
            toast.error("Lỗi tải thống kê");
            setStatsData({ agency_stats: [], category_stats: {}, invited_category_stats: {}, available_categories: [] });
        } finally {
            setIsStatsLoading(false);
        }
    };

    const fetchCustomAgencies = async (docId) => {
        if (!docId) return;
        try {
            const res = await axios.get(`/api/feedbacks/subject_stats/?document_id=${docId}`, getAuthHeader());
            setCustomAgenciesList((res.agency_stats || []).map(a => a.agency));
        } catch (e) { console.error(e); }
    };

    const fetchCustomPreview = async (docId, agency, statusFilter, specialist, onlyOpinion) => {
        if (!docId) return;
        setIsCustomLoading(true);
        try {
            let url = `/api/feedbacks/custom_report_preview/?document_id=${docId}&status=${statusFilter}&report_type=${reportMode === 'mau10' ? 'mau_10' : 'custom'}`;
            if (agency && agency !== 'all') url += `&agency=${encodeURIComponent(agency)}`;
            if (specialist && specialist !== 'all') url += `&specialist=${specialist}`;
            if (onlyOpinion) url += `&only_opinion=true`;
            const res = await axios.get(url, getAuthHeader());
            setCustomStatsData(res);
        } catch (error) { console.error(error); }
        finally { setIsCustomLoading(false); }
    };

    const handleExportCustomWord = async () => {
        if (!selectedDocId) return;
        try {
            const typeParam = reportMode === 'mau10' ? 'mau_10' : 'custom';
            const baseUrl = api.API_URL || '';
            let url = `${baseUrl}/api/feedbacks/export_mau_10/?document_id=${selectedDocId}&status=${customStatus}`;
            if (customAgency && customAgency !== 'all') url += `&agency=${encodeURIComponent(customAgency)}`;
            if (customSpecialist && customSpecialist !== 'all') url += `&specialist=${customSpecialist}`;
            if (customOnlyOpinion) url += `&only_opinion=true`;
            url += `&report_type=${typeParam}`;

            const auth = getAuthHeader();
            const fetchResponse = await fetch(url, {
                method: 'GET',
                headers: {
                    ...auth.headers,
                }
            });

            if (!fetchResponse.ok) {
                const errData = await fetchResponse.json().catch(() => ({}));
                throw new Error(errData.error || "Lỗi tải báo cáo từ máy chủ.");
            }

            const blob = await fetchResponse.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;

            const filename = `Bao_cao_${typeParam === 'mau_10' ? 'Mau_10' : 'Tuy_chinh'}_${selectedDocId}.docx`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                if (document.body.contains(link)) document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
            }, 10000);

            toast.success("Xuất báo cáo thành công!");
        } catch (e) {
            toast.error("Lỗi khi tải báo cáo.");
        }
    };

    // Prepare Bar Chart Data
    const top10Agencies = (statsData?.agency_stats || []).slice(0, 10);
    const barSeries = [
        { name: 'Tổng số ý kiến', data: top10Agencies.map(a => Number(a.total) || 0) },
        { name: 'Đã giải trình', data: top10Agencies.map(a => Number(a.resolved) || 0) }
    ];
    const barOptions = {
        chart: { type: 'bar', height: 350, toolbar: { show: false }, animations: { enabled: true } },
        plotOptions: { bar: { horizontal: true, dataLabels: { position: 'top' } } },
        dataLabels: { enabled: true, offsetX: -6, style: { fontSize: '10px', colors: ['#fff'] } },
        stroke: { show: true, width: 1, colors: ['#fff'] },
        xaxis: { 
            categories: top10Agencies.map(a => String(a.agency || 'Ẩn danh')),
            labels: { show: true }
        },
        colors: ['#3498db', '#2ecc71'],
        legend: { position: 'top' },
        noData: { text: "Đang tải dữ liệu...", style: { color: "#888", fontSize: "14px" } }
    };

    // Prepare Donut Chart 1: Invited
    const invitedLabels = Object.keys(statsData?.invited_category_stats || {}).map(String);
    const invitedSeries = Object.values(statsData?.invited_category_stats || {}).map(v => Number(v) || 0);
    const invitedOptions = {
        chart: { type: 'donut', height: 280 },
        labels: invitedLabels.length > 0 ? invitedLabels : ["Không có dữ liệu"],
        colors: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
        legend: { position: 'bottom' },
        title: { text: "Cơ quan được lấy ý kiến", align: 'center', style: { fontSize: '14px', fontWeight: 'bold', color: '#666' } },
        dataLabels: { 
            enabled: true, 
            formatter: (val, opts) => {
                const series = opts.w.config.series;
                return series && series[opts.seriesIndex] !== undefined ? series[opts.seriesIndex] : "";
            }
        },
        noData: { text: "Chưa có danh sách mời", style: { color: "#888", fontSize: "14px" } }
    };

    // Prepare Donut Chart 2: Responded
    const respondedLabels = Object.keys(statsData?.category_stats || {}).map(String);
    const respondedSeries = Object.values(statsData?.category_stats || {}).map(v => Number(v) || 0);
    const respondedOptions = {
        chart: { type: 'donut', height: 280 },
        labels: respondedLabels.length > 0 ? respondedLabels : ["Chưa có ý kiến"],
        colors: ['#3b82f6', '#22c55e', '#fbbf24', '#f87171', '#a78bfa'],
        legend: { position: 'bottom' },
        title: { text: "Cơ quan đã có ý kiến", align: 'center', style: { fontSize: '14px', fontWeight: 'bold', color: '#666' } },
        dataLabels: { 
            enabled: true, 
            formatter: (val, opts) => {
                const series = opts.w.config.series;
                return series && series[opts.seriesIndex] !== undefined ? series[opts.seriesIndex] : "";
            }
        },
        noData: { text: "Chưa nhận được ý kiến", style: { color: "#888", fontSize: "14px" } }
    };

    // Filtered agencies for detailed view
    const filteredAgencies = (statsData?.agency_stats || []).filter(a => a.category === selectedCategory);

    const toggleTab = (tab) => {
        if (activeTab !== tab) {
            setActiveTab(tab);
        }
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Trung tâm Báo cáo" pageTitle="Quản lý" />

                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader className="align-items-center d-flex">
                                    <h4 className="card-title mb-0 flex-grow-1">Báo cáo & Thống kê Ý kiến</h4>
                                    <div className="flex-shrink-0">
                                        <Nav justify="true" className="nav-tabs-custom rounded card-header-tabs" role="tablist">
                                            <NavItem>
                                                <NavLink
                                                    className={classnames({ active: activeTab === '1' })}
                                                    onClick={() => { toggleTab('1'); }}
                                                >
                                                    <i className="ri-bar-chart-2-line align-middle me-1"></i> Thống kê
                                                </NavLink>
                                            </NavItem>
                                            <NavItem>
                                                <NavLink
                                                    className={classnames({ active: activeTab === '2' })}
                                                    onClick={() => { toggleTab('2'); }}
                                                >
                                                    <i className="ri-file-text-line align-middle me-1"></i> Xuất Báo cáo
                                                </NavLink>
                                            </NavItem>
                                            <NavItem>
                                                <NavLink
                                                    className={classnames({ active: activeTab === '3' })}
                                                    onClick={() => { toggleTab('3'); }}
                                                >
                                                    <i className="ri-settings-4-line align-middle me-1"></i> Cấu hình Mẫu
                                                </NavLink>
                                            </NavItem>
                                            {isAdmin && (
                                                <NavItem>
                                                    <NavLink
                                                        className={classnames({ active: activeTab === '4' })}
                                                        onClick={() => { toggleTab('4'); }}
                                                    >
                                                        <i className="ri-group-line align-middle me-1"></i> Tiến độ Cán bộ
                                                    </NavLink>
                                                </NavItem>
                                            )}
                                        </Nav>
                                    </div>
                                </CardHeader>

                                <CardBody>
                                    <TabContent activeTab={activeTab} className="text-muted">
                                        <TabPane tabId="1" id="stats">
                                            <div className="d-flex align-items-center mb-4">
                                                <h5 className="flex-grow-1 mb-0">Thống kê cơ quan tham gia đóng góp:</h5>
                                                <div className="w-25">
                                                    <Input type="select" value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value)}>
                                                        <option value="">-- Chọn dự thảo --</option>
                                                        {documents.map(d => <option key={d.id} value={d.id}>{d.project_name}</option>)}
                                                    </Input>
                                                </div>
                                            </div>

                                            <Row className="mb-4">
                                                <Col lg={12}>
                                                    <Card className="border border-dashed shadow-none">
                                                        <CardBody>
                                                            <h6 className="text-muted text-uppercase fw-semibold mb-3">Tỉ lệ tham gia theo nhóm cơ quan</h6>
                                                            {isStatsLoading ? (
                                                                <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>
                                                            ) : (invitedSeries.reduce((a, b) => a + b, 0) > 0 || respondedSeries.reduce((a, b) => a + b, 0) > 0) ? (
                                                                <>
                                                                    <Row className="align-items-center">
                                                                        <Col md={6}>
                                                                            {invitedSeries.length > 0 ? (
                                                                                <ReactApexChart key={`invited-${invitedSeries.length}-${invitedSeries.reduce((a,b)=>a+b,0)}`} series={invitedSeries} options={invitedOptions} type="donut" height={320} />
                                                                            ) : (
                                                                                <div className="text-center p-4 border rounded bg-light">Chưa có dữ liệu mời</div>
                                                                            )}
                                                                        </Col>
                                                                        <Col md={6}>
                                                                            {respondedSeries.length > 0 ? (
                                                                                <ReactApexChart key={`responded-${respondedSeries.length}-${respondedSeries.reduce((a,b)=>a+b,0)}`} series={respondedSeries} options={respondedOptions} type="donut" height={320} />
                                                                            ) : (
                                                                                <div className="text-center p-4 border rounded bg-light">Chưa có ý kiến góp ý</div>
                                                                            )}
                                                                        </Col>
                                                                    </Row>
                                                                    <Row className="mt-4 g-3">
                                                                        <Col md={6}>
                                                                            <div className="p-3 border border-primary-subtle rounded bg-primary-subtle d-flex align-items-center">
                                                                                <div className="flex-shrink-0 avatar-sm me-3">
                                                                                    <div className="avatar-title bg-primary rounded-circle fs-18">
                                                                                        <i className="ri-team-line"></i>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex-grow-1">
                                                                                    <h6 className="mb-1 fw-bold text-primary">Tổng số cơ quan đã góp ý</h6>
                                                                                    <h4 className="mb-0 text-primary">{Object.values(statsData?.category_stats || {}).reduce((a, b) => a + b, 0)} cơ quan</h4>
                                                                                </div>
                                                                            </div>
                                                                        </Col>
                                                                        <Col md={6}>
                                                                            <div className="p-3 border border-success-subtle rounded bg-success-subtle d-flex align-items-center">
                                                                                <div className="flex-shrink-0 avatar-sm me-3">
                                                                                    <div className="avatar-title bg-success rounded-circle fs-18">
                                                                                        <i className="ri-mail-send-line"></i>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex-grow-1">
                                                                                    <h6 className="mb-1 fw-bold text-success">Tổng số cơ quan được mời</h6>
                                                                                    <h4 className="mb-0 text-success">
                                                                                        {Object.values(statsData?.invited_category_stats || {}).reduce((acc, count) => acc + count, 0)} cơ quan
                                                                                    </h4>
                                                                                </div>
                                                                            </div>
                                                                        </Col>
                                                                    </Row>

                                                                    <Row className="mt-3 g-2">
                                                                        <Col>
                                                                            <Card className="shadow-none border p-2 h-100 mb-0 bg-light-subtle">
                                                                                <h6 className="text-muted text-uppercase fw-semibold fs-11 mb-1">Tổng số ý kiến</h6>
                                                                                <h4 className="mb-0 fs-16">{statsData.summary?.total_fbs || 0}</h4>
                                                                            </Card>
                                                                        </Col>
                                                                        <Col>
                                                                            <Card className="shadow-none border p-2 h-100 mb-0 border-danger-subtle">
                                                                                <h6 className="text-danger text-uppercase fw-semibold fs-11 mb-1">Chưa giải trình</h6>
                                                                                <h4 className="mb-0 fs-16 text-danger">{statsData.summary?.total_pending || 0}</h4>
                                                                            </Card>
                                                                        </Col>
                                                                        <Col>
                                                                            <Card className="shadow-none border p-2 h-100 mb-0 border-info-subtle">
                                                                                <h6 className="text-info text-uppercase fw-semibold fs-11 mb-1">Đã thống nhất</h6>
                                                                                <h4 className="mb-0 fs-16 text-info">{statsData.summary?.total_agreed || 0}</h4>
                                                                            </Card>
                                                                        </Col>
                                                                        <Col>
                                                                            <Card className="shadow-none border p-2 h-100 mb-0 border-success-subtle">
                                                                                <h6 className="text-success text-uppercase fw-semibold fs-11 mb-1">Đã tiếp thu</h6>
                                                                                <h4 className="mb-0 fs-16 text-success">{statsData.summary?.total_accepted || 0}</h4>
                                                                            </Card>
                                                                        </Col>
                                                                        <Col>
                                                                            <Card className="shadow-none border p-2 h-100 mb-0 border-primary-subtle">
                                                                                <h6 className="text-primary text-uppercase fw-semibold fs-11 mb-1">Tiếp thu một phần</h6>
                                                                                <h4 className="mb-0 fs-16 text-primary">{statsData.summary?.total_partial || 0}</h4>
                                                                            </Card>
                                                                        </Col>
                                                                        <Col>
                                                                            <Card className="shadow-none border p-2 h-100 mb-0 border-warning-subtle">
                                                                                <h6 className="text-warning text-uppercase fw-semibold fs-11 mb-1">Đã Giải trình</h6>
                                                                                <h4 className="mb-0 fs-16 text-warning">{statsData.summary?.total_explained_no_acc || 0}</h4>
                                                                            </Card>
                                                                        </Col>
                                                                        <Col>
                                                                            <Card className="shadow-none border p-2 h-100 mb-0 border-danger-subtle bg-danger-subtle">
                                                                                <h6 className="text-danger text-uppercase fw-semibold fs-11 mb-1">Cần xin ý kiến</h6>
                                                                                <h4 className="mb-0 fs-16 text-danger fw-bold">{statsData.summary?.total_need_opinion || 0}</h4>
                                                                            </Card>
                                                                        </Col>
                                                                    </Row>
                                                                </>
                                                            ) : (
                                                                <div className="text-center text-muted py-5">
                                                                    <i className="ri-database-2-line display-4 text-light"></i>
                                                                    <p className="mt-2">Chưa có dữ liệu thống kê cho dự thảo này.<br /><small>Vui lòng kiểm tra danh sách cơ quan được mời trong phần quản lý Dự thảo.</small></p>
                                                                </div>
                                                            )}
                                                        </CardBody>
                                                    </Card>
                                                </Col>
                                            </Row>

                                            <Row className="mb-4">
                                                {/* Chi tiết theo Phân loại */}
                                                <Col lg={6}>
                                                    <Card className="border border-dashed shadow-none h-100">
                                                        <CardHeader>
                                                            <div className="d-flex align-items-center">
                                                                <h6 className="text-muted text-uppercase fw-semibold mb-0 flex-grow-1">Chi tiết theo Phân loại Cơ quan</h6>
                                                                <div className="flex-shrink-0" style={{ width: "150px" }}>
                                                                    <Input type="select" bsSize="sm" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                                                                        {statsData.available_categories && statsData.available_categories.length > 0 ? (
                                                                            statsData.available_categories.map((cat, i) => (
                                                                                <option key={i} value={cat}>{cat}</option>
                                                                            ))
                                                                        ) : (
                                                                            <option value="">Không có phân loại</option>
                                                                        )}
                                                                    </Input>
                                                                </div>
                                                            </div>
                                                        </CardHeader>
                                                        <CardBody>
                                                            <div className="table-responsive">
                                                                <Table className="table-sm table-nowrap align-middle">
                                                                    <thead className="table-light">
                                                                        <tr>
                                                                            <th scope="col">Tên Cơ quan / Tổ chức</th>
                                                                            <th scope="col" className="text-center">Tổng góp ý</th>
                                                                            <th scope="col" className="text-center">Đã giải trình</th>
                                                                            <th scope="col" style={{ width: "20%" }}>Tỉ lệ hoàn thành</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {filteredAgencies.length > 0 ? (
                                                                            filteredAgencies.map((a, idx) => {
                                                                                const percent = Math.round((a.resolved / a.total) * 100);
                                                                                return (
                                                                                    <tr key={idx}>
                                                                                        <td className="fw-medium text-wrap" style={{ maxWidth: '180px' }}>{a.agency}</td>
                                                                                        <td className="text-center"><span className="badge bg-secondary-subtle text-secondary">{a.total}</span></td>
                                                                                        <td className="text-center"><span className="badge bg-success-subtle text-success">{a.resolved}</span></td>
                                                                                        <td>
                                                                                            <div className="d-flex align-items-center gap-2">
                                                                                                <div className="flex-grow-1">
                                                                                                    <Progress value={percent} size="sm" color={percent === 100 ? "success" : "primary"} />
                                                                                                </div>
                                                                                                <span className="text-muted fs-11">{percent}%</span>
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })
                                                                        ) : (
                                                                            <tr><td colSpan="4" className="text-center py-4 text-muted">Không có dữ liệu cho phân loại này</td></tr>
                                                                        )}
                                                                    </tbody>
                                                                </Table>
                                                            </div>
                                                        </CardBody>
                                                    </Card>
                                                </Col>

                                                {/* Top 10 Đơn vị */}
                                                <Col lg={6}>
                                                    <Card className="border border-dashed shadow-none h-100">
                                                        <CardBody>
                                                            <h6 className="text-muted text-uppercase fw-semibold mb-3">Top 10 Đơn vị Góp ý tích cực nhất</h6>
                                                            <div dir="ltr">
                                                                {isStatsLoading ? (
                                                                    <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>
                                                                ) : top10Agencies.length > 0 ? (
                                                                    <ReactApexChart key={`bar-${top10Agencies.length}-${top10Agencies[0]?.agency}`} series={barSeries} options={barOptions} type="bar" height={350} />
                                                                ) : (
                                                                    <div className="text-center text-muted p-4">Không tìm thấy dữ liệu ý kiến</div>
                                                                )}
                                                            </div>
                                                        </CardBody>
                                                    </Card>
                                                </Col>
                                            </Row>
                                        </TabPane>

                                        <TabPane tabId="2" id="export">
                                            {/* (Phần xuất báo cáo giữ nguyên không đổi) */}
                                            <div className="d-flex align-items-center mb-4">
                                                <h5 className="flex-grow-1 mb-0">Thiết lập Báo cáo</h5>
                                                <div className="flex-shrink-0">
                                                    <Button color="primary" onClick={handleExportCustomWord} disabled={!selectedDocId || customStatsData.length === 0}>
                                                        <i className="ri-download-line align-bottom me-1"></i> Tải Word
                                                    </Button>
                                                </div>
                                            </div>
                                            <Row className="g-3 mb-4">
                                                <Col lg={3}>
                                                    <label className="form-label text-muted text-uppercase fw-semibold fs-12">Loại mẫu xuất</label>
                                                    <Input type="select" value={reportMode} onChange={(e) => setReportMode(e.target.value)}>
                                                        <option value="mau10">Mẫu số 10 (Chuẩn NĐ 30 - Xoay ngang)</option>
                                                        <option value="custom">Bảng tuỳ chỉnh (Xoay dọc)</option>
                                                    </Input>
                                                </Col>
                                                <Col lg={3}>
                                                    <label className="form-label text-muted text-uppercase fw-semibold fs-12">Văn bản / Dự thảo</label>
                                                    <Input type="select" value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value)}>
                                                        {documents.map(d => <option key={d.id} value={d.id}>{d.project_name}</option>)}
                                                    </Input>
                                                </Col>
                                                <Col lg={2}>
                                                    <label className="form-label text-muted text-uppercase fw-semibold fs-12">Cơ quan góp ý</label>
                                                    <Input type="select" value={customAgency} onChange={(e) => setCustomAgency(e.target.value)}>
                                                        <option value="all">Tất cả Cơ quan</option>
                                                        {customAgenciesList.map((a, i) => <option key={i} value={a}>{a}</option>)}
                                                    </Input>
                                                </Col>
                                                <Col lg={2}>
                                                    <label className="form-label text-muted text-uppercase fw-semibold fs-12">Chuyên viên</label>
                                                    <Input type="select" value={customSpecialist} onChange={(e) => setCustomSpecialist(e.target.value)}>
                                                        <option value="all">Tất cả Chuyên viên</option>
                                                        <option value="none">Chưa được giao</option>
                                                        {specialists.map(s => <option key={s.id} value={s.id}>{s.username}</option>)}
                                                    </Input>
                                                </Col>
                                                <Col lg={2}>
                                                    <label className="form-label text-muted text-uppercase fw-semibold fs-12">Trạng thái giải trình</label>
                                                    <Input type="select" value={customStatus} onChange={(e) => setCustomStatus(e.target.value)}>
                                                        <option value="all">Tất cả Ý kiến</option>
                                                        <option value="pending">Chưa giải trình</option>
                                                        <option value="explained">Đã giải trình</option>
                                                        <option value="accepted">Đã tiếp thu</option>
                                                        <option value="partially_accepted">Tiếp thu một phần</option>
                                                        <option value="agreed">Thống nhất với dự thảo</option>
                                                    </Input>
                                                </Col>
                                                <Col lg={12}>
                                                    <div className="form-check form-switch form-switch-md mb-2">
                                                        <Input 
                                                            type="checkbox" 
                                                            className="form-check-input" 
                                                            id="customOnlyOpinion" 
                                                            checked={customOnlyOpinion}
                                                            onChange={(e) => setCustomOnlyOpinion(e.target.checked)}
                                                        />
                                                        <label className="form-check-label fw-medium" htmlFor="customOnlyOpinion">
                                                            Chỉ hiện các mục có nội dung "Cần xin ý kiến"
                                                        </label>
                                                    </div>
                                                </Col>
                                            </Row>

                                            <div className="table-responsive table-card">
                                                <table className="table align-middle table-nowrap table-striped-columns mb-0">
                                                    <thead className="table-light">
                                                        <tr>
                                                            {activeTemplate ? (
                                                                activeTemplate.field_configs.filter(f => f.is_enabled).map(f => (
                                                                    <th key={f.id} scope="col" style={{ minWidth: f.field_key === 'stt' ? '50px' : '150px' }}>
                                                                        {f.field_label}
                                                                    </th>
                                                                ))
                                                            ) : (
                                                                <>
                                                                    <th scope="col" style={{ width: "50px" }}>TT</th>
                                                                    <th scope="col">Điều/Khoản</th>
                                                                    <th scope="col">Cơ quan</th>
                                                                    <th scope="col" style={{ maxWidth: "300px" }}>Nội dung góp ý</th>
                                                                    <th scope="col" style={{ maxWidth: "300px" }}>Giải trình</th>
                                                                    <th scope="col">Xin ý kiến</th>
                                                                </>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {isCustomLoading ? (
                                                            <tr><td colSpan="20" className="text-center py-4"><div className="spinner-border text-primary" role="status"></div></td></tr>
                                                        ) : customStatsData?.length === 0 ? (
                                                            <tr><td colSpan="20" className="text-center py-5 text-muted">Không có dữ liệu hiển thị.</td></tr>
                                                        ) : (
                                                            customStatsData?.map((r, i) => (
                                                                <tr key={i}>
                                                                    {activeTemplate ? (
                                                                        activeTemplate.field_configs.filter(f => f.is_enabled).map(f => (
                                                                            <td key={f.id} className={f.field_key === 'stt' ? 'text-center fw-medium' : (f.field_key === 'noi_dung_giai_trinh' ? 'text-wrap text-muted fst-italic' : 'text-wrap')}>
                                                                                {f.field_key === 'co_quan' ? <span className="badge bg-info-subtle text-info">{r[f.field_key]}</span> : r[f.field_key]}
                                                                            </td>
                                                                        ))
                                                                    ) : (
                                                                        <>
                                                                            <td className="text-center fw-medium">{r?.stt}</td>
                                                                            <td>{r?.dieu_khoan}</td>
                                                                            <td><span className="badge bg-info-subtle text-info">{r?.co_quan}</span></td>
                                                                            <td className="text-wrap" style={{ maxWidth: "300px" }}>{r?.noi_dung_gop_y}</td>
                                                                            <td className="text-wrap text-muted fst-italic" style={{ maxWidth: "300px" }}>{r?.noi_dung_giai_trinh || '---'}</td>
                                                                            <td className="text-wrap">{r?.xin_y_kien || '---'}</td>
                                                                        </>
                                                                    )}
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </TabPane>

                                        <TabPane tabId="3" id="config">
                                            <ReportConfigTab />
                                        </TabPane>

                                        <TabPane tabId="4" id="personnel">
                                            <Row>
                                                <Col lg={12}>
                                                    <div className="d-flex align-items-center mb-4">
                                                        <h5 className="flex-grow-1 mb-0">Thống kê tiến độ theo Phòng ban & Cán bộ</h5>
                                                        <Button color="soft-info" onClick={fetchPersonnelStats}>
                                                            <i className="ri-refresh-line align-bottom"></i> Làm mới
                                                        </Button>
                                                    </div>
                                                </Col>
                                            </Row>

                                            {isPersonnelLoading ? (
                                                <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>
                                            ) : (
                                                <Row>
                                                    <Col lg={5}>
                                                        <Card className="border shadow-none">
                                                            <CardHeader className="bg-light-subtle">
                                                                <h6 className="card-title mb-0">Tổng hợp theo Phòng ban</h6>
                                                            </CardHeader>
                                                            <CardBody>
                                                                <Table className="align-middle table-nowrap">
                                                                    <thead className="table-light">
                                                                        <tr>
                                                                            <th>Phòng ban</th>
                                                                            <th className="text-center">Tổng ý kiến</th>
                                                                            <th className="text-center">Hoàn thành</th>
                                                                            <th>Tiến độ</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {personnelStats.by_department.map((dept, i) => (
                                                                            <tr key={i}>
                                                                                <td className="fw-medium">{dept.name}</td>
                                                                                <td className="text-center">{dept.total}</td>
                                                                                <td className="text-center text-success">{dept.completed}</td>
                                                                                <td>
                                                                                    <div className="d-flex align-items-center gap-2">
                                                                                        <div className="flex-grow-1">
                                                                                             <Progress value={dept.rate} style={{ height: "5px" }} color={dept.rate > 80 ? "success" : (dept.rate > 40 ? "info" : "warning")} />
                                                                                        </div>
                                                                                        <span className="fs-12">{dept.rate}%</span>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </Table>
                                                            </CardBody>
                                                        </Card>
                                                    </Col>
                                                    <Col lg={7}>
                                                        <Card className="border shadow-none">
                                                            <CardHeader className="bg-light-subtle">
                                                                <h6 className="card-title mb-0">Chi tiết theo từng Cán bộ</h6>
                                                            </CardHeader>
                                                            <CardBody>
                                                                <Table className="align-middle table-nowrap">
                                                                    <thead className="table-light">
                                                                        <tr>
                                                                            <th>Cán bộ</th>
                                                                            <th>Phòng ban</th>
                                                                            <th className="text-center">Giao</th>
                                                                            <th className="text-center">Xong</th>
                                                                            <th>Tiến độ</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {personnelStats.by_user.map((user, i) => (
                                                                            <tr key={i}>
                                                                                <td>
                                                                                    <div className="d-flex align-items-center">
                                                                                        <div className="flex-shrink-0 avatar-xs me-2">
                                                                                            <div className="avatar-title rounded-circle bg-soft-info text-info fs-10">
                                                                                                {(user.full_name || user.username).charAt(0)}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex-grow-1">
                                                                                            <span className="fw-medium">{user.full_name || user.username}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                                <td><span className="fs-12 text-muted">{user.department}</span></td>
                                                                                <td className="text-center"><Badge color="light" className="text-body border">{user.total}</Badge></td>
                                                                                <td className="text-center text-success">{user.completed}</td>
                                                                                <td>
                                                                                    <div className="d-flex align-items-center gap-2">
                                                                                        <div className="flex-grow-1">
                                                                                             <Progress value={user.rate} style={{ height: "5px" }} color={user.rate === 100 ? "success" : "primary"} />
                                                                                        </div>
                                                                                        <span className="fs-11">{user.rate}%</span>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </Table>
                                                            </CardBody>
                                                        </Card>
                                                    </Col>
                                                </Row>
                                            )}
                                        </TabPane>
                                    </TabContent>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default Reports;
