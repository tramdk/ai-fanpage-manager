import { RequestInit } from 'node-fetch'; // For backend compatibility if needed, but standard React uses browser Fetch

export interface Post {
  id: string;
  topic: string;
  content: string;
  imageUrl: string | null;
  fanpageId: string | null;
  scheduleId: string | null;
  status: 'queued' | 'published' | 'failed' | 'posted';
  orderIndex: number;
  error: string | null;
  userId: string;
  createdAt: string;
  fanpageName?: string;
  schedule?: Schedule;
}

export interface Schedule {
  id: string;
  topic: string;
  time: string;
  advancedPrompt: string | null;
  runCount: number;
  status: 'active' | 'suspended';
  fanpageId: string;
  fanpageName?: string;
  createdAt: string;
  userId: string;
}

export interface Fanpage {
  id: string;
  pageId: string;
  name: string;
  accessToken: string;
  status: string;
  connectedAt: string;
  userId: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  status: 'active' | 'pending';
  requirePasswordChange?: boolean;
}

export type AuthFetch = (url: string, options?: RequestInit) => Promise<Response>;

export interface Topic {
  id: string;
  name: string;
  keywords: string[];
  userId: string;
  createdAt: string;
}
