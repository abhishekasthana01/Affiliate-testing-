import { api } from '../lib/api';

export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),

  getUsers: (params = {}) => api.get('/admin/users', { params }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  updateUser: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  toggleUserStatus: (id: string) => api.patch(`/admin/users/${id}/toggle-status`),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),

  getProducts: (params = {}) => api.get('/admin/products', { params }),
  createProduct: (data: any) => api.post('/admin/products', data),
  updateProduct: (id: string, data: any) => api.put(`/admin/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/admin/products/${id}`),

  getTransactions: (params = {}) => api.get('/admin/transactions', { params }),
  updateTransaction: (id: string, data: any) => api.put(`/admin/transactions/${id}`, data),

  getPayouts: (params = {}) => api.get('/admin/payouts', { params }),
  processPayout: (id: string, data: any) => api.put(`/admin/payouts/${id}/process`, data),

  getAffiliateStats: () => api.get('/admin/affiliates'),
  getAnalytics: (params = {}) => api.get('/admin/analytics', { params }),
  getRealtimeAnalytics: (params = {}) => api.get('/analytics/realtime', { params }),
  getFunnelAnalytics: (params = {}) => api.get('/analytics/funnel', { params }),

  getCampaigns: () => api.get('/admin/campaigns'),
  createCampaign: (data: any) => api.post('/admin/campaigns', data),
  updateCampaign: (data: any) => api.put('/admin/campaigns', data),
  getSegments: () => api.get('/admin/segments'),
  createSegment: (data: any) => api.post('/admin/segments', data),
  updateSegment: (id: string, data: any) => api.put(`/admin/segments/${id}`, data),
  deleteSegment: (id: string) => api.delete(`/admin/segments/${id}`),
  getLeaderboard: (params = {}) => api.get('/admin/leaderboard', { params }),

  // Superadmin: admin invites
  listAdminInvites: () => api.get('/admin/admin-invites'),
  createAdminInvite: (data: any) => api.post('/admin/admin-invites', data),
  revokeAdminInvite: (id: string) => api.delete(`/admin/admin-invites/${id}`),

  getFraudAnalysis: () => api.get('/admin/fraud'),
  reviewFraudTransaction: (data: any) => api.put('/admin/fraud/review', data),

  getAuditLogs: (params = {}) => api.get('/admin/audit-logs', { params }),

  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data: any) => api.put('/admin/settings', data),
};
