export type Note = {
  id: number;
  title: string;
  content: string;

  type: 'note' | 'checklist' | 'todo' | 'journal' | 'meeting' | 'idea' | 'link' | 'code' | 'bookmark' | 'sketch';
  tags: string;
  notebook?: string | null;
  color?: string | null;

  is_pinned: 0 | 1; // API: is_pinned (0 or 1)
  is_archived: 0 | 1; // API: is_archived (0 or 1)
  is_favorite: 0 | 1; // API: is_favorite (0 or 1)

  cover_image?: string | null;
  links?: string | null;        // JSON string array
  attachments?: string | null;  // JSON string array

  reminderAt?: string | null;
  dueDate?: string | null;
  priority?: 'low' | 'medium' | 'high' | null;

  user_id: string;
  task_id?: number | null;

  created_at?: string | null;
  updated_at?: string | null;
  owner?: {
    id: string;
    name?: string | null;
    full_name?: string | null;
    image?: string | null;
    avatar_url?: string | null;
    email?: string | null;
  };
  shared_with?: (string | {
    id: string;
    name?: string | null;
    full_name?: string | null;
    image?: string | null;
    avatar_url?: string | null;
    email?: string | null;
  })[];
};