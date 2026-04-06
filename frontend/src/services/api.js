import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getBookMetadata = (isbn) => api.get(`/lookup/${isbn}/`);
export const getCatalogEntries = (params) => api.get('/entries/', { params });
export const createCatalogEntry = (data) => api.post('/entries/', data);
export const getDashboardStats = () => api.get('/stats/');

export const getCullingGoals = () => api.get('/goals/');
export const createCullingGoal = (data) => api.post('/goals/', data);
export const setActiveGoal = (id) => api.patch(`/goals/${id}/`, { is_active: true });
export const getRecommendation = (data) => api.post('/recommend/', data);

export default api;
