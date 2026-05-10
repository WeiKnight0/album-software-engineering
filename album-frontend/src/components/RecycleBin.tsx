import React, { useState, useEffect } from 'react';
import { message, Modal, Tabs, Checkbox } from 'antd';
import {
  UndoOutlined,
  DeleteOutlined,
  PictureOutlined,
  FolderOutlined,
  CalendarOutlined,
  FileImageOutlined,
  ArrowLeftOutlined,
  CheckSquareOutlined,
  CloseSquareOutlined
} from '@ant-design/icons';
import { imageAPI, folderAPI } from '../services/api';
import AuthImage from './AuthImage';

interface ImageItem {
  id: string;
  userId: number;
  folderId: number;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  uploadTime: string;
  movedToBinAt?: string;
  originalFolderId?: number;
}

interface FolderItem {
  id: number;
  name: string;
  parentId: number;
  movedToBinAt?: string;
  originalParentId?: number;
}

interface RecycleBinProps {
  userId: number;
  onRestored?: () => void;
  onBack?: () => void;
}

const EmptyPlantIcon: React.FC = () => (
  <svg viewBox="0 0 120 120" style={{ width: 100, height: 100, margin: '0 auto 20px', opacity: 0.35 }}>
    <defs>
      <linearGradient id="rbLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A8C6A0" />
        <stop offset="100%" stopColor="#7D9B76" />
      </linearGradient>
    </defs>
    <path d="M40 80 L45 100 L75 100 L80 80 Z" fill="#8B7355" opacity="0.5"/>
    <ellipse cx="60" cy="80" rx="20" ry="5" fill="#6B5B4F" opacity="0.3"/>
    <path d="M60 80 Q60 60 60 40" stroke="#7D9B76" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <path d="M60 60 Q45 50 35 35 Q50 45 60 55" fill="none" stroke="#A8C6A0" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M60 55 Q75 45 85 30 Q70 40 60 50" fill="none" stroke="#A8C6A0" strokeWidth="1.5" strokeLinecap="round"/>
    <ellipse cx="35" cy="35" rx="10" ry="6" fill="url(#rbLeafGrad)" opacity="0.4" transform="rotate(-30 35 35)"/>
    <ellipse cx="85" cy="30" rx="10" ry="6" fill="url(#rbLeafGrad)" opacity="0.4" transform="rotate(30 85 30)"/>
  </svg>
);

const RecycleBin: React.FC<RecycleBinProps> = ({ userId, onRestored, onBack }) => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('images');
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<number>>(new Set());

  const fetchData = async () => {
    try {
      setLoading(true);
      const [imgRes, folderRes] = await Promise.all([
        imageAPI.getRecycleBin(userId),
        folderAPI.getRecycleBin(userId),
      ]);
      setImages(imgRes.data.data || []);
      setFolders(folderRes.data.data || []);
      setSelectedImageIds(new Set());
      setSelectedFolderIds(new Set());
    } catch (error) {
      message.error('获取回收站数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const handleRestoreImage = async (imageId: string) => {
    try {
      await imageAPI.restore(imageId, userId);
      message.success('照片已恢复');
      fetchData();
      onRestored?.();
    } catch (error) {
      message.error('恢复失败');
    }
  };

  const handleDeleteImagePermanent = async (imageId: string, name: string) => {
    Modal.confirm({
      title: '永久删除',
      content: `照片 "${name}" 将被永久删除，无法恢复。`,
      okText: '永久删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await imageAPI.delete(imageId, userId, true);
          message.success('已永久删除');
          fetchData();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleRestoreFolder = async (folderId: number) => {
    try {
      await folderAPI.restore(folderId, userId);
      message.success('文件夹已恢复');
      fetchData();
      onRestored?.();
    } catch (error) {
      message.error('恢复失败');
    }
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImageIds(prev => {
      const next = new Set(prev);
      if (next.has(imageId)) next.delete(imageId);
      else next.add(imageId);
      return next;
    });
  };

  const toggleFolderSelection = (folderId: number) => {
    setSelectedFolderIds(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const selectAllImages = () => {
    if (selectedImageIds.size === images.length) {
      setSelectedImageIds(new Set());
    } else {
      setSelectedImageIds(new Set(images.map(img => img.id)));
    }
  };

  const selectAllFolders = () => {
    if (selectedFolderIds.size === folders.length) {
      setSelectedFolderIds(new Set());
    } else {
      setSelectedFolderIds(new Set(folders.map(f => f.id)));
    }
  };

  const handleBatchRestore = async () => {
    const imgIds = Array.from(selectedImageIds);
    const folderIds = Array.from(selectedFolderIds);
    if (imgIds.length === 0 && folderIds.length === 0) {
      message.warning('请选择要恢复的项目');
      return;
    }
    Modal.confirm({
      title: '确认恢复',
      content: `确定恢复选中的 ${imgIds.length} 张照片和 ${folderIds.length} 个文件夹吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          let successCount = 0;
          for (const id of imgIds) {
            try { await imageAPI.restore(id, userId); successCount++; } catch (e) {}
          }
          for (const id of folderIds) {
            try { await folderAPI.restore(id, userId); successCount++; } catch (e) {}
          }
          message.success(`成功恢复 ${successCount} 个项目`);
          fetchData();
          onRestored?.();
        } catch (error) {
          message.error('恢复失败');
        }
      },
    });
  };

  const handleBatchDeletePermanent = async () => {
    const imgIds = Array.from(selectedImageIds);
    const folderIds = Array.from(selectedFolderIds);
    if (imgIds.length === 0 && folderIds.length === 0) {
      message.warning('请选择要删除的项目');
      return;
    }
    Modal.confirm({
      title: '确认永久删除',
      content: `选中的 ${imgIds.length} 张照片和 ${folderIds.length} 个文件夹将被永久删除，无法恢复。`,
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          let successCount = 0;
          if (imgIds.length > 0) {
            const res = await imageAPI.batchDelete(imgIds, userId, true);
            successCount += res.data?.data?.deletedCount || imgIds.length;
          }
          for (const id of folderIds) {
            try { await folderAPI.delete(id, userId); successCount++; } catch (e) {}
          }
          message.success(`已永久删除 ${successCount} 个项目`);
          fetchData();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleDeleteFolderPermanent = async (folderId: number, name: string) => {
    Modal.confirm({
      title: '永久删除',
      content: `文件夹 "${name}" 将被永久删除，无法恢复。`,
      okText: '永久删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await folderAPI.delete(folderId, userId);
          message.success('已永久删除');
          fetchData();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <div className="biophilic-card" style={{ padding: 48, textAlign: 'center' }}>
        <div className="animate-breathe">
          <EmptyPlantIcon />
        </div>
        <p style={{ color: '#7D9B76' }}>正在加载回收站...</p>
      </div>
    );
  }

  const hasData = images.length > 0 || folders.length > 0;

  if (!hasData) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: 'rgba(168,198,160,0.15)',
                border: '1px solid rgba(168,198,160,0.3)',
                borderRadius: '12px 12px 12px 4px',
                padding: '8px 14px',
                cursor: 'pointer',
                color: '#5B7B5E',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 200ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,198,160,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(168,198,160,0.15)'; }}
            >
              <ArrowLeftOutlined /> 返回
            </button>
          )}
          <h3 className="biophilic-title" style={{ fontSize: 20, margin: 0 }}>回收站</h3>
        </div>
        <div className="biophilic-card" style={{ padding: 64 }}>
          <div className="biophilic-empty">
            <EmptyPlantIcon />
            <h3 style={{ color: '#5B7B5E', fontSize: 20, marginBottom: 8 }}>回收站是空的</h3>
            <p style={{ color: '#8B7355', fontSize: 14 }}>
              被删除的照片和文件夹会暂时存放在这里
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: 'rgba(168,198,160,0.15)',
                border: '1px solid rgba(168,198,160,0.3)',
                borderRadius: '12px 12px 12px 4px',
                padding: '8px 14px',
                cursor: 'pointer',
                color: '#5B7B5E',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 200ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,198,160,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(168,198,160,0.15)'; }}
            >
              <ArrowLeftOutlined /> 返回
            </button>
          )}
          <h3 className="biophilic-title" style={{ fontSize: 20, margin: 0 }}>
            回收站
          </h3>
        </div>
        <p style={{ color: '#8B7355', fontSize: 13, marginTop: 4 }}>
          共 {images.length} 张照片，{folders.length} 个文件夹
        </p>
      </div>

      <div className="biophilic-card" style={{ padding: 20 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'images',
              label: (
                <span>
                  <PictureOutlined style={{ marginRight: 6 }} />
                  照片 ({images.length})
                </span>
              ),
              children: images.length === 0 ? (
                <div className="biophilic-empty" style={{ padding: 32 }}>
                  <p style={{ color: '#8B7355' }}>暂无已删除的照片</p>
                </div>
              ) : (
                <div>
                  {/* 图片批量操作栏 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <button
                      onClick={selectAllImages}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(168,198,160,0.3)',
                        background: 'rgba(168,198,160,0.12)',
                        color: '#5B7B5E',
                        cursor: 'pointer',
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {selectedImageIds.size === images.length ? <CloseSquareOutlined /> : <CheckSquareOutlined />}
                      {selectedImageIds.size === images.length ? '取消全选' : '全选'}
                    </button>
                    {selectedImageIds.size > 0 && (
                      <>
                        <button
                          onClick={handleBatchRestore}
                          className="biophilic-button biophilic-button-sm"
                        >
                          <UndoOutlined style={{ marginRight: 4 }} />
                          批量恢复 ({selectedImageIds.size})
                        </button>
                        <button
                          onClick={handleBatchDeletePermanent}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '10px',
                            border: '1px solid rgba(196,92,72,0.3)',
                            background: 'rgba(196,92,72,0.08)',
                            color: '#c45c48',
                            cursor: 'pointer',
                            fontSize: 13,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <DeleteOutlined style={{ marginRight: 4 }} />
                          批量删除 ({selectedImageIds.size})
                        </button>
                      </>
                    )}
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: 16,
                  }}>
                    {images.map(photo => {
                      const isSelected = selectedImageIds.has(photo.id);
                      return (
                        <div
                          key={photo.id}
                          className="biophilic-photo-card"
                          style={{
                            opacity: 0.85,
                            outline: isSelected ? '2px solid #7D9B76' : 'none',
                            outlineOffset: isSelected ? '2px' : '0',
                          }}
                        >
                          <div
                            style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px 16px 0 0', background: '#f0f0f0', cursor: 'pointer' }}
                            onClick={() => toggleImageSelection(photo.id)}
                          >
                            <AuthImage
                              src={imageAPI.getThumbnailUrl(photo.id, photo.userId)}
                              alt={photo.originalFilename}
                              style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block', filter: 'grayscale(30%)' }}
                            />
                            <div style={{
                              position: 'absolute',
                              top: 10, left: 10, zIndex: 10,
                            }} onClick={e => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onChange={() => toggleImageSelection(photo.id)}
                              />
                            </div>
                          </div>
                          <div style={{ padding: 12 }}>
                            <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#3D5A40', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {photo.originalFilename}
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                              <InfoRow icon={<FileImageOutlined />} text={formatSize(photo.fileSize)} />
                              <InfoRow icon={<CalendarOutlined />} text={`删除于: ${photo.movedToBinAt ? new Date(photo.movedToBinAt).toLocaleDateString() : '-'}`} />
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => handleRestoreImage(photo.id)}
                                className="biophilic-button biophilic-button-sm"
                                style={{ flex: 1 }}
                              >
                                <UndoOutlined style={{ marginRight: 4 }} />恢复
                              </button>
                              <button
                                onClick={() => handleDeleteImagePermanent(photo.id, photo.originalFilename)}
                                style={{
                                  flex: 1,
                                  padding: '8px 18px',
                                  borderRadius: '16px 16px 16px 4px',
                                  border: '1px solid rgba(196,92,72,0.3)',
                                  background: 'rgba(196,92,72,0.05)',
                                  color: '#c45c48',
                                  cursor: 'pointer',
                                  fontSize: 13,
                                  fontWeight: 500,
                                }}
                              >
                                <DeleteOutlined style={{ marginRight: 4 }} />永久删除
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ),
            },
            {
              key: 'folders',
              label: (
                <span>
                  <FolderOutlined style={{ marginRight: 6 }} />
                  文件夹 ({folders.length})
                </span>
              ),
              children: folders.length === 0 ? (
                <div className="biophilic-empty" style={{ padding: 32 }}>
                  <p style={{ color: '#8B7355' }}>暂无已删除的文件夹</p>
                </div>
              ) : (
                <div>
                  {/* 文件夹批量操作栏 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <button
                      onClick={selectAllFolders}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(168,198,160,0.3)',
                        background: 'rgba(168,198,160,0.12)',
                        color: '#5B7B5E',
                        cursor: 'pointer',
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {selectedFolderIds.size === folders.length ? <CloseSquareOutlined /> : <CheckSquareOutlined />}
                      {selectedFolderIds.size === folders.length ? '取消全选' : '全选'}
                    </button>
                    {selectedFolderIds.size > 0 && (
                      <>
                        <button
                          onClick={handleBatchRestore}
                          className="biophilic-button biophilic-button-sm"
                        >
                          <UndoOutlined style={{ marginRight: 4 }} />
                          批量恢复 ({selectedFolderIds.size})
                        </button>
                        <button
                          onClick={handleBatchDeletePermanent}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '10px',
                            border: '1px solid rgba(196,92,72,0.3)',
                            background: 'rgba(196,92,72,0.08)',
                            color: '#c45c48',
                            cursor: 'pointer',
                            fontSize: 13,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <DeleteOutlined style={{ marginRight: 4 }} />
                          批量删除 ({selectedFolderIds.size})
                        </button>
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {folders.map(folder => {
                      const isSelected = selectedFolderIds.has(folder.id);
                      return (
                        <div
                          key={folder.id}
                          className="biophilic-list-item"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            outline: isSelected ? '2px solid #7D9B76' : 'none',
                            outlineOffset: isSelected ? '2px' : '0',
                          }}
                          onClick={() => toggleFolderSelection(folder.id)}
                        >
                          <div onClick={e => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleFolderSelection(folder.id)}
                            />
                          </div>
                          <FolderOutlined style={{ color: '#A8C6A0', fontSize: 20 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ color: '#3D5A40', fontWeight: 500, fontSize: 14 }}>{folder.name}</div>
                            <div style={{ color: '#8B7355', fontSize: 12, marginTop: 2 }}>
                              删除于: {folder.movedToBinAt ? new Date(folder.movedToBinAt).toLocaleDateString() : '-'}
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRestoreFolder(folder.id); }}
                            className="biophilic-button biophilic-button-sm"
                          >
                            <UndoOutlined style={{ marginRight: 4 }} />恢复
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteFolderPermanent(folder.id, folder.name); }}
                            style={{
                              padding: '8px 18px',
                              borderRadius: '16px 16px 16px 4px',
                              border: '1px solid rgba(196,92,72,0.3)',
                              background: 'rgba(196,92,72,0.05)',
                              color: '#c45c48',
                              cursor: 'pointer',
                              fontSize: 13,
                              fontWeight: 500,
                            }}
                          >
                            <DeleteOutlined style={{ marginRight: 4 }} />永久删除
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6B5B4F' }}>
    <span style={{ color: '#7D9B76', fontSize: 12 }}>{icon}</span>
    <span>{text}</span>
  </div>
);

export default RecycleBin;
