"use client";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import type { Note } from "@/types/note";
import 'quill/dist/quill.snow.css';
import { FiEdit2, FiTrash2, FiFileText, FiCheckSquare, FiBookOpen, FiUsers, FiZap, FiLink, FiCode, FiBookmark, FiEdit3, FiCheckCircle, FiUserPlus, FiLayers, FiClock, FiStar, FiMapPin, FiArchive } from "react-icons/fi";
import { FiMaximize2, FiMinimize2 } from "react-icons/fi";
import UserAvatarGroup from "@/components/ui/user-avatar-group";
import { Portal } from "@/components/ui/portal";
import { Skeleton } from "@/components/ui/skeleton";

import type { ActionResult } from '@/types/api';

interface NoteCardProps {
    note: Note;
    onNoteUpdate: (formData: FormData) => Promise<ActionResult> | void;
    onNoteDelete: (formData: FormData) => Promise<ActionResult> | void;
    viewMode: 'grid' | 'table';
    searchQuery?: string;
    onEdit?: (note: Note) => void;
    availableUsers?: {id: string, name: string | null, email: string | null, image: string | null}[];
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}


function sanitizeHtml(html: string): string {
    if (!html) return '';
    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style').forEach(node => node.remove());
    const elements = doc.getElementsByTagName('*');
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const attrs = Array.from(el.attributes);
        for (const attr of attrs) {
            const name = attr.name.toLowerCase();
            const val = attr.value;
            if (name.startsWith('on')) {
                el.removeAttribute(attr.name);
                continue;
            }
            if ((name === 'href' || name === 'src') && val.trim().toLowerCase().startsWith('javascript:')) {
                el.removeAttribute(attr.name);
                continue;
            }
        }
    }
    return doc.body.innerHTML;
}

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
    note: 'text-[var(--pastel-blue)]',
    checklist: 'text-[var(--pastel-emerald)]',
    todo: 'text-[var(--pastel-purple)]',
    journal: 'text-[var(--pastel-amber)]',
    meeting: 'text-[var(--pastel-indigo)]',
    idea: 'text-[var(--pastel-rose)]',
    link: 'text-[var(--pastel-rose)]',
    code: 'text-[var(--pastel-teal)]',
    bookmark: 'text-[var(--pastel-amber)]',
    sketch: 'text-[var(--pastel-teal)]',
};

const formatPriority = (p: Note['priority'] | undefined): string =>
  p ? p.charAt(0).toUpperCase() + p.slice(1) : '';

const TextHighlight: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
    if (!highlight) {
        return <>{text}</>;
    }
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <mark key={i} className="bg-yellow-300 text-black">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </>
    );
};

export default function NoteCard({ note, onNoteUpdate, onNoteDelete, viewMode, searchQuery = '', onEdit, availableUsers = [], isExpanded = false, onToggleExpand }: NoteCardProps) {
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [selectedUser, setSelectedUser] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [hoveredOwner, setHoveredOwner] = useState(false);
    const [ownerCoords, setOwnerCoords] = useState({ top: 0, left: 0 });
    const ownerRef = useRef<HTMLDivElement>(null);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    const handleOwnerMouseEnter = () => {
        if (ownerRef.current) {
            const rect = ownerRef.current.getBoundingClientRect();
            setOwnerCoords({
                top: rect.top,
                left: rect.left + rect.width / 2,
            });
            setHoveredOwner(true);
        }
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowUserDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAddUser = async () => {
        if (!selectedUser) return;
        setIsSharing(true);
        setShowUserDropdown(false);
        const currentShared = note.shared_with || [];
        // Map hydrated objects back to IDs for the API
        const sharedValues = currentShared.map(u => typeof u === 'string' ? u : u.id);
        
        try {
            if (!sharedValues.includes(selectedUser)) {
                const newList = [...sharedValues, selectedUser];
                const fd = new FormData();
                fd.append('id', String(note.id));
                fd.append('shared_with', JSON.stringify(newList));
                await onNoteUpdate(fd);
            }
        } finally {
            setIsSharing(false);
            setSelectedUser("");
        }
    };


    const priorityBgColorClass = (priority: Note['priority']) => {
        switch (priority) {
            case 'high': return 'bg-[var(--pastel-rose)]/10';
            case 'medium': return 'bg-[var(--pastel-amber)]/10';
            case 'low': return 'bg-[var(--pastel-emerald)]/10';
            default: return 'bg-foreground/[0.05]';
        }
    };
    
    const priorityTextColorClass = (priority: Note['priority']) => {
        switch (priority) {
            case 'high': return 'text-[var(--pastel-rose)]';
            case 'medium': return 'text-[var(--pastel-amber)]';
            case 'low': return 'text-[var(--pastel-emerald)]';
            default: return 'text-text-muted';
        }
    };
    

    const getNoteTags = () => {
        if (!note.tags) return [];
        if (typeof note.tags === 'string') {
            return note.tags.split(',').map(t => t.trim()).filter(Boolean);
        }
        return [];
    };
    const noteTags = getNoteTags();
    
    const TypeIcon = noteTypeIcons[note.type] || FiFileText;
    const typeIconColorClass = noteTypeColors[note.type] || 'text-text-muted';

    const renderContent = (content: string) => {
        const sanitized = sanitizeHtml(content);
        if (!searchQuery || typeof window === 'undefined') {
            return sanitized;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(sanitized, 'text/html');
        const highlightRegex = new RegExp(`(${searchQuery})`, 'gi');

        const walk = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent || '';
                if (highlightRegex.test(text)) {
                    const span = document.createElement('span');
                    span.innerHTML = text.replace(highlightRegex, '<mark class="bg-yellow-300 text-black">$1</mark>');
                    node.parentNode?.replaceChild(span, node);
                }
            } else {
                Array.from(node.childNodes).forEach(walk);
            }
        };

        walk(doc.body);
        return doc.body.innerHTML;
    };

    if (viewMode === 'grid') {
        return (
            <div className={`bg-card rounded-[32px] p-6 flex flex-col h-full border border-card-border hover:border-foreground/10 transition-all duration-500 hover:scale-[1.01] ${isExpanded ? 'ring-2 ring-indigo-500/30' : ''}`}>
                <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-bold text-lg text-foreground tracking-tight truncate">
                                <TextHighlight text={note.title} highlight={searchQuery} />
                            </h3>
                            {note.task_id && (
                                <FiLayers className="text-purple-400 flex-shrink-0" size={16} title="Associated with a task" />
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-text-muted font-bold tracking-tight uppercase">
                            <FiClock className="w-3 h-3" />
                            <span suppressHydrationWarning>{note.updated_at ? new Date(note.updated_at).toLocaleDateString() : note.created_at ? new Date(note.created_at).toLocaleDateString() : 'No date'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                    {onToggleExpand && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                            className="text-text-muted hover:text-foreground transition-colors"
                            title={isExpanded ? "Collapse" : "Expand"}
                        >
                            {isExpanded ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
                        </button>
                    )}
                    {TypeIcon ? (
                        <TypeIcon className={`${typeIconColorClass || 'text-text-muted'} flex-shrink-0`} size={18} />
                    ) : (
                        <div className="w-4 h-4 rounded bg-foreground/[0.05] flex-shrink-0" />
                    )}
                    </div>                </div>

                {/* content area now flexes and scrolls internally */}
                <div className="ql-snow text-sm text-text-secondary overflow-y-auto notes-scroll flex-1">
                    <div className="ql-editor" dangerouslySetInnerHTML={{ __html: hasMounted ? renderContent(note.content || '') : '' }} />
                </div>

                <div className="mt-4">
                    <div className="flex flex-wrap gap-2 mb-3">
                        {noteTags.map((tag: string) => (
                            <span key={tag} className="px-2.5 py-1 bg-foreground/[0.03] text-text-secondary text-[10px] font-bold uppercase tracking-wider rounded-lg border border-card-border">{tag}</span>
                        ))}
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-foreground/[0.03] rounded-lg border border-card-border">
                                {note.is_pinned === 1 && (
                                    <div className="text-blue-400" title="Pinned">
                                        <FiMapPin size={12} className="fill-current" />
                                    </div>
                                )}
                                {note.is_favorite === 1 && (
                                    <div className="text-yellow-400" title="Favorite">
                                        <FiStar size={12} className="fill-current" />
                                    </div>
                                )}
                                {note.is_archived === 1 && (
                                    <div className="text-text-muted" title="Archived">
                                        <FiArchive size={12} className="fill-current" />
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <div 
                                    ref={ownerRef}
                                    onMouseEnter={handleOwnerMouseEnter}
                                    onMouseLeave={() => setHoveredOwner(false)}
                                    className="relative flex-shrink-0 cursor-pointer"
                                >
                                    {note.owner?.avatar_url || note.owner?.image ? (
                                        <Image 
                                            src={(note.owner.avatar_url || note.owner.image)!} 
                                            alt={note.owner.full_name || note.owner.name || 'Owner'} 
                                            width={32} 
                                            height={32} 
                                            className="rounded-full border-2 border-background ring-2 ring-purple-500/20 object-cover" 
                                        />
                                    ) : note.owner?.name || note.owner?.full_name ? (
                                        <div 
                                            className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center justify-center text-xs font-bold border-2 border-background ring-2 ring-purple-500/20"
                                        >
                                            {(note.owner.full_name || note.owner.name)!.charAt(0).toUpperCase()}
                                        </div>
                                    ) : null}
                                </div>                                
                                {( (note.shared_with && note.shared_with.length > 0) || isSharing ) && (
                                    <div className="flex items-center gap-1 border-l border-card-border pl-3">
                                        {note.shared_with && note.shared_with.length > 0 && (
                                            <UserAvatarGroup 
                                                users={note.shared_with.map(u => typeof u === 'string' ? { name: u } : u)} 
                                                size="sm" 
                                                limit={3} 
                                            />
                                        )}
                                        {isSharing && (
                                            <Skeleton className="w-6 h-6 rounded-full" />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Owner Tooltip */}
                        {hoveredOwner && note.owner && (
                            <Portal>
                                <div 
                                    style={{
                                        position: 'fixed',
                                        top: `${ownerCoords.top - 8}px`,
                                        left: `${ownerCoords.left}px`,
                                        transform: 'translate(-50%, -100%)',
                                    }}
                                    className="mb-2 w-48 p-3 bg-background border border-card-border rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-1 duration-200 z-[9999]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-foreground/[0.03] flex-shrink-0 relative overflow-hidden ring-1 ring-card-border">
                                            {note.owner.avatar_url || note.owner.image ? (
                                                <Image src={note.owner.avatar_url || note.owner.image || ''} alt={note.owner.name || ''} fill className="object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-emerald-500 bg-emerald-500/10">
                                                    {(note.owner.full_name || note.owner.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-foreground truncate uppercase tracking-tight">{note.owner.full_name || note.owner.name}</p>
                                            <p className="text-[9px] text-text-muted font-black uppercase tracking-widest">Command Lead</p>
                                        </div>
                                    </div>
                                </div>
                            </Portal>
                        )}
                        <div className="flex items-center space-x-2">
                            <div className="relative" ref={dropdownRef}>
                                <button 
                                    onClick={() => setShowUserDropdown(!showUserDropdown)} 
                                    disabled={isSharing}
                                    className={`p-2 rounded-xl transition-all ${isSharing ? 'text-text-muted cursor-not-allowed' : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.06]'}`}
                                    title="Add User"
                                >
                                    <FiUserPlus size={16} />
                                </button>
                                {showUserDropdown && availableUsers.length > 0 && (
                                    <div className="absolute top-full right-0 mt-2 w-64 bg-background rounded-2xl p-3 border border-card-border z-50 shadow-2xl space-y-3">
                                        <div>
                                            <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 ml-1">Grant Access</p>
                                            <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                                                {availableUsers.map(u => (
                                                    <button
                                                        key={u.id}
                                                        type="button"
                                                        onClick={() => setSelectedUser(u.id)}
                                                        className={`w-full flex items-center gap-3 p-2 rounded-xl text-left border transition-all ${
                                                            selectedUser === u.id 
                                                            ? 'bg-foreground/[0.07] border-indigo-500/30 text-foreground font-bold' 
                                                            : 'bg-transparent border-transparent hover:bg-foreground/[0.04] text-text-secondary hover:text-foreground'
                                                        }`}
                                                    >
                                                        <div className="h-6 w-6 rounded-full bg-foreground/[0.03] flex-shrink-0 relative overflow-hidden ring-1 ring-card-border">
                                                            {u.image ? (
                                                                <Image src={u.image} alt={u.name || ''} fill className="object-cover" />
                                                            ) : (
                                                                <div className="flex h-full w-full items-center justify-center text-[8px] font-black text-emerald-500 bg-emerald-500/10">
                                                                    {(u.name || u.email || '?').charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[10px] font-black truncate uppercase tracking-tight">{u.name || u.email?.split('@')[0]}</p>
                                                            <p className="text-[8px] text-text-muted truncate uppercase tracking-widest">{u.email}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleAddUser}
                                            disabled={!selectedUser}
                                            className="w-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-xl hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/10"
                                        >
                                            Authorize
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => onEdit?.(note)} className="p-2 rounded-xl text-text-muted hover:text-foreground hover:bg-foreground/[0.06] transition-all"><FiEdit2 size={16} /></button>
                            <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(); fd.append('id', note.id.toString()); await onNoteDelete(fd); }} style={{ display: 'inline' }}>
                                <input type="hidden" name="id" value={note.id} />
                                <button type="submit" className="p-2 rounded-xl text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all"><FiTrash2 size={16} /></button>
                            </form>
                        </div>
                        </div>
                        </div>
                        </div>
                        );
                        }

                        const rowClasses = "border-b border-card-border transition-colors hover:bg-foreground/[0.01]";

                        return (
                        <tr className={rowClasses}>
                        <td className="px-6 py-5 text-sm font-bold text-foreground">
                        <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-foreground/[0.03] rounded-md border border-card-border">
                            {note.is_pinned === 1 && (
                                <div className="text-blue-500" title="Pinned">
                                    <FiMapPin size={10} className="fill-current" />
                                </div>
                            )}
                            {note.is_favorite === 1 && (
                                <div className="text-amber-500" title="Favorite">
                                    <FiStar size={10} className="fill-current" />
                                </div>
                            )}
                            {note.is_archived === 1 && (
                                <div className="text-text-muted" title="Archived">
                                    <FiArchive size={10} className="fill-current" />
                                </div>
                            )}
                        </div>
                        <div 
                            ref={ownerRef}
                            onMouseEnter={handleOwnerMouseEnter}
                            onMouseLeave={() => setHoveredOwner(false)}
                            className="relative flex-shrink-0 cursor-pointer"
                        >
                            {note.owner?.avatar_url || note.owner?.image ? (
                                <Image src={(note.owner.avatar_url || note.owner.image)!} alt={note.owner.full_name || note.owner.name || 'Owner'} width={28} height={28} className="rounded-full border border-card-border object-cover ring-2 ring-foreground/[0.03]" />
                            ) : note.owner?.name || note.owner?.full_name ? (
                                <div className="w-7 h-7 rounded-full bg-foreground/[0.05] text-text-secondary flex items-center justify-center text-[10px] font-black border border-card-border">
                                    {(note.owner.full_name || note.owner.name)!.charAt(0).toUpperCase()}
                                </div>
                            ) : null}
                        </div>
                        <span className="uppercase tracking-tight italic">
                            <TextHighlight text={note.title} highlight={searchQuery} />
                        </span>
                        </div>
                        {( (note.shared_with && note.shared_with.length > 0) || isSharing ) && (
                        <div className="flex items-center gap-2 ml-10 shrink-0">
                            {note.shared_with && note.shared_with.length > 0 && (
                                <>
                                    <UserAvatarGroup 
                                        users={note.shared_with.map(u => typeof u === 'string' ? { name: u } : u)} 
                                        size="xs" 
                                        limit={2} 
                                    />
                                </>
                            )}
                            {isSharing && (
                                <Skeleton className="w-5 h-5 rounded-full" />
                            )}
                        </div>
                        )}
                        </div>
                        </td>
                        <td className="px-6 py-5 text-xs text-text-secondary font-medium">
                        <div className="ql-snow">
                        <div className="ql-editor !p-0 line-clamp-2" dangerouslySetInnerHTML={{ __html: hasMounted ? renderContent(note.content || '') : '' }} />
                        </div>
                        </td>
                        <td className="px-6 py-5">
                        <span className={`px-2.5 py-1 inline-flex text-[10px] font-black uppercase tracking-wider rounded-lg border ${priorityBgColorClass(note.priority)} ${priorityTextColorClass(note.priority)} border-current/20`}>
                        {formatPriority(note.priority)}
                        </span>
                        </td>
                        <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1.5">
                        {noteTags.map((tag: string) => (
                        <span key={tag} className="px-2.5 py-0.5 bg-foreground/[0.03] text-text-muted text-[9px] font-black uppercase tracking-widest rounded-md border border-card-border">{tag}</span>
                        ))}
                        {noteTags.length === 0 && <span className="text-text-muted/30 italic text-[10px]">No Tags</span>}
                        </div>
                        </td>
                        <td className="px-6 py-5 text-right space-x-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <div className="relative inline-block" ref={dropdownRef}>
                        <button 
                        type="button" 
                        onClick={() => setShowUserDropdown(!showUserDropdown)} 
                        disabled={isSharing}
                        className={`p-2 rounded-xl transition-all ${isSharing ? 'text-text-muted cursor-not-allowed' : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.06]'}`}
                        title="Add User"
                        >
                        <FiUserPlus size={15} />
                        </button>
                        {showUserDropdown && availableUsers.length > 0 && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-background rounded-2xl p-3 border border-card-border z-50 shadow-2xl space-y-3 text-left">
                            <div>
                                <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 ml-1">Grant Access</p>
                                <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                                    {availableUsers.map(u => (
                                        <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => setSelectedUser(u.id)}
                                            className={`w-full flex items-center gap-3 p-2 rounded-xl text-left border transition-all ${
                                                selectedUser === u.id 
                                                ? 'bg-foreground/[0.07] border-indigo-500/30 text-foreground font-bold' 
                                                : 'bg-transparent border-transparent hover:bg-foreground/[0.04] text-text-secondary hover:text-foreground'
                                            }`}
                                        >
                                            <div className="h-6 w-6 rounded-full bg-foreground/[0.03] flex-shrink-0 relative overflow-hidden ring-1 ring-card-border">
                                                {u.image ? (
                                                    <Image src={u.image} alt={u.name || ''} fill className="object-cover" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-[8px] font-black text-emerald-500 bg-emerald-500/10">
                                                        {(u.name || u.email || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[10px] font-black truncate uppercase tracking-tight">{u.name || u.email?.split('@')[0]}</p>
                                                <p className="text-[8px] text-text-muted truncate uppercase tracking-widest">{u.email}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddUser}
                                disabled={!selectedUser}
                                className="w-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-xl hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/10"
                            >
                                Authorize
                            </button>
                        </div>
                        )}
                        </div>
                        <button type="button" onClick={() => onEdit?.(note)} className="p-2 rounded-xl text-text-muted hover:text-foreground hover:bg-foreground/[0.06] transition-all"><FiEdit2 size={15} /></button>
                        <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(); fd.append('id', note.id.toString()); await onNoteDelete(fd); }} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={note.id} />
                        <button type="submit" className="p-2 rounded-xl text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all"><FiTrash2 size={15} /></button>
                        </form>
                        </td>
                        {/* Owner Tooltip for Table */}
                        {hoveredOwner && note.owner && (
                        <Portal>
                        <div 
                        style={{
                            position: 'fixed',
                            top: `${ownerCoords.top - 8}px`,
                            left: `${ownerCoords.left}px`,
                            transform: 'translate(-50%, -100%)',
                        }}
                        className="mb-2 w-48 p-3 bg-background border border-card-border rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-1 duration-200 z-[9999]"
                        >
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-foreground/[0.03] flex-shrink-0 relative overflow-hidden ring-1 ring-card-border">
                                {note.owner.avatar_url || note.owner.image ? (
                                    <Image src={note.owner.avatar_url || note.owner.image || ''} alt={note.owner.name || ''} fill className="object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-emerald-500 bg-emerald-500/10">
                                        {(note.owner.full_name || note.owner.name || '?').charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 text-left">
                                <p className="text-[10px] font-black text-foreground truncate uppercase tracking-tight">{note.owner.full_name || note.owner.name}</p>
                                <p className="text-[9px] text-text-muted font-black uppercase tracking-widest">Command Lead</p>
                            </div>
                        </div>
                        </div>
                        </Portal>
                        )}
                        </tr>
                        );
                        }