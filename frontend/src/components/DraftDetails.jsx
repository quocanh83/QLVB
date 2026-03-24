import React, { useState, useEffect, useRef } from 'react';
import { Typography, Tree, Tag, Tabs, message, theme, Drawer, List, Button, Badge, Divider, Card, Alert } from 'antd';
import { FileTextOutlined, TeamOutlined, InboxOutlined, SolutionOutlined, BellOutlined, ArrowRightOutlined, PlusOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { checkUserHasRole, getUserIdFromToken, isAdminFromToken } from '../utils/authHelpers';
import NodeAssignmentPanel from './NodeAssignmentPanel';
import SplitScreenResolution from './SplitScreenResolution';
import FeedbackIntakePanel from './FeedbackIntakePanel';

const { Text, Title, Paragraph } = Typography;

const DraftDetails = () => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [isGeneralFeedback, setIsGeneralFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState('resolution');
  const [treeData, setTreeData] = useState([]);
  const [allNodesFlattened, setAllNodesFlattened] = useState([]);
  const [docInfo, setDocInfo] = useState(null);
  const [unresolvedFeedbacks, setUnresolvedFeedbacks] = useState([]);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [jumping, setJumping] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const docId = new URLSearchParams(location.search).get('docId');

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
  });

  const fetchUnresolved = async () => {
    if (!docId) return;
    try {
      const res = await axios.get(`/api/documents/${docId}/unresolved_feedbacks/`, getAuthHeader());
      setUnresolvedFeedbacks(res.data);
    } catch (e) { }
  };

  useEffect(() => {
    if (docId) {
      // Load Document info to check lead
      axios.get(`/api/documents/${docId}/`, getAuthHeader())
        .then(res => setDocInfo(res.data))
        .catch(() => { });

      // Load Tree Nodes
      axios.get(`/api/documents/${docId}/nodes/`, getAuthHeader())
        .then(res => {
          const flat = [];
          const formatTree = (nodes) => (Array.isArray(nodes) ? nodes : []).map(n => {
            flat.push(n);
            return {
              key: n.id,
              title: (
                <span style={{ color: n.is_editable ? 'var(--text-color)' : 'var(--text-quaternary)', fontStyle: n.is_editable ? 'normal' : 'italic', fontWeight: n.is_editable ? 600 : 400 }}>
                  {n.node_label} {!n.is_editable && <Tag color="default" style={{ marginLeft: 4, zoom: 0.8 }}>Chỉ đọc</Tag>}
                </span>
              ),
              is_editable: n.is_editable,
              originalData: n,
              children: n.children ? formatTree(n.children) : [],
            };
          });
          setTreeData(formatTree(res.data));
          setAllNodesFlattened(flat);
        }).catch(() => message.error("Lỗi khi tải Cấu trúc văn bản"));

      fetchUnresolved();
    }
  }, [docId, activeTab]);

  const onSelect = (_, info) => {
    if (info.node) {
      setSelectedNode(info.node.originalData);
      setIsGeneralFeedback(false);
    }
  };

  const jumpToFeedback = (fb) => {
    const node = allNodesFlattened.find(n => n.id === fb.node_id);
    if (!node) return;

    setJumping(true);
    setSelectedNode(node);
    setActiveTab('resolution');
    setIsDrawerVisible(false);

    // Đợi UI render xong rồi scroll
    setTimeout(() => {
      const el = document.getElementById(`feedback-card-${fb.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.boxShadow = '0 0 15px rgba(22, 119, 255, 0.5)';
        el.style.border = '2px solid #1677ff';
        setTimeout(() => {
          el.style.boxShadow = '';
          el.style.border = '';
          setJumping(false);
        }, 3000);
      } else {
        setJumping(false);
      }
    }, 800);
  };

  const userId = getUserIdFromToken();
  const isAdmin = isAdminFromToken();
  const isLead = docInfo && (docInfo.lead === userId || docInfo.lead === parseInt(userId));
  const canAssign = isAdmin || isLead;
  const canIntake = isAdmin || isLead || checkUserHasRole('Chuyên viên Góp ý');
  const canResolve = isAdmin || isLead || checkUserHasRole('Chuyên viên Giải trình');

  if (!docId) {
    return (
      <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-layout)' }}>
        <Card style={{ width: 600, textAlign: 'center', borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: 'none', padding: '40px 20px' }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{
              width: 120, height: 120, background: 'var(--primary-gradient)', borderRadius: '50%',
              display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto',
              boxShadow: '0 10px 20px rgba(22, 119, 255, 0.2)'
            }}>
              <FileTextOutlined style={{ fontSize: 56, color: '#fff' }} />
            </div>
          </div>
          <Title level={2} style={{ fontWeight: 800, marginBottom: 16 }}>Chào mừng bạn quay lại!</Title>
          <Paragraph style={{ fontSize: 18, color: 'var(--text-secondary)', marginBottom: 40 }}>
            Bạn chưa chọn Dự thảo văn bản nào để xử lý. Vui lòng chọn một văn bản từ danh sách để bắt đầu giải trình hoặc nạp góp ý.
          </Paragraph>
          <Button
            type="primary"
            size="large"
            icon={<AppstoreOutlined />}
            onClick={() => navigate('/documents')}
            style={{ height: 56, padding: '0 40px', borderRadius: 28, fontSize: 18, fontWeight: 600, boxShadow: '0 4px 14px 0 rgba(0,118,255,0.39)' }}
          >
            Đến danh sách Dự thảo
          </Button>
        </Card>
      </div>
    );
  }

  const tabItems = [
    ...(canResolve ? [{
      key: 'resolution',
      label: <span><SolutionOutlined /> Giải trình</span>,
      children: (
        <div style={{ background: 'var(--bg-container)', borderRadius: 12, padding: '32px 40px', minHeight: 600, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {selectedNode && selectedNode.is_editable ? (
            <SplitScreenResolution documentId={docId} selectedNodeId={selectedNode.id} />
          ) : selectedNode ? (
            <div style={{ padding: '24px', background: 'var(--bg-layout)', borderRadius: 12 }}>
              <Text strong>{selectedNode.node_label}</Text>
              <Divider />
              <Typography.Paragraph>{selectedNode.content}</Typography.Paragraph>
              <Tag color="red">Bạn không có quyền giải trình mục này.</Tag>
            </div>
          ) : (
            <div style={{ display: 'flex', height: 500, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: 'var(--text-quaternary)' }}>
              <SolutionOutlined style={{ fontSize: '96px', opacity: 0.1, marginBottom: '24px' }} />
              <Title level={3} style={{ color: 'var(--primary-color)', fontWeight: 700 }}>Trạm Giải Trình</Title>
              <Text style={{ textAlign: 'center', maxWidth: '450px', fontSize: '15px', lineHeight: '1.6' }}>
                Hãy chọn một <strong>Điều/Khoản</strong> ở bên trái hoặc xem danh sách <strong>Góp ý chưa giải trình</strong>.
              </Text>
              <Button type="primary" icon={<BellOutlined />} onClick={() => setIsDrawerVisible(true)} size="large" style={{ marginTop: 24, borderRadius: 8 }}>
                Xem {unresolvedFeedbacks.length} Góp ý chưa giải trình
              </Button>
            </div>
          )}
        </div>
      )
    }] : []),
    ...(canIntake ? [{
      key: 'intake',
      label: <span><InboxOutlined /> Tiếp nhận Góp ý</span>,
      children: (
        <div style={{ padding: '64px 0', textAlign: 'center', background: 'var(--bg-container)', borderRadius: 12 }}>
          <InboxOutlined style={{ fontSize: 64, color: 'var(--primary-color)', opacity: 0.5, marginBottom: 24 }} />
          <Title level={4}>Tính năng nạp Góp ý đã được nâng cấp!</Title>
          <Paragraph style={{ maxWidth: 500, margin: '0 auto 24px', fontSize: 16 }}>
            Hiện tại, toàn bộ việc nạp Góp ý (từ file hoặc nhập tay) đã được chuyển sang trang riêng biệt để hỗ trợ phân loại và xem trước dữ liệu tốt hơn.
          </Paragraph>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => navigate(`/feedback-intake?docId=${docId}`)}
            style={{ borderRadius: 8 }}
          >
            Đi tới trang Tiếp nhận Góp ý
          </Button>
        </div>
      )
    }] : []),
    ...(canAssign ? [{
      key: 'assign',
      label: <span style={{ color: '#f59e0b', fontWeight: 700 }}><TeamOutlined /> Phân công Nhóm</span>,
      children: <NodeAssignmentPanel documentId={docId} />
    }] : [])
  ];

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden', position: 'relative' }}>
      {unresolvedFeedbacks.length > 0 && !isDrawerVisible && (
        <div style={{ position: 'absolute', top: 16, right: 32, zIndex: 10 }}>
          <Badge count={unresolvedFeedbacks.length} overflowCount={99}>
            <Button type="primary" shape="circle" icon={<BellOutlined />} size="large" onClick={() => setIsDrawerVisible(true)} />
          </Badge>
        </div>
      )}

      {/* CỘT TRÁI: CÂY VĂN BẢN */}
      <div style={{ flex: '0 0 320px', background: 'var(--bg-container)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '1px 0 5px rgba(0,0,0,0.02)', zIndex: 1 }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-layout)' }}>
          <Text style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            <FileTextOutlined style={{ marginRight: 6 }} />
            Biên Mục Cấu Trúc
          </Text>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <Tree
            showLine
            defaultExpandAll
            onSelect={onSelect}
            selectedKeys={selectedNode ? [selectedNode.id] : []}
            treeData={treeData}
            style={{ fontSize: '14px', background: 'transparent' }}
          />
        </div>
      </div>

      {/* CỘT PHẢI: TABS */}
      <div style={{ flex: 1, background: 'var(--bg-layout)', overflowY: 'auto', padding: '24px 32px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="large"
          type="card"
          items={tabItems}
          style={{ height: '100%' }}
        />
      </div>

      <Drawer
        title={<Title level={4} style={{ margin: 0 }}><BellOutlined /> Góp ý chưa giải trình</Title>}
        placement="right"
        onClose={() => setIsDrawerVisible(false)}
        open={isDrawerVisible}
        width={450}
        styles={{ body: { padding: 0 } }}
      >
        <List
          itemLayout="vertical"
          dataSource={unresolvedFeedbacks}
          renderItem={fb => (
            <List.Item
              key={fb.id}
              onClick={() => jumpToFeedback(fb)}
              style={{ cursor: 'pointer', padding: '20px 24px', borderBottom: '1px solid #f0f0f0', transition: 'all 0.3s' }}
              className="unresolved-item"
              actions={[
                <Button type="link" icon={<ArrowRightOutlined />} style={{ padding: 0 }}>Đi tới khu vực giải trình</Button>
              ]}
            >
              <List.Item.Meta
                title={<span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>{fb.node_path}</span>}
                description={<Tag color="blue">{fb.contributing_agency}</Tag>}
              />
              <div style={{ marginTop: 8, color: 'var(--text-color)', fontSize: '14px', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                "{fb.content}"
              </div>
            </List.Item>
          )}
        />
      </Drawer>
    </div>
  );
};

export default DraftDetails;
