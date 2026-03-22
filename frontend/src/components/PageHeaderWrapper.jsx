import React from 'react';
import { Breadcrumb, Typography, Space, theme } from 'antd';

const { Title } = Typography;

const PageHeaderWrapper = ({ title, breadcrumbs, searchNode, actionNode, children }) => {
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-layout)', overflow: 'auto' }}>
            <div style={{ padding: '16px 24px', background: 'var(--bg-container)' }}>
                <Breadcrumb items={breadcrumbs} style={{ marginBottom: 16 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={4} style={{ margin: 0, color: 'var(--text-color)' }}>{title}</Title>
                    {actionNode && <Space>{actionNode}</Space>}
                </div>
                {searchNode && (
                    <div style={{ marginTop: 16 }}>
                        {searchNode}
                    </div>
                )}
            </div>
            
            <div style={{ flex: 1, padding: '24px' }}>
                <div style={{ background: 'var(--bg-container)', padding: '24px', borderRadius: 8, boxShadow: 'var(--shadow)', height: '100%' }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default PageHeaderWrapper;
