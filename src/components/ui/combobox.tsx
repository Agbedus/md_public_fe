'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FiSearch, FiX, FiCheck, FiChevronDown } from 'react-icons/fi';
import { Portal } from './portal';
import { useAdaptiveDropdown } from '@/hooks/use-adaptive-dropdown';

export interface ComboboxOption {
  value: string | number;
  label: string;
  subLabel?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: (string | number) | (string | number)[];
  onChange: (value: (string | number) | (string | number)[] | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  multiple?: boolean;
  className?: string;
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
    <div className={`relative ${className}`} ref={containerRef}>
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
        className="w-full min-h-[34px] bg-foreground/[0.03] border border-foreground/5 rounded-xl px-3 py-1.5 text-foreground text-xs focus:outline-none focus:bg-foreground/[0.06] transition-all cursor-pointer flex items-center justify-between gap-2"
      >
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-foreground/[0.03] border border-foreground/5 text-[11px] text-text-secondary"
              >
                {option.label}
                <button
                  type="button"
                  onClick={(e) => removeValue(e, option.value)}
                  className="hover:text-foreground transition-colors"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-text-muted">{placeholder}</span>
          )}
        </div>
        <FiChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown in Portal */}
      {isOpen && (
        <Portal>
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className={`z-[9999] bg-background border border-card-border shadow-lg shadow-black/10 rounded-xl overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ease-out motion-reduce:animate-none ${
              dropdownSide === 'top' ? 'origin-bottom' : 'origin-top'
            }`}
          >
            <div className="p-2 border-b border-foreground/5">
              <div className="relative">
                <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted w-3.5 h-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-foreground/[0.03] border border-foreground/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-text-muted focus:outline-none focus:bg-foreground/[0.06] transition-colors"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
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
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between group transition-colors ${
                        isSelected ? 'bg-indigo-500/10 text-indigo-400' : 'text-text-secondary hover:bg-foreground/[0.03] hover:text-foreground'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-xs text-foreground">{option.label}</div>
                        {option.subLabel && <div className="text-[11px] text-text-muted group-hover:text-text-secondary">{option.subLabel}</div>}
                      </div>
                      {isSelected && <FiCheck className="w-4 h-4" />}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-center text-xs text-text-muted italic">
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
