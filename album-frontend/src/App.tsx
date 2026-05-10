import React, { Suspense, lazy, useEffect, useState } from 'react';
import {
  AppstoreOutlined,
  CrownOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  MessageOutlined,
  PictureOutlined,

  SearchOutlined,
  SettingOutlined,
  SwapOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Input, message, Result } from 'antd';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { authAPI, userAPI } from './services/api';
import { clearAccessToken, setAccessToken } from './services/authToken';
import './styles/biophilic-theme.css';
import './App.css';
import AuthAvatar from './components/AuthAvatar';

const Login = lazy(() => import('./components/Login'));
const HomeDashboard = lazy(() => import('./components/HomeDashboard'));
const AIChat = lazy(() => import('./components/AIChat'));
const FaceManager = lazy(() => import('./components/FaceManager'));
const PhotoGallery = lazy(() => import('./components/PhotoGallery'));
const SmartSearch = lazy(() => import('./components/SmartSearch'));
const TransferPanel = lazy(() => import('./components/TransferPanel'));
const SettingsPanel = lazy(() => import('./components/SettingsPanel'));

const Membership = lazy(() => import('./components/Membership'));
const RecycleBin = lazy(() => import('./components/RecycleBin'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const AboutPanel = lazy(() => import('./components/AboutPanel'));

export interface AppUser {
  id: number;
  username: string;
  nickname?: string;
  email?: string;
  isMember?: boolean;
  membershipExpireAt?: string;
  storageLimit?: number;
  storageUsed?: number;
  isSuperAdmin?: boolean;
  roles?: string[];
  permissions?: string[];
  avatarFilename?: string;
}

const isAdminUser = (user: AppUser) => user.isSuperAdmin || user.roles?.includes('SUPER_ADMIN') || user.roles?.includes('ADMIN');

const LoadingScreen = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gradient-morning)' }}>
    <div style={{ textAlign: 'center' } as React.CSSProperties}>
      <div className="animate-breathe">
        <div style={{ width: 64, height: 64, margin: '0 auto 16px', background: 'var(--gradient-leaf)', borderRadius: '20px 20px 20px 4px' }} />
      </div>
      <p style={{ color: '#7D9B76' }}>正在加载你的自然记忆...</p>
    </div>
  </div>
);

const PageLoading = () => (
  <div style={{ minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ textAlign: 'center' } as React.CSSProperties}>
      <div className="animate-breathe">
        <div style={{ width: 42, height: 42, margin: '0 auto 12px', background: 'var(--gradient-leaf)', borderRadius: '16px 16px 16px 4px' }} />
      </div>
      <p style={{ color: '#7D9B76' }}>正在加载页面...</p>
    </div>
  </div>
);

const withSuspense = (element: React.ReactElement) => (
  <Suspense fallback={<PageLoading />}>
    {element}
  </Suspense>
);

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="biophilic-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Result
        status="404"
        title="页面不存在"
        subTitle="你访问的地址没有对应的页面。"
        extra={<Button type="primary" onClick={() => navigate('/', { replace: true })}>返回首页</Button>}
      />
    </div>
  );
};

const Forbidden = () => {
  const navigate = useNavigate();

  return (
    <Result
      status="403"
      title="无权访问"
      subTitle="当前账号没有管理后台权限。"
      extra={<Button type="primary" onClick={() => navigate('/')}>返回首页</Button>}
    />
  );
};

interface UserLayoutProps {
  currentUser: AppUser;
  onLogout: () => void;
}

const UserLayout: React.FC<UserLayoutProps> = ({ currentUser, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const sidebarWidth = 220;
  const isHomeActive = location.pathname === '/';

  useEffect(() => {
    if (location.pathname === '/search') {
      setSearchQuery(new URLSearchParams(location.search).get('q') || '');
    }
  }, [location.pathname, location.search]);

  const handleSearch = (value: string) => {
    const keyword = value.trim();
    if (!keyword) return;
    setSearchQuery(keyword);
    navigate(`/search?q=${encodeURIComponent(keyword)}`);
  };

  return (
    <div className="biophilic-page" style={{ display: 'flex', minHeight: '100vh' }}>
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
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(168, 198, 160, 0.2)', display: 'flex', alignItems: 'center', gap: 12, height: 64 }}>
          <AppstoreOutlined style={{ fontSize: 28, color: '#5B7B5E', flexShrink: 0 }} />
          <span style={{ fontSize: 18, fontWeight: 600, color: '#3D5A40', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            自然相册
          </span>
        </div>

        <nav className="biophilic-sidebar-nav" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 8, padding: '32px 12px 16px' }}>
          <button className={`biophilic-sidebar-item ${isHomeActive ? 'active' : ''}`} onClick={() => navigate('/')}>
            <span style={{ fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24 }}><HomeOutlined /></span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>主页</span>
          </button>
          <button className={`biophilic-sidebar-item ${location.pathname === '/chat' ? 'active' : ''}`} onClick={() => navigate('/chat')}>
            <span style={{ fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24 }}><MessageOutlined /></span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>智能问答</span>
          </button>
          <button className={`biophilic-sidebar-item ${location.pathname === '/faces' ? 'active' : ''}`} onClick={() => navigate('/faces')}>
            <span style={{ fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24 }}><TeamOutlined /></span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>人物相册</span>
          </button>
          <button className={`biophilic-sidebar-item ${['/photos', '/recycle'].includes(location.pathname) ? 'active' : ''}`} onClick={() => navigate('/photos')}>
            <span style={{ fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24 }}><PictureOutlined /></span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>图像管理</span>
          </button>
          <button className={`biophilic-sidebar-item ${location.pathname.startsWith('/transfer') ? 'active' : ''}`} onClick={() => navigate('/transfer/upload')}>
            <span style={{ fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24 }}><SwapOutlined /></span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>传输记录</span>
          </button>
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(168, 198, 160, 0.2)' }}>
          <button className={`biophilic-sidebar-item ${location.pathname === '/settings' ? 'active' : ''}`} onClick={() => navigate('/settings')}>
            <span style={{ fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24 }}><SettingOutlined /></span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>设置</span>
          </button>
          <button className={`biophilic-sidebar-item ${location.pathname === '/about' ? 'active' : ''}`} onClick={() => navigate('/about')}>
            <span style={{ fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24 }}><InfoCircleOutlined /></span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>关于产品</span>
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, marginLeft: sidebarWidth, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <header className="biophilic-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, padding: '0 28px', gap: 20 }}>
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
              style={{ background: 'var(--gradient-leaf)', border: 'none', borderRadius: '0 12px 12px 0', width: 48 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => navigate('/membership')}
              style={{
                background: currentUser.isMember ? 'linear-gradient(135deg, #7D9B76 0%, #5D7A56 100%)' : 'rgba(168, 198, 160, 0.12)',
                border: currentUser.isMember ? 'none' : '1px solid rgba(168, 198, 160, 0.3)',
                color: currentUser.isMember ? 'white' : '#3D5A40',
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
            >
              {currentUser.isMember ? <><CrownOutlined />会员</> : <>当前套餐</>}
            </button>

            <Dropdown
              menu={{
                items: [
                  { key: 'settings', label: '个人中心', icon: <SettingOutlined />, onClick: () => navigate('/settings') },
                  { key: 'logout', label: '登出', icon: <LogoutOutlined />, onClick: onLogout },
                ],
              }}
              placement="bottomRight"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(168, 198, 160, 0.12)', borderRadius: 20, cursor: 'pointer', transition: 'all 200ms ease' }}>
                <AuthAvatar size={24} hasCustomAvatar={Boolean(currentUser.avatarFilename)} icon={<UserOutlined />} style={{ background: '#7D9B76' }} />
                <span style={{ color: '#3D5A40', fontSize: 14, fontWeight: 500 }}>{currentUser.nickname || currentUser.username}</span>
              </div>
            </Dropdown>
          </div>
        </header>

        <main style={{ flex: 1, padding: location.pathname === '/chat' ? 0 : '24px 28px', overflowY: location.pathname === '/chat' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [refreshKey] = useState(0);
  const [galleryFolderId, setGalleryFolderId] = useState<number | null>(null);

  const fetchUserInfo = async () => {
    try {
      const response = await userAPI.getMe();
      if (response.data.success) {
        const user = response.data.data as AppUser;
        setCurrentUser(user);
        return user;
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
    return null;
  };

  useEffect(() => {
    setAuthLoading(true);
    authAPI.refresh()
      .then(async response => {
        const token = response.data?.data?.accessToken;
        if (!token) return null;
        setAccessToken(token);
        return fetchUserInfo();
      })
      .then(user => {
        if (user) setIsLoggedIn(true);
        else clearAccessToken();
      })
      .catch(() => clearAccessToken())
      .finally(() => setAuthLoading(false));
  }, []);

  const handleLoginSuccess = async () => {
    setAuthLoading(true);
    const user = await fetchUserInfo();
    if (user) {
      setIsLoggedIn(true);
      navigate(isAdminUser(user) ? '/admin' : '/', { replace: true });
    } else {
      message.error('登录信息获取失败，请重新登录');
      clearAccessToken();
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Local logout still succeeds if the server session is already gone.
    }
    clearAccessToken();
    setIsLoggedIn(false);
    setCurrentUser(null);
    navigate('/login', { replace: true });
    message.success('已登出');
  };

  const handleMembershipUpdated = () => {
    fetchUserInfo();
  };

  if (authLoading) return <LoadingScreen />;

  const requireLogin = (element: React.ReactElement) => {
    if (!isLoggedIn || !currentUser) return <Navigate to="/login" replace state={{ from: location }} />;
    return element;
  };

  const userShell = () => {
    if (!currentUser) return <Navigate to="/login" replace state={{ from: location }} />;
    if (isAdminUser(currentUser)) return <Navigate to="/admin" replace />;
    return <UserLayout currentUser={currentUser} onLogout={handleLogout} />;
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={isLoggedIn && currentUser ? <Navigate to={isAdminUser(currentUser) ? '/admin' : '/'} replace /> : withSuspense(<Login onLoginSuccess={handleLoginSuccess} />)}
      />
      <Route
        path="/admin/*"
        element={requireLogin(currentUser && isAdminUser(currentUser) ? withSuspense(<AdminDashboard currentUser={currentUser} onLogout={handleLogout} onUserUpdated={setCurrentUser} />) : <Forbidden />)}
      />
      <Route element={requireLogin(userShell())}>
        <Route
          index
          element={currentUser && withSuspense(
            <HomeDashboard
              userId={currentUser.id}
              refreshKey={refreshKey}
              onNavigateToChat={() => navigate('/chat')}
              onNavigateToFaces={() => navigate('/faces')}
              onNavigateToGallery={() => navigate('/photos')}
              onNavigateToTransfer={() => navigate('/transfer/upload')}
              onNavigateToRecycle={() => navigate('/recycle')}
            />
          )}
        />
        <Route path="chat" element={currentUser && withSuspense(<AIChat userId={currentUser.id} onBack={() => navigate('/')} />)} />
        <Route path="faces" element={currentUser && withSuspense(<FaceManager userId={currentUser.id} onBack={() => navigate('/')} />)} />
        <Route
          path="photos"
          element={currentUser && withSuspense(
            <PhotoGallery
              userId={currentUser.id}
              folderId={galleryFolderId}
              refreshKey={refreshKey}
              onBack={() => {
                setGalleryFolderId(null);
                navigate('/');
              }}
              onNavigateToTransfer={() => navigate('/transfer/upload')}
              onNavigateToRecycle={() => navigate('/recycle')}
            />
          )}
        />
        <Route path="recycle" element={currentUser && withSuspense(<RecycleBin userId={currentUser.id} onBack={() => navigate('/photos')} />)} />
        <Route path="search" element={currentUser && withSuspense(<SmartSearch userId={currentUser.id} initialQuery={new URLSearchParams(location.search).get('q') || ''} onBack={() => navigate('/')} />)} />
        <Route path="transfer" element={<Navigate to="/transfer/upload" replace />} />
        <Route path="transfer/:tab" element={currentUser && withSuspense(<TransferPanel userId={currentUser.id} folderId={galleryFolderId} />)} />
        <Route path="settings" element={currentUser && withSuspense(<SettingsPanel user={currentUser} onUserUpdated={setCurrentUser} />)} />
        <Route path="membership" element={currentUser && withSuspense(<Membership userId={currentUser.id} isMember={currentUser.isMember} onMembershipUpdated={handleMembershipUpdated} />)} />

        <Route path="about" element={withSuspense(<AboutPanel />)} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
