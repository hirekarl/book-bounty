import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// On 401, clear the stale token and redirect to login
let errorHandler = null;

export const setErrorHandler = (handler) => {
  errorHandler = handler;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (errorHandler) {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'An error occurred';
      errorHandler(message);
    }
    return Promise.reject(error);
  },
);

// Auth
export const login = (credentials) =>
  api.post('/auth/login/', credentials).then((res) => {
    localStorage.setItem('token', res.data.key);
    return res;
  });

export const logout = () =>
  api.post('/auth/logout/').finally(() => {
    localStorage.removeItem('token');
  });

// Books & triage
export const getBookMetadata = (isbn) => api.get(`/lookup/${isbn}/`);
export const getCatalogEntries = (params) => api.get('/entries/', { params });
export const createCatalogEntry = (data) => api.post('/entries/', data);
export const updateCatalogEntry = (id, data) => api.patch(`/entries/${id}/`, data);
export const deleteCatalogEntry = (id) => api.delete(`/entries/${id}/`);
export const resolveEntry = (id) => api.post(`/entries/${id}/resolve/`);
export const getDashboardStats = () => api.get('/stats/');
export const getImpactStats = () => api.get('/impact/');

// Culling goals
export const getCullingGoals = () => api.get('/goals/');
export const createCullingGoal = (data) => api.post('/goals/', data);
export const setActiveGoal = (id) => api.patch(`/goals/${id}/`, { is_active: true });

// AI recommendation
export const getRecommendation = (data) => api.post('/recommend/', data);
export const getBulkRecommendation = (entryIds, cullingGoalId) =>
  api.post('/recommend/bulk/', { entry_ids: entryIds, culling_goal_id: cullingGoalId });

export default api;
