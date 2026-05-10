import React, { useEffect, useState } from 'react';
import { Avatar, Button, Card, Checkbox, Form, Input, message, Modal, Select, Space, Statistic, Switch, Table, Tabs, Tag } from 'antd';
import { LogoutOutlined, ReloadOutlined, DownloadOutlined, UserAddOutlined, UserOutlined } from '@ant-design/icons';
import { adminAPI, userAPI } from '../services/api';
import type { AppUser } from '../App';
import SettingsPanel from './SettingsPanel';

interface AdminDashboardProps {
  currentUser: AppUser;
  onLogout: () => void;
  onUserUpdated: (user: AppUser) => void;
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
  avatarFilename?: string;
  roles: string[];
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

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onLogout, onUserUpdated }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [ragLogs, setRagLogs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [uploadTasks, setUploadTasks] = useState<any[]>([]);
  const [downloadTasks, setDownloadTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [auditKeyword, setAuditKeyword] = useState('');
  const [auditAction, setAuditAction] = useState<string | undefined>();
  const [ragKeyword, setRagKeyword] = useState('');
  const [ragOperation, setRagOperation] = useState<string | undefined>();
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);
  const [selectedAdminPermissions, setSelectedAdminPermissions] = useState<string[]>([]);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [auditPageSize, setAuditPageSize] = useState(10);
  const [ragPageSize, setRagPageSize] = useState(10);
  const [uploadPageSize, setUploadPageSize] = useState(10);
  const [downloadPageSize, setDownloadPageSize] = useState(10);
  const [auditCategory, setAuditCategory] = useState<string | undefined>();
  const [auditLevel, setAuditLevel] = useState<string | undefined>();
  const [uploadTaskKeyword, setUploadTaskKeyword] = useState('');
  const [downloadTaskKeyword, setDownloadTaskKeyword] = useState('');
  const [uploadTaskStatus, setUploadTaskStatus] = useState<number | undefined>();
  const [downloadTaskStatus, setDownloadTaskStatus] = useState<number | undefined>();
  const [adminKeyword, setAdminKeyword] = useState('');
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
      const [usersRes, permissionsRes, logsRes, auditRes, uploadRes, downloadRes] = await Promise.all([
        canViewUsers ? adminAPI.getUsers() : Promise.resolve({ data: { data: [] } }),
        canViewRoles ? adminAPI.getPermissions() : Promise.resolve({ data: { data: [] } }),
        canViewLogs ? adminAPI.getRagLogs() : Promise.resolve({ data: { data: [] } }),
        canViewLogs ? adminAPI.getAuditLogs() : Promise.resolve({ data: { data: [] } }),
        canViewTasks ? adminAPI.getUploadTasks() : Promise.resolve({ data: { data: [] } }),
        canViewTasks ? adminAPI.getDownloadTasks() : Promise.resolve({ data: { data: [] } }),
      ]);
      setUsers(usersRes.data.data || []);
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

  const adminUsers = users.filter(user => user.isSuperAdmin || user.roles?.includes('ADMIN') || user.roles?.includes('SUPER_ADMIN'));
  const editableAdmins = adminUsers.filter(user => !user.isSuperAdmin && user.roles?.includes('ADMIN'));
  const filteredEditableAdmins = editableAdmins.filter(user => {
    const keyword = adminKeyword.trim().toLowerCase();
    if (!keyword) return true;
    return [user.username, user.nickname, user.email].some(value => String(value || '').toLowerCase().includes(keyword));
  });
  const selectedAdmin = editableAdmins.find(user => user.id === selectedAdminId) || null;

  const loadUserPermissions = async (userId: number) => {
    setSelectedAdminId(userId);
    setPermissionLoading(true);
    try {
      const response = await adminAPI.getUserPermissions(userId);
      setSelectedAdminPermissions(response.data.data || []);
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载管理员权限失败');
    } finally {
      setPermissionLoading(false);
    }
  };

  const saveUserPermissions = async () => {
    if (!selectedAdminId || !isSuperAdmin || !canAssignRoles) return;
    await adminAPI.updateUserPermissions(selectedAdminId, selectedAdminPermissions);
    message.success('管理员权限已更新');
    loadAll();
  };

  const roleLabel = (record: AdminUser) => {
    if (record.isSuperAdmin || record.roles?.includes('SUPER_ADMIN')) return <Tag color="red">超级管理员</Tag>;
    if (record.roles?.includes('ADMIN')) return <Tag color="blue">管理员</Tag>;
    return <Tag color="green">普通用户</Tag>;
  };

  const auditActions = Array.from(new Set(auditLogs.map(log => log.action).filter(Boolean))).sort();
  const auditCategories = Array.from(new Set(auditLogs.map(log => log.category).filter(Boolean))).sort();
  const auditLevels = Array.from(new Set(auditLogs.map(log => log.level).filter(Boolean))).sort();
  const ragOperations = Array.from(new Set(ragLogs.map(log => log.operationType).filter(Boolean))).sort();
  const filteredAuditLogs = auditLogs.filter(log => {
    if (auditAction && log.action !== auditAction) return false;
    if (auditCategory && log.category !== auditCategory) return false;
    if (auditLevel && log.level !== auditLevel) return false;
    const keyword = auditKeyword.trim().toLowerCase();
    if (!keyword) return true;
    return [log.operatorUsername, log.action, log.targetType, log.targetId, log.detail]
      .some(value => String(value || '').toLowerCase().includes(keyword));
  });
  const filteredRagLogs = ragLogs.filter(log => {
    if (ragOperation && log.operationType !== ragOperation) return false;
    const keyword = ragKeyword.trim().toLowerCase();
    if (!keyword) return true;
    return [log.operationType, log.userId, log.imageId, log.errorMessage]
      .some(value => String(value || '').toLowerCase().includes(keyword));
  });
  const filterTasks = (tasks: any[], keyword: string, status?: number) => tasks.filter(task => {
    if (status !== undefined && task.status !== status) return false;
    const text = keyword.trim().toLowerCase();
    if (!text) return true;
    return [task.id, task.userId, task.taskName]
      .some(value => String(value || '').toLowerCase().includes(text));
  });
  const filteredUploadTasks = filterTasks(uploadTasks, uploadTaskKeyword, uploadTaskStatus);
  const filteredDownloadTasks = filterTasks(downloadTasks, downloadTaskKeyword, downloadTaskStatus);
  const tablePagination = (pageSize: number, setPageSize: (size: number) => void) => ({
    pageSize,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50],
    showTotal: (total: number) => `共 ${total} 条`,
    onShowSizeChange: (_current: number, size: number) => setPageSize(size),
  });

  const userColumns = [
    { title: '用户名', dataIndex: 'username' },
    { title: '邮箱', dataIndex: 'email' },
    {
      title: '角色', dataIndex: 'roles', render: (_roles: string[], record: AdminUser) => roleLabel(record)
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
    { title: '等级', dataIndex: 'level', render: (level: string) => <Tag color={level === 'ERROR' ? 'red' : level === 'WARN' ? 'orange' : level === 'SECURITY' ? 'purple' : 'blue'}>{level || 'INFO'}</Tag> },
    { title: '分类', dataIndex: 'category' },
    { title: '结果', dataIndex: 'success', render: (success: boolean) => <Tag color={success === false ? 'red' : 'green'}>{success === false ? '失败' : '成功'}</Tag> },
    { title: '管理员', dataIndex: 'operatorUsername' },
    { title: '动作', dataIndex: 'action' },
    { title: '目标类型', dataIndex: 'targetType' },
    { title: '目标ID', dataIndex: 'targetId' },
    { title: '详情', dataIndex: 'detail', ellipsis: true },
    { title: 'IP', dataIndex: 'ipAddress' },
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

  const taskStatusOptions = [
    { label: '等待中', value: 1 },
    { label: '进行中', value: 2 },
    { label: '已完成', value: 3 },
    { label: '已取消', value: 4 },
    { label: '已暂停', value: 5 },
  ];

  const auditLogTabs = [
    { key: 'all', label: '全部日志', category: undefined },
    { key: 'system', label: '系统日志', category: 'SYSTEM' },
    { key: 'auth', label: '登录日志', category: 'AUTH' },
    { key: 'user', label: '用户日志', category: 'USER' },
    { key: 'permission', label: '权限日志', category: 'PERMISSION' },
    { key: 'task', label: '任务日志', category: 'TASK' },
  ].map(tab => ({
    key: tab.key,
    label: tab.label,
    children: <>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search allowClear placeholder="搜索管理员、动作、目标或详情" style={{ width: 280 }} value={auditKeyword} onChange={e => setAuditKeyword(e.target.value)} />
        <Select allowClear placeholder="按等级筛选" style={{ width: 160 }} value={auditLevel} onChange={setAuditLevel} options={auditLevels.map(level => ({ label: level, value: level }))} />
        <Select allowClear placeholder="按动作筛选" style={{ width: 220 }} value={auditAction} onChange={setAuditAction} options={auditActions.map(action => ({ label: action, value: action }))} />
        {!tab.category && <Select allowClear placeholder="按分类筛选" style={{ width: 180 }} value={auditCategory} onChange={setAuditCategory} options={auditCategories.map(category => ({ label: category, value: category }))} />}
        <Button onClick={() => { setAuditKeyword(''); setAuditAction(undefined); setAuditCategory(undefined); setAuditLevel(undefined); }}>清空筛选</Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={(tab.category ? filteredAuditLogs.filter(log => log.category === tab.category) : filteredAuditLogs)}
        columns={auditColumns}
        pagination={tablePagination(auditPageSize, setAuditPageSize)}
        scroll={{ x: 1300 }}
      />
    </>
  }));

  const taskTabs = [
    {
      key: 'upload',
      label: '上传任务',
      children: <Card title="上传任务" extra={canExportTasks ? <Button icon={<DownloadOutlined />} onClick={() => exportFile('upload')}>导出 CSV</Button> : null}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search allowClear placeholder="搜索任务名、任务ID或用户ID" style={{ width: 280 }} value={uploadTaskKeyword} onChange={e => setUploadTaskKeyword(e.target.value)} />
          <Select allowClear placeholder="按状态筛选" style={{ width: 160 }} value={uploadTaskStatus} onChange={setUploadTaskStatus} options={taskStatusOptions} />
          <Button onClick={() => { setUploadTaskKeyword(''); setUploadTaskStatus(undefined); }}>清空筛选</Button>
        </Space>
        <Table rowKey="id" loading={loading} dataSource={filteredUploadTasks} columns={taskColumns} pagination={tablePagination(uploadPageSize, setUploadPageSize)} scroll={{ x: 900 }} />
      </Card>,
    },
    {
      key: 'download',
      label: '下载任务',
      children: <Card title="下载任务" extra={canExportTasks ? <Button icon={<DownloadOutlined />} onClick={() => exportFile('download')}>导出 CSV</Button> : null}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search allowClear placeholder="搜索任务名、任务ID或用户ID" style={{ width: 280 }} value={downloadTaskKeyword} onChange={e => setDownloadTaskKeyword(e.target.value)} />
          <Select allowClear placeholder="按状态筛选" style={{ width: 160 }} value={downloadTaskStatus} onChange={setDownloadTaskStatus} options={taskStatusOptions} />
          <Button onClick={() => { setDownloadTaskKeyword(''); setDownloadTaskStatus(undefined); }}>清空筛选</Button>
        </Space>
        <Table rowKey="id" loading={loading} dataSource={filteredDownloadTasks} columns={taskColumns} pagination={tablePagination(downloadPageSize, setDownloadPageSize)} scroll={{ x: 900 }} />
      </Card>,
    },
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
      label: '管理员权限',
      children: <Card title="管理员权限配置" extra={(!isSuperAdmin || !canAssignRoles) && <Tag color="orange">仅超级管理员可修改</Tag>}>
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
          <div>
            <Input.Search allowClear placeholder="搜索管理员" value={adminKeyword} onChange={e => setAdminKeyword(e.target.value)} style={{ marginBottom: 12 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 520, overflowY: 'auto' }}>
              {filteredEditableAdmins.map(user => (
                <button
                  key={user.id}
                  onClick={() => loadUserPermissions(user.id)}
                  style={{
                    border: selectedAdminId === user.id ? '1px solid rgba(125,155,118,0.7)' : '1px solid rgba(168,198,160,0.2)',
                    background: selectedAdminId === user.id ? 'rgba(168,198,160,0.18)' : 'rgba(255,255,255,0.72)',
                    borderRadius: 14,
                    padding: 12,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <Avatar src={userAPI.getDefaultAvatarUrl()} icon={<UserOutlined />} style={{ background: '#7D9B76', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#3D5A40', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.nickname || user.username}</div>
                    <div style={{ color: '#8B7355', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username} · {user.email}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          {selectedAdmin ? (
            <Card size="small" title={`配置 ${selectedAdmin.nickname || selectedAdmin.username} 的权限`} loading={permissionLoading}>
              <Checkbox.Group
                value={selectedAdminPermissions}
                disabled={!isSuperAdmin || !canAssignRoles}
                options={permissions.map(permission => ({
                  label: `${permission.name} (${permission.code})`,
                  value: permission.code,
                }))}
                onChange={(values) => setSelectedAdminPermissions(values as string[])}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}
              />
              <Button type="primary" onClick={saveUserPermissions} disabled={!isSuperAdmin || !canAssignRoles} style={{ marginTop: 18 }}>保存权限</Button>
            </Card>
          ) : (
            <Card size="small" style={{ minHeight: 240 }} />
          )}
        </div>
      </Card>
    } : null,
    canViewLogs ? {
      key: 'logs',
      label: '日志中心',
      children: <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card title="审计日志" extra={canExportLogs ? <Button icon={<DownloadOutlined />} onClick={() => exportFile('audit')}>导出 CSV</Button> : null}>
          <Tabs items={auditLogTabs} />
        </Card>
        <Card title="RAG 日志" extra={canExportLogs ? <Button icon={<DownloadOutlined />} onClick={() => exportFile('rag')}>导出 CSV</Button> : null}>
          <Space wrap style={{ marginBottom: 16 }}>
            <Input.Search allowClear placeholder="搜索操作、用户、图片或错误" style={{ width: 280 }} value={ragKeyword} onChange={e => setRagKeyword(e.target.value)} />
            <Select
              allowClear
              placeholder="按操作类型筛选"
              style={{ width: 220 }}
              value={ragOperation}
              onChange={setRagOperation}
              options={ragOperations.map(operation => ({ label: operation, value: operation }))}
            />
            <Button onClick={() => { setRagKeyword(''); setRagOperation(undefined); }}>清空筛选</Button>
          </Space>
          <Table rowKey="id" loading={loading} dataSource={filteredRagLogs} columns={logColumns} pagination={tablePagination(ragPageSize, setRagPageSize)} scroll={{ x: 1000 }} />
        </Card>
      </Space>
    } : null,
    canViewTasks ? {
      key: 'tasks',
      label: '任务中心',
      children: <Tabs items={taskTabs} />
    } : null,
    {
      key: 'settings',
      label: '账号设置',
      children: <SettingsPanel user={currentUser} onUserUpdated={onUserUpdated} />
    },
  ].filter(Boolean) as any[];

  return (
    <div className="biophilic-page" style={{ minHeight: '100vh' }}>
      <header className="biophilic-header" style={{ height: 64, color: '#3D5A40', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>自然相册管理后台</div>
          <div style={{ fontSize: 12, color: '#8B7355' }}>{currentUser.nickname || currentUser.username}</div>
        </div>
        <Space>
          <Avatar src={currentUser.avatarFilename ? userAPI.getAvatarUrl() : userAPI.getDefaultAvatarUrl()} icon={<UserOutlined />} style={{ background: '#7D9B76' }} />
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
          <Form.Item
            name="confirmPassword"
            label="确认密码"
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
            <Input.Password />
          </Form.Item>
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
