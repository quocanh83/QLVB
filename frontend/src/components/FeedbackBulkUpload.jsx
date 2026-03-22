import React, { useState } from 'react';
import { Table, Input, Button, Popconfirm, Form, Typography, Upload, message, Space } from 'antd';
import { UploadOutlined, SaveOutlined } from '@ant-design/icons';
import axios from 'axios';

const EditableCell = ({ editing, dataIndex, title, inputType, record, index, children, ...restProps }) => {
    return (
        <td {...restProps}>
            {editing ? (
                <Form.Item name={dataIndex} style={{ margin: 0 }} rules={[{ required: true, message: `Vui lòng nhập ${title}!` }]}>
                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
                </Form.Item>
            ) : (
                children
            )}
        </td>
    );
};

const FeedbackBulkUpload = ({ documentId }) => {
    const [form] = Form.useForm();
    const [data, setData] = useState([]);
    const [metadata, setMetadata] = useState({
        drafting_agency: '',
        agency_location: '',
        total_consulted_doc: 0,
        total_feedbacks_doc: 0
    });
    const [editingKey, setEditingKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [agencyName, setAgencyName] = useState('');

    const isEditing = (record) => record.key === editingKey;

    const edit = (record) => {
        form.setFieldsValue({ node_label: '', contributing_agency: '', content: '', ...record });
        setEditingKey(record.key);
    };

    const cancel = () => {
        setEditingKey('');
    };

    const save = async (key) => {
        try {
            const row = await form.validateFields();
            const newData = [...data];
            const index = newData.findIndex((item) => key === item.key);
            if (index > -1) {
                const item = newData[index];
                newData.splice(index, 1, { ...item, ...row });
                setData(newData);
                setEditingKey('');
            }
        } catch (errInfo) {
            console.log('Validate Failed:', errInfo);
        }
    };

    const handleUpload = async (options) => {
        const { file, onSuccess, onError } = options;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_id', documentId);
        formData.append('contributing_agency', agencyName);

        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await axios.post('http://localhost:8000/api/feedbacks/parse_file/', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data.feedbacks);
            setMetadata(res.data.metadata);
            message.success('Bóc tách thành công. Vui lòng rà soát!');
            onSuccess("Ok");
        } catch (e) {
            message.error('Lỗi khi bóc tách file');
            onError(e);
        }
        setLoading(false);
    };

    const handleBulkSave = async () => {
        setSubmitting(true);
        try {
            const token = localStorage.getItem('access_token');
            await axios.post('http://localhost:8000/api/feedbacks/bulk_create/', {
                document_id: documentId,
                feedbacks: data,
                metadata: metadata
            }, { headers: { Authorization: `Bearer ${token}` }});
            message.success('Đã lưu dữ liệu góp ý và cập nhật Metadata thành công!');
            setData([]);
        } catch (error) {
            message.error('Lỗi khi bulk lưu.');
        }
        setSubmitting(false);
    };

    const columns = [
        { title: 'Điều/Khoản', dataIndex: 'node_label', width: '20%', editable: true },
        { title: 'Cơ quan', dataIndex: 'contributing_agency', width: '20%', editable: true },
        { title: 'Nội dung', dataIndex: 'content', width: '45%', editable: true },
        {
            title: 'Thao tác', dataIndex: 'operation', width: '15%',
            render: (_, record) => {
                const editable = isEditing(record);
                return editable ? (
                    <span>
                        <Typography.Link onClick={() => save(record.key)} style={{ marginRight: 8 }}>Lưu</Typography.Link>
                        <Popconfirm title="Chắc chắn hủy?" onConfirm={cancel}><a>Hủy</a></Popconfirm>
                    </span>
                ) : (
                    <Typography.Link disabled={editingKey !== ''} onClick={() => edit(record)}>Sửa</Typography.Link>
                );
            },
        },
    ];

    const mergedColumns = columns.map((col) => {
        if (!col.editable) return col;
        return {
            ...col,
            onCell: (record) => ({
                record,
                inputType: 'text',
                dataIndex: col.dataIndex,
                title: col.title,
                editing: isEditing(record),
            }),
        };
    });

    return (
        <div style={{ padding: 16, background: 'var(--bg-layout)', borderRadius: 8, marginTop: 16, border: '1px solid var(--border-color)' }}>
            <Typography.Title level={5}>Tải File Góp ý & Báo cáo (Bóc tách Hàng Loạt)</Typography.Title>
            <Space style={{ marginBottom: 16 }}>
                <Input placeholder="Nhập Cơ quan (Mặc định)..." value={agencyName} onChange={e => setAgencyName(e.target.value)} />
                <Upload customRequest={handleUpload} showUploadList={false} accept=".docx">
                    <Button icon={<UploadOutlined />} loading={loading} type="primary">Tải lên file Word (.docx)</Button>
                </Upload>
            </Space>

            {data.length > 0 && (
                <>
                    <div style={{ background: 'var(--bg-container)', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid var(--border-color)' }}>
                        <Typography.Text strong>Thông tin chung từ tệp:</Typography.Text>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
                            <Input addonBefore="Cơ quan chủ trì" value={metadata.drafting_agency} onChange={e => setMetadata({...metadata, drafting_agency: e.target.value})} />
                            <Input addonBefore="Địa danh" value={metadata.agency_location} onChange={e => setMetadata({...metadata, agency_location: e.target.value})} />
                            <Input addonBefore="Số CQ tham vấn" type="number" value={metadata.total_consulted_doc} onChange={e => setMetadata({...metadata, total_consulted_doc: parseInt(e.target.value)})} />
                            <Input addonBefore="Tổng số ý kiến" type="number" value={metadata.total_feedbacks_doc} onChange={e => setMetadata({...metadata, total_feedbacks_doc: parseInt(e.target.value)})} />
                        </div>
                    </div>

                    <Form form={form} component={false}>
                        <Table
                            components={{ body: { cell: EditableCell } }}
                            bordered
                            dataSource={data}
                            columns={mergedColumns}
                            rowClassName="editable-row"
                            pagination={false}
                        />
                    </Form>
                    <div style={{ marginTop: 16, textAlign: 'right' }}>
                        <Button type="primary" icon={<SaveOutlined />} onClick={handleBulkSave} loading={submitting} style={{background: 'var(--success-color)'}}>
                            Xác nhận & Lưu toàn bộ
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
};

export default FeedbackBulkUpload;
