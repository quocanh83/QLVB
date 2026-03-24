import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, Spin, message, Row, Col, Progress, Select } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import { getAuthHeader } from '../utils/authHelpers';

const { Title, Text } = Typography;
const { Option } = Select;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a05195', '#d45087'];

const SubjectStats = () => {
    const [documents, setDocuments] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState(null);
    const [data, setData] = useState({ agency_stats: [], category_stats: {} });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDocuments();
    }, []);

    useEffect(() => {
        fetchStats(selectedDocId);
    }, [selectedDocId]);

    const fetchDocuments = async () => {
        try {
            const res = await axios.get('/api/documents/', getAuthHeader());
            setDocuments(res.data);
            if (res.data.length > 0) setSelectedDocId(res.data[0].id);
        } catch (e) { message.error("Lỗi tải danh sách dự thảo"); }
    };

    const fetchStats = async (docId) => {
        setLoading(true);
        try {
            const url = `/api/feedbacks/subject_stats/${docId ? `?document_id=${docId}` : ''}`;
            const res = await axios.get(url, getAuthHeader());
            setData(res.data);
        } catch (error) {
            message.error("Lỗi khi tải dữ liệu thống kê chủ thể");
        } finally {
            setLoading(false);
        }
    };

    if (loading && documents.length === 0) {
        return <div style={{ padding: 50, textAlign: 'center' }}><Spin size="large" /></div>;
    }

    const columns = [
        {
            title: 'Cơ quan / Đơn vị',
            dataIndex: 'agency',
            key: 'agency',
            render: text => <Text strong>{text}</Text>
        },
        {
            title: 'Phân loại',
            dataIndex: 'category',
            key: 'category',
            render: text => {
                const map = { ministry: 'Bộ/Ngành', local: 'Địa phương', organization: 'Tổ chức', enterprise: 'Doanh nghiệp', other: 'Khác' };
                return map[text] || text;
            }
        },
        {
            title: 'Tổng Góp ý',
            dataIndex: 'total',
            key: 'total',
            sorter: (a, b) => a.total - b.total,
            defaultSortOrder: 'descend',
        },
        {
            title: 'Đã giải trình',
            dataIndex: 'resolved',
            key: 'resolved',
            sorter: (a, b) => a.resolved - b.resolved,
        },
        {
            title: 'Tỉ lệ Hoàn thành (%)',
            dataIndex: 'resolve_rate',
            key: 'resolve_rate',
            render: rate => (
                <Progress 
                    percent={rate} 
                    size="small" 
                    status={rate === 100 ? 'success' : 'active'}
                    strokeColor={rate > 50 ? '#52c41a' : '#faad14'}
                />
            ),
            sorter: (a, b) => a.resolve_rate - b.resolve_rate,
        }
    ];

    const chartData = (data.agency_stats || []).slice(0, 10);
    
    // Format category stats for PieChart
    const categoryMap = { ministry: 'Bộ/Ngành', local: 'Địa phương', organization: 'Tổ chức', enterprise: 'Doanh nghiệp', other: 'Khác' };
    const pieData = Object.keys(data.category_stats || {}).map(key => ({
        name: categoryMap[key] || key,
        value: data.category_stats[key]
    }));

    return (
        <div style={{ padding: 24, overflow: 'auto', height: '100%' }}>
            <Title level={2}>Thống kê Chủ thể Góp ý</Title>
            
            <div style={{ marginBottom: 24 }}>
                <Text strong style={{ marginRight: 8 }}>Chọn dự thảo để xem thống kê:</Text>
                <Select 
                    style={{ width: 400 }} 
                    value={selectedDocId} 
                    onChange={setSelectedDocId}
                    placeholder="Tất cả dự thảo"
                    allowClear
                >
                    {documents.map(d => <Option key={d.id} value={d.id}>{d.project_name}</Option>)}
                </Select>
            </div>

            <Row gutter={[24, 24]}>
                <Col span={12}>
                    <Card title="Top 10 Đơn vị tích cực nhất" bordered={false} style={{ height: 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis dataKey="agency" type="category" width={150} tick={{ fontSize: 12 }} />
                                <RechartsTooltip />
                                <Legend />
                                <Bar dataKey="total" name="Tổng số ý kiến" fill="#1890ff" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="resolved" name="Đã giải trình" fill="#52c41a" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                <Col span={12}>
                    <Card title="Phân bổ Góp ý theo Nhóm cơ quan" bordered={false} style={{ height: 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    outerRadius={120}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                <Col span={24}>
                    <Card title="Bảng Chi tiết Số liệu" bordered={false}>
                        <Table 
                            columns={columns} 
                            dataSource={data.agency_stats || []} 
                            rowKey="agency" 
                            pagination={{ pageSize: 10 }}
                            loading={loading}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default SubjectStats;
