'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { FiX, FiMail } from 'react-icons/fi';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailChipInputProps {
  emails: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
}

export function EmailChipInput({ emails, onChange, placeholder = 'Enter email addresses...' }: EmailChipInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addEmail = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed || !EMAIL_RE.test(trimmed)) return;
    if (emails.includes(trimmed)) return;
    onChange([...emails, trimmed]);
  };

  const removeEmail = (index: number) => {
    onChange(emails.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail(input);
      setInput('');
    }
    if (e.key === 'Backspace' && !input && emails.length > 0) {
      removeEmail(emails.length - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    const parts = text.split(/[,;\s]+/).filter(Boolean);
    if (parts.length > 1) {
      e.preventDefault();
      const newEmails = [...emails];
      for (const part of parts) {
        const trimmed = part.trim().toLowerCase();
        if (EMAIL_RE.test(trimmed) && !newEmails.includes(trimmed)) {
          newEmails.push(trimmed);
        }
      }
      onChange(newEmails);
    }
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-xl border border-card-border bg-foreground/[0.02] focus-within:border-foreground/30 transition-colors cursor-text min-h-[42px]"
      onClick={() => inputRef.current?.focus()}
    >
      <FiMail size={14} className="text-text-muted flex-shrink-0" />
      {emails.map((email, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-medium border border-indigo-500/20"
        >
          {email}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeEmail(i); }}
            className="hover:text-indigo-300 transition-colors"
          >
            <FiX size={12} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => {
          if (input) {
            addEmail(input);
            setInput('');
          }
        }}
        placeholder={emails.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-foreground placeholder:text-text-muted outline-none border-none py-0.5"
      />
    </div>
  );
}
