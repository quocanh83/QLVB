import React, { useState, useEffect, useMemo } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Table, Button, Spinner, Nav, NavItem, NavLink, TabContent, TabPane, Input, InputGroup } from 'reactstrap';
import Select from 'react-select';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast } from 'react-toastify';
import { useProfile } from "../../Components/Hooks/UserHooks";
import classnames from 'classnames';

const NodeAssignmentModal = ({ isOpen, toggle, doc, onSuccess }) => {
    const { userProfile } = useProfile();
    const [nodes, setNodes] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('1');
    const [quickInputs, setQuickInputs] = useState({}); // { userId: "1-5, 10" }
    
    // assignments map: { node_id: [user_id1, user_id2] }
    const [assignments, setAssignments] = useState({});

    const isAdmin = useMemo(() => {
        if (!userProfile) return false;
        // Kiểm tra nhiều trường hợp: Django (is_staff) hoặc FakeBackend (role === 'admin')
        const roles = userProfile.roles || [];
        return (
            userProfile.is_staff === true || 
            userProfile.is_superuser === true || 
            userProfile.role === 'admin' || 
            userProfile.role === 'Admin' ||
            roles.some(r => (typeof r === 'string' ? r === 'Admin' : r.role_name === 'Admin'))
        );
    }, [userProfile]);

    // Danh sách các loại node được phép phân công (Bỏ qua Khoản, Điểm)
    const assignableTypes = ['Chương', 'Mục', 'Điều', 'Phụ lục', 'Vấn đề khác', 'Tiểu mục'];

    // Lọc danh sách cán bộ có thể phân công
    const eligibleUsers = useMemo(() => {
        if (isAdmin) return users;
        return users.filter(u => u.department_id === userProfile?.department_id);
    }, [users, isAdmin, userProfile]);

    const userOptions = eligibleUsers.map(u => ({
        value: u.id,
        label: `${u.full_name || u.username} (${u.department_name || 'N/A'})`
    }));

    // Tạo danh sách các Điều/Khoản dạng phẳng để chọn trong Tab 2
    const nodeOptions = useMemo(() => {
        const options = [];
        const flatten = (list) => {
            list.forEach(n => {
                if (assignableTypes.includes(n.node_type)) {
                    options.push({ value: n.id, label: n.node_label, type: n.node_type });
                }
                if (n.children) flatten(n.children);
            });
        };
        flatten(nodes);
        return options;
    }, [nodes]);

    const fetchData = async () => {
        if (!doc) return;
        setLoading(true);
        try {
            const [nodesRes, usersRes] = await Promise.all([
                axios.get(`/api/documents/${doc.id}/nodes/`, getAuthHeader()),
                axios.get('/api/accounts/users/', getAuthHeader())
            ]);
            
            const nodesData = nodesRes.results || nodesRes;
            const usersData = usersRes.results || usersRes;

            setNodes(Array.isArray(nodesData) ? nodesData : []);
            setUsers(Array.isArray(usersData) ? usersData : []);

            const initialAssignments = {};
            const flattenAssignments = (nodeList) => {
                nodeList.forEach(node => {
                    if (node.assignments && node.assignments.length > 0) {
                        initialAssignments[node.id] = node.assignments.map(a => (a.user.id || a.user));
                    }
                    if (node.children) flattenAssignments(node.children);
                });
            };
            flattenAssignments(Array.isArray(nodesData) ? nodesData : []);
            setAssignments(initialAssignments);

        } catch (error) {
            toast.error("Không thể tải dữ liệu phân công.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchData();
    }, [isOpen, doc]);

    const handleUserChange = (nodeId, selectedOptions) => {
        const userIds = selectedOptions ? selectedOptions.map(o => o.value) : [];
        setAssignments(prev => ({ ...prev, [nodeId]: userIds }));
    };

    const handleNodeChangeForUser = (userId, selectedNodes) => {
        const newNodeIds = selectedNodes ? selectedNodes.map(o => o.value) : [];
        
        setAssignments(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(nodeId => {
                next[nodeId] = (next[nodeId] || []).filter(uid => uid !== userId);
            });
            newNodeIds.forEach(nodeId => {
                if (!next[nodeId]) next[nodeId] = [];
                if (!next[nodeId].includes(userId)) {
                    next[nodeId].push(userId);
                }
            });
            return next;
        });
    };

    // Hàm phân tích chuỗi như "1-5, 10, 12-15"
    const parseRangeText = (text) => {
        if (!text) return [];
        const result = [];
        const parts = text.split(',').map(p => p.trim());
        
        parts.forEach(part => {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                        result.push(i);
                    }
                }
            } else {
                const num = parseInt(part);
                if (!isNaN(num)) result.push(num);
            }
        });
        return [...new Set(result)]; // Xóa trùng
    };

    const handleQuickAssign = (userId) => {
        const text = quickInputs[userId];
        if (!text) return;
        const targetNumbers = parseRangeText(text);
        
        const matchedNodeIds = nodeOptions
            .filter(n => {
                // Chỉ gán cho loại 'Điều' khi nhập số
                if (n.type !== 'Điều') return false;
                // Tìm số trong nhãn (vd: "Điều 5" -> 5)
                const match = n.label.match(/\d+/);
                return match && targetNumbers.includes(parseInt(match[0]));
            })
            .map(n => n.value);

        if (matchedNodeIds.length === 0) {
            toast.warning("Không tìm thấy Điều nào khớp với số bạn nhập.");
            return;
        }

        handleNodeChangeForUser(userId, matchedNodeIds.map(id => ({ value: id })));
        setQuickInputs(prev => ({ ...prev, [userId]: "" }));
        toast.success(`Đã gán ${matchedNodeIds.length} Điều cho cán bộ.`);
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            const payload = {
                assignments: Object.keys(assignments).map(nodeId => ({
                    node_id: parseInt(nodeId),
                    user_ids: assignments[nodeId]
                }))
            };
            await axios.post(`/api/documents/${doc.id}/assign_nodes/`, payload, getAuthHeader());
            toast.success("Cập nhật phân công chuyên viên thành công!");
            onSuccess();
            toggle();
        } catch (error) {
            toast.error(error.response?.data?.error || "Lỗi khi lưu phân công.");
        } finally {
            setSaving(false);
        }
    };

    const renderNodesByArticle = (nodeList, level = 0) => {
        return nodeList.map(node => {
            const currentSelected = (assignments[node.id] || []).map(uid => {
                const u = users.find(user => (user.id || user.uid) === uid);
                return u ? { value: uid, label: u.full_name || u.username } : null;
            }).filter(Boolean);

            const nodesToRender = [];
            if (assignableTypes.includes(node.node_type)) {
                nodesToRender.push(
                    <tr key={node.id}>
                        <td style={{ paddingLeft: `${level * 20 + 12}px` }}>
                            <div className="d-flex align-items-center">
                                {level > 0 && <i className="ri-corner-down-right-line me-2 text-muted"></i>}
                                <span className={classnames("flex-grow-1", { "fw-semibold text-primary": level === 0, "text-body": level > 0 })}>
                                    {node.node_label}
                                </span>
                            </div>
                        </td>
                        <td>
                            <Select
                                isMulti
                                options={userOptions}
                                value={currentSelected}
                                onChange={(val) => handleUserChange(node.id, val)}
                                placeholder="Chọn chuyên viên..."
                                classNamePrefix="react-select"
                                menuPortalTarget={document.body}
                                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                            />
                        </td>
                    </tr>
                );
            }
            const childrenRows = node.children ? renderNodesByArticle(node.children, level + 1) : [];
            return (
                <React.Fragment key={node.id}>
                    {nodesToRender}
                    {childrenRows}
                </React.Fragment>
            );
        });
    };

    const renderSpecialistsView = () => {
        return eligibleUsers.map(user => {
            const userId = user.id || user.uid;
            const assignedNodesForThisUser = Object.keys(assignments)
                .filter(nodeId => (assignments[nodeId] || []).includes(userId))
                .map(nodeId => {
                    const node = nodeOptions.find(n => n.value == nodeId);
                    return node ? { value: node.value, label: node.label } : null;
                }).filter(Boolean);

            return (
                <tr key={userId}>
                    <td className="fw-medium">
                        {user.full_name || user.username}
                        <div className="text-muted fs-11">{user.department_name || 'N/A'}</div>
                    </td>
                    <td>
                        <div className="mb-2">
                            <InputGroup size="sm">
                                <Input 
                                    placeholder="Nhập dải Điều (vd: 1-5, 10, 12-15)" 
                                    value={quickInputs[userId] || ""}
                                    onChange={(e) => setQuickInputs(prev => ({ ...prev, [userId]: e.target.value }))}
                                    onKeyPress={(e) => e.key === 'Enter' && handleQuickAssign(userId)}
                                />
                                <Button color="info" outline onClick={() => handleQuickAssign(userId)}>Gán nhanh</Button>
                            </InputGroup>
                        </div>
                        <Select
                            isMulti
                            options={nodeOptions}
                            value={assignedNodesForThisUser}
                            onChange={(val) => handleNodeChangeForUser(userId, val)}
                            placeholder="Hoặc chọn các Chương/Điều phụ trách..."
                            classNamePrefix="react-select"
                            menuPortalTarget={document.body}
                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                        />
                    </td>
                </tr>
            );
        });
    };

    return (
        <Modal isOpen={isOpen} toggle={toggle} size="xl" scrollable centered>
            <ModalHeader toggle={toggle} className="bg-success text-white p-3">
                <span className="fs-16">Phân công Giải trình - {doc?.project_name}</span>
            </ModalHeader>
            <ModalBody className="p-0">
                <div className="bg-light px-3 pt-3 border-bottom">
                    <Nav tabs className="nav-tabs-custom nav-success border-bottom-0">
                        <NavItem>
                            <NavLink
                                className={classnames({ active: activeTab === '1' })}
                                onClick={() => setActiveTab('1')}
                                style={{ cursor: 'pointer' }}
                            >
                                <i className="ri-node-tree me-1 align-middle"></i> Theo Điều / Khoản
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink
                                className={classnames({ active: activeTab === '2' })}
                                onClick={() => setActiveTab('2')}
                                style={{ cursor: 'pointer' }}
                            >
                                <i className="ri-group-line me-1 align-middle"></i> Theo Chuyên viên
                            </NavLink>
                        </NavItem>
                    </Nav>
                </div>

                {loading ? (
                    <div className="text-center p-5">
                        <Spinner color="primary" />
                        <p className="mt-2">Đang tải dữ liệu...</p>
                    </div>
                ) : (
                    <TabContent activeTab={activeTab}>
                        <TabPane tabId="1">
                            <div className="table-responsive">
                                <Table className="align-middle table-nowrap mb-0">
                                    <thead className="table-light sticky-top">
                                        <tr>
                                            <th>Cấu trúc Dự thảo</th>
                                            <th style={{ width: "45%" }}>Chuyên viên phụ trách</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {renderNodesByArticle(nodes)}
                                    </tbody>
                                </Table>
                            </div>
                        </TabPane>
                        <TabPane tabId="2">
                            <div className="table-responsive">
                                <Table className="align-middle table-nowrap mb-0">
                                    <thead className="table-light sticky-top">
                                        <tr>
                                            <th style={{ width: "30%" }}>Họ và tên Cán bộ</th>
                                            <th>Điều / Khoản phụ trách</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {renderSpecialistsView()}
                                    </tbody>
                                </Table>
                            </div>
                        </TabPane>
                    </TabContent>
                )}
            </ModalBody>
            <ModalFooter>
                <div className="flex-grow-1 fs-12 text-muted px-2">
                    <i className="ri-information-line me-1 text-info"></i>
                    {isAdmin ? "Quyền Admin: Phân công toàn cục" : `Đang phân công cho ${userProfile?.department_name || 'phòng ban của bạn'}`}
                </div>
                <Button color="light" onClick={toggle} disabled={saving}>Đóng</Button>
                <Button color="success" onClick={handleSubmit} disabled={saving} className="btn-load">
                    {saving ? <Spinner size="sm" /> : "Lưu dữ liệu phân công"}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default NodeAssignmentModal;
