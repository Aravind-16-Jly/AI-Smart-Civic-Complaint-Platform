import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

if (import.meta.env.VITE_API_URL === '/api') {
  api.defaults.baseURL = '/api';
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('civic_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.message || error?.message || 'Request failed.';
    return Promise.reject(new Error(message));
  },
);

async function requestWithRetry(requester, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await requester();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw lastError;
}

export const getHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const login = async (email, password) => {
  return requestWithRetry(() => api.post('/auth/login', { email, password }).then((response) => response.data));
};

export const signup = async (payload) => {
  return requestWithRetry(() => api.post('/auth/signup', payload).then((response) => response.data));
};

export const getCurrentUser = async () => {
  return requestWithRetry(() => api.get('/auth/me').then((response) => response.data.user));
};

export const getComplaints = async () => {
  return requestWithRetry(() => api.get('/complaints').then((response) => response.data.data));
};

export const submitComplaint = async (payload) => {
  return requestWithRetry(() => api.post('/complaints', payload).then((response) => response.data));
};

export const supportComplaint = async (id) => {
  return requestWithRetry(() => api.post(`/complaints/${id}/support`).then((response) => response.data));
};

export const updateComplaint = async (id, payload) => {
  return requestWithRetry(() => api.put(`/complaints/${id}`, payload).then((response) => response.data));
};

export const deleteComplaint = async (id) => {
  return requestWithRetry(() => api.delete(`/complaints/${id}`).then((response) => response.data));
};

export const getAnalytics = async () => {
  return requestWithRetry(() => api.get('/analytics').then((response) => response.data.data));
};

export const getNotifications = async () => {
  return requestWithRetry(() => api.get('/notifications').then((response) => response.data));
};

export const markNotificationRead = async (id) => {
  return requestWithRetry(() => api.patch(`/notifications/${id}/read`).then((response) => response.data));
};

export const deleteNotification = async (id) => {
  return requestWithRetry(() => api.delete(`/notifications/${id}`).then((response) => response.data));
};

export const uploadImage = async (imageData, fileName, onProgress) => {
  return requestWithRetry(() => api.post(
    '/upload-image',
    { imageData, fileName },
    onProgress
      ? {
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            onProgress(percent);
          },
        }
      : undefined,
  ).then((response) => response.data));
};

export default api;
