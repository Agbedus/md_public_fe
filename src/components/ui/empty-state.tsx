import React from 'react';
import { FiInbox } from 'react-icons/fi';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon = FiInbox, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-24 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-foreground/[0.03] border border-card-border flex items-center justify-center mb-5">
        <Icon className="w-7 h-7 text-text-muted/40" />
      </div>
      <h3 className="text-base font-semibold text-text-muted">{title}</h3>
      {description && (
        <p className="text-sm text-text-muted/60 mt-1 max-w-sm">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-4 py-2 text-sm font-medium rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground/70 hover:text-foreground transition-colors border border-card-border"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
