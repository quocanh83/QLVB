import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Button, Typography, Layout, Tree, Alert, Space, Spin, message } from 'antd';
import {
    BookOutlined,
    CheckCircleOutlined,
    SyncOutlined,
    ArrowLeftOutlined,
    FileSearchOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getAuthHeader } from '../utils/authHelpers';
import ExplanationTable from '../components/ExplanationTable';
import { useAppTheme } from '../context/ThemeContext';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const DraftExplanation = () => {
    const { isDarkMode } = useAppTheme();
    const [view, setView] = useState('overview'); // 'overview' or 'detail'
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState([]);
    const [treeData, setTreeData] = useState([]);
    const [selectedNodeId, setSelectedNodeId] = useState(null);

    useEffect(() => {
        if (view === 'overview') {
            fetchStats();
        }
    }, [view]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:8000/api/documents/explanation_stats/', getAuthHeader());
            setStats(res.data);
        } catch (e) {
            message.error("Lỗi khi tải thống kê dự thảo.");
        }
        setLoading(false);
    };

    const fetchTree = async (docId) => {
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:8000/api/documents/${docId}/feedback_nodes/`, getAuthHeader());
            const formatted = formatTreeData(res.data);
            setTreeData(formatted);
            if (formatted.length > 0) {
                // Tự động chọn node đầu tiên có góp ý
                setSelectedNodeId(formatted[0].key);
            }
        } catch (e) {
            message.error("Lỗi khi tải danh mục dự thảo.");
        }
        setLoading(false);
    };

    const formatTreeData = (nodes) => {
        return nodes.map(n => ({
            title: (
                <Space>
                    <Text>{n.node_label}</Text>
                    <Tag color={n.resolved_feedbacks === n.total_feedbacks ? 'green' : 'orange'}>
                        ({n.resolved_feedbacks}/{n.total_feedbacks})
                    </Tag>
                </Space>
            ),
            key: n.id,
            children: n.children ? formatTreeData(n.children) : []
        }));
    };

    const handleOpenDetail = (record) => {
        setSelectedDoc(record);
        setView('detail');
        fetchTree(record.id);
    };

    const columns = [
        {
            title: 'Tên Dự thảo',
            dataIndex: 'project_name',
            key: 'project_name',
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Tổng số góp ý',
            dataIndex: 'total_feedbacks',
            key: 'total_feedbacks',
            align: 'center',
            render: (val) => <Tag color="blue">{val}</Tag>
        },
        {
            title: 'Đã giải trình',
            dataIndex: 'resolved_feedbacks',
            key: 'resolved_feedbacks',
            align: 'center',
            render: (val) => <Tag color="green">{val}</Tag>
        },
        {
            title: 'Chưa giải trình',
            key: 'unresolved',
            align: 'center',
            render: (_, record) => (
                <Tag color="volcano">{record.total_feedbacks - record.resolved_feedbacks}</Tag>
            )
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Button
                    type="primary"
                    icon={<SyncOutlined />}
                    onClick={() => handleOpenDetail(record)}
                >
                    Giải trình
                </Button>
            )
        }
    ];

    if (view === 'overview') {
        return (
            <div style={{ padding: 24 }}>
                <Title level={2}>Giải trình Dự thảo <FileSearchOutlined /></Title>
                <Alert
                    message="Hướng dẫn"
                    description="Chọn một dự thảo đang trong quá trình lấy ý kiến để thực hiện việc tiếp thu và giải trình các góp ý từ các cơ quan, đơn vị."
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                />
                <Table
                    columns={columns}
                    dataSource={stats}
                    loading={loading}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                />
            </div>
        );
    }

    return (
        <Layout style={{ height: '100%', background: 'transparent' }}>
            <Sider width={300} theme={isDarkMode ? "dark" : "light"} style={{ borderRight: '1px solid var(--border-color)', overflow: 'auto', background: 'transparent' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => setView('overview')} type="text" />
                    <Title level={4} style={{ margin: 0, marginLeft: 8 }}>Danh mục Dự thảo</Title>
                </div>
                <div style={{ padding: '16px 0' }}>
                    <Tree
                        defaultExpandAll
                        selectedKeys={[selectedNodeId]}
                        onSelect={(keys) => keys[0] && setSelectedNodeId(keys[0])}
                        treeData={treeData}
                        showIcon={false}
                    />
                </div>
            </Sider>
            <Content style={{ padding: 24, overflow: 'auto', background: 'transparent' }}>
                <Card title={`Dự thảo: ${selectedDoc?.project_name}`} extra={<Tag color="processing">{selectedDoc?.status}</Tag>}>
                    {selectedNodeId ? (
                        <ExplanationTable documentId={selectedDoc.id} nodeId={selectedNodeId} />
                    ) : (
                        <div style={{ textAlign: 'center', padding: '100px 0' }}>
                            <Spin size="large" />
                            <p style={{ marginTop: 16 }}>Vui lòng chọn một Điều/Khoản trong danh mục để bắt đầu giải trình.</p>
                        </div>
                    )}
                </Card>
            </Content>
        </Layout>
    );
};

export default DraftExplanation;
