import React, { useState, useEffect } from 'react';
import { Table, Input, Button, message, Typography, Card, Space, Breadcrumb, Select } from 'antd';
import { SaveOutlined, SettingOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

const SystemSettings = () => {
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingValues, setEditingValues] = useState({});

    const getAuthHeader = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/settings/', getAuthHeader());
            setSettings(res.data);
            
            // Khởi tạo giá trị đang sửa
            const initValues = {};
            res.data.forEach(s => {
                initValues[s.id] = s.value;
            });
            setEditingValues(initValues);
        } catch (e) {
            message.error('Không thể tải danh sách câu hình hệ thống');
        }
        setLoading(false);
    };

    const handleValueChange = (id, value) => {
        setEditingValues(prev => ({ ...prev, [id]: value }));
    };

    const saveSetting = async (id) => {
        try {
            await axios.patch(`/api/settings/${id}/`, {
                value: editingValues[id]
            }, getAuthHeader());
            message.success('Cập nhật thành công!');
            fetchSettings();
        } catch (e) {
            message.error('Lỗi khi lưu cấu hình.');
        }
    };

    const columns = [
        {
            title: 'Tham số hệ thống',
            dataIndex: 'key',
            key: 'key',
            width: '25%',
            render: (text) => <Text strong style={{color: 'var(--primary-color)'}}>{text}</Text>
        },
        {
            title: 'Mô tả ý nghĩa',
            dataIndex: 'description',
            key: 'description',
            width: '30%',
            render: (text) => <Text type="secondary">{text}</Text>
        },
        {
            title: 'Giá trị cấu hình (Value)',
            key: 'value',
            render: (_, record) => {
                if (record.key === 'EXPORT_DETAIL_LEVEL') {
                    return (
                        <Select 
                            value={editingValues[record.id]} 
                            onChange={value => handleValueChange(record.id, value)}
                            style={{width: '100%'}}
                            options={[
                                { value: 'Điều', label: 'Điều' },
                                { value: 'Điều khoản', label: 'Điều khoản' },
                                { value: 'Điều khoản điểm', label: 'Điều khoản điểm' }
                            ]}
                        />
                    );
                }
                return (
                    <Input.Password 
                        value={editingValues[record.id]} 
                        onChange={e => handleValueChange(record.id, e.target.value)}
                        placeholder="Nhập giá trị..."
                        style={{width: '100%'}}
                    />
                );
            }
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: '15%',
            render: (_, record) => (
                <Button 
                    type="primary" 
                    icon={<SaveOutlined />} 
                    onClick={() => saveSetting(record.id)}
                    style={{background: 'var(--success-color)'}}
                >
                    Lưu
                </Button>
            )
        }
    ];

    return (
        <div style={{ padding: '24px', background: 'var(--bg-layout)', minHeight: '100%' }}>
            <Breadcrumb style={{ marginBottom: 16 }}>
                <Breadcrumb.Item>Quản trị hệ thống</Breadcrumb.Item>
                <Breadcrumb.Item>Cấu hình hệ thống</Breadcrumb.Item>
            </Breadcrumb>
            
            <Card 
                title={
                    <Space>
                        <SettingOutlined />
                        <span>QUẢN TRỊ THAM SỐ HỆ THỐNG & AI COPILOT</span>
                    </Space>
                }
                styles={{ header: { background: 'var(--bg-container)', borderBottom: '1px solid var(--border-color)' } }}
            >
                <div style={{marginBottom: 24, padding: 16, background: 'var(--bg-layout)', border: '1px solid var(--primary-color)', borderRadius: 8}}>
                    <Text type="info">💡 <strong>Hướng dẫn:</strong> Tại đây bạn có thể cấu hình API Key cho các dịch vụ AI (như ChatGPT). Giá trị này sẽ được ưu tiên sử dụng thay cho biến môi trường phía server, giúp bạn thay đổi key nhanh chóng mà không cần khởi động lại máy chủ.</Text>
                </div>
                
                <Table 
                    dataSource={settings} 
                    columns={columns} 
                    rowKey="id" 
                    loading={loading}
                    pagination={false}
                    bordered
                />
            </Card>
        </div>
    );
};

export default SystemSettings;
