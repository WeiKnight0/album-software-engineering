import React, { useState, useEffect } from 'react';
import { Input, Button, Empty, Spin, Tag, message, Modal } from 'antd';
import { SearchOutlined, PictureOutlined, CloseCircleOutlined, CompassOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { imageAPI, searchAPI } from '../services/api';
import AuthImage from './AuthImage';

interface SearchResult {
  id: string;
  originalFilename: string;
  thumbnailFilename?: string;
  userId: number;
  uploadTime: string;
}

interface SmartSearchProps {
  userId: number;
  initialQuery?: string;
  onBack?: () => void;
}

const SmartSearch: React.FC<SmartSearchProps> = ({ userId, initialQuery, onBack }) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(!!initialQuery);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<SearchResult | null>(null);

  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setSearchQuery(initialQuery);
      setHasSearched(true);
      performSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const performSearch = async (query: string) => {
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    setHasSearched(true);
    setSearchResults([]);

    try {
      const response = await searchAPI.smartSearch(query.trim(), userId);
      const images = response.data?.data || [];
      setSearchResults(images.map((img: any) => ({
        id: img.id,
        originalFilename: img.originalFilename,
        thumbnailFilename: img.thumbnailFilename,
        userId: img.userId,
        uploadTime: img.uploadTime,
      })));
      // 空结果不弹 message，由页面 Empty 组件展示
    } catch (error) {
      console.error('Search error:', error);
      message.error('搜索失败，请重试');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = () => performSearch(searchQuery);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePreview = (photo: SearchResult) => {
    imageAPI.getDownloadBlobUrl(photo.id, userId).then(setPreviewImage).catch(() => message.error('预览失败'));
    setPreviewPhoto(photo);
    setPreviewVisible(true);
  };

  const handleQueryChange = (value: string) => {
    setSearchQuery(value);
    if (hasSearched) {
      setHasSearched(false);
      setSearchResults([]);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const exampleQueries = [
    '海边的日落',
    '去年夏天的照片',
    '美食图片',
    '全家福',
    '旅行照片'
  ];

  return (
    <div className="biophilic-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* 搜索头部 —— 仅未搜索时显示 */}
      {!hasSearched && (
        <div style={{ 
          padding: '28px 32px', 
          background: 'var(--gradient-leaf)',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 10 }}>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: 14,
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
              >
                <ArrowLeftOutlined />
              </button>
            )}
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <SearchOutlined style={{ fontSize: 20 }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 18 }}>智能搜索</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>用自然语言描述你想找的照片</div>
            </div>
          </div>
          
          {/* 搜索输入框 */}
          <div style={{ display: 'flex', gap: 12 }}>
            <Input
              value={searchQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="例如：海边的日落、全家福、去年夏天的照片..."
              size="large"
              style={{ 
                flex: 1,
                borderRadius: '18px 18px 18px 4px',
                height: 52,
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              prefix={<SearchOutlined style={{ color: '#A8C6A0', fontSize: 18 }} />}
              suffix={
                searchQuery && (
                  <CloseCircleOutlined 
                    onClick={clearSearch} 
                    style={{ color: '#A8C6A0', cursor: 'pointer', fontSize: 16 }}
                  />
                )
              }
              disabled={isSearching}
            />
            <Button
              type="primary"
              size="large"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              loading={isSearching}
              style={{ 
                background: 'white',
                color: '#5D7A56',
                border: 'none',
                borderRadius: '14px',
                width: 52,
                height: 52,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
          </div>
        </div>
      )}

      {/* 示例提示 */}
      {!hasSearched && (
        <div style={{ padding: '24px 32px', background: 'rgba(245, 240, 230, 0.4)' }}>
          <div style={{ 
            marginBottom: 14, 
            color: '#6B5B4F',
            fontSize: 14,
            fontWeight: 500,
          }}>
            <CompassOutlined style={{ marginRight: 6, color: '#7D9B76' }} />
            试试这样搜索：
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {exampleQueries.map((query, index) => (
              <Tag
                key={index}
                onClick={() => {
                  setSearchQuery(query);
                }}
                style={{ 
                  cursor: 'pointer',
                  padding: '6px 16px',
                  fontSize: 14,
                  borderRadius: 16,
                  background: 'rgba(168,198,160,0.15)',
                  border: '1px solid rgba(168,198,160,0.3)',
                  color: '#5B7B5E',
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#7D9B76';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = '#7D9B76';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(168,198,160,0.15)';
                  e.currentTarget.style.color = '#5B7B5E';
                  e.currentTarget.style.borderColor = 'rgba(168,198,160,0.3)';
                }}
              >
                {query}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* 搜索结果 */}
      <div style={{ 
        minHeight: 200,
        padding: '24px 32px',
        background: 'rgba(245, 240, 230, 0.4)'
      }}>
        {isSearching ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" indicator={<CompassOutlined style={{ fontSize: 32, color: '#7D9B76' }} spin />} />
            <div style={{ marginTop: 20, color: '#6B5B4F', fontSize: 15 }}>
              正在智能分析...
            </div>
          </div>
        ) : hasSearched ? (
          searchResults.length > 0 ? (
            <>
              <div style={{ 
                marginBottom: 16, 
                color: '#6B5B4F',
                fontSize: 14,
                fontWeight: 500,
              }}>
                <PictureOutlined style={{ marginRight: 8, color: '#7D9B76' }} />
                找到 {searchResults.length} 张符合条件的图片
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 16
              }}>
                {searchResults.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => handlePreview(photo)}
                    className="biophilic-photo-card"
                    style={{ cursor: 'pointer' }}
                    >
                      <AuthImage
                      src={imageAPI.getThumbnailUrl(photo.id, userId)}
                      alt={photo.originalFilename}
                      style={{
                        width: '100%',
                        height: 150,
                        objectFit: 'cover'
                      }}
                    />
                    <div style={{ padding: 10, fontSize: 12, color: '#3D5A40' }}>
                      {photo.originalFilename}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div style={{ color: '#8B7355', fontSize: 14, lineHeight: 1.8 }}>
                    <div>未找到匹配照片，可以换个描述再试。</div>
                    <div style={{ fontSize: 12, color: '#9A8A78' }}>如果刚上传照片，请等待 AI 分析和索引完成后再搜索。</div>
                  </div>
                }
              />
              <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8 }}>
                {exampleQueries.slice(0, 4).map(query => (
                  <Tag
                    key={query}
                    onClick={() => {
                      setSearchQuery(query);
                      performSearch(query);
                    }}
                    style={{ cursor: 'pointer', borderRadius: 14, padding: '4px 12px', color: '#5B7B5E' }}
                  >
                    试试：{query}
                  </Tag>
                ))}
              </div>
            </div>
          )
        ) : null}
      </div>

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
    </div>
  );
};

export default SmartSearch;
