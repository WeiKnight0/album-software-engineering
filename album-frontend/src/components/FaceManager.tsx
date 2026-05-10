import React, { useState, useEffect } from 'react';
import { message, Modal, Input, Empty } from 'antd';
import {
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  MergeCellsOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { faceAPI, imageAPI } from '../services/api';
import AuthImage from './AuthImage';

interface FaceItem {
  face_id: number;
  face_name: string | null;
  cover_path: string | null;
  last_seen_at: string;
  created_at: string;
}

interface FaceManagerProps {
  userId: number;
  embedded?: boolean;
  onBack?: () => void;
}

const EmptyPlantIcon: React.FC = () => (
  <svg viewBox="0 0 120 120" style={{ width: 100, height: 100, margin: '0 auto 20px', opacity: 0.35 }}>
    <defs>
      <linearGradient id="faceLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A8C6A0" />
        <stop offset="100%" stopColor="#7D9B76" />
      </linearGradient>
    </defs>
    <circle cx="60" cy="50" r="28" fill="none" stroke="#7D9B76" strokeWidth="2" opacity="0.4"/>
    <path d="M60 30 Q75 35 80 50 Q75 65 60 70 Q45 65 40 50 Q45 35 60 30" fill="url(#faceLeafGrad)" opacity="0.3"/>
    <path d="M60 40 L60 60 M50 50 L70 50" stroke="#7D9B76" strokeWidth="1.5" opacity="0.5" strokeLinecap="round"/>
    <path d="M60 78 Q55 95 50 105 M60 78 Q65 95 70 105" stroke="#7D9B76" strokeWidth="2" fill="none" opacity="0.4" strokeLinecap="round"/>
    <ellipse cx="50" cy="105" rx="8" ry="4" fill="#A8C6A0" opacity="0.4"/>
    <ellipse cx="70" cy="105" rx="8" ry="4" fill="#A8C6A0" opacity="0.4"/>
  </svg>
);

const FaceManager: React.FC<FaceManagerProps> = ({ userId, embedded, onBack }) => {
  const [faces, setFaces] = useState<FaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFaceIds, setSelectedFaceIds] = useState<number[]>([]);
  const [detailFace, setDetailFace] = useState<FaceItem | null>(null);
  const [detailImages, setDetailImages] = useState<any[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameFace, setRenameFace] = useState<FaceItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [mergeConfirmVisible, setMergeConfirmVisible] = useState(false);
  const [mergeCandidates, setMergeCandidates] = useState<string[]>([]);
  const [mergeSelectedName, setMergeSelectedName] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<any>(null);
  const [coverUrls, setCoverUrls] = useState<Record<number, string>>({});
  const [viewMode, setViewMode] = useState<'large' | 'medium' | 'small'>('medium');
  const [detailViewMode, setDetailViewMode] = useState<'large' | 'medium' | 'small'>('medium');

  const fetchFaces = async () => {
    try {
      setLoading(true);
      const response = await faceAPI.list(userId);
      setFaces(response.data.data || []);
    } catch (error) {
      message.error('获取人物列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaces();
  }, [userId]);

  useEffect(() => {
    let active = true;
    const urls: Record<number, string> = {};
    Promise.all(faces.filter(face => face.cover_path).map(async face => {
      const url = await faceAPI.getCoverBlobUrl(face.face_id, userId);
      urls[face.face_id] = url;
    })).then(() => {
      if (active) setCoverUrls(urls);
      else Object.values(urls).forEach(URL.revokeObjectURL);
    }).catch(() => undefined);
    return () => {
      active = false;
      Object.values(urls).forEach(URL.revokeObjectURL);
    };
  }, [faces, userId]);

  const openDetail = async (face: FaceItem) => {
    try {
      const response = await faceAPI.getImages(face.face_id, userId);
      setDetailFace(face);
      setDetailImages(response.data.data || []);
      setDetailVisible(true);
    } catch (error) {
      message.error('获取人物照片失败');
    }
  };

  const handlePreview = (photo: any) => {
    imageAPI.getDownloadBlobUrl(photo.id, userId).then(setPreviewImage).catch(() => message.error('预览失败'));
    setPreviewPhoto(photo);
    setPreviewVisible(true);
  };

  const handleRename = async () => {
    if (!renameFace || !renameValue.trim()) return;
    try {
      await faceAPI.remark(userId, renameFace.face_id, renameValue.trim());
      message.success('重命名成功');
      setRenameModalVisible(false);
      fetchFaces();
      if (detailFace?.face_id === renameFace.face_id) {
        setDetailFace({ ...detailFace, face_name: renameValue.trim() });
      }
    } catch (error) {
      message.error('重命名失败');
    }
  };

  const openRename = (face: FaceItem) => {
    setRenameFace(face);
    setRenameValue(face.face_name || '');
    setRenameModalVisible(true);
  };

  const handleDelete = (face: FaceItem) => {
    Modal.confirm({
      title: '确认删除人物分类',
      content: `删除 "${face.face_name || '未命名'}" 的分类，不会删除原图照片。`,
      okText: '删除',
      cancelText: '取消',
      onOk: async () => {
        try {
          await faceAPI.deleteFace(userId, face.face_id);
          message.success('人物分类已删除');
          fetchFaces();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const toggleSelection = (faceId: number) => {
    setSelectedFaceIds(prev => {
      if (prev.includes(faceId)) return prev.filter(id => id !== faceId);
      return [...prev, faceId];
    });
  };

  const handleMerge = async () => {
    if (selectedFaceIds.length < 2) {
      message.warning('请至少选择2个人物进行合并');
      return;
    }
    try {
      const response = await faceAPI.merge(userId, selectedFaceIds);
      const data = response.data.data;
      if (data.status_code === 'NEED_NAME_SELECTION') {
        setMergeCandidates(data.candidate_names || []);
        setMergeSelectedName((data.candidate_names || [])[0] || '');
        setMergeConfirmVisible(true);
      } else {
        message.success('合并成功');
        setSelectedFaceIds([]);
        fetchFaces();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '合并失败');
    }
  };

  const confirmMerge = async () => {
    try {
      await faceAPI.merge(userId, selectedFaceIds, mergeSelectedName);
      message.success('合并成功');
      setMergeConfirmVisible(false);
      setSelectedFaceIds([]);
      fetchFaces();
    } catch (error: any) {
      message.error(error.response?.data?.message || '合并失败');
    }
  };

  if (loading) {
    return (
      <div className="biophilic-card" style={{ padding: 48, textAlign: 'center' }}>
        <div className="animate-breathe">
          <EmptyPlantIcon />
        </div>
        <p style={{ color: '#7D9B76' }}>正在识别人物...</p>
      </div>
    );
  }

  return (
    <div>
      {/* 工具栏 */}
      {!embedded && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
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
                <ArrowLeftOutlined /> 收起
              </button>
            )}
            <h3 className="biophilic-title" style={{ fontSize: 20, margin: 0 }}>
              人物识别
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => {
                const modes: Array<'large' | 'medium' | 'small'> = ['large', 'medium', 'small'];
                const nextIndex = (modes.indexOf(viewMode) + 1) % modes.length;
                setViewMode(modes[nextIndex]);
              }}
              title="切换视图"
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
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,198,160,0.22)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(168,198,160,0.12)'; }}
            >
              <span style={{ fontSize: 14 }}>
                {viewMode === 'large' ? '▣' : viewMode === 'medium' ? '⊞' : '▪'}
              </span>
              <span>
                {viewMode === 'large' ? '大图' : viewMode === 'medium' ? '中图' : '小图'}
              </span>
            </button>
            {selectedFaceIds.length >= 2 && (
              <button className="biophilic-button biophilic-button-sm" onClick={handleMerge}>
                <MergeCellsOutlined style={{ marginRight: 4 }} />
                合并选中 ({selectedFaceIds.length})
              </button>
            )}
          </div>
        </div>
      )}

      {faces.length === 0 ? (
        <div className={embedded ? '' : 'biophilic-card'} style={{ padding: embedded ? 32 : 64 }}>
          <div className="biophilic-empty">
            <EmptyPlantIcon />
            <h3 style={{ color: '#5B7B5E', fontSize: embedded ? 16 : 20, marginBottom: 8 }}>暂无人物数据</h3>
            <p style={{ color: '#8B7355', fontSize: 14 }}>
              上传照片后，系统会自动识别照片中的人物并归类
            </p>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: embedded
            ? 'repeat(auto-fill, minmax(120px, 1fr))'
            : viewMode === 'large'
              ? 'repeat(auto-fill, minmax(220px, 1fr))'
              : viewMode === 'small'
                ? 'repeat(auto-fill, minmax(120px, 1fr))'
                : 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: embedded ? 10 : viewMode === 'large' ? 20 : viewMode === 'small' ? 12 : 16,
        }}>
          {faces.map(face => {
            const isSelected = selectedFaceIds.includes(face.face_id);
            const coverHeight = embedded
              ? 100
              : viewMode === 'large'
                ? 200
                : viewMode === 'small'
                  ? 100
                  : 140;
            const cardPadding = embedded
              ? 10
              : viewMode === 'large'
                ? 18
                : viewMode === 'small'
                  ? 10
                  : 14;
            const nameSize = embedded
              ? 12
              : viewMode === 'large'
                ? 16
                : viewMode === 'small'
                  ? 12
                  : 14;
            const showActions = !embedded && viewMode !== 'small';
            return (
              <div
                key={face.face_id}
                className="biophilic-face-card"
                style={{
                  outline: isSelected ? '2px solid #7D9B76' : 'none',
                  outlineOffset: isSelected ? '2px' : '0',
                }}
              >
                {/* 封面 */}
                <div
                  style={{
                    height: coverHeight,
                    background: face.cover_path
                      ? `url(${coverUrls[face.face_id] || ''}) center/cover`
                      : 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  onClick={() => openDetail(face)}
                >
                  {!face.cover_path && <UserOutlined style={{ fontSize: viewMode === 'large' ? 48 : 36, color: '#A8C6A0' }} />}
                  {/* 选择框 */}
                  <div
                    style={{ position: 'absolute', top: 10, left: 10 }}
                    onClick={e => { e.stopPropagation(); toggleSelection(face.face_id); }}
                  >
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: isSelected ? 'none' : '2px solid rgba(255,255,255,0.8)',
                      background: isSelected ? '#7D9B76' : 'rgba(0,0,0,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}>
                      {isSelected && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
                    </div>
                  </div>
                </div>

                {/* 信息 */}
                <div style={{ padding: cardPadding }}>
                  <h4 style={{
                    margin: '0 0 6px',
                    fontSize: nameSize,
                    color: '#3D5A40',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {face.face_name || '未命名人物'}
                  </h4>
                  {showActions && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => openRename(face)}
                        style={{
                          flex: 1,
                          padding: '6px 0',
                          borderRadius: '10px 10px 10px 2px',
                          border: '1px solid rgba(168,198,160,0.4)',
                          background: 'rgba(255,255,255,0.8)',
                          color: '#5B7B5E',
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        <EditOutlined style={{ marginRight: 4 }} />命名
                      </button>
                      <button
                        onClick={() => handleDelete(face)}
                        style={{
                          flex: 1,
                          padding: '6px 0',
                          borderRadius: '10px 10px 10px 2px',
                          border: '1px solid rgba(196,92,72,0.3)',
                          background: 'rgba(255,255,255,0.8)',
                          color: '#c45c48',
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        <DeleteOutlined style={{ marginRight: 4 }} />删除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 详情模态框 */}
      <Modal
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={900}
        className="biophilic-modal"
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 32 }}>
            <span>{detailFace ? (detailFace.face_name || '未命名人物') : ''}</span>
            <button
              onClick={() => {
                const modes: Array<'large' | 'medium' | 'small'> = ['large', 'medium', 'small'];
                const nextIndex = (modes.indexOf(detailViewMode) + 1) % modes.length;
                setDetailViewMode(modes[nextIndex]);
              }}
              title="切换视图"
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
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,198,160,0.22)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(168,198,160,0.12)'; }}
            >
              <span style={{ fontSize: 14 }}>
                {detailViewMode === 'large' ? '▣' : detailViewMode === 'medium' ? '⊞' : '▪'}
              </span>
              <span>
                {detailViewMode === 'large' ? '大图' : detailViewMode === 'medium' ? '中图' : '小图'}
              </span>
            </button>
          </div>
        }
      >
        <div style={{ padding: '8px 0' }}>
          {detailImages.length === 0 ? (
            <Empty description="暂无关联照片" />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns:
                detailViewMode === 'large' ? 'repeat(auto-fill, minmax(220px, 1fr))' :
                detailViewMode === 'medium' ? 'repeat(auto-fill, minmax(160px, 1fr))' :
                'repeat(auto-fill, minmax(100px, 1fr))',
              gap: detailViewMode === 'large' ? 16 : detailViewMode === 'medium' ? 12 : 8,
            }}>
              {detailImages.map((img: any) => (
                <div key={img.id} style={{
                  borderRadius: detailViewMode === 'small' ? 8 : 12,
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  cursor: 'pointer',
                }} onClick={() => handlePreview(img)}>
                  <AuthImage
                    src={imageAPI.getThumbnailUrl(img.id, userId)}
                    alt={img.originalFilename}
                    style={{
                      width: '100%',
                      height: detailViewMode === 'large' ? 180 : detailViewMode === 'medium' ? 120 : 80,
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                  {detailViewMode === 'large' && (
                    <div style={{
                      padding: '6px 10px',
                      fontSize: 12,
                      color: '#3D5A40',
                      background: 'rgba(255,255,255,0.9)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {img.originalFilename}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

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
        </div>
      </Modal>

      {/* 重命名模态框 */}
      <Modal
        open={renameModalVisible}
        onCancel={() => setRenameModalVisible(false)}
        onOk={handleRename}
        title="重命名人物"
        className="biophilic-modal"
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #7D9B76 0%, #5D7A56 100%)', border: 'none' } }}
      >
        <Input
          placeholder="输入人物姓名"
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onPressEnter={handleRename}
          style={{ borderRadius: '12px 12px 12px 4px' }}
          maxLength={100}
        />
      </Modal>

      {/* 合并选择姓名模态框 */}
      <Modal
        open={mergeConfirmVisible}
        onCancel={() => setMergeConfirmVisible(false)}
        onOk={confirmMerge}
        title="选择合并后的姓名"
        className="biophilic-modal"
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #7D9B76 0%, #5D7A56 100%)', border: 'none' } }}
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ color: '#6B5B4F', marginBottom: 12 }}>检测到多个人物姓名，请选择合并后保留的姓名：</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mergeCandidates.map(name => (
              <button
                key={name}
                onClick={() => setMergeSelectedName(name)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px 10px 10px 2px',
                  border: mergeSelectedName === name ? '2px solid #7D9B76' : '1px solid rgba(168,198,160,0.3)',
                  background: mergeSelectedName === name ? 'rgba(168,198,160,0.15)' : 'white',
                  color: '#3D5A40',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 14,
                }}
              >
                {name || '（无姓名）'}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FaceManager;
