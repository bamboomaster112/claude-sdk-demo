const API_URL = import.meta.env.VITE_API_URL;

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }

  return response.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signup: (email: string, password: string, full_name?: string) =>
    request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    }),

  getMe: (token: string) =>
    request('/api/auth/me', {}, token),

  // Sessions
  listSessions: (token: string) =>
    request('/api/migrations/sessions', {}, token),

  createSession: (token: string, source_type: string, title?: string) =>
    request('/api/migrations/sessions', {
      method: 'POST',
      body: JSON.stringify({ source_type, title }),
    }, token),

  getSession: (token: string, sessionId: string) =>
    request(`/api/migrations/sessions/${sessionId}`, {}, token),

  // Admin
  getUsers: (token: string) =>
    request('/api/admin/users/', {}, token),

  updateUser: (token: string, userId: string, data: Record<string, unknown>) =>
    request(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token),

  getSettings: (token: string) =>
    request('/api/admin/settings', {}, token),

  setModel: (token: string, model: string) =>
    request('/api/admin/settings/model', {
      method: 'PUT',
      body: JSON.stringify({ model }),
    }, token),

  getAnalytics: (token: string) =>
    request('/api/admin/analytics', {}, token),

  // Upload
  uploadFile: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_URL}/api/migrations/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  },
};
