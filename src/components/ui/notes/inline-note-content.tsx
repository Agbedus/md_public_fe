'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { FiCheck } from 'react-icons/fi';
import { normalizeNoteContent } from '@/lib/note-content';
import { toast } from '@/lib/toast';
import { BusyIcon } from '@/components/ui/busy-icon';
import styles from './note-rich-text.module.css';

const SlashCommandEditor = dynamic(() => import('../editor/slash-command-editor'), { ssr: false });

interface InlineNoteContentProps {
  content: string;
  canModify: boolean;
  renderContent: (content: string, interactive: boolean) => string;
  onSave: (content: string) => Promise<boolean>;
  compact?: boolean;
}

export function InlineNoteContent({ content, canModify, renderContent, onSave, compact = false }: InlineNoteContentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const persist = async (next: string, editing: boolean) => {
    if (!canModify || savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setDraft(next);
    try {
      if (await onSave(next)) {
        setIsEditing(false);
        setDraft(null);
      } else if (!editing) setDraft(null);
    } catch {
      if (!editing) setDraft(null);
      toast.error('Could not save the note. Please try again.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const beginEditing = () => {
    if (!canModify || savingRef.current) return;
    setDraft(normalizeNoteContent(content));
    setIsEditing(true);
  };

  const toggleChecklist = (checkbox: HTMLInputElement, container: HTMLDivElement) => {
    if (!canModify || savingRef.current) return;
    const checkboxes = Array.from(container.querySelectorAll('li[data-type="taskItem"] > label > input[type="checkbox"]'));
    const index = checkboxes.indexOf(checkbox);
    if (index < 0) return;
    const doc = new DOMParser().parseFromString(normalizeNoteContent(content), 'text/html');
    const item = doc.querySelectorAll('li[data-type="taskItem"]')[index];
    if (!item) return;
    item.setAttribute('data-checked', String(checkbox.checked));
    item.querySelector('input[type="checkbox"]')?.toggleAttribute('checked', checkbox.checked);
    void persist(doc.body.innerHTML, false);
  };

  if (isEditing && canModify) {
    return (
      <div className="min-w-0 space-y-3" onClick={(event) => event.stopPropagation()}>
        <div inert={isSaving}>
          <SlashCommandEditor initialContent={draft ?? content} onChange={setDraft} compact />
        </div>
        <div className="flex items-center justify-end gap-2">
          <button type="button" disabled={isSaving} onClick={() => { setIsEditing(false); setDraft(null); }} className="md-btn md-btn-secondary md-btn-sm">Cancel</button>
          <button type="button" disabled={isSaving} onClick={() => void persist(draft ?? content, true)} className="md-btn md-btn-primary md-btn-sm">
            Done <span className="md-btn-chip"><BusyIcon state={isSaving ? 'loading' : 'idle'} icon={<FiCheck />} /></span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.body} ${canModify ? styles.interactive : ''} ${compact ? 'max-h-20 overflow-y-auto' : ''}`}
      aria-label={canModify ? 'Note content. Click text to edit or check an item.' : 'Note content'}
      aria-busy={isSaving || undefined}
      tabIndex={canModify ? 0 : undefined}
      onClick={(event) => {
        const target = event.target as Element;
        if (target instanceof HTMLInputElement && target.type === 'checkbox') {
          toggleChecklist(target, event.currentTarget);
          return;
        }
        if (target.closest('a, input, label')) return;
        if (!window.getSelection()?.toString()) beginEditing();
      }}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && event.key === 'Enter') {
          event.preventDefault();
          beginEditing();
        }
      }}
      dangerouslySetInnerHTML={{ __html: renderContent(draft ?? content, canModify && !isSaving) }}
    />
  );
}
