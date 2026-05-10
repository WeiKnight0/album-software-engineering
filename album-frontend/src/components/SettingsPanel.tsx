import React, { useEffect } from 'react';
import { Avatar, Button, Form, Input, message, Space, Upload } from 'antd';
import { LockOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { userAPI } from '../services/api';
import type { AppUser } from '../App';

interface SettingsPanelProps {
  user: AppUser;
  onUserUpdated: (user: AppUser) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ user, onUserUpdated }) => {
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    profileForm.setFieldsValue({
      nickname: user.nickname || '',
      email: user.email || '',
    });
  }, [profileForm, user]);

  const updateProfile = async () => {
    const values = await profileForm.validateFields();
    const response = await userAPI.updateMe(values);
    const nextUser = response.data.data as AppUser;
    onUserUpdated(nextUser);
    message.success('个人资料已保存');
  };

  const updatePassword = async () => {
    const values = await passwordForm.validateFields();
    await userAPI.updatePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    passwordForm.resetFields();
    message.success('密码已修改');
  };

  const uploadAvatar = async (file: File) => {
    const response = await userAPI.uploadAvatar(file);
    const nextUser = response.data.data as AppUser;
    onUserUpdated(nextUser);
    message.success('头像已更新');
    return false;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, maxWidth: 980 }}>
      <div className="biophilic-card" style={{ padding: 32 }}>
        <h2 style={{ color: '#3D5A40', fontSize: 22, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <SettingOutlined /> 账号设置
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Avatar size={72} src={user.avatarFilename ? userAPI.getAvatarUrl() : userAPI.getDefaultAvatarUrl()} icon={<UserOutlined />} style={{ background: '#7D9B76' }} />
          <div>
            <Upload showUploadList={false} accept="image/jpeg,image/png,image/webp" beforeUpload={uploadAvatar}>
              <Button>上传头像</Button>
            </Upload>
            <div style={{ color: '#8B7355', fontSize: 12, marginTop: 6 }}>支持 JPG、PNG、WEBP，最大 2MB</div>
          </div>
        </div>

        <Form form={profileForm} layout="vertical">
          <Form.Item name="nickname" label="昵称" rules={[{ max: 50, message: '昵称不能超过 50 个字符' }]}>
            <Input prefix={<UserOutlined />} placeholder="设置你的昵称" />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效邮箱' }]}>
            <Input placeholder="用于账号联系和通知" />
          </Form.Item>
          <Button type="primary" onClick={updateProfile} style={{ background: 'var(--gradient-leaf)', border: 'none' }}>
            保存资料
          </Button>
        </Form>
      </div>

      <div className="biophilic-card" style={{ padding: 32 }}>
        <h2 style={{ color: '#3D5A40', fontSize: 22, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <LockOutlined /> 修改密码
        </h2>

        <Form form={passwordForm} layout="vertical">
          <Form.Item name="currentPassword" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
            <Input.Password placeholder="输入当前密码" />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '新密码至少 6 位' }]}>
            <Input.Password placeholder="输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="再次输入新密码" />
          </Form.Item>
          <Space>
            <Button type="primary" onClick={updatePassword} style={{ background: 'var(--gradient-leaf)', border: 'none' }}>
              修改密码
            </Button>
            <Button onClick={() => passwordForm.resetFields()}>清空</Button>
          </Space>
        </Form>
      </div>
    </div>
  );
};

export default SettingsPanel;
