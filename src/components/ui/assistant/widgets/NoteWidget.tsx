import type { Note } from "@/types/note";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

interface NoteWidgetProps {
  note: Note;
}

const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
  meeting: { label: "Meeting", color: "text-blue-400", bg: "bg-blue-400/10" },
  idea:    { label: "Idea",    color: "text-yellow-400", bg: "bg-yellow-400/10" },
  journal: { label: "Journal", color: "text-pink-400", bg: "bg-pink-400/10" },
  code:    { label: "Code",    color: "text-purple-400", bg: "bg-purple-400/10" },
};

export default function NoteWidget({ note }: NoteWidgetProps) {
  const type = typeConfig[note.type] ?? { label: note.type, color: "text-zinc-400", bg: "bg-zinc-400/10" };

  return (
    <div className="bg-foreground/[0.03] border border-card-border rounded-xl hover:bg-foreground/[0.06] hover:border-indigo-500/20 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h4 className="font-bold text-[11px] uppercase tracking-wider text-foreground truncate">
            {note.title}
          </h4>
          <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider whitespace-nowrap ${type.color} ${type.bg}`}>
            {type.label}
          </span>
        </div>
        <Link
          href={`/notes?id=${note.id}`}
          className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 whitespace-nowrap flex-shrink-0 transition-colors"
        >
          Open →
        </Link>
      </div>

      {/* Markdown content — safely rendered */}
      <div className="px-4 pb-3 prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-p:text-text-muted prose-p:text-xs prose-pre:bg-foreground/[0.05] prose-pre:border prose-pre:border-card-border prose-code:text-indigo-400 prose-headings:text-foreground prose-headings:text-xs prose-a:text-indigo-400 prose-strong:text-foreground line-clamp-4 overflow-hidden">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
          {note.content.length > 300 ? note.content.slice(0, 300) + "…" : note.content}
        </ReactMarkdown>
      </div>

      {/* Tags */}
      {note.tags && (
        <div className="flex flex-wrap gap-1 px-4 pb-3">
          {note.tags.split(",").map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-lg bg-foreground/[0.03] border border-card-border text-[10px] text-text-muted font-medium"
            >
              #{tag.trim()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
