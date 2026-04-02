import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Nav, NavItem, NavLink, TabContent, TabPane, Button, Input, Table, Progress } from 'reactstrap';
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
    const [specialists, setSpecialists] = useState([]);
    const [customAgenciesList, setCustomAgenciesList] = useState([]);
    const [customStatsData, setCustomStatsData] = useState([]);
    const [isCustomLoading, setIsCustomLoading] = useState(false);

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
    }, []);

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
            fetchCustomPreview(selectedDocId, customAgency, customStatus, customSpecialist);
        }
    }, [selectedDocId, activeTab, customAgency, customStatus, customSpecialist, reportMode]);

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

    const fetchCustomPreview = async (docId, agency, statusFilter, specialist) => {
        if (!docId) return;
        setIsCustomLoading(true);
        try {
            let url = `/api/feedbacks/custom_report_preview/?document_id=${docId}&status=${statusFilter}&report_type=${reportMode === 'mau10' ? 'mau_10' : 'custom'}`;
            if (agency && agency !== 'all') url += `&agency=${encodeURIComponent(agency)}`;
            if (specialist && specialist !== 'all') url += `&specialist=${specialist}`;
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
        { name: 'Tổng số ý kiến', data: top10Agencies.map(a => a.total) },
        { name: 'Đã giải trình', data: top10Agencies.map(a => a.resolved) }
    ];
    const barOptions = {
        chart: { type: 'bar', height: 350, toolbar: { show: false } },
        plotOptions: { bar: { horizontal: true, dataLabels: { position: 'top' } } },
        dataLabels: { enabled: true, offsetX: -6, style: { fontSize: '10px', colors: ['#fff'] } },
        stroke: { show: true, width: 1, colors: ['#fff'] },
        xaxis: { categories: top10Agencies.map(a => a.agency) },
        colors: ['#3498db', '#2ecc71'],
        legend: { position: 'top' }
    };

    // Prepare Donut Chart 1: Invited
    const invitedLabels = Object.keys(statsData?.invited_category_stats || {});
    const invitedSeries = Object.values(statsData?.invited_category_stats || {});
    const invitedOptions = {
        chart: { type: 'donut', height: 280 },
        labels: invitedLabels,
        colors: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
        legend: { position: 'bottom' },
        title: { text: "Cơ quan được lấy ý kiến", align: 'center', style: { fontSize: '14px', fontWeight: 'bold', color: '#666' } },
        dataLabels: { enabled: true, formatter: (val, opts) => opts.w.config.series[opts.seriesIndex] }
    };

    // Prepare Donut Chart 2: Responded
    const respondedLabels = Object.keys(statsData?.category_stats || {});
    const respondedSeries = Object.values(statsData?.category_stats || {});
    const respondedOptions = {
        chart: { type: 'donut', height: 280 },
        labels: respondedLabels,
        colors: ['#3b82f6', '#22c55e', '#fbbf24', '#f87171', '#a78bfa'],
        legend: { position: 'bottom' },
        title: { text: "Cơ quan đã có ý kiến", align: 'center', style: { fontSize: '14px', fontWeight: 'bold', color: '#666' } },
        dataLabels: { enabled: true, formatter: (val, opts) => opts.w.config.series[opts.seriesIndex] }
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
                                                                            <ReactApexChart series={invitedSeries} options={invitedOptions} type="donut" height={320} />
                                                                        </Col>
                                                                        <Col md={6}>
                                                                            <ReactApexChart series={respondedSeries} options={respondedOptions} type="donut" height={320} />
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
                                                                                    <h6 className="mb-1 fw-bold text-success">Tổng số cơ quan được mời (Đã lọc)</h6>
                                                                                    <h4 className="mb-0 text-success">
                                                                                        {Object.entries(statsData?.invited_category_stats || {})
                                                                                            .filter(([label, _]) => label !== 'Sở QL công trình xây dựng chuyên ngành')
                                                                                            .reduce((acc, [_, count]) => acc + count, 0)} cơ quan
                                                                                    </h4>
                                                                                    <small className="text-muted-50 italics">*(Không bao gồm Sở QLCT xây dựng chuyên ngành)</small>
                                                                                </div>
                                                                            </div>
                                                                        </Col>
                                                                    </Row>
                                                                </>
                                                            ) : (
                                                                <div className="text-center text-muted py-5">
                                                                    <i className="ri-database-2-line display-4 text-light"></i>
                                                                    <p className="mt-2">Chưa có dữ liệu thống kê cho dự thảo này.<br/><small>Vui lòng kiểm tra danh sách cơ quan được mời trong phần quản lý Dự thảo.</small></p>
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
                                                                    <Input type="select" size="sm" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
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
                                                                    <ReactApexChart series={barSeries} options={barOptions} type="bar" height={350} />
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
                                                        <option value="unresolved">Chưa xử lý</option>
                                                        <option value="resolved">Đã tiếp thu/Giải trình</option>
                                                    </Input>
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
