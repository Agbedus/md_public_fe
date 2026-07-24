"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { useOrgSlug } from "@/hooks/use-org-slug";
import { 
    FiSearch, 
    FiHome, 
    FiCheckSquare, 
    FiCalendar, 
    FiSettings, 
    FiSun, 
    FiMoon, 
    FiPlus, 
    FiChevronRight, 
    FiArrowLeft,
    FiFileText,
    FiBriefcase,
    FiBookOpen,
    FiLoader,
    FiTarget
} from "react-icons/fi";
import { useTheme } from "@/providers/theme-provider";
import { motion, AnimatePresence } from "framer-motion";
import { searchGlobal, SearchResult } from "@/app/lib/search-actions";
import { createTask } from "@/app/(dashboard)/[orgSlug]/tasks/actions";
import { getProjects } from "@/app/(dashboard)/[orgSlug]/projects/actions";
import { emit } from "@/lib/event-bus";
import { Project } from "@/types/project";

interface CommandMenuProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

type View = 'main' | 'create-task';

export function CommandMenu({ open, setOpen }: CommandMenuProps) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const orgSlug = useOrgSlug();
  const orgHref = (path: string) => orgSlug ? `/${orgSlug}${path}` : path;
  
  const [view, setView] = React.useState<View>('main');
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [projects, setProjects] = React.useState<Project[]>([]);

  // Form State for Create Task
  const [taskName, setTaskName] = React.useState("");
  const [taskProjectId, setTaskProjectId] = React.useState("");

  // Keyboard Shortcuts
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape") {
        if (view !== 'main') {
            setView('main');
            setQuery("");
        } else {
            setOpen(false);
        }
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen, view]);

  // Handle Search
  React.useEffect(() => {
    if (view !== 'main') return;
    
    const timeoutId = setTimeout(async () => {
      if (query.length >= 2) {
        setIsSearching(true);
        const data = await searchGlobal(query);
        setResults(data);
        setIsSearching(false);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, view]);

  // Pre-fetch projects for Create Task form
  React.useEffect(() => {
    if (view === 'create-task' && projects.length === 0) {
        getProjects().then(setProjects);
    }
  }, [view, projects.length]);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    setQuery("");
    setView('main');
    command();
  }, [setOpen]);

  const handleCreateTask = async () => {
    if (!taskName) return;
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('name', taskName);
    if (taskProjectId) formData.append('projectId', taskProjectId);
    
    const result = await createTask(formData);
    setIsSubmitting(false);
    
    if (result.success) {
        // Refresh any tasks list that is already mounted (use-tasks listens for
        // this). Without it, quick-creating while already on /tasks would not
        // show the new task until a manual refresh, since router.push to the
        // current route is a no-op.
        emit('task:created');
        runCommand(() => router.push(orgHref('/tasks')));
        setTaskName("");
        setTaskProjectId("");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-md" 
        onClick={() => setOpen(false)}
      />
      
      {/* Dialog */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl"
      >
        <Command className="w-full bg-transparent" loop>
          <div className="flex items-center border-b border-card-border px-4 h-14">
            {view !== 'main' ? (
                <button 
                    onClick={() => setView('main')}
                    className="mr-3 p-1 rounded-lg hover:bg-foreground/[0.05] text-text-muted transition-colors"
                >
                    <FiArrowLeft size={18} />
                </button>
            ) : (
                <FiSearch className="mr-3 h-5 w-5 text-text-muted shrink-0" />
            )}
            
            <Command.Input 
              value={query}
              onValueChange={setQuery}
              placeholder={
                view === 'create-task' ? "Task name..." : "Type a command or search..."
              }
              className="flex h-full w-full bg-transparent py-3 text-base outline-none placeholder:text-text-muted text-foreground font-medium"
              autoFocus
            />
            
            {isSearching && (
                <FiLoader className="ml-2 animate-spin text-text-muted" />
            )}
          </div>
          
          <Command.List className="max-h-[450px] overflow-y-auto overflow-x-hidden p-2 scrollbar-hide">
            <AnimatePresence mode="wait">
              {view === 'main' && (
                <motion.div
                    key="main"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                >
                    {/* Search Results */}
                    {query.length >= 2 && results.length > 0 && (
                        <Command.Group heading="Global Search Results" className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-3 py-2">
                            {results.map((res) => (
                                <Command.Item
                                    key={`${res.type}-${res.id}`}
                                    onSelect={() => runCommand(() => router.push(res.href))}
                                    className="flex cursor-pointer select-none items-center rounded-xl px-3 py-3 text-sm text-text-secondary hover:bg-foreground/[0.05] hover:text-foreground aria-selected:bg-foreground/[0.05] aria-selected:text-foreground transition-all duration-200 group gap-3"
                                >
                                    <div className={`p-2 rounded-lg border border-card-border bg-foreground/[0.03] group-hover:scale-110 transition-transform`}>
                                        {res.type === 'task' && <FiCheckSquare className="text-purple-400" />}
                                        {res.type === 'project' && <FiBriefcase className="text-emerald-400" />}
                                        {res.type === 'wiki' && <FiBookOpen className="text-amber-400" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold tracking-tight">{res.title}</span>
                                        {res.subtitle && <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{res.subtitle}</span>}
                                    </div>
                                    <FiChevronRight className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Command.Item>
                            ))}
                        </Command.Group>
                    )}

                    {query.length >= 2 && results.length === 0 && !isSearching && (
                        <Command.Empty className="py-12 text-center">
                            <FiSearch className="mx-auto h-8 w-8 text-text-muted mb-4 opacity-20" />
                            <p className="text-sm text-text-muted font-medium">No results found for &quot;{query}&quot;</p>
                        </Command.Empty>
                    )}

                    {query.length < 2 && (
                        <>
                            <Command.Group heading="Quick Actions" className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-3 py-2">
                                <Command.Item
                                    onSelect={() => setView('create-task')}
                                    className="flex cursor-pointer select-none items-center rounded-xl px-3 py-3 text-sm text-text-secondary hover:bg-foreground/[0.05] hover:text-foreground aria-selected:bg-foreground/[0.05] aria-selected:text-foreground transition-all duration-200 group"
                                >
                                    <div className="p-2 rounded-lg border border-card-border bg-emerald-500/10 text-emerald-400 mr-3 group-hover:scale-110 transition-transform">
                                        <FiPlus />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold tracking-tight">Create New Task</span>
                                        <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Quickly add to your backlog</span>
                                    </div>
                                    <div className="ml-auto flex items-center gap-1.5 opacity-40">
                                        <kbd className="h-5 px-1.5 rounded border border-card-border bg-foreground/[0.05] text-[10px] font-mono">T</kbd>
                                    </div>
                                </Command.Item>
                            </Command.Group>

                            <Command.Separator className="my-2 h-px bg-card-border" />

                            <Command.Group heading="Navigation" className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-3 py-2">
                                <Command.Item onSelect={() => runCommand(() => router.push(orgHref("/dashboard")))} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-foreground/[0.05] transition-colors cursor-pointer">
                                    <FiHome className="text-blue-400" />
                                    <span className="font-medium">Dashboard</span>
                                </Command.Item>
                                <Command.Item onSelect={() => runCommand(() => router.push(orgHref("/tasks")))} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-foreground/[0.05] transition-colors cursor-pointer">
                                    <FiCheckSquare className="text-purple-400" />
                                    <span className="font-medium">Tasks</span>
                                </Command.Item>
                                <Command.Item onSelect={() => runCommand(() => router.push(orgHref("/projects")))} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-foreground/[0.05] transition-colors cursor-pointer">
                                    <FiBriefcase className="text-emerald-400" />
                                    <span className="font-medium">Projects</span>
                                </Command.Item>
                                <Command.Item onSelect={() => runCommand(() => router.push(orgHref("/settings")))} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-foreground/[0.05] transition-colors cursor-pointer">
                                    <FiSettings className="text-indigo-400" />
                                    <span className="font-medium">Settings</span>
                                </Command.Item>
                            </Command.Group>

                            <Command.Separator className="my-2 h-px bg-card-border" />

                            <Command.Group heading="Appearance" className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-3 py-2">
                                <Command.Item onSelect={() => runCommand(() => setTheme('light'))} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-foreground/[0.05] transition-colors cursor-pointer">
                                    <FiSun className="text-amber-400" />
                                    <span className="font-medium">Light Mode</span>
                                </Command.Item>
                                <Command.Item onSelect={() => runCommand(() => setTheme('dark'))} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-foreground/[0.05] transition-colors cursor-pointer">
                                    <FiMoon className="text-blue-400" />
                                    <span className="font-medium">Dark Mode</span>
                                </Command.Item>
                            </Command.Group>
                        </>
                    )}
                </motion.div>
              )}

              {view === 'create-task' && (
                <motion.div
                    key="create-task"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="p-4 space-y-6"
                >
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Task Title</label>
                            <input 
                                value={taskName}
                                onChange={(e) => setTaskName(e.target.value)}
                                placeholder="What needs to be done?"
                                className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-colors"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Select Project</label>
                            <div className="grid grid-cols-2 gap-2">
                                {projects.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setTaskProjectId(String(p.id))}
                                        className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left ${
                                            taskProjectId === String(p.id)
                                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                                : 'bg-foreground/[0.03] border-card-border text-text-muted hover:border-card-border/50 hover:bg-foreground/[0.05]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                                            <span className="truncate">{p.name}</span>
                                        </div>
                                    </button>
                                ))}
                                <button
                                    onClick={() => setTaskProjectId("")}
                                    className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left ${
                                        taskProjectId === ""
                                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                            : 'bg-foreground/[0.03] border-card-border text-text-muted hover:border-card-border/50 hover:bg-foreground/[0.05]'
                                    }`}
                                >
                                    No Project (Backlog)
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-card-border">
                        <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Press ⌘ + Enter to save</span>
                        <button
                            onClick={handleCreateTask}
                            disabled={!taskName || isSubmitting}
                            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-white font-bold py-2.5 px-8 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                        >
                            {isSubmitting ? <FiLoader className="animate-spin" /> : <FiTarget />}
                            <span>Create Mission</span>
                        </button>
                    </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Command.List>
          
          <div className="border-t border-card-border px-4 py-3 flex items-center justify-between text-[11px] text-text-muted font-bold uppercase tracking-wider">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                    <kbd className="h-5 px-1.5 rounded border border-card-border bg-foreground/[0.05] font-mono text-[10px]">↑↓</kbd>
                    <span>Navigate</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <kbd className="h-5 px-1.5 rounded border border-card-border bg-foreground/[0.05] font-mono text-[10px]">↵</kbd>
                    <span>Select</span>
                </div>
             </div>
             <div className="flex items-center gap-1.5">
                <kbd className="h-5 px-1.5 rounded border border-card-border bg-foreground/[0.05] font-mono text-[10px]">esc</kbd>
                <span>{view === 'main' ? 'Close' : 'Back'}</span>
             </div>
          </div>
        </Command>
      </motion.div>
    </div>
  );
}
