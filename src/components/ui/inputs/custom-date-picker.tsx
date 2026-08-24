'use client';

import React, { useState, useRef, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addYears, setYear, setMonth, setHours, setMinutes, parseISO } from 'date-fns';
import { FiCalendar, FiChevronLeft, FiChevronRight, FiClock, FiX } from 'react-icons/fi';
import { Portal } from '@/components/ui/portal';
import { useAdaptiveDropdown } from '@/hooks/use-adaptive-dropdown';

interface CustomDatePickerProps {
  value: Date | string | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  enableTime?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  name?: string;
  form?: string;
}

export function CustomDatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  enableTime = false,
  className = '',
  minDate,
  maxDate,
  disabled = false,
  name,
  form,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { style: dropdownStyle, side: dropdownSide } = useAdaptiveDropdown({
    isOpen,
    anchorRef: containerRef,
    dropdownRef,
    preferredSide: 'bottom',
    preferredAlign: 'start',
    gap: 4,
  });

  // Local state for navigation (independent of selected date)
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Time state
  const [selectedHours, setSelectedHours] = useState(0);
  const [selectedMinutes, setSelectedMinutes] = useState(0);

  // Track previous value and open state to sync navigation/time state during render
  const [prevValue, setPrevValue] = useState(value);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (value !== prevValue || isOpen !== prevIsOpen) {
    setPrevValue(value);
    setPrevIsOpen(isOpen);
    
    if (value) {
      const d = typeof value === 'string' ? parseISO(value) : value;
      if (!isNaN(d.getTime())) {
        setCurrentMonth(d);
        setSelectedHours(d.getHours());
        setSelectedMinutes(d.getMinutes());
      }
    }
  }

  const parsedValue = value ? (typeof value === 'string' ? parseISO(value) : value) : null;
  const isValidValue = parsedValue && !isNaN(parsedValue.getTime());

  const formattedValue = isValidValue
    ? format(parsedValue, enableTime ? 'MMM d, yyyy HH:mm' : 'MMM d, yyyy')
    : '';
    
  // Format for hidden input (standard HTML date/datetime format)
  const hiddenValue = isValidValue
    ? format(parsedValue, enableTime ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd')
    : '';

  // Click outside
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

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDayClick = (day: Date) => {
    let newDate = day;
    // Preserve time if time enabled
    if (enableTime) {
      newDate = setHours(newDate, selectedHours);
      newDate = setMinutes(newDate, selectedMinutes);
    }
    onChange(newDate);
    if (!enableTime) setIsOpen(false);
  };

  const handleTimeChange = (type: 'hours' | 'minutes', val: number) => {
    let newVal = val;
    if (type === 'hours') {
        newVal = Math.min(23, Math.max(0, val));
        setSelectedHours(newVal);
    } else {
        newVal = Math.min(59, Math.max(0, val));
        setSelectedMinutes(newVal);
    }

    if (isValidValue) {
      let newDate = new Date(parsedValue!);
      if (type === 'hours') newDate = setHours(newDate, newVal);
      else newDate = setMinutes(newDate, newVal);
      onChange(newDate);
    }
  };

  const clearValue = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  // Generate days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {name && <input type="hidden" name={name} value={hiddenValue} />}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-card-border bg-input-bg px-3 py-2 text-sm text-foreground transition-colors focus:outline-none ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-foreground/10 hover:bg-card'}`}
      >
        <div className="flex items-center gap-2 truncate flex-1">
          <FiCalendar className="text-text-muted w-4 h-4 shrink-0" />
          <span className={formattedValue ? 'text-text-secondary' : 'text-text-muted'}>
            {formattedValue || placeholder}
          </span>
        </div>
        {formattedValue && !disabled && (
          <button
            type="button"
            onClick={clearValue}
            className="p-1 hover:bg-foreground/[0.06] rounded-full text-text-muted hover:text-foreground transition-colors"
          >
             <FiX className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && (
        <Portal>
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            data-side={dropdownSide}
            className={`z-[9999] flex w-80 max-w-[calc(100vw-1.5rem)] flex-col overflow-y-auto rounded-xl border border-card-border bg-card shadow-xl animate-in fade-in zoom-in-95 duration-100 ${
                dropdownSide === 'top' ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'
              }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-card-border bg-card p-3">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-foreground/[0.06] rounded-lg text-text-muted hover:text-foreground transition-colors"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-sm font-semibold text-foreground">
                {format(currentMonth, 'MMMM yyyy')}
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-foreground/[0.06] rounded-lg text-text-muted hover:text-foreground transition-colors"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Grid */}
            <div className="p-3">
              <div className="grid grid-cols-7 mb-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-[11px] font-bold text-text-muted uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  const isSelected = isValidValue && isSameDay(day, parsedValue!);
                  const isTodayDate = isToday(day);

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => handleDayClick(day)}
                      disabled={
                        (minDate && day < minDate) || 
                        (maxDate && day > maxDate)
                      }
                      className={`
                        h-8 w-full rounded-lg flex items-center justify-center text-xs transition-all relative
                        ${!isCurrentMonth ? 'text-text-muted' : 'text-text-secondary'}
                        ${isSelected ? 'bg-indigo-600 text-white font-bold  -indigo-500/20' : 'hover:bg-foreground/[0.06] hover:text-foreground'}
                        ${isTodayDate && !isSelected ? 'border border-indigo-500/30 text-indigo-400' : ''}
                        disabled:opacity-20 disabled:cursor-not-allowed
                      `}
                    >
                      {format(day, 'd')}
                      {isTodayDate && !isSelected && (
                         <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-500 rounded-full"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Picker */}
            {enableTime && (
              <div className="border-t border-card-border bg-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <FiClock className="text-text-muted w-3.5 h-3.5" />
                  <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Time</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex flex-1 items-center rounded-lg border border-card-border bg-input-bg px-2 py-1">
                        <input
                        type="number"
                        min={0}
                        max={23}
                        value={selectedHours.toString().padStart(2, '0')}
                        onChange={(e) => handleTimeChange('hours', parseInt(e.target.value) || 0)}
                        className="w-full bg-transparent border-none text-center text-foreground text-sm focus:ring-0 p-0 appearance-none"
                        style={{ MozAppearance: 'textfield' }}
                        />
                         <span className="text-text-muted px-1">:</span>
                         <input
                        type="number"
                        min={0}
                        max={59}
                        value={selectedMinutes.toString().padStart(2, '0')}
                        onChange={(e) => handleTimeChange('minutes', parseInt(e.target.value) || 0)}
                        className="w-full bg-transparent border-none text-center text-foreground text-sm focus:ring-0 p-0 appearance-none"
                        style={{ MozAppearance: 'textfield' }}
                        />
                    </div>
                </div>
              </div>
            )}
            
            {/* Footer */}
            <div className="flex items-center justify-between border-t border-card-border bg-card p-2">
                <button
                    type="button"
                    onClick={() => {
                        const now = new Date();
                        setCurrentMonth(now);
                        if(enableTime) {
                            setSelectedHours(now.getHours());
                            setSelectedMinutes(now.getMinutes());
                        }
                        // If we are just moving to today, we don't necessarily select it unless desired.
                        // But typically "Today" button selects today.
                        handleDayClick(now);
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1 rounded hover:bg-indigo-500/10 transition-colors"
                >
                    Today
                </button>
                 <button
                     type="button"
                     onClick={() => setIsOpen(false)}
                     className="text-xs text-text-muted hover:text-foreground font-medium px-2 py-1 rounded hover:bg-foreground/[0.06] transition-colors"
                 >
                     Close
                 </button>
            </div>

          </div>
        </Portal>
      )}
    </div>
  );
}
