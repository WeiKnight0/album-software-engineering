import axios from 'axios'

type RequestConfigWithAuthControl = {
  skipAuthRedirect?: boolean
}

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

const tokenQuery = () => {
  const token = localStorage.getItem('token')
  return token ? `token=${encodeURIComponent(token)}` : ''
}

api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error)
    const shouldSkipRedirect = Boolean((error.config as RequestConfigWithAuthControl | undefined)?.skipAuthRedirect)
    const requestUrl = error.config?.url || ''
    const isAdminRequest = requestUrl.startsWith('/admin/')
    const isAuthExpired = error.response?.status === 401 || (error.response?.status === 403 && !isAdminRequest)
    if (isAuthExpired && !shouldSkipRedirect) {
      localStorage.removeItem('token')
      window.location.reload()
    }
    return Promise.reject(error)
  }
)

// ==================== 认证相关API ====================
export const authAPI = {
  login: (credentials: { username: string; password: string }) => {
    return api.post('/auth/login', credentials, { skipAuthRedirect: true } as any)
  },
  register: (userData: { username: string; password: string; email: string; nickname?: string }) => {
    return api.post('/auth/register', userData, { skipAuthRedirect: true } as any)
  }
}

// ==================== 用户相关API ====================
export const userAPI = {
  getMe: () => {
    return api.get('/users/me')
  },
  updateMe: (userData: any) => {
    return api.put('/users/me', userData)
  }
}

// ==================== 管理员API ====================
export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
  createUser: (userData: { username: string; password: string; email: string; nickname?: string; role: string }) => api.post('/admin/users', userData),
  updateStatus: (userId: number, status: number) => api.patch(`/admin/users/${userId}/status`, { status }),
  updateMembership: (userId: number, isMember: boolean) => api.patch(`/admin/users/${userId}/membership`, { isMember }),
  updateStorageLimit: (userId: number, storageLimit: number) => api.patch(`/admin/users/${userId}/storage-limit`, { storageLimit }),
  updateRoles: (userId: number, roles: string[]) => api.put(`/admin/users/${userId}/roles`, { roles }),
  getRoles: () => api.get('/admin/roles'),
  getPermissions: () => api.get('/admin/permissions'),
  updateRolePermissions: (roleId: number, permissions: string[]) => api.put(`/admin/roles/${roleId}/permissions`, { permissions }),
  getRagLogs: () => api.get('/admin/logs/rag'),
  getAuditLogs: () => api.get('/admin/logs/audit'),
  getUploadTasks: () => api.get('/admin/tasks/uploads'),
  getDownloadTasks: () => api.get('/admin/tasks/downloads'),
  exportRagLogs: () => api.get('/admin/logs/rag/export', { responseType: 'blob' }),
  exportAuditLogs: () => api.get('/admin/logs/audit/export', { responseType: 'blob' }),
  exportUploadTasks: () => api.get('/admin/tasks/uploads/export', { responseType: 'blob' }),
  exportDownloadTasks: () => api.get('/admin/tasks/downloads/export', { responseType: 'blob' })
}

// ==================== 图片相关API ====================
export const imageAPI = {
  upload: (file: File, _userId: number, folderId: number = 0) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folderId', folderId.toString())
    return api.post('/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  getAll: (_userId: number, folderId?: number | null, status?: string) => {
    let url = '/images?'
    if (folderId !== undefined && folderId !== null) url += `&folderId=${folderId}`
    if (status) url += `&status=${status}`
    return api.get(url)
  },

  getRecycleBin: (_userId: number) => {
    return api.get('/images?status=recycle')
  },

  getById: (imageId: string, _userId: number) => {
    return api.get(`/images/${imageId}`)
  },

  delete: (imageId: string, _userId: number, permanent: boolean = false) => {
    return api.delete(`/images/${imageId}?permanent=${permanent}`)
  },

  restore: (imageId: string, _userId: number) => {
    return api.patch(`/images/${imageId}`, { restore: true })
  },

  move: (imageId: string, _userId: number, newFolderId: number) => {
    return api.patch(`/images/${imageId}`, { folderId: newFolderId })
  },

  batchMove: (imageIds: string[], _userId: number, folderId: number) => {
    return api.post('/images/batch-move', { imageIds, folderId })
  },

  batchDelete: (imageIds: string[], _userId: number, permanent: boolean = false) => {
    return api.delete('/images/batch-delete', { data: { imageIds, permanent } })
  },

  getStats: (_userId: number) => {
    return api.get('/images/stats')
  },

  getThumbnailUrl: (imageId: string, _userId: number) => {
    return `/api/images/${imageId}/thumbnail?${tokenQuery()}`
  },

  getDownloadUrl: (imageId: string, _userId: number) => {
    return `/api/images/${imageId}/download?${tokenQuery()}`
  },

  getAnalysis: (imageId: string, _userId: number) => {
    return api.get(`/images/${imageId}/analysis`)
  }
}

// ==================== 文件夹相关API ====================
export const folderAPI = {
  create: (_userId: number, parentId: number | null, name: string) => {
    return api.post('/folders', { parentId, name })
  },

  getAll: (_userId: number, parentId?: number | null, status?: string) => {
    let url = '/folders?'
    if (parentId !== undefined && parentId !== null) url += `&parentId=${parentId}`
    if (status) url += `&status=${status}`
    return api.get(url)
  },

  getRecycleBin: (_userId: number) => {
    return api.get('/folders?status=recycle')
  },

  getById: (folderId: number, _userId: number) => {
    return api.get(`/folders/${folderId}`)
  },

  rename: (folderId: number, _userId: number, name: string) => {
    return api.put(`/folders/${folderId}`, { name })
  },

  delete: (folderId: number, _userId: number) => {
    return api.delete(`/folders/${folderId}`)
  },

  restore: (folderId: number, _userId: number) => {
    return api.patch(`/folders/${folderId}`, { restore: true })
  },

  updateCover: (folderId: number, _userId: number, imageId: string) => {
    return api.patch(`/folders/${folderId}`, { imageId })
  }
}

// ==================== 人脸识别相关API ====================
export const faceAPI = {
  list: (_userId: number) => {
    return api.get('/face/list')
  },

  getImages: (faceId: number, _userId: number) => {
    return api.get(`/face/${faceId}/images`)
  },

  remark: (_userId: number, faceId: number, faceName: string) => {
    return api.post('/face/remark', { faceId, faceName })
  },

  merge: (_userId: number, faceIds: number[], selectedName?: string | null) => {
    const payload: any = { faceIds }
    if (selectedName) payload.selectedName = selectedName
    return api.post('/face/merge', payload)
  },

  deleteFace: (_userId: number, faceId: number) => {
    return api.post('/face/delete', { faceId })
  },

  search: (_userId: number, faceName: string) => {
    return api.post('/face/search', { faceName })
  },

  getCoverUrl: (faceId: number, _userId: number) => {
    return `/api/face/${faceId}/cover?${tokenQuery()}`
  }
}

// ==================== 上传任务相关API ====================
export const uploadTaskAPI = {
  createTask: (_userId: number, taskName: string, files: { fileName: string; fileSize: number; fileType: string }[]) => {
    return api.post('/upload/tasks', { taskName, files })
  },

  getTasks: (_userId: number) => {
    return api.get('/upload/tasks')
  },

  getTask: (taskId: string, _userId: number) => {
    return api.get(`/upload/tasks/${taskId}`)
  },

  uploadFile: (taskId: string, _userId: number, file: File, fileIndex?: number, folderId?: number | null) => {
    const formData = new FormData()
    formData.append('file', file)
    if (fileIndex !== undefined) formData.append('fileIndex', fileIndex.toString())
    if (folderId !== undefined && folderId !== null) formData.append('folderId', folderId.toString())
    return api.post(`/upload/files/${taskId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  pause: (taskId: string, _userId: number) => {
    return api.patch(`/upload/tasks/${taskId}/pause`, {})
  },

  resume: (taskId: string, _userId: number) => {
    return api.patch(`/upload/tasks/${taskId}/resume`, {})
  },

  cancel: (taskId: string, _userId: number) => {
    return api.delete(`/upload/tasks/${taskId}`)
  },

  retry: (taskId: string, _userId: number) => {
    return api.post(`/upload/tasks/${taskId}/retry`, {})
  },

  cleanup: (taskId: string, _userId: number) => {
    return api.delete(`/upload/tasks/${taskId}/cleanup`)
  }
}

// ==================== 下载任务相关API ====================
export const downloadTaskAPI = {
  createTask: (_userId: number, taskName: string, images: { imageId: string; fileName: string; fileSize: number }[]) => {
    return api.post('/downloads/tasks', { taskName, images })
  },

  getTasks: (_userId: number) => {
    return api.get('/downloads/tasks')
  },

  getTask: (taskId: string, _userId: number) => {
    return api.get(`/downloads/tasks/${taskId}`)
  },

  getFiles: (taskId: string, _userId: number) => {
    return api.get(`/downloads/tasks/${taskId}/files`)
  },

  pause: (taskId: string, _userId: number) => {
    return api.patch(`/downloads/tasks/${taskId}/pause`, {})
  },

  resume: (taskId: string, _userId: number) => {
    return api.patch(`/downloads/tasks/${taskId}/resume`, {})
  },

  cancel: (taskId: string, _userId: number) => {
    return api.patch(`/downloads/tasks/${taskId}/cancel`, {})
  },

  retry: (taskId: string, _userId: number) => {
    return api.patch(`/downloads/tasks/${taskId}/retry`, {})
  },

  deleteTask: (taskId: string, _userId: number) => {
    return api.delete(`/downloads/tasks/${taskId}`)
  },

  markComplete: (taskId: string, imageId: string, _userId: number) => {
    return api.patch(`/downloads/tasks/${taskId}/files/${imageId}/complete`)
  }
}

// ==================== AI相关API ====================
export const aiAPI = {
  chat: (message: string, _userId: number) => {
    return api.post('/rag/chat', { message })
  }
}

// ==================== 智能搜索API ====================
export const searchAPI = {
  smartSearch: (query: string, _userId: number) => {
    return api.post('/rag/search', { query })
  }
}

// ==================== 支付相关API ====================
export const paymentAPI = {
  createOrder: (_userId: number, amount: number = 2000, months: number = 1) => {
    return api.post('/payment/create', { amount, months })
  },
  confirmPayment: (orderId: string) => {
    return api.post('/payment/confirm', { orderId })
  },
  getLatestOrder: (_userId: number) => {
    return api.get('/payment/latest')
  }
}

export default api
