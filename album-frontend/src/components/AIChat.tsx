import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input, Button, Spin, Avatar, Image } from 'antd';
import { SendOutlined, UserOutlined, LoadingOutlined, SmileOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiAPI } from '../services/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  references?: ChatReference[];
}

interface ChatReference {
  imageId: string;
  description: string;
  thumbnailUrl: string;
}

interface AIChatProps {
  userId?: number;
  embedded?: boolean;
  onBack?: () => void;
}

const TYPING_SPEED_MS = 25;

const AIChat: React.FC<AIChatProps> = ({ userId, embedded, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是你的智能相册助手 🌿\n\n我将以你的相册内容作为知识库与你交流，可以回答关于照片的问题、分享拍摄建议，或者陪你聊聊记录中的点滴回忆。有什么我可以帮助你的吗？',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingMsgId, setTypingMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Cleanup typing timer on unmount
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

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await aiAPI.chat(userMessage.content, userId);
      const data = response.data?.data;
      const answer = data?.answer || '抱歉，未能获取到有效回答。';
      const msgId = (Date.now() + 1).toString();

      // Add empty assistant message first (for references display)
      setMessages(prev => [...prev, {
        id: msgId,
        role: 'assistant',
        content: '',
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
      display: 'flex',
      flexDirection: 'column',
      height: embedded ? '100%' : '100%',
      minHeight: embedded ? undefined : 480,
      padding: 0,
      overflow: 'hidden',
      borderRadius: 0,
    }}>
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
                  {message.references.map((ref, idx) => (
                    <div key={idx} style={{
                      background: 'rgba(255,255,255,0.9)',
                      borderRadius: 8,
                      padding: 6,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                      maxWidth: 140,
                    }}>
                      <Image
                        src={ref.thumbnailUrl}
                        alt={ref.description}
                        style={{
                          width: 128,
                          height: 96,
                          objectFit: 'cover',
                          borderRadius: 6,
                        }}
                        preview={{ src: ref.thumbnailUrl }}
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
                  ))}
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
  );
};

export default AIChat;
