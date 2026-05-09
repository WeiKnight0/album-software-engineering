import React, { useState, useEffect } from 'react';
import { message, Modal, Checkbox, Input, Pagination } from 'antd';
import {
  DownloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  FolderOpenOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  FileImageOutlined,
  CloudUploadOutlined,
  FolderOutlined,
  DeleteRowOutlined,
  PlusOutlined,
  EditOutlined
} from '@ant-design/icons';
import { imageAPI, folderAPI, downloadTaskAPI } from '../services/api';

interface ImageItem {
  id: string;
  userId: number;
  folderId: number;
  originalFilename: string;
  storedFilename: string;
  thumbnailFilename?: string;
  fileSize: number;
  mimeType: string;
  uploadTime: string;
  isInRecycleBin: boolean;
  movedToBinAt?: string;
  originalFolderId?: number;
  createdAt: string;
  updatedAt: string;
}

interface FolderItem {
  id: number;
  userId: number;
  parentId: number;
  name: string;
  coverImageId?: string;
  isInRecycleBin: boolean;
}

interface PhotoGalleryProps {
  userId: number;
  folderId: number | null;
  refreshKey: number;
  showTitle?: boolean;
  onBack?: () => void;
  onNavigateToTransfer?: () => void;
  onNavigateToRecycle?: () => void;
}

const EmptyPlantIcon: React.FC = () => (
  <svg viewBox="0 0 120 120" style={{ width: 120, height: 120, margin: '0 auto 24px', opacity: 0.4 }}>
    <defs>
      <linearGradient id="emptyLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A8C6A0" />
        <stop offset="100%" stopColor="#7D9B76" />
      </linearGradient>
    </defs>
    <path d="M40 90 L45 110 L75 110 L80 90 Z" fill="#8B7355" opacity="0.6"/>
    <ellipse cx="60" cy="90" rx="20" ry="5" fill="#6B5B4F" opacity="0.4"/>
    <path d="M60 90 Q60 70 60 50" stroke="#7D9B76" strokeWidth="3" fill="none" strokeLinecap="round"/>
    <path d="M60 75 Q45 65 35 55" stroke="#7D9B76" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <path d="M60 65 Q75 55 85 45" stroke="#7D9B76" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <ellipse cx="35" cy="55" rx="10" ry="6" fill="url(#emptyLeafGrad)" opacity="0.5" transform="rotate(-30 35 55)"/>
    <ellipse cx="85" cy="45" rx="10" ry="6" fill="url(#emptyLeafGrad)" opacity="0.5" transform="rotate(30 85 45)"/>
    <ellipse cx="60" cy="35" rx="12" ry="18" fill="url(#emptyLeafGrad)" opacity="0.4"/>
  </svg>
);

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ userId, folderId, refreshKey, showTitle = true, onBack, onNavigateToTransfer, onNavigateToRecycle }) => {
  const [photos, setPhotos] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<ImageItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolderName, setCurrentFolderName] = useState<string>('全部照片');
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<number | null>(folderId);
  const [createFolderModalVisible, setCreateFolderModalVisible] = useState(false);
  const [createFolderName, setCreateFolderName] = useState('');
  const [renameFolderModalVisible, setRenameFolderModalVisible] = useState(false);
  const [renameFolderTarget, setRenameFolderTarget] = useState<FolderItem | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');
  const [isManaging, setIsManaging] = useState(false);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'large' | 'medium' | 'small' | 'list'>('medium');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(40);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const response = await imageAPI.getAll(userId, activeFolderId);
      setPhotos(response.data.data || []);
    } catch (error) {
      message.error('获取照片失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const response = await folderAPI.getAll(userId);
      setFolders(response.data.data || []);
    } catch (error) {
      console.error('获取文件夹失败:', error);
    }
  };

  const fetchFolderName = async () => {
    if (activeFolderId) {
      try {
        const response = await folderAPI.getById(activeFolderId, userId);
        setCurrentFolderName(response.data.data?.name || '文件夹');
      } catch {
        setCurrentFolderName('文件夹');
      }
    } else {
      setCurrentFolderName('全部照片');
    }
  };

  const buildFolderPath = (targetId: number | null, allFolders: FolderItem[]): FolderItem[] => {
    if (!targetId) return [];
    const path: FolderItem[] = [];
    let currentId: number | null = targetId;
    const folderMap = new Map(allFolders.map(f => [f.id, f]));
    const visited = new Set<number>();
    while (currentId !== null && currentId !== undefined && currentId !== 0) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const folder = folderMap.get(currentId);
      if (!folder) break;
      path.unshift(folder);
      currentId = folder.parentId === 0 ? null : folder.parentId;
    }
    return path;
  };

  useEffect(() => {
    setActiveFolderId(folderId);
  }, [folderId]);

  useEffect(() => {
    fetchPhotos();
    fetchFolders();
    fetchFolderName();
    setSelectedIds(new Set());
    setSelectedFolderIds(new Set());
    setIsManaging(false);
    setCurrentPage(1);
  }, [userId, activeFolderId, refreshKey]);

  const handlePreview = (photo: ImageItem) => {
    setPreviewImage(imageAPI.getDownloadUrl(photo.id, photo.userId));
    setPreviewPhoto(photo);
    setPreviewVisible(true);
  };

  const handleDownload = async (photo: ImageItem) => {
    try {
      // 1. 创建下载任务记录
      const taskRes = await downloadTaskAPI.createTask(userId, photo.originalFilename, [{
        imageId: photo.id,
        fileName: photo.originalFilename,
        fileSize: photo.fileSize,
      }]);
      const taskId = taskRes.data.data.taskId;

      // 2. 下载文件
      const token = localStorage.getItem('token');
      const response = await fetch(imageAPI.getDownloadUrl(photo.id, userId), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = photo.originalFilename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // 3. 标记下载完成
      await downloadTaskAPI.markComplete(taskId, photo.id, userId);
      message.success('开始下载');
    } catch (error) {
      message.error('下载失败');
    }
  };

  const handleDelete = async (photoId: string) => {
    try {
      await imageAPI.delete(photoId, userId);
      message.success('照片已移至回收站');
      fetchPhotos();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const toggleSelection = (photoId: string) => {
    if (!isManaging) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const toggleFolderSelection = (folderId: number) => {
    if (!isManaging) return;
    setSelectedFolderIds(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const totalSelectedCount = selectedIds.size + selectedFolderIds.size;
  const hasSelectedPhotos = selectedIds.size > 0;
  const singleSelectedFolder = selectedFolderIds.size === 1 && selectedIds.size === 0
    ? folders.find(f => selectedFolderIds.has(f.id))
    : null;

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0 && selectedFolderIds.size === 0) return;
    try {
      if (selectedIds.size > 0) {
        await imageAPI.batchDelete(Array.from(selectedIds), userId, false);
        message.success(`${selectedIds.size} 张照片已移至回收站`);
      }
      if (selectedFolderIds.size > 0) {
        for (const folderId of selectedFolderIds) {
          await folderAPI.delete(folderId, userId);
        }
        message.success(`${selectedFolderIds.size} 个文件夹已移至回收站`);
      }
      setSelectedIds(new Set());
      setSelectedFolderIds(new Set());
      fetchPhotos();
      fetchFolders();
      if (activeFolderId && selectedFolderIds.has(activeFolderId)) {
        setActiveFolderId(null);
      }
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  const handleBatchMove = async (targetFolderId: number) => {
    if (selectedIds.size === 0) return;
    try {
      await imageAPI.batchMove(Array.from(selectedIds), userId, targetFolderId);
      message.success('移动成功');
      setSelectedIds(new Set());
      setMoveModalVisible(false);
      fetchPhotos();
    } catch (error) {
      message.error('移动失败');
    }
  };

  const handleCreateFolderInModal = async () => {
    if (!newFolderName.trim()) {
      message.warning('请输入文件夹名称');
      return;
    }
    try {
      setCreatingFolder(true);
      await folderAPI.create(userId, activeFolderId, newFolderName.trim());
      message.success('文件夹创建成功');
      setNewFolderName('');
      fetchFolders();
    } catch (error: any) {
      const msg = error.response?.data?.message || '创建失败';
      message.error(msg);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!createFolderName.trim()) {
      message.warning('请输入文件夹名称');
      return;
    }
    try {
      await folderAPI.create(userId, activeFolderId, createFolderName.trim());
      message.success('文件夹创建成功');
      setCreateFolderName('');
      setCreateFolderModalVisible(false);
      fetchFolders();
    } catch (error: any) {
      const msg = error.response?.data?.message || '创建失败';
      message.error(msg);
    }
  };

  const handleRenameFolder = async () => {
    if (!renameFolderValue.trim() || !renameFolderTarget) return;
    try {
      await folderAPI.rename(renameFolderTarget.id, userId, renameFolderValue.trim());
      message.success('重命名成功');
      setRenameFolderModalVisible(false);
      fetchFolders();
      fetchFolderName();
    } catch (error: any) {
      const msg = error.response?.data?.message || '重命名失败';
      message.error(msg);
    }
  };

  const openRenameFolderModal = (folder: FolderItem) => {
    setRenameFolderTarget(folder);
    setRenameFolderValue(folder.name);
    setRenameFolderModalVisible(true);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <div className="biophilic-card" style={{ padding: 64, textAlign: 'center' }}>
        <div className="animate-breathe">
          <EmptyPlantIcon />
        </div>
        <p style={{ color: '#7D9B76' }}>正在加载你的自然记忆...</p>
      </div>
    );
  }

  return (
    <div>
      {/* 工具栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
              ← 收起
            </button>
          )}
          {showTitle && (
            <>
              <h3 className="biophilic-title" style={{ fontSize: 20, margin: 0 }}>
                {currentFolderName}
              </h3>
              <span style={{ color: '#8B7355', fontSize: 14 }}>
                共 {photos.length} 张
              </span>
            </>
          )}
          {/* 路径面包屑与标题同处一行 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveFolderId(null)}
              style={{
                background: activeFolderId === null ? 'var(--gradient-leaf)' : 'rgba(168,198,160,0.12)',
                border: 'none',
                borderRadius: '10px 10px 10px 2px',
                padding: '3px 10px',
                cursor: 'pointer',
                color: activeFolderId === null ? 'white' : '#5B7B5E',
                fontSize: 12,
                fontWeight: 500,
                transition: 'all 200ms ease',
              }}
            >
              全部照片
            </button>
            {buildFolderPath(activeFolderId, folders).map((folder, index, arr) => (
              <React.Fragment key={folder.id}>
                <span style={{ color: '#A8C6A0', fontSize: 11 }}>/</span>
                <button
                  onClick={() => setActiveFolderId(folder.id)}
                  style={{
                    background: index === arr.length - 1 ? 'var(--gradient-leaf)' : 'rgba(168,198,160,0.12)',
                    border: 'none',
                    borderRadius: '10px 10px 10px 2px',
                    padding: '3px 10px',
                    cursor: 'pointer',
                    color: index === arr.length - 1 ? 'white' : '#5B7B5E',
                    fontSize: 12,
                    fontWeight: 500,
                    transition: 'all 200ms ease',
                  }}
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* 视图切换（仅展开模式下显示） */}
        {onBack && photos.length > 0 && (
          <button
            onClick={() => {
              const modes: Array<'large' | 'medium' | 'small' | 'list'> = ['large', 'medium', 'small', 'list'];
              const nextIndex = (modes.indexOf(viewMode) + 1) % modes.length;
              setViewMode(modes[nextIndex]);
            }}
            title="切换视图"
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              border: '1px solid rgba(168,198,160,0.35)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              background: 'rgba(168,198,160,0.12)',
              color: '#5B7B5E',
              marginLeft: 'auto',
              marginRight: 12,
              transition: 'all 150ms ease',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,198,160,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(168,198,160,0.12)'; }}
          >
            <span style={{ fontSize: 14 }}>
              {viewMode === 'large' ? '▣' : viewMode === 'medium' ? '⊞' : viewMode === 'small' ? '▪' : '☰'}
            </span>
            <span>
              {viewMode === 'large' ? '大图' : viewMode === 'medium' ? '中图' : viewMode === 'small' ? '小图' : '列表'}
            </span>
          </button>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!isManaging ? (
            <>
              {onNavigateToTransfer && (
                <button
                  className="biophilic-button biophilic-button-sm"
                  onClick={onNavigateToTransfer}
                >
                  <CloudUploadOutlined style={{ marginRight: 4 }} />
                  上传
                </button>
              )}
              {(onNavigateToTransfer || onNavigateToRecycle) && (
                <button
                  className="biophilic-button biophilic-button-sm secondary"
                  onClick={() => setIsManaging(true)}
                >
                  <EditOutlined style={{ marginRight: 4 }} />
                  管理
                </button>
              )}
              {onNavigateToRecycle && (
                <button
                  className="biophilic-button biophilic-button-sm secondary"
                  onClick={onNavigateToRecycle}
                  style={{ borderColor: 'rgba(196,92,72,0.3)', color: '#c45c48' }}
                >
                  <DeleteRowOutlined style={{ marginRight: 4 }} />
                  回收站
                </button>
              )}
            </>
          ) : (
            <>
              {totalSelectedCount === 0 && (
                <button
                  className="biophilic-button biophilic-button-sm"
                  onClick={() => setCreateFolderModalVisible(true)}
                >
                  <PlusOutlined style={{ marginRight: 4 }} />
                  新建文件夹
                </button>
              )}
              {singleSelectedFolder && (
                <button
                  className="biophilic-button biophilic-button-sm"
                  onClick={() => openRenameFolderModal(singleSelectedFolder)}
                >
                  <EditOutlined style={{ marginRight: 4 }} />
                  重命名
                </button>
              )}
              {hasSelectedPhotos && (
                <button
                  className="biophilic-button biophilic-button-sm"
                  onClick={() => setMoveModalVisible(true)}
                >
                  <FolderOpenOutlined style={{ marginRight: 4 }} />
                  移动到
                </button>
              )}
              {totalSelectedCount > 0 && (
                <button
                  className="biophilic-button biophilic-button-sm"
                  onClick={handleBatchDelete}
                  style={{ background: 'linear-gradient(135deg, #c45c48 0%, #a04030 100%)' }}
                >
                  <DeleteOutlined style={{ marginRight: 4 }} />
                  删除 ({totalSelectedCount})
                </button>
              )}
              <button
                className="biophilic-button biophilic-button-sm secondary"
                onClick={() => {
                  setIsManaging(false);
                  setSelectedIds(new Set());
                  setSelectedFolderIds(new Set());
                }}
              >
                退出管理
              </button>
            </>
          )}
        </div>
      </div>

      {/* 子文件夹区域 */}
      {(() => {
        const childFolders = folders.filter(f => {
          if (activeFolderId === null) {
            return f.parentId === null || f.parentId === 0;
          }
          return f.parentId === activeFolderId;
        });
        if (childFolders.length === 0) return null;
        return (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {childFolders.map(folder => {
                const isFolderSelected = selectedFolderIds.has(folder.id);
                return (
                  <div
                    key={folder.id}
                    className="biophilic-list-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '14px 16px',
                      position: 'relative',
                      outline: isManaging && isFolderSelected ? '2px solid #7D9B76' : 'none',
                      outlineOffset: isManaging && isFolderSelected ? '2px' : '0',
                    }}
                    onClick={() => isManaging ? toggleFolderSelection(folder.id) : setActiveFolderId(folder.id)}
                  >
                    {isManaging && (
                      <div onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={isFolderSelected}
                          onChange={() => toggleFolderSelection(folder.id)}
                        />
                      </div>
                    )}
                    <FolderOutlined style={{ fontSize: 28, color: '#A8C6A0', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0, cursor: isManaging ? 'pointer' : undefined }}>
                      <div style={{ color: '#3D5A40', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {folder.name}
                      </div>
                      {!isManaging && (
                        <div style={{ color: '#8B7355', fontSize: 12, marginTop: 2 }}>
                          点击进入
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {(() => {
        const displayPhotos = photos.slice((currentPage - 1) * pageSize, currentPage * pageSize);
        return photos.length === 0 ? (
        <div className="biophilic-card" style={{ padding: 64 }}>
          <div className="biophilic-empty">
            <EmptyPlantIcon />
            <h3 style={{ color: '#5B7B5E', fontSize: 20, marginBottom: 8, fontWeight: 500 }}>
              还没有照片
            </h3>
            <p style={{ color: '#8B7355', fontSize: 14, marginBottom: 16 }}>
              {activeFolderId ? '该文件夹暂无照片' : '上传你的第一张照片，让回忆如植物般生长'}
            </p>

          </div>
        </div>
      ) : viewMode === 'list' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {displayPhotos.map(photo => {
              const isSelected = selectedIds.has(photo.id);
              return (
                <div
                  key={photo.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    background: 'white',
                    borderRadius: '12px 12px 12px 4px',
                    border: isSelected ? '2px solid #7D9B76' : '1px solid rgba(168,198,160,0.2)',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                  onClick={() => isManaging ? toggleSelection(photo.id) : handlePreview(photo)}
                >
                  {isManaging && (
                    <div onClick={e => e.stopPropagation()}>
                      <Checkbox checked={isSelected} onChange={() => toggleSelection(photo.id)} />
                    </div>
                  )}
                  <img
                    src={imageAPI.getThumbnailUrl(photo.id, photo.userId)}
                    alt={photo.originalFilename}
                    loading="lazy"
                    style={{
                      width: 56,
                      height: 56,
                      objectFit: 'cover',
                      borderRadius: 8,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, fontSize: 14, color: '#3D5A40' }}>
                    {photo.originalFilename}
                  </div>
                  <div style={{ color: '#8B7355', fontSize: 12, minWidth: 90 }}>
                    {new Date(photo.uploadTime).toLocaleDateString()}
                  </div>
                  <div style={{ color: '#8B7355', fontSize: 12, minWidth: 70 }}>
                    {formatSize(photo.fileSize)}
                  </div>
                  {!isManaging && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <ActionButton icon={<EyeOutlined />} onClick={() => handlePreview(photo)} />
                      <ActionButton icon={<DownloadOutlined />} onClick={() => handleDownload(photo)} />
                      <ActionButton icon={<DeleteOutlined />} onClick={() => handleDelete(photo.id)} danger />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: viewMode === 'large'
              ? 'repeat(auto-fill, minmax(300px, 1fr))'
              : viewMode === 'small'
                ? 'repeat(auto-fill, minmax(120px, 1fr))'
                : 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: viewMode === 'small' ? 12 : 20,
          }}>
            {displayPhotos.map(photo => {
              const isSelected = selectedIds.has(photo.id);
              const imgHeight = viewMode === 'large' ? 240 : viewMode === 'small' ? 100 : 160;
              const showInfo = viewMode !== 'small';
              return (
                <div
                  key={photo.id}
                  className="biophilic-photo-card"
                  style={{
                    position: 'relative',
                    outline: isSelected ? '2px solid #7D9B76' : 'none',
                    outlineOffset: isSelected ? '2px' : '0',
                  }}
                >
                  {/* 选择框（仅管理模式） */}
                  {isManaging && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        zIndex: 10,
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleSelection(photo.id)}
                      />
                    </div>
                  )}

                  {/* 图片区域 */}
                  <div
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      borderRadius: viewMode === 'small' ? '12px' : '16px 16px 0 0',
                      background: '#f0f0f0',
                      cursor: 'pointer',
                    }}
                    onClick={() => isManaging ? toggleSelection(photo.id) : handlePreview(photo)}
                  >
                    <img
                      src={imageAPI.getThumbnailUrl(photo.id, photo.userId)}
                      alt={photo.originalFilename}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: imgHeight,
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    {/* 悬停遮罩（仅非管理模式） */}
                    {!isManaging && (
                      <div className="photo-hover-overlay" style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'linear-gradient(to top, rgba(61,90,64,0.75) 0%, transparent 50%)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        padding: viewMode === 'small' ? 8 : 12,
                        gap: viewMode === 'small' ? 6 : 10,
                      }}>
                        <ActionButton icon={<EyeOutlined />} onClick={() => handlePreview(photo)} />
                        <ActionButton icon={<DownloadOutlined />} onClick={() => handleDownload(photo)} />
                        <ActionButton icon={<DeleteOutlined />} onClick={() => handleDelete(photo.id)} danger />
                      </div>
                    )}
                  </div>

                  {/* 信息 */}
                  {showInfo && (
                    <div style={{ padding: viewMode === 'large' ? 16 : 14 }}>
                      <h4 style={{
                        margin: 0,
                        fontSize: 14,
                        color: '#3D5A40',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {photo.originalFilename}
                      </h4>
                    </div>
                  )}
                  {!showInfo && (
                    <div style={{ padding: '8px 10px' }}>
                      <h4 style={{
                        margin: 0,
                        fontSize: 12,
                        color: '#3D5A40',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                      }}>
                        {photo.originalFilename}
                      </h4>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* 分页 */}
      {photos.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={photos.length}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger
            pageSizeOptions={['20', '40', '60', '80', '100']}
            onShowSizeChange={(_current, size) => { setPageSize(size); setCurrentPage(1); }}
            style={{ color: '#5B7B5E' }}
          />
        </div>
      )}

      {/* 预览模态框 */}
      <Modal
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={900}
        className="biophilic-modal"
        title={previewPhoto?.originalFilename}
      >
        <div style={{ textAlign: 'center' }}>
          <img
            src={previewImage}
            alt={previewPhoto?.originalFilename}
            style={{
              maxWidth: '100%',
              maxHeight: '60vh',
              borderRadius: 12,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}
          />
          {previewPhoto && (
            <div style={{
              marginTop: 20,
              padding: 16,
              background: 'rgba(168, 198, 160, 0.1)',
              borderRadius: 12,
              textAlign: 'left',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                <InfoRow icon={<CalendarOutlined />} text={`上传时间: ${new Date(previewPhoto.uploadTime).toLocaleString()}`} />
                <InfoRow icon={<ClockCircleOutlined />} text={`大小: ${formatSize(previewPhoto.fileSize)}`} />
                <InfoRow icon={<FileImageOutlined />} text={`类型: ${previewPhoto.mimeType}`} />
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 移动文件夹模态框 */}
      <Modal
        open={moveModalVisible}
        onCancel={() => setMoveModalVisible(false)}
        footer={null}
        title="选择目标文件夹"
        className="biophilic-modal"
      >
        <div style={{ padding: '8px 0' }}>
          <div
            className="biophilic-list-item"
            onClick={() => handleBatchMove(0)}
          >
            <FolderOpenOutlined style={{ color: '#7D9B76', marginRight: 10 }} />
            <span style={{ color: '#3D5A40' }}>根目录</span>
          </div>
          {folders.map(folder => (
            <div
              key={folder.id}
              className="biophilic-list-item"
              onClick={() => handleBatchMove(folder.id)}
            >
              <FolderOpenOutlined style={{ color: '#7D9B76', marginRight: 10 }} />
              <span style={{ color: '#3D5A40' }}>{folder.name}</span>
            </div>
          ))}

          {/* 新建文件夹 */}
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(168,198,160,0.08)', borderRadius: '14px 14px 14px 4px', border: '1px solid rgba(168,198,160,0.15)' }}>
            <div style={{ fontSize: 13, color: '#6B5B4F', marginBottom: 8, fontWeight: 500 }}>
              <PlusOutlined style={{ marginRight: 4, color: '#7D9B76' }} />
              新建文件夹
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateFolderInModal(); }}
                placeholder="输入文件夹名称"
                style={{
                  flex: 1,
                  padding: '8px 14px',
                  borderRadius: '12px 12px 12px 4px',
                  border: '1px solid rgba(168,198,160,0.4)',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#3D5A40',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
              <button
                onClick={handleCreateFolderInModal}
                disabled={creatingFolder || !newFolderName.trim()}
                className="biophilic-button biophilic-button-sm"
                style={{ opacity: creatingFolder || !newFolderName.trim() ? 0.6 : 1 }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* 新建文件夹模态框 */}
      <Modal
        open={createFolderModalVisible}
        onCancel={() => { setCreateFolderModalVisible(false); setCreateFolderName(''); }}
        onOk={handleCreateFolder}
        title="新建文件夹"
        className="biophilic-modal"
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #7D9B76 0%, #5D7A56 100%)', border: 'none' } }}
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ color: '#6B5B4F', fontSize: 14, marginBottom: 12 }}>
            {activeFolderId ? `在 "${currentFolderName}" 下创建子文件夹` : '在根目录创建文件夹'}
          </p>
          <Input
            placeholder="请输入文件夹名称"
            value={createFolderName}
            onChange={e => setCreateFolderName(e.target.value)}
            onPressEnter={handleCreateFolder}
            style={{ borderRadius: '12px 12px 12px 4px' }}
            maxLength={50}
          />
        </div>
      </Modal>

      {/* 重命名文件夹模态框 */}
      <Modal
        open={renameFolderModalVisible}
        onCancel={() => setRenameFolderModalVisible(false)}
        onOk={handleRenameFolder}
        title="重命名文件夹"
        className="biophilic-modal"
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #7D9B76 0%, #5D7A56 100%)', border: 'none' } }}
      >
        <div style={{ padding: '8px 0' }}>
          <Input
            placeholder="新名称"
            value={renameFolderValue}
            onChange={e => setRenameFolderValue(e.target.value)}
            onPressEnter={handleRenameFolder}
            style={{ borderRadius: '12px 12px 12px 4px' }}
            maxLength={50}
          />
        </div>
      </Modal>
    </div>
  );
};

const ActionButton: React.FC<{ icon: React.ReactNode; onClick: () => void; danger?: boolean }> = ({ icon, onClick, danger }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    style={{
      width: 36,
      height: 36,
      borderRadius: '50%',
      border: 'none',
      background: 'rgba(255,255,255,0.92)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: danger ? '#c45c48' : '#5B7B5E',
      fontSize: 14,
      transition: 'all 150ms ease',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'scale(1.1)';
      e.currentTarget.style.background = 'white';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.background = 'rgba(255,255,255,0.92)';
    }}
  >
    {icon}
  </button>
);

const InfoRow: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6B5B4F' }}>
    <span style={{ color: '#7D9B76', fontSize: 12 }}>{icon}</span>
    <span>{text}</span>
  </div>
);

export default PhotoGallery;
