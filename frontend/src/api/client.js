const API_BASE = 'http://localhost:5000/api';

export async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const authApi = {
  register: (data) =>
    apiCall('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) =>
    apiCall('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  resetPassword: (data) =>
    apiCall('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
};

export const productsApi = {
  getAll: () => apiCall('/products'),
  create: (data) => apiCall('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/products/${id}`, { method: 'DELETE' }),
  ocr: (imageData) => apiCall('/products/ocr', { method: 'POST', body: JSON.stringify({ image: imageData }) }),
};
