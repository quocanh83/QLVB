import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, List, Typography, Spin, message, Badge } from 'antd';
import { 
    FileTextOutlined, 
    MessageOutlined, 
    CheckCircleOutlined, 
    BankOutlined 
} from '@ant-design/icons';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';
import axios from 'axios';
import { getAuthHeader } from '../utils/authHelpers';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        cards: { totalDocs: 0, totalFeedbacks: 0, resolvedFeedbacks: 0, agenciesCount: 0 },
        topDocs: [],
        trendData: [],
        recentActivity: []
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const res = await axios.get('/api/documents/dashboard_stats/', getAuthHeader());
            setData(res.data);
        } catch (error) {
            message.error("Lỗi khi tải dữ liệu tổng quan");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: 50 }}>
                <Spin size="large" />
            </div>
        );
    }

    const { cards, topDocs, trendData, recentActivity } = data;

    return (
        <div style={{ padding: 24, overflow: 'auto', height: '100%' }}>
            <Title level={2} style={{ marginBottom: 24 }}>Tổng quan Hệ thống</Title>

            {/* KPI Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ height: '100%' }}>
                        <Statistic
                            title="Tổng số Dự thảo"
                            value={cards.totalDocs}
                            prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ height: '100%' }}>
                        <Statistic
                            title="Tổng số Góp ý"
                            value={cards.totalFeedbacks}
                            prefix={<MessageOutlined style={{ color: '#eb2f96' }} />}
                            valueStyle={{ color: '#eb2f96' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ height: '100%' }}>
                        <Statistic
                            title="Đã Giải trình"
                            value={cards.resolvedFeedbacks}
                            suffix={`/ ${cards.totalFeedbacks}`}
                            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ height: '100%' }}>
                        <Statistic
                            title="Cơ quan Đóng góp"
                            value={cards.agenciesCount}
                            prefix={<BankOutlined style={{ color: '#faad14' }} />}
                            valueStyle={{ color: '#faad14' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Charts */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={12}>
                    <Card title="Xu hướng Góp ý (7 ngày gần nhất)" bordered={false}>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trendData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis allowDecimals={false} />
                                <RechartsTooltip />
                                <Legend />
                                <Line type="monotone" name="Số Góp ý mới" dataKey="count" stroke="#1890ff" activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="Top Dự thảo nhận nhiều Góp ý" bordered={false}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topDocs} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                                <RechartsTooltip />
                                <Legend />
                                <Bar dataKey="feedbacks" name="Số lượng Góp ý" fill="#eb2f96" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
            </Row>

            {/* Activity Timeline */}
            <Row gutter={[16, 16]}>
                <Col span={24}>
                    <Card title="Hoạt động Mới nhất" bordered={false}>
                        <List
                            itemLayout="horizontal"
                            dataSource={recentActivity}
                            renderItem={item => (
                                <List.Item>
                                    <List.Item.Meta
                                        avatar={<Badge status={item.type === 'feedback' ? 'processing' : 'success'} />}
                                        title={
                                            <span>
                                                <Text strong>{item.user}</Text> {item.content} trong dự thảo <Text strong style={{ color: '#1890ff' }}>{item.document}</Text>
                                            </span>
                                        }
                                        description={dayjs(item.time).format('HH:mm - DD/MM/YYYY')}
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;
