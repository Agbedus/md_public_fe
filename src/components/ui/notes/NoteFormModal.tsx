'use client';

import React, { useRef, useEffect, useState } from 'react';
import { FiCheck, FiX, FiStar, FiMapPin, FiArchive } from 'react-icons/fi';
import type { Note } from '@/types/note';
import type { Task } from '@/types/task';
import SlashCommandEditor from '../editor/slash-command-editor';
import { CustomSelect } from '@/components/ui/inputs/custom-select';
import { EMPTY_NOTE_CHECKLIST } from '@/lib/note-content';

import { BusyIcon } from '@/components/ui/busy-icon';
interface NoteFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (formData: FormData) => Promise<void>;
    noteTypes: Note['type'][];
    isSaving: boolean;
    initialNote?: Note;
    tasks?: Task[];
    currentUser?: {
        id?: string | null;
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
}

export default function NoteFormModal({ isOpen, onClose, onSave, noteTypes, isSaving, initialNote, tasks, currentUser }: NoteFormModalProps) {
     const formRef = useRef<HTMLFormElement>(null);
     const titleRef = useRef<HTMLInputElement>(null);

     // Controlled form state to avoid DOM timing issues
     const [title, setTitle] = useState('');
     const [content, setContent] = useState('');
     const [priority, setPriority] = useState<Note['priority'] | ''>('low');
     const [typeVal, setTypeVal] = useState<Note['type'] | ''>('note');
     const [noteId, setNoteId] = useState<string>('');
     const [taskId, setTaskId] = useState<string>('');
     const [tags, setTags] = useState<string>('');
     const [isPinned, setIsPinned] = useState(false);
     const [isFavorite, setIsFavorite] = useState(false);
     const [isArchived, setIsArchived] = useState(false);

    // Track the note we're currently editing to detect changes and reset state during render
    const [prevNoteId, setPrevNoteId] = useState<string | null>(null);
    const [prevIsOpen, setPrevIsOpen] = useState(false);

    const currentInitialNoteId = initialNote ? String(initialNote.id) : null;

    if (currentInitialNoteId !== prevNoteId || isOpen !== prevIsOpen) {
        setPrevNoteId(currentInitialNoteId);
        setPrevIsOpen(isOpen);
        
        if (initialNote) {
            setTitle(initialNote.title || '');
            setContent(initialNote.content || '');
            setPriority(initialNote.priority || 'low');
            setTypeVal(initialNote.type || 'note');
            setTaskId(initialNote.task_id ? String(initialNote.task_id) : '');
            setNoteId(String(initialNote.id));
            setTags(initialNote.tags || '');
            setIsPinned(initialNote.is_pinned === 1);
            setIsFavorite(initialNote.is_favorite === 1);
            setIsArchived(initialNote.is_archived === 1);
        } else if (isOpen) {
            setTitle('');
            setContent('');
            setPriority('low');
            setTypeVal('note');
            setNoteId('');
            setTaskId('');
            setTags('');
            setIsPinned(false);
            setIsFavorite(false);
            setIsArchived(false);
        }
    }

    // When `isOpen` changes to true, focus the title input
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => titleRef.current?.focus(), 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        await onSave(formData);
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} aria-hidden={!isOpen}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md transition-opacity duration-300" onClick={onClose} />
            
            {/* Modal Body */}
            <div className={`relative w-full max-w-4xl max-h-[90vh] bg-background rounded-3xl overflow-hidden border border-card-border transition-all duration-300 transform ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`} onClick={e => e.stopPropagation()}>
                <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh]">
                    <div className="px-4 sm:px-6 py-4 flex flex-wrap gap-3 items-center justify-between border-b border-card-border bg-white dark:bg-white/[0.03]">
                        {/* Group 1: Selections */}
                        <div className="flex min-w-0 flex-wrap items-center gap-3">
                            <CustomSelect
                                label="Note priority"
                                name="priority"
                                value={priority || 'low'}
                                onChange={(value) => setPriority(value as Note['priority'])}
                                options={['low', 'medium', 'high'].map(value => ({ value, label: `${value.charAt(0).toUpperCase() + value.slice(1)} priority` }))}
                                className="!w-auto min-w-32"
                                triggerClassName="!h-9 !min-h-9 !py-0 text-xs"
                            />
                            <CustomSelect
                                label="Note type"
                                name="type"
                                value={typeVal || 'note'}
                                onChange={(value) => {
                                    setTypeVal(value as Note['type']);
                                    const body = new DOMParser().parseFromString(content, 'text/html').body;
                                    if (['checklist', 'todo'].includes(value) && !body.textContent?.trim() && !body.querySelector('img, hr, ul, ol')) {
                                        setContent(EMPTY_NOTE_CHECKLIST);
                                    }
                                }}
                                options={noteTypes.map(value => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))}
                                className="!w-auto min-w-28"
                                triggerClassName="!h-9 !min-h-9 !py-0 text-xs"
                            />
                            <CustomSelect
                                label="Associated task"
                                name="task_id"
                                value={taskId}
                                onChange={setTaskId}
                                options={[{ value: '', label: 'No associated task' }, ...(tasks || []).map(task => ({ value: String(task.id), label: task.name }))]}
                                className="!w-auto min-w-36 max-w-48"
                                triggerClassName="!h-9 !min-h-9 !py-0 text-xs"
                            />
                        </div>

                        {/* Group 2: Status */}
                        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-white/[0.03] rounded-xl border border-card-border h-9">
                            <button
                                type="button"
                                onClick={() => setIsPinned(!isPinned)}
                                className={`h-full px-3 rounded-lg transition-all ${isPinned ? 'text-accent-text bg-accent/10' : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.03]'}`}
                                data-tooltip="Pin note" aria-label="Pin note"
                            >
                                <FiMapPin size={14} className={isPinned ? 'fill-current' : ''} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsFavorite(!isFavorite)}
                                className={`h-full px-3 rounded-lg transition-all ${isFavorite ? 'text-warning-text bg-warning/10' : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.03]'}`}
                                data-tooltip="Favorite note" aria-label="Favorite note"
                            >
                                <FiStar size={14} className={isFavorite ? 'fill-current' : ''} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsArchived(!isArchived)}
                                className={`h-full px-3 rounded-lg transition-all ${isArchived ? 'text-text-secondary bg-foreground/[0.1]' : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.03]'}`}
                                data-tooltip="Archive note" aria-label="Archive note"
                            >
                                <FiArchive size={14} className={isArchived ? 'fill-current' : ''} />
                            </button>
                        </div>

                        {/* Group 3: Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSaving}
                                className="h-9 w-9 text-text-muted hover:text-foreground hover:bg-foreground/[0.05] transition-all disabled:opacity-50 flex items-center justify-center border border-transparent hover:border-card-border rounded-full"
                                data-tooltip="Cancel" aria-label="Cancel"
                            >
                                <FiX size={18} />
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="md-btn md-btn-primary"
                                data-tooltip={initialNote ? 'Update Note' : 'Save Note'} aria-label={initialNote ? 'Update Note' : 'Save Note'}
                            >
                                <span>{initialNote ? 'Update note' : 'Save note'}</span> <span className="md-btn-chip"><BusyIcon state={isSaving ? 'loading' : 'idle'} icon={<FiCheck />} /></span>

                            </button>
                        </div>
                    </div>

                    <div className="notes-scroll custom-scrollbar flex-grow overflow-y-auto p-4 sm:p-6 md:p-8">
                        <input
                            ref={titleRef}
                            type="text"
                            name="title"
                            id="title"
                            placeholder="Note Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-4xl font-semibold w-full bg-transparent pb-6 text-foreground focus:outline-none placeholder:text-foreground/[0.05] tracking-tightest italic"
                            required
                        />
                        <div className="flex items-center gap-3 mb-8">
                             <input
                                type="text"
                                name="tags"
                                id="tags"
                                placeholder="Add labels (travel, important, research)..."
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                className="text-xs font-bold flex-1 bg-white dark:bg-white/[0.03] border border-card-border py-2.5 px-4 rounded-xl text-foreground focus:outline-none transition-all placeholder:text-text-muted/50 capitalize"
                            />
                        </div>
                        {isOpen && <SlashCommandEditor key={noteId || 'new'} initialContent={content} onChange={setContent} user={initialNote?.owner ? { ...initialNote.owner, name: initialNote.owner.full_name || initialNote.owner.name, image: initialNote.owner.avatar_url || initialNote.owner.image } : currentUser} sharedWith={initialNote?.shared_with} updatedAt={initialNote?.updated_at || initialNote?.created_at} />}
                        <input type="hidden" name="content" value={content} />
                        <input type="hidden" name="id" value={noteId} />
                        <input type="hidden" name="is_pinned" value={isPinned ? '1' : '0'} />
                        <input type="hidden" name="is_favorite" value={isFavorite ? '1' : '0'} />
                        <input type="hidden" name="is_archived" value={isArchived ? '1' : '0'} />
                        {noteId ? <input type="hidden" name="_editing" value="1" /> : null}
                     </div>
                 </form>
             </div>
         </div>
     );
 }
