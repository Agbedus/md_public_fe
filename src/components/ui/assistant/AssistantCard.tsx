import React from 'react';
import { FiFileText, FiCheckSquare } from 'react-icons/fi';
import type { Note } from '@/types/note';
import type { Task } from '@/types/task';

interface CardProps {
  item: Note | Task;
  type: 'note' | 'task';
}

const AssistantCard: React.FC<CardProps> = ({ item, type }) => {
  const isNote = type === 'note';
  const Icon = isNote ? FiFileText : FiCheckSquare;

  return (
    <div className="bg-card rounded-xl p-4 border border-card-border hover:bg-foreground/[0.03] transition-all duration-300 group cursor-pointer">
      <div className="flex items-center mb-2">
        <div className="p-2 rounded-lg bg-foreground/[0.03] mr-3 group-hover:bg-foreground/[0.06] transition-colors">
            <Icon className="text-purple-400 w-5 h-5" />
        </div>
        <h3 className="font-semibold text-foreground truncate group-hover:text-purple-400 transition-colors">
          {isNote ? (item as Note).title : (item as Task).name}
        </h3>
      </div>
      {'content' in item && item.content && (
        <div
          className="text-sm text-text-muted prose prose-sm line-clamp-3 dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: item.content }}
        />
      )}
      {'description' in item && item.description && (
        <p className="text-sm text-text-muted line-clamp-2">{item.description}</p>
      )}
    </div>
  );
};

export default AssistantCard;

