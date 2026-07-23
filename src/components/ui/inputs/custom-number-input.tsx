'use client';

import React, { useRef } from 'react';
import { FiMinus, FiPlus } from 'react-icons/fi';

interface CustomNumberInputProps {
  value: number | '';
  onChange: (value: number | '') => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  form?: string;
}

export function CustomNumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder = '0',
  className = '',
  disabled = false,
  name,
  form,
}: CustomNumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleIncrement = () => {
    if (disabled) return;
    const currentValue = value === '' ? 0 : value;
    const newValue = currentValue + step;
    if (max !== undefined && newValue > max) return;
    onChange(newValue);
  };

  const handleDecrement = () => {
    if (disabled) return;
    const currentValue = value === '' ? 0 : value;
    const newValue = currentValue - step;
    if (min !== undefined && newValue < min) return;
    onChange(newValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange('');
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num)) return;
    
    // We allow typing values out of bounds temporarily, or clamp on blur?
    // Let's just pass it up. Validation can happen on form submit or blur if needed.
    // But basic clamp logic here:
    // if (max !== undefined && num > max) return;
    // if (min !== undefined && num < min) return;
    
    onChange(num);
  };

  const handleBlur = () => {
    if (value !== '') {
        let newValue = value;
        if (max !== undefined && newValue > max) newValue = max;
        if (min !== undefined && newValue < min) newValue = min;
        if (newValue !== value) onChange(newValue);
    }
  };

  return (
    <div className={`flex items-center bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all ${className} ${disabled ? 'opacity-50' : ''}`}>
      {name && <input type="hidden" name={name} value={value} form={form} />}
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || (min !== undefined && value !== '' && value <= min)}
        className="px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/[0.03] disabled:opacity-30 disabled:hover:bg-transparent transition-colors border-r border-white/5"
      >
        <FiMinus className="w-3.5 h-3.5" />
      </button>
      
      <input
        ref={inputRef}
        type="number"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-transparent border-none text-center text-white text-sm focus:ring-0 px-2 py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || (max !== undefined && value !== '' && value >= max)}
        className="px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/[0.03] disabled:opacity-30 disabled:hover:bg-transparent transition-colors border-l border-white/5"
      >
        <FiPlus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
