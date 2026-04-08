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
        if (!window.confirm("Bạn có chắc chắn muốn xóa mục này khỏi văn bản gốc?")) return;
        try {
            await axios.delete(`/api/comparisons/nodes/${nodeId}/`, getAuthHeader());
            toast.success("Đã xóa!");
            fetchNodes();
        } catch (error) {
            toast.error("Lỗi khi xóa");
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
                </div>

                <Row>
                    <Col lg={12}>
                        <Card>
                            <CardBody>
                                {loading ? (
                                    <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                                ) : (
                                    <div className="table-responsive">
                                        <Table className="table-bordered align-middle mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th style={{ width: '150px' }}>Nhãn</th>
                                                    <th>Nội dung Điều/Khoản/Mục</th>
                                                    <th style={{ width: '120px' }}>Hành động</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {nodes.map((node) => (
                                                    <tr key={node.id}>
                                                        <td className="fw-bold">{node.node_label}</td>
                                                        <td style={{ whiteSpace: 'pre-wrap' }} className="small">
                                                            {node.content}
                                                        </td>
                                                        <td>
                                                            <div className="d-flex gap-2">
                                                                <Button size="sm" color="soft-primary" onClick={() => toggleEdit(node)}>
                                                                    <i className="ri-pencil-fill"></i>
                                                                </Button>
                                                                <Button size="sm" color="soft-danger" onClick={() => handleDelete(node.id)}>
                                                                    <i className="ri-delete-bin-fill"></i>
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </Col>
                </Row>

                <Modal isOpen={editModal} toggle={() => setEditModal(false)} centered size="lg">
                    <ModalHeader toggle={() => setEditModal(false)}>Chỉnh sửa Điều/Khoản</ModalHeader>
                    <ModalBody>
                        <div className="mb-3">
                            <Label>Nhãn mục</Label>
                            <Input 
                                type="text" 
                                value={editLabel} 
                                onChange={(e) => setEditLabel(e.target.value)}
                            />
                        </div>
                        <div className="mb-3">
                            <Label>Nội dung</Label>
                            <Input 
                                type="textarea" 
                                rows="8"
                                value={editContent} 
                                onChange={(e) => setEditContent(e.target.value)}
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="light" onClick={() => setEditModal(false)}>Hủy</Button>
                        <Button color="primary" onClick={handleUpdate} disabled={submitting}>
                            {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                        </Button>
                    </ModalFooter>
                </Modal>
                <ToastContainer />
            </Container>
        </div>
    );
};

export default BaseNodeManager;
