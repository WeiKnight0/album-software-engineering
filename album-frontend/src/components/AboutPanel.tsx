import React from 'react';
import { CloudOutlined, PictureOutlined, RobotOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';

const featureItems = [
  { icon: <PictureOutlined />, title: '照片管理', desc: '上传、分类、回收站与传输记录，让每张照片都有归处。' },
  { icon: <TeamOutlined />, title: '人物识别', desc: '自动识别人脸并归类，支持命名与合并，快速找到某个人的所有照片。' },
  { icon: <SearchOutlined />, title: '智能搜索', desc: '用自然语言描述你想找的内容，系统会从照片中找到最匹配的结果。' },
  { icon: <RobotOutlined />, title: 'AI 对话', desc: '像和朋友聊天一样询问相册内容，AI 会根据你的照片给出回答。' },
  { icon: <CloudOutlined />, title: '云端存储', desc: '照片安全存储在云端，随时随地访问你的自然记忆。' },
];

const AboutPanel: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 820 }}>
      <div className="biophilic-card" style={{ padding: 40 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ color: '#2F4A33', fontSize: 30, margin: 0, fontWeight: 700, letterSpacing: -0.5 }}>自然相册</h1>
          <div style={{ color: '#7D9B76', fontSize: 15, marginTop: 6 }}>AI Photo Album</div>
        </div>

        <p style={{ color: '#4A5D4E', lineHeight: 1.9, fontSize: 15, marginBottom: 0, maxWidth: 640 }}>
          自然相册是一款面向个人的智能照片管理工具。它不仅帮助你存储和整理照片，更能通过人脸识别和自然语言搜索，让你用最自然的方式找到想回忆的瞬间。
        </p>
      </div>

      <div className="biophilic-card" style={{ padding: 32 }}>
        <h2 style={{ color: '#3D5A40', fontSize: 20, marginBottom: 24 }}>核心能力</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {featureItems.map(item => (
            <div key={item.title} style={{ padding: 20, borderRadius: 16, background: 'rgba(168,198,160,0.08)', border: '1px solid rgba(168,198,160,0.15)' }}>
              <div style={{ color: '#5B7B5E', fontSize: 22, marginBottom: 10 }}>{item.icon}</div>
              <div style={{ color: '#3D5A40', fontWeight: 600, marginBottom: 6, fontSize: 14 }}>{item.title}</div>
              <div style={{ color: '#6B5B4F', lineHeight: 1.7, fontSize: 13 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="biophilic-card" style={{ padding: 32 }}>
        <h2 style={{ color: '#3D5A40', fontSize: 20, marginBottom: 20 }}>版本信息</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: '当前版本', value: 'v1.0.0' },
            { label: '最近更新', value: '2026 年 5 月' },
          ].map(item => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                background: 'rgba(168, 198, 160, 0.08)',
                borderRadius: 12,
                border: '1px solid rgba(168, 198, 160, 0.15)',
              }}
            >
              <span style={{ color: '#5B7B5E', fontSize: 14 }}>{item.label}</span>
              <span style={{ color: '#3D5A40', fontWeight: 500, fontSize: 14 }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AboutPanel;
