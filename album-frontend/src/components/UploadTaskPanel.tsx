import React, { useState, useEffect, useRef } from 'react';
import { message, Progress, Upload, Spin, Tag } from 'antd';
import {
  PauseCircleOutlined,
  PlayCircleOutlined,
  RedoOutlined,
  FileImageOutlined,
  InboxOutlined,
  DeleteOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { uploadTaskAPI } from '../services/api';

const formatDateTime = (value?: string | null) => {
  if (!value) return '暂无时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '暂无时间';
  return date.toLocaleString('zh-CN');
};

interface UploadFileItem {
  fileIndex: number;
  fileName: string;
  fileSize: number;
  status: number;
  progress: number;
  imageId: string | null;
  errorMsg: string | null;
  analysisStatus: string;
}

interface UploadTask {
  taskId: string;
  taskName: string;
  totalFiles: number;
  uploadedFiles: number;
  progress: number;
  status: number;
  createdAt: string;
  files: UploadFileItem[];
}

interface UploadTaskPanelProps {
  userId: number;
  folderId?: number | null;
}

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '等待中', color: '#8B7355' },
  2: { label: '上传中', color: '#7D9B76' },
  3: { label: '已完成', color: '#5B7B5E' },
  4: { label: '已取消', color: '#999' },
  5: { label: '已暂停', color: '#c4a35a' },
};

const ANALYSIS_MAP: Record<string, { label: string; color: string; bg: string; spinning?: boolean }> = {
  'NONE': { label: '未分析', color: '#999', bg: 'rgba(153,153,153,0.1)' },
  'PENDING': { label: '排队中', color: '#4a90d9', bg: 'rgba(74,144,217,0.1)', spinning: true },
  'PROCESSING': { label: '分析中', color: '#4a90d9', bg: 'rgba(74,144,217,0.1)', spinning: true },
  'SUCCESS': { label: '已完成', color: '#5B7B5E', bg: 'rgba(91,123,94,0.1)' },
  'FAILED': { label: '失败', color: '#c45c48', bg: 'rgba(196,92,72,0.1)' },
};

const EmptyPlantIcon: React.FC = () => (
  <svg viewBox="0 0 120 120" style={{ width: 100, height: 100, margin: '0 auto 20px', opacity: 0.35 }}>
    <defs>
      <linearGradient id="upLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A8C6A0" />
        <stop offset="100%" stopColor="#7D9B76" />
      </linearGradient>
    </defs>
    <path d="M60 100 Q60 70 60 40" stroke="#7D9B76" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    <path d="M60 75 Q40 65 30 50" stroke="#A8C6A0" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    <path d="M60 65 Q80 55 90 40" stroke="#A8C6A0" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    <ellipse cx="60" cy="35" rx="14" ry="20" fill="url(#upLeafGrad)" opacity="0.5"/>
    <path d="M55 20 L60 10 L65 20" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M60 15 L60 30" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
  </svg>
);

const getAnalysisSummary = (files: UploadFileItem[]) => {
  const total = files.length;
  const success = files.filter(f => f.analysisStatus === 'SUCCESS').length;
  const failed = files.filter(f => f.analysisStatus === 'FAILED').length;
  const processing = files.filter(f => f.analysisStatus === 'PROCESSING' || f.analysisStatus === 'PENDING').length;
  if (failed > 0) return { status: 'FAILED', text: `${failed} 个失败` };
  if (processing > 0) return { status: 'PROCESSING', text: `${success}/${total} 已完成` };
  if (success === total) return { status: 'SUCCESS', text: '全部完成' };
  return { status: 'NONE', text: '未分析' };
};

const UploadTaskPanel: React.FC<UploadTaskPanelProps> = ({ userId, folderId }) => {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const isUploadingRef = useRef(false);
  const pendingFilesRef = useRef<File[]>([]);
  const taskFilesRef = useRef<Record<string, Record<number, File>>>({});
  const processTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTasks = async () => {
    if (!userId || !localStorage.getItem('token')) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      const response = await uploadTaskAPI.getTasks(userId);
      setTasks(response.data.data || []);
    } catch (error) {
      console.error('获取上传任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId || !localStorage.getItem('token')) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, [userId]);

  const toggleExpand = (taskId: string) => {
    setExpandedTaskId(prev => prev === taskId ? null : taskId);
  };

  const handleCreateTask = async (files: File[]) => {
    if (files.length === 0 || isUploadingRef.current) return;
    isUploadingRef.current = true;
    const fileInfos = files.map(f => ({
      fileName: f.name,
      fileSize: f.size,
      fileType: f.type || 'image/jpeg',
    }));
    let taskId = '';
    try {
      const response = await uploadTaskAPI.createTask(userId, '批量上传', fileInfos);
      taskId = response.data.data.taskId;
      taskFilesRef.current[taskId] = files.reduce<Record<number, File>>((acc, file, index) => {
        acc[index] = file;
        return acc;
      }, {});

      for (let i = 0; i < files.length; i++) {
        await uploadTaskAPI.uploadFile(taskId, userId, files[i], i, folderId);
      }
      message.success('上传完成');
      fetchTasks();
    } catch (error: any) {
      const msg = error.response?.data?.message || '上传任务失败';
      message.error(msg);
      console.error('上传任务失败:', error);
    } finally {
      isUploadingRef.current = false;
      setUploadKey(prev => prev + 1);
    }
  };

  const handlePause = async (taskId: string) => {
    try {
      await uploadTaskAPI.pause(taskId, userId);
      message.success('已暂停');
      fetchTasks();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleResume = async (taskId: string) => {
    try {
      await uploadTaskAPI.resume(taskId, userId);
      message.success('已继续');
      fetchTasks();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleRetryFile = async (taskId: string, fileIndex: number) => {
    const file = taskFilesRef.current[taskId]?.[fileIndex];
    if (!file) {
      message.warning('无法直接重试：页面刷新后无法读取原始文件，请重新选择文件上传。');
      return;
    }
    try {
      await uploadTaskAPI.uploadFile(taskId, userId, file, fileIndex, folderId);
      message.success('已重新上传');
      fetchTasks();
    } catch (error: any) {
      message.error(error.response?.data?.message || '重新上传失败');
    }
  };

  const handleCleanup = async (taskId: string) => {
    try {
      await uploadTaskAPI.cleanup(taskId, userId);
      message.success('已清理');
      fetchTasks();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 className="biophilic-title" style={{ fontSize: 20, margin: 0 }}>
          上传任务
        </h3>
      </div>

      {/* Drag upload area */}
      <div className="biophilic-card" style={{ padding: 32, marginBottom: 24 }}>
        <Upload.Dragger
          key={uploadKey}
          multiple
          accept="image/*"
          showUploadList={false}
          beforeUpload={(_file, fileList) => {
            const files = fileList
              .map((f: any) => f.originFileObj || f)
              .filter((f: any): f is File => f instanceof File);

            // 去重累积
            const existingKeys = new Set(pendingFilesRef.current.map(f => f.name + f.size + f.lastModified));
            files.forEach(f => {
              if (!existingKeys.has(f.name + f.size + f.lastModified)) {
                pendingFilesRef.current.push(f);
              }
            });

            if (processTimerRef.current) clearTimeout(processTimerRef.current);
            processTimerRef.current = setTimeout(() => {
              const allFiles = [...pendingFilesRef.current];
              pendingFilesRef.current = [];
              if (allFiles.length > 0 && !isUploadingRef.current) {
                handleCreateTask(allFiles);
              }
            }, 500);

            return false;
          }}
        >
          <div style={{ padding: 20 }}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ fontSize: 48, color: '#7D9B76' }} />
            </p>
            <p style={{ color: '#5B7B5E', fontSize: 16, fontWeight: 500 }}>
              点击或拖拽照片到这里上传
            </p>
            <p style={{ color: '#8B7355', fontSize: 13 }}>
              支持批量上传，单个文件最大 10MB
            </p>
          </div>
        </Upload.Dragger>
      </div>

      {/* Task list */}
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
            <p style={{ color: '#8B7355' }}>暂无上传任务</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tasks.map(task => {
              const statusInfo = STATUS_MAP[task.status] || { label: '未知', color: '#999' };
              const isExpanded = expandedTaskId === task.taskId;
              const files = task.files || [];
              const summary = getAnalysisSummary(files);
              const analysisStyle = ANALYSIS_MAP[summary.status] || ANALYSIS_MAP['NONE'];
              const isSingleFile = task.totalFiles === 1;

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
                  {/* Task header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
                      {task.totalFiles > 1 && (
                        <button
                          onClick={() => toggleExpand(task.taskId)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#5B7B5E', flexShrink: 0 }}
                        >
                          {isExpanded ? <DownOutlined /> : <RightOutlined />}
                        </button>
                      )}
                      <FileImageOutlined style={{ color: '#7D9B76', fontSize: 18, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#3D5A40', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 8 }}>
                          {task.taskName || '上传任务'}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
                          <span style={{
                            padding: '2px 10px',
                            borderRadius: 10,
                            background: analysisStyle.bg,
                            color: analysisStyle.color,
                            fontSize: 12,
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}>
                            {analysisStyle.spinning && (
                              <Spin size="small" style={{ fontSize: 10 }} />
                            )}
                            {analysisStyle.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {task.status === 2 && (
                        <button onClick={() => handlePause(task.taskId)} style={actionBtnStyle} title="暂停">
                          <PauseCircleOutlined />
                        </button>
                      )}
                      {task.status === 5 && (
                        <button onClick={() => handleResume(task.taskId)} style={actionBtnStyle} title="继续">
                          <PlayCircleOutlined />
                        </button>
                      )}
                      {task.status !== 2 && (
                        <button onClick={() => handleCleanup(task.taskId)} style={{ ...actionBtnStyle, color: '#c45c48' }} title="清理临时文件">
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
                      status={task.status === 4 ? 'exception' : task.status === 3 ? 'success' : 'active'}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8B7355' }}>
                    <span>文件: {task.uploadedFiles} / {task.totalFiles}</span>
                    <span>{formatDateTime(task.createdAt)}</span>
                  </div>

                  {/* Single file: show analysis status directly without expandable title */}
                  {isSingleFile && files[0] && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(168,198,160,0.15)' }}>
                      <FileRow file={files[0]} taskId={task.taskId} formatFileSize={formatFileSize} onRetry={handleRetryFile} />
                    </div>
                  )}

                  {/* Multi-file: expandable list */}
                  {task.totalFiles > 1 && isExpanded && files.length > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(168,198,160,0.15)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {files.map(file => (
                          <FileRow key={file.fileIndex} file={file} taskId={task.taskId} formatFileSize={formatFileSize} onRetry={handleRetryFile} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const FileRow: React.FC<{
  file: UploadFileItem;
  taskId: string;
  formatFileSize: (s: number) => string;
  onRetry: (taskId: string, fileIndex: number) => void;
}> = ({ file, taskId, formatFileSize, onRetry }) => {
  const analysis = ANALYSIS_MAP[file.analysisStatus] || ANALYSIS_MAP['NONE'];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 10px',
        background: 'rgba(255,255,255,0.5)',
        borderRadius: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
        <span style={{ color: '#3D5A40', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.fileName}
        </span>
        <span style={{ color: '#8B7355', fontSize: 12, whiteSpace: 'nowrap' }}>
          {formatFileSize(file.fileSize)}
        </span>
        {file.errorMsg && (
          <span style={{ color: '#c45c48', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }} title={file.errorMsg}>
            {file.errorMsg}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {file.status === 4 && (
          <button onClick={() => onRetry(taskId, file.fileIndex)} style={actionBtnStyle} title="重新上传">
            <RedoOutlined />
          </button>
        )}
        <Tag
          style={{
            margin: 0,
            fontSize: 11,
            color: analysis.color,
            background: analysis.bg,
            borderColor: `${analysis.color}30`,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {analysis.spinning && <Spin size="small" style={{ fontSize: 10 }} />}
          {analysis.label}
        </Tag>
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

export default UploadTaskPanel;
