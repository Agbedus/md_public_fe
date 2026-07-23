"use client";
import { useState, useTransition } from "react";
import { FaSearch } from "react-icons/fa";
import type { Note } from "@/types/note";
import type { Task } from "@/types/task";
import NoteCard from "@/components/ui/notes/note-card";
import TaskCard from "@/components/ui/tasks/task-card";
import { getNotes } from "@/app/(dashboard)/[orgSlug]/notes/actions";
import { getTasks } from "@/app/(dashboard)/[orgSlug]/tasks/actions";

type SearchResult = (Note & { type: 'note' }) | (Task & { type: 'task' });

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
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
      }
    });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSearch} className="flex items-center gap-2 mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for notes and tasks..."
            className="w-full px-4 py-2 text-white bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-slate-600"
            disabled={isPending}
          >
            <FaSearch />
          </button>
        </form>

        {isPending ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
                <div className="h-4 w-3/4 bg-slate-700 rounded" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-slate-700/50 rounded" />
                  <div className="h-3 w-5/6 bg-slate-700/50 rounded" />
                </div>
                <div className="pt-2 flex justify-between items-center">
                  <div className="h-5 w-16 bg-slate-700/50 rounded-full" />
                  <div className="h-4 w-20 bg-slate-700/50 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        )}

        {results.length === 0 && !isPending && query && (
          <div className="text-center py-24">
            <FaSearch className="text-6xl text-sky-400 mb-4 mx-auto" />
            <h1 className="text-2xl font-semibold text-white">No results found</h1>
            <p className="text-slate-400 text-sm mt-2">Try a different search term.</p>
          </div>
        )}

        {results.length === 0 && !isPending && !query && (
            <div className="text-center py-24">
                <FaSearch className="text-6xl text-sky-400 mb-4 mx-auto" />
                <h1 className="text-2xl font-semibold text-white">Search</h1>
                <p className="text-slate-400 text-sm mt-2">Search for notes and tasks to get started.</p>
            </div>
        )}
      </div>
    </div>
  );
}
