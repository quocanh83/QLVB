import React, { useState, useEffect } from 'react';
import { 
    Container, Row, Col, Card, CardBody, Button, 
    Table, Badge, Modal, ModalHeader, ModalBody,
    Input, Label, Dropdown, DropdownToggle, DropdownMenu, DropdownItem
} from 'reactstrap';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { toast, ToastContainer } from 'react-toastify';
import SimpleBar from 'simplebar-react';
import AIWorkbench from './AIWorkbench';
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

    const handleExportWord = () => {
        const token = localStorage.getItem("access_token");
        const url = `${process.env.REACT_APP_API_URL || ''}/api/comparisons/versions/${versionId}/export_word/?token=${token}`;
        window.open(url, '_blank');
    };

    const filteredNodes = allDraftNodes.filter(node => 
        node.node_label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (node.content && node.content.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <div className="page-content text-center py-5"><div className="spinner-border text-primary"></div></div>;

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
                        <Button color="success" outline className="me-2" onClick={handleExportWord}>
                            <i className="ri-file-word-line me-1"></i> Xuất Bảng Đối Chiếu
                        </Button>
                        <Button color="info" className={showAIWorkbench ? "active" : ""} onClick={() => setShowAIWorkbench(!showAIWorkbench)}>
                            <i className="ri-robot-3-line me-1"></i> Trợ lý AI
                        </Button>
                    </div>
                </div>

                <Row>
                    <Col lg={showAIWorkbench ? 8 : 12}>
                        <Card className="comparison-card">
                            <CardBody className="p-0">
                                <div className="comparison-header bg-light border-bottom d-flex">
                                    <div className="col-6 p-2 border-end fw-bold text-center">VĂN BẢN GỐC (HÀNH CHÍNH)</div>
                                    <div className="col-6 p-2 fw-bold text-center text-primary">DỰ THẢO (CẬP NHẬT)</div>
                                </div>
                                
                                <SimpleBar style={{ maxHeight: "calc(100vh - 250px)" }}>
                                    <div className="col-12 p-0">
                                        {data.rows.map((row, idx) => (
                                            <div key={idx} className="comparison-row d-flex border-bottom">
                                                {/* Cột Gốc */}
                                                <div className="col-6 p-3 border-end base-cell">
                                                    {row.base_node ? (
                                                        <>
                                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                                {row.base_node.node_type === 'Điều' ? (
                                                                    <div className="fw-bold fs-14 text-dark mb-1 w-100">{row.base_node.node_label}</div>
                                                                ) : (
                                                                    <Badge color="secondary" outline>{formatNodeLabel(row.base_node.node_label)}</Badge>
                                                                )}
                                                                <Button size="sm" color="soft-primary" className="btn-icon rounded-circle" 
                                                                    onClick={() => {
                                                                        setSelectedBaseNode(row.base_node);
                                                                        setCurrentMappedId(row.draft_node ? row.draft_node.id : null);
                                                                        setMappingModal(true);
                                                                    }}>
                                                                    <i className="ri-links-line"></i>
                                                                </Button>
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
                                                <div className="col-6 p-3 draft-cell">
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
            </Container>
        </div>
    );
};

export default ComparisonWorkspace;
