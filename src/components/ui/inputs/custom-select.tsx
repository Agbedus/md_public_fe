'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { FiCheck, FiChevronDown } from 'react-icons/fi';
import { useAdaptiveDropdown } from '@/hooks/use-adaptive-dropdown';
import { Portal } from '@/components/ui/portal';

interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  form?: string;
  id?: string;
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
  triggerClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CustomSelect({
  options, label, value, defaultValue, onChange, name, form, id,
  disabled = false, icon, className = '', triggerClassName = '', size = 'md',
}: CustomSelectProps) {
  const initialValue = defaultValue ?? options[0]?.value ?? '';
  const [internalValue, setInternalValue] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const selectedValue = value ?? internalValue;
  const selectedOption = options.find((option) => option.value === selectedValue);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuId = useId();
  const { style, side } = useAdaptiveDropdown({
    isOpen, anchorRef: containerRef, dropdownRef,
    matchAnchorWidth: true, minWidth: 180, gap: 4,
  });

  useEffect(() => {
    const ownerForm = inputRef.current?.form;
    if (!ownerForm || value !== undefined) return;
    const reset = () => { setInternalValue(initialValue); setIsOpen(false); };
    ownerForm.addEventListener('reset', reset);
    return () => ownerForm.removeEventListener('reset', reset);
  }, [initialValue, value, form]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      const option = dropdownRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
        ?? dropdownRef.current?.querySelector<HTMLButtonElement>('[role="option"]');
      option?.focus({ preventScroll: true });
    });
    const dismiss = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)
        && !dropdownRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', dismiss);
    };
  }, [isOpen]);

  const close = () => {
    setIsOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  return (
    <div ref={containerRef} className={`relative min-w-0 w-full ${className}`}>
      {name && <input ref={inputRef} type="hidden" name={name} form={form} value={selectedValue} disabled={disabled} />}
      <button
        id={id}
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        className={`flex w-full min-w-0 items-center gap-2 rounded-xl border border-card-border bg-input-bg px-3 text-left text-foreground transition-colors hover:bg-foreground/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50 ${size === 'sm' ? 'min-h-9 py-1.5 text-xs' : size === 'lg' ? 'min-h-12 py-3 text-sm' : 'min-h-11 py-2 text-sm'} ${triggerClassName}`}
      >
        {icon && <span className="shrink-0 text-text-muted">{icon}</span>}
        <span className="min-w-0 flex-1 truncate">{selectedOption?.label ?? label}</span>
        <FiChevronDown className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-150 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <Portal>
          <div
            ref={dropdownRef}
            id={menuId}
            role="listbox"
            aria-label={label}
            style={style}
            onKeyDown={(event) => {
              const items = Array.from(dropdownRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
              const index = items.indexOf(document.activeElement as HTMLButtonElement);
              if (event.key === 'Escape' || event.key === 'Tab') {
                if (event.key === 'Escape') event.preventDefault();
                event.stopPropagation();
                close();
              } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
                  : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
                items[next]?.focus();
              } else if (event.key.length === 1 && event.key !== ' ') {
                const search = [...items.slice(index + 1), ...items.slice(0, index + 1)];
                search.find((item) => item.textContent?.toLowerCase().startsWith(event.key.toLowerCase()))?.focus();
              }
            }}
            className={`md-menu z-[9999] overflow-y-auto shadow-md animate-in fade-in zoom-in-95 duration-150 ease-out motion-reduce:animate-none ${side === 'top' ? 'origin-bottom' : 'origin-top'}`}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={selectedValue === option.value}
                onClick={() => {
                  setInternalValue(option.value);
                  onChange?.(option.value);
                  close();
                }}
                className={`md-menu-item w-full justify-between gap-3 focus-visible:bg-foreground/[0.05] focus-visible:outline-none ${selectedValue === option.value ? 'bg-accent/10' : ''}`}
              >
                <span className="min-w-0 whitespace-normal break-words">{option.label}</span>
                {selectedValue === option.value && <FiCheck className="h-4 w-4 shrink-0 text-accent-text" />}
              </button>
            ))}
          </div>
        </Portal>
      )}
    </div>
  );
}
