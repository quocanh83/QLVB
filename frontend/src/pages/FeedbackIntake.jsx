import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Input, Upload, message, Typography, Space, Select, Card, Divider, Row, Col, Alert, Tag } from 'antd';
import { UploadOutlined, SaveOutlined, FileSearchOutlined, PlusOutlined, DeleteOutlined, LeftOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import PageHeaderWrapper from '../components/PageHeaderWrapper';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const FeedbackIntake = () => {
    const [documents, setDocuments] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState(null);
    const [nodes, setNodes] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [metadata, setMetadata] = useState({});
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    
    // Check if docId was passed via query params
    useEffect(() => {
        const queryDocId = new URLSearchParams(location.search).get('docId');
        if (queryDocId) setSelectedDocId(parseInt(queryDocId));
        fetchDocuments();
    }, [location]);

    useEffect(() => {
        if (selectedDocId) fetchNodes(selectedDocId);
    }, [selectedDocId]);

    const getAuthHeader = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    });

    const fetchDocuments = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/documents/', getAuthHeader());
            setDocuments(res.data);
        } catch (e) { message.error("Lấy danh sách dự thảo thất bại"); }
    };

    const fetchNodes = async (docId) => {
        try {
            const res = await axios.get(`http://localhost:8000/api/feedbacks/get_document_nodes/?document_id=${docId}`, getAuthHeader());
            setNodes(res.data);
        } catch (e) { }
    };

    const handleFileUpload = async (file, agency) => {
        if (!selectedDocId) {
            message.warning("Vui lòng chọn Dự thảo văn bản trước!");
            return false;
        }
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_id', selectedDocId);
        if (agency) formData.append('contributing_agency', agency);

        try {
            const res = await axios.post('http://localhost:8000/api/feedbacks/parse_file/', formData, {
                headers: { ...getAuthHeader().headers, 'Content-Type': 'multipart/form-data' }
            });
            
            // Use suggested node_id from backend if available
            const enriched = res.data.feedbacks.map(f => ({
                ...f,
                node_id: f.node_id || null
            }));
            
            setFeedbacks(enriched);
            setMetadata(res.data.metadata);
            message.success(`Đã phân rã được ${enriched.length} đoạn góp ý từ file.`);
        } catch (e) {
            message.error("Lỗi khi phân rã file góp ý.");
        }
        setUploading(false);
        return false; // Prevent default upload
    };

    const addManualFeedback = () => {
        const newFb = {
            key: `manual-${Date.now()}`,
            node_label: '',
            node_id: null,
            contributing_agency: '',
            content: ''
        };
        setFeedbacks([...feedbacks, newFb]);
    };

    const removeFeedback = (key) => {
        setFeedbacks(feedbacks.filter(f => f.key !== key));
    };

    const updateFeedbackField = (key, field, value) => {
        setFeedbacks(feedbacks.map(f => f.key === key ? { ...f, [field]: value } : f));
    };

    const handleSave = async () => {
        if (!selectedDocId) return message.warning("Chưa chọn dự thảo!");
        if (feedbacks.length === 0) return message.warning("Danh sách góp ý trống!");

        setSaving(true);
        try {
            await axios.post('http://localhost:8000/api/feedbacks/bulk_create/', {
                document_id: selectedDocId,
                feedbacks: feedbacks,
                metadata: metadata
            }, getAuthHeader());
            message.success("Đã nạp toàn bộ góp ý vào hệ thống!");
            navigate(`/?docId=${selectedDocId}`);
        } catch (e) {
            message.error("Lỗi khi lưu góp ý.");
        }
        setSaving(false);
    };

    const columns = [
        {
            title: 'Nội dung góp ý',
            dataIndex: 'content',
            key: 'content',
            width: '50%',
            render: (text, record) => (
                <TextArea 
                    autoSize={{ minRows: 2, maxRows: 6 }} 
                    value={text} 
                    onChange={e => updateFeedbackField(record.key, 'content', e.target.value)} 
                />
            )
        },
        {
            title: 'Cơ quan',
            dataIndex: 'contributing_agency',
            key: 'contributing_agency',
            render: (text, record) => (
                <Input value={text} onChange={e => updateFeedbackField(record.key, 'contributing_agency', e.target.value)} />
            )
        },
        {
            title: 'Mục tiêu (Điều/Khoản/Khác)',
            key: 'node_mapping',
            render: (_, record) => (
                <Select
                    showSearch
                    style={{ width: '100%' }}
                    placeholder="Chọn mục tiêu..."
                    value={record.node_id}
                    onChange={val => updateFeedbackField(record.key, 'node_id', val)}
                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    options={nodes.map(n => ({ value: n.id, label: n.label }))}
                />
            )
        },
        {
            title: '',
            key: 'action',
            render: (_, record) => (
                <Button danger icon={<DeleteOutlined />} onClick={() => removeFeedback(record.key)} />
            )
        }
    ];

    return (
        <PageHeaderWrapper 
            title="Tiếp nhận và Phân loại Góp ý" 
            breadcrumbs={[{title: 'Quản lý'}, {title: 'Tiếp nhận Góp ý'}]}
            actionNode={<Button icon={<LeftOutlined />} onClick={() => navigate(-1)}>Quay lại</Button>}
        >
            <Row gutter={24}>
                <Col span={8}>
                    <Card title="1. Thông tin nguồn" size="small" style={{ marginBottom: 24, borderRadius: 12 }}>
                        <Form layout="vertical">
                            <Form.Item label="Dự thảo cần góp ý" required>
                                <Select 
                                    placeholder="Chọn dự thảo văn bản..." 
                                    value={selectedDocId} 
                                    onChange={setSelectedDocId}
                                    style={{ width: '100%' }}
                                >
                                    {documents.map(d => <Option key={d.id} value={d.id}>{d.project_name}</Option>)}
                                </Select>
                            </Form.Item>
                            
                            <Divider>Hoặc tải File Góp ý</Divider>
                            
                            <Form.Item label="Tên cơ quan góp ý (nếu file chỉ của 1 CQ)">
                                <Input id="agency_name" placeholder="VD: Bộ Tài chính" />
                            </Form.Item>
                            
                            <Upload.Dragger
                                disabled={!selectedDocId || uploading}
                                beforeUpload={(file) => handleFileUpload(file, document.getElementById('agency_name')?.value)}
                                showUploadList={false}
                                accept=".docx"
                            >
                                <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                                <p className="ant-upload-text">Bấm hoặc kéo thả file .docx vào đây</p>
                                <p className="ant-upload-hint">Hệ thống sẽ tự động bóc tách và phân loại Điều/Khoản.</p>
                            </Upload.Dragger>
                        </Form>
                    </Card>

                    {metadata && metadata.drafting_agency && (
                        <Card title="Siêu dữ liệu từ File" size="small" style={{ borderRadius: 12 }}>
                            <Paragraph><Text strong>Cơ quan chủ trì:</Text> {metadata.drafting_agency}</Paragraph>
                            <Paragraph><Text strong>Địa danh:</Text> {metadata.agency_location}</Paragraph>
                            <Paragraph><Text strong>Số CQ tham vấn:</Text> {metadata.total_consulted_doc}</Paragraph>
                            <Paragraph><Text strong>Số góp ý nhận được:</Text> {metadata.total_feedbacks_doc}</Paragraph>
                            <Alert message="Dữ liệu này sẽ được cập nhật vào Thông tin Dự thảo khi bạn Lưu." type="info" showIcon />
                        </Card>
                    )}
                </Col>

                <Col span={16}>
                    <Card 
                        title={
                            <Space>
                                <FileSearchOutlined />
                                <span>2. Xem trước và Chỉnh sửa Phân loại ({feedbacks.length})</span>
                            </Space>
                        } 
                        size="small"
                        extra={
                            <Space>
                                <Button icon={<PlusOutlined />} onClick={addManualFeedback}>Thêm dòng thủ công</Button>
                                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} disabled={feedbacks.length === 0}>Lưu vào Hệ thống</Button>
                            </Space>
                        }
                        style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    >
                        {feedbacks.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '100px 0', color: '#bfbfbf' }}>
                                <UploadOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
                                <Title level={5}>Chưa có dữ liệu góp ý</Title>
                                <Paragraph>Hãy tải file hoặc thêm dòng thủ công để bắt đầu.</Paragraph>
                            </div>
                        ) : (
                            <Table 
                                columns={columns} 
                                dataSource={feedbacks} 
                                pagination={false} 
                                rowKey="key"
                                scroll={{ y: 600 }}
                            />
                        )}
                    </Card>
                </Col>
            </Row>
        </PageHeaderWrapper>
    );
};

export default FeedbackIntake;
