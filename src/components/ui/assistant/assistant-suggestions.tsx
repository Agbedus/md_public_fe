'use client';

import { FiArrowUpRight, FiCalendar, FiFileText, FiList, FiTrendingUp } from 'react-icons/fi';

const SUGGESTIONS = [
  { icon: FiList, title: 'Plan my day', detail: 'Find the tasks that need attention.', prompt: 'Show me my pending tasks and help me plan my day' },
  { icon: FiFileText, title: 'Catch me up', detail: 'Bring recent notes into focus.', prompt: 'Summarize my recent notes' },
  { icon: FiTrendingUp, title: 'See my progress', detail: 'Look at productivity and momentum.', prompt: 'Show my productivity stats' },
  { icon: FiCalendar, title: 'Create a report', detail: 'Put this month into perspective.', prompt: 'Generate my monthly report' },
];

export function AssistantSuggestions({ onSelect, compact = false, disabled = false }: {
  onSelect: (text: string) => void; compact?: boolean; disabled?: boolean;
}) {
  return (
    <div className={`grid w-full ${compact ? 'grid-cols-1 gap-1.5' : 'grid-cols-1 gap-2.5 sm:grid-cols-2'}`}>
      {SUGGESTIONS.slice(0, compact ? 2 : 4).map(({ icon: Icon, title, detail, prompt }) => (
        <button key={title} type="button" disabled={disabled} onClick={() => onSelect(prompt)}
          className={`group flex min-w-0 items-center gap-3 border border-card-border bg-card text-left transition-[background-color,transform] duration-150 hover:bg-foreground/[0.035] active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none ${compact ? 'min-h-11 rounded-2xl px-3 py-2' : 'rounded-3xl p-4 sm:p-5'}`}>
          <span className={`grid shrink-0 place-items-center rounded-full bg-accent/10 text-accent-text ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}><Icon className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1">
            <span className={`block font-medium text-foreground ${compact ? 'text-xs' : 'text-sm'}`}>{title}</span>
            {!compact && <span className="mt-1 block text-xs leading-relaxed text-text-muted">{detail}</span>}
          </span>
          <FiArrowUpRight className="h-4 w-4 shrink-0 text-text-muted transition-colors group-hover:text-foreground" />
        </button>
      ))}
    </div>
  );
}
