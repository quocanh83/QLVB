import React, { useState } from 'react';
import { Form, Input, Button, Typography, Space, Select, message, Divider } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import axios from 'axios';
import FeedbackBulkUpload from './FeedbackBulkUpload';

const { Title, Text } = Typography;
const { TextArea } = Input;

const FeedbackIntakePanel = ({ documentId, selectedNode, isGeneralFeedback }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
  });

  const handleSubmitFeedback = async (values) => {
      if (isGeneralFeedback || !selectedNode) {
          message.error("Vui lòng chọn một Điều/Khoản cụ thể ở Cây văn bản bên trái để gán góp ý.");
          return;
      }
      setLoading(true);
      try {
          const payload = {
              node: selectedNode.id,
              content: values.content,
              contributing_agency: values.contributing_agency[0] || 'Cá nhân/Đơn vị ẩn'
          };
          await axios.post('http://localhost:8000/api/feedbacks/', payload, getAuthHeader());
          message.success('Đã nạp góp ý thành công!');
          form.resetFields();
      } catch (err) {
          message.error('Lỗi khi nạp góp ý.');
      }
      setLoading(false);
  };

  return (
    <div style={{ background: 'var(--bg-container)', borderRadius: 12, padding: '40px', minHeight: '100%', boxShadow: 'var(--shadow)' }}>
        
        <Title level={4} style={{ marginTop: 0, marginBottom: '24px', color: 'var(--success-color)', fontWeight: 700 }}>
          I. KHU VỰC IMPORT GÓP Ý HÀNG LOẠT (EXCEL/WORD)
        </Title>
        <FeedbackBulkUpload documentId={documentId} />

        <Divider style={{ margin: '48px 0' }} />
        
        <Title level={4} style={{ marginTop: 0, marginBottom: '24px', color: 'var(--primary-color)', fontWeight: 700 }}>
          II. TRẠM NHẬP GÓP Ý ĐƠN LẺ THỦ CÔNG
        </Title>

        <Title level={5} style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-color)', fontWeight: 700 }}>
          {isGeneralFeedback ? "⚠️ GÓP Ý CHUNG (ĐANG MỞ - VUI LÒNG CHỌN ĐIỀU KHOẢN ĐỂ GÁN)" : `ĐANG CHỌN GÓP Ý CHO: ${selectedNode?.node_label?.toUpperCase() || 'CHƯA CHỌN ĐIỀU KHOẢN'}`}
        </Title>

        {!isGeneralFeedback && selectedNode && (
            <div style={{ marginBottom: '24px', padding: '24px', background: 'var(--bg-layout)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: '12px', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.1em', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Nội dung gốc của Điều/Khoản
              </Text>
              <Typography.Paragraph style={{ fontSize: '16px', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-color)' }}>
                {selectedNode.content}
              </Typography.Paragraph>
            </div>
        )}

        <div style={{marginTop: 32, background: 'var(--bg-container)', border: '1px solid var(--border-color)', padding: 32, borderRadius: 16, opacity: (!selectedNode || isGeneralFeedback) ? 0.5 : 1, pointerEvents: (!selectedNode || isGeneralFeedback) ? 'none' : 'auto'}}>
          <Title level={5} style={{ fontWeight: 600, marginBottom: '24px', color: 'var(--text-color)' }}>Mở Tờ Trình Lập luận (Web Form)</Title>
          <Form form={form} layout="vertical" size="large" onFinish={handleSubmitFeedback}>
            <Form.Item name="contributing_agency" label="Chủ thể đóng góp (Tổ chức/Cá nhân)" initialValue={['Cơ quan của tôi']}>
              <Select mode="tags" placeholder="Nhập tên tổ chức..." />
            </Form.Item>
            <Form.Item name="content" label="Nội dung ý kiến đề xuất" rules={[{ required: true }]}>
              <Input.TextArea rows={4} placeholder="Nhập chi tiết lập luận đóng góp tại đây..." />
            </Form.Item>
            <Form.Item style={{ marginTop: '32px', textAlign: 'right', marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SendOutlined />} style={{ textTransform: 'uppercase', letterSpacing: '0.02em', fontWeight: 600, background: 'var(--primary-color)' }}>
                Phát Hành Góp Ý
              </Button>
            </Form.Item>
          </Form>
        </div>
    </div>
  );
};

export default FeedbackIntakePanel;
