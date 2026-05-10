import React, { useEffect, useRef, useState } from 'react';
import { Avatar, Button, Image, Input, Modal, Spin, message as antdMessage } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, LoadingOutlined, PlusOutlined, SendOutlined, SmileOutlined, UserOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiAPI, imageAPI } from '../services/api';

interface ChatReference {
  imageId: string;
  description: string;
  thumbnailUrl: string;
}

interface ChatMessage {
  id: number | string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  references?: ChatReference[];
  fullContent?: string;
}

interface ChatSession {
  id: number;
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

const defaultAssistantMessage = (): ChatMessage => ({
  id: 'welcome',
  role: 'assistant',
  content: '你好！我是你的智能相册助手。\n\n我将以你的相册内容作为知识库与你交流，可以回答关于照片的问题、分享拍摄建议，或者陪你聊聊记录中的点滴回忆。有什么我可以帮助你的吗？',
  createdAt: new Date().toISOString(),
});

const AIChat: React.FC<AIChatProps> = ({ userId, embedded, onBack }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([defaultAssistantMessage()]);
  const [inputValue, setInputValue] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [typingMsgId, setTypingMsgId] = useState<number | string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, []);

  const loadSessions = async () => {
    if (!userId) return;
    setLoadingSessions(true);
    try {
      const response = await aiAPI.getSessions();
      let nextSessions = response.data.data || [];
      if (nextSessions.length === 0) {
        const created = await aiAPI.createSession();
        nextSessions = [created.data.data];
      }
      setSessions(nextSessions);
      setActiveSessionId(nextSessions[0]?.id || null);
    } catch (error: any) {
      antdMessage.error(error.response?.data?.message || '加载 AI 会话失败');
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadMessages = async (sessionId: number) => {
    setLoadingMessages(true);
    try {
      const response = await aiAPI.getMessages(sessionId);
      const nextMessages = response.data.data || [];
      setMessages(nextMessages.length > 0 ? nextMessages : [defaultAssistantMessage()]);
    } catch (error: any) {
      antdMessage.error(error.response?.data?.message || '加载 AI 消息失败');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      setSessions([]);
      setActiveSessionId(null);
      setMessages([defaultAssistantMessage()]);
      return;
    }
    loadSessions();
  }, [userId]);

  useEffect(() => {
    if (activeSessionId) loadMessages(activeSessionId);
  }, [activeSessionId]);

  const startTypingEffect = (msgId: number | string, fullText: string) => {
    setTypingMsgId(msgId);
    let index = 0;
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    typingTimerRef.current = setInterval(() => {
      if (index >= fullText.length) {
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        setTypingMsgId(null);
        setMessages(prev => prev.map(item => item.id === msgId ? { ...item, content: fullText } : item));
        return;
      }
      const nextIndex = Math.min(index + 2, fullText.length);
      const slice = fullText.slice(0, nextIndex);
      setMessages(prev => prev.map(item => item.id === msgId ? { ...item, content: slice } : item));
      index = nextIndex;
    }, TYPING_SPEED_MS);
  };

  const refreshSessions = async () => {
    const response = await aiAPI.getSessions();
    setSessions(response.data.data || []);
  };

  const handleNewSession = async () => {
    try {
      const response = await aiAPI.createSession();
      const session = response.data.data;
      setSessions(prev => [session, ...prev]);
      setActiveSessionId(session.id);
      setInputValue('');
      setTypingMsgId(null);
    } catch (error: any) {
      antdMessage.error(error.response?.data?.message || '创建会话失败');
    }
  };

  const handleSwitchSession = (sessionId: number) => {
    if (sessionId === activeSessionId) return;
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    setTypingMsgId(null);
    setInputValue('');
    setActiveSessionId(sessionId);
  };

  const handleDeleteSession = (sessionId: number) => {
    Modal.confirm({
      title: '删除对话',
      content: '删除后该会话记录无法恢复。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        await aiAPI.deleteSession(sessionId);
        const nextSessions = sessions.filter(session => session.id !== sessionId);
        if (nextSessions.length === 0) {
          const created = await aiAPI.createSession();
          setSessions([created.data.data]);
          setActiveSessionId(created.data.data.id);
        } else {
          setSessions(nextSessions);
          if (activeSessionId === sessionId) setActiveSessionId(nextSessions[0].id);
        }
      },
    });
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isLoading || !activeSessionId) return;
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    setTypingMsgId(null);
    setInputValue('');
    setIsLoading(true);

    const optimisticUserMessage: ChatMessage = {
      id: `pending-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev.filter(item => item.id !== 'welcome'), optimisticUserMessage]);

    try {
      const response = await aiAPI.chat(activeSessionId, text);
      const savedMessages = response.data.data || [];
      const assistant = savedMessages.find((item: ChatMessage) => item.role === 'assistant');
      const user = savedMessages.find((item: ChatMessage) => item.role === 'user');
      if (!assistant) throw new Error('missing assistant message');

      setMessages(prev => {
        const withoutPending = prev.filter(item => item.id !== optimisticUserMessage.id);
        const next = user ? [...withoutPending, user] : withoutPending;
        return [...next, { ...assistant, content: '', fullContent: assistant.content }];
      });
      setIsLoading(false);
      startTypingEffect(assistant.id, assistant.content);
      refreshSessions();
    } catch (error: any) {
      setIsLoading(false);
      antdMessage.error(error.response?.data?.message || 'AI 对话失败');
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '抱歉，服务暂时异常，请稍后重试。',
        createdAt: new Date().toISOString(),
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
      height: '100%',
      minHeight: embedded ? undefined : 480,
      padding: 0,
      overflow: 'hidden',
      borderRadius: 0,
    }}>
      {!embedded && (
        <aside style={{ borderRight: '1px solid rgba(168,198,160,0.2)', background: 'rgba(255,255,255,0.7)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 14, borderBottom: '1px solid rgba(168,198,160,0.2)' }}>
            <Button block icon={<PlusOutlined />} onClick={handleNewSession} loading={loadingSessions} style={{ borderColor: 'rgba(168,198,160,0.5)', color: '#5B7B5E' }}>
              新建对话
            </Button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sessions.map(session => (
              <button key={session.id} onClick={() => handleSwitchSession(session.id)} style={{ border: activeSessionId === session.id ? '1px solid rgba(125,155,118,0.6)' : '1px solid transparent', background: activeSessionId === session.id ? 'rgba(168,198,160,0.18)' : 'rgba(255,255,255,0.55)', color: '#3D5A40', borderRadius: 12, padding: '10px 10px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{session.title}</span>
                <span onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }} title="删除对话" style={{ color: '#c45c48', flexShrink: 0 }}><DeleteOutlined /></span>
              </button>
            ))}
          </div>
        </aside>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        {!embedded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid rgba(168,198,160,0.2)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', flexShrink: 0 }}>
            {onBack && <button onClick={onBack} title="返回" style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(168,198,160,0.4)', background: 'rgba(168,198,160,0.12)', color: '#5B7B5E', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}><ArrowLeftOutlined /></button>}
            <Avatar icon={<SmileOutlined />} style={{ background: '#7D9B76', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#3D5A40' }}>智能相册助手</div>
              <div style={{ fontSize: 12, color: '#8B7355' }}>基于你的照片知识库回答</div>
            </div>
            {isTyping && <span style={{ fontSize: 12, color: '#7D9B76', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7D9B76', animation: 'pulse-dot 1.5s infinite' }} />正在输入...</span>}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: 'rgba(245, 240, 230, 0.4)' }}>
          {loadingMessages ? (
            <div style={{ textAlign: 'center', padding: 32 }}><Spin indicator={<LoadingOutlined style={{ fontSize: 24, color: '#7D9B76' }} spin />} /></div>
          ) : messages.map(chatMessage => (
            <div key={chatMessage.id} style={{ display: 'flex', justifyContent: chatMessage.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 16 }}>
              {chatMessage.role === 'assistant' && <Avatar icon={<SmileOutlined />} style={{ background: '#7D9B76', marginRight: 8, flexShrink: 0 }} />}
              <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: chatMessage.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ padding: '12px 16px', borderRadius: chatMessage.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: chatMessage.role === 'user' ? 'var(--gradient-leaf)' : 'rgba(255,255,255,0.95)', color: chatMessage.role === 'user' ? 'white' : '#3D5A40', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', lineHeight: 1.6, fontSize: 14 }}>
                  {chatMessage.role === 'user' ? <span style={{ whiteSpace: 'pre-wrap' }}>{chatMessage.content}</span> : <div className="ai-markdown-content" style={{ color: '#3D5A40' }}>{chatMessage.content ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{chatMessage.content}</ReactMarkdown> : <span style={{ opacity: 0.5 }}>...</span>}</div>}
                </div>
                {chatMessage.references && chatMessage.references.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {chatMessage.references.map((ref, idx) => {
                      const imageUrl = userId ? imageAPI.getThumbnailUrl(ref.imageId, userId) : ref.thumbnailUrl;
                      return <div key={idx} style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', maxWidth: 140 }}>
                        <Image src={imageUrl} alt={ref.description} style={{ width: 128, height: 96, objectFit: 'cover', borderRadius: 6 }} preview={{ src: imageUrl }} />
                        <div style={{ fontSize: 11, color: '#6B5B4F', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 128 }} title={ref.description}>{ref.description}</div>
                      </div>;
                    })}
                  </div>
                )}
                <span style={{ fontSize: 11, color: '#A8C6A0', marginTop: 4 }}>{new Date(chatMessage.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {chatMessage.role === 'user' && <Avatar icon={<UserOutlined />} style={{ background: '#5B7B5E', marginLeft: 8, flexShrink: 0 }} />}
            </div>
          ))}

          {isLoading && <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0' }}><Avatar icon={<SmileOutlined />} style={{ background: '#7D9B76', marginRight: 8 }} /><div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}><Spin indicator={<LoadingOutlined style={{ fontSize: 16, color: '#7D9B76' }} spin />} /><span style={{ color: '#8B7355', fontSize: 13 }}>思考中...</span></div></div>}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid rgba(168,198,160,0.2)', background: 'rgba(255,255,255,0.9)', display: 'flex', gap: 12, alignItems: 'flex-end', flexShrink: 0 }}>
          <Input.TextArea value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder="输入你想说的话，或描述你想搜索的图片..." autoSize={{ minRows: 1, maxRows: 4 }} style={{ flex: 1, borderRadius: '18px 18px 18px 4px', padding: '10px 16px', resize: 'none', border: '1px solid rgba(168,198,160,0.4)', background: 'rgba(255,255,255,0.9)' }} disabled={isLoading || !activeSessionId} />
          <Button type="primary" icon={<SendOutlined />} onClick={handleSend} disabled={!inputValue.trim() || isLoading || !activeSessionId} style={{ background: 'var(--gradient-leaf)', border: 'none', borderRadius: '50%', width: 44, height: 44, boxShadow: '0 4px 12px rgba(125,155,118,0.3)' }} />
        </div>

        <style>{`
          @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
          .ai-markdown-content p { margin: 0 0 8px 0; }
          .ai-markdown-content p:last-child { margin-bottom: 0; }
          .ai-markdown-content ul, .ai-markdown-content ol { margin: 4px 0; padding-left: 20px; }
          .ai-markdown-content li { margin: 2px 0; }
          .ai-markdown-content code { background: rgba(168,198,160,0.15); padding: 2px 6px; border-radius: 4px; font-size: 13px; fontFamily: monospace; }
          .ai-markdown-content pre { background: rgba(168,198,160,0.1); padding: 10px; border-radius: 8px; overflow-x: auto; margin: 8px 0; }
          .ai-markdown-content pre code { background: transparent; padding: 0; }
          .ai-markdown-content blockquote { border-left: 3px solid #A8C6A0; margin: 8px 0; padding-left: 12px; color: #6B5B4F; }
          .ai-markdown-content table { border-collapse: collapse; margin: 8px 0; font-size: 13px; }
          .ai-markdown-content th, .ai-markdown-content td { border: 1px solid rgba(168,198,160,0.3); padding: 6px 10px; }
          .ai-markdown-content th { background: rgba(168,198,160,0.15); }
        `}</style>
      </div>
    </div>
  );
};

export default AIChat;
