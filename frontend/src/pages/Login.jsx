import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const Login = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const res = await axios.post('http://localhost:8000/api/accounts/login/', values);
            localStorage.setItem('access_token', res.data.access);
            localStorage.setItem('refresh_token', res.data.refresh);
            message.success('Đăng nhập thành công');
            navigate('/');
        } catch (error) {
            console.error("Login error detail:", error.response?.data || error.message);
            message.error('Username hoặc Mật khẩu không đúng!');
        }
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-layout)' }}>
            <Card style={{ width: 400, boxShadow: 'var(--shadow)', background: 'var(--bg-container)', border: '1px solid var(--border-color)' }}>
                <Title level={3} style={{ textAlign: 'center', marginBottom: 24, color: 'var(--primary-color)' }}>ĐĂNG NHẬP HỆ THỐNG</Title>
                <Form layout="vertical" onFinish={onFinish} size="large">
                    <Form.Item label="Tên đăng nhập" name="username" rules={[{ required: true, message: 'Vui lòng nhập Username!' }]}>
                        <Input prefix={<UserOutlined />} placeholder="Username" />
                    </Form.Item>
                    <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu!' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Password" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading} style={{ marginTop: 16 }}>
                            ĐĂNG NHẬP
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default Login;
