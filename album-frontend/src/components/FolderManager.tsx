import React, { useState, useEffect } from 'react';
import { message, Modal, Input } from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  RightOutlined,
  DownOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { folderAPI, imageAPI } from '../services/api';

interface FolderItem {
  id: number;
  userId: number;
  parentId: number;
  name: string;
  coverImageId?: string;
  isInRecycleBin: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FolderManagerProps {
  userId: number;
  onFolderSelect?: (folderId: number | null) => void;
  onBack?: () => void;
}

const EmptyPlantIcon: React.FC = () => (
  <svg viewBox="0 0 120 120" style={{ width: 100, height: 100, margin: '0 auto 20px', opacity: 0.35 }}>
    <defs>
      <linearGradient id="fLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A8C6A0" />
        <stop offset="100%" stopColor="#7D9B76" />
      </linearGradient>
    </defs>
    <path d="M60 100 L55 110 L65 110 Z" fill="#8B7355" opacity="0.6"/>
    <path d="M60 100 Q60 70 60 40" stroke="#7D9B76" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    <path d="M60 75 Q40 65 30 50 Q45 60 60 70" fill="url(#fLeafGrad)" opacity="0.6"/>
    <path d="M60 65 Q80 55 90 40 Q75 50 60 60" fill="url(#fLeafGrad)" opacity="0.6"/>
    <ellipse cx="60" cy="35" rx="14" ry="20" fill="url(#fLeafGrad)" opacity="0.5"/>
  </svg>
);

const FolderManager: React.FC<FolderManagerProps> = ({ userId, onFolderSelect, onBack }) => {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set([0]));
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createParentId, setCreateParentId] = useState<number>(0);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameFolder, setRenameFolder] = useState<FolderItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [folderImages, setFolderImages] = useState<Record<number, number>>({});

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const response = await folderAPI.getAll(userId, null, 'all');
      const allFolders: FolderItem[] = response.data.data || [];
      setFolders(allFolders.filter(f => !f.isInRecycleBin));

      // 统计每个文件夹的图片数量
      const counts: Record<number, number> = {};
      for (const folder of allFolders) {
        if (!folder.isInRecycleBin) {
          try {
            const imgRes = await imageAPI.getAll(userId, folder.id);
            counts[folder.id] = (imgRes.data.data || []).length;
          } catch {
            counts[folder.id] = 0;
          }
        }
      }
      setFolderImages(counts);
    } catch (error) {
      message.error('获取文件夹失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, [userId]);

  const toggleExpand = (folderId: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!newFolderName.trim()) {
      message.warning('请输入文件夹名称');
      return;
    }
    try {
      await folderAPI.create(userId, createParentId || null, newFolderName.trim());
      message.success('文件夹创建成功');
      setNewFolderName('');
      setCreateModalVisible(false);
      fetchFolders();
    } catch (error) {
      message.error('创建失败');
    }
  };

  const handleRename = async () => {
    if (!renameValue.trim() || !renameFolder) return;
    try {
      await folderAPI.rename(renameFolder.id, userId, renameValue.trim());
      message.success('重命名成功');
      setRenameModalVisible(false);
      fetchFolders();
    } catch (error) {
      message.error('重命名失败');
    }
  };

  const handleDelete = async (folder: FolderItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `将 "${folder.name}" 移入回收站，其中的照片也会被移入回收站。`,
      okText: '删除',
      cancelText: '取消',
      onOk: async () => {
        try {
          await folderAPI.delete(folder.id, userId);
          message.success('已移入回收站');
          fetchFolders();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const openCreateModal = (parentId: number) => {
    setCreateParentId(parentId);
    setNewFolderName('');
    setCreateModalVisible(true);
  };

  const openRenameModal = (folder: FolderItem) => {
    setRenameFolder(folder);
    setRenameValue(folder.name);
    setRenameModalVisible(true);
  };

  const getChildren = (parentId: number) =>
    folders.filter(f => f.parentId === parentId && !f.isInRecycleBin);

  const renderFolderTree = (parentId: number, depth: number = 0) => {
    const children = getChildren(parentId);
    if (children.length === 0 && parentId !== 0) return null;

    return (
      <div style={{ marginLeft: depth > 0 ? 24 : 0 }}>
        {children.map(folder => {
          const hasChildren = getChildren(folder.id).length > 0;
          const isExpanded = expandedIds.has(folder.id);
          const imageCount = folderImages[folder.id] || 0;

          return (
            <div key={folder.id}>
              <div
                className="biophilic-list-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 16px',
                }}
              >
                {/* 展开/折叠 */}
                {hasChildren ? (
                  <span
                    onClick={() => toggleExpand(folder.id)}
                    style={{
                      cursor: 'pointer',
                      color: '#7D9B76',
                      fontSize: 12,
                      width: 16,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {isExpanded ? <DownOutlined /> : <RightOutlined />}
                  </span>
                ) : (
                  <span style={{ width: 16 }} />
                )}

                {/* 文件夹图标 */}
                <FolderOutlined style={{ color: '#A8C6A0', fontSize: 18 }} />

                {/* 名称 */}
                <span
                  style={{
                    flex: 1,
                    color: '#3D5A40',
                    fontWeight: 500,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                  onClick={() => onFolderSelect?.(folder.id)}
                >
                  {folder.name}
                </span>

                {/* 图片数量 */}
                {imageCount > 0 && (
                  <span style={{ color: '#8B7355', fontSize: 12 }}>
                    {imageCount} 张
                  </span>
                )}

                {/* 操作 */}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => openCreateModal(folder.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#7D9B76',
                      padding: 4,
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                    title="新建子文件夹"
                  >
                    <PlusOutlined />
                  </button>
                  <button
                    onClick={() => openRenameModal(folder)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#7D9B76',
                      padding: 4,
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                    title="重命名"
                  >
                    <EditOutlined />
                  </button>
                  <button
                    onClick={() => handleDelete(folder)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#c45c48',
                      padding: 4,
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                    title="删除"
                  >
                    <DeleteOutlined />
                  </button>
                </div>
              </div>

              {/* 子文件夹 */}
              {isExpanded && renderFolderTree(folder.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="biophilic-card" style={{ padding: 48, textAlign: 'center' }}>
        <div className="animate-breathe">
          <EmptyPlantIcon />
        </div>
        <p style={{ color: '#7D9B76' }}>正在加载文件夹...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
            文件夹管理
          </h3>
        </div>
        <button className="biophilic-button biophilic-button-sm" onClick={() => openCreateModal(0)}>
          <PlusOutlined style={{ marginRight: 4 }} />
          新建文件夹
        </button>
      </div>

      <div className="biophilic-card" style={{ padding: 20 }}>
        {folders.length === 0 ? (
          <div className="biophilic-empty" style={{ padding: 48 }}>
            <EmptyPlantIcon />
            <p style={{ color: '#8B7355' }}>还没有文件夹</p>
            <button className="biophilic-button" style={{ marginTop: 12 }} onClick={() => openCreateModal(0)}>
              <PlusOutlined style={{ marginRight: 6 }} />
              创建第一个文件夹
            </button>
          </div>
        ) : (
          <>
            {/* 根目录 */}
            <div
              className="biophilic-list-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 16px',
                marginBottom: 8,
              }}
              onClick={() => onFolderSelect?.(null)}
            >
              <FolderOpenOutlined style={{ color: '#7D9B76', fontSize: 18 }} />
              <span style={{ flex: 1, color: '#3D5A40', fontWeight: 600, fontSize: 14 }}>
                全部照片
              </span>
            </div>
            {renderFolderTree(0)}
          </>
        )}
      </div>

      {/* 创建模态框 */}
      <Modal
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={handleCreate}
        title="新建文件夹"
        className="biophilic-modal"
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #7D9B76 0%, #5D7A56 100%)', border: 'none' } }}
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ color: '#6B5B4F', fontSize: 14, marginBottom: 12 }}>
            {createParentId ? '在选中文件夹下创建子文件夹' : '在根目录创建文件夹'}
          </p>
          <Input
            placeholder="请输入文件夹名称"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onPressEnter={handleCreate}
            style={{ borderRadius: '12px 12px 12px 4px' }}
            maxLength={50}
          />
        </div>
      </Modal>

      {/* 重命名模态框 */}
      <Modal
        open={renameModalVisible}
        onCancel={() => setRenameModalVisible(false)}
        onOk={handleRename}
        title="重命名文件夹"
        className="biophilic-modal"
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #7D9B76 0%, #5D7A56 100%)', border: 'none' } }}
      >
        <div style={{ padding: '8px 0' }}>
          <Input
            placeholder="新名称"
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onPressEnter={handleRename}
            style={{ borderRadius: '12px 12px 12px 4px' }}
            maxLength={50}
          />
        </div>
      </Modal>
    </div>
  );
};

export default FolderManager;
