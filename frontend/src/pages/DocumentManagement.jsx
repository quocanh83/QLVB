import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Upload, message, Typography, Tag, Space, Tooltip, Select, Popconfirm } from 'antd';
import { UploadOutlined, PlusOutlined, ReadOutlined, TeamOutlined, SyncOutlined, EditOutlined, DeleteOutlined, CrownOutlined, FileWordOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { checkUserHasRole } from '../utils/authHelpers';
import PageHeaderWrapper from '../components/PageHeaderWrapper';

const { Text } = Typography;
const { Option } = Select;

const DocumentManagement = () => {
  const [data, setData] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isLeadModalVisible, setIsLeadModalVisible] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [leadForm] = Form.useForm();

  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
    fetchUsers();
  }, []);

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
  });

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/documents/', getAuthHeader());
      setData(response.data);
    } catch (error) {
      message.error("Lấy danh sách thất bại!");
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/accounts/users/', getAuthHeader());
      const ud = res.data.results || res.data;
      setUsers(Array.isArray(ud) ? ud : []);
    } catch (e) { }
  };

  const handleUpload = async (values) => {
    setUploadLoading(true);
    const formData = new FormData();
    formData.append('project_name', values.project_name);
    if (values.drafting_agency) formData.append('drafting_agency', values.drafting_agency);
    if (values.agency_location) formData.append('agency_location', values.agency_location);
    if (values.attached_file && values.attached_file.fileList.length > 0) {
      formData.append('attached_file_path', values.attached_file.fileList[0].originFileObj);
    }
    try {
      await axios.post('http://localhost:8000/api/documents/', formData, {
        headers: { ...getAuthHeader().headers, 'Content-Type': 'multipart/form-data' }
      });
      message.success("Tải lên và bóc tách dự thảo thành công!");
      setIsModalVisible(false);
      form.resetFields();
      fetchDocuments();
    } catch (error) {
      message.error("Có lỗi xảy ra khi tải lên.");
    }
    setUploadLoading(false);
  };

  const openEditModal = (record) => {
    setEditingDoc(record);
    editForm.setFieldsValue({
      project_name: record.project_name,
      drafting_agency: record.drafting_agency,
      agency_location: record.agency_location,
      status: record.status
    });
    setIsEditModalVisible(true);
  };

  const openLeadModal = (record) => {
    setEditingDoc(record);
    leadForm.setFieldsValue({ lead_id: record.lead || null });
    setIsLeadModalVisible(true);
  };

  const handleUpdate = async (values) => {
    setUpdateLoading(true);
    try {
      await axios.patch(`http://localhost:8000/api/documents/${editingDoc.id}/`, values, getAuthHeader());
      message.success('Cập nhật thông tin dự thảo thành công!');
      setIsEditModalVisible(false);
      fetchDocuments();
    } catch (error) {
      message.error('Có lỗi khi cập nhật thông tin.');
    }
    setUpdateLoading(false);
  };

  const handleSetLead = async (values) => {
    try {
      await axios.post(`http://localhost:8000/api/documents/${editingDoc.id}/set_lead/`, values, getAuthHeader());
      message.success('Đã cập nhật Chủ trì (Lead) thành công!');
      setIsLeadModalVisible(false);
      fetchDocuments();
    } catch (error) {
      message.error('Lỗi khi phân công Chủ trì: ' + (error.response?.data?.error || ''));
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:8000/api/documents/${id}/`, getAuthHeader());
      message.success('Đã huỷ dự thảo!');
      fetchDocuments();
    } catch (error) {
      message.error('Lỗi khi xoá dự thảo.');
    }
  };

  const handleExport = (id, name) => {
    try {
      // Sử dụng Native Browser Download để trình duyệt nhận diện file Word chuẩn mực
      // Tránh lỗi bảo mật MOTW của Windows khi tải qua JS Blob
      const token = localStorage.getItem('access_token');
      const url = `http://localhost:8000/api/documents/${id}/export_report/?token=${token}`;
      
      const link = document.createElement('a');
      link.href = url;
      // Trình duyệt sẽ dùng tên file từ Backend (Bao_cao_tong_hop_X.docx) 
      // Nhưng để chắc chắn fallback thì khai báo ở đây
      link.setAttribute('download', `Bao_cao_tong_hop_${id}.docx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success('Đang tải báo cáo...');
    } catch (e) {
      message.error('Lỗi khởi tạo tải xuống!');
    }
  };

  const columns = [
    {
      title: 'Dự án / Tên văn bản',
      dataIndex: 'project_name',
      key: 'project_name',
      render: (text, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: '#1677ff', cursor: 'pointer', fontSize: 15 }} onClick={() => navigate(`/?docId=${record.id}`)}>
            {text}
          </Text>
          <Text type="secondary" style={{ fontSize: '13px' }}>
            CQCT: {record.drafting_agency || '—'} | Địa danh: {record.agency_location || '—'}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px', color: 'var(--success-color)' }}>
            Dự kiến: {record.total_consulted_doc || 0} CQ tham vấn | {record.total_feedbacks_doc || 0} Góp ý (theo VB)
          </Text>
          {record.lead_name && (
            <Tag color="gold" icon={<CrownOutlined />}>Chủ trì: {record.lead_name}</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Cấu trúc Văn bản',
      key: 'stats_nodes',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color="cyan">Điều: {record.total_dieu || 0}</Tag>
          <Tag color="geekblue">Khoản: {record.total_khoan || 0}</Tag>
          <Tag color="default">Điểm/Khác: {(record.total_diem || 0) + (record.total_phu_luc || 0)}</Tag>
        </Space>
      )
    },
    {
      title: 'Tiến độ Giải trình',
      key: 'stats_feedback',
      render: (_, record) => {
        const total = record.total_feedbacks || 0;
        const resolved = record.resolved_feedbacks || 0;
        let color = 'default';
        if (total > 0 && resolved === total) color = 'success';
        else if (resolved > 0) color = 'processing';
        else if (total > 0) color = 'warning';
        return (
          <Tooltip title={`${resolved} đã giải trình / ${total} tổng góp ý`}>
            <Tag color={color}>Giải trình: {resolved}/{total}</Tag>
          </Tooltip>
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: status => {
        const s = status || 'Draft';
        const color = s === 'Draft' ? 'orange' : s === 'Completed' ? 'green' : 'blue';
        return <Tag color={color}>{s}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Button type="primary" size="small" icon={<ReadOutlined />} onClick={() => navigate(`/?docId=${record.id}`)}>
            Xử lý
          </Button>
          <Button size="small" icon={<FileWordOutlined />} style={{ color: '#059669', borderColor: '#059669' }} onClick={() => handleExport(record.id, record.project_name)}>
            Xuất BC
          </Button>
          {checkUserHasRole('Admin') && (
            <>
              <Button size="small" icon={<CrownOutlined />} style={{ color: '#d97706', borderColor: '#d97706' }} onClick={() => openLeadModal(record)}>Chủ trì</Button>
              <Space size={4}>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>Sửa</Button>
                <Popconfirm title="Xoá vĩnh viễn hệ thống toàn bộ dữ liệu Dự thảo?" onConfirm={() => handleDelete(record.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            </>
          )}
        </Space>
      )
    }
  ];

  const actionNode = (
    <>
      <Button icon={<SyncOutlined />} onClick={fetchDocuments}>Làm mới</Button>
      {checkUserHasRole('Admin') && (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>Tải lên Văn bản mới</Button>
      )}
    </>
  );

  return (
    <PageHeaderWrapper
      title="Trình Quản lý Dự thảo Pháp quy"
      breadcrumbs={[{ title: 'Quản lý Nghiệp vụ' }, { title: 'Dự thảo Pháp quy' }]}
      actionNode={actionNode}
    >
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
        pagination={{ position: ['bottomRight'], pageSize: 10, showSizeChanger: true }} bordered />

      {/* MODAL TẢI LÊN */}
      <Modal title="Tải lên Dự thảo văn bản mới" open={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleUpload}>
          <Form.Item name="project_name" label="Tên Dự án / Văn bản" rules={[{ required: true }]}><Input placeholder="VD: Luật Đất đai (sửa đổi)" /></Form.Item>
          <Form.Item name="drafting_agency" label="Cơ quan chủ trì"><Input placeholder="VD: Bộ Tài nguyên và Môi trường" /></Form.Item>
          <Form.Item name="agency_location" label="Địa danh"><Input placeholder="VD: Hà Nội" /></Form.Item>
          <Form.Item name="attached_file" label="File Word (Docx) đính kèm">
            <Upload beforeUpload={() => false} maxCount={1} accept=".docx"><Button icon={<UploadOutlined />}>Chọn File Word</Button></Upload>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={uploadLoading} block>Bắt đầu Bóc tách (AI) & Lưu Trữ</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL SỬA THÔNG TIN */}
      <Modal title="Hiệu chỉnh Siêu dữ liệu Dự thảo" open={isEditModalVisible} onCancel={() => setIsEditModalVisible(false)} footer={null} destroyOnClose>
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="project_name" label="Tên Dự án / Văn bản" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="drafting_agency" label="Cơ quan chủ trì"><Input /></Form.Item>
          <Form.Item name="agency_location" label="Địa danh"><Input /></Form.Item>
          <Form.Item name="status" label="Trạng thái Tiến độ">
            <Select>
              <Option value="Draft">Draft (Bản nháp)</Option>
              <Option value="Reviewing">Reviewing (Đang lấy ý kiến)</Option>
              <Option value="Completed">Completed (Đã chốt sổ)</Option>
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={updateLoading} block>Cập nhật Thông tin</Button>
        </Form>
      </Modal>

      {/* MODAL PHÂN CÔNG CHỦ TRÌ */}
      <Modal title={`🏅 Chỉ định Chủ trì (Lead) — ${editingDoc?.project_name || ''}`} open={isLeadModalVisible} onCancel={() => setIsLeadModalVisible(false)} footer={null} destroyOnClose>
        <Form form={leadForm} layout="vertical" onFinish={handleSetLead}>
          <Form.Item name="lead_id" label="Chủ trì (Lead) của Dự thảo" extra="Người được chỉ định sẽ có toàn quyền Phân công Node cho cán bộ trong nhóm.">
            <Select allowClear placeholder="Để trống = Gỡ bỏ Chủ trì">
              {users.map(u => <Option key={u.id} value={u.id}>{u.full_name || u.username} ({u.username})</Option>)}
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit" block icon={<CrownOutlined />}>Xác nhận Chủ trì</Button>
        </Form>
      </Modal>

    </PageHeaderWrapper>
  );
};

export default DocumentManagement;
