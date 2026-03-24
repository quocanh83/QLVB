import React, { useState, useEffect } from 'react';
import { Table, Button, Typography, message, Space, Tag, Modal, Tabs, Tooltip } from 'antd';
import { FileWordOutlined, PrinterOutlined, BarChartOutlined } from '@ant-design/icons';
import axios from 'axios';
import { getAuthHeader } from '../utils/authHelpers';
import { useAppTheme } from '../context/ThemeContext';
import SubjectStats from './SubjectStats';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const Reports = () => {
    const { isDarkMode } = useAppTheme();
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Uncontributed Agencies state
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [uncontributedData, setUncontributedData] = useState([]);
    const [loadingUncontributed, setLoadingUncontributed] = useState(false);
    const [currentDocName, setCurrentDocName] = useState('');

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/documents/explanation_stats/', getAuthHeader());
            setStats(res.data);
        } catch (error) {
            console.error(error);
            message.error('Không thể tải dữ liệu thống kê.');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (docId) => {
        try {
            message.loading({ content: 'Đang xuất báo cáo...', key: 'exporting' });
            
            const response = await axios({
                url: `/api/documents/${docId}/export_report/`,
                method: 'GET',
                responseType: 'blob',
                headers: {
                    ...getAuthHeader().headers
                }
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `bao_cao_giai_trinh_${docId}.docx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            message.success({ content: 'Xuất báo cáo thành công!', key: 'exporting' });
        } catch (error) {
            console.error('Lỗi khi xuất:', error);
            message.error({ content: 'Có lỗi xảy ra khi xuất báo cáo.', key: 'exporting' });
        }
    };

    const handleViewUncontributed = async (record) => {
        setCurrentDocName(record.project_name);
        setIsModalVisible(true);
        setLoadingUncontributed(true);
        try {
            const res = await axios.get(`/api/feedbacks/uncontributed/?document_id=${record.id}`, getAuthHeader());
            setUncontributedData(res.data);
        } catch (error) {
            message.error("Lỗi khi lấy danh sách cơ quan chưa góp ý");
        } finally {
            setLoadingUncontributed(false);
        }
    };

    const columns = [
        {
            title: 'Tên Dự thảo',
            dataIndex: 'project_name',
            key: 'project_name',
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Số Góp ý',
            key: 'total',
            align: 'center',
            render: (_, record) => <Tag color="blue">{record.total_feedbacks}</Tag>
        },
        {
            title: 'Đã giải trình',
            key: 'resolved',
            align: 'center',
            render: (_, record) => <Tag color="green">{record.resolved_feedbacks}</Tag>
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button 
                        type="primary"
                        icon={<FileWordOutlined />}
                        onClick={() => handleExport(record.id)}
                        disabled={record.total_feedbacks === 0}
                    >
                        Xuất File Word
                    </Button>
                    <Button 
                        onClick={() => handleViewUncontributed(record)}
                    >
                        Cơ quan chưa góp ý
                    </Button>
                </Space>
            )
        }
    ];

    const uncontributedColumns = [
        { title: 'Tên Cơ quan', dataIndex: 'name', key: 'name' },
        { 
            title: 'Phân loại', 
            dataIndex: 'category', 
            key: 'category',
            render: text => {
                const map = { ministry: 'Bộ/Ngành', local: 'Địa phương', organization: 'Tổ chức', enterprise: 'Doanh nghiệp', other: 'Khác' };
                return map[text] || text;
            }
        }
    ];

    return (
        <div style={{ padding: 24, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Title level={2}>Báo cáo <BarChartOutlined /></Title>
            
            <Tabs defaultActiveKey="1" style={{ flex: 1, overflow: 'hidden' }} className="reports-tabs">
                <TabPane 
                    tab={<span><BarChartOutlined /> Thống kê Chủ thể</span>} 
                    key="1"
                    style={{ height: '100%', overflow: 'auto' }}
                >
                    <div style={{ margin: '-24px' }}>
                        <SubjectStats />
                    </div>
                </TabPane>
                <TabPane 
                    tab={<span><PrinterOutlined /> Xuất Báo cáo T.Hợp</span>} 
                    key="2"
                    style={{ height: '100%', overflow: 'auto' }}
                >
                    <p style={{ marginBottom: 24, marginTop: 16, color: 'var(--text-color-secondary)' }}>
                        Tải xuống báo cáo tiếp thu, giải trình chi tiết định dạng Word cho từng dự thảo.
                    </p>
                    <Table
                        columns={columns}
                        dataSource={stats}
                        loading={loading}
                        rowKey="id"
                        pagination={{ pageSize: 15 }}
                    />
                </TabPane>
            </Tabs>
            
            <Modal
                title={`Danh sách Cơ quan chưa góp ý - ${currentDocName}`}
                visible={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsModalVisible(false)}>
                        Đóng
                    </Button>
                ]}
                width={800}
            >
                <Table 
                    columns={uncontributedColumns} 
                    dataSource={uncontributedData} 
                    rowKey="id" 
                    loading={loadingUncontributed}
                    pagination={{ pageSize: 10 }}
                />
            </Modal>
        </div>
    );
};

export default Reports;
