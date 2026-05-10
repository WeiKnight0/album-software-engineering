import React from 'react';
import { CloudUploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import UploadTaskPanel from './UploadTaskPanel';
import DownloadTaskPanel from './DownloadTaskPanel';

interface TransferPanelProps {
  userId: number;
  folderId?: number | null;
}

type TransferTab = 'upload' | 'download';

const TransferPanel: React.FC<TransferPanelProps> = ({ userId, folderId }) => {
  const navigate = useNavigate();
  const { tab } = useParams();
  const activeTab = tab as TransferTab;

  if (activeTab !== 'upload' && activeTab !== 'download') {
    return <Navigate to="/transfer/upload" replace />;
  }

  return (
    <div className="biophilic-card" style={{ display: 'flex', height: 'calc(100vh - 112px)', overflow: 'hidden' }}>
      {/* 左侧标签 */}
      <div style={{ width: 180, borderRight: '1px solid rgba(168,198,160,0.2)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
        <button
          onClick={() => navigate('/transfer/upload')}
          style={{
            padding: '16px',
            borderRadius: '16px 16px 16px 4px',
            border: activeTab === 'upload' ? '2px solid #7D9B76' : '1px solid rgba(168,198,160,0.3)',
            background: activeTab === 'upload' ? 'rgba(125,155,118,0.1)' : 'white',
            color: '#3D5A40',
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            transition: 'all 200ms ease',
          }}
        >
          <CloudUploadOutlined style={{ fontSize: 20, color: '#7D9B76' }} />
          上传
        </button>
        <button
          onClick={() => navigate('/transfer/download')}
          style={{
            padding: '16px',
            borderRadius: '16px 16px 16px 4px',
            border: activeTab === 'download' ? '2px solid #7D9B76' : '1px solid rgba(168,198,160,0.3)',
            background: activeTab === 'download' ? 'rgba(125,155,118,0.1)' : 'white',
            color: '#3D5A40',
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            transition: 'all 200ms ease',
          }}
        >
          <DownloadOutlined style={{ fontSize: 20, color: '#7D9B76' }} />
          下载
        </button>
      </div>

      {/* 右侧内容 */}
      <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
        {activeTab === 'upload' ? (
          <UploadTaskPanel userId={userId} folderId={folderId} />
        ) : (
          <DownloadTaskPanel userId={userId} />
        )}
      </div>
    </div>
  );
};

export default TransferPanel;
