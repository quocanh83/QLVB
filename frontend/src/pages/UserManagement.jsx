import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Popconfirm, Tag } from 'antd';
import { PlusOutlined, SyncOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import PageHeaderWrapper from '../components/PageHeaderWrapper';

const { Option } = Select;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  
  useEffect(() => {
    fetchData();
  }, []);

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axios.get('/api/accounts/users/', getAuthHeader()),
        axios.get('/api/accounts/roles/', getAuthHeader())
      ]);
      const usersData = usersRes.data.results || usersRes.data;
      const rolesData = rolesRes.data.results || rolesRes.data;
      setUsers(Array.isArray(usersData) ? usersData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (error) {
      message.error("Lỗi khi tải dữ liệu người dùng.");
    }
    setLoading(false);
  };

  const handleSaveUser = async (values) => {
     try {
       if (editingUser) {
           const payload = { ...values };
           if (!payload.password) delete payload.password; // Ko update password nếu để trống
           await axios.patch(`/api/accounts/users/${editingUser.id}/`, payload, getAuthHeader());
           message.success('Cập nhật thông tin cán bộ thành công!');
       } else {
           await axios.post('/api/accounts/users/', values, getAuthHeader());
           message.success('Đã cấp tài khoản cán bộ mới!');
       }
       setIsModalVisible(false);
       form.resetFields();
       setEditingUser(null);
       fetchData();
     } catch (e) {
       message.error('Lỗi thao tác trên tài khoản.');
     }
  };

  const handleDeleteUser = async (id) => {
      try {
          await axios.delete(`/api/accounts/users/${id}/`, getAuthHeader());
          message.success('Đã thu hồi tài khoản hệ thống!');
          fetchData();
      } catch (e) {
          message.error('Lỗi không thể thu hồi: ' + (e.response?.data?.detail || ''));
      }
  };

  const openCreateModal = () => {
      setEditingUser(null);
      form.resetFields();
      setIsModalVisible(true);
  };

  const openEditModal = (record) => {
      setEditingUser(record);
      // Map roles object -> role ids để Select hiển thị đúng giá trị cũ
      const rIds = (record.roles || []).map(r => r.id || r);
      form.setFieldsValue({
          username: record.username,
          full_name: record.full_name,
          email: record.email,
          role_ids: rIds,
          password: ''
      });
      setIsModalVisible(true);
  };

  const columns = [
    { title: 'Tên đăng nhập', dataIndex: 'username', key: 'username', render: text => <strong>{text}</strong> },
    { title: 'Họ và tên', dataIndex: 'full_name', key: 'full_name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phân quyền', dataIndex: 'roles', key: 'roles', render: roles => (roles || []).map(r => {
        const roleName = r.role_name || r;
        const roleKey = r.id || r;
        return <Tag color="blue" key={roleKey}>{roleName}</Tag>;
    }) },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)}>Sửa</Button>
          <Popconfirm title={`Chắc chắn thu hồi tài khoản ${record.username}?`} onConfirm={() => handleDeleteUser(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const actionNode = (
    <Space>
      <Button icon={<SyncOutlined />} onClick={fetchData}>Làm mới</Button>
      <Button type="primary" style={{background: '#16a34a'}} icon={<PlusOutlined />} onClick={openCreateModal}>Cấp tài khoản Mới</Button>
    </Space>
  );

  const searchNode = (
    <Input.Search placeholder="Tìm kiếm tài khoản, cán bộ..." allowClear size="large" style={{ maxWidth: 450, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)' }} />
  );

  return (
    <PageHeaderWrapper title="Quản lý Tài khoản Cán bộ" breadcrumbs={[{ title: 'Quản trị hệ thống' }, { title: 'Trình quản lý Cán bộ' }]} actionNode={actionNode} searchNode={searchNode}>
      <Table columns={columns} dataSource={users} rowKey="id" loading={loading} bordered pagination={{ position: ['bottomRight'] }} />

      <Modal title={editingUser ? `Chỉnh sửa Cán bộ: ${editingUser.username}` : "Cấp mới Tài khoản Hệ thống"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSaveUser}>
          <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true }]}><Input disabled={!!editingUser} placeholder="VD: canbobc" /></Form.Item>
          <Form.Item name="password" label={editingUser ? "Mật khẩu mới (Để trống nếu không đổi)" : "Mật khẩu"} rules={[{ required: !editingUser }]}><Input.Password /></Form.Item>
          <Form.Item name="full_name" label="Họ và tên"><Input placeholder="Nguyễn Văn A" /></Form.Item>
          <Form.Item name="email" label="Email"><Input type="email" placeholder="example@gov.vn" /></Form.Item>
          <Form.Item name="role_ids" label="Phân quyền Vai trò">
            <Select mode="multiple" placeholder="Chọn Nhóm quyền">
              {roles.map(r => <Option key={r.id} value={r.id}>{r.role_name}</Option>)}
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block>{editingUser ? "Lưu thay đổi" : "Khởi tạo Tài khoản"}</Button>
        </Form>
      </Modal>
    </PageHeaderWrapper>
  );
};

export default UserManagement;
