import React, { useState, useEffect } from 'react';
import {
    Container, Row, Col, Card, CardBody, CardHeader,
    Button, Input, Table, Spinner, FormGroup, Label,
    Badge, Alert, InputGroup,
    Nav, NavItem, NavLink, TabContent, TabPane
} from 'reactstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import Select from 'react-select';
import { getAuthHeader } from '../../helpers/api_helper';
import classnames from 'classnames';
import { useProfile } from "../../Components/Hooks/UserHooks";
import FeatherIcon from "feather-icons-react";


import './GSheetSync.css';

const GSheetSync = () => {
    const { userProfile } = useProfile();
    const [documents, setDocuments] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState(null);
    const [gsUrl, setGsUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [comparing, setComparing] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [results, setResults] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [showSynced, setShowSynced] = useState(false);
    const [showSpecialistMatches, setShowSpecialistMatches] = useState(false);
    const [showPositionMatches, setShowPositionMatches] = useState(false);

    // New states for separate assignment
    const [specialists, setSpecialists] = useState([]);
    const [savingIds, setSavingIds] = useState({}); // { feedbackId: true/false }
    const [activeTab, setActiveTab] = useState('1');
    const [assignmentSyncMode, setAssignmentSyncMode] = useState('sheet'); // 'sheet' (DB -> Sheet) or 'db' (Sheet -> DB)
    const [dataSyncMode, setDataSyncMode] = useState('sheet'); // 'sheet' (DB -> Sheet) or 'db' (Sheet -> DB)
    const [positionSyncMode, setPositionSyncMode] = useState('sheet'); // 'sheet' (DB -> Sheet) or 'db' (Sheet -> DB)
    
    const toggleTab = (tab) => {
        if (activeTab !== tab) setActiveTab(tab);
    };

    // Select styles consistent with the app
    // Redesigned Select styles for Dark Minimalist theme
    const selectStyles = {
        control: (base, state) => ({
            ...base,
            background: "rgba(255, 255, 255, 0.05)",
            borderColor: state.isFocused ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.1)",
            color: "#fff",
            borderRadius: "0.5rem",
            padding: "2px",
            boxShadow: "none",
            "&:hover": {
                borderColor: "rgba(255, 255, 255, 0.2)"
            }
        }),
        menu: (base) => ({
            ...base,
            background: "#1e293b", // Deep slate
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            zIndex: 9999,
            borderRadius: "0.75rem",
            marginTop: "8px",
            overflow: "hidden"
        }),
        option: (base, state) => ({
            ...base,
            background: state.isSelected 
                ? "rgba(255, 255, 255, 0.2)" 
                : state.isFocused 
                    ? "rgba(255, 255, 255, 0.1)" 
                    : "transparent",
            color: "#fff",
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            "&:active": {
                background: "rgba(255, 255, 255, 0.25)"
            }
        }),
        singleValue: (base) => ({
            ...base,
            color: "#fff",
            marginLeft: "2px",
            fontSize: "14px",
            fontWeight: "500"
        }),
        placeholder: (base) => ({
            ...base,
            fontSize: "14px"
        }),
        input: (base) => ({
            ...base,
            color: "#fff"
        }),
        indicatorSeparator: () => ({ display: "none" }),
        dropdownIndicator: (base) => ({
            ...base,
            color: "rgba(255, 255, 255, 0.4)",
            "&:hover": { color: "#fff" }
        })
    };

    useEffect(() => {
        fetchDocuments();
        fetchSpecialists();
    }, []);

    useEffect(() => {
        if (selectedDocId) {
            const doc = documents.find(d => d.value === selectedDocId);
            if (doc && doc.google_sheets_url) {
                setGsUrl(doc.google_sheets_url);
            } else {
                setGsUrl("");
            }
            setResults(null);
            setSelectedIds([]);
        }
    }, [selectedDocId, documents]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/documents/', getAuthHeader());
            const rawData = Array.isArray(res.results || res) ? (res.results || res) : [];
            // Map data correctly for react-select
            const mappedData = rawData.map(doc => ({
                ...doc,
                value: doc.id,
                label: doc.project_name
            }));
            setDocuments(mappedData);
        } catch (e) {
            toast.error("Không thể tải danh sách dự thảo.");
        } finally {
            setLoading(false);
        }
    };

    const fetchSpecialists = async () => {
        try {
            const res = await axios.get('/api/accounts/users/', getAuthHeader());
            const data = Array.isArray(res.results || res) ? (res.results || res) : [];
            setSpecialists(data);
        } catch (e) {
            console.error("Lỗi khi tải danh sách chuyên viên");
        }
    };

    // Filter specialists based on current user's department or admin status
    const eligibleSpecialists = React.useMemo(() => {
        if (!userProfile) return [];
        const isAdmin = userProfile.is_staff || userProfile.is_superuser || userProfile.role === 'Admin' || (userProfile.roles && userProfile.roles.some(r => r === 'Admin' || r.role_name === 'Admin'));
        
        if (isAdmin) return specialists;
        return specialists.filter(u => u.department_id === userProfile.department_id);
    }, [specialists, userProfile]);

    const specialistOptions = eligibleSpecialists.map(u => ({
        value: u.id,
        label: `${u.full_name || u.username} (${u.department_name || 'N/A'})`
    }));

    const handleAssignmentChange = async (feedbackId, selectedOptions) => {
        const userIds = selectedOptions ? selectedOptions.map(o => o.value) : [];
        
        setSavingIds(prev => ({ ...prev, [feedbackId]: true }));
        try {
            await axios.post('/api/feedbacks/assign_feedbacks/', {
                document_id: selectedDocId,
                assignments: [{ feedback_id: feedbackId, user_ids: userIds }]
            }, getAuthHeader());
            
            // Cập nhật local state results để hiển thị đúng
            const newResults = results.map(item => {
                if (item.id === feedbackId) {
                    const newIndividual = eligibleSpecialists
                        .filter(u => userIds.includes(u.id))
                        .map(u => ({ id: u.id, full_name: u.full_name || u.username }));

                    // Tái hiện logic ưu tiên của backend ngay tại frontend để UI mượt mà
                    let finalAssignments = [];
                    if (newIndividual.length > 0) {
                        finalAssignments = newIndividual;
                    } else {
                        // Kiểm tra quy tắc Thống nhất
                        const normContent = (item.content || "").toLowerCase()
                            .replace(/<[^>]+>/g, ' ')
                            .replace(/[^\w\s]/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim();
                        
                        if (normContent === "thống nhất với nội dung dự thảo nghị định") {
                            finalAssignments = [{ id: 9, full_name: "Quốc Anh" }];
                        } else {
                            finalAssignments = item.node_assignments || [];
                        }
                    }
                    
                    return { 
                        ...item, 
                        individual_assignments: newIndividual,
                        assigned_users: finalAssignments
                    };
                }
                return item;
            });
            setResults(newResults);
            toast.success("Đã cập nhật phân công riêng cho góp ý.");
        } catch (e) {
            toast.error("Lỗi khi lưu phân công: " + (e.response?.data?.error || "Vui lòng thử lại."));
        } finally {
            setSavingIds(prev => ({ ...prev, [feedbackId]: false }));
        }
    };

    const handleCompare = async () => {
        if (!selectedDocId || !gsUrl.trim()) {
            toast.warning("Vui lòng chọn Dự thảo và nhập Google Sheet URL.");
            return;
        }

        setComparing(true);
        try {
            const res = await axios.post('/api/feedbacks/gsheet_compare/', {
                document_id: selectedDocId,
                gs_url: gsUrl
            }, getAuthHeader());
            
            const feedbacks = res.feedbacks || (res.data && res.data.feedbacks);
            setResults(feedbacks || []);
            
            // Mặc định chọn các dòng Chưa có trong GS (new_in_db)
            if (feedbacks) {
                const newIds = feedbacks.filter(f => !f.is_in_gs).map(f => f.id);
                setSelectedIds(newIds);
            }
            toast.success("Đã hoàn tất đối chiếu dữ liệu.");
        } catch (e) {
            const errorMsg = e.response?.data?.error || e.response?.data?.detail || "Lỗi khi đối chiếu Google Sheet.";
            toast.error(errorMsg);
        } finally {
            setComparing(false);
        }
    };

    const handlePush = async (mode = 'all') => {
        if (selectedIds.length === 0) {
            toast.warning("Vui lòng chọn ít nhất một dòng để đẩy lên.");
            return;
        }

        setPushing(true);
        try {
            const pushItems = selectedIds.map(id => {
                const item = results.find(r => r.id === id);
                return { id: item.id, gs_row: item.gs_row };
            });

            const res = await axios.post('/api/feedbacks/gsheet_push/', {
                document_id: selectedDocId,
                gs_url: gsUrl,
                push_items: pushItems,
                update_mode: mode
            }, getAuthHeader());
            toast.success(res.data?.message || "Đã đẩy dữ liệu thành công.");
            
            // Refresh comparison
            handleCompare();
        } catch (e) {
            toast.error(e.response?.data?.error || "Lỗi khi đẩy dữ liệu lên Google Sheet.");
        } finally {
            setPushing(false);
        }
    };

    const handlePullAssignments = async () => {
        if (selectedIds.length === 0) {
            toast.warning("Vui lòng chọn ít nhất một dòng để cập nhật.");
            return;
        }

        setPushing(true);
        try {
            const pullItems = selectedIds.map(id => {
                const item = results.find(r => r.id === id);
                return { id: item.id, gs_specialist: item.gs_specialist };
            });

            const res = await axios.post('/api/feedbacks/gsheet_pull_assignments/', {
                document_id: selectedDocId,
                pull_items: pullItems
            }, getAuthHeader());
            toast.success(res.data?.message || "Đã cập nhật dữ liệu từ Google Sheet vào DB thành công.");
            
            // Refresh comparison
            handleCompare();
        } catch (e) {
            toast.error(e.response?.data?.error || "Lỗi khi cập nhật dữ liệu từ Google Sheet.");
        } finally {
            setPushing(false);
        }
    };

    const handlePullPositions = async () => {
        if (selectedIds.length === 0) {
            toast.warning("Vui lòng chọn ít nhất một dòng để cập nhật.");
            return;
        }

        setPushing(true);
        try {
            const pullItems = selectedIds.map(id => {
                const item = results.find(r => r.id === id);
                return { id: item.id, gs_node: item.gs_node };
            });

            const res = await axios.post('/api/feedbacks/gsheet_pull_positions/', {
                document_id: selectedDocId,
                pull_items: pullItems
            }, getAuthHeader());
            toast.success(res.data?.message || "Đã cập nhật vị trí từ Google Sheet vào DB thành công.");
            
            // Refresh comparison
            handleCompare();
        } catch (e) {
            toast.error(e.response?.data?.error || "Lỗi khi cập nhật vị trí từ Google Sheet.");
        } finally {
            setPushing(false);
        }
    };

    const handlePullData = async () => {
        if (selectedIds.length === 0) {
            toast.warning("Vui lòng chọn ít nhất một dòng để cập nhật.");
            return;
        }

        setPushing(true);
        try {
            const pullItems = selectedIds.map(id => {
                const item = results.find(r => r.id === id);
                return { 
                    id: item.id, 
                    content: item.gs_content,
                    explanation: item.gs_explanation,
                    need_opinion: item.gs_need_opinion
                };
            });

            const res = await axios.post('/api/feedbacks/gsheet_pull_data/', {
                document_id: selectedDocId,
                pull_items: pullItems
            }, getAuthHeader());
            toast.success(res.data?.message || "Đã cập nhật dữ liệu từ Google Sheet vào hệ thống thành công.");
            
            // Refresh comparison
            handleCompare();
        } catch (e) {
            toast.error(e.response?.data?.error || "Lỗi khi cập nhật dữ liệu từ Google Sheet.");
        } finally {
            setPushing(false);
        }
    };

    const toggleSelectAll = () => {
        if (activeTab === '1') {
            const visibleToPush = results.filter(r => (showSynced || r.status !== 'synced')).filter(r => r.status !== 'synced');
            
            if (selectedIds.length === visibleToPush.length) {
                setSelectedIds([]);
            } else {
                setSelectedIds(visibleToPush.map(r => r.id));
            }
        } else if (activeTab === '2') {
            // Tab đối soát chuyên viên: Chọn tất cả dòng bị lệch chuyên viên hiện đang hiển thị
            const visibleDiffRows = results.filter(r => (showSpecialistMatches || r.is_specialist_diff)).filter(r => r.is_specialist_diff);
            const diffIds = visibleDiffRows.map(r => r.id);
            
            if (selectedIds.length === diffIds.length) {
                setSelectedIds([]);
            } else {
                setSelectedIds(diffIds);
            }
        } else {
            // Tab đối soát vị trí: Chọn tất cả dòng bị lệch vị trí hiện đang hiển thị
            const visibleDiffRows = results.filter(r => (showPositionMatches || r.is_node_diff)).filter(r => r.is_node_diff);
            const diffIds = visibleDiffRows.map(r => r.id);
            
            if (selectedIds.length === diffIds.length) {
                setSelectedIds([]);
            } else {
                setSelectedIds(diffIds);
            }
        }
    };

    const toggleSelectRow = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    return (
        <React.Fragment>
            <div className="designkit-wrapper designkit-layout-root">
                <div className="modern-page-content">
                    {/* Modern Header Section */}
                    <div className="modern-header mb-5">
                        <div className="header-info">
                            <h4 className="mb-2">Đồng bộ Google Sheets</h4>
                            <p className="text-white-60">Đối chiếu và đồng bộ dữ liệu góp ý giữa Hệ thống và Bảng tính Google.</p>
                        </div>
                        <div className="header-actions">
                            <Nav pills className="modern-tabs-pill">
                                <NavItem>
                                    <NavLink
                                        className={classnames({ active: activeTab === '1' })}
                                        onClick={() => toggleTab('1')}
                                    >
                                        <i className="ri-database-2-line me-1"></i> Dữ liệu
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink
                                        className={classnames({ active: activeTab === '2' })}
                                        onClick={() => toggleTab('2')}
                                    >
                                        <i className="ri-user-settings-line me-1"></i> Phân công
                                        {results && results.filter(r => r.is_specialist_diff).length > 0 && (
                                            <span className="modern-badge-xs bg-danger ms-2">{results.filter(r => r.is_specialist_diff).length}</span>
                                        )}
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink
                                        className={classnames({ active: activeTab === '3' })}
                                        onClick={() => toggleTab('3')}
                                    >
                                        <i className="ri-map-pin-line me-1"></i> Vị trí
                                        {results && results.filter(r => r.is_node_diff).length > 0 && (
                                            <span className="modern-badge-xs bg-warning ms-2 text-dark">{results.filter(r => r.is_node_diff).length}</span>
                                        )}
                                    </NavLink>
                                </NavItem>
                            </Nav>
                        </div>
                    </div>

                <Row>
                    <Col lg={12}>
                        <div className="modern-card p-4 border border-white-5">
                            <div className="d-flex align-items-center mb-4">
                                <div className="avatar-title-modern-xs bg-primary-opacity text-primary me-2">
                                    <i className="ri-settings-4-line"></i>
                                </div>
                                <h6 className="text-white-60 text-uppercase fw-bold fs-10 tracking-widest mb-0">Cấu hình đồng bộ</h6>
                            </div>
                            
                            <Row className="gy-3 align-items-end">
                                <Col md={4}>
                                    <label className="form-label xsmall text-uppercase text-white-40 fw-bold">Dự thảo văn bản</label>
                                    <Select
                                        value={documents.find(d => d.value === selectedDocId)}
                                        onChange={(opt) => setSelectedDocId(opt ? opt.value : null)}
                                        options={documents}
                                        placeholder="Chọn dự thảo..."
                                        isLoading={loading}
                                        styles={selectStyles}
                                        isClearable
                                        classNamePrefix="react-select"
                                    />
                                </Col>
                                <Col md={6}>
                                    <label className="form-label xsmall text-uppercase text-white-40 fw-bold">Link Google Sheet (Edit mode)</label>
                                    <Input 
                                        type="text" 
                                        className="modern-input"
                                        placeholder="https://docs.google.com/spreadsheets/d/..." 
                                        value={gsUrl} 
                                        onChange={(e) => setGsUrl(e.target.value)}
                                    />
                                </Col>
                                <Col md={2}>
                                    <button 
                                        className="modern-btn primary w-100" 
                                        onClick={handleCompare} 
                                        disabled={comparing || !selectedDocId}
                                    >
                                        {comparing ? <Spinner size="sm" /> : (
                                            <>
                                                <i className="ri-search-line me-1"></i> So sánh
                                            </>
                                        )}
                                    </button>
                                </Col>
                            </Row>
                            <div className="mt-3 text-white-25 fs-11 italic">
                                <i className="ri-information-line me-1"></i>
                                Lưu ý: Sheet phải được chia sẻ quyền chỉnh sửa cho email service account của hệ thống.
                            </div>
                        </div>
                    </Col>
                </Row>

                {results && (
                    <div className="modern-card p-4 mt-4 border border-white-5">
                        <div className="d-flex align-items-center justify-content-between mb-4 pb-4 border-bottom border-white-5">
                            <div>
                                <h6 className="text-white-60 text-uppercase fw-bold fs-10 tracking-widest mb-1">Kết quả đối chiếu</h6>
                                <div className="text-white fs-13 fw-medium">Tìm thấy <span className="text-primary fw-bold">{results.length}</span> góp ý trong hệ thống.</div>
                            </div>
                            <div className="d-flex gap-3">
                                <div className="d-flex align-items-center gap-3 bg-white-5 p-2 px-3 rounded-pill border border-white-5">
                                    <span className="text-white-40 fw-bold fs-10 text-uppercase">Chế độ đồng bộ:</span>
                                    <div className="form-check modern-checkbox mb-0">
                                        <Input 
                                            className="form-check-input" 
                                            type="radio" 
                                            id="modeDataSheet" 
                                            checked={dataSyncMode === 'sheet'} 
                                            onChange={() => setDataSyncMode('sheet')}
                                        />
                                        <label className="form-check-label text-white-80 fs-11 fw-bold mb-0" htmlFor="modeDataSheet">GSHEET</label>
                                    </div>
                                    <div className="form-check modern-checkbox mb-0">
                                        <Input 
                                            className="form-check-input" 
                                            type="radio" 
                                            id="modeDataDb" 
                                            checked={dataSyncMode === 'db'} 
                                            onChange={() => setDataSyncMode('db')}
                                        />
                                        <label className="form-check-label text-white-80 fs-11 fw-bold mb-0" htmlFor="modeDataDb">DB</label>
                                    </div>
                                </div>
                                <div className="form-check form-switch modern-switch d-flex align-items-center mt-0">
                                    <Input 
                                        type="checkbox" 
                                        id="show-synced-switch" 
                                        checked={showSynced} 
                                        onChange={(e) => setShowSynced(e.target.checked)} 
                                    />
                                    <label className="form-check-label text-white-40 fs-11 fw-bold mb-0" htmlFor="show-synced-switch">HIỆN ĐÃ KHỚP</label>
                                </div>
                            </div>
                        </div>

                        <TabContent activeTab={activeTab}>
                            <TabPane tabId="1">
                                <div className="d-flex align-items-center justify-content-between mb-4">
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="avatar-title-modern-xs bg-info-opacity text-info rounded-circle">
                                            <i className="ri-information-line"></i>
                                        </div>
                                        <div className="text-white-60 fs-12 italic">Tìm kiếm khớp theo <b>Nội dung</b> và <b>Đơn vị</b>.</div>
                                    </div>
                                    <div className="d-flex gap-2">
                                        <button 
                                            className={`modern-btn ${dataSyncMode === 'sheet' ? 'danger' : 'success'} btn-sm px-4`}
                                            onClick={dataSyncMode === 'sheet' ? () => handlePush('all') : handlePullData} 
                                            disabled={pushing || selectedIds.length === 0}
                                        >
                                            {pushing ? <Spinner size="sm" /> : (
                                                <>
                                                    <i className={`${dataSyncMode === 'sheet' ? 'ri-share-forward-2-line' : 'ri-download-cloud-2-line'} me-1`}></i> 
                                                    {dataSyncMode === 'sheet' ? 'Cập nhật GSheet' : 'Cập nhật DB'} ({selectedIds.length} dòng)
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                    <div className="table-responsive">
                                        <table className="modern-table w-100 align-middle">
                                            <thead>
                                                <tr>
                                                    <th className="text-center" style={{ width: "40px" }}>
                                                        <div className="form-check modern-checkbox d-flex justify-content-center">
                                                            <Input 
                                                                type="checkbox" 
                                                                checked={results.filter(r => showSynced || r.status !== 'synced').filter(r => r.status !== 'synced').length > 0 && selectedIds.length === results.filter(r => showSynced || r.status !== 'synced').filter(r => r.status !== 'synced').length}
                                                                onChange={toggleSelectAll}
                                                            />
                                                        </div>
                                                    </th>
                                                    <th style={{ width: "90px" }}>Vị trí</th>
                                                    <th style={{ width: "120px" }}>Đơn vị</th>
                                                    <th>Nội dung & Giải trình (So sánh DB vs GSheet)</th>
                                                    <th style={{ width: "180px" }}>Phân công</th>
                                                    <th className="text-center" style={{ width: "110px" }}>Trạng thái</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                            {results.filter(item => showSynced || item.status !== 'synced').map((item) => {
                                                const isMissingExpOnGs = item.is_in_gs && !item.gs_explanation && item.explanation;
                                                const hasExpDiff = item.is_exp_diff;
                                                const hasOpinionDiff = item.is_opinion_diff;
                                                const hasAnyDiff = item.is_content_diff || hasExpDiff || hasOpinionDiff || item.is_node_diff || item.is_specialist_diff;

                                                return (
                                                    <tr key={item.id} className={classnames(item.is_in_gs ? (hasAnyDiff ? "bg-danger-opacity-light" : "bg-success-opacity-light") : "")}>
                                                        <td className="text-center">
                                                            <div className="form-check modern-checkbox d-flex justify-content-center">
                                                                <Input 
                                                                    type="checkbox" 
                                                                    disabled={item.is_in_gs && !hasAnyDiff && !isMissingExpOnGs}
                                                                    checked={selectedIds.includes(item.id)}
                                                                    onChange={() => toggleSelectRow(item.id)}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="white-space-normal">
                                                            <span className="text-warning fw-bold fs-11 tracking-wider">{item.node_label}</span>
                                                        </td>
                                                        <td className="white-space-normal">
                                                            <div className="text-white-80 fw-bold fs-12 label-modern border-white-10">{item.agency}</div>
                                                        </td>
                                                        <td>
                                                            <div className="d-flex flex-column gap-2">
                                                                {/* Content Section */}
                                                                <div className={`p-2 rounded border border-dashed ${item.is_content_diff ? 'bg-danger-opacity border-danger' : 'bg-white-5 border-white-10'}`}>
                                                                    <div className="d-flex align-items-center gap-2 mb-1">
                                                                        <span className="text-white-25 xsmall text-uppercase fw-800">Góp ý (DB):</span>
                                                                        {item.is_content_diff && <span className="modern-badge-xs bg-danger">LỆCH</span>}
                                                                    </div>
                                                                    <div className="text-white-80 fs-13 line-height-base">{item.content}</div>
                                                                    {item.is_content_diff && (
                                                                        <div className="mt-2 pt-2 border-top border-white-10">
                                                                            <span className="text-danger xsmall text-uppercase fw-800 d-block mb-1">Trên GSheet:</span>
                                                                            <div className="text-white-40 fs-12 italic">{item.gs_content}</div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                
                                                                {/* Explanation Section */}
                                                                <div className={`p-2 rounded border border-dashed ${hasExpDiff ? 'bg-danger-opacity border-danger' : isMissingExpOnGs ? 'bg-warning-opacity border-warning' : 'bg-white-5 border-white-10'}`}>
                                                                    <div className="d-flex align-items-center gap-2 mb-1">
                                                                        <span className="text-white-25 xsmall text-uppercase fw-800">Giải trình (DB):</span>
                                                                        {hasExpDiff && <span className="modern-badge-xs bg-danger">LỆCH</span>}
                                                                        {isMissingExpOnGs && <span className="modern-badge-xs bg-warning text-dark">THIẾU TRÊN GS</span>}
                                                                    </div>
                                                                    <div className="text-white fs-13 fw-medium italic line-height-base">{item.explanation || <em className="text-white-25 xsmall">Chưa có giải trình</em>}</div>
                                                                    {hasExpDiff && (
                                                                        <div className="mt-2 pt-2 border-top border-white-10">
                                                                            <span className="text-danger xsmall text-uppercase fw-800 d-block mb-1">Trên GSheet:</span>
                                                                            <div className="text-white-40 fs-12 italic">{item.gs_explanation || <em className="text-white-25">Trống</em>}</div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            {savingIds[item.id] ? (
                                                                <div className="text-center py-2"><Spinner size="sm" color="primary" /></div>
                                                            ) : (
                                                                <div className="modern-select-compact">
                                                                    <Select
                                                                        isMulti
                                                                        options={specialistOptions}
                                                                        value={(item.individual_assignments || []).map(u => ({
                                                                            value: u.id,
                                                                            label: u.full_name
                                                                        }))}
                                                                        placeholder="Phân công..."
                                                                        onChange={(val) => handleAssignmentChange(item.id, val)}
                                                                        styles={selectStyles}
                                                                        classNamePrefix="react-select"
                                                                        menuPortalTarget={document.body}
                                                                    />
                                                                </div>
                                                            )}
                                                            {(!item.individual_assignments || item.individual_assignments.length === 0) && item.node_assignments?.length > 0 && (
                                                                <div className="mt-2 px-1">
                                                                    <div className="text-white-25 xsmall text-uppercase fw-800 mb-1">Kế thừa:</div>
                                                                    <div className="text-white-40 fs-11 italic">{item.node_assignments.map(u => u.full_name).join(", ")}</div>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="text-center">
                                                            {item.is_in_gs ? (
                                                                <div className="d-flex flex-column align-items-center gap-2">
                                                                    <span className={`modern-badge ${hasExpDiff || item.is_content_diff ? 'danger' : 'success'} w-100`}>
                                                                        <i className={hasExpDiff || item.is_content_diff ? "ri-error-warning-line me-1" : "ri-check-line me-1"}></i> 
                                                                        {hasExpDiff || item.is_content_diff ? "Lệch" : "Khớp"}
                                                                    </span>
                                                                    <div className="text-white-40 xsmall fw-bold">Dòng {item.gs_row}</div>
                                                                    {(hasExpDiff || item.is_content_diff) && (
                                                                        <span className="text-danger xsmall fw-900 animate-pulse mt-1">CẦN CẬP NHẬT</span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="modern-badge warning w-100">MỚI</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            </tbody>
                                        </table>
                                    </div>
                                </TabPane>

                                <TabPane tabId="2">
                                    <div className="d-flex align-items-center justify-content-between mb-4">
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="avatar-title-modern-xs bg-primary-opacity text-primary rounded-circle">
                                                <i className="ri-user-settings-line"></i>
                                            </div>
                                            <div className="text-white-60 fs-12 italic">So sánh danh sách chuyên viên được phân công.</div>
                                        </div>
                                        <div className="d-flex gap-3 align-items-center">
                                            <div className="d-flex align-items-center gap-3 bg-white-5 p-2 px-3 rounded-pill border border-white-5">
                                                <span className="text-white-40 fw-bold fs-10 text-uppercase">Chế độ:</span>
                                                <div className="form-check modern-checkbox mb-0">
                                                    <Input 
                                                        className="form-check-input" 
                                                        type="radio" 
                                                        id="modeAssignSheet" 
                                                        checked={assignmentSyncMode === 'sheet'} 
                                                        onChange={() => setAssignmentSyncMode('sheet')}
                                                    />
                                                    <label className="form-check-label text-white-80 fs-11 fw-bold mb-0" htmlFor="modeAssignSheet">GSHEET</label>
                                                </div>
                                                <div className="form-check modern-checkbox mb-0">
                                                    <Input 
                                                        className="form-check-input" 
                                                        type="radio" 
                                                        id="modeAssignDb" 
                                                        checked={assignmentSyncMode === 'db'} 
                                                        onChange={() => setAssignmentSyncMode('db')}
                                                    />
                                                    <label className="form-check-label text-white-80 fs-11 fw-bold mb-0" htmlFor="modeAssignDb">DB</label>
                                                </div>
                                            </div>
                                            <div className="form-check form-switch modern-switch d-flex align-items-center mt-0">
                                                <Input 
                                                    type="checkbox" 
                                                    id="show-specialist-matches-switch" 
                                                    checked={showSpecialistMatches} 
                                                    onChange={(e) => setShowSpecialistMatches(e.target.checked)} 
                                                />
                                                <label className="form-check-label text-white-40 fs-11 fw-bold mb-0" htmlFor="show-specialist-matches-switch">HIỆN ĐÃ KHỚP</label>
                                            </div>
                                            <button 
                                                className={`modern-btn ${assignmentSyncMode === 'sheet' ? 'danger' : 'success'} btn-sm px-4`}
                                                onClick={assignmentSyncMode === 'sheet' ? () => handlePush('specialist_only') : handlePullAssignments} 
                                                disabled={pushing || selectedIds.length === 0}
                                            >
                                                {pushing ? <Spinner size="sm" /> : (
                                                    <>
                                                        <i className={`${assignmentSyncMode === 'sheet' ? 'ri-save-line' : 'ri-download-cloud-2-line'} me-1`}></i> 
                                                        {assignmentSyncMode === 'sheet' ? 'Cập nhật GSheet' : 'Cập nhật DB'} ({selectedIds.length})
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="table-responsive">
                                        <table className="modern-table w-100 align-middle">
                                            <thead>
                                                <tr>
                                                    <th className="text-center" style={{ width: "40px" }}>
                                                        <div className="form-check modern-checkbox d-flex justify-content-center">
                                                            <Input 
                                                                type="checkbox" 
                                                                checked={results.filter(r => showSpecialistMatches || r.is_specialist_diff).length > 0 && selectedIds.length === results.filter(r => showSpecialistMatches || r.is_specialist_diff).length}
                                                                onChange={toggleSelectAll}
                                                            />
                                                        </div>
                                                    </th>
                                                    <th style={{ width: "100px" }}>Vị trí</th>
                                                    <th>Nội dung góp ý</th>
                                                    <th style={{ width: "220px" }}>Phân công (DB)</th>
                                                    <th style={{ width: "220px" }}>Cán bộ (GSheet)</th>
                                                    <th className="text-center" style={{ width: "110px" }}>Trạng thái</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                            {results.filter(r => showSpecialistMatches || r.is_specialist_diff).map((item) => {
                                                const isDiff = item.is_specialist_diff;
                                                return (
                                                    <tr key={`assign-${item.id}`} className={classnames(isDiff ? "bg-danger-opacity-light" : "")}>
                                                        <td className="text-center">
                                                            <div className="form-check modern-checkbox d-flex justify-content-center">
                                                                <Input 
                                                                    type="checkbox" 
                                                                    checked={selectedIds.includes(item.id)}
                                                                    onChange={() => toggleSelectRow(item.id)}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="white-space-normal">
                                                            <span className="text-warning fw-bold fs-11 tracking-wider">{item.node_label}</span>
                                                        </td>
                                                        <td className="white-space-normal fs-12 text-white-60 line-height-base">{item.content}</td>
                                                        <td>
                                                            <div className="d-flex flex-wrap gap-1">
                                                                {item.assigned_users?.map((u, i) => (
                                                                    <span key={i} className="modern-badge secondary fs-10">{u.full_name}</span>
                                                                )) || <span className="text-white-25 xsmall italic">Chưa giao</span>}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className={classnames("p-1 px-2 rounded fs-12 fw-bold", isDiff ? "bg-danger-opacity text-danger border border-danger-subtle" : "text-success bg-success-opacity border border-success-subtle")}>
                                                                {item.gs_specialist || <em className="text-white-25 fw-normal italic">Trống</em>}
                                                            </div>
                                                        </td>
                                                        <td className="text-center">
                                                            {isDiff ? (
                                                                <div className="d-flex flex-column align-items-center gap-1">
                                                                    <span className="modern-badge danger w-100"><i className="ri-error-warning-line me-1"></i> Lệch</span>
                                                                    <span className="text-danger xsmall fw-900 animate-pulse mt-1">CẬP NHẬT</span>
                                                                </div>
                                                            ) : (
                                                                <span className="modern-badge success w-100"><i className="ri-checkbox-circle-line me-1"></i> Khớp</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            </tbody>
                                        </table>
                                    </div>
                                </TabPane>

                                <TabPane tabId="3">
                                    <div className="d-flex align-items-center justify-content-between mb-4">
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="avatar-title-modern-xs bg-warning-opacity text-warning rounded-circle">
                                                <i className="ri-map-pin-line"></i>
                                            </div>
                                            <div className="text-white-60 fs-12 italic">So khớp vị trí Điều/Khoản giữa DB và GSheet.</div>
                                        </div>
                                        <div className="d-flex gap-3 align-items-center">
                                            <div className="d-flex align-items-center gap-3 bg-white-5 p-2 px-3 rounded-pill border border-white-5">
                                                <span className="text-white-40 fw-bold fs-10 text-uppercase">Chế độ:</span>
                                                <div className="form-check modern-checkbox mb-0">
                                                    <Input 
                                                        className="form-check-input" 
                                                        type="radio" 
                                                        id="modePosSheet" 
                                                        checked={positionSyncMode === 'sheet'} 
                                                        onChange={() => setPositionSyncMode('sheet')}
                                                    />
                                                    <label className="form-check-label text-white-80 fs-11 fw-bold mb-0" htmlFor="modePosSheet">GSHEET</label>
                                                </div>
                                                <div className="form-check modern-checkbox mb-0">
                                                    <Input 
                                                        className="form-check-input" 
                                                        type="radio" 
                                                        id="modePosDb" 
                                                        checked={positionSyncMode === 'db'} 
                                                        onChange={() => setPositionSyncMode('db')}
                                                    />
                                                    <label className="form-check-label text-white-80 fs-11 fw-bold mb-0" htmlFor="modePosDb">DB</label>
                                                </div>
                                            </div>
                                            <div className="form-check form-switch modern-switch d-flex align-items-center mt-0">
                                                <Input 
                                                    type="checkbox" 
                                                    id="show-position-matches-switch" 
                                                    checked={showPositionMatches} 
                                                    onChange={(e) => setShowPositionMatches(e.target.checked)} 
                                                />
                                                <label className="form-check-label text-white-40 fs-11 fw-bold mb-0" htmlFor="show-position-matches-switch">HIỆN ĐÃ KHỚP</label>
                                            </div>
                                            <button 
                                                className={`modern-btn ${positionSyncMode === 'sheet' ? 'danger' : 'success'} btn-sm px-4`}
                                                onClick={positionSyncMode === 'sheet' ? () => handlePush('node_only') : handlePullPositions} 
                                                disabled={pushing || selectedIds.length === 0}
                                            >
                                                {pushing ? <Spinner size="sm" /> : (
                                                    <>
                                                        <i className={`${positionSyncMode === 'sheet' ? 'ri-save-line' : 'ri-download-cloud-2-line'} me-1`}></i> 
                                                        {positionSyncMode === 'sheet' ? 'Cập nhật GSheet' : 'Cập nhật DB'} ({selectedIds.length})
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="table-responsive">
                                        <table className="modern-table w-100 align-middle">
                                            <thead>
                                                <tr>
                                                    <th className="text-center" style={{ width: "40px" }}>
                                                        <div className="form-check modern-checkbox d-flex justify-content-center">
                                                            <Input 
                                                                type="checkbox" 
                                                                checked={results.filter(r => showPositionMatches || r.is_node_diff).length > 0 && selectedIds.length === results.filter(r => showPositionMatches || r.is_node_diff).length}
                                                                onChange={toggleSelectAll}
                                                            />
                                                        </div>
                                                    </th>
                                                    <th>Nội dung góp ý</th>
                                                    <th style={{ width: "220px" }}>Vị trí (DB)</th>
                                                    <th style={{ width: "220px" }}>Vị trí (GSheet)</th>
                                                    <th className="text-center" style={{ width: "110px" }}>Trạng thái</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                            {results.filter(r => showPositionMatches || r.is_node_diff).map((item) => {
                                                const isNodeDiff = item.is_node_diff;
                                                return (
                                                    <tr key={`node-${item.id}`} className={classnames(isNodeDiff ? "bg-warning-opacity-light" : "")}>
                                                        <td className="text-center">
                                                            <div className="form-check modern-checkbox d-flex justify-content-center">
                                                                <Input 
                                                                    type="checkbox" 
                                                                    checked={selectedIds.includes(item.id)}
                                                                    onChange={() => toggleSelectRow(item.id)}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="white-space-normal fs-12 text-white-60 line-height-base">{item.content}</td>
                                                        <td className="white-space-normal">
                                                            <span className="text-primary fw-bold fs-11 tracking-wider">{item.node_label}</span>
                                                        </td>
                                                        <td className="white-space-normal">
                                                            <div className={classnames("p-1 px-2 rounded fs-12 fw-bold", isNodeDiff ? "bg-danger-opacity text-danger border border-danger-subtle" : "text-success bg-success-opacity border border-success-subtle")}>
                                                                {item.gs_node || <em className="text-white-25 fw-normal italic">Trống</em>}
                                                            </div>
                                                        </td>
                                                        <td className="text-center">
                                                            {isNodeDiff ? (
                                                                <div className="d-flex flex-column align-items-center gap-1">
                                                                    <span className="modern-badge warning w-100"><i className="ri-error-warning-line me-1"></i> Lệch</span>
                                                                    <span className="text-warning xsmall fw-900 animate-pulse mt-1">CẦN CẬP NHẬT</span>
                                                                </div>
                                                            ) : (
                                                                <span className="modern-badge success w-100"><i className="ri-checkbox-circle-line me-1"></i> Khớp</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            </tbody>
                                        </table>
                                    </div>
                                </TabPane>
                        </TabContent>
                    </div>
                )}
            </div>
        </div>
    </React.Fragment>
);
};

export default GSheetSync;
