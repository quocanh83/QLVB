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
    const selectStyles = {
        control: (base, state) => ({
            ...base,
            background: "var(--vz-input-bg)",
            borderColor: state.isFocused ? "var(--vz-input-focus-border-color)" : "var(--vz-input-border)",
            color: "var(--vz-body-color)",
        }),
        menu: (base) => ({
            ...base,
            background: "var(--vz-choices-bg, #ffffff)",
            borderColor: "var(--vz-input-border)",
            boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
            zIndex: 9999
        }),
        option: (base, state) => ({
            ...base,
            background: state.isSelected 
                ? "var(--vz-primary)" 
                : state.isFocused 
                    ? "var(--vz-primary-light, #eef1f6)" 
                    : "var(--vz-choices-bg, #ffffff)",
            color: state.isSelected 
                ? "#fff" 
                : state.isFocused 
                    ? "var(--vz-primary, #405189)" 
                    : "var(--vz-body-color)",
            padding: "10px 15px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
        }),
        singleValue: (base) => ({
            ...base,
            color: "var(--vz-body-color)",
            fontSize: "14px",
            fontWeight: "500",
        })
    };

    useEffect(() => {
        fetchDocuments();
        fetchSpecialists();
    }, []);

    useEffect(() => {
        if (selectedDocId) {
            const doc = documents.find(d => d.id === selectedDocId);
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
            setDocuments(Array.isArray(res.results || res) ? (res.results || res) : []);
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
        <div className="page-content">
            <Container fluid>
                <BreadCrumb title="Đồng bộ Google Sheet" pageTitle="Góp ý" />

                <Row>
                    <Col lg={12}>
                        <Card className="border-0 shadow-sm modern-hover overflow-hidden">
                            <CardHeader className="bg-modern-gradient py-3">
                                <h6 className="card-title mb-0 fw-bold text-white d-flex align-items-center">
                                    <FeatherIcon icon="file-text" className="icon-dual-light me-2" size="20" />
                                    Cấu hình đồng bộ
                                </h6>
                            </CardHeader>
                            <CardBody className="p-4">
                                <Row className="gy-3 align-items-start">
                                    <Col md={4}>
                                        <FormGroup className="mb-0">
                                            <Label className="form-label text-uppercase fw-bold fs-11 text-muted mb-2">Dự thảo văn bản</Label>
                                            <Select
                                                value={documents.find(doc => doc.value === selectedDocId)}
                                                onChange={(opt) => setSelectedDocId(opt ? opt.value : null)}
                                                options={documents}
                                                placeholder="Chọn văn bản..."
                                                styles={selectStyles}
                                                isClearable
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col md={6}>
                                        <FormGroup className="mb-0">
                                            <Label className="form-label text-uppercase fw-bold fs-11 text-muted mb-2">Link Google Sheet (Edit mode)</Label>
                                            <Input 
                                                type="text" 
                                                className="form-control shadow-none"
                                                placeholder="https://docs.google.com/spreadsheets/d/..." 
                                                value={gsUrl} 
                                                onChange={(e) => setGsUrl(e.target.value)}
                                                style={{ height: '38px' }}
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col md={2}>
                                        <Label className="form-label d-block mb-2">&nbsp;</Label>
                                        <Button 
                                            color="primary" 
                                            className="w-100 fw-bold shadow-sm d-flex align-items-center justify-content-center" 
                                            onClick={handleCompare} 
                                            disabled={comparing || !selectedDocId}
                                            style={{ height: '38px' }}
                                        >
                                            {comparing ? <Spinner size="sm" /> : (
                                                <>
                                                    <FeatherIcon icon="search" size="16" className="me-2" />
                                                    So sánh ngay
                                                </>
                                            )}
                                        </Button>
                                    </Col>
                                </Row>
                                <div className="mt-2 text-muted fs-11 italic">
                                    Lưu ý: Sheet phải được chia sẻ quyền chỉnh sửa cho email service account của hệ thống.
                                </div>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>

                {results && (
                    <Row className="mt-3">
                        <Col lg={12}>
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="bg-white py-3 d-flex align-items-center justify-content-between border-bottom border-light">
                                    <div>
                                        <h6 className="card-title mb-0 fw-bold text-premium">Kết quả đối chiếu</h6>
                                        <p className="text-muted mb-0 fs-12">Tìm thấy {results.length} góp ý trong hệ thống.</p>
                                    </div>
                                    <div className="d-flex gap-2">
                                        <Button color="success" size="sm" outline className="fw-bold px-3" onClick={() => handlePush('all')} disabled={pushing || selectedIds.length === 0}>
                                            {pushing ? <Spinner size="sm" /> : <><FeatherIcon icon="upload-cloud" size="14" className="me-1" /> Đẩy {selectedIds.length} dòng lên GG Sheet</>}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardBody className="p-0">
                                    <div className="bg-light-subtle px-3 pt-3 border-bottom">
                                        <Nav tabs className="nav-tabs-custom nav-success border-bottom-0">
                                            <NavItem>
                                                <NavLink
                                                    className={classnames({ active: activeTab === '1' })}
                                                    onClick={() => toggleTab('1')}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <i className="ri-file-text-line me-1 align-middle"></i> 1. Nội dung & Giải trình
                                                </NavLink>
                                            </NavItem>
                                            <NavItem>
                                                <NavLink
                                                    className={classnames({ active: activeTab === '2' })}
                                                    onClick={() => toggleTab('2')}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <i className="ri-user-settings-line me-1 align-middle"></i> 2. Đối soát Phân công
                                                    {results.filter(r => r.is_specialist_diff).length > 0 && (
                                                        <Badge color="danger" pill className="ms-2">{results.filter(r => r.is_specialist_diff).length}</Badge>
                                                    )}
                                                </NavLink>
                                            </NavItem>
                                            <NavItem>
                                                <NavLink
                                                    className={classnames({ active: activeTab === '3' })}
                                                    onClick={() => toggleTab('3')}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <i className="ri-map-pin-line me-1 align-middle"></i> 3. Đối soát Vị trí
                                                    {results.filter(r => r.is_node_diff).length > 0 && (
                                                        <Badge color="warning" pill className="ms-2 text-dark">{results.filter(r => r.is_node_diff).length}</Badge>
                                                    )}
                                                </NavLink>
                                            </NavItem>
                                        </Nav>
                                    </div>

                                    <TabContent activeTab={activeTab} className="p-3">
                                        <TabPane tabId="1">
                                    <Alert color="info" className="fs-12 border-0 shadow-none border-start border-3 border-info mb-4">
                                        <i className="ri-information-line me-2 fs-14 align-middle"></i>
                                        <strong>Nguyên tắc:</strong> Hệ thống tìm kiếm các dòng trong Google Sheet khớp về <b>Nội dung góp ý</b> và <b>Đơn vị góp ý</b>. 
                                        Những dòng màu xanh là đã tồn tại trên Sheet, dòng màu trắng (chưa đồng bộ) sẽ được chọn mặc định để đẩy lên.
                                    </Alert>

                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div className="text-muted fs-13">
                                            Tìm thấy <b>{results.length}</b> góp ý.
                                        </div>
                                        <div className="d-flex gap-4 align-items-center flex-wrap">
                                            {/* Chế độ đối soát dữ liệu */}
                                            <div className="d-flex align-items-center gap-3 bg-light p-1 px-2 rounded-2 border border-dashed">
                                                <Label className="mb-0 fs-12 fw-bold text-muted text-uppercase me-1">Chế độ:</Label>
                                                <div className="form-check form-check-inline mb-0">
                                                    <Input 
                                                        className="form-check-input" 
                                                        type="radio" 
                                                        name="dataSyncMode" 
                                                        id="modeDataSheet" 
                                                        value="sheet"
                                                        checked={dataSyncMode === 'sheet'} 
                                                        onChange={() => setDataSyncMode('sheet')}
                                                    />
                                                    <Label className="form-check-label fs-12 mb-0" htmlFor="modeDataSheet">Điều chỉnh Sheet</Label>
                                                </div>
                                                <div className="form-check form-check-inline mb-0">
                                                    <Input 
                                                        className="form-check-input" 
                                                        type="radio" 
                                                        name="dataSyncMode" 
                                                        id="modeDataDb" 
                                                        value="db"
                                                        checked={dataSyncMode === 'db'} 
                                                        onChange={() => setDataSyncMode('db')}
                                                    />
                                                    <Label className="form-check-label fs-12 mb-0 fw-medium text-primary" htmlFor="modeDataDb">Điều chỉnh DB</Label>
                                                </div>
                                            </div>

                                            <div className="form-check form-switch form-switch-right form-switch-md">
                                                <Input 
                                                    className="form-check-input code-switcher" 
                                                    type="checkbox" 
                                                    id="show-synced-switch" 
                                                    checked={showSynced} 
                                                    onChange={(e) => setShowSynced(e.target.checked)} 
                                                />
                                                <Label className="form-check-label text-muted fs-12 mb-0" htmlFor="show-synced-switch">Hiện các dòng đã khớp</Label>
                                            </div>

                                            {dataSyncMode === 'sheet' ? (
                                                <Button 
                                                    color="danger" 
                                                    size="sm" 
                                                    className="fw-bold px-3 shadow-none"
                                                    onClick={() => handlePush('all')} 
                                                    disabled={pushing || selectedIds.length === 0}
                                                >
                                                    {pushing ? <Spinner size="sm" /> : <><i className="ri-share-forward-2-line me-1"></i> Cập nhật GSheet ({selectedIds.length})</>}
                                                </Button>
                                            ) : (
                                                <Button 
                                                    color="success" 
                                                    size="sm" 
                                                    className="fw-bold px-3 shadow-none"
                                                    onClick={handlePullData} 
                                                    disabled={pushing || selectedIds.length === 0}
                                                >
                                                    {pushing ? <Spinner size="sm" /> : <><i className="ri-download-cloud-2-line me-1"></i> Cập nhật vào DB ({selectedIds.length})</>}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="table-responsive table-card">
                                        <Table className="align-middle table-hover table-bordered mb-0" style={{ tableLayout: 'fixed', minWidth: '1000px' }}>
                                            <thead className="table-light text-muted text-center align-middle">
                                            <tr>
                                                <th scope="col" style={{ width: "3%", minWidth: "40px" }}>
                                                    <div className="form-check d-flex justify-content-center">
                                                        <Input 
                                                            type="checkbox" 
                                                            className="form-check-input"
                                                            checked={results.filter(r => showSynced || r.status !== 'synced').filter(r => r.status !== 'synced').length > 0 && selectedIds.length === results.filter(r => showSynced || r.status !== 'synced').filter(r => r.status !== 'synced').length}
                                                            onChange={toggleSelectAll}
                                                        />
                                                    </div>
                                                </th>
                                                <th style={{ width: "10%", minWidth: "80px" }}>Vị trí</th>
                                                <th style={{ width: "12%", minWidth: "100px" }}>Đơn vị</th>
                                                <th style={{ width: "25%", minWidth: "200px" }}>Nội dung góp ý</th>
                                                <th style={{ width: "20%", minWidth: "180px" }}>Ý KIẾN GIẢI TRÌNH, TIẾP THU</th>
                                                <th style={{ width: "15%", minWidth: "140px" }}>Phân công</th>
                                                <th style={{ width: "6%", minWidth: "60px" }}>Xin ý kiến</th>
                                                <th style={{ width: "12%", minWidth: "100px" }}>Trạng thái</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {results.filter(item => showSynced || item.status !== 'synced').map((item) => {
                                                const isMissingExpOnGs = item.is_in_gs && !item.gs_explanation && item.explanation;
                                                const hasExpDiff = item.is_exp_diff;

                                                const hasOpinionDiff = item.is_opinion_diff;
                                                const hasAnyDiff = item.is_content_diff || hasExpDiff || hasOpinionDiff || item.is_node_diff || item.is_specialist_diff;

                                                return (
                                                    <tr key={item.id} className={classnames(item.is_in_gs ? (hasAnyDiff ? "bg-danger-subtle opacity-100" : "bg-success-subtle") : "")}>
                                                        <td className="text-center align-middle">
                                                            <div className="form-check d-flex justify-content-center">
                                                                <Input 
                                                                    type="checkbox" 
                                                                    className="form-check-input"
                                                                    disabled={item.is_in_gs && !hasAnyDiff && !isMissingExpOnGs}
                                                                    checked={selectedIds.includes(item.id)}
                                                                    onChange={() => toggleSelectRow(item.id)}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="white-space-normal">
                                                            <span className="fw-bold text-primary fs-12">{item.node_label}</span>
                                                        </td>
                                                        <td className="white-space-normal">
                                                            <span className="fs-12 fw-medium text-dark">{item.agency}</span>
                                                        </td>
                                                        <td>
                                                            <div className={classnames("p-2 border rounded fs-12 mb-1", item.is_content_diff ? "bg-white border-danger shadow-sm" : "bg-light-subtle")}>
                                                                <div className="fw-medium text-dark">DB: {item.content}</div>
                                                                {item.is_content_diff && (
                                                                    <div className="mt-2 pt-2 border-top border-danger-subtle text-danger">
                                                                        <i className="ri-error-warning-fill me-1"></i>
                                                                        <strong>Sheet:</strong> {item.gs_content}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className={classnames("p-2 border rounded fs-12", hasExpDiff ? "bg-white border-danger shadow-sm" : isMissingExpOnGs ? "bg-warning-subtle border-warning shadow-sm" : "bg-light-subtle")}>
                                                                <div className="fw-medium text-dark italic">DB: {item.explanation || <em className="text-muted">Trống</em>}</div>
                                                                {hasExpDiff && (
                                                                    <div className="mt-2 pt-2 border-top border-danger-subtle text-danger">
                                                                        <i className="ri-error-warning-fill me-1"></i>
                                                                        <strong>Sheet:</strong> {item.gs_explanation || <em className="text-muted">Trống</em>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td style={{ minWidth: "180px" }}>
                                                            {savingIds[item.id] ? (
                                                                <div className="text-center py-1">
                                                                    <Spinner size="sm" color="primary" />
                                                                </div>
                                                            ) : (
                                                                <Select
                                                                    isMulti
                                                                    options={specialistOptions}
                                                                    value={(item.individual_assignments || []).map(u => ({
                                                                        value: u.id,
                                                                        label: u.full_name
                                                                    }))}
                                                                    placeholder={item.node_assignments?.length > 0 ? "Kế thừa từ Điều..." : "Phân công..."}
                                                                    onChange={(val) => handleAssignmentChange(item.id, val)}
                                                                    classNamePrefix="react-select"
                                                                    menuPortalTarget={document.body}
                                                                    styles={{ 
                                                                        menuPortal: base => ({ ...base, zIndex: 9999 }),
                                                                        control: (base) => ({
                                                                            ...base,
                                                                            fontSize: "12px",
                                                                            minHeight: "30px"
                                                                        }),
                                                                        multiValue: (base) => ({
                                                                            ...base,
                                                                            backgroundColor: item.individual_assignments?.length > 0 ? "var(--vz-success-subtle)" : "var(--vz-info-subtle)",
                                                                        })
                                                                    }}
                                                                />
                                                            )}
                                                            {(!item.individual_assignments || item.individual_assignments.length === 0) && item.node_assignments?.length > 0 && (
                                                                <div className="mt-1">
                                                                    <small className="text-muted italic fs-11">
                                                                        Kế thừa: {item.node_assignments.map(u => u.full_name).join(", ")}
                                                                    </small>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="text-start">
                                                            <div className={classnames("p-2 border rounded fs-11 d-flex flex-column gap-1", hasOpinionDiff ? "bg-white border-danger shadow-sm" : "bg-light-subtle")}>
                                                                <div className={classnames(item.need_opinion ? "text-danger fw-medium" : "text-muted italic")}>
                                                                    DB: {item.need_opinion || "---"}
                                                                </div>
                                                                {hasOpinionDiff && (
                                                                    <div className="mt-1 pt-1 border-top border-danger-subtle text-danger">
                                                                        <i className="ri-error-warning-fill me-1"></i>
                                                                        <strong>Sheet:</strong> {item.gs_need_opinion || "---"}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="text-center">
                                                            {item.is_in_gs ? (
                                                                <div className="d-flex flex-column align-items-center gap-1">
                                                                    <Badge color={hasExpDiff ? "danger" : "success"} className={hasExpDiff ? "" : "badge-outline-success"}>
                                                                        <i className={hasExpDiff ? "ri-error-warning-line me-1" : "ri-check-line me-1"}></i> 
                                                                        {hasExpDiff ? "Lệch dữ liệu" : `Khớp (Dòng ${item.gs_row})`}
                                                                    </Badge>
                                                                    {hasExpDiff && <span className="fs-10 text-danger fw-bold animate-pulse text-uppercase">Cần cập nhật</span>}
                                                                </div>
                                                            ) : (
                                                                <Badge color="warning" className="badge-outline-warning">
                                                                    Mới hoàn toàn
                                                                </Badge>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {results.filter(item => showSynced || item.status !== 'synced').length === 0 && (
                                                <tr>
                                                    <td colSpan="7" className="text-center py-5 text-muted italic">
                                                        Không có dòng nào phù hợp với bộ lọc.
                                                    </td>
                                                </tr>
                                            )}
                                            </tbody>
                                        </Table>
                                    </div>
                                </TabPane>

                                <TabPane tabId="2">
                                    <Alert color="warning" className="fs-12 border-0 shadow-none border-start border-3 border-warning mb-4">
                                        <i className="ri-user-search-line me-2 fs-14 align-middle"></i>
                                        <strong>Đối soát Phân công:</strong> Hệ thống so khớp tên chuyên viên trên DB với văn bản tại cột "Cán bộ/Chuyên viên" trên Google Sheet.
                                        Các dòng màu đỏ là các dòng có sự sai lệch personnel giữa hai bên.
                                    </Alert>

                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div className="text-muted fs-13">
                                            Hiển thị <b>{results.filter(r => showSpecialistMatches || r.is_specialist_diff).length}</b> / {results.length} dòng.
                                        </div>
                                        <div className="d-flex gap-4 align-items-center flex-wrap">
                                            {/* Chế độ đối soát */}
                                            <div className="d-flex align-items-center gap-3 bg-light p-1 px-2 rounded-2 border border-dashed">
                                                <Label className="mb-0 fs-12 fw-bold text-muted text-uppercase me-1">Chế độ:</Label>
                                                <div className="form-check form-check-inline mb-0">
                                                    <Input 
                                                        className="form-check-input" 
                                                        type="radio" 
                                                        name="syncMode" 
                                                        id="modeSheet" 
                                                        value="sheet"
                                                        checked={assignmentSyncMode === 'sheet'} 
                                                        onChange={() => setAssignmentSyncMode('sheet')}
                                                    />
                                                    <Label className="form-check-label fs-12 mb-0" htmlFor="modeSheet">Điều chỉnh Sheet</Label>
                                                </div>
                                                <div className="form-check form-check-inline mb-0">
                                                    <Input 
                                                        className="form-check-input" 
                                                        type="radio" 
                                                        name="syncMode" 
                                                        id="modeDb" 
                                                        value="db"
                                                        checked={assignmentSyncMode === 'db'} 
                                                        onChange={() => setAssignmentSyncMode('db')}
                                                    />
                                                    <Label className="form-check-label fs-12 mb-0 fw-medium text-primary" htmlFor="modeDb">Điều chỉnh DB</Label>
                                                </div>
                                            </div>

                                            <div className="form-check form-switch form-switch-right form-switch-md">
                                                <Input 
                                                    className="form-check-input code-switcher" 
                                                    type="checkbox" 
                                                    id="show-specialist-matches-switch" 
                                                    checked={showSpecialistMatches} 
                                                    onChange={(e) => setShowSpecialistMatches(e.target.checked)} 
                                                />
                                                <Label className="form-check-label text-muted fs-12 mb-0" htmlFor="show-specialist-matches-switch">Hiện các dòng đã khớp phân công</Label>
                                            </div>

                                            {assignmentSyncMode === 'sheet' ? (
                                                <Button 
                                                    color="danger" 
                                                    size="sm" 
                                                    className="fw-bold px-3 shadow-none"
                                                    onClick={() => handlePush('specialist_only')} 
                                                    disabled={pushing || selectedIds.length === 0}
                                                >
                                                    {pushing ? <Spinner size="sm" /> : <><i className="ri-user-follow-line me-1"></i> Cập nhật Phân công lên GSheet ({selectedIds.length})</>}
                                                </Button>
                                            ) : (
                                                <Button 
                                                    color="success" 
                                                    size="sm" 
                                                    className="fw-bold px-3 shadow-none"
                                                    onClick={handlePullAssignments} 
                                                    disabled={pushing || selectedIds.length === 0}
                                                >
                                                    {pushing ? <Spinner size="sm" /> : <><i className="ri-download-cloud-2-line me-1"></i> Cập nhật Phân công vào DB ({selectedIds.length})</>}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="table-responsive table-card">
                                        <Table className="align-middle table-hover table-bordered mb-0" style={{ tableLayout: 'fixed', minWidth: '1000px' }}>
                                            <thead className="table-light text-muted text-center align-middle">
                                            <tr>
                                                <th style={{ width: "40px" }}>
                                                    <div className="form-check d-flex justify-content-center">
                                                        <Input 
                                                            type="checkbox" 
                                                            className="form-check-input"
                                                            checked={results.filter(r => r.is_specialist_diff).length > 0 && selectedIds.length === results.filter(r => r.is_specialist_diff).length}
                                                            onChange={toggleSelectAll}
                                                        />
                                                    </div>
                                                </th>
                                                <th style={{ width: "10%" }}>Vị trí</th>
                                                <th style={{ width: "25%" }}>Nội dung góp ý</th>
                                                <th style={{ width: "25%" }}>Phân công (Hệ thống)</th>
                                                <th style={{ width: "25%" }}>Cán bộ (GSheet)</th>
                                                <th style={{ width: "12%" }}>Trạng thái</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {results.filter(r => showSpecialistMatches || r.is_specialist_diff).map((item) => {
                                                const isDiff = item.is_specialist_diff;
                                                return (
                                                    <tr key={`assign-${item.id}`} className={classnames(isDiff ? "bg-danger-subtle" : "")}>
                                                        <td className="text-center align-middle">
                                                            <div className="form-check d-flex justify-content-center">
                                                                <Input 
                                                                    type="checkbox" 
                                                                    className="form-check-input"
                                                                    checked={selectedIds.includes(item.id)}
                                                                    onChange={() => toggleSelectRow(item.id)}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="white-space-normal fw-medium fs-12 text-primary">{item.node_label}</td>
                                                        <td className="white-space-normal fs-12 text-muted">{item.content}</td>
                                                        <td>
                                                            <div className="d-flex flex-wrap gap-1">
                                                                {item.assigned_users?.map((u, i) => (
                                                                    <Badge key={i} color="info" outline className="border-info">{u.full_name}</Badge>
                                                                )) || <span className="text-muted fs-11 italic">Chưa giao</span>}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className={classnames("p-1 rounded fs-12", isDiff ? "text-danger fw-bold" : "text-success")}>
                                                                {item.gs_specialist || <em className="text-muted">Trống</em>}
                                                            </div>
                                                        </td>
                                                        <td className="text-center">
                                                            {isDiff ? (
                                                                <Badge color="danger"><i className="ri-error-warning-line me-1"></i> Sai lệch</Badge>
                                                            ) : (
                                                                <Badge color="success"><i className="ri-checkbox-circle-line me-1"></i> Khớp</Badge>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            </tbody>
                                        </Table>
                                    </div>
                                        </TabPane>

                                        <TabPane tabId="3">
                                            <Alert color="primary" className="fs-12 border-0 shadow-none border-start border-3 border-primary mb-4">
                                                <i className="ri-map-pin-range-line me-2 fs-14 align-middle"></i>
                                                <strong>Đối soát Vị trí (Điều/Khoản):</strong> Hệ thống so khớp vị trí (liên kết Điều/Khoản) trong DB với dữ liệu tại cột "Vị trí/Điều/Khoản" trên Google Sheet.
                                                Các dòng màu vàng là các dòng có sự khác biệt về danh mục Điều/Khoản giữa hai bên.
                                            </Alert>

                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <div className="text-muted fs-13">
                                                    Hiển thị <b>{results.filter(r => showPositionMatches || r.is_node_diff).length}</b> / {results.length} dòng.
                                                </div>
                                                <div className="d-flex gap-4 align-items-center flex-wrap">
                                                    {/* Chế độ đối soát vị trí */}
                                                    <div className="d-flex align-items-center gap-3 bg-light p-1 px-2 rounded-2 border border-dashed">
                                                        <Label className="mb-0 fs-12 fw-bold text-muted text-uppercase me-1">Chế độ:</Label>
                                                        <div className="form-check form-check-inline mb-0">
                                                            <Input 
                                                                className="form-check-input" 
                                                                type="radio" 
                                                                name="positionSyncMode" 
                                                                id="modePositionSheet" 
                                                                value="sheet"
                                                                checked={positionSyncMode === 'sheet'} 
                                                                onChange={() => setPositionSyncMode('sheet')}
                                                            />
                                                            <Label className="form-check-label fs-12 mb-0" htmlFor="modePositionSheet">Điều chỉnh Sheet</Label>
                                                        </div>
                                                        <div className="form-check form-check-inline mb-0">
                                                            <Input 
                                                                className="form-check-input" 
                                                                type="radio" 
                                                                name="positionSyncMode" 
                                                                id="modePositionDb" 
                                                                value="db"
                                                                checked={positionSyncMode === 'db'} 
                                                                onChange={() => setPositionSyncMode('db')}
                                                            />
                                                            <Label className="form-check-label fs-12 mb-0 fw-medium text-primary" htmlFor="modePositionDb">Điều chỉnh DB</Label>
                                                        </div>
                                                    </div>

                                                    <div className="form-check form-switch form-switch-right form-switch-md">
                                                        <Input 
                                                            className="form-check-input code-switcher" 
                                                            type="checkbox" 
                                                            id="show-position-matches-switch" 
                                                            checked={showPositionMatches} 
                                                            onChange={(e) => setShowPositionMatches(e.target.checked)} 
                                                        />
                                                        <Label className="form-check-label text-muted fs-12 mb-0" htmlFor="show-position-matches-switch">Hiện các dòng đã khớp</Label>
                                                    </div>

                                                    {positionSyncMode === 'sheet' ? (
                                                        <Button 
                                                            color="danger" 
                                                            size="sm" 
                                                            className="fw-bold px-3 shadow-none"
                                                            onClick={() => handlePush('node_only')} 
                                                            disabled={pushing || selectedIds.length === 0}
                                                        >
                                                            {pushing ? <Spinner size="sm" /> : <><i className="ri-save-line me-1"></i> Cập nhật Vị trí lên GSheet ({selectedIds.length})</>}
                                                        </Button>
                                                    ) : (
                                                        <Button 
                                                            color="success" 
                                                            size="sm" 
                                                            className="fw-bold px-3 shadow-none"
                                                            onClick={handlePullPositions} 
                                                            disabled={pushing || selectedIds.length === 0}
                                                        >
                                                            {pushing ? <Spinner size="sm" /> : <><i className="ri-download-cloud-2-line me-1"></i> Cập nhật Vị trí vào DB ({selectedIds.length})</>}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="table-responsive table-card">
                                                <Table className="align-middle table-hover table-bordered mb-0" style={{ tableLayout: 'fixed', minWidth: '1000px' }}>
                                                    <thead className="table-light text-muted text-center align-middle">
                                                    <tr>
                                                        <th style={{ width: "40px" }}>
                                                            <div className="form-check d-flex justify-content-center">
                                                                <Input 
                                                                    type="checkbox" 
                                                                    className="form-check-input"
                                                                    checked={results.filter(r => showPositionMatches || r.is_node_diff).length > 0 && selectedIds.length === results.filter(r => showPositionMatches || r.is_node_diff).length}
                                                                    onChange={toggleSelectAll}
                                                                />
                                                            </div>
                                                        </th>
                                                        <th style={{ width: "40%" }}>Nội dung góp ý</th>
                                                        <th style={{ width: "25%" }}>Vị trí (Hệ thống)</th>
                                                        <th style={{ width: "25%" }}>Vị trí (GSheet)</th>
                                                        <th style={{ width: "10%" }}>Trạng thái</th>
                                                    </tr>
                                                    </thead>
                                                    <tbody>
                                                    {results.filter(r => showPositionMatches || r.is_node_diff).map((item) => {
                                                        const isNodeDiff = item.is_node_diff;
                                                        return (
                                                            <tr key={`node-${item.id}`} className={classnames(isNodeDiff ? "bg-info-subtle" : "")}>
                                                                <td className="text-center align-middle">
                                                                    <div className="form-check d-flex justify-content-center">
                                                                        <Input 
                                                                            type="checkbox" 
                                                                            className="form-check-input"
                                                                            checked={selectedIds.includes(item.id)}
                                                                            onChange={() => toggleSelectRow(item.id)}
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="white-space-normal fs-12 text-muted">{item.content}</td>
                                                                <td className="white-space-normal fw-bold fs-12 text-primary">{item.node_label}</td>
                                                                <td className="white-space-normal fs-12">
                                                                    <div className={classnames("p-1 rounded", isNodeDiff ? "text-danger fw-bold" : "text-success")}>
                                                                        {item.gs_node || <em className="text-muted">Trống</em>}
                                                                    </div>
                                                                </td>
                                                                <td className="text-center">
                                                                    {isNodeDiff ? (
                                                                        <Badge color="warning"><i className="ri-error-warning-line me-1"></i> Khác biệt</Badge>
                                                                    ) : (
                                                                        <Badge color="success"><i className="ri-checkbox-circle-line me-1"></i> Khớp</Badge>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {results.filter(r => r.is_node_diff).length === 0 && (
                                                        <tr>
                                                            <td colSpan="5" className="text-center py-4 text-muted small">(Không có dữ liệu lệch vị trí)</td>
                                                        </tr>
                                                    )}
                                                    </tbody>
                                                </Table>
                                            </div>
                                        </TabPane>
                                    </TabContent>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                )}
            </Container>
        </div>
    );
};

export default GSheetSync;
