import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Typography, Space, message, Spin, Divider, Badge, theme } from 'antd';
import { SaveOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { TextArea } = Input;

const SplitScreenResolution = ({ documentId, selectedNodeId }) => {
    const [nodeData, setNodeData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState({});
    const [explanations, setExplanations] = useState({});
    const [saving, setSaving] = useState({});

    const getAuthHeader = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    });

    useEffect(() => {
        if (selectedNodeId) fetchNodeDetails();
    }, [selectedNodeId]);

    const fetchNodeDetails = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/documents/${documentId}/node_details/?node_id=${selectedNodeId}`, getAuthHeader());
            const nodes = Array.isArray(res.data) ? res.data : [res.data];
            setNodeData(nodes);
            
            const initExpl = {};
            nodes.forEach(node => {
                if (node.node_explanations?.length > 0) initExpl[`node_${node.id}`] = node.node_explanations[0].content;
                else initExpl[`node_${node.id}`] = '';
                
                node.feedbacks?.forEach(fb => {
                    if (fb.explanations?.length > 0) initExpl[`fb_${fb.id}`] = fb.explanations[0].content;
                    else initExpl[`fb_${fb.id}`] = '';
                });
            });
            setExplanations(initExpl);
            
        } catch (e) {
            message.error('Lỗi khi tải chi tiết Feedbacks của Điều/Khoản này');
        }
        setLoading(false);
    };

    const handleSaveExplanation = async (targetType, objectId, contentKey) => {
        const content = explanations[contentKey];
        setSaving(prev => ({...prev, [contentKey]: true}));
        try {
            await axios.post('/api/feedbacks/save_explanation/', {
                document_id: documentId,
                target_type: targetType,
                object_id: objectId,
                content: content
            }, getAuthHeader());
            message.success('Đã lưu giải trình!');
        } catch (e) {
            message.error('Lỗi khi lưu.');
        }
        setSaving(prev => ({...prev, [contentKey]: false}));
    };

    const handleAiSuggest = async (nodeContent, feedbackContent, contentKey) => {
        setAiLoading(prev => ({ ...prev, [contentKey]: true }));
        try {
            const res = await axios.post('/api/feedbacks/ai_suggest/', {
                document_id: documentId,
                node_content: nodeContent,
                feedback_content: feedbackContent
            }, getAuthHeader());
            
            setExplanations(prev => ({
                ...prev,
                [contentKey]: res.data.suggestion
            }));
            message.success('AI Chuyên gia đã biên soạn xong!');
        } catch (e) {
            message.error('Lỗi gọi AI Copilot!');
        }
        setAiLoading(prev => ({ ...prev, [contentKey]: false }));
    };

    if (loading || !nodeData) return <div style={{textAlign: 'center', padding: 48}}><Spin size="large" /></div>;

    return (
        <div>
            {nodeData.map((node, index) => (
                <div key={node.id} id={`node-section-${node.id}`} style={{ marginBottom: 48 }}>
                    <Title level={4} style={{ marginTop: 0, marginBottom: '24px', color: index === 0 ? 'var(--success-color)' : 'var(--primary-color)', fontWeight: 600 }}>
                        {index === 0 ? 'PHÂN TÍCH VÀ GIẢI TRÌNH: ' : ''}{node.node_label.toUpperCase()}
                    </Title>
                    
                    <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-layout)', borderRadius: 8, borderLeft: `4px solid ${index === 0 ? 'var(--success-color)' : 'var(--primary-color)'}` }}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: '8px', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.1em' }}>Nội dung dự thảo</Text>
                        <Typography.Paragraph style={{ fontSize: '16px', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-color)' }}>
                            {node.content}
                        </Typography.Paragraph>
                    </div>

                    <Title level={5} style={{color: 'var(--text-secondary)'}}>1. GIẢI TRÌNH TỔNG THỂ CHO {node.node_label.toUpperCase()}</Title>
                    <TextArea 
                        rows={3} 
                        value={explanations[`node_${node.id}`]} 
                        onChange={e => setExplanations({...explanations, [`node_${node.id}`]: e.target.value})} 
                        placeholder="Nhập nội dung giải trình tổng quát và quyết định cuối cùng..."
                        style={{ marginBottom: 12, padding: 12, borderRadius: 8 }}
                    />
                    <div style={{ textAlign: 'right', marginBottom: 32 }}>
                        <Space>
                            <Button icon={<RobotOutlined />} onClick={() => handleAiSuggest(node.content, 'Tổng hợp đánh giá khách quan toàn bộ Góp ý', `node_${node.id}`)} loading={aiLoading[`node_${node.id}`]} style={{color: '#8b5cf6', borderColor: '#c4b5fd'}}>✨ Gợi ý bằng AI Copilot</Button>
                            <Button type="primary" style={{background: 'var(--primary-color)'}} icon={<SaveOutlined />} onClick={() => handleSaveExplanation('Node', node.id, `node_${node.id}`)} loading={saving[`node_${node.id}`]}>Lưu Giải Trình Tổng</Button>
                        </Space>
                    </div>

                    {node.feedbacks && node.feedbacks.length > 0 && (
                        <>
                            <Badge count={node.feedbacks.length} style={{ backgroundColor: 'var(--warning-color)' }}>
                                <Title level={5} style={{color: 'var(--text-secondary)', marginBottom: 16}}>2. CÁC Ý KIẾN GÓP Ý CHO {node.node_label.toUpperCase()}</Title>
                            </Badge>
                            
                            {node.feedbacks.map(fb => (
                                <Card 
                                    key={fb.id} 
                                    id={`feedback-card-${fb.id}`}
                                    size="small" 
                                    title={
                                        <Space>
                                            <UserOutlined style={{color: 'var(--warning-color)'}} />
                                            <span style={{color: 'var(--warning-color)', fontWeight: 600}}>{fb.contributing_agency || 'Cơ quan Ẩn danh'}</span>
                                        </Space>
                                    } 
                                    style={{ marginBottom: 16, background: 'var(--bg-container)', borderRadius: 8, border: '1px solid var(--border-color)' }}
                                >
                                    <Typography.Paragraph style={{ fontSize: '15px', padding: 12, background: 'var(--bg-layout)', borderRadius: 4 }}>{fb.content}</Typography.Paragraph>
                                    
                                    <div style={{ marginTop: 16 }}>
                                        <Text strong style={{ fontSize: 13, color: 'var(--success-color)', display: 'block', marginBottom: 8 }}>Giải trình phản hồi:</Text>
                                        <TextArea 
                                            rows={2} 
                                            value={explanations[`fb_${fb.id}`]}
                                            onChange={e => setExplanations({...explanations, [`fb_${fb.id}`]: e.target.value})}
                                            placeholder="Nhập ý kiến phản hồi cho cơ quan này..."
                                            style={{ marginBottom: 12 }}
                                        />
                                        <div style={{ textAlign: 'right' }}>
                                            <Space>
                                                <Button 
                                                    icon={<RobotOutlined />} 
                                                    onClick={() => handleAiSuggest(node.content, fb.content, `fb_${fb.id}`)}
                                                    loading={aiLoading[`fb_${fb.id}`]}
                                                    size="small"
                                                    style={{ border: 'none', background: 'var(--bg-layout)' }}
                                                >
                                                    ✨ AI Gợi ý
                                                </Button>
                                                <Button type="primary" size="small" onClick={() => handleSaveExplanation('Feedback', fb.id, `fb_${fb.id}`)} style={{background: 'var(--success-color)'}} loading={saving[`fb_${fb.id}`]}>Lưu phản hồi</Button>
                                            </Space>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </>
                    )}
                    <Divider />
                </div>
            ))}
        </div>
    );

};
export default SplitScreenResolution;
