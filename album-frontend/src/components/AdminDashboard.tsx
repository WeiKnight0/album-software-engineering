import React, { useEffect, useState } from 'react';
import { Button, Card, Checkbox, Form, Input, message, Modal, Select, Space, Statistic, Switch, Table, Tabs, Tag } from 'antd';
import { LogoutOutlined, ReloadOutlined, DownloadOutlined, UserAddOutlined } from '@ant-design/icons';
import { adminAPI } from '../services/api';
import type { AppUser } from '../App';

interface AdminDashboardProps {
  currentUser: AppUser;
  onLogout: () => void;
}

interface AdminUser {
  id: number;
  username: string;
  email: string;
  nickname?: string;
  status: number;
  isMember: boolean;
  isSuperAdmin: boolean;
  storageUsed: number;
  storageLimit: number;
  roles: string[];
}

interface AdminRole {
  id: number;
  code: string;
  name: string;
  description?: string;
  status: number;
  permissions: string[];
}

interface AdminPermission {
  id: number;
  code: string;
  name: string;
  module: string;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('zh-CN');
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onLogout }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [ragLogs, setRagLogs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [uploadTasks, setUploadTasks] = useState<any[]>([]);
  const [downloadTasks, setDownloadTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

  const isSuperAdmin = currentUser.isSuperAdmin || currentUser.roles?.includes('SUPER_ADMIN');
  const can = (permission: string) => isSuperAdmin || currentUser.permissions?.includes(permission);
  const canViewUsers = can('user:view');
  const canCreateUsers = can('user:create');
  const canUpdateUsers = can('user:update');
  const canViewRoles = can('role:view');
  const canAssignRoles = can('role:assign');
  const canViewLogs = can('log:view');
  const canExportLogs = can('log:export');
  const canViewTasks = can('task:view');
  const canExportTasks = can('task:export');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, permissionsRes, logsRes, auditRes, uploadRes, downloadRes] = await Promise.all([
        canViewUsers ? adminAPI.getUsers() : Promise.resolve({ data: { data: [] } }),
        canViewRoles ? adminAPI.getRoles() : Promise.resolve({ data: { data: [] } }),
        canViewRoles ? adminAPI.getPermissions() : Promise.resolve({ data: { data: [] } }),
        canViewLogs ? adminAPI.getRagLogs() : Promise.resolve({ data: { data: [] } }),
        canViewLogs ? adminAPI.getAuditLogs() : Promise.resolve({ data: { data: [] } }),
        canViewTasks ? adminAPI.getUploadTasks() : Promise.resolve({ data: { data: [] } }),
        canViewTasks ? adminAPI.getDownloadTasks() : Promise.resolve({ data: { data: [] } }),
      ]);
      setUsers(usersRes.data.data || []);
      setRoles(rolesRes.data.data || []);
      setPermissions(permissionsRes.data.data || []);
      setRagLogs(logsRes.data.data || []);
      setAuditLogs(auditRes.data.data || []);
      setUploadTasks(uploadRes.data.data || []);
      setDownloadTasks(downloadRes.data.data || []);
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载管理数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const createUser = async () => {
    if (!canCreateUsers) return;
    const values = await form.validateFields();
    await adminAPI.createUser(values);
    message.success('用户创建成功');
    setCreateOpen(false);
    form.resetFields();
    loadAll();
  };

  const exportFile = async (type: 'rag' | 'audit' | 'upload' | 'download') => {
    if ((type === 'rag' || type === 'audit') && !canExportLogs) return;
    if ((type === 'upload' || type === 'download') && !canExportTasks) return;
    const response = type === 'rag'
      ? await adminAPI.exportRagLogs()
      : type === 'audit'
        ? await adminAPI.exportAuditLogs()
      : type === 'upload'
        ? await adminAPI.exportUploadTasks()
        : await adminAPI.exportDownloadTasks();
    downloadBlob(response.data, `${type}-export.csv`);
  };

  const updateRolePermissions = async (roleId: number, nextPermissions: string[]) => {
    if (!isSuperAdmin || !canAssignRoles) return;
    await adminAPI.updateRolePermissions(roleId, nextPermissions);
    message.success('角色权限已更新');
    loadAll();
  };

  const userColumns = [
    { title: '用户名', dataIndex: 'username' },
    { title: '邮箱', dataIndex: 'email' },
    {
      title: '角色', dataIndex: 'roles', render: (roles: string[], record: AdminUser) => (
        <Space wrap>
          {record.isSuperAdmin && <Tag color="red">SUPER_ADMIN</Tag>}
          {roles?.map(role => <Tag key={role} color={role === 'ADMIN' ? 'blue' : 'green'}>{role}</Tag>)}
        </Space>
      )
    },
    {
      title: '状态', dataIndex: 'status', render: (_: number, record: AdminUser) => (
        <Switch
          checked={record.status === 1}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          disabled={!canUpdateUsers || record.isSuperAdmin}
          onChange={(checked) => adminAPI.updateStatus(record.id, checked ? 1 : 0).then(loadAll)}
        />
      )
    },
    {
      title: '会员', dataIndex: 'isMember', render: (_: boolean, record: AdminUser) => (
        <Switch disabled={!canUpdateUsers} checked={record.isMember} onChange={(checked) => adminAPI.updateMembership(record.id, checked).then(loadAll)} />
      )
    },
    {
      title: '角色分配', render: (_: unknown, record: AdminUser) => (
        <Select
          value={record.roles?.includes('ADMIN') ? 'ADMIN' : 'USER'}
          style={{ width: 120 }}
          disabled={!isSuperAdmin || !canAssignRoles || record.isSuperAdmin}
          onChange={(role) => adminAPI.updateRoles(record.id, [role]).then(loadAll)}
          options={[{ label: '普通用户', value: 'USER' }, { label: '管理员', value: 'ADMIN' }]}
        />
      )
    }
  ];

  const logColumns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '类型', dataIndex: 'operationType' },
    { title: '用户ID', dataIndex: 'userId' },
    { title: '图片ID', dataIndex: 'imageId' },
    { title: '耗时(ms)', dataIndex: 'totalTimeMs' },
    { title: '结果数', dataIndex: 'resultCount' },
    { title: '错误', dataIndex: 'errorMessage', ellipsis: true },
    { title: '时间', dataIndex: 'createdAt', render: (value: string) => formatDateTime(value) }
  ];

  const auditColumns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '管理员', dataIndex: 'operatorUsername' },
    { title: '动作', dataIndex: 'action' },
    { title: '目标类型', dataIndex: 'targetType' },
    { title: '目标ID', dataIndex: 'targetId' },
    { title: '详情', dataIndex: 'detail', ellipsis: true },
    { title: '时间', dataIndex: 'createdAt', render: (value: string) => formatDateTime(value) }
  ];

  const taskColumns = [
    { title: '任务ID', dataIndex: 'id', ellipsis: true },
    { title: '用户ID', dataIndex: 'userId' },
    { title: '名称', dataIndex: 'taskName' },
    { title: '文件数', dataIndex: 'totalFiles' },
    { title: '大小', dataIndex: 'totalSize' },
    { title: '状态', dataIndex: 'status' },
    { title: '创建时间', dataIndex: 'createdAt', render: (value: string) => formatDateTime(value) }
  ];

  const roleColumns = [
    { title: '角色', dataIndex: 'name' },
    { title: '编码', dataIndex: 'code', render: (code: string) => <Tag color={code === 'SUPER_ADMIN' ? 'red' : code === 'ADMIN' ? 'blue' : 'green'}>{code}</Tag> },
    { title: '说明', dataIndex: 'description' },
    {
      title: '权限', render: (_: unknown, record: AdminRole) => (
        <Checkbox.Group
          value={record.permissions}
          disabled={!isSuperAdmin || !canAssignRoles || record.code === 'SUPER_ADMIN'}
          options={permissions.map(permission => ({
            label: `${permission.name} (${permission.code})`,
            value: permission.code,
          }))}
          onChange={(values) => updateRolePermissions(record.id, values as string[])}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}
        />
      )
    }
  ];

  const tabItems = [
    canViewUsers ? {
      key: 'users',
      label: '用户管理',
      children: <Card
        title="用户账号与权限"
        extra={canCreateUsers ? <Button type="primary" icon={<UserAddOutlined />} onClick={() => setCreateOpen(true)}>创建用户</Button> : null}
      >
        <Table rowKey="id" loading={loading} dataSource={users} columns={userColumns} scroll={{ x: 900 }} />
      </Card>
    } : null,
    canViewRoles ? {
      key: 'roles',
      label: '角色权限',
      children: <Card title="角色权限配置" extra={(!isSuperAdmin || !canAssignRoles) && <Tag color="orange">仅超级管理员可修改</Tag>}>
        <Table rowKey="id" loading={loading} dataSource={roles} columns={roleColumns} pagination={false} scroll={{ x: 1000 }} />
      </Card>
    } : null,
    canViewLogs ? {
      key: 'logs',
      label: '日志中心',
      children: <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card title="管理员审计日志" extra={canExportLogs ? <Button icon={<DownloadOutlined />} onClick={() => exportFile('audit')}>导出 CSV</Button> : null}>
          <Table rowKey="id" loading={loading} dataSource={auditLogs} columns={auditColumns} scroll={{ x: 1000 }} />
        </Card>
        <Card title="RAG 性能日志" extra={canExportLogs ? <Button icon={<DownloadOutlined />} onClick={() => exportFile('rag')}>导出 CSV</Button> : null}>
          <Table rowKey="id" loading={loading} dataSource={ragLogs} columns={logColumns} scroll={{ x: 1000 }} />
        </Card>
      </Space>
    } : null,
    canViewTasks ? {
      key: 'tasks',
      label: '任务中心',
      children: <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card title="上传任务" extra={canExportTasks ? <Button icon={<DownloadOutlined />} onClick={() => exportFile('upload')}>导出 CSV</Button> : null}>
          <Table rowKey="id" loading={loading} dataSource={uploadTasks} columns={taskColumns} scroll={{ x: 900 }} />
        </Card>
        <Card title="下载任务" extra={canExportTasks ? <Button icon={<DownloadOutlined />} onClick={() => exportFile('download')}>导出 CSV</Button> : null}>
          <Table rowKey="id" loading={loading} dataSource={downloadTasks} columns={taskColumns} scroll={{ x: 900 }} />
        </Card>
      </Space>
    } : null,
  ].filter(Boolean) as any[];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fb' }}>
      <header style={{ height: 64, background: '#111827', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>相册管理后台</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>{currentUser.nickname || currentUser.username}</div>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadAll}>刷新</Button>
          <Button icon={<LogoutOutlined />} onClick={onLogout}>登出</Button>
        </Space>
      </header>

      <main style={{ padding: 28, maxWidth: 1440, margin: '0 auto' }}>
        <Space style={{ marginBottom: 20 }} size="large" wrap>
          {canViewUsers && <Card><Statistic title="用户总数" value={users.length} /></Card>}
          {canViewUsers && <Card><Statistic title="管理员" value={users.filter(user => user.roles?.includes('ADMIN') || user.isSuperAdmin).length} /></Card>}
          {canViewTasks && <Card><Statistic title="上传任务" value={uploadTasks.length} /></Card>}
          {canViewTasks && <Card><Statistic title="下载任务" value={downloadTasks.length} /></Card>}
        </Space>

        {tabItems.length > 0 ? <Tabs items={tabItems} /> : <Card>当前账号没有可用的后台查看权限。</Card>}
      </main>

      <Modal title="创建用户" open={createOpen} onOk={createUser} onCancel={() => setCreateOpen(false)} okText="创建" cancelText="取消">
        <Form form={form} layout="vertical" initialValues={{ role: 'USER' }}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}><Input /></Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}><Input.Password /></Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效邮箱' }]}><Input /></Form.Item>
          <Form.Item name="nickname" label="昵称"><Input /></Form.Item>
          <Form.Item name="role" label="角色">
            <Select disabled={!isSuperAdmin} options={[{ label: '普通用户', value: 'USER' }, { label: '管理员', value: 'ADMIN' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
