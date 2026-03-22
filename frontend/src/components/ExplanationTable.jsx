import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Space, Typography, Tooltip, message, Popconfirm } from 'antd';
import { 
    RobotOutlined, 
    SaveOutlined, 
    CheckCircleOutlined,
    LoadingOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getAuthHeader } from '../utils/authHelpers';

const { TextArea } = Input;
const { Text } = Typography;

const ExplanationTable = ({ documentId, nodeId }) => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [savingRow, setSavingRow] = useState(null);
    const [aiLoading, setAiLoading] = useState(null);

    useEffect(() => {
        if (nodeId) {
            fetchFeedbacks();
        }
    }, [nodeId]);

    const fetchFeedbacks = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:8000/api/feedbacks/by_node/?node_id=${nodeId}`, getAuthHeader());
            setFeedbacks(res.data);
        } catch (e) {
            message.error("Lỗi khi tải danh sách góp ý.");
        }
        setLoading(false);
    };

    const handleUpdateContent = (id, value) => {
        setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, explanation: value } : f));
    };

    const handleAiSuggest = async (record) => {
        setAiLoading(record.id);
        try {
            const res = await axios.post('http://localhost:8000/api/feedbacks/ai_suggest/', {
                document_id: documentId,
                node_content: record.node_content,
                feedback_content: record.content
            }, getAuthHeader());
            
            handleUpdateContent(record.id, res.data.suggestion);
            message.success("AI đã đưa ra gợi ý giải trình!");
        } catch (e) {
            message.error("Lỗi khi gọi AI gợi ý.");
        }
        setAiLoading(null);
    };

    const handleSaveRow = async (record) => {
        setSavingRow(record.id);
        try {
            await axios.post('http://localhost:8000/api/feedbacks/save_explanation/', {
                document_id: documentId,
                target_type: 'Feedback',
                object_id: record.id,
                content: record.explanation
            }, getAuthHeader());
            message.success("Đã lưu giải trình dòng này.");
        } catch (e) {
            message.error("Lỗi khi lưu giải trình.");
        }
        setSavingRow(null);
    };

    const handleSaveAll = async () => {
        setLoading(true);
        try {
            // Bulk save logic (looping for now as backend doesn't have bulk_save_explanation yet)
            const promises = feedbacks.map(f => 
                axios.post('http://localhost:8000/api/feedbacks/save_explanation/', {
                    document_id: documentId,
                    target_type: 'Feedback',
                    object_id: f.id,
                    content: f.explanation
                }, getAuthHeader())
            );
            await Promise.all(promises);
            message.success(`Đã lưu tất cả ${feedbacks.length} dòng giải trình thành công!`);
        } catch (e) {
            message.error("Có lỗi xảy ra khi lưu tất cả.");
        }
        setLoading(false);
    };

    const columns = [
        {
            title: 'STT',
            key: 'stt',
            width: 60,
            align: 'center',
            render: (_, __, index) => index + 1
        },
        {
            title: 'Điều khoản điểm',
            dataIndex: 'node_path',
            key: 'node_path',
            width: 150,
            render: (text) => <Text type="secondary" style={{ fontSize: '12px' }}>{text}</Text>
        },
        {
            title: 'Cơ quan góp ý',
            dataIndex: 'contributing_agency',
            key: 'contributing_agency',
            width: 150,
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Nội dung góp ý',
            dataIndex: 'content',
            key: 'content',
            width: 400,
            ellipsis: true,
            render: (text) => (
                <Tooltip title={text}>
                    <div style={{ maxHeight: '100px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                        {text}
                    </div>
                </Tooltip>
            )
        },
        {
            title: 'Giải trình',
            key: 'explanation',
            width: 400,
            render: (_, record) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <TextArea 
                        rows={3} 
                        value={record.explanation} 
                        onChange={(e) => handleUpdateContent(record.id, e.target.value)}
                        placeholder="Nhập nội dung tiếp thu, giải trình..."
                    />
                    <Space style={{ justifyContent: 'flex-end' }}>
                        <Button 
                            size="small"
                            icon={aiLoading === record.id ? <LoadingOutlined /> : <RobotOutlined />} 
                            onClick={() => handleAiSuggest(record)}
                            disabled={aiLoading !== null}
                        >
                            Gợi ý AI
                        </Button>
                        <Button 
                            size="small"
                            type="primary"
                            icon={savingRow === record.id ? <LoadingOutlined /> : <SaveOutlined />} 
                            onClick={() => handleSaveRow(record)}
                            disabled={savingRow !== null}
                        >
                            Lưu
                        </Button>
                    </Space>
                </div>
            )
        }
    ];

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                    type="primary" 
                    icon={<CheckCircleOutlined />} 
                    size="large"
                    onClick={handleSaveAll}
                    loading={loading}
                >
                    Lưu tất cả thay đổi
                </Button>
            </div>
            <Table 
                columns={columns} 
                dataSource={feedbacks} 
                loading={loading}
                rowKey="id"
                pagination={false}
                bordered
            />
        </div>
    );
};

export default ExplanationTable;
