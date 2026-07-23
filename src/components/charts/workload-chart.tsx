"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const COLORS = [
  'var(--pastel-purple)', 
  'var(--pastel-blue)', 
  'var(--pastel-indigo)', 
  'var(--pastel-teal)', 
  'var(--pastel-rose)'
];

export function WorkloadChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: 'var(--chart-axis)', fontSize: 10 }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'var(--tooltip-bg)', 
            border: '1px solid var(--tooltip-border)', 
            borderRadius: '12px',
            backdropFilter: 'blur(8px)',
          }}
          itemStyle={{ color: 'var(--foreground)', fontSize: '12px' }}
          cursor={{ fill: 'var(--chart-grid)' }}
        />
        <Bar dataKey="tasks" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default WorkloadChart;
