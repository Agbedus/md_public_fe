'use client';

import React, { useId } from 'react';

interface TaskDonutChartProps {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
  size?: number;
  strokeWidth?: number;
}

export function TaskDonutChart({ 
  total, 
  done, 
  inProgress, 
  todo, 
  size = 40, 
  strokeWidth = 3 
}: TaskDonutChartProps) {
  const radius = (size / 2) - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  
  const percentage = total > 0 ? (done / total) * 100 : 0;
  
  // Dynamic color based on completion
  const getProgressColor = () => {
    if (percentage < 33) return 'text-rose-400';
    if (percentage < 66) return 'text-amber-400';
    return 'text-emerald-400';
  };
  
  const progressColor = getProgressColor();
  const gradientId = useId().replace(/:/g, ''); // Remove colons for valid SVG ID
  
  // Calculate stroke-dasharray for each segment
  const doneShare = total > 0 ? (done / total) * circumference : 0;
  
  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg width={size} height={size} className="transform -rotate-90 overflow-visible">
        <defs>
          <linearGradient id={`${gradientId}-rose`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
          <linearGradient id={`${gradientId}-amber`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id={`${gradientId}-emerald`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>

        {/* Background / Todo segment (Bottom layer) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-white/10"
        />
        
        {/* Done segment with Gradient */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId}-${percentage < 33 ? 'rose' : percentage < 66 ? 'amber' : 'emerald'})`}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${doneShare} ${circumference}`}
          strokeDashoffset={0}
          className="transition-all duration-500 ease-in-out"
          strokeLinecap="round"
        />
      </svg>
      {/* Percentage in center */}
      <span className={`absolute text-[10px] font-bold ${progressColor} tabular-nums`}>
        {Math.round(percentage)}%
      </span>
    </div>
  );
}
