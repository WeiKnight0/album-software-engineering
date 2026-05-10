import React, { useState } from 'react';
import { Form, Input, Button, message, Alert } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { authAPI } from '../services/api';
import { setAccessToken } from '../services/authToken';

interface LoginProps {
  onLoginSuccess: () => void;
}

const LoginPlantDecoration: React.FC = () => (
  <svg viewBox="0 0 200 200" style={{ width: 200, height: 200, position: 'absolute', bottom: -50, right: -50, opacity: 0.1, pointerEvents: 'none' }}>
    <defs>
      <linearGradient id="loginLeafGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A8C6A0" />
        <stop offset="100%" stopColor="#7D9B76" />
      </linearGradient>
    </defs>
    <path d="M100 180 Q80 140 100 100 Q120 140 100 180" fill="none" stroke="#7D9B76" strokeWidth="2"/>
    <path d="M100 140 Q60 120 40 80 Q70 100 100 120" fill="none" stroke="#A8C6A0" strokeWidth="1.5"/>
    <path d="M100 120 Q140 100 160 60 Q130 80 100 100" fill="none" stroke="#A8C6A0" strokeWidth="1.5"/>
    <ellipse cx="40" cy="80" rx="15" ry="8" fill="url(#loginLeafGradient)" opacity="0.6"/>
    <ellipse cx="160" cy="60" rx="12" ry="6" fill="url(#loginLeafGradient)" opacity="0.6"/>
    <ellipse cx="100" cy="100" rx="20" ry="10" fill="url(#loginLeafGradient)" opacity="0.4"/>
  </svg>
);

const LeftPlantDecoration: React.FC = () => (
  <svg viewBox="0 0 150 300" style={{ position: 'absolute', bottom: -40, left: -40, width: 220, opacity: 0.08, pointerEvents: 'none' }}>
    <path d="M75 280 Q50 200 75 120 Q100 200 75 280" fill="none" stroke="#5B7B5E" strokeWidth="2.5"/>
    <path d="M75 200 Q30 160 20 100 Q50 140 75 170" fill="none" stroke="#7D9B76" strokeWidth="1.5"/>
    <path d="M75 160 Q120 120 130 60 Q100 100 75 130" fill="none" stroke="#7D9B76" strokeWidth="1.5"/>
    <path d="M75 120 Q40 80 35 30 Q60 70 75 100" fill="none" stroke="#A8C6A0" strokeWidth="1"/>
    <ellipse cx="20" cy="100" rx="18" ry="10" fill="#7D9B76" opacity="0.5"/>
    <ellipse cx="130" cy="60" rx="15" ry="8" fill="#7D9B76" opacity="0.5"/>
    <ellipse cx="35" cy="30" rx="12" ry="6" fill="#A8C6A0" opacity="0.6"/>
  </svg>
);

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [form] = Form.useForm();

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    setErrorText('');
    form.setFields([
      { name: 'username', errors: [] },
      { name: 'password', errors: [] },
    ]);
    try {
      const response = await authAPI.login(values);
      if (response.data.success) {
        const token = response.data.data.accessToken;
        setAccessToken(token);
        message.success('欢迎回来 🌿');
        onLoginSuccess();
      } else {
        const messageText = response.data.message || '登录失败';
        setErrorText(messageText);
        form.setFields([{ name: 'password', errors: [messageText] }]);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '登录失败，请检查用户名和密码';
      setErrorText(errorMsg);
      form.setFields([{ name: 'password', errors: [errorMsg] }]);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: { username: string; password: string; confirmPassword: string; email: string; nickname: string }) => {
    setLoading(true);
    setErrorText('');
    try {
      const response = await authAPI.register(values);
      if (response.data.success) {
        message.success('注册成功，请登录');
        setIsRegisterMode(false);
        form.resetFields();
      } else {
        setErrorText(response.data.message || '注册失败');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '注册失败，请重试';
      setErrorText(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--gradient-morning)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <LoginPlantDecoration />
      <LeftPlantDecoration />
      
      <div className="biophilic-card" style={{ width: 420, padding: 44, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 64,
            height: 64,
            margin: '0 auto 16px',
            background: 'var(--gradient-leaf)',
            borderRadius: '20px 20px 20px 4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(125,155,118,0.3)',
          }}>
            <EnvironmentOutlined style={{ fontSize: 32, color: 'white' }} />
          </div>
          <h1 style={{ color: '#3D5A40', marginBottom: 8, fontSize: 26, fontWeight: 600 }}>自然相册</h1>
          <p style={{ color: '#8B7355', fontSize: 14, margin: 0 }}>
            {isRegisterMode ? '创建你的自然记忆账户' : '让回忆如植物般生长'}
          </p>
        </div>

        <Form
          form={form}
          onFinish={isRegisterMode ? handleRegister : handleLogin}
          layout="vertical"
          size="large"
          onValuesChange={() => {
            if (errorText) setErrorText('')
            form.setFields([
              { name: 'username', errors: [] },
              { name: 'password', errors: [] },
            ])
          }}
        >
          {isRegisterMode && (
            <>
              <Form.Item
                name="username"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input 
                  prefix={<UserOutlined style={{ color: '#A8C6A0' }} />} 
                  placeholder="用户名" 
                  className="biophilic-input"
                />
              </Form.Item>
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input 
                  prefix={<MailOutlined style={{ color: '#A8C6A0' }} />} 
                  placeholder="邮箱" 
                  className="biophilic-input"
                />
              </Form.Item>
              <Form.Item name="nickname">
                <Input 
                  prefix={<UserOutlined style={{ color: '#A8C6A0' }} />} 
                  placeholder="昵称（可选）" 
                  className="biophilic-input"
                />
              </Form.Item>
            </>
          )}

          {!isRegisterMode && (
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input 
                prefix={<UserOutlined style={{ color: '#A8C6A0' }} />} 
                placeholder="用户名" 
                className="biophilic-input"
              />
            </Form.Item>
          )}

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password 
              prefix={<LockOutlined style={{ color: '#A8C6A0' }} />} 
              placeholder="密码" 
              className="biophilic-input"
            />
          </Form.Item>

          {isRegisterMode && (
            <Form.Item
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: '请再次输入密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) return Promise.resolve();
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#A8C6A0' }} />}
                placeholder="确认密码"
                className="biophilic-input"
              />
            </Form.Item>
          )}

          {errorText && (
            <Form.Item style={{ marginBottom: 12 }}>
              <Alert type="error" showIcon message={errorText} />
            </Form.Item>
          )}

          <Form.Item style={{ marginTop: 28 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              block 
              style={{
                background: 'var(--gradient-leaf)',
                border: 'none',
                height: 48,
                borderRadius: '20px 20px 20px 4px',
                fontSize: 16,
                fontWeight: 500,
                boxShadow: '0 4px 12px rgba(125,155,118,0.3)',
              }}
            >
              {isRegisterMode ? '注册' : '登录'}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button 
            type="link" 
            onClick={() => setIsRegisterMode(!isRegisterMode)} 
            style={{ color: '#5B7B5E', fontSize: 14 }}
          >
            {isRegisterMode ? '已有账号？立即登录' : '没有账号？立即注册'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;
