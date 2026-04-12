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
import Select from 'react-select';
import ReportConfigTab from './ReportConfigTab';

const Reports = () => {
    const [activeTab, setActiveTab] = useState('1');
    const [documents, setDocuments] = useState([]);

    // Custom Reports State
    const [selectedDocId, setSelectedDocId] = useState('');
    const [reportMode, setReportMode] = useState('mau10');

    const toggleTab = (tab) => {
        if (activeTab !== tab) setActiveTab(tab);
    };
    const [customAgency, setCustomAgency] = useState('all');
    const [customStatus, setCustomStatus] = useState(['pending', 'explained', 'accepted', 'partially_accepted', 'agreed']);
    const [customSpecialist, setCustomSpecialist] = useState('all');
    const [customOnlyOpinion, setCustomOnlyOpinion] = useState(false);
    const [showAgreedText, setShowAgreedText] = useState(false);
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
    }, [selectedDocId, activeTab, customAgency, customStatus, customSpecialist, reportMode, customOnlyOpinion, showAgreedText]);

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
            const statusStr = Array.isArray(statusFilter) ? statusFilter.join(',') : statusFilter;
            let url = `/api/feedbacks/custom_report_preview/?document_id=${docId}&status=${statusStr}&report_type=${reportMode === 'mau10' ? 'mau_10' : 'custom'}&only_opinion=${onlyOpinion}&show_agreed_text=${showAgreedText}`;
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
            const statusStr = Array.isArray(customStatus) ? customStatus.join(',') : customStatus;
            let url = `${baseUrl}/api/feedbacks/export_mau_10/?document_id=${selectedDocId}&status=${statusStr}`;
            if (customAgency && customAgency !== 'all') url += `&agency=${encodeURIComponent(customAgency)}`;
            if (customSpecialist && customSpecialist !== 'all') url += `&specialist=${customSpecialist}`;
            if (customOnlyOpinion) url += `&only_opinion=true`;
            if (showAgreedText) url += `&show_agreed_text=true`;
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

    const selectStyles = {
        control: (base, state) => ({
            ...base,
            background: "rgba(255, 255, 255, 0.05)",
            borderColor: state.isFocused ? "var(--kit-primary)" : "rgba(255, 255, 255, 0.1)",
            color: "white",
            borderRadius: "10px",
            minHeight: "42px",
            boxShadow: "none"
        }),
        singleValue: (base) => ({ ...base, color: "white" }),
        menu: (base) => ({ ...base, backgroundColor: "#1e2027", zIndex: 1070 }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected ? "var(--kit-primary)" : state.isFocused ? "rgba(255, 255, 255, 0.1)" : "transparent",
            color: "white"
        }),
        placeholder: (base) => ({ ...base, color: "rgba(255, 255, 255, 0.5)" }),
        multiValue: (base) => ({ ...base, background: "rgba(255, 255, 255, 0.1)", borderRadius: "6px" }),
        multiValueLabel: (base) => ({ ...base, color: "white" }),
        input: (base) => ({ ...base, color: "white" })
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

    return (
        <React.Fragment>
            <div className="designkit-wrapper designkit-layout-root" style={{ paddingBottom: '120px' }}>
                <div className="modern-page-content">
                    {/* Modern Header Section */}
                    <div className="modern-header mb-5">
                        <div className="header-info">
                            <h4 className="mb-2">Trung tâm Báo cáo & Phân tích</h4>
                            <p className="text-white-60">Theo dõi tiến độ, thống kê ý kiến và trích xuất dữ liệu dự thảo văn bản.</p>
                        </div>
                        <div className="header-actions">
                            <Nav pills className="modern-tabs-pill">
                                <NavItem>
                                    <NavLink
                                        className={classnames({ active: activeTab === '1' })}
                                        onClick={() => toggleTab('1')}
                                    >
                                        <i className="ri-bar-chart-2-line me-1"></i> Thống kê
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink
                                        className={classnames({ active: activeTab === '2' })}
                                        onClick={() => toggleTab('2')}
                                    >
                                        <i className="ri-file-text-line me-1"></i> Xuất Báo cáo
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink
                                        className={classnames({ active: activeTab === '3' })}
                                        onClick={() => toggleTab('3')}
                                    >
                                        <i className="ri-settings-4-line me-1"></i> Cấu hình
                                    </NavLink>
                                </NavItem>
                                {isAdmin && (
                                    <NavItem>
                                        <NavLink
                                            className={classnames({ active: activeTab === '4' })}
                                            onClick={() => toggleTab('4')}
                                        >
                                            <i className="ri-group-line me-1"></i> Cán bộ
                                        </NavLink>
                                    </NavItem>
                                )}
                            </Nav>
                        </div>
                    </div>

                    <TabContent activeTab={activeTab}>
                        <TabPane tabId="1">
                            {/* Toolbar Filter */}
                            <div className="d-flex align-items-center mb-4 gap-3">
                                <span className="text-white-60 fw-bold text-uppercase fs-10 tracking-wider">Lọc theo dự thảo:</span>
                                <div style={{ width: '400px' }}>
                                    <Select
                                        options={documents.map(d => ({ value: d.id, label: d.project_name }))}
                                        value={documents.filter(d => d.id === Number(selectedDocId)).map(d => ({ value: d.id, label: d.project_name }))[0]}
                                        onChange={(opt) => setSelectedDocId(opt?.value || '')}
                                        styles={selectStyles}
                                        placeholder="-- Chọn dự thảo văn bản --"
                                        isClearable
                                    />
                                </div>
                            </div>

                                            <div className="modern-card p-4 mb-4 border border-white-5">
                                                <h6 className="text-white-60 text-uppercase fw-bold fs-10 tracking-widest mb-4">Tổng quan tiến độ tham gia</h6>
                                                {isStatsLoading ? (
                                                    <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>
                                                ) : (invitedSeries.reduce((a, b) => a + b, 0) > 0 || respondedSeries.reduce((a, b) => a + b, 0) > 0) ? (
                                                    <>
                                                        <Row className="align-items-center g-4">
                                                            <Col md={6}>
                                                                <div className="p-3 bg-white-2 rounded-3 border border-white-5">
                                                                    {invitedSeries.length > 0 ? (
                                                                        <ReactApexChart key={`invited-${invitedSeries.length}`} series={invitedSeries} options={invitedOptions} type="donut" height={320} />
                                                                    ) : (
                                                                        <div className="text-center p-4 text-white-40">Chưa có dữ liệu mời</div>
                                                                    )}
                                                                </div>
                                                            </Col>
                                                            <Col md={6}>
                                                                <div className="p-3 bg-white-2 rounded-3 border border-white-5">
                                                                    {respondedSeries.length > 0 ? (
                                                                        <ReactApexChart key={`responded-${respondedSeries.length}`} series={respondedSeries} options={respondedOptions} type="donut" height={320} />
                                                                    ) : (
                                                                        <div className="text-center p-4 text-white-40">Chưa có ý kiến góp ý</div>
                                                                    )}
                                                                </div>
                                                            </Col>
                                                        </Row>

                                                        <div className="mt-4 pt-4 border-top border-white-5">
                                                            <div className="row g-3">
                                                                <div className="col">
                                                                    <div className="p-3 rounded bg-white-5 border border-white-5 h-100 text-center">
                                                                        <div className="text-white-40 fs-10 text-uppercase fw-bold mb-1">Tổng số ý kiến</div>
                                                                        <div className="text-white fs-20 fw-800">{statsData.summary?.total_fbs || 0}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="col">
                                                                    <div className="p-3 rounded bg-danger-opacity border border-danger-subtle h-100 text-center">
                                                                        <div className="text-danger-subtle fs-10 text-uppercase fw-bold mb-1">Chưa giải trình</div>
                                                                        <div className="text-danger fs-20 fw-800">{statsData.summary?.total_pending || 0}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="col">
                                                                    <div className="p-3 rounded bg-info-opacity border border-info-subtle h-100 text-center">
                                                                        <div className="text-info-subtle fs-10 text-uppercase fw-bold mb-1">Đã thống nhất</div>
                                                                        <div className="text-info fs-20 fw-800">{statsData.summary?.total_agreed || 0}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="col">
                                                                    <div className="p-3 rounded bg-success-opacity border border-success-subtle h-100 text-center">
                                                                        <div className="text-success-subtle fs-10 text-uppercase fw-bold mb-1">Đã tiếp thu</div>
                                                                        <div className="text-success fs-20 fw-800">{statsData.summary?.total_accepted || 0}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="col">
                                                                    <div className="p-3 rounded bg-warning-opacity border border-warning-subtle h-100 text-center">
                                                                        <div className="text-warning-subtle fs-10 text-uppercase fw-bold mb-1">Cần xin ý kiến</div>
                                                                        <div className="text-warning fs-20 fw-800">{statsData.summary?.total_need_opinion || 0}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-center text-white-40 py-5">
                                                        <i className="ri-database-2-line display-4 opacity-20"></i>
                                                        <p className="mt-2">Chưa có dữ liệu thống kê cho dự thảo này.</p>
                                                    </div>
                                                )}
                                            </div>

                                            <Row className="mb-4 g-4 text-white">
                                                {/* Chi tiết theo Phân loại */}
                                                <Col lg={7}>
                                                    <div className="modern-card p-4 h-100 border border-white-5">
                                                        <div className="d-flex align-items-center mb-4">
                                                            <div className="flex-grow-1">
                                                                <h6 className="text-white-60 text-uppercase fw-bold fs-10 tracking-widest mb-1">Chi tiết phân loại cơ quan</h6>
                                                                <div className="text-white fs-13 fw-medium">Phân nhóm: {selectedCategory}</div>
                                                            </div>
                                                            <div className="flex-shrink-0" style={{ width: "250px" }}>
                                                                <Select
                                                                    options={(statsData.available_categories || []).map(cat => ({ value: cat, label: cat }))}
                                                                    value={{ value: selectedCategory, label: selectedCategory }}
                                                                    onChange={(opt) => setSelectedCategory(opt?.value || '')}
                                                                    styles={selectStyles}
                                                                    placeholder="Chọn phân loại..."
                                                                />
                                                            </div>
                                                        </div>
                                                        <Row className="g-3">
                                                            {filteredAgencies.length > 0 ? (
                                                                filteredAgencies.map((a, idx) => {
                                                                    const percent = Math.round((a.resolved / a.total) * 100);
                                                                    return (
                                                                        <Col md={6} xl={4} key={idx}>
                                                                            <div className="modern-card p-3 border border-white-5 h-100 hover-border-primary transition-all">
                                                                                <div className="text-white-80 fw-bold fs-12 mb-3 text-truncate" title={a.agency}>{a.agency}</div>
                                                                                
                                                                                <div className="d-flex align-items-center justify-content-between mb-2">
                                                                                    <div className="d-flex gap-2">
                                                                                        <div className="d-flex align-items-center gap-2">
                                                                                            <span className="text-white-40 fw-bold fs-9">GY</span>
                                                                                            <div className="d-flex align-items-center justify-content-center rounded-circle bg-primary text-white fw-900 border border-white-10" style={{ width: '28px', height: '28px', fontSize: '11px', boxShadow: '0 0 8px rgba(52, 152, 219, 0.3)' }}>
                                                                                                {a.total}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="d-flex align-items-center gap-2">
                                                                                            <span className="text-white-40 fw-bold fs-9">GT</span>
                                                                                            <div className="d-flex align-items-center justify-content-center rounded-circle bg-success text-white fw-900 border border-white-10" style={{ width: '28px', height: '28px', fontSize: '11px', boxShadow: '0 0 8px rgba(46, 204, 113, 0.3)' }}>
                                                                                                {a.resolved}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="d-flex align-items-center gap-2">
                                                                                            <span className="text-white-40 fw-bold fs-9">TL</span>
                                                                                            <div className="d-flex align-items-center justify-content-center rounded-circle bg-info text-white fw-900 border border-white-10" style={{ width: '28px', height: '28px', fontSize: '10px', boxShadow: '0 0 8px rgba(45, 206, 255, 0.3)' }}>
                                                                                                {percent}%
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                
                                                                                <div className="modern-progress" style={{ height: '3px' }}>
                                                                                    <div 
                                                                                        className={`progress-bar-glow bg-${percent === 100 ? 'success' : 'primary'}`} 
                                                                                        style={{ width: `${percent}%` }}
                                                                                    ></div>
                                                                                </div>
                                                                            </div>
                                                                        </Col>
                                                                    );
                                                                })
                                                            ) : (
                                                                <Col lg={12} className="text-center py-4 text-white-40 italic">Không có dữ liệu cho phân loại này</Col>
                                                            )}
                                                        </Row>
                                                    </div>
                                                </Col>

                                                {/* Top 10 Đơn vị */}
                                                <Col lg={5}>
                                                    <div className="modern-card p-4 h-100 border border-white-5">
                                                        <h6 className="text-white-60 text-uppercase fw-bold fs-10 tracking-widest mb-4">Top 10 tích cực nhất</h6>
                                                        <div dir="ltr">
                                                            {isStatsLoading ? (
                                                                <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>
                                                            ) : top10Agencies.length > 0 ? (
                                                                <ReactApexChart key={`bar-${top10Agencies.length}`} series={barSeries} options={{
                                                                    ...barOptions,
                                                                    theme: { mode: 'dark' },
                                                                    chart: { ...barOptions.chart, background: 'transparent' },
                                                                    xaxis: { ...barOptions.xaxis, labels: { style: { colors: '#94A3B8' } } },
                                                                    yaxis: { labels: { style: { colors: '#94A3B8' } } }
                                                                }} type="bar" height={350} />
                                                            ) : (
                                                                <div className="text-center text-white-40 p-4">Không tìm thấy dữ liệu ý kiến</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Col>
                                            </Row>
                                        </TabPane>

                        <TabPane tabId="2">
                            <div className="modern-card p-4 mb-4 border border-white-5">
                                <div className="d-flex align-items-center mb-4">
                                    <div className="flex-grow-1">
                                        <h6 className="text-white-60 text-uppercase fw-bold fs-10 tracking-widest mb-1">Cấu hình trích xuất dữ liệu</h6>
                                        <div className="text-white fs-13 fw-medium">Chọn bộ lọc để tạo bản xem trước báo cáo</div>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <button 
                                            className="modern-btn primary" 
                                            onClick={handleExportCustomWord} 
                                            disabled={!selectedDocId || customStatsData.length === 0}
                                        >
                                            <i className="ri-download-line me-1"></i> Tải Word (.docx)
                                        </button>
                                    </div>
                                </div>
                                <Row className="g-4 mb-4 border-bottom border-white-5 pb-4">
                                    <Col lg={4}>
                                        <label className="form-label xsmall text-uppercase text-white-40 fw-bold">Dự thảo văn bản</label>
                                        <Select
                                            options={documents.map(d => ({ value: d.id, label: d.project_name }))}
                                            value={documents.filter(d => d.id === Number(selectedDocId)).map(d => ({ value: d.id, label: d.project_name }))[0]}
                                            onChange={(opt) => setSelectedDocId(opt?.value || '')}
                                            styles={selectStyles}
                                            placeholder="Chọn dự thảo..."
                                        />
                                    </Col>
                                    <Col lg={4}>
                                        <label className="form-label xsmall text-uppercase text-white-40 fw-bold">Mẫu cấu hình</label>
                                        <Select
                                            options={[
                                                { value: 'mau10', label: 'Mẫu số 10 (Chuẩn NĐ 30 - Xoay ngang)' },
                                                { value: 'custom', label: 'Bảng tuỳ chỉnh (Xoay dọc)' }
                                            ]}
                                            value={reportMode === 'mau10' ? { value: 'mau10', label: 'Mẫu số 10 (Chuẩn NĐ 30 - Xoay ngang)' } : { value: 'custom', label: 'Bảng tuỳ chỉnh (Xoay dọc)' }}
                                            onChange={(opt) => setReportMode(opt?.value || 'mau10')}
                                            styles={selectStyles}
                                        />
                                    </Col>
                                    <Col lg={2}>
                                        <label className="form-label xsmall text-uppercase text-white-40 fw-bold">Cơ quan</label>
                                        <Select
                                            options={[{ value: 'all', label: 'Tất cả' }, ...customAgenciesList.map(a => ({ value: a, label: a }))]}
                                            value={customAgency === 'all' ? { value: 'all', label: 'Tất cả' } : { value: customAgency, label: customAgency }}
                                            onChange={(opt) => setCustomAgency(opt?.value || 'all')}
                                            styles={selectStyles}
                                        />
                                    </Col>
                                    <Col lg={2}>
                                        <label className="form-label xsmall text-uppercase text-white-40 fw-bold">Chuyên viên</label>
                                        <Select
                                            options={[{ value: 'all', label: 'Tất cả' }, { value: 'none', label: 'Chưa giao' }, ...specialists.map(s => ({ value: s.id, label: s.username }))]}
                                            value={customSpecialist === 'all' ? { value: 'all', label: 'Tất cả' } : (customSpecialist === 'none' ? { value: 'none', label: 'Chưa giao' } : specialists.filter(s => s.id === Number(customSpecialist)).map(s => ({ value: s.id, label: s.username }))[0])}
                                            onChange={(opt) => setCustomSpecialist(opt?.value || 'all')}
                                            styles={selectStyles}
                                        />
                                    </Col>
                                    <Col lg={12}>
                                        <div className="p-3 bg-white-2 rounded-3 border border-white-5">
                                            <label className="form-label xsmall text-uppercase text-white-60 fw-bold mb-3 d-flex align-items-center">
                                                <i className="ri-filter-3-line me-2"></i> Lọc theo trạng thái giải trình
                                            </label>
                                            <div className="d-flex flex-wrap gap-4 align-items-center">
                                                <div className="form-check modern-checkbox">
                                                    <Input 
                                                        type="checkbox" 
                                                        className="form-check-input" 
                                                        id="status-all"
                                                        checked={customStatus.length === 5}
                                                        onChange={(e) => setCustomStatus(e.target.checked ? ['pending', 'explained', 'accepted', 'partially_accepted', 'agreed'] : [])}
                                                    />
                                                    <label className="form-check-label text-white-80 fw-bold fs-11" htmlFor="status-all">TẤT CẢ</label>
                                                </div>
                                                {[
                                                    { id: 'pending', label: 'Chưa giải trình', color: 'danger' },
                                                    { id: 'explained', label: 'Đã giải trình', color: 'warning' },
                                                    { id: 'accepted', label: 'Đã tiếp thu', color: 'success' },
                                                    { id: 'partially_accepted', label: 'Tiếp thu một phần', color: 'primary' },
                                                    { id: 'agreed', label: 'Thống nhất', color: 'info' },
                                                ].map(opt => (
                                                    <div className="form-check modern-checkbox" key={opt.id}>
                                                        <Input 
                                                            type="checkbox" 
                                                            className="form-check-input" 
                                                            id={`status-${opt.id}`}
                                                            checked={customStatus.includes(opt.id)}
                                                            onChange={(e) => setCustomStatus(e.target.checked ? [...customStatus, opt.id] : customStatus.filter(s => s !== opt.id))}
                                                        />
                                                        <label className={`form-check-label text-${opt.color} fw-bold fs-11`} htmlFor={`status-${opt.id}`}>{opt.label.toUpperCase()}</label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </Col>
                                    <Col lg={12} className="d-flex gap-4">
                                        <div className="form-check form-switch modern-switch">
                                            <Input type="checkbox" id="customOnlyOpinion" checked={customOnlyOpinion} onChange={(e) => setCustomOnlyOpinion(e.target.checked)} />
                                            <label className="form-check-label text-white-80" htmlFor="customOnlyOpinion">Chỉ hiện mục "Cần xin ý kiến"</label>
                                        </div>
                                        <div className="form-check form-switch modern-switch">
                                            <Input type="checkbox" id="showAgreedText" checked={showAgreedText} onChange={(e) => setShowAgreedText(e.target.checked)} />
                                            <label className="form-check-label text-white-80" htmlFor="showAgreedText">Hiện nội dung "Thống nhất" chuẩn</label>
                                        </div>
                                    </Col>
                                </Row>

                                <div className="table-responsive">
                                    <table className="modern-table w-100">
                                        <thead>
                                            <tr>
                                                {activeTemplate ? (
                                                    activeTemplate.field_configs.filter(f => f.is_enabled).map(f => (
                                                        <th key={f.id} style={{ minWidth: f.field_key === 'stt' ? '50px' : '150px' }}>
                                                            {f.field_label}
                                                        </th>
                                                    ))
                                                ) : (
                                                    <>
                                                        <th style={{ width: "50px" }}>TT</th>
                                                        <th>Nhóm vấn đề/Điều/Khoản</th>
                                                        <th>Cơ quan</th>
                                                        <th>Nội dung góp ý</th>
                                                        <th>Giải trình</th>
                                                        <th>Xin ý kiến</th>
                                                    </>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {isCustomLoading ? (
                                                <tr><td colSpan="20" className="text-center py-4"><div className="spinner-border text-primary" role="status"></div></td></tr>
                                            ) : customStatsData?.length === 0 ? (
                                                <tr><td colSpan="20" className="text-center py-5 text-white-40">Không có dữ liệu hiển thị.</td></tr>
                                            ) : (
                                                customStatsData?.map((r, i) => (
                                                    <tr key={i}>
                                                        {activeTemplate ? (
                                                            activeTemplate.field_configs.filter(f => f.is_enabled).map(f => (
                                                                <td key={f.id} className={f.field_key === 'stt' ? 'text-center fw-bold text-white-60' : (f.field_key === 'noi_dung_giai_trinh' ? 'text-wrap text-white-40 italic' : 'text-wrap fs-13')}>
                                                                    {f.field_key === 'co_quan' ? <span className="badge bg-info-opacity text-info">{r[f.field_key]}</span> : r[f.field_key]}
                                                                </td>
                                                            ))
                                                        ) : (
                                                            <>
                                                                <td className="text-center fw-bold text-white-60">{r?.stt}</td>
                                                                <td className="fs-13">{r?.dieu_khoan}</td>
                                                                <td><span className="badge bg-info-opacity text-info">{r?.co_quan}</span></td>
                                                                <td className="text-wrap fs-13" style={{ maxWidth: "300px" }}>{r?.noi_dung_gop_y}</td>
                                                                <td className="text-wrap text-white-40 italic fs-13" style={{ maxWidth: "300px" }}>{r?.noi_dung_giai_trinh || '---'}</td>
                                                                <td className="text-wrap fs-13">{r?.xin_y_kien || '---'}</td>
                                                            </>
                                                        )}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </TabPane>
                        <TabPane tabId="3">
                            <ReportConfigTab />
                        </TabPane>

                        {isAdmin && (
                            <TabPane tabId="4">
                                <Row className="g-4">
                                    <Col lg={12} className="text-white">
                                        <div className="d-flex align-items-center mb-4">
                                            <div className="flex-grow-1">
                                                <h6 className="text-white-60 text-uppercase fw-bold fs-10 tracking-widest mb-1">Hiệu suất xử lý phòng ban & cán bộ</h6>
                                            </div>
                                            <button className="modern-btn info btn-sm" onClick={fetchPersonnelStats}>
                                                <i className="ri-refresh-line me-1"></i> Làm mới dữ liệu
                                            </button>
                                        </div>
                                    </Col>

                                    {isPersonnelLoading ? (
                                        <Col lg={12} className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></Col>
                                    ) : (
                                        <>
                                            {/* Theo Phòng Ban */}
                                            <Col lg={5}>
                                                <div className="modern-card p-4 h-100 border border-white-5 text-white">
                                                    <h6 className="text-white-60 text-uppercase fw-bold fs-10 mb-4 tracking-wider">Tiến độ theo Phòng ban</h6>
                                                    <div className="table-responsive">
                                                        <table className="modern-table w-100">
                                                            <thead>
                                                                <tr>
                                                                    <th>Phòng ban</th>
                                                                    <th className="text-center">Tổng</th>
                                                                    <th>Tiến độ</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {personnelStats.by_department?.map((dept, i) => (
                                                                    <tr key={i}>
                                                                        <td className="fw-bold fs-13">{dept.name}</td>
                                                                        <td className="text-center"><span className="badge bg-white-5">{dept.total}</span></td>
                                                                        <td>
                                                                            <div className="d-flex align-items-center gap-2">
                                                                                <div className="flex-grow-1 modern-progress" style={{ height: '4px' }}>
                                                                                    <div className="progress-bar-glow bg-info" style={{ width: `${dept.rate}%` }}></div>
                                                                                </div>
                                                                                <span className="text-white-40 fs-10">{dept.rate}%</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </Col>

                                            {/* Theo Cán bộ */}
                                            <Col lg={7}>
                                                <div className="modern-card p-4 h-100 border border-white-5 text-white">
                                                    <h6 className="text-white-60 text-uppercase fw-bold fs-10 mb-4 tracking-wider">Chi tiết năng suất Cán bộ</h6>
                                                    <div className="table-responsive">
                                                        <table className="modern-table w-100">
                                                            <thead>
                                                                <tr>
                                                                    <th>Họ tên</th>
                                                                    <th className="text-center">Phòng</th>
                                                                    <th className="text-center">Xong</th>
                                                                    <th>Hiệu suất</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {personnelStats.by_user?.map((user, i) => (
                                                                    <tr key={i}>
                                                                        <td>
                                                                            <div className="d-flex align-items-center gap-2">
                                                                                <div className="avatar-title-modern-xs bg-info-opacity text-info">
                                                                                    {(user.full_name || user.username).charAt(0)}
                                                                                </div>
                                                                                <span className="fw-medium text-white-80 fs-13">{user.full_name || user.username}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="text-center"><span className="text-white-40 fs-11">{user.department}</span></td>
                                                                        <td className="text-center"><span className="badge bg-success-opacity text-success">{user.completed} / {user.total}</span></td>
                                                                        <td>
                                                                            <div className="d-flex align-items-center gap-2">
                                                                                <div className="flex-grow-1 modern-progress" style={{ height: '4px' }}>
                                                                                    <div className={`progress-bar-glow bg-${user.rate === 100 ? 'success' : 'primary'}`} style={{ width: `${user.rate}%` }}></div>
                                                                                </div>
                                                                                <span className="text-white-40 fs-10">{user.rate}%</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </Col>
                                        </>
                                    )}
                                </Row>
                            </TabPane>
                        )}
                    </TabContent>
                </div>
            </div>
        </React.Fragment>
    );
};

export default Reports;
