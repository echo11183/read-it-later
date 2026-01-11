
export interface User {
  id: string;
  name: string;
  avatarColor: string;
}

export interface LinkItem {
  id: string;
  url: string;
  title: string;
  description: string;
  summary: string;
  isRead: boolean;
  isDeleted: boolean;
  createdAt: number;
}

export type FilterType = 'all' | 'unread' | 'read' | 'trash';
export type Language = 'zh' | 'en';
