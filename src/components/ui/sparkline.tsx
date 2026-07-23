"use client";

import React from "react";

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function Sparkline({
  data,
  color = "#6366f1",
  width = 100,
  height = 40,
}: SparklineProps) {
  // Unique ID for gradient to avoid collisions if multiple sparklines exist
  const gradientId = React.useId();

  if (!data || data.length < 2) return null;

  const min = 0; // Standardize baseline at 0
  const max = Math.max(...data, 1); // Avoid division by zero
  const padding = 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y =
      height -
      padding -
      ((val - min) / (max - min)) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(" L ")}`;
  const areaData = `${pathData} L ${width - padding},${height} L ${padding},${height} Z`;

  return (
    <div className="flex items-center" style={{ width, height }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Filled Area */}
        <path d={areaData} fill={`url(#${gradientId})`} stroke="none" />
        
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
