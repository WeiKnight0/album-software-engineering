import React from 'react';
import { InfoCircleOutlined, PictureOutlined, RobotOutlined, TeamOutlined } from '@ant-design/icons';

const featureItems = [
  { icon: <PictureOutlined />, title: '智能相册管理', desc: '支持照片上传、分类、回收站、传输记录与基础存储管理。' },
  { icon: <TeamOutlined />, title: '人物识别整理', desc: '自动识别照片中的人物，支持命名、合并和分类查看。' },
  { icon: <RobotOutlined />, title: 'AI 搜索与对话', desc: '基于照片内容建立检索能力，通过自然语言查找和询问相册内容。' },
];

const AboutPanel: React.FC = () => {
  return (
    <div className="biophilic-card" style={{ padding: 40, maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--gradient-leaf)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 22 }}>
          <InfoCircleOutlined />
        </div>
        <div>
          <h2 style={{ color: '#3D5A40', fontSize: 26, margin: 0 }}>关于我们</h2>
          <div style={{ color: '#8B7355', fontSize: 14, marginTop: 4 }}>自然相册 · AI Photo Album</div>
        </div>
      </div>

      <p style={{ color: '#6B5B4F', lineHeight: 1.9, fontSize: 15, marginBottom: 28 }}>
        自然相册是一个面向个人照片管理的智能相册系统，整合照片存储、人脸识别、自然语言搜索和 AI 对话能力，帮助用户更轻松地整理、查找与回顾影像记忆。
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        {featureItems.map(item => (
          <div key={item.title} style={{ padding: 20, borderRadius: 16, background: 'rgba(168,198,160,0.1)', border: '1px solid rgba(168,198,160,0.18)' }}>
            <div style={{ color: '#5B7B5E', fontSize: 24, marginBottom: 10 }}>{item.icon}</div>
            <div style={{ color: '#3D5A40', fontWeight: 600, marginBottom: 8 }}>{item.title}</div>
            <div style={{ color: '#6B5B4F', lineHeight: 1.7, fontSize: 13 }}>{item.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: 20, borderRadius: 16, background: 'rgba(255,255,255,0.68)', border: '1px solid rgba(168,198,160,0.2)' }}>
        <div style={{ color: '#3D5A40', fontWeight: 600, marginBottom: 10 }}>系统组成</div>
        <div style={{ color: '#6B5B4F', lineHeight: 1.8, fontSize: 14 }}>
          前端使用 React 与 Vite，主后端使用 Spring Boot，人脸识别与 RAG 检索服务由独立服务提供。系统当前支持用户端相册功能与管理员后台管理能力。
        </div>
      </div>
    </div>
  );
};

export default AboutPanel;
