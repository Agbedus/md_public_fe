"use client";
import { useState, useTransition } from "react";
import { FiSearch } from "react-icons/fi";
import type { Note } from "@/types/note";
import type { Task } from "@/types/task";
import NoteCard from "@/components/ui/notes/note-card";
import TaskCard from "@/components/ui/tasks/task-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getNotes } from "@/app/(dashboard)/[orgSlug]/notes/actions";
import { getTasks } from "@/app/(dashboard)/[orgSlug]/tasks/actions";

type SearchResult = (Note & { type: 'note' }) | (Task & { type: 'task' });

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    startTransition(async () => {
      try {
        const lowerQuery = query.toLowerCase();

        // Fetch from real backend via server actions
        const [notes, tasks] = await Promise.all([
          getNotes(100),
          getTasks(query, undefined, undefined, undefined, 100)
        ]);

        // Filter notes locally (API doesn't support text search)
        const filteredNotes = notes.filter(n =>
          n.title.toLowerCase().includes(lowerQuery) ||
          n.content.toLowerCase().includes(lowerQuery)
        );

        // Map to search result type
        const noteResults: SearchResult[] = filteredNotes.map(n => ({ ...n, type: 'note' as const }));
        const taskResults: SearchResult[] = tasks.map(t => ({ ...t, type: 'task' as const }));

        setResults([...noteResults, ...taskResults]);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setHasSearched(true);
      }
    });
  };

  return (
    <div className="px-4 py-8 max-w-[1600px] mx-auto min-h-screen">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">Search</h1>
        <p className="text-text-muted text-sm">Find a task or note across your organization.</p>
      </div>

      <form onSubmit={handleSearch} className="relative w-full lg:w-96 group mb-10">
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-[var(--pastel-indigo)] transition-colors" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks and notes..."
          className="w-full h-11 pl-10 pr-24 bg-foreground/[0.03] border border-card-border rounded-xl focus:outline-none focus:bg-foreground/[0.06] focus:border-card-border text-foreground placeholder:text-text-muted/50 transition-all text-sm"
        />
        <button
          type="submit"
          disabled={isPending || !query.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-4 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-500/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isPending ? '...' : 'Search'}
        </button>
      </form>

      {isPending ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-2xl p-5 space-y-3">
              <div className="h-4 w-3/4 bg-foreground/[0.06] rounded" />
              <div className="space-y-2">
                <div className="h-3 w-full bg-foreground/[0.06] rounded" />
                <div className="h-3 w-5/6 bg-foreground/[0.06] rounded" />
              </div>
              <div className="pt-2 flex justify-between items-center">
                <div className="h-5 w-16 bg-foreground/[0.06] rounded-full" />
                <div className="h-4 w-20 bg-foreground/[0.06] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((result) => {
            if (result.type === 'note') {
              return <NoteCard key={`note-${result.id}`} note={result} viewMode="grid" onNoteUpdate={() => {}} onNoteDelete={() => {}} />;
            }
            if (result.type === 'task') {
              return <TaskCard key={`task-${result.id}`} task={result} />;
            }
            return null;
          })}
        </div>
      ) : hasSearched ? (
        <EmptyState icon={FiSearch} title="No results found" description="Try a different search term." />
      ) : (
        <EmptyState icon={FiSearch} title="Search your workspace" description="Search for tasks and notes to get started." />
      )}
    </div>
  );
}
