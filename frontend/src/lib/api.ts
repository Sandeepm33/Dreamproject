// API client utility for frontend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class APIClient {
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sgpims_token');
    }
    return null;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const text = await response.text();
    
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error('Failed to parse JSON response:', text.substring(0, 200));
      throw new Error(`Server returned invalid response (${response.status})`);
    }

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  }

  // Auth
  async register(body: any) { return this.request('/auth/register', { method: 'POST', body: JSON.stringify(body) }); }
  async login(body: any) { return this.request('/auth/login', { method: 'POST', body: JSON.stringify(body) }); }
  async getMe() { return this.request('/auth/me'); }
  async updateProfile(body: any) { return this.request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }); }
  async logout() { return this.request('/auth/logout', { method: 'POST' }); }

  // Complaints
  async getComplaints(params?: Record<string, any>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/complaints${qs}`);
  }
  async getComplaint(id: string) { return this.request(`/complaints/${id}`); }
  async createComplaint(body: any) { return this.request('/complaints', { method: 'POST', body: JSON.stringify(body) }); }
  async updateStatus(id: string, body: any) { return this.request(`/complaints/${id}/status`, { method: 'PUT', body: JSON.stringify(body) }); }
  async assignComplaint(id: string, body: any) { return this.request(`/complaints/${id}/assign`, { method: 'PUT', body: JSON.stringify(body) }); }
  async addRemark(id: string, text: string) { return this.request(`/complaints/${id}/remark`, { method: 'POST', body: JSON.stringify({ text }) }); }
  async approveResolution(id: string, body: any) { return this.request(`/complaints/${id}/approve-resolution`, { method: 'POST', body: JSON.stringify(body) }); }

  // Votes
  async vote(complaintId: string) { return this.request(`/votes/${complaintId}`, { method: 'POST' }); }

  // Admin
  async getDashboard() { return this.request('/admin/dashboard'); }
  async getUsers(params?: Record<string, any>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/admin/users${qs}`);
  }
  async searchUsers(params: { mobile?: string, role?: string }) {
    const qs = '?' + new URLSearchParams(params as any).toString();
    return this.request(`/users${qs}`);
  }
  async getOfficers() { return this.request('/admin/officers'); }
  async createUser(body: any) { return this.request('/users/create', { method: 'POST', body: JSON.stringify(body) }); }
  async toggleUser(id: string) { return this.request(`/admin/users/${id}/toggle`, { method: 'PUT' }); }
  async broadcastNotification(body: any) { return this.request('/admin/broadcast', { method: 'POST', body: JSON.stringify(body) }); }

  // Notifications
  async getNotifications() { return this.request('/notifications'); }
  async markNotificationRead(id: string) { return this.request(`/notifications/${id}/read`, { method: 'PUT' }); }
  async markAllRead() { return this.request('/notifications/mark-all-read', { method: 'PUT' }); }
  async deleteNotification(id: string) { return this.request(`/notifications/${id}/delete`, { method: 'POST' }); }
  async clearAllNotifications() { return this.request('/notifications/clear-all', { method: 'POST' }); }

  // Analytics
  async getAnalytics(params?: Record<string, any>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/analytics/overview${qs}`);
  }

  // Upload
  async uploadFiles(files: File[]) {
    const token = this.getToken();
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    return res.json();
  }

  // Posts / Gallery
  async getPosts() { return this.request('/posts'); }
  async createPost(body: any) { return this.request('/posts', { method: 'POST', body: JSON.stringify(body) }); }
  async deletePost(id: string) { return this.request(`/posts/${id}`, { method: 'DELETE' }); }

  // Village & District management
  async getDistricts() { return this.request('/districts'); }
  async getVillages(params?: Record<string, any>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/villages${qs}`);
  }
  async createVillage(body: any) { return this.request('/villages', { method: 'POST', body: JSON.stringify(body) }); }
  async assignVillage(userId: string, villageId: string) { return this.request(`/users/${userId}/assign-village`, { method: 'PATCH', body: JSON.stringify({ villageId }) }); }

  // Emergency Alerts
  async createEmergencyAlert(body: { type: string; message: string; villageId?: string; location?: any }) { return this.request('/emergency-alerts', { method: 'POST', body: JSON.stringify(body) }); }
  async getActiveEmergencyAlerts() { return this.request('/emergency-alerts/active'); }
  async resolveEmergencyAlert(id: string) { return this.request(`/emergency-alerts/${id}/resolve`, { method: 'PUT' }); }
  async deleteEmergencyAlert(id: string) { return this.request(`/emergency-alerts/${id}/delete`, { method: 'POST' }); }
}

export const api = new APIClient();
