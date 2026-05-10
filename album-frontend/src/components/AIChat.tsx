import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input, Button, Spin, Avatar, Image, Modal } from 'antd';
import { SendOutlined, UserOutlined, LoadingOutlined, SmileOutlined, ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiAPI, imageAPI } from '../services/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  references?: ChatReference[];
  /** 打字动画的完整原文，保存到 localStorage 前用此字段补全 */
  fullContent?: string;
}

interface ChatReference {
  imageId: string;
  description: string;
  thumbnailUrl: string;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface AIChatProps {
  userId?: number;
  embedded?: boolean;
  onBack?: () => void;
}

const TYPING_SPEED_MS = 25;
const MAX_CONTEXT_MESSAGES = 10;
const DEFAULT_ASSISTANT_MESSAGE_ID = '1';

const LEGACY_STORAGE_KEY = (uid: number) => `ai_chat_messages_${uid}`;
const SESSION_LIST_KEY = (uid: number) => `ai_chat_sessions_${uid}`;
const ACTIVE_SESSION_KEY = (uid: number) => `ai_chat_active_session_${uid}`;
const SESSION_MESSAGES_KEY = (uid: number, sessionId: string) => `ai_chat_messages_${uid}_${sessionId}`;

const createSession = (title = '新的对话'): ChatSession => {
  const now = new Date().toISOString();
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    createdAt: now,
    updatedAt: now,
  };
};

const getDefaultMessages = (): ChatMessage[] => [
  {
    id: DEFAULT_ASSISTANT_MESSAGE_ID,
    role: 'assistant',
    content: '你好！我是你的智能相册助手 🌿\n\n我将以你的相册内容作为知识库与你交流，可以回答关于照片的问题、分享拍摄建议，或者陪你聊聊记录中的点滴回忆。有什么我可以帮助你的吗？',
    timestamp: new Date()
  }
];

const loadSessions = (uid?: number): ChatSession[] => {
  if (!uid) return [createSession()];
  try {
    const raw = localStorage.getItem(SESSION_LIST_KEY(uid));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }

    const firstSession = createSession('默认对话');
    const legacyMessages = localStorage.getItem(LEGACY_STORAGE_KEY(uid));
    if (legacyMessages) {
      localStorage.setItem(SESSION_MESSAGES_KEY(uid, firstSession.id), legacyMessages);
      localStorage.removeItem(LEGACY_STORAGE_KEY(uid));
    }
    localStorage.setItem(SESSION_LIST_KEY(uid), JSON.stringify([firstSession]));
    localStorage.setItem(ACTIVE_SESSION_KEY(uid), firstSession.id);
    return [firstSession];
  } catch {
    return [createSession()];
  }
};

const saveSessions = (uid: number, nextSessions: ChatSession[]) => {
  localStorage.setItem(SESSION_LIST_KEY(uid), JSON.stringify(nextSessions));
};

const loadActiveSessionId = (uid: number, sessions: ChatSession[]) => {
  const activeId = localStorage.getItem(ACTIVE_SESSION_KEY(uid));
  if (activeId && sessions.some(session => session.id === activeId)) return activeId;
  return sessions[0]?.id || createSession().id;
};

const loadMessages = (uid?: number, sessionId?: string): ChatMessage[] => {
  if (!uid || !sessionId) return getDefaultMessages();
  try {
    const raw = localStorage.getItem(SESSION_MESSAGES_KEY(uid, sessionId));
    if (!raw) return getDefaultMessages();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return getDefaultMessages();
    return parsed.map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp)
    }));
  } catch {
    return getDefaultMessages();
  }
};

const saveMessages = (uid: number, sessionId: string, msgs: ChatMessage[], typingId: string | null) => {
  try {
    // 如果有正在打字的消息，保存前补全为完整原文，避免下次加载出现半截消息
    const toSave = msgs.map(m => {
      if (m.id === typingId && m.fullContent) {
        return { ...m, content: m.fullContent };
      }
      return m;
    });
    localStorage.setItem(SESSION_MESSAGES_KEY(uid, sessionId), JSON.stringify(toSave));
  } catch {
    // ignore quota exceeded
  }
};

const buildChatHistory = (msgs: ChatMessage[]) => msgs
  .filter(m => m.id !== DEFAULT_ASSISTANT_MESSAGE_ID)
  .filter(m => m.content.trim())
  .slice(-MAX_CONTEXT_MESSAGES)
  .map(m => ({
    role: m.role,
    content: m.fullContent || m.content,
  }));

const AIChat: React.FC<AIChatProps> = ({ userId, embedded, onBack }) => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions(userId));
  const [activeSessionId, setActiveSessionId] = useState<string>(() => userId ? loadActiveSessionId(userId, loadSessions(userId)) : '');
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadMessages(userId, activeSessionId));
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingMsgId, setTypingMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (userId && activeSessionId) {
      saveMessages(userId, activeSessionId, messages, typingMsgId);
    }
  }, [messages, userId, activeSessionId, typingMsgId]);

  useEffect(() => {
    if (!userId) {
      setSessions([]);
      setActiveSessionId('');
      setMessages(getDefaultMessages());
      return;
    }
    const nextSessions = loadSessions(userId);
    const nextActiveId = loadActiveSessionId(userId, nextSessions);
    setSessions(nextSessions);
    setActiveSessionId(nextActiveId);
    setMessages(loadMessages(userId, nextActiveId));
  }, [userId]);

  useEffect(() => {
    if (!userId || !activeSessionId) return;
    localStorage.setItem(ACTIVE_SESSION_KEY(userId), activeSessionId);
    setMessages(loadMessages(userId, activeSessionId));
  }, [activeSessionId, userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
    };
  }, []);

  const startTypingEffect = (msgId: string, fullText: string) => {
    setTypingMsgId(msgId);
    let index = 0;

    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
    }

    typingTimerRef.current = setInterval(() => {
      if (index >= fullText.length) {
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        setTypingMsgId(null);
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, content: fullText } : m
        ));
        return;
      }
      const nextIndex = Math.min(index + 2, fullText.length);
      const slice = fullText.slice(0, nextIndex);
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, content: slice } : m
      ));
      index = nextIndex;
    }, TYPING_SPEED_MS);
  };

  const handleNewSession = () => {
    if (!userId) return;
    const session = createSession();
    const nextSessions = [session, ...sessions];
    saveSessions(userId, nextSessions);
    setSessions(nextSessions);
    setMessages(getDefaultMessages());
    setActiveSessionId(session.id);
    setInputValue('');
    setTypingMsgId(null);
  };

  const handleSwitchSession = (sessionId: string) => {
    if (!userId || sessionId === activeSessionId) return;
    setMessages(loadMessages(userId, sessionId));
    setActiveSessionId(sessionId);
    setInputValue('');
    setTypingMsgId(null);
  };

  const handleDeleteSession = (sessionId: string) => {
    if (!userId) return;
    Modal.confirm({
      title: '删除对话',
      content: '删除后本地历史记录无法恢复。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        const nextSessions = sessions.filter(session => session.id !== sessionId);
        const fallbackSessions = nextSessions.length > 0 ? nextSessions : [createSession()];
        saveSessions(userId, fallbackSessions);
        localStorage.removeItem(SESSION_MESSAGES_KEY(userId, sessionId));
        setSessions(fallbackSessions);
        if (activeSessionId === sessionId) {
          setMessages(loadMessages(userId, fallbackSessions[0].id));
          setActiveSessionId(fallbackSessions[0].id);
        }
      },
    });
  };

  const touchSession = (sessionId: string, messageText: string) => {
    if (!userId) return;
    setSessions(prev => {
      const next = prev.map(session => {
        if (session.id !== sessionId) return session;
        const isDefaultTitle = session.title === '新的对话' || session.title === '默认对话';
        return {
          ...session,
          title: isDefaultTitle ? messageText.slice(0, 20) : session.title,
          updatedAt: new Date().toISOString(),
        };
      });
      saveSessions(userId, next);
      return next;
    });
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    if (!userId) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '抱歉，用户未登录，无法使用 AI 对话功能。',
        timestamp: new Date()
      }]);
      return;
    }

    // Cancel any ongoing typing
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setTypingMsgId(null);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    touchSession(activeSessionId, userMessage.content);
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const history = buildChatHistory([...messagesRef.current, userMessage]);
      const response = await aiAPI.chat(userMessage.content, userId, history);
      const data = response.data?.data;
      const answer = data?.answer || '抱歉，未能获取到有效回答。';
      const msgId = (Date.now() + 1).toString();

      // Add empty assistant message first (for references display)
      // fullContent 保留完整原文，供组件卸载后恢复使用
      setMessages(prev => [...prev, {
        id: msgId,
        role: 'assistant',
        content: '',
        fullContent: answer,
        timestamp: new Date(),
        references: data?.references || []
      }]);

      setIsLoading(false);

      // Start typing effect
      startTypingEffect(msgId, answer);
    } catch (error: any) {
      console.error('Chat error:', error);
      setIsLoading(false);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，服务暂时异常，请稍后重试。',
        timestamp: new Date()
      }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isTyping = typingMsgId !== null;

  return (
    <div className="biophilic-card" style={{
      display: 'grid',
      gridTemplateColumns: embedded ? '1fr' : '240px 1fr',
      height: embedded ? '100%' : '100%',
      minHeight: embedded ? undefined : 480,
      padding: 0,
      overflow: 'hidden',
      borderRadius: 0,
    }}>
      {!embedded && (
        <aside style={{ borderRight: '1px solid rgba(168,198,160,0.2)', background: 'rgba(255,255,255,0.7)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 14, borderBottom: '1px solid rgba(168,198,160,0.2)' }}>
            <Button block icon={<PlusOutlined />} onClick={handleNewSession} style={{ borderColor: 'rgba(168,198,160,0.5)', color: '#5B7B5E' }}>
              新建对话
            </Button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => handleSwitchSession(session.id)}
                style={{
                  border: activeSessionId === session.id ? '1px solid rgba(125,155,118,0.6)' : '1px solid transparent',
                  background: activeSessionId === session.id ? 'rgba(168,198,160,0.18)' : 'rgba(255,255,255,0.55)',
                  color: '#3D5A40',
                  borderRadius: 12,
                  padding: '10px 10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                  {session.title}
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSession(session.id);
                  }}
                  title="删除对话"
                  style={{ color: '#c45c48', flexShrink: 0 }}
                >
                  <DeleteOutlined />
                </span>
              </button>
            ))}
          </div>
        </aside>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
      {/* 顶部标题栏 —— 嵌入式模式下隐藏 */}
      {!embedded && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 20px',
          borderBottom: '1px solid rgba(168,198,160,0.2)',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(8px)',
          flexShrink: 0,
        }}>
          {onBack && (
            <button
              onClick={onBack}
              title="返回"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1px solid rgba(168,198,160,0.4)',
                background: 'rgba(168,198,160,0.12)',
                color: '#5B7B5E',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                flexShrink: 0,
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,198,160,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(168,198,160,0.12)'; }}
            >
              <ArrowLeftOutlined />
            </button>
          )}
          <Avatar
            icon={<SmileOutlined />}
            style={{
              background: '#7D9B76',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#3D5A40' }}>
              智能相册助手
            </div>
            <div style={{ fontSize: 12, color: '#8B7355' }}>
              基于你的照片知识库回答
            </div>
          </div>
          {isTyping && (
            <span style={{
              fontSize: 12,
              color: '#7D9B76',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#7D9B76',
                animation: 'pulse-dot 1.5s infinite',
              }} />
              正在输入...
            </span>
          )}
        </div>
      )}

      {/* 消息列表 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        background: 'rgba(245, 240, 230, 0.4)',
      }}>
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 16
            }}
          >
            {message.role === 'assistant' && (
              <Avatar
                icon={<SmileOutlined />}
                style={{
                  background: '#7D9B76',
                  marginRight: 8,
                  flexShrink: 0
                }}
              />
            )}

            <div style={{
              maxWidth: '70%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: message.role === 'user' ? 'flex-end' : 'flex-start'
            }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: message.role === 'user'
                  ? '18px 18px 4px 18px'
                  : '18px 18px 18px 4px',
                background: message.role === 'user'
                  ? 'var(--gradient-leaf)'
                  : 'rgba(255,255,255,0.95)',
                color: message.role === 'user' ? 'white' : '#3D5A40',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                lineHeight: 1.6,
                fontSize: 14,
              }}>
                {message.role === 'user' ? (
                  <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
                ) : (
                  <div className="ai-markdown-content" style={{ color: '#3D5A40' }}>
                    {message.content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <span style={{ opacity: 0.5 }}>...</span>
                    )}
                  </div>
                )}
              </div>

              {/* 引用图片 */}
              {message.references && message.references.length > 0 && (
                <div style={{
                  marginTop: 8,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                }}>
                  {message.references.map((ref, idx) => {
                    const imageUrl = userId ? imageAPI.getThumbnailUrl(ref.imageId, userId) : ref.thumbnailUrl;
                    return (
                      <div key={idx} style={{
                        background: 'rgba(255,255,255,0.9)',
                        borderRadius: 8,
                        padding: 6,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        maxWidth: 140,
                      }}>
                        <Image
                          src={imageUrl}
                          alt={ref.description}
                          style={{
                            width: 128,
                            height: 96,
                            objectFit: 'cover',
                            borderRadius: 6,
                          }}
                          preview={{ src: imageUrl }}
                        />
                        <div style={{
                          fontSize: 11,
                          color: '#6B5B4F',
                          marginTop: 4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 128,
                        }} title={ref.description}>
                          {ref.description}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <span style={{
                fontSize: 11,
                color: '#A8C6A0',
                marginTop: 4
              }}>
                {message.timestamp.toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            {message.role === 'user' && (
              <Avatar
                icon={<UserOutlined />}
                style={{
                  background: '#5B7B5E',
                  marginLeft: 8,
                  flexShrink: 0
                }}
              />
            )}
          </div>
        ))}

        {isLoading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 0'
          }}>
            <Avatar
              icon={<SmileOutlined />}
              style={{
                background: '#7D9B76',
                marginRight: 8
              }}
            />
            <div style={{
              padding: '12px 16px',
              borderRadius: '18px 18px 18px 4px',
              background: 'rgba(255,255,255,0.95)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <Spin
                indicator={<LoadingOutlined style={{ fontSize: 16, color: '#7D9B76' }} spin />}
              />
              <span style={{ color: '#8B7355', fontSize: 13 }}>思考中...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid rgba(168,198,160,0.2)',
        background: 'rgba(255,255,255,0.9)',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-end',
        flexShrink: 0,
      }}>
        <Input.TextArea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入你想说的话，或描述你想搜索的图片..."
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{
            flex: 1,
            borderRadius: '18px 18px 18px 4px',
            padding: '10px 16px',
            resize: 'none',
            border: '1px solid rgba(168,198,160,0.4)',
            background: 'rgba(255,255,255,0.9)',
          }}
          disabled={isLoading}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
          style={{
            background: 'var(--gradient-leaf)',
            border: 'none',
            borderRadius: '50%',
            width: 44,
            height: 44,
            boxShadow: '0 4px 12px rgba(125,155,118,0.3)',
          }}
        />
      </div>

      {/* Pulse dot animation */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .ai-markdown-content p { margin: 0 0 8px 0; }
        .ai-markdown-content p:last-child { margin-bottom: 0; }
        .ai-markdown-content ul, .ai-markdown-content ol { margin: 4px 0; padding-left: 20px; }
        .ai-markdown-content li { margin: 2px 0; }
        .ai-markdown-content code {
          background: rgba(168,198,160,0.15);
          padding: 2px 6px;
          borderRadius: 4px;
          font-size: 13px;
          fontFamily: monospace;
        }
        .ai-markdown-content pre {
          background: rgba(168,198,160,0.1);
          padding: 10px;
          borderRadius: 8px;
          overflow-x: auto;
          margin: 8px 0;
        }
        .ai-markdown-content pre code {
          background: transparent;
          padding: 0;
        }
        .ai-markdown-content blockquote {
          border-left: 3px solid #A8C6A0;
          margin: 8px 0;
          padding-left: 12px;
          color: #6B5B4F;
        }
        .ai-markdown-content table {
          border-collapse: collapse;
          margin: 8px 0;
          font-size: 13px;
        }
        .ai-markdown-content th, .ai-markdown-content td {
          border: 1px solid rgba(168,198,160,0.3);
          padding: 6px 10px;
        }
        .ai-markdown-content th {
          background: rgba(168,198,160,0.15);
        }
      `}</style>
      </div>
    </div>
  );
};

export default AIChat;
