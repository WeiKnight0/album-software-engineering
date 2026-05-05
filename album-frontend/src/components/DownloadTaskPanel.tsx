import React, { useState, useEffect } from 'react';
import { message, Progress } from 'antd';
import {
  PauseCircleOutlined,
  PlayCircleOutlined,
  RedoOutlined,
  FileZipOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { downloadTaskAPI } from '../services/api';

interface DownloadTask {
  taskId: string;
  taskName: string;
  totalFiles: number;
  downloadedFiles: number;
  progress: number;
  status: number;
  createdAt: string;
}

interface DownloadTaskPanelProps {
  userId: number;
}

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '等待中', color: '#8B7355' },
  2: { label: '下载中', color: '#7D9B76' },
  3: { label: '已完成', color: '#5B7B5E' },
  4: { label: '已暂停', color: '#c4a35a' },
  5: { label: '已取消', color: '#999' },
  6: { label: '失败', color: '#c45c48' },
};

const EmptyPlantIcon: React.FC = () => (
  <svg viewBox="0 0 120 120" style={{ width: 100, height: 100, margin: '0 auto 20px', opacity: 0.35 }}>
    <defs>
      <linearGradient id="dlLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A8C6A0" />
        <stop offset="100%" stopColor="#7D9B76" />
      </linearGradient>
    </defs>
    <path d="M40 80 L80 80 L80 50 L40 50 Z" fill="none" stroke="#7D9B76" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M50 50 L50 40 L70 40 L70 50" fill="none" stroke="#7D9B76" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M55 40 L60 30 L65 40" fill="none" stroke="#A8C6A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M60 60 L60 75 M55 70 L60 75 L65 70" stroke="#7D9B76" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <ellipse cx="60" cy="90" rx="12" ry="4" fill="url(#dlLeafGrad)" opacity="0.4"/>
  </svg>
);

const DownloadTaskPanel: React.FC<DownloadTaskPanelProps> = ({ userId }) => {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const response = await downloadTaskAPI.getTasks(userId);
      setTasks(response.data.data || []);
    } catch (error) {
      console.error('获取下载任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, [userId]);

  const handlePause = async (taskId: string) => {
    try {
      await downloadTaskAPI.pause(taskId, userId);
      message.success('已暂停');
      fetchTasks();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleResume = async (taskId: string) => {
    try {
      await downloadTaskAPI.resume(taskId, userId);
      message.success('已继续');
      fetchTasks();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleRetry = async (taskId: string) => {
    try {
      await downloadTaskAPI.retry(taskId, userId);
      message.success('已重试');
      fetchTasks();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await downloadTaskAPI.deleteTask(taskId, userId);
      message.success('已删除');
      fetchTasks();
    } catch (error) {
      message.error('操作失败');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 className="biophilic-title" style={{ fontSize: 20, margin: 0 }}>
          下载任务
        </h3>
        <p style={{ color: '#8B7355', fontSize: 13, marginTop: 4 }}>
          管理你的批量下载任务
        </p>
      </div>

      <div className="biophilic-card" style={{ padding: 20 }}>
        {loading ? (
          <div className="biophilic-empty" style={{ padding: 32 }}>
            <div className="animate-breathe">
              <EmptyPlantIcon />
            </div>
            <p style={{ color: '#7D9B76' }}>正在加载任务...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="biophilic-empty" style={{ padding: 32 }}>
            <EmptyPlantIcon />
            <p style={{ color: '#8B7355' }}>暂无下载任务</p>
            <p style={{ color: '#A8C6A0', fontSize: 13 }}>在照片库中选择照片并点击下载即可创建任务</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tasks.map(task => {
              const statusInfo = STATUS_MAP[task.status] || { label: '未知', color: '#999' };
              return (
                <div
                  key={task.taskId}
                  style={{
                    padding: 16,
                    background: 'rgba(255,255,255,0.7)',
                    borderRadius: '14px 14px 14px 4px',
                    border: '1px solid rgba(168,198,160,0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileZipOutlined style={{ color: '#7D9B76', fontSize: 18 }} />
                      <span style={{ color: '#3D5A40', fontWeight: 600, fontSize: 14 }}>
                        {task.taskName || '下载任务'}
                      </span>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: 10,
                        background: `${statusInfo.color}15`,
                        color: statusInfo.color,
                        fontSize: 12,
                        fontWeight: 500,
                      }}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {task.status === 2 && (
                        <button onClick={() => handlePause(task.taskId)} style={actionBtnStyle} title="暂停">
                          <PauseCircleOutlined />
                        </button>
                      )}
                      {task.status === 4 && (
                        <button onClick={() => handleResume(task.taskId)} style={actionBtnStyle} title="继续">
                          <PlayCircleOutlined />
                        </button>
                      )}
                      {(task.status === 5 || task.status === 6) && (
                        <button onClick={() => handleRetry(task.taskId)} style={actionBtnStyle} title="重试">
                          <RedoOutlined />
                        </button>
                      )}
                      {task.status !== 2 && (
                        <button onClick={() => handleDelete(task.taskId)} style={{ ...actionBtnStyle, color: '#c45c48' }} title="删除">
                          <DeleteOutlined />
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <Progress
                      percent={task.progress}
                      strokeColor={{ from: '#A8C6A0', to: '#5B7B5E' }}
                      trailColor="rgba(168,198,160,0.2)"
                      size="small"
                      status={task.status === 6 ? 'exception' : task.status === 3 ? 'success' : 'active'}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8B7355' }}>
                    <span>文件: {task.downloadedFiles} / {task.totalFiles}</span>
                    <span>{new Date(task.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const actionBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#5B7B5E',
  padding: 4,
  borderRadius: 6,
  fontSize: 16,
};

export default DownloadTaskPanel;
