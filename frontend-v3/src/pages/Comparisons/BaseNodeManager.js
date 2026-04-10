import React, { useState, useEffect } from 'react';
import { 
    Container, Row, Col, Card, CardBody, CardHeader, Button, 
    Table, Input, Label, Badge, Modal, ModalHeader, ModalBody, ModalFooter
} from 'reactstrap';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { toast, ToastContainer } from 'react-toastify';

const BaseNodeManager = () => {
    const { id, versionId } = useParams();
    const navigate = useNavigate();
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [addModal, setAddModal] = useState(false);
    const [addTargetNode, setAddTargetNode] = useState(null);
    const [addPosition, setAddPosition] = useState('below');
    const [addLabel, setAddLabel] = useState('');
    const [addContent, setAddContent] = useState('');
    const [addType, setAddType] = useState('Điều');

    const [editModal, setEditModal] = useState(false);
    const [selectedNode, setSelectedNode] = useState(null);
    const [editLabel, setEditLabel] = useState('');
    const [editContent, setEditContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchNodes();
    }, [id, versionId]);

    const fetchNodes = async () => {
        try {
            let url = `/api/comparisons/projects/${id}/base_nodes/`;
            if (versionId) {
                url = `/api/comparisons/versions/${versionId}/nodes/`;
            }
            const res = await axios.get(url, getAuthHeader());
            const data = res.results || res;
            setNodes(Array.isArray(data) ? data : []);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching nodes", error);
            toast.error("Không thể tải cấu trúc văn bản");
        }
    };

    const toggleEdit = (node) => {
        setSelectedNode(node);
        if(node) {
            setEditLabel(node.node_label);
            setEditContent(node.content);
        }
        setEditModal(!editModal);
    };

    const handleUpdate = async () => {
        if (!selectedNode) return;
        setSubmitting(true);
        try {
            await axios.patch(`/api/comparisons/nodes/${selectedNode.id}/`, {
                node_label: editLabel,
                content: editContent
            }, getAuthHeader());
            toast.success("Cập nhật thành công!");
            setEditModal(false);
            fetchNodes();
        } catch (error) {
            toast.error("Lỗi khi cập nhật");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (nodeId) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa mục này khỏi văn bản?")) return;
        try {
            await axios.delete(`/api/comparisons/nodes/${nodeId}/`, getAuthHeader());
            toast.success("Đã xóa!");
            fetchNodes();
        } catch (error) {
            toast.error("Lỗi khi xóa");
        }
    };

    const openAddModal = (targetNode, position) => {
        setAddTargetNode(targetNode);
        setAddPosition(position);
        setAddLabel('');
        setAddContent('');
        setAddType(targetNode.node_type || 'Điều');
        setAddModal(true);
    };

    const handleAdd = async () => {
        setSubmitting(true);
        try {
            if (addTargetNode) {
                await axios.post(`/api/comparisons/nodes/${addTargetNode.id}/insert_node/`, {
                    position: addPosition,
                    node_label: addLabel,
                    content: addContent,
                    node_type: addType
                }, getAuthHeader());
            } else {
                // Tạo node đầu tiên cho văn bản (Văn bản gốc hoặc Dự thảo)
                await axios.post(`/api/comparisons/nodes/`, {
                    project: versionId ? null : id,
                    version: versionId || null,
                    node_label: addLabel,
                    content: addContent,
                    node_type: addType,
                    order_index: 0
                }, getAuthHeader());
            }
            toast.success("Đã thêm mục mới!");
            setAddModal(false);
            fetchNodes();
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi thêm mục mới");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="page-content">
            <Container fluid>
                <div className="d-flex align-items-center mb-3">
                    <Button color="light" className="btn-icon me-3" onClick={() => navigate(`/comparisons/${id}`)}>
                        <i className="ri-arrow-left-line"></i>
                    </Button>
                    <div className="flex-grow-1">
                        <h4 className="mb-0">{versionId ? "Quản lý Cấu trúc Bản Dự thảo" : "Quản lý Cấu trúc Văn bản Gốc"}</h4>
                        <p className="text-muted mb-0">
                            {versionId ? "Kiểm tra và sửa các Điều/Khoản đã bóc tách từ file dự thảo." : "Điều chỉnh các Điều/Khoản đã được hệ thống bóc tách từ file gốc."}
                        </p>
                    </div>
                    <div>
                        <Button color="success" onClick={() => openAddModal(nodes[nodes.length - 1] || null, 'below')} className="btn-label">
                            <i className="ri-add-line label-icon align-middle fs-16 me-2"></i> Thêm mục mới
                        </Button>
                    </div>
                </div>

                <Row>
                    <Col lg={12}>
                        <Card className="border-0 shadow-sm">
                            <CardBody>
                                {loading ? (
                                    <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                                ) : (
                                    <div className="table-responsive">
                                        <Table className="table-bordered align-middle mb-0">
                                            <thead className="bg-soft-light text-uppercase text-muted fs-11">
                                                <tr>
                                                    <th style={{ width: '150px' }}>Nhãn</th>
                                                    <th>Nội dung Điều/Khoản/Mục</th>
                                                    <th style={{ width: '220px' }} className="text-center">Hành động</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {nodes.length > 0 ? nodes.map((node) => (
                                                    <tr key={node.id}>
                                                        <td className="fw-bold text-info">{node.node_label}</td>
                                                        <td style={{ whiteSpace: 'pre-wrap' }} className="small text-white-50">
                                                            {node.content}
                                                        </td>
                                                        <td>
                                                            <div className="d-flex gap-1 justify-content-center">
                                                                <Button size="sm" color="soft-info" onClick={() => openAddModal(node, 'above')} title="Thêm phía trên">
                                                                    <i className="ri-arrow-up-line"></i>
                                                                </Button>
                                                                <Button size="sm" color="soft-info" onClick={() => openAddModal(node, 'below')} title="Thêm phía dưới">
                                                                    <i className="ri-arrow-down-line"></i>
                                                                </Button>
                                                                <div className="vr mx-1"></div>
                                                                <Button size="sm" color="soft-warning" onClick={() => toggleEdit(node)} title="Sửa">
                                                                    <i className="ri-pencil-fill"></i>
                                                                </Button>
                                                                <Button size="sm" color="soft-danger" onClick={() => handleDelete(node.id)} title="Xóa">
                                                                    <i className="ri-delete-bin-fill"></i>
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan="3" className="text-center py-4 text-muted">
                                                            Chưa có nội dung bóc tách. Hãy bấm "Thêm mục mới" để bắt đầu.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </Table>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </Col>
                </Row>

                <Modal isOpen={editModal} toggle={() => setEditModal(false)} centered size="lg">
                    <ModalHeader className="bg-light p-3" toggle={() => setEditModal(false)}>Chỉnh sửa Điều/Khoản</ModalHeader>
                    <ModalBody>
                        <div className="mb-3">
                            <Label className="form-label fw-bold">Nhãn mục</Label>
                            <Input 
                                type="text" 
                                className="form-control-light"
                                value={editLabel} 
                                onChange={(e) => setEditLabel(e.target.value)}
                            />
                        </div>
                        <div className="mb-3">
                            <Label className="form-label fw-bold">Nội dung</Label>
                            <Input 
                                type="textarea" 
                                rows="8"
                                className="form-control-light"
                                value={editContent} 
                                onChange={(e) => setEditContent(e.target.value)}
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="link" className="link-success fw-medium" onClick={() => setEditModal(false)}>Hủy</Button>
                        <Button color="primary" className="px-4" onClick={handleUpdate} disabled={submitting}>
                            {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                        </Button>
                    </ModalFooter>
                </Modal>

                <Modal isOpen={addModal} toggle={() => setAddModal(false)} centered size="lg">
                    <ModalHeader className="bg-light p-3" toggle={() => setAddModal(false)}>
                        Thêm mục mới vào phía {addPosition === 'above' ? 'trên' : 'dưới'} dòng: {addTargetNode?.node_label}
                    </ModalHeader>
                    <ModalBody>
                        <Row className="gy-3">
                            <Col md={6}>
                                <Label className="form-label fw-bold">Loại mục</Label>
                                <select 
                                    className="form-select form-control-light"
                                    value={addType}
                                    onChange={(e) => setAddType(e.target.value)}
                                >
                                    <option value="Phần">Phần</option>
                                    <option value="Chương">Chương</option>
                                    <option value="Mục">Mục</option>
                                    <option value="Tiểu mục">Tiểu mục</option>
                                    <option value="Điều">Điều</option>
                                    <option value="Khoản">Khoản</option>
                                    <option value="Điểm">Điểm</option>
                                    <option value="Phụ lục">Phụ lục</option>
                                    <option value="Vấn đề khác">Vấn đề khác</option>
                                </select>
                            </Col>
                            <Col md={6}>
                                <Label className="form-label fw-bold">Nhãn mục</Label>
                                <Input 
                                    type="text" 
                                    className="form-control-light"
                                    placeholder="Ví dụ: Điều 1a, Khoản 2..."
                                    value={addLabel} 
                                    onChange={(e) => setAddLabel(e.target.value)}
                                />
                            </Col>
                            <Col md={12}>
                                <Label className="form-label fw-bold">Nội dung</Label>
                                <Input 
                                    type="textarea" 
                                    rows="8"
                                    className="form-control-light"
                                    placeholder="Nhập nội dung mục văn bản..."
                                    value={addContent} 
                                    onChange={(e) => setAddContent(e.target.value)}
                                />
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="link" className="link-success fw-medium" onClick={() => setAddModal(false)}>Hủy</Button>
                        <Button color="info" className="px-4" onClick={handleAdd} disabled={submitting}>
                            {submitting ? "Đang thêm..." : "Thêm mục mới"}
                        </Button>
                    </ModalFooter>
                </Modal>
                <ToastContainer />
            </Container>
        </div>
    );
};

export default BaseNodeManager;
