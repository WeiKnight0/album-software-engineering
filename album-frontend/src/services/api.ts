import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

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
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.reload()
    }
    return Promise.reject(error)
  }
)

// ==================== 认证相关API ====================
export const authAPI = {
  login: (credentials: { username: string; password: string }) => {
    return api.post('/auth/login', credentials)
  },
  register: (userData: { username: string; password: string; email: string; nickname?: string }) => {
    return api.post('/auth/register', userData)
  }
}

// ==================== 用户相关API ====================
export const userAPI = {
  getUser: (userId: number) => {
    return api.get(`/users/${userId}`)
  },
  getMe: () => {
    return api.get('/users/me')
  },
  updateUser: (userId: number, userData: any) => {
    return api.put(`/users/${userId}`, userData)
  }
}

// ==================== 图片相关API ====================
export const imageAPI = {
  upload: (file: File, userId: number, folderId: number = 0) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', userId.toString())
    formData.append('folderId', folderId.toString())
    return api.post('/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  getAll: (userId: number, folderId?: number | null, status?: string) => {
    let url = `/images?userId=${userId}`
    if (folderId !== undefined && folderId !== null) url += `&folderId=${folderId}`
    if (status) url += `&status=${status}`
    return api.get(url)
  },

  getRecycleBin: (userId: number) => {
    return api.get(`/images?userId=${userId}&status=recycle`)
  },

  getById: (imageId: string, userId: number) => {
    return api.get(`/images/${imageId}?userId=${userId}`)
  },

  delete: (imageId: string, userId: number, permanent: boolean = false) => {
    return api.delete(`/images/${imageId}?userId=${userId}&permanent=${permanent}`)
  },

  restore: (imageId: string, userId: number) => {
    return api.patch(`/images/${imageId}`, { userId, restore: true })
  },

  move: (imageId: string, userId: number, newFolderId: number) => {
    return api.patch(`/images/${imageId}`, { userId, folderId: newFolderId })
  },

  batchMove: (imageIds: string[], userId: number, folderId: number) => {
    return api.post('/images/batch-move', { imageIds, userId, folderId })
  },

  batchDelete: (imageIds: string[], userId: number, permanent: boolean = false) => {
    return api.delete('/images/batch-delete', { data: { imageIds, userId, permanent } })
  },

  getStats: (userId: number) => {
    return api.get(`/images/stats?userId=${userId}`)
  },

  getThumbnailUrl: (imageId: string, userId: number) => {
    return `/api/images/${imageId}/thumbnail?userId=${userId}`
  },

  getDownloadUrl: (imageId: string, userId: number) => {
    return `/api/images/${imageId}/download?userId=${userId}`
  },

  getAnalysis: (imageId: string, userId: number) => {
    return api.get(`/images/${imageId}/analysis?userId=${userId}`)
  }
}

// ==================== 文件夹相关API ====================
export const folderAPI = {
  create: (userId: number, parentId: number | null, name: string) => {
    return api.post('/folders', { userId, parentId, name })
  },

  getAll: (userId: number, parentId?: number | null, status?: string) => {
    let url = `/folders?userId=${userId}`
    if (parentId !== undefined && parentId !== null) url += `&parentId=${parentId}`
    if (status) url += `&status=${status}`
    return api.get(url)
  },

  getRecycleBin: (userId: number) => {
    return api.get(`/folders?userId=${userId}&status=recycle`)
  },

  getById: (folderId: number, userId: number) => {
    return api.get(`/folders/${folderId}?userId=${userId}`)
  },

  rename: (folderId: number, userId: number, name: string) => {
    return api.put(`/folders/${folderId}`, { userId, name })
  },

  delete: (folderId: number, userId: number) => {
    return api.delete(`/folders/${folderId}?userId=${userId}`)
  },

  restore: (folderId: number, userId: number) => {
    return api.patch(`/folders/${folderId}`, { userId, restore: true })
  },

  updateCover: (folderId: number, userId: number, imageId: string) => {
    return api.patch(`/folders/${folderId}`, { userId, imageId })
  }
}

// ==================== 人脸识别相关API ====================
export const faceAPI = {
  list: (userId: number) => {
    return api.get(`/face/list?userId=${userId}`)
  },

  getImages: (faceId: number, userId: number) => {
    return api.get(`/face/${faceId}/images?userId=${userId}`)
  },

  remark: (userId: number, faceId: number, faceName: string) => {
    return api.post('/face/remark', { userId, faceId, faceName })
  },

  merge: (userId: number, faceIds: number[], selectedName?: string | null) => {
    const payload: any = { userId, faceIds }
    if (selectedName) payload.selectedName = selectedName
    return api.post('/face/merge', payload)
  },

  deleteFace: (userId: number, faceId: number) => {
    return api.post('/face/delete', { userId, faceId })
  },

  search: (userId: number, faceName: string) => {
    return api.post('/face/search', { userId, faceName })
  },

  getCoverUrl: (faceId: number, userId: number) => {
    return `/api/face/${faceId}/cover?userId=${userId}`
  }
}

// ==================== 上传任务相关API ====================
export const uploadTaskAPI = {
  createTask: (userId: number, taskName: string, files: { fileName: string; fileSize: number; fileType: string }[]) => {
    return api.post('/upload/tasks', { userId, taskName, files })
  },

  getTasks: (userId: number) => {
    return api.get(`/upload/tasks?userId=${userId}`)
  },

  getTask: (taskId: string, userId: number) => {
    return api.get(`/upload/tasks/${taskId}?userId=${userId}`)
  },

  uploadFile: (taskId: string, userId: number, file: File, fileIndex?: number, folderId?: number | null) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', userId.toString())
    if (fileIndex !== undefined) formData.append('fileIndex', fileIndex.toString())
    if (folderId !== undefined && folderId !== null) formData.append('folderId', folderId.toString())
    return api.post(`/upload/files/${taskId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  pause: (taskId: string, userId: number) => {
    return api.patch(`/upload/tasks/${taskId}/pause`, { userId })
  },

  resume: (taskId: string, userId: number) => {
    return api.patch(`/upload/tasks/${taskId}/resume`, { userId })
  },

  cancel: (taskId: string, userId: number) => {
    return api.delete(`/upload/tasks/${taskId}?userId=${userId}`)
  },

  retry: (taskId: string, userId: number) => {
    return api.post(`/upload/tasks/${taskId}/retry`, { userId })
  },

  cleanup: (taskId: string, userId: number) => {
    return api.delete(`/upload/tasks/${taskId}/cleanup?userId=${userId}`)
  }
}

// ==================== 下载任务相关API ====================
export const downloadTaskAPI = {
  createTask: (userId: number, taskName: string, images: { imageId: string; fileName: string; fileSize: number }[]) => {
    return api.post('/downloads/tasks', { userId, taskName, images })
  },

  getTasks: (userId: number) => {
    return api.get(`/downloads/tasks?userId=${userId}`)
  },

  getTask: (taskId: string, userId: number) => {
    return api.get(`/downloads/tasks/${taskId}?userId=${userId}`)
  },

  getFiles: (taskId: string, userId: number) => {
    return api.get(`/downloads/tasks/${taskId}/files?userId=${userId}`)
  },

  pause: (taskId: string, userId: number) => {
    return api.patch(`/downloads/tasks/${taskId}/pause`, { userId })
  },

  resume: (taskId: string, userId: number) => {
    return api.patch(`/downloads/tasks/${taskId}/resume`, { userId })
  },

  cancel: (taskId: string, userId: number) => {
    return api.patch(`/downloads/tasks/${taskId}/cancel`, { userId })
  },

  retry: (taskId: string, userId: number) => {
    return api.patch(`/downloads/tasks/${taskId}/retry`, { userId })
  },

  deleteTask: (taskId: string, userId: number) => {
    return api.delete(`/downloads/tasks/${taskId}?userId=${userId}`)
  },

  markComplete: (taskId: string, imageId: string, userId: number) => {
    return api.patch(`/downloads/tasks/${taskId}/files/${imageId}/complete?userId=${userId}`)
  }
}

// ==================== AI相关API ====================
export const aiAPI = {
  chat: (message: string, userId: number) => {
    return api.post('/rag/chat', { message, userId })
  }
}

// ==================== 智能搜索API ====================
export const searchAPI = {
  smartSearch: (query: string, userId: number) => {
    return api.post('/rag/search', { query, userId })
  }
}

// ==================== 支付相关API ====================
export const paymentAPI = {
  createOrder: (userId: number, amount: number = 2000, months: number = 1) => {
    return api.post('/payment/create', { userId, amount, months })
  },
  confirmPayment: (orderId: string) => {
    return api.post('/payment/confirm', { orderId })
  },
  getLatestOrder: (userId: number) => {
    return api.get(`/payment/latest?userId=${userId}`)
  }
}

export default api
