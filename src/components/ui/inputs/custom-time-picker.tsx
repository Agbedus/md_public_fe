'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { FiClock } from 'react-icons/fi';
import { Portal } from '@/components/ui/portal';

interface CustomTimePickerProps {
  value: string; // HH:mm format
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomTimePicker({
  value,
  onChange,
  placeholder = 'Select time',
  className = '',
  disabled = false,
}: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<SVGSVGElement>(null);
  
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [openUpward, setOpenUpward] = useState(false);

  const [hours, setHours] = useState(parseInt(value.split(':')[0]) || 0);
  const [minutes, setMinutes] = useState(parseInt(value.split(':')[1]) || 0);
  const [activeRing, setActiveRing] = useState<'hours' | 'minutes' | null>(null);

  // Track previous value and open state to sync navigation/time state during render
  const [prevValue, setPrevValue] = useState(value);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (value !== prevValue || isOpen !== prevIsOpen) {
    setPrevValue(value);
    setPrevIsOpen(isOpen);
    
    if (value) {
      const [h, m] = value.split(':');
      setHours(parseInt(h) || 0);
      setMinutes(parseInt(m) || 0);
    }
  }

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = 380; 
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldOpenUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
      
      setOpenUpward(shouldOpenUpward);
      setCoords({
        top: shouldOpenUpward ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: 280, // Fixed width for clock
      });
    }
  };

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isOpen) updateCoords();
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

  const handleTimeUpdate = useCallback((h: number, m: number) => {
    const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    onChange(formatted);
  }, [onChange]);

  const calculateValueFromCoords = (clientX: number, clientY: number) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = clientX - centerX;
    const y = clientY - centerY;
    
    const angle = Math.atan2(y, x) + Math.PI / 2;
    const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
    const distance = Math.sqrt(x * x + y * y);
    
    // Thresholds for rings
    // Inner ring (hours): ~50-80px
    // Outer ring (minutes): ~90-120px
    const isInner = distance < 85;

    if (isInner) {
      let h = Math.round((normalizedAngle / (2 * Math.PI)) * 24) % 24;
      setHours(h);
      handleTimeUpdate(h, minutes);
      return 'hours';
    } else {
      let m = Math.round((normalizedAngle / (2 * Math.PI)) * 60) % 60;
      setMinutes(m);
      handleTimeUpdate(hours, m);
      return 'minutes';
    }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const ring = calculateValueFromCoords(clientX, clientY);
    if (ring) setActiveRing(ring as any);
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!activeRing) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = clientX - centerX;
    const y = clientY - centerY;
    
    const angle = Math.atan2(y, x) + Math.PI / 2;
    const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;

    if (activeRing === 'hours') {
      let h = Math.round((normalizedAngle / (2 * Math.PI)) * 24) % 24;
      setHours(h);
      handleTimeUpdate(h, minutes);
    } else {
      let m = Math.round((normalizedAngle / (2 * Math.PI)) * 60) % 60;
      setMinutes(m);
      handleTimeUpdate(hours, m);
    }
  }, [activeRing, hours, minutes, handleTimeUpdate]);

  const handleMouseUp = useCallback(() => {
    setActiveRing(null);
  }, []);

  useEffect(() => {
    if (activeRing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [activeRing, handleMouseMove, handleMouseUp]);

  // SVG Helpers
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-foreground/[0.03] border border-card-border rounded-lg px-3 py-1.5 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer flex items-center justify-between gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-foreground/[0.06]'}`}
      >
        <div className="flex items-center gap-2 truncate flex-1">
          <FiClock className="text-text-muted w-3.5 h-3.5 shrink-0" />
          <span className={`font-numbers ${value ? 'text-foreground' : 'text-text-muted'}`}>
            {value || placeholder}
          </span>
        </div>
      </div>

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
            className={`z-[9999] bg-card border border-card-border rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 backdrop-blur-3xl ${
                openUpward ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'
              }`}
          >
            {/* Readout */}
            <div className="px-6 pt-6 pb-2 flex flex-col items-center">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black font-numbers text-foreground tracking-tighter">
                  {hours.toString().padStart(2, '0')}
                </span>
                <span className="text-2xl font-black text-indigo-500">:</span>
                <span className="text-4xl font-black font-numbers text-foreground tracking-tighter">
                  {minutes.toString().padStart(2, '0')}
                </span>
              </div>
              <div className="flex gap-4 mt-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${activeRing === 'hours' ? 'text-indigo-400' : 'text-text-muted'}`}>Hours</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${activeRing === 'minutes' ? 'text-indigo-400' : 'text-text-muted'}`}>Minutes</span>
              </div>
            </div>

            {/* Circular Clock SVG */}
            <div className="p-4 flex justify-center items-center touch-none">
              <svg
                ref={clockRef}
                width="240"
                height="240"
                viewBox="0 0 240 240"
                className="cursor-crosshair select-none"
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
              >
                {/* Background Rings */}
                <circle cx="120" cy="120" r="110" className="fill-foreground/[0.02] stroke-foreground/[0.05]" />
                <circle cx="120" cy="120" r="70" className="fill-foreground/[0.03] stroke-foreground/[0.05]" />
                
                {/* Minute Ticks (Outer) */}
                {Array.from({ length: 60 }).map((_, i) => (
                  <line
                    key={`min-tick-${i}`}
                    {...(() => {
                      const p1 = polarToCartesian(120, 120, i % 5 === 0 ? 105 : 108, i * 6);
                      const p2 = polarToCartesian(120, 120, 110, i * 6);
                      return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
                    })()}
                    stroke={i === minutes ? '#818cf8' : 'currentColor'}
                    className={i === minutes ? '' : 'text-foreground'}
                    strokeOpacity={i === minutes ? 1 : i % 5 === 0 ? 0.3 : 0.1}
                    strokeWidth={i % 5 === 0 ? 2 : 1}
                  />
                ))}

                {/* Minute Labels */}
                {[0, 15, 30, 45].map((m) => {
                  const p = polarToCartesian(120, 120, 92, m * 6);
                  return (
                    <text
                      key={`min-lab-${m}`}
                      x={p.x}
                      y={p.y}
                      className="fill-foreground font-numbers pointer-events-none"
                      fillOpacity={minutes === m ? 1 : 0.4}
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {m}
                    </text>
                  );
                })}

                {/* Hour Labels (Inner) */}
                {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => {
                  const p = polarToCartesian(120, 120, 52, h * 15);
                  return (
                    <text
                      key={`hr-lab-${h}`}
                      x={p.x}
                      y={p.y}
                      className="fill-foreground font-numbers pointer-events-none"
                      fillOpacity={hours === h ? 1 : 0.4}
                      fontSize="10"
                      fontWeight="black"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {h}
                    </text>
                  );
                })}

                {/* Selection Hand - Minutes */}
                <line
                  x1="120" y1="120"
                  {...(() => {
                    const p = polarToCartesian(120, 120, 110, minutes * 6);
                    return { x2: p.x, y2: p.y };
                  })()}
                  stroke="#818cf8"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  opacity="0.5"
                />
                <circle
                  {...polarToCartesian(120, 120, 110, minutes * 6)}
                  r="4"
                  fill="#818cf8"
                  className="shadow-glow"
                />

                {/* Selection Hand - Hours */}
                <line
                  x1="120" y1="120"
                  {...(() => {
                    const p = polarToCartesian(120, 120, 70, hours * 15);
                    return { x2: p.x, y2: p.y };
                  })()}
                  stroke="#6366f1"
                  strokeWidth="3"
                />
                <circle
                  {...polarToCartesian(120, 120, 70, hours * 15)}
                  r="6"
                  fill="#6366f1"
                />

                {/* Center Hub */}
                <circle cx="120" cy="120" r="4" className="fill-foreground" />
              </svg>
            </div>

            {/* Keyboard access/Footer */}
            <div className="p-4 border-t border-card-border bg-foreground/[0.02] flex justify-between items-center">
                 <button
                     type="button"
                     onClick={() => setIsOpen(false)}
                     className="text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-foreground transition-colors"
                 >
                     Discard
                 </button>
                 <button
                     type="button"
                     onClick={() => setIsOpen(false)}
                     className="text-[10px] font-bold uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                 >
                     Confirm
                 </button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
