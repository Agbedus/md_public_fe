'use client';

import { useState, useTransition, useEffect, useMemo, useOptimistic, useRef } from 'react';
import { 
    FiPlus, FiGrid, FiList, FiFileText, FiCheckSquare, 
    FiBookOpen, FiUsers, FiZap, FiLink, FiCode, FiBookmark, FiEdit3, FiCheckCircle, FiSearch, FiFolder
} from 'react-icons/fi';
import { EmptyState } from '@/components/ui/empty-state';
import { createNote, updateNote, deleteNote, getUsers } from '@/app/(dashboard)/[orgSlug]/notes/actions';
import { getTasks } from '@/app/(dashboard)/[orgSlug]/tasks/actions';
import type { Note } from "@/types/note";
import type { Task } from "@/types/task";
import type { ActionResult } from "@/types/api";
import NoteCard from './note-card';
import dynamic from 'next/dynamic';
import { useNotes } from '@/hooks/use-notes';
import { createOptimisticNote, updateOptimisticNote } from '@/lib/optimistic-utils';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/providers/confirmation-provider';

const NoteFormModal = dynamic(() => import('./NoteFormModal'), { ssr: false });

type ViewMode = 'grid' | 'table';
const noteTypes: Note['type'][] = ['note', 'checklist', 'todo', 'journal', 'meeting', 'idea', 'link', 'code', 'bookmark', 'sketch'];

const noteTypeIcons: Record<Note['type'], React.ElementType> = {
    note: FiFileText,
    checklist: FiCheckSquare,
    todo: FiCheckCircle,
    journal: FiBookOpen,
    meeting: FiUsers,
    idea: FiZap,
    link: FiLink,
    code: FiCode,
    bookmark: FiBookmark,
    sketch: FiEdit3,
};

const noteTypeColors: Record<Note['type'], string> = {
    note: 'text-blue-400',
    checklist: 'text-green-400',
    todo: 'text-purple-400',
    journal: 'text-yellow-400',
    meeting: 'text-indigo-400',
    idea: 'text-pink-400',
    link: 'text-red-400',
    code: 'text-cyan-400',
    bookmark: 'text-orange-400',
    sketch: 'text-teal-400',
};

import NotesLoading from '@/app/(dashboard)/[orgSlug]/notes/loading';

export default function NotesPageClient({ allNotes: initialNotes = [], currentUser }: { allNotes?: Note[], currentUser?: any }) {
    const confirm = useConfirm();
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    // SWR Hook for background sync
    const { notes: serverNotes, mutate, isLoading: notesLoading } = useNotes({ initialNotes });

    // Only show skeleton if we have no data and are loading
    const isLoading = notesLoading && serverNotes.length === 0;

    // Optimistic UI for Notes

    const [optimisticNotes, addOptimisticNote] = useOptimistic(
        serverNotes,
        (state: Note[], action: { type: 'add' | 'update' | 'delete' | 'share', note: Note }) => {
            switch (action.type) {
                case 'add':
                    return [action.note, ...state];
                case 'update':
                    return state.map(n => n.id === action.note.id ? action.note : n);
                case 'delete':
                    return state.filter(n => n.id !== action.note.id);
                default:
                    return state;
            }
        }
    );
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<Note['type'] | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [expandedNoteIds, setExpandedNoteIds] = useState<Set<number>>(new Set());

    const toggleNoteExpansion = (noteId: number) => {
        setExpandedNoteIds(prev => {
            const next = new Set(prev);
            if (next.has(noteId)) {
                next.delete(noteId);
            } else {
                next.add(noteId);
            }
            return next;
        });
    };

    const [availableUsers, setAvailableUsers] = useState<{id: string, name: string | null, email: string | null, image: string | null}[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);

    useEffect(() => {
        getUsers().then(setAvailableUsers);
        getTasks().then(setTasks);
    }, []);

    const handleModalSave = async (formData: FormData) => {
        setErrorMsg(null);
        setIsModalOpen(false);
        const editing = editingNote;
        setEditingNote(null);

        const isEditingFlag = formData.get('_editing') || formData.get('id') || editing;
        
        if (isEditingFlag) {
            const id = Number(formData.get('id') || editing?.id);
            const existing = editing || serverNotes.find(n => n.id === id);
            if (!existing) return;
            
            const updatedNote = updateOptimisticNote(existing, formData);
            startTransition(() => {
                addOptimisticNote({ type: 'update', note: updatedNote });
            });
            
            try {
                await updateNote(formData);
                toast.success("Note updated");
                mutate();
            } catch (err) {
                toast.error("Failed to update note");
                mutate();
            }
        } else {
            const newNote = createOptimisticNote(formData);
            startTransition(() => {
                addOptimisticNote({ type: 'add', note: newNote });
            });
            
            try {
                await createNote(formData);
                toast.success("Note created");
                mutate();
            } catch (err) {
                toast.error("Failed to create note");
                mutate();
            }
        }
    };

    const handleUpdate = async (formData: FormData): Promise<ActionResult> => {
        const id = Number(formData.get('id'));
        const existing = serverNotes.find(n => n.id === id);
        if (existing) {
            const updatedNote = updateOptimisticNote(existing, formData);
            if (formData.has('is_pinned')) updatedNote.is_pinned = formData.get('is_pinned') === '1' ? 1 : 0;
            if (formData.has('is_archived')) updatedNote.is_archived = formData.get('is_archived') === '1' ? 1 : 0;
            if (formData.has('is_favorite')) updatedNote.is_favorite = formData.get('is_favorite') === '1' ? 1 : 0;

            startTransition(() => {
                addOptimisticNote({ type: 'update', note: updatedNote });
            });
        }

        try {
            await updateNote(formData);
            mutate();
            return { success: true };
        } catch (err) {
            toast.error("Update failed");
            mutate();
            return { success: false, error: "Update failed" };
        }
    };

    const pendingDeletions = useRef<Map<number, NodeJS.Timeout>>(new Map());

    const handleDelete = async (formData: FormData): Promise<ActionResult> => {
        const id = Number(formData.get('id'));
        const existing = serverNotes.find(n => n.id === id);
        
        if (!existing) return { success: false, error: "Note not found" };

        startTransition(() => {
            addOptimisticNote({ type: 'delete', note: existing });
        });
        toast.undoable(`Note "${existing.title || 'Untitled'}" deleted`, () => {
            // Undo action
            const timeoutId = pendingDeletions.current.get(id);
            if (timeoutId) {
                clearTimeout(timeoutId);
                pendingDeletions.current.delete(id);
            }
            // Add it back optimistically
            startTransition(() => {
                addOptimisticNote({ type: 'add', note: existing });
            });
            toast.success("Note restored");
        }, { duration: 5000 });

        // Delay the actual server request
        const timeoutId = setTimeout(async () => {
            pendingDeletions.current.delete(id);
            try {
                await deleteNote(formData);
                mutate();
            } catch (err) {
                // If it fails, restore it and show error
                startTransition(() => {
                    addOptimisticNote({ type: 'add', note: existing });
                });
                toast.error("Failed to delete note permanently");
                mutate();
            }
        }, 5000);

        pendingDeletions.current.set(id, timeoutId);
        return { success: true };
    };

    const filteredNotes = useMemo(() => {
        let notes = Array.isArray(optimisticNotes) ? optimisticNotes.filter(Boolean) : [];

        if (filterType !== 'all') {
            notes = notes.filter(note => note.type === filterType);
        }

        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            notes = notes.filter(note => {
                const title = note.title || '';
                const content = note.content || '';
                return title.toLowerCase().includes(lowercasedQuery) ||
                       content.toLowerCase().includes(lowercasedQuery);
            });
        }

        return notes;
    }, [optimisticNotes, filterType, searchQuery]);

    if (isLoading) {
        return <NotesLoading />;
    }

    return (
        <div className="flex flex-col h-screen px-4 py-8 max-w-[1600px] mx-auto text-foreground">
            {/* Non-scrolling Header */}
            <div>
                {/* Page Header */}
                <div className="mb-6 md:mb-10">
                    <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">Notes</h1>
                    <p className="text-text-muted text-sm md:text-lg">Create, organize, and manage your notes.</p>
                </div>

                {/* Controls Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 md:mb-8">
                    <div className="relative flex-1 md:flex-none md:w-64 hidden md:block">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                            type="text"
                            placeholder="Search notes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-foreground/[0.03] border border-card-border rounded-xl focus:outline-none focus:bg-foreground/[0.06] focus:border-card-border text-foreground placeholder:text-text-muted/50 transition-all"
                        />
                    </div>
                    
                    <div className="flex items-center gap-3 md:gap-4 ml-auto">
                        <div className="flex items-center space-x-1 bg-foreground/[0.03] p-1 rounded-xl border border-card-border">
                            <button onClick={() => setViewMode('grid')} className={`p-1.5 md:p-2 rounded-lg transition-all hover-scale ${viewMode === 'grid' ? 'bg-card text-foreground border border-card-border' : 'text-text-muted hover:text-foreground'}`} title="Grid view">
                                <FiGrid className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            <button onClick={() => setViewMode('table')} className={`p-1.5 md:p-2 rounded-lg transition-all hover-scale ${viewMode === 'table' ? 'bg-card text-foreground border border-card-border' : 'text-text-muted hover:text-foreground'}`} title="Table view">
                                <FiList className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        </div>

                        <button onClick={() => setIsModalOpen(true)} className="flex items-center px-3 md:px-5 py-2 md:py-2.5 border border-card-border text-xs md:text-sm font-medium text-foreground rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] hover:border-foreground/10 transition-all hover-scale">
                            <FiPlus className="mr-1 md:mr-2" />
                            <span className="hidden sm:inline">Add new note</span>
                            <span className="sm:hidden">Add</span>
                        </button>
                    </div>
                </div>

                <div className="flex overflow-x-auto scrollbar-hide gap-2 mb-6 md:mb-8 pb-2">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-tight transition-all hover-scale whitespace-nowrap flex-shrink-0 ${filterType === 'all' ? 'bg-foreground text-background' : 'bg-foreground/[0.03] text-text-muted border border-card-border hover:bg-foreground/[0.06] hover:text-foreground'}`}>
                        <FiFolder className={filterType === 'all' ? 'text-background' : 'text-text-muted'} />
                        <span>All Notes</span>
                    </button>
                    {noteTypes.map(type => {
                        const Icon = noteTypeIcons[type] || FiFileText;
                        return (
                            <button 
                                key={type} 
                                onClick={() => setFilterType(type)} 
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-tight transition-all hover-scale whitespace-nowrap flex-shrink-0 border ${filterType === type ? 'bg-foreground text-background border-foreground' : 'bg-foreground/[0.03] text-text-muted border-card-border hover:bg-foreground/[0.06] hover:text-foreground'}`}>
                                {Icon && <Icon className={`${filterType === type ? 'text-background' : (noteTypeColors[type] || 'text-text-muted')}`} />}
                                <span>{type}</span>
                            </button>
                        );
                    })}
                </div>

                {errorMsg && (
                    <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 text-sm">
                        {errorMsg}
                    </div>
                )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-grow overflow-y-auto">
                {viewMode === 'grid' ? (
                    <>
                    <div className="masonry-container mt-4 mb-24 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {filteredNotes.map((note) => {
                            const isExpanded = expandedNoteIds.has(note.id);
                            return (
                                <div 
                                    key={note.id} 
                                    className="masonry-item transition-all duration-300 ease-in-out"
                                    style={{ 
                                        height: isExpanded ? 'calc(var(--card-height) * 2 + 1.5rem)' : 'var(--card-height)' 
                                    }}
                                >
                                    <NoteCard 
                                        note={note} 
                                        onNoteUpdate={handleUpdate} 
                                        onNoteDelete={handleDelete} 
                                        onEdit={(n)=>{ setEditingNote(n); setIsModalOpen(true); }} 
                                        availableUsers={availableUsers} 
                                        viewMode="grid" 
                                        searchQuery={searchQuery}
                                        isExpanded={isExpanded}
                                        onToggleExpand={() => toggleNoteExpansion(note.id)}
                                    />
                                </div>
                            );
                        })}
                        </div>
                        {filteredNotes.length === 0 && (
                            <EmptyState icon={FiFileText} title="No notes found" description="Create a note to get started or adjust your filters." />
                        )}
                    </>
                ) : (
                    <div className="glass rounded-2xl border border-card-border overflow-hidden">
                        <table className="w-full border-collapse">
                            <caption className="sr-only">Notes table</caption>
                            <thead>
                                <tr className="border-b border-card-border bg-foreground/[0.03]">
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider">Title</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider">Content</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider">Priority</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider">Type</th>
                                    <th scope="col" className="px-6 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-card-border">
                                {filteredNotes.map((note) => (
                                    <NoteCard key={note.id} note={note} onNoteUpdate={handleUpdate} onNoteDelete={handleDelete} onEdit={(n)=>{ setEditingNote(n); setIsModalOpen(true); }} availableUsers={availableUsers} viewMode="table" searchQuery={searchQuery} />
                                ))}
                                {filteredNotes.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-24 text-center">
                                            <EmptyState icon={FiFileText} title="No notes found" description="Create a note to get started or adjust your filters." />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <NoteFormModal 
                isOpen={isModalOpen} 
                onClose={() => { setIsModalOpen(false); setEditingNote(null); }}
                onSave={handleModalSave}
                initialNote={editingNote ?? undefined}
                 noteTypes={noteTypes}
                 isSaving={false}
                 tasks={tasks}
                 currentUser={currentUser}
             />
            <style jsx>{`
                .masonry-container {
                    column-gap: 1.5rem; /* 24px */
                    column-count: 1;
                    display: block;
                    /* prefer balanced columns when supported */
                    column-fill: balance;
                    --card-height: 320px; /* default card height */
                    /* hide scrollbar across browsers */
                    scrollbar-width: none; /* Firefox */
                    -ms-overflow-style: none; /* IE 10+ */
                }
                .masonry-container::-webkit-scrollbar {
                    width: 0;
                    height: 0;
                    background: transparent;
                }
                @media (min-width: 768px) { 
                    .masonry-container { 
                        column-count: 2;
                        --card-height: 380px;
                    } 
                }
                @media (min-width: 1024px) { 
                    .masonry-container { 
                        column-count: 3;
                        --card-height: 420px;
                    } 
                }
                .masonry-item {
                    display: inline-block;
                    width: 100%;
                    margin-bottom: 1.5rem; /* 24px */
                    break-inside: avoid;
                    vertical-align: top; /* ensure alignment */
                    height: var(--card-height); /* fix height so inner area can scroll */
                    /* ensure the child card can use full height */
                    box-sizing: border-box;
                    overflow: visible;
                }
                /* ensure the card fills the masonry-item height so its internal flex layout works */
                .masonry-item > .glass,
                .masonry-item > * {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
            `}</style>
        </div>
    );
}
