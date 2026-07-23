'use server';

import { auth } from '@/auth';
import { getSessionHeaders, handleUnauthorizedResponse, handleForbiddenResponse } from '@/lib/server-auth';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import type { Note } from '@/types/note';
import type { ActionResult } from '@/types/api';

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";
const API_BASE_URL = `${BASE_URL}/api/v1`;

import { revalidateTag } from 'next/cache';
import { getUsersSafe } from '@/app/(dashboard)/[orgSlug]/users/actions';

interface HydratedUser {
    id: string;
    name: string | null;
    full_name: string | null;
    email: string | null;
    image: string | null;
    avatar_url: string | null;
}

interface ApiNote {
    id: number;
    title: string;
    content: string;
    type: Note['type'];
    tags: string;
    is_pinned: 0 | 1;
    is_archived: 0 | 1;
    is_favorite: 0 | 1;
    cover_image: string | null;
    user_id: string;
    task_id: number | null;
    shared_with: (string | any)[];
    created_at: string;
    updated_at: string;
}

function mapApiNote(p: ApiNote): Note {
    const validTypes: Note['type'][] = ['note', 'checklist', 'todo', 'journal', 'meeting', 'idea', 'link', 'code', 'bookmark', 'sketch'];
    
    // Robust tag parsing for JSON array strings or raw text
    let tags = p.tags || '';
    if (typeof tags === 'string' && tags.trim().startsWith('[')) {
        try {
            const parsed = JSON.parse(tags);
            if (Array.isArray(parsed)) {
                tags = parsed.join(', ');
            }
        } catch {
            // Fallback to original string if parsing fails
        }
    }

    return {
        id: p.id,
        title: p.title || 'Untitled Note',
        content: p.content || '',
        type: validTypes.includes(p.type) ? p.type : 'note',
        tags: tags,
        is_pinned: p.is_pinned,
        is_archived: p.is_archived,
        is_favorite: p.is_favorite,
        cover_image: p.cover_image,
        user_id: p.user_id,
        task_id: p.task_id,
        created_at: p.created_at,
        updated_at: p.updated_at,
    };
}


export const getNotes = cache(async function(limit?: number, skip?: number): Promise<Note[]> {

  const session = await auth();


  if (!session?.user?.accessToken) {

    return [];
  }

  try {

    const [notesRes, users] = await Promise.all([
      fetch(`${API_BASE_URL}/notes?${limit ? `limit=${limit}` : ''}${skip ? `&skip=${skip}` : ''}`, {
        method: 'GET',
        headers: { ...(await getSessionHeaders())! },
        next: { tags: ['notes'], revalidate: 60 }
      }),
      getUsersSafe()
    ]);




    if (!notesRes.ok) {
        if (await handleUnauthorizedResponse(notesRes)) return [];
        console.error("Failed to fetch notes:", await notesRes.text());
        return [];
    }

    const apiNotes: ApiNote[] = await notesRes.json();


    return apiNotes.map(apiNote => {
      const note = mapApiNote(apiNote);
      
      // Hydrate Owner
      const owner = (users as HydratedUser[]).find(u => u.id === note.user_id);
      if (owner) {
        note.owner = {
          id: owner.id,
          name: owner.name,
          full_name: owner.full_name,
          image: owner.image,
          avatar_url: owner.avatar_url,
          email: owner.email
        };
      }

      // Hydrate Shared With
      if (apiNote.shared_with && apiNote.shared_with.length > 0) {
        note.shared_with = apiNote.shared_with.map(shUser => {
          // If it's already an object with an ID, check if it has the required fields
          if (typeof shUser !== 'string' && shUser.id) {
            // Find in hydrated users to get full data if missing
            const u = (users as HydratedUser[]).find(user => user.id === String(shUser.id));
            if (u) {
              return {
                id: u.id,
                name: u.name,
                full_name: u.full_name,
                image: u.image,
                avatar_url: u.avatar_url,
                email: u.email
              };
            }
            // If not found in users list, return the object as is (mapped to Note structure)
            return {
              id: String(shUser.id),
              name: shUser.name || shUser.full_name,
              full_name: shUser.full_name,
              image: shUser.image || shUser.avatar_url,
              avatar_url: shUser.avatar_url,
              email: shUser.email
            };
          }

          // If it's a string (name, email, or ID), find by those fields
          const shIdentifier = String(shUser);
          const u = (users as HydratedUser[]).find(user => 
            user.id === shIdentifier ||
            user.name === shIdentifier || 
            user.full_name === shIdentifier || 
            user.email === shIdentifier
          );

          return u ? {
            id: u.id,
            name: u.name,
            full_name: u.full_name,
            image: u.image,
            avatar_url: u.avatar_url,
            email: u.email
          } : shIdentifier;
        });
      }

      return note;
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return [];
  }
});

export async function getUsers() {
    return getUsersSafe();
}

export async function createNote(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

  const payload = {
    title: formData.get('title'),
    content: formData.get('content'),
    type: formData.get('type'),
    is_pinned: formData.get('is_pinned') === '1' ? 1 : 0,
    is_archived: formData.get('is_archived') === '1' ? 1 : 0,
    is_favorite: formData.get('is_favorite') === '1' ? 1 : 0,
    cover_image: formData.get('cover_image'),
    tags: formData.get('tags') || '',
    task_id: formData.get('task_id') ? Number(formData.get('task_id')) : null,
    user_id: session.user?.id,
    shared_with: [],
  };

  try {
    const response = await fetch(`${API_BASE_URL}/notes`, {
        method: 'POST',
            headers: { ...(await getSessionHeaders())! },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
        const forbiddenMsg = await handleForbiddenResponse(response);
        if (forbiddenMsg) return { success: false, error: forbiddenMsg };
        console.error("createNote: API error", response.status, await response.text());
        return { success: false, error: "Failed to create note" };
    }

    revalidatePath('/notes');
    revalidateTag('notes', 'max');
    return { success: true };
  } catch (error) {
    console.error("Error creating note:", error);
    return { success: false, error: "Failed to create note" };
  }
}

export async function updateNote(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

  const id = formData.get('id');
  if (!id) return { success: false, error: "Missing note ID" };

  const payload: Record<string, unknown> = {};
  if (formData.has('title')) payload.title = formData.get('title');
  if (formData.has('content')) payload.content = formData.get('content');
  if (formData.has('type')) payload.type = formData.get('type');
  if (formData.has('is_pinned')) payload.is_pinned = formData.get('is_pinned') === '1' ? 1 : 0;
  if (formData.has('is_archived')) payload.is_archived = formData.get('is_archived') === '1' ? 1 : 0;
  if (formData.has('is_favorite')) payload.is_favorite = formData.get('is_favorite') === '1' ? 1 : 0;
  if (formData.has('cover_image')) payload.cover_image = formData.get('cover_image');
  if (formData.has('tags')) payload.tags = formData.get('tags') || '';
  if (formData.has('task_id')) {
    const taskId = formData.get('task_id');
    payload.task_id = taskId === "" || taskId === null ? null : Number(taskId);
  }
  if (formData.has('shared_with')) {
    try {
      const sw = formData.get('shared_with') as string;
      payload.shared_with = JSON.parse(sw);
    } catch {
      payload.shared_with = [];
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
        method: 'PATCH',
            headers: { ...(await getSessionHeaders())! },
        body: JSON.stringify(payload)
    });

    const responseText = await response.text();

    if (!response.ok) {
        if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
        const forbiddenMsg = await handleForbiddenResponse(response);
        if (forbiddenMsg) return { success: false, error: forbiddenMsg };
        console.error("updateNote: API error", response.status, responseText);
        return { success: false, error: "Failed to update note" };
    }

    revalidatePath('/notes');
    revalidateTag('notes', 'max');
    return { success: true };
  } catch (error) {
    console.error("Error updating note:", error);
    return { success: false, error: "Failed to update note" };
  }
}

export async function deleteNote(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

  const id = formData.get('id');
  if (!id) return { success: false, error: "Missing note ID" };

  try {
    const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
        method: 'DELETE',
        headers: { ...(await getSessionHeaders())! },
    });

    if (!response.ok) {
        if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
        const forbiddenMsg = await handleForbiddenResponse(response);
        if (forbiddenMsg) return { success: false, error: forbiddenMsg };
        console.error("deleteNote: API error", response.status, await response.text());
        return { success: false, error: "Failed to delete note" };
    }

    revalidatePath('/notes');
    revalidateTag('notes', 'max');
    return { success: true };
  } catch (error) {
    console.error("Error deleting note:", error);
    return { success: false, error: "Failed to delete note" };
  }
}

export async function toggleNoteFlag(noteId: number, field: 'is_pinned' | 'is_favorite' | 'is_archived', value: 0 | 1): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

  const payload = { [field]: value };

  try {
    const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
        method: 'PATCH',
            headers: { ...(await getSessionHeaders())! },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
        const forbiddenMsg = await handleForbiddenResponse(response);
        if (forbiddenMsg) return { success: false, error: forbiddenMsg };
        console.error("toggleNoteFlag: API error", response.status, await response.text());
        return { success: false, error: "Failed to update note" };
    }

    revalidatePath('/notes');
    revalidateTag('notes', 'max');
    return { success: true };
  } catch (error) {
    console.error("Error toggling note flag:", error);
    return { success: false, error: "Failed to update note" };
  }
}

export async function shareNote(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

  const noteId = formData.get('noteId');
  const sharedWith = formData.get('email');
  if (!noteId || !sharedWith) return { success: false, error: "Missing note ID or email" };

  try {
    const response = await fetch(`${API_BASE_URL}/notes/${noteId}/share`, {
        method: 'POST',
            headers: { ...(await getSessionHeaders())! },
        body: JSON.stringify({ email: sharedWith })
    });

    if (!response.ok) {
        if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
        const forbiddenMsg = await handleForbiddenResponse(response);
        if (forbiddenMsg) return { success: false, error: forbiddenMsg };
        console.error("shareNote: API error", response.status, await response.text());
        return { success: false, error: "Failed to share note" };
    }

    revalidatePath('/notes');
    revalidateTag('notes', 'max');
    return { success: true };
  } catch (error) {
    console.error("Error sharing note:", error);
    return { success: false, error: "Failed to share note" };
  }
}
