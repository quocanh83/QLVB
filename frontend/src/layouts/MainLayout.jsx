import React, { useState, useEffect } from 'react';
import { Layout, Menu, Input, Avatar, Dropdown, Badge, Space, Typography, theme, message, Button } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DesktopOutlined, AppstoreOutlined, CheckSquareOutlined, BookOutlined,
  FolderOpenOutlined, FileTextOutlined, BarChartOutlined, PrinterOutlined,
  SettingOutlined, TeamOutlined, ToolOutlined, UserOutlined, LogoutOutlined, BellOutlined,
  MoonOutlined, SunOutlined
} from '@ant-design/icons';
import { logout, checkUserHasRole, isAdminFromToken } from '../utils/authHelpers';
import { useAppTheme } from '../context/ThemeContext';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const MainLayout = () => {
    const { isDarkMode, toggleTheme } = useAppTheme();
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Auto-collapse Sider khi vào màn Split Screen (DraftDetails) để tiết kiệm diện tích
        if (location.pathname === '/' || location.pathname.includes('/draft-details')) {
            setCollapsed(true);
        } else {
            setCollapsed(false);
        }
    }, [location]);

    const handleMenuClick = ({ key }) => {
        if (key === 'documents') navigate('/documents');
        else if (key === 'users') navigate('/users');
        else if (key === 'dashboard') navigate('/dashboard');
        else if (key === 'settings') navigate('/settings');
        else if (key === 'explanation') navigate('/draft-explanation');
        else if (key === 'drafts') navigate('/');
        else if (key === 'intake') navigate('/feedback-intake');
        else message.info('Tính năng đang được thiết kế, vui lòng quay lại sau!');
    };

    const userMenu = {
        items: [
            { key: 'profile', label: 'Hồ sơ cá nhân', icon: <UserOutlined /> },
            { type: 'divider' },
            { key: 'logout', label: 'Đăng xuất', icon: <LogoutOutlined />, onClick: logout }
        ]
    };

    const menuItems = [
        {
            key: 'workspace',
            label: 'KHÔNG GIAN LÀM VIỆC',
            type: 'group',
            children: [
                { key: 'dashboard', icon: <AppstoreOutlined />, label: 'Tổng quan hệ thống' },
                { key: 'intake', icon: <FolderOpenOutlined />, label: 'Tiếp nhận Góp ý' },
                { key: 'explanation', icon: <CheckSquareOutlined />, label: 'Giải trình Dự thảo' },
                { key: 'drafts', icon: <BookOutlined />, label: 'Biên tập Dự thảo' },
            ]
        },
        {
            key: 'business',
            label: 'QUẢN LÝ NGHIỆP VỤ',
            type: 'group',
            children: [
                { key: 'documents', icon: <FileTextOutlined />, label: 'Danh sách Dự thảo' },
                { key: 'stats', icon: <BarChartOutlined />, label: 'Thống kê Chủ thể' },
                { key: 'reports', icon: <PrinterOutlined />, label: 'Xuất báo cáo T.Hợp' },
            ]
        }
    ];

    if (isAdminFromToken()) {
        menuItems.push({
            key: 'admin',
            label: 'QUẢN TRỊ HỆ THỐNG',
            type: 'group',
            children: [
                { key: 'users', icon: <TeamOutlined />, label: 'Quản lý Người dùng' },
                { key: 'settings', icon: <ToolOutlined />, label: 'Cài đặt Cấu hình' },
            ]
        });
    }

    let selectedKey = 'dashboard';
    if (location.pathname.includes('/documents')) selectedKey = 'documents';
    if (location.pathname.includes('/users')) selectedKey = 'users';
    if (location.pathname.includes('/settings')) selectedKey = 'settings';
    if (location.pathname.includes('/feedback-intake')) selectedKey = 'intake';
    if (location.pathname.includes('/draft-explanation')) selectedKey = 'explanation';
    if (location.pathname === '/' || location.search.includes('docId')) selectedKey = 'drafts';

    return (
        <Layout style={{ height: '100vh', overflow: 'hidden' }}>
            <Sider trigger={null} collapsible collapsed={collapsed} width={260} theme={isDarkMode ? "dark" : "light"} 
                style={{ 
                    boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)', 
                    zIndex: 10,
                    background: 'var(--sider-bg)'
                }}>
                <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid var(--border-color)` }}>
                    <Title level={4} style={{ margin: 0, color: 'var(--primary-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip' }}>
                        {collapsed ? 'QLVB' : 'HỆ THỐNG QLVB'}
                    </Title>
                </div>
                <div style={{ overflowY: 'auto', height: 'calc(100vh - 128px)' }}>
                    <Menu
                        theme={isDarkMode ? "dark" : "light"}
                        mode="inline"
                        selectedKeys={[selectedKey]}
                        onClick={handleMenuClick}
                        items={menuItems}
                        style={{ borderRight: 0, background: 'transparent', paddingBottom: 24 }}
                    />
                </div>
                <div style={{ position: 'absolute', bottom: 16, width: '100%', padding: '0 16px', textAlign: 'center' }}>
                     {!collapsed && <Text type="secondary" style={{ fontSize: 11, opacity: 0.6 }}>Phiên bản 2.0 Vibrant</Text>}
                </div>
            </Sider>
            <Layout>
                <Header style={{ 
                    padding: '0 24px', 
                    background: isDarkMode ? 'var(--primary-gradient)' : 'var(--bg-container)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    boxShadow: '0 1px 4px rgba(0,21,41,.08)', 
                    zIndex: 9 
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span onClick={() => setCollapsed(!collapsed)} style={{ fontSize: 18, cursor: 'pointer', color: isDarkMode ? '#fff' : 'inherit' }}>
                            <DesktopOutlined />
                        </span>
                        <Input.Search placeholder="Tìm kiếm văn bản, chuyên viên..." style={{ width: 300, opacity: isDarkMode ? 0.9 : 1 }} />
                    </div>
                    <Space size="large">
                        <Button 
                            type="text" 
                            icon={isDarkMode ? <SunOutlined style={{color: '#fff'}} /> : <MoonOutlined />} 
                            onClick={toggleTheme}
                            style={{ fontSize: '18px' }}
                        />
                        <Badge count={3} size="small">
                            <BellOutlined style={{ fontSize: 20, cursor: 'pointer', color: isDarkMode ? '#fff' : 'var(--text-secondary)' }} />
                        </Badge>
                        <Dropdown menu={userMenu} placement="bottomRight">
                            <Space style={{ cursor: 'pointer' }}>
                                <Avatar style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'var(--primary-color)' }} icon={<UserOutlined />} />
                                <span style={{ fontWeight: 500, color: isDarkMode ? '#fff' : 'var(--text-color)' }}>Tài khoản của tôi</span>
                            </Space>
                        </Dropdown>
                    </Space>
                </Header>
                <Content style={{ margin: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: 'var(--bg-layout)' }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;
