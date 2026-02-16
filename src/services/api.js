import axios from 'axios';

// Service URLs - use Vite proxy (empty baseURL means requests go through proxy)
const AUTH_SERVICE_URL = '';  // Proxied to localhost:8001
const RESTAURANT_SERVICE_URL = '';  // Proxied to localhost:8003

// Create axios instance for Auth Service
const authApi = axios.create({
  baseURL: AUTH_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create axios instance for Restaurant Service
const restaurantApi = axios.create({
  baseURL: RESTAURANT_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to add interceptors
const addInterceptors = (instance) => {
  // Request interceptor to add auth token
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor to handle errors
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Check if this is a public route (no auth required)
      const publicRoutes = [
        '/api/v1/restaurants/',
        '/api/v1/orders'
      ];
      const isPublicRoute = publicRoutes.some(route => originalRequest.url?.includes(route));

      // If token expired, try to refresh (but not for public routes)
      if (error.response?.status === 401 && !originalRequest._retry && !isPublicRoute) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken) {
            const response = await axios.post(`${AUTH_SERVICE_URL}/api/v1/auth/refresh`, {
              refresh_token: refreshToken,
            });

            const { access_token } = response.data;
            localStorage.setItem('access_token', access_token);

            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return instance(originalRequest);
          }
        } catch (refreshError) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
};

// Add interceptors to both instances
addInterceptors(authApi);
addInterceptors(restaurantApi);

// Export default as auth API for backwards compatibility
export default authApi;

// Auth API - uses Auth Service
export const authAPI = {
  login: (credentials) => authApi.post('/api/v1/auth/login', credentials),
  signup: (userData) => authApi.post('/api/v1/auth/signup', userData),
  logout: () => {
    const refreshToken = localStorage.getItem('refresh_token');
    return authApi.post('/api/v1/auth/logout', { refresh_token: refreshToken });
  },
  refreshToken: (refreshToken) => authApi.post('/api/v1/auth/refresh', { refresh_token: refreshToken }),
  changePassword: (data) => authApi.post('/api/v1/auth/change-password', data),
  getCurrentUser: () => authApi.get('/api/v1/users/me'),
  updateRestaurantId: (restaurantId) => authApi.patch(`/api/v1/users/me/restaurant?restaurant_id=${restaurantId}`),
};

// User Management API - uses Auth Service (Master Admin)
export const userAPI = {
  listUsers: () => authApi.get('/api/v1/auth/users'),
  getUser: (userId) => authApi.get(`/api/v1/auth/${userId}`),
  updateUser: (userId, data) => authApi.put(`/api/v1/auth/${userId}`, data),
  deleteUser: (userId) => authApi.delete(`/api/v1/auth/${userId}`),
};

// Staff API - uses Auth Service
export const staffAPI = {
  listStaff: (restaurantId, role) => authApi.get(`/api/v1/auth/staff/${restaurantId}`, { params: { role } }),
  createChef: (data) => authApi.post('/api/v1/auth/chef', data),
  createCustomer: (data) => authApi.post('/api/v1/auth/customer', data),
  updateStaff: (userId, data) => authApi.patch(`/api/v1/auth/${userId}`, data),
  toggleStatus: (userId) => authApi.patch(`/api/v1/auth/${userId}/toggle-status`),
  deleteChef: (chefId) => authApi.delete(`/api/v1/auth/chef/${chefId}`),
  deleteCustomer: (customerId) => authApi.delete(`/api/v1/auth/customer/${customerId}`),
};

// Restaurant API - uses Restaurant Service
export const restaurantAPI = {
  list: (params) => restaurantApi.get('/api/v1/restaurants', { params }),
  get: (id) => restaurantApi.get(`/api/v1/restaurants/${id}`),
  getById: (id) => restaurantApi.get(`/api/v1/restaurants/${id}`), // Alias for get
  create: (data) => restaurantApi.post('/api/v1/restaurants', data),
  update: (id, data) => restaurantApi.put(`/api/v1/restaurants/${id}`, data),
  delete: (id) => restaurantApi.delete(`/api/v1/restaurants/${id}`),
  getAnalytics: (id) => restaurantApi.get(`/api/v1/restaurants/${id}/analytics`),
  getPredictions: (id, params) => restaurantApi.get(`/api/v1/restaurants/${id}/analytics/predictions/demand`, { params }),
  getRevenueAnalytics: (id, params) => restaurantApi.get(`/api/v1/restaurants/${id}/analytics/revenue`, { params }),
  getBilling: (id) => restaurantApi.get(`/api/v1/restaurants/${id}/billing`),
  updateBranding: (id, data) => restaurantApi.patch(`/api/v1/restaurants/${id}/branding`, data),
  toggleStatus: (id) => restaurantApi.patch(`/api/v1/restaurants/${id}/toggle-status`),

  // Invoice endpoints
  generateInvoice: (id, data) => restaurantApi.post(`/api/v1/restaurants/${id}/invoices`, data || {}),
  listInvoices: (id, params) => restaurantApi.get(`/api/v1/restaurants/${id}/invoices`, { params }),
  getInvoice: (restaurantId, invoiceId) => restaurantApi.get(`/api/v1/restaurants/${restaurantId}/invoices/${invoiceId}`),
};

// Menu API - uses Restaurant Service
export const menuAPI = {
  list: (restaurantId, params) => restaurantApi.get(`/api/v1/restaurants/${restaurantId}/menu-items`, { params }),
  get: (restaurantId, itemId) => restaurantApi.get(`/api/v1/restaurants/${restaurantId}/menu-items/${itemId}`),
  create: (restaurantId, data) => restaurantApi.post(`/api/v1/restaurants/${restaurantId}/menu-items`, data),
  update: (restaurantId, itemId, data) => restaurantApi.put(`/api/v1/restaurants/${restaurantId}/menu-items/${itemId}`, data),
  delete: (restaurantId, itemId) => restaurantApi.delete(`/api/v1/restaurants/${restaurantId}/menu-items/${itemId}`),
  toggleAvailability: (restaurantId, itemId) => restaurantApi.patch(`/api/v1/restaurants/${restaurantId}/menu-items/${itemId}/toggle-availability`),
  uploadImage: (restaurantId, formData) => {
    return axios.post(`/api/v1/restaurants/${restaurantId}/menu-items/upload-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
  },
};

// Table API - uses Restaurant Service
export const tableAPI = {
  list: (restaurantId, params) => restaurantApi.get(`/api/v1/restaurants/${restaurantId}/tables`, { params }),
  get: (restaurantId, tableId) => restaurantApi.get(`/api/v1/restaurants/${restaurantId}/tables/${tableId}`),
  getById: (restaurantId, tableId) => restaurantApi.get(`/api/v1/restaurants/${restaurantId}/tables/${tableId}`), // Alias for get
  create: (restaurantId, data) => restaurantApi.post(`/api/v1/restaurants/${restaurantId}/tables`, data),
  update: (restaurantId, tableId, data) => restaurantApi.put(`/api/v1/restaurants/${restaurantId}/tables/${tableId}`, data),
  delete: (restaurantId, tableId) => restaurantApi.delete(`/api/v1/restaurants/${restaurantId}/tables/${tableId}`),
  updateStatus: (restaurantId, tableId, status) =>
    restaurantApi.patch(`/api/v1/restaurants/${restaurantId}/tables/${tableId}/status`, null, { params: { new_status: status } }),
  getQRCode: (restaurantId, tableId) => restaurantApi.get(`/api/v1/restaurants/${restaurantId}/tables/${tableId}/qr-code`),
  regenerateQR: (restaurantId, tableId) => restaurantApi.post(`/api/v1/restaurants/${restaurantId}/tables/${tableId}/regenerate-qr`),
};

// Feedback API - uses Restaurant Service
export const feedbackAPI = {
  list: (restaurantId, params) => restaurantApi.get(`/api/v1/restaurants/${restaurantId}/feedback`, { params }),
  get: (restaurantId, feedbackId) => restaurantApi.get(`/api/v1/restaurants/${restaurantId}/feedback/${feedbackId}`),
  create: (restaurantId, data) => restaurantApi.post(`/api/v1/restaurants/${restaurantId}/feedback`, data),
  delete: (restaurantId, feedbackId) => restaurantApi.delete(`/api/v1/restaurants/${restaurantId}/feedback/${feedbackId}`),
  getSummary: (restaurantId, days) => restaurantApi.get(`/api/v1/restaurants/${restaurantId}/feedback/stats/summary`, { params: { days } }),
};

// Order API - uses Restaurant Service
export const orderAPI = {
  list: (restaurantId, params) => restaurantApi.get(`/api/v1/restaurants/${restaurantId}/orders`, { params }),
  get: (orderId) => restaurantApi.get(`/api/v1/orders/${orderId}`),
  create: (data) => restaurantApi.post('/api/v1/orders', data),
  updateStatus: (orderId, status) => restaurantApi.patch(`/api/v1/orders/${orderId}/status`, { status }),
  cancel: (orderId) => restaurantApi.delete(`/api/v1/orders/${orderId}`),
  generateReceipt: (orderId) => restaurantApi.post(`/api/v1/orders/${orderId}/generate-receipt`),
};
