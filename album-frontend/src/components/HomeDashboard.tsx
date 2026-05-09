import React from 'react';
import { ExpandOutlined, TeamOutlined, PictureOutlined } from '@ant-design/icons';
import AIChat from './AIChat';
import FaceManager from './FaceManager';
import PhotoGallery from './PhotoGallery';

interface HomeDashboardProps {
  userId: number;
  refreshKey: number;
  onNavigateToChat: () => void;
  onNavigateToFaces: () => void;
  onNavigateToGallery: () => void;
}

const HomeDashboard: React.FC<HomeDashboardProps> = ({
  userId,
  refreshKey,
  onNavigateToChat,
  onNavigateToFaces,
  onNavigateToGallery,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: 'calc(100vh - 112px)' }}>
      {/* 上半部分：智能回答 + 人物分类 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, flex: '0 0 45%', minHeight: 0 }}>
        {/* 智能回答卡片 */}
        <div className="biophilic-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {/* 展开按钮 */}
          <button
            onClick={onNavigateToChat}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 10,
              background: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(168,198,160,0.3)',
              borderRadius: '10px 10px 10px 2px',
              padding: '6px 12px',
              cursor: 'pointer',
              color: '#5B7B5E',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 200ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <ExpandOutlined /> 展开
          </button>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <AIChat userId={userId} embedded />
          </div>
        </div>

        {/* 人物分类卡片 */}
        <div className="biophilic-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {/* 更多按钮 */}
          <button
            onClick={onNavigateToFaces}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 10,
              background: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(168,198,160,0.3)',
              borderRadius: '10px 10px 10px 2px',
              padding: '6px 12px',
              cursor: 'pointer',
              color: '#5B7B5E',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 200ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <TeamOutlined /> 更多
          </button>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <FaceManager userId={userId} embedded />
          </div>
        </div>
      </div>

      {/* 下半部分：图像管理 */}
      <div className="biophilic-card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 18, color: '#3D5A40', fontWeight: 600 }}>图像管理</h3>
          <button
            onClick={onNavigateToGallery}
            style={{
              background: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(168,198,160,0.3)',
              borderRadius: '10px 10px 10px 2px',
              padding: '6px 12px',
              cursor: 'pointer',
              color: '#5B7B5E',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 200ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <PictureOutlined /> 展开
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 20px' }}>
          <PhotoGallery
            userId={userId}
            folderId={null}
            refreshKey={refreshKey}
            showTitle={false}
          />
        </div>
      </div>
    </div>
  );
};

export default HomeDashboard;
