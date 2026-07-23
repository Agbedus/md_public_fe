'use client';

import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { FiSearch, FiX, FiCheck, FiChevronDown } from 'react-icons/fi';
import { Portal } from './portal';

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
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [openUpward, setOpenUpward] = useState(false);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = 250; // Max height approximation
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldOpenUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
      
      setOpenUpward(shouldOpenUpward);
      setCoords({
        top: shouldOpenUpward ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      updateCoords();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

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
      onChange(null); // Or whatever empty value logic you prefer
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Hidden input for form submission */}
      {name && (
        multiple ? (
           // For multi-select, we might need multiple hidden inputs or a JSON string
           // Here we'll use a JSON string as that's what the actions expect for arrays usually
           // BUT the actions currently expect `assigneeIdsSelect` as multiple inputs or `assigneeIds` as JSON.
           // Let's stick to the pattern used in the forms: a hidden input with JSON string if possible, 
           // OR let the parent handle the hidden input. 
           // The most robust way for standard form submission is to not render a hidden input here 
           // if the parent is managing state and submitting via JSON, 
           // BUT for standard FormData, we need inputs.
           // Let's render a hidden input with the name and value.
           <input type="hidden" name={name} value={JSON.stringify(value)} />
        ) : (
           <input type="hidden" name={name} value={value?.toString() || ''} />
        )
      )}

      {/* Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[34px] bg-zinc-900/50 border border-white/5 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer flex items-center justify-between gap-2"
      >
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 border border-white/5 text-[11px] text-zinc-200"
              >
                {option.label}
                <button
                  type="button"
                  onClick={(e) => removeValue(e, option.value)}
                  className="hover:text-white transition-colors"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-zinc-500">{placeholder}</span>
          )}
        </div>
        <FiChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown in Portal */}
      {isOpen && (
        <Portal>
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: openUpward ? 'auto' : `${coords.top}px`,
              bottom: openUpward ? `${window.innerHeight - coords.top}px` : 'auto',
              left: `${coords.left}px`,
              width: `${coords.width}px`,
            }}
            className={`z-[9999] bg-zinc-900 border border-white/5 rounded-xl  overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
              openUpward ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'
            }`}
          >
            <div className="p-2 border-b border-white/5">
              <div className="relative">
                <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 w-3.5 h-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-zinc-800/50 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:bg-zinc-800 transition-colors"
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
                        isSelected ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-300 hover:bg-white/[0.03] hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-xs text-white">{option.label}</div>
                        {option.subLabel && <div className="text-[11px] text-zinc-500 group-hover:text-zinc-400">{option.subLabel}</div>}
                      </div>
                      {isSelected && <FiCheck className="w-4 h-4" />}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-center text-xs text-zinc-500 italic">
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
