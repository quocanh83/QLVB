import React, { useState, useEffect } from 'react';
import { 
    Container, Row, Col, Card, CardBody, Button, 
    Table, Badge, Modal, ModalHeader, ModalBody, ModalFooter,
    Input, Label, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Nav, NavItem, NavLink, TabContent, TabPane
} from 'reactstrap';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import classnames from 'classnames';
import { getAuthHeader } from '../../helpers/api_helper';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { toast, ToastContainer } from 'react-toastify';
import SimpleBar from 'simplebar-react';
import AIWorkbench from './AIWorkbench';
import ComparisonSyncTab from './ComparisonSyncTab';
import './Comparison.css';

const ComparisonWorkspace = () => {
    const { projectId, versionId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [allDraftNodes, setAllDraftNodes] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [mappingModal, setMappingModal] = useState(false);
    const [selectedBaseNode, setSelectedBaseNode] = useState(null);
    const [currentMappedId, setCurrentMappedId] = useState(null);
    const [showAIWorkbench, setShowAIWorkbench] = useState(false);
    const [activeTab, setActiveTab] = useState("1"); // 1: Workspace, 2: GSheet Sync

    // Explanation re-upload state
    const [gsheetModal, setGsheetModal] = useState(false);
    const [advancedSyncModal, setAdvancedSyncModal] = useState(false);
    const [gsheetUrl, setGsheetUrl] = useState("");
    const fileInputRef = React.useRef(null);

    // Inline edit state
    const [editingExpId, setEditingExpId] = useState(null);
    const [tempExpContent, setTempExpContent] = useState("");

    const formatNodeLabel = (label) => {
        if (!label) return "";
        // Chuyển "Khoản 1" -> "1.", "Điểm a" -> "a)"
        let formatted = label.replace(/^Khoản\s+(\d+)/i, "$1.");
        formatted = formatted.replace(/^Điểm\s+([a-zđ])/i, "$1)");
        return formatted;
    };

    useEffect(() => {
        fetchWorkspaceData();
        fetchAllDraftNodes();
    }, [projectId, versionId]);

    const fetchWorkspaceData = async () => {
        try {
            const res = await axios.get(`/api/comparisons/versions/${versionId}/workspace_data/`, getAuthHeader());
            setData(res);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching workspace data", error);
            toast.error("Không thể tải dữ liệu so sánh");
        }
    };

    const fetchAllDraftNodes = async () => {
        try {
            // Lấy tất cả các node của phiên bản dự thảo này
            const res = await axios.get(`/api/comparisons/versions/${versionId}/nodes/`, getAuthHeader());
            // Lọc các node cấp độ cao (Chương, Điều, Phụ lục, Vấn đề khác) để ánh xạ
            const mainNodes = res.filter(n => ['Chương', 'Điều', 'Phụ lục', 'Vấn đề khác'].includes(n.node_type));
            setAllDraftNodes(mainNodes);
        } catch (error) {
            console.error("Error fetching draft nodes", error);
        }
    };

    const handleUpdateMapping = async (draftNodeId) => {
        if (!selectedBaseNode) return;
        
        try {
            await axios.post(`/api/comparisons/versions/${versionId}/update_mapping/`, {
                base_node_id: selectedBaseNode.id,
                draft_node_id: draftNodeId // Có thể null nếu hủy ánh xạ
            }, getAuthHeader());
            
            toast.success(draftNodeId ? "Đã ánh xạ thành công" : "Đã hủy ánh xạ");
            fetchWorkspaceData();
            setMappingModal(false);
            setSearchTerm("");
        } catch (error) {
            toast.error("Lỗi khi cập nhật ánh xạ");
        }
    };

    const handleReorderNode = async (nodeId, direction) => {
        try {
            await axios.post(`/api/comparisons/versions/${versionId}/reorder_node/`, { node_id: nodeId, direction }, getAuthHeader());
            fetchWorkspaceData();
        } catch (err) {
            toast.warning(err.response?.data?.message || err.response?.data?.error || "Không thể di chuyển");
        }
    };

    const handleInsertManualRow = async (afterId) => {
        try {
            await axios.post(`/api/comparisons/versions/${versionId}/add_manual_row/`, { insert_after_id: afterId }, getAuthHeader());
            toast.success("Đã chèn hàng trống. Gắn Điểu dự thảo tùy ý.");
            fetchWorkspaceData();
        } catch (err) {
            toast.error("Lỗi khi chèn hàng");
        }
    };

    const handleDeleteManualRow = async (nodeId) => {
        if (!window.confirm("Bạn có chắc muốn xóa hàng này không?")) return;
        try {
            await axios.post(`/api/comparisons/versions/${versionId}/delete_manual_node/`, { node_id: nodeId }, getAuthHeader());
            toast.success("Đã xóa hàng.");
            fetchWorkspaceData();
        } catch (err) {
            toast.error(err.response?.data?.error || "Lỗi khi xóa hàng");
        }
    };

    const handleExportWord = () => {
        const token = localStorage.getItem("access_token");
        const url = `${process.env.REACT_APP_API_URL || ''}/api/comparisons/versions/${versionId}/export_word/?token=${token}`;
        window.open(url, '_blank');
    };

    const handleSaveGsheetUrl = async () => {
        if (!gsheetUrl) return toast.warning("Vui lòng nhập link Google Sheet");
        try {
            await axios.post(`/api/comparisons/versions/${versionId}/save_gsheet_url/`, { sheet_url: gsheetUrl }, getAuthHeader());
            toast.success("Đã lưu cấu hình Google Sheet!");
            setGsheetModal(false);
            fetchWorkspaceData();
        } catch (err) {
            toast.error("Lỗi khi lưu link Google Sheet");
        }
    };

    const handleSyncGsheet = async (url) => {
        const targetUrl = url || gsheetUrl;
        if (!targetUrl) return toast.error("Vui lòng nhập URL Google Sheet");
        setLoading(true);
        try {
            await axios.post(`/api/comparisons/versions/${versionId}/sync_gsheet_explanation/`, { sheet_url: targetUrl }, getAuthHeader());
            toast.success("Đồng bộ Thuyết minh thành công!");
            setGsheetModal(false);
            fetchWorkspaceData();
        } catch (err) {
            toast.error("Đồng bộ thất bại: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        const config = getAuthHeader();
        config.headers['Content-Type'] = 'multipart/form-data';

        try {
            await axios.post(`/api/comparisons/versions/${versionId}/upload_explanation/`, formData, config);
            toast.success("Cập nhật Thuyết minh từ file Word thành công!");
            e.target.value = null;
            fetchWorkspaceData();
        } catch (err) {
            toast.error("Cập nhật thất bại: " + (err.response?.data?.error || err.message));
        }
    };

    const handleSaveExplanation = async (nodeId) => {
        try {
            await axios.patch(`/api/comparisons/nodes/${nodeId}/`, { explanation: tempExpContent }, getAuthHeader());
            toast.success("Đã lưu thuyết minh!");
            setEditingExpId(null);
            fetchWorkspaceData();
        } catch (err) {
            toast.error("Lỗi khi lưu thuyết minh");
        }
    };



    const filteredNodes = allDraftNodes.filter(node => 
        node.node_label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (node.content && node.content.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <div className="page-content text-center py-5"><div className="spinner-border text-primary"></div></div>;

    // Check if we need a 3-column layout
    const hasExplanations = data && data.rows && data.rows.some(r => 
        (r.draft_node && r.draft_node.explanation) || (r.base_node && r.base_node.explanation)
    );
    const colClass = hasExplanations ? "col-4" : "col-6";

    return (
        <div className="page-content">
            <Container fluid>
                <div className="d-flex align-items-center mb-3">
                    <Button color="light" className="btn-icon me-3" onClick={() => navigate(`/comparisons/${projectId}`)}>
                        <i className="ri-arrow-left-line"></i>
                    </Button>
                    <div className="flex-grow-1">
                        <h4 className="mb-0">{data.project_name}</h4>
                        <p className="text-muted mb-0">So sánh: <span className="text-primary fw-medium">{data.version_label}</span></p>
                    </div>
                    <div>
                        <Button color="primary" outline className="me-2" onClick={async () => {
                            try {
                                await axios.post(`/api/comparisons/versions/${versionId}/add_manual_row/`, {}, getAuthHeader());
                                toast.success("Đã thêm hàng trống. Bạn có thể ghép nối Điều dự thảo vào hàng này.");
                                fetchWorkspaceData();
                            } catch (error) {
                                toast.error("Lỗi khi thêm hàng thủ công");
                            }
                        }}>
                            <i className="ri-add-line me-1"></i> Thêm hàng so sánh
                        </Button>
                        <Button color="success" outline className="me-2" onClick={handleExportWord} title="Xuất file Word">
                            <i className="ri-file-word-line me-1"></i> Xuất Bảng
                        </Button>
                        
                        {/* Nút Chuyển Tab Đồng bộ Thuyết minh */}
                        <Button 
                            color={activeTab === "2" ? "warning" : "warning"} 
                            outline={activeTab !== "2"} 
                            className="me-2" 
                            onClick={() => setActiveTab(activeTab === "1" ? "2" : "1")} 
                            title="Đồng bộ GSheet (Hai chiều)"
                        >
                            <i className="ri-google-line me-1"></i> {activeTab === "2" ? "Quay lại Bàn làm việc" : "Đồng bộ GSheet"}
                        </Button>

                        <Button color="primary" outline className="me-2" onClick={() => fileInputRef.current.click()} title="Nạp từ file Word">
                            <i className="ri-file-word-line me-1"></i> Nạp Word
                        </Button>

                        <Button color="info" className={showAIWorkbench ? "active" : ""} onClick={() => setShowAIWorkbench(!showAIWorkbench)}>
                            <i className="ri-robot-3-line me-1"></i> Trợ lý AI
                        </Button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <Nav tabs className="nav-tabs-custom nav-success mb-3">
                    <NavItem>
                        <NavLink
                            style={{ cursor: "pointer" }}
                            className={classnames({ active: activeTab === "1" })}
                            onClick={() => setActiveTab("1")}
                        >
                            <i className="ri-layout-grid-line me-1 align-bottom"></i> Bàn làm việc
                        </NavLink>
                    </NavItem>
                    <NavItem>
                        <NavLink
                            style={{ cursor: "pointer" }}
                            className={classnames({ active: activeTab === "2" })}
                            onClick={() => setActiveTab("2")}
                        >
                            <i className="ri-google-line me-1 align-bottom"></i> Đối soát & Đồng bộ GSheet
                        </NavLink>
                    </NavItem>
                </Nav>

                <TabContent activeTab={activeTab}>
                    <TabPane tabId="1">
                        <Row>
                            <Col lg={showAIWorkbench ? 8 : 12}>
                                <Card className="comparison-card">
                                    <CardBody className="p-0">
                                        <div className="comparison-header bg-dark text-white border-bottom d-flex">
                                            <div className={`${colClass} p-2 border-end fw-bold text-center text-uppercase`}>VĂN BẢN GỐC</div>
                                            <div className={`${colClass} p-2 border-end fw-bold text-center text-uppercase text-info`}>VĂN BẢN DỰ THẢO</div>
                                            {hasExplanations && (
                                                <div className="col-4 p-2 fw-bold text-center text-uppercase text-warning">THUYẾT MINH SO SÁNH</div>
                                            )}
                                        </div>
                                        
                                        <SimpleBar style={{ maxHeight: "calc(100vh - 350px)" }}>
                                            <div className="col-12 p-0">
                                                {data.rows.map((row, idx) => (
                                                    <div key={idx} className="comparison-row d-flex border-bottom">
                                                        {/* Cột Gốc */}
                                                        <div className={`${colClass} p-3 border-end base-cell`}>
                                                            {row.base_node ? (
                                                                <>
                                                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                                                        {row.base_node.node_type === 'Điều' ? (
                                                                            <div className="fw-bold fs-14 text-dark mb-1 w-100">{row.base_node.node_label}</div>
                                                                        ) : (
                                                                            <Badge color="secondary-subtle" className="text-secondary">{formatNodeLabel(row.base_node.node_label)}</Badge>
                                                                        )}
                                                                        <div className="d-flex gap-1 align-items-center">
                                                                            <Button size="sm" color="soft-info" className="btn-icon rounded-circle" title="Di chuyển lên" onClick={() => handleReorderNode(row.base_node.id, 'up')}>
                                                                                <i className="ri-arrow-up-line"></i>
                                                                            </Button>
                                                                            <Button size="sm" color="soft-info" className="btn-icon rounded-circle" title="Di chuyển xuống" onClick={() => handleReorderNode(row.base_node.id, 'down')}>
                                                                                <i className="ri-arrow-down-line"></i>
                                                                            </Button>
                                                                            <Button size="sm" color="soft-success" className="btn-icon rounded-circle" title="Chèn hàng bên dưới" onClick={() => handleInsertManualRow(row.base_node.id)}>
                                                                                <i className="ri-add-line"></i>
                                                                            </Button>
                                                                            {row.base_node.node_label === 'Hàng thủ công' && (
                                                                                <Button size="sm" color="soft-danger" className="btn-icon rounded-circle" title="Xóa hàng" onClick={() => handleDeleteManualRow(row.base_node.id)}>
                                                                                    <i className="ri-delete-bin-line"></i>
                                                                                </Button>
                                                                            )}
                                                                            <Button size="sm" color="soft-primary" className="btn-icon rounded-circle ms-1" 
                                                                                title="Ghép / Hủy ghép"
                                                                                onClick={() => {
                                                                                    setSelectedBaseNode(row.base_node);
                                                                                    setCurrentMappedId(row.draft_node ? row.draft_node.id : null);
                                                                                    setMappingModal(true);
                                                                                }}>
                                                                                <i className="ri-links-line"></i>
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="node-content text-justify">
                                                                        {row.base_node.content}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="h-100 d-flex flex-column align-items-center justify-content-center bg-light-subtle rounded dashed-border p-3">
                                                                    <i className="ri-add-circle-line ri-2x text-muted mb-2"></i>
                                                                    <span className="text-muted italic small text-center">(Dòng mới - Không có trong bản gốc)</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Cột Dự thảo */}
                                                        <div className={`${colClass} p-3 border-end draft-cell`}>
                                                            {row.draft_node ? (
                                                                <>
                                                                    <div className="d-flex justify-content-between mb-2">
                                                                        {row.draft_node.node_type === 'Điều' ? (
                                                                            <div className="fw-bold fs-14 text-primary mb-1 w-100">{row.draft_node.node_label}</div>
                                                                        ) : (
                                                                            <Badge color="primary">{formatNodeLabel(row.draft_node.node_label)}</Badge>
                                                                        )}
                                                                    </div>
                                                                     <div 
                                                                        className="node-content text-justify legislative-text"
                                                                        dangerouslySetInnerHTML={{ __html: row.diff_content }}
                                                                    />
                                                                </>
                                                            ) : (
                                                                <div className="h-100 d-flex align-items-center justify-content-center bg-light-subtle rounded dashed-border">
                                                                    <span className="text-muted italic small">(Không có nội dung tương ứng - Bãi bỏ)</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Cột Thuyết minh */}
                                                        {(hasExplanations || (row.base_node && row.base_node.explanation)) && (
                                                            <div className="col-4 p-3 explanation-cell border-start">
                                                                <div className="d-flex justify-content-between mb-2">
                                                                    <Badge color="warning-subtle" className="text-warning text-uppercase">Thuyết minh</Badge>
                                                                    {editingExpId !== (row.draft_node?.id || row.base_node?.id) && (
                                                                        <Button 
                                                                            size="xs" 
                                                                            color="link" 
                                                                            className="p-0 text-decoration-none"
                                                                            onClick={() => {
                                                                                const tid = row.draft_node?.id || row.base_node?.id;
                                                                                setEditingExpId(tid);
                                                                                setTempExpContent(row.display_explanation || "");
                                                                            }}
                                                                        >
                                                                            <i className="ri-pencil-line"></i> Sửa
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                                {editingExpId === (row.draft_node?.id || row.base_node?.id) ? (
                                                                    <div className="d-flex flex-column gap-2">
                                                                        <Input 
                                                                            type="textarea" 
                                                                            rows="4"
                                                                            className="form-control-sm"
                                                                            value={tempExpContent}
                                                                            onChange={(e) => setTempExpContent(e.target.value)}
                                                                            autoFocus
                                                                        />
                                                                        <div className="d-flex gap-2 justify-content-end">
                                                                            <Button size="xs" color="soft-danger" onClick={() => setEditingExpId(null)}>Hủy</Button>
                                                                            <Button size="xs" color="primary" onClick={() => handleSaveExplanation(row.draft_node?.id || row.base_node?.id)}>Lưu</Button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div 
                                                                        className="node-content text-justify text-muted small bg-warning-subtle p-2 rounded border-start border-3 border-warning cursor-pointer" 
                                                                        style={{ whiteSpace: 'pre-wrap' }}
                                                                        onClick={() => {
                                                                            const tid = row.draft_node?.id || row.base_node?.id;
                                                                            setEditingExpId(tid);
                                                                            setTempExpContent(row.display_explanation || "");
                                                                        }}
                                                                        title="Nhấn để chỉnh sửa"
                                                                    >
                                                                        {row.display_explanation || <em className="text-muted">(Chưa có thuyết minh - Nhấn để thêm)</em>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </SimpleBar>
                                    </CardBody>
                                </Card>
                            </Col>
                            {showAIWorkbench && (
                                <Col lg={4}>
                                    <SimpleBar style={{ maxHeight: "calc(100vh - 180px)" }}>
                                        <AIWorkbench versionId={versionId} />
                                    </SimpleBar>
                                </Col>
                            )}
                        </Row>
                    </TabPane>

                    <TabPane tabId="2">
                        <ComparisonSyncTab 
                            versionId={versionId} 
                            gsheetUrlProp={data.explanation_sheet_url}
                            onSyncSuccess={fetchWorkspaceData}
                        />
                    </TabPane>
                </TabContent>

                {/* Modal để chọn ánh xạ thủ công */}
                <Modal isOpen={mappingModal} toggle={() => setMappingModal(false)} className="modal-dialog-centered">
                    <ModalHeader toggle={() => setMappingModal(false)}>
                        <i className="ri-links-line me-2"></i> Ghép Điều/Khoản Dự thảo
                    </ModalHeader>
                    <ModalBody>
                        <p className="mb-3">
                            Ghép nội dung dự thảo tương ứng cho: <Badge color="secondary">{selectedBaseNode?.node_label}</Badge>
                        </p>
                        
                        <div className="search-box mb-3">
                            <Input 
                                type="text" 
                                placeholder="Tìm nhanh theo tên điều (VD: Điều 10)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-light"
                            />
                        </div>

                        <SimpleBar style={{ maxHeight: "300px" }} className="node-selection-list border rounded p-2">
                            {filteredNodes.length > 0 ? (
                                filteredNodes.map(node => (
                                    <div 
                                        key={node.id} 
                                        className={`node-item p-2 mb-1 rounded cursor-pointer d-flex justify-content-between align-items-center ${currentMappedId === node.id ? 'bg-primary-subtle border-primary' : 'hover-bg-light border text-dark'}`}
                                        onClick={() => handleUpdateMapping(node.id)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div>
                                            <span className="fw-medium">{formatNodeLabel(node.node_label)}</span>
                                            <div className="text-muted small text-truncate" style={{ maxWidth: '300px' }}>
                                                {node.content?.substring(0, 100)}...
                                            </div>
                                        </div>
                                        {currentMappedId === node.id && <i className="ri-check-line text-primary fw-bold"></i>}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-4 text-muted">Không tìm thấy Điều nào khớp</div>
                            )}
                        </SimpleBar>

                        {currentMappedId && (
                            <div className="mt-3 text-center">
                                <Button color="danger" outline size="sm" onClick={() => handleUpdateMapping(null)}>
                                    <i className="ri-link-unlink me-1"></i> Hủy ánh xạ hiện tại
                                </Button>
                            </div>
                        )}
                        
                        <div className="mt-3 bg-light p-2 rounded">
                            <p className="text-muted small italic mb-0">
                                <i className="ri-information-line me-1"></i> Chọn điều từ danh sách để thiết lập điểm so sánh tương ứng.
                            </p>
                        </div>
                    </ModalBody>
                </Modal>

                <ToastContainer />

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: "none" }} 
                  accept=".docx" 
                  onChange={handleFileChange} 
                />
            </Container>
        </div>
    );
};

export default ComparisonWorkspace;
