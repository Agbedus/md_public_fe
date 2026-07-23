export type AnnouncementType = 'info' | 'success' | 'warning' | 'error' | 'critical';

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  avatar_url?: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  type: AnnouncementType;
  creator_id: string;
  creator?: User;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementCreate {
  title: string;
  content: string;
  type?: AnnouncementType;
  is_active?: boolean;
}

export interface AnnouncementUpdate {
  title?: string;
  content?: string;
  type?: AnnouncementType;
  is_active?: boolean;
}
