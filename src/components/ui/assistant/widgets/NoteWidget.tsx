"use client";

import type { Note } from "@/types/note";
import Link from "next/link";
import { useOrgPath } from "@/hooks/use-org-slug";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { normalizeNoteContent } from "@/lib/note-content";
import { useIsClient } from "@/hooks/use-is-client";
import noteStyles from "@/components/ui/notes/note-rich-text.module.css";

interface NoteWidgetProps {
  note: Note;
}

const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
  meeting: { label: "Meeting", color: "text-accent-text", bg: "bg-accent/10" },
  idea:    { label: "Idea",    color: "text-warning-text", bg: "bg-warning/10" },
  journal: { label: "Journal", color: "text-pink-400", bg: "bg-pink-400/10" },
  code:    { label: "Code",    color: "text-purple-400", bg: "bg-purple-400/10" },
};

export default function NoteWidget({ note }: NoteWidgetProps) {
  const orgPath = useOrgPath();
  const isClient = useIsClient();
  const content = note.content || '';
  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  const type = typeConfig[note.type] ?? { label: note.type, color: "text-text-muted", bg: "bg-zinc-400/10" };

  return (
    <div className="bg-foreground/[0.03] border border-card-border rounded-2xl hover:bg-foreground/[0.06] hover:border-accent/20 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h4 className="text-sm font-semibold text-foreground truncate">
            {note.title}
          </h4>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${type.color} ${type.bg}`}>
            {type.label}
          </span>
        </div>
        <Link
          href={orgPath(`/notes?id=${note.id}`)}
          className="inline-flex min-h-9 shrink-0 items-center rounded-full px-2 text-xs font-medium text-accent-text transition-colors hover:bg-accent/10"
        >
          Open →
        </Link>
      </div>

      {/* Markdown content — safely rendered */}
      <div className="px-4 pb-3 prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-p:text-text-muted prose-p:text-xs prose-pre:bg-foreground/[0.05] prose-pre:border prose-pre:border-card-border prose-code:text-accent-text prose-headings:text-foreground prose-headings:text-xs prose-a:text-accent-text prose-strong:text-foreground line-clamp-4 overflow-hidden">
        {isHtml ? (
          <div className={noteStyles.body} dangerouslySetInnerHTML={{ __html: isClient ? sanitizeHtml(normalizeNoteContent(content)) : '' }} />
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {content.length > 300 ? content.slice(0, 300) + "…" : content}
          </ReactMarkdown>
        )}
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
