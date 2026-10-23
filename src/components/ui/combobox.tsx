'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FiSearch, FiX, FiCheck, FiChevronDown } from 'react-icons/fi';
import { Portal } from './portal';
import { useAdaptiveDropdown } from '@/hooks/use-adaptive-dropdown';
import Image from 'next/image';
import { avatarStyle } from '@/lib/avatar-color';

export interface ComboboxOption {
  value: string | number;
  label: string;
  subLabel?: string;
  avatarUrl?: string | null;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: (string | number) | (string | number)[];
  onChange: (value: (string | number) | (string | number)[] | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  multiple?: boolean;
  className?: string;
  triggerClassName?: string;
  compact?: boolean;
  name?: string; // For hidden input
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  multiple = false,
  className = '',
  triggerClassName = '',
  compact = false,
  name,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { style: dropdownStyle, side: dropdownSide } = useAdaptiveDropdown({
    isOpen,
    anchorRef: containerRef,
    dropdownRef,
    preferredSide: 'bottom',
    preferredAlign: 'start',
    gap: 4,
    matchAnchorWidth: true,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (option.subLabel && option.subLabel.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [options, searchQuery]);

  const selectedOptions = useMemo(() => {
    if (multiple) {
      const values = Array.isArray(value) ? value : [];
      return options.filter((o) => values.includes(o.value));
    } else {
      return options.find((o) => o.value === value) ? [options.find((o) => o.value === value)!] : [];
    }
  }, [options, value, multiple]);

  const handleSelect = (optionValue: string | number) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValue = currentValues.includes(optionValue)
        ? currentValues.filter((v) => v !== optionValue)
        : [...currentValues, optionValue];
      onChange(newValue);
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
  };

  const removeValue = (e: React.MouseEvent, optionValue: string | number) => {
    e.stopPropagation();
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      onChange(currentValues.filter((v) => v !== optionValue));
    } else {
      onChange(null);
    }
  };

  return (
    <div className={`relative min-w-0 ${className}`} ref={containerRef}>
      {/* Hidden input for plain FormData submission. Multi-select serializes
          as a JSON string, matching what the server actions expect. */}
      {name && (
        multiple ? (
           <input type="hidden" name={name} value={JSON.stringify(value)} />
        ) : (
           <input type="hidden" name={name} value={value?.toString() || ''} />
        )
      )}

      {/* Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-w-0 min-h-[34px] bg-foreground/[0.03] border border-foreground/5 rounded-xl px-3 py-1.5 text-foreground text-xs focus:outline-none focus:bg-foreground/[0.06] transition-all cursor-pointer flex items-center justify-between gap-2 ${triggerClassName}`}
      >
        <div className={`flex min-w-0 flex-1 gap-1.5 ${compact ? 'flex-nowrap overflow-x-auto scrollbar-hide' : 'flex-wrap'}`}>
          {selectedOptions.length > 0 ? (
            selectedOptions.map((option) => (
              <span
                key={option.value}
                className={`inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-foreground/[0.03] border border-foreground/5 text-[11px] text-text-secondary ${compact ? 'shrink-0 py-0.5 pl-0.5 pr-1.5' : 'px-2 py-0.5'}`}
              >
                {'avatarUrl' in option && <ComboboxAvatar option={option} small />}
                <span className="truncate">{option.label}</span>
                <button
                  type="button"
                  onClick={(e) => removeValue(e, option.value)}
                  className="shrink-0 hover:text-foreground transition-colors"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-text-muted">{placeholder}</span>
          )}
        </div>
        <FiChevronDown className={`w-4 h-4 shrink-0 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown in Portal */}
      {isOpen && (
        <Portal>
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className={`z-[9999] md-menu overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ease-out motion-reduce:animate-none ${
              dropdownSide === 'top' ? 'origin-bottom' : 'origin-top'
            }`}
          >
            <div className="p-1 pb-1.5">
              <div className="relative">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted w-3.5 h-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className={`w-full border border-card-border bg-input-bg pl-9 pr-3 text-foreground placeholder:text-text-muted ${compact ? 'h-8 text-xs' : 'h-10 text-sm'}`}
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const isSelected = multiple
                    ? (Array.isArray(value) && value.includes(option.value))
                    : value === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`md-menu-item group justify-between ${compact ? 'min-h-9 gap-2 px-2.5 py-1' : ''} ${isSelected ? 'bg-accent/10' : ''}`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {'avatarUrl' in option && <ComboboxAvatar option={option} />}
                        <div className="min-w-0">
                          <div className={`truncate text-foreground ${compact ? 'text-xs' : 'text-sm'}`}>{option.label}</div>
                          {option.subLabel && !(compact && 'avatarUrl' in option) && <div className="truncate text-xs text-text-muted">{option.subLabel}</div>}
                        </div>
                      </div>
                      {isSelected && <FiCheck className="h-4 w-4 shrink-0 text-accent-text" />}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-center text-sm text-text-muted">
                  No results found
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

function ComboboxAvatar({ option, small = false }: { option: ComboboxOption; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium ${small ? 'h-4 w-4 text-[9px]' : 'h-6 w-6 text-[10px]'}`}
      style={avatarStyle(option.label)}
      aria-hidden="true"
    >
      {option.avatarUrl && !failed ? (
        <Image src={option.avatarUrl} alt="" fill sizes={small ? '16px' : '24px'} className="object-cover" onError={() => setFailed(true)} />
      ) : option.label.charAt(0).toUpperCase()}
    </span>
  );
}
