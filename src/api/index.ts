import { AuthFetch, Fanpage, Topic, Schedule, User } from '../types';

/**
 * Standardized API Layer for Fanpage AI Manager
 * This provides type-safe abstractions for all backend interactions.
 */
export class ApiService {
  public fetch: AuthFetch;

  constructor(authFetch: AuthFetch) {
    this.fetch = authFetch;
  }

  private async handleResponse(r: Response) {
    const data = await r.json();
    if (!r.ok) {
      let errorMsg = data.error || data.message || 'API request failed';
      
      // --- Smart Error Translation ---
      if (typeof errorMsg === 'string' && (errorMsg.includes('Invalid OAuth access token') || errorMsg.includes('Error validating access token') || errorMsg.includes('code 190'))) {
         errorMsg = 'Lỗi Facebook Token: Access Token bị sai hoặc đã hết hạn! Vui lòng vào mục "Settings" -> sửa Fanpage và cấp lại chuỗi Token mới để tiếp tục đăng bài.';
      }
      
      throw new Error(errorMsg);
    }
    return data;
  }

  // --- USERS & PROFILE ---
  users = {
    getMe: () => this.fetch('/api/auth/me').then(r => this.handleResponse(r)) as Promise<User>,
    updateProfile: (data: { name: string }) => 
      this.fetch('/api/users/profile', { method: 'PUT', body: JSON.stringify(data) }).then(r => this.handleResponse(r)),
    updatePassword: (data: any) =>
      this.fetch('/api/users/password', { method: 'PUT', body: JSON.stringify(data) }).then(r => this.handleResponse(r)),
  };

  // --- DASHBOARD OVERVIEW ---
  dashboard = {
    getOverview: () => this.fetch('/api/dashboard').then(r => this.handleResponse(r)),
  };

  // --- FANPAGES ---
  fanpages = {
    list: () => this.fetch('/api/fanpages').then(r => this.handleResponse(r)) as Promise<Fanpage[]>,
    revoke: (id: string) => this.fetch(`/api/fanpages/${id}`, { method: 'DELETE' }).then(r => this.handleResponse(r)),
    refresh: () => this.fetch('/api/fanpages/refresh', { method: 'POST' }).then(r => this.handleResponse(r)),
    updateToken: (id: string, accessToken: string) => this.fetch(`/api/fanpages/${id}/token`, { method: 'PATCH', body: JSON.stringify({ accessToken }) }).then(r => this.handleResponse(r)),
  };

  // --- AUTOMATION & SCHEDULES ---
  schedules = {
    list: () => this.fetch('/api/schedules').then(r => this.handleResponse(r)) as Promise<Schedule[]>,
    create: (data: any) => this.fetch('/api/schedules', { method: 'POST', body: JSON.stringify(data) }).then(r => this.handleResponse(r)),
    delete: (id: string) => this.fetch(`/api/schedules/${id}`, { method: 'DELETE' }).then(r => this.handleResponse(r)),
    updateStatus: (id: string, status: string) => this.fetch(`/api/schedules/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }).then(r => this.handleResponse(r)),
    getPosts: (id: string) => this.fetch(`/api/schedules/${id}/posts`).then(r => this.handleResponse(r)),
  };

  // --- TOPICS ---
  topics = {
    list: () => this.fetch('/api/topics').then(r => this.handleResponse(r)) as Promise<Topic[]>,
    create: (data: { name: string, keywords: string[] }) => this.fetch('/api/topics', { method: 'POST', body: JSON.stringify(data) }).then(r => this.handleResponse(r)),
    delete: (id: string) => this.fetch(`/api/topics/${id}`, { method: 'DELETE' }).then(r => this.handleResponse(r)),
  };

  // --- FACEBOOK OPERATIONS ---
  facebook = {
    post: (data: any) => {
      if (data instanceof FormData) {
        return this.fetch('/api/facebook/post', { method: 'POST', body: data }).then(r => this.handleResponse(r));
      }
      return this.fetch('/api/facebook/post', { method: 'POST', body: JSON.stringify(data) }).then(r => this.handleResponse(r));
    }
  };

  // --- POST HISTORY ---
  posts = {
    list: () => this.fetch('/api/posts').then(r => this.handleResponse(r)),
    update: (id: string, data: any) => this.fetch(`/api/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => this.handleResponse(r)),
  };

  // --- ADMIN ---
  admin = {
    listUsers: () => this.fetch('/api/admin/users').then(r => this.handleResponse(r)),
    revokeCredentials: (id: string) => this.fetch(`/api/admin/users/${id}/revoke`, { method: 'POST' }).then(r => this.handleResponse(r)),
  };

  // --- AI GENERATION ---
  ai = {
    generateText: (prompt: string) => 
      this.fetch('/api/ai/generate-text', { method: 'POST', body: JSON.stringify({ prompt }) }).then(r => this.handleResponse(r)),
    generateImage: (data: { topic?: string, prompt?: string, keywords?: string[] | string } | string) => {
      const payload = typeof data === 'string' ? { topic: data } : data;
      return this.fetch('/api/ai/generate-image', { method: 'POST', body: JSON.stringify(payload) }).then(r => this.handleResponse(r));
    },
  };

  // --- FACEBOOK APPS ---
  fbApps = {
    list: () => this.fetch('/api/facebook-apps').then(r => this.handleResponse(r)),
    create: (data: any) => this.fetch('/api/facebook-apps', { method: 'POST', body: JSON.stringify(data) }).then(r => this.handleResponse(r)),
    delete: (id: string) => this.fetch(`/api/facebook-apps/${id}`, { method: 'DELETE' }).then(r => this.handleResponse(r)),
  };
}
