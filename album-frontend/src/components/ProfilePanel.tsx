import React from 'react';
import { UserOutlined, CrownOutlined, MailOutlined, DatabaseOutlined, CalendarOutlined } from '@ant-design/icons';
import type { AppUser } from '../App';

interface ProfilePanelProps {
  user: AppUser;
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({ user }) => {
  const formatBytes = (bytes?: number) => {
    if (!bytes) return '未知';
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  const infoItems = [
    { icon: <UserOutlined />, label: '用户名', value: user.username },
    { icon: <UserOutlined />, label: '昵称', value: user.nickname || '未设置' },
    { icon: <MailOutlined />, label: '邮箱', value: user.email || '未设置' },
    {
      icon: <CrownOutlined />,
      label: '会员状态',
      value: user.isMember ? '已激活' : '未激活',
      highlight: user.isMember,
    },
    {
      icon: <CalendarOutlined />,
      label: '会员到期时间',
      value: user.membershipExpireAt
        ? new Date(user.membershipExpireAt).toLocaleString('zh-CN')
        : '——',
    },
    {
      icon: <DatabaseOutlined />,
      label: '存储配额',
      value: formatBytes(user.storageLimit),
    },
  ];

  return (
    <div className="biophilic-card" style={{ padding: 40, maxWidth: 720 }}>
      <h2 style={{ color: '#3D5A40', fontSize: 24, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
        <UserOutlined /> 个人信息
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {infoItems.map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: 'rgba(168, 198, 160, 0.08)',
              borderRadius: 12,
              border: '1px solid rgba(168, 198, 160, 0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#5B7B5E', fontSize: 15 }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {item.label}
            </div>
            <div
              style={{
                color: item.highlight ? '#5D7A56' : '#3D5A40',
                fontWeight: item.highlight ? 600 : 500,
                fontSize: 15,
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfilePanel;
