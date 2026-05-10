import React, { useState, useEffect } from 'react';
import {
  HomeOutlined,
  SwapOutlined,
  SettingOutlined,
  SearchOutlined,
  UserOutlined,
  CrownOutlined,
  LogoutOutlined,
  AppstoreOutlined,
  ProfileOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { Avatar, Input, Button, message, Dropdown } from 'antd';
import Login from './components/Login';
import HomeDashboard from './components/HomeDashboard';
import AIChat from './components/AIChat';
import FaceManager from './components/FaceManager';
import PhotoGallery from './components/PhotoGallery';
import SmartSearch from './components/SmartSearch';
import TransferPanel from './components/TransferPanel';
import SettingsPanel from './components/SettingsPanel';
import ProfilePanel from './components/ProfilePanel';
import Membership from './components/Membership';
import RecycleBin from './components/RecycleBin';
import AdminDashboard from './components/AdminDashboard';
import AboutPanel from './components/AboutPanel';
import { userAPI } from './services/api';
import './styles/biophilic-theme.css';
import './App.css';

export interface AppUser {
  id: number;
  username: string;
  nickname?: string;
  email?: string;
  isMember?: boolean;
  membershipExpireAt?: string;
  storageLimit?: number;
  isSuperAdmin?: boolean;
  roles?: string[];
  permissions?: string[];
  avatarFilename?: string;
}

export type AppView = 'home' | 'chat' | 'faces' | 'gallery' | 'recycle' | 'search' | 'transfer' | 'settings' | 'membership' | 'profile' | 'about';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [activeView, setActiveView] = useState<AppView>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey] = useState(0);
  const [galleryFolderId, setGalleryFolderId] = useState<number | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const fetchUserInfo = async () => {
    try {
      const response = await userAPI.getMe();
      if (response.data.success) {
        const user = response.data.data as AppUser;
        setCurrentUser(user);
        return true;
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
    return false;
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setAuthLoading(true);
      fetchUserInfo().then(ok => {
        if (ok) setIsLoggedIn(true);
        else localStorage.removeItem('token');
        setAuthLoading(false);
      });
    }
  }, []);

  const handleLoginSuccess = async () => {
    setAuthLoading(true);
    const ok = await fetchUserInfo();
    if (ok) {
      setIsLoggedIn(true);
    } else {
      message.error('登录信息获取失败，请重新登录');
      localStorage.removeItem('token');
    }
    setAuthLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setCurrentUser(null);
    message.success('已登出');
  };

  const handleMembershipUpdated = () => {
    fetchUserInfo();
  };

  const handleSearch = (value: string) => {
    if (value.trim()) {
      setSearchQuery(value.trim());
      setActiveView('search');
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gradient-morning)' }}>
        <div style={{ textAlign: 'center' } as React.CSSProperties}>
          <div className="animate-breathe">
            <div style={{ width: 64, height: 64, margin: '0 auto 16px', background: 'var(--gradient-leaf)', borderRadius: '20px 20px 20px 4px' }} />
          </div>
          <p style={{ color: '#7D9B76' }}>正在加载你的自然记忆...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = currentUser.isSuperAdmin || currentUser.roles?.includes('SUPER_ADMIN') || currentUser.roles?.includes('ADMIN');

  if (isAdmin) {
    return <AdminDashboard currentUser={currentUser} onLogout={handleLogout} onUserUpdated={setCurrentUser} />;
  }

  const sidebarWidth = 220;
  const isHomeActive = activeView === 'home' || activeView === 'chat' || activeView === 'faces' || activeView === 'gallery' || activeView === 'recycle';

  return (
    <div className="biophilic-page" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <aside
        className="biophilic-sidebar"
        style={{
          width: sidebarWidth,
          flexShrink: 0,
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100vh',
          zIndex: 101,
        }}
      >
        {/* Logo */}
        <div style={{
          padding: '20px 16px',
          borderBottom: '1px solid rgba(168, 198, 160, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          height: 64,
        }}>
          <AppstoreOutlined style={{ fontSize: 28, color: '#5B7B5E', flexShrink: 0 }} />
          <span style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#3D5A40',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}>
            自然相册
          </span>
        </div>

        {/* 导航 */}
        <nav className="biophilic-sidebar-nav" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 8, padding: '32px 12px 16px' }}>
          <button
            className={`biophilic-sidebar-item ${isHomeActive ? 'active' : ''}`}
            onClick={() => setActiveView('home')}
          >
            <span style={{ fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24 }}>
              <HomeOutlined />
            </span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              主页
            </span>
          </button>
          <button
            className={`biophilic-sidebar-item ${activeView === 'transfer' ? 'active' : ''}`}
            onClick={() => setActiveView('transfer')}
          >
            <span style={{ fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24 }}>
              <SwapOutlined />
            </span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              传输记录
            </span>
          </button>
        </nav>

        {/* 设置 */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(168, 198, 160, 0.2)',
        }}>
          <button
            className={`biophilic-sidebar-item ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveView('settings')}
          >
            <span style={{ fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24 }}>
              <SettingOutlined />
            </span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              设置
            </span>
          </button>
          <button
            className={`biophilic-sidebar-item ${activeView === 'about' ? 'active' : ''}`}
            onClick={() => setActiveView('about')}
          >
            <span style={{ fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24 }}>
              <InfoCircleOutlined />
            </span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              关于我们
            </span>
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <div style={{
        flex: 1,
        marginLeft: sidebarWidth,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
        {/* 顶部 Header */}
        <header className="biophilic-header" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
          padding: '0 28px',
          gap: 20,
        }}>
          {/* 搜索框 */}
          <div style={{ flex: 1, maxWidth: 600, display: 'flex', gap: 8 }}>
            <Input
              placeholder="搜索照片、人物..."
              allowClear
              size="large"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onPressEnter={(e) => handleSearch((e.target as HTMLInputElement).value)}
              style={{ flex: 1 }}
            />
            <Button
              type="primary"
              size="large"
              icon={<SearchOutlined style={{ color: '#fff' }} />}
              onClick={() => handleSearch(searchQuery)}
              style={{
                background: 'var(--gradient-leaf)',
                border: 'none',
                borderRadius: '0 12px 12px 0',
                width: 48,
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* 套餐 / 会员状态 */}
            <button
              onClick={() => setActiveView('membership')}
              style={{
                background: currentUser?.isMember
                  ? 'linear-gradient(135deg, #7D9B76 0%, #5D7A56 100%)'
                  : 'rgba(168, 198, 160, 0.12)',
                border: currentUser?.isMember ? 'none' : '1px solid rgba(168, 198, 160, 0.3)',
                color: currentUser?.isMember ? 'white' : '#3D5A40',
                padding: '6px 14px',
                borderRadius: 14,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 200ms ease',
              }}
              onMouseEnter={e => {
                if (currentUser?.isMember) {
                  e.currentTarget.style.filter = 'brightness(1.1)';
                } else {
                  e.currentTarget.style.background = 'rgba(168, 198, 160, 0.2)';
                }
              }}
              onMouseLeave={e => {
                if (currentUser?.isMember) {
                  e.currentTarget.style.filter = 'brightness(1)';
                } else {
                  e.currentTarget.style.background = 'rgba(168, 198, 160, 0.12)';
                }
              }}
            >
              {currentUser?.isMember ? (
                <>
                  <CrownOutlined />
                  会员
                </>
              ) : (
                <>当前套餐</>
              )}
            </button>

            {/* 用户下拉 */}
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'profile',
                    label: '个人信息',
                    icon: <ProfileOutlined />,
                    onClick: () => setActiveView('profile'),
                  },
                  {
                    key: 'logout',
                    label: '登出',
                    icon: <LogoutOutlined />,
                    onClick: handleLogout,
                  },
                ],
              }}
              placement="bottomRight"
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                background: 'rgba(168, 198, 160, 0.12)',
                borderRadius: 20,
                cursor: 'pointer',
                transition: 'all 200ms ease',
              }}>
                <Avatar size={24} src={currentUser.avatarFilename ? userAPI.getAvatarUrl() : userAPI.getDefaultAvatarUrl()} icon={<UserOutlined />} style={{ background: '#7D9B76' }} />
                <span style={{ color: '#3D5A40', fontSize: 14, fontWeight: 500 }}>
                  {currentUser?.nickname || currentUser?.username}
                </span>
              </div>
            </Dropdown>
          </div>
        </header>

        {/* 内容区域 */}
        <main style={{
          flex: 1,
          padding: activeView === 'chat' ? 0 : '24px 28px',
          overflowY: activeView === 'chat' ? 'hidden' : 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {activeView === 'home' && (
            <HomeDashboard
              userId={currentUser.id}
              refreshKey={refreshKey}
              onNavigateToChat={() => setActiveView('chat')}
              onNavigateToFaces={() => setActiveView('faces')}
              onNavigateToGallery={() => setActiveView('gallery')}
            />
          )}
          {activeView === 'chat' && (
            <AIChat userId={currentUser.id} onBack={() => setActiveView('home')} />
          )}
          {activeView === 'faces' && (
            <FaceManager userId={currentUser.id} onBack={() => setActiveView('home')} />
          )}
          {activeView === 'gallery' && (
            <PhotoGallery
              userId={currentUser.id}
              folderId={galleryFolderId}
              refreshKey={refreshKey}
              onBack={() => {
                setGalleryFolderId(null);
                setActiveView('home');
              }}
              onNavigateToTransfer={() => setActiveView('transfer')}
              onNavigateToRecycle={() => setActiveView('recycle')}
            />
          )}
          {activeView === 'recycle' && (
            <RecycleBin userId={currentUser.id} onBack={() => setActiveView('gallery')} />
          )}
          {activeView === 'search' && (
            <SmartSearch
              userId={currentUser.id}
              initialQuery={searchQuery}
              onBack={() => setActiveView('home')}
            />
          )}
          {activeView === 'transfer' && (
            <TransferPanel userId={currentUser.id} folderId={galleryFolderId} />
          )}
          {activeView === 'settings' && (
            <SettingsPanel user={currentUser} onUserUpdated={setCurrentUser} />
          )}
          {activeView === 'membership' && (
            <Membership
              userId={currentUser.id}
              isMember={currentUser.isMember}
              onMembershipUpdated={handleMembershipUpdated}
            />
          )}
          {activeView === 'profile' && (
            <ProfilePanel user={currentUser} />
          )}
          {activeView === 'about' && (
            <AboutPanel />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
