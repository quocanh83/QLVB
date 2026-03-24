import React, { useState, useEffect } from 'react';
import { Table, Select, Button, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import axios from 'axios';

const NodeAssignmentPanel = ({ documentId }) => {
    const [treeData, setTreeData] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Map: { nodeId: [userId1, userId2] }
    const [assignmentsMap, setAssignmentsMap] = useState({});

    const getAuthHeader = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    });

    useEffect(() => {
        fetchUsers();
        fetchNodes();
    }, [documentId]);

    const fetchUsers = async () => {
        try {
            const res = await axios.get('/api/accounts/users/', getAuthHeader());
            setUsers(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchNodes = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/documents/${documentId}/nodes/`, getAuthHeader());
            setTreeData(res.data);
            
            // Lấy ID phân công ban đầu
            const initialMap = {};
            const extractAssignments = (nodes) => {
                nodes.forEach(n => {
                    if (n.assignments && n.assignments.length > 0) {
                        initialMap[n.id] = n.assignments.map(a => a.user);
                    }
                    if (n.children) extractAssignments(n.children);
                });
            };
            extractAssignments(res.data);
            setAssignmentsMap(initialMap);
            
        } catch (e) {
            message.error('Lỗi khi tải cây văn bản');
        }
        setLoading(false);
    };

    const handleAssignChange = (nodeId, selectedUserIds) => {
        setAssignmentsMap(prev => ({ ...prev, [nodeId]: selectedUserIds }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const assignmentsArray = Object.keys(assignmentsMap).map(nodeId => ({
                node_id: parseInt(nodeId),
                user_ids: assignmentsMap[nodeId]
            }));
            
            await axios.post(`/api/documents/${documentId}/assign_nodes/`, {
                assignments: assignmentsArray
            }, getAuthHeader());
            message.success('Cập nhật phân công thành công!');
        } catch (error) {
            message.error('Lỗi khi lưu phân công: ' + (error.response?.data?.error || ''));
        }
        setSaving(false);
    };

    const columns = [
        {
            title: 'Cấu trúc Văn bản (Tự động cấp quyền Edit)',
            dataIndex: 'node_label',
            key: 'node_label',
            width: '45%',
        },
        {
            title: 'Phân công cho Chuyên viên',
            key: 'assign',
            width: '55%',
            render: (_, record) => (
                <Select
                    mode="multiple"
                    placeholder="Chọn người thực hiện"
                    style={{ width: '100%' }}
                    value={assignmentsMap[record.id] || []}
                    onChange={(values) => handleAssignChange(record.id, values)}
                    options={users.map(u => ({ label: `${u.username} (${u.full_name})`, value: u.id }))}
                />
            )
        }
    ];

    return (
        <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                <h3 style={{margin: 0, color: '#1976d2'}}>BẢNG GIAO VIỆC DÀNH CHO TRƯỞNG NHÓM (LEAD)</h3>
                <Button type="primary" style={{background: '#10b981'}} icon={<SaveOutlined />} onClick={handleSave} loading={saving}>Lưu Tiến Trình</Button>
            </div>
            <Table
                columns={columns}
                dataSource={treeData}
                rowKey="id"
                loading={loading}
                pagination={false}
                bordered
                defaultExpandAllRows
            />
        </div>
    );
};

export default NodeAssignmentPanel;
