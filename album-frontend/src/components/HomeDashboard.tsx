import React, { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Input, Spin } from 'antd';
import {
  CloudUploadOutlined,
  MessageOutlined,
  PictureOutlined,
  SearchOutlined,
  TeamOutlined,
  FolderOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { faceAPI, folderAPI, imageAPI } from '../services/api';

interface HomeDashboardProps {
  userId: number;
  refreshKey: number;
  onNavigateToChat: () => void;
  onNavigateToFaces: () => void;
  onNavigateToGallery: () => void;
  onNavigateToTransfer: () => void;
  onNavigateToRecycle: () => void;
}

interface ImageItem {
  id: string;
  userId: number;
  originalFilename: string;
  uploadTime?: string;
  createdAt?: string;
}

interface DashboardStats {
  totalImages: number;
  totalStorage: number;
  totalFolders: number;
  totalFaces: number;
  recycleCount: number;
}

const formatStorage = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const HomeDashboard: React.FC<HomeDashboardProps> = ({
  userId,
  refreshKey,
  onNavigateToChat,
  onNavigateToFaces,
  onNavigateToGallery,
  onNavigateToTransfer,
  onNavigateToRecycle,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentPhotos, setRecentPhotos] = useState<ImageItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalImages: 0,
    totalStorage: 0,
    totalFolders: 0,
    totalFaces: 0,
    recycleCount: 0,
  });

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        const [statsRes, imagesRes, foldersRes, facesRes, recycleRes] = await Promise.all([
          imageAPI.getStats(userId),
          imageAPI.getAll(userId),
          folderAPI.getAll(userId),
          faceAPI.list(userId),
          imageAPI.getRecycleBin(userId),
        ]);

        if (cancelled) return;

        const images: ImageItem[] = imagesRes.data.data || [];
        const sortedImages = [...images].sort((a, b) => {
          const aTime = new Date(a.uploadTime || a.createdAt || 0).getTime();
          const bTime = new Date(b.uploadTime || b.createdAt || 0).getTime();
          return bTime - aTime;
        });

        setRecentPhotos(sortedImages.slice(0, 10));
        setStats({
          totalImages: Number(statsRes.data.data?.totalImages || images.length || 0),
          totalStorage: Number(statsRes.data.data?.totalStorage || 0),
          totalFolders: (foldersRes.data.data || []).length,
          totalFaces: (facesRes.data.data || []).length,
          recycleCount: (recycleRes.data.data || []).length,
        });
      } catch (error) {
        console.error('加载首页概览失败:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  const statCards = useMemo(() => [
    { label: '照片', value: stats.totalImages, extra: '已归档的自然记忆', icon: <PictureOutlined />, tone: '#5B7B5E' },
    { label: '人物', value: stats.totalFaces, extra: '已识别的人物相册', icon: <TeamOutlined />, tone: '#7D9B76' },
    { label: '文件夹', value: stats.totalFolders, extra: '整理好的分类', icon: <FolderOutlined />, tone: '#8B7355' },
    { label: '存储', value: formatStorage(stats.totalStorage), extra: `${stats.recycleCount} 项在回收站`, icon: <DatabaseOutlined />, tone: '#4D7C8A' },
  ], [stats]);

  const quickActions = [
    { title: '上传照片', desc: '添加新的照片和素材', icon: <CloudUploadOutlined />, action: onNavigateToTransfer },
    { title: '智能问答', desc: '用自然语言找照片', icon: <MessageOutlined />, action: onNavigateToChat },
    { title: '人物相册', desc: '查看和命名人物', icon: <TeamOutlined />, action: onNavigateToFaces },
    { title: '图像管理', desc: '批量整理、移动、删除', icon: <PictureOutlined />, action: onNavigateToGallery },
    { title: '回收站', desc: '恢复或清理已删除内容', icon: <DeleteOutlined />, action: onNavigateToRecycle },
  ];

  const handleSearch = () => {
    const keyword = searchQuery.trim();
    if (!keyword) return;
    navigate(`/search?q=${encodeURIComponent(keyword)}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <section
        className="biophilic-card"
        style={{
          padding: 28,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.8fr)',
          gap: 28,
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.92), rgba(232,240,229,0.9))',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ color: '#7D9B76', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>自然相册工作台</div>
          <h1 style={{ margin: 0, color: '#2F4A33', fontSize: 34, lineHeight: 1.2, letterSpacing: -0.6 }}>让每一段光影，都有安放之处</h1>
          <p style={{ margin: '14px 0 22px', color: '#647567', fontSize: 15, maxWidth: 640 }}>
            在这里回望最近的照片、熟悉的人和悄然增长的记忆。需要寻找、整理或上传时，一切入口都静静等候在触手可及的地方。
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button type="primary" size="large" icon={<CloudUploadOutlined />} onClick={onNavigateToTransfer} style={{ background: 'var(--gradient-leaf)', border: 'none' }}>
              上传照片
            </Button>
            <Button size="large" icon={<MessageOutlined />} onClick={onNavigateToChat}>智能问答</Button>
            <Button size="large" icon={<PictureOutlined />} onClick={onNavigateToGallery}>查看照片</Button>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Input.Search
            size="large"
            allowClear
            value={searchQuery}
            placeholder="搜索人物、地点、照片内容..."
            enterButton={<SearchOutlined />}
            onChange={(event) => setSearchQuery(event.target.value)}
            onSearch={handleSearch}
            style={{ marginBottom: 14 }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {['lxc的照片', '最近上传', '人物合照', '风景'].map(keyword => (
              <button
                key={keyword}
                onClick={() => navigate(`/search?q=${encodeURIComponent(keyword)}`)}
                style={{
                  border: '1px solid rgba(168,198,160,0.35)',
                  background: 'rgba(255,255,255,0.72)',
                  borderRadius: 14,
                  padding: '10px 12px',
                  color: '#3D5A40',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      </section>

      <Spin spinning={loading}>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
          {statCards.map(card => (
            <div key={card.label} className="biophilic-card" style={{ padding: 20, minHeight: 126 }}>
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ color: '#7B8B7D', fontSize: 13, marginBottom: 10 }}>{card.label}</div>
                  <div style={{ color: '#2F4A33', fontSize: 28, fontWeight: 700 }}>{card.value}</div>
                  <div style={{ color: '#879587', fontSize: 12, marginTop: 8 }}>{card.extra}</div>
                </div>
                <div style={{ width: 42, height: 42, borderRadius: '16px 16px 16px 4px', background: `${card.tone}18`, color: card.tone, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </section>
      </Spin>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 22, alignItems: 'start' }}>
        <div className="biophilic-card" style={{ padding: 22 }}>
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0, color: '#3D5A40', fontSize: 20 }}>最近照片</h2>
              <p style={{ margin: '6px 0 0', color: '#7B8B7D', fontSize: 13 }}>只展示最近内容，完整管理去图像管理页。</p>
            </div>
            <Button type="link" onClick={onNavigateToGallery}>查看全部 <ArrowRightOutlined /></Button>
          </div>

          {recentPhotos.length > 0 ? (
            <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
              {recentPhotos.map(photo => (
                <button
                  key={photo.id}
                  onClick={onNavigateToGallery}
                  title={photo.originalFilename}
                  style={{
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    borderRadius: '18px 18px 18px 4px',
                    background: '#E8F0E5',
                    aspectRatio: '1 / 1',
                    boxShadow: '0 2px 10px rgba(91,123,94,0.14)',
                  }}
                >
                  <img
                    src={imageAPI.getThumbnailUrl(photo.id, userId)}
                    alt={photo.originalFilename}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </button>
              ))}
            </div>
          ) : (
            <div style={{ position: 'relative', zIndex: 1, padding: '32px 0' }}>
              <Empty description="还没有照片" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                <Button type="primary" onClick={onNavigateToTransfer} style={{ background: 'var(--gradient-leaf)', border: 'none' }}>去上传</Button>
              </Empty>
            </div>
          )}
        </div>

        <div className="biophilic-card" style={{ padding: 22 }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ margin: 0, color: '#3D5A40', fontSize: 20 }}>快捷入口</h2>
            <p style={{ margin: '6px 0 16px', color: '#7B8B7D', fontSize: 13 }}>常用操作独立打开，页面更干净。</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {quickActions.map(action => (
                <button
                  key={action.title}
                  onClick={action.action}
                  style={{
                    border: '1px solid rgba(168,198,160,0.28)',
                    background: 'rgba(255,255,255,0.72)',
                    borderRadius: '16px 16px 16px 4px',
                    padding: 14,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <span style={{ width: 38, height: 38, borderRadius: 14, background: 'rgba(125,155,118,0.14)', color: '#5B7B5E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {action.icon}
                  </span>
                  <span style={{ flex: 1 }}>
                    <strong style={{ display: 'block', color: '#3D5A40', fontSize: 14 }}>{action.title}</strong>
                    <span style={{ color: '#7B8B7D', fontSize: 12 }}>{action.desc}</span>
                  </span>
                  <ArrowRightOutlined style={{ color: '#A8C6A0' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeDashboard;
