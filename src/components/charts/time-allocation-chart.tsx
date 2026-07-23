"use client";

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = [
  'var(--pastel-purple)', 
  'var(--pastel-emerald)',
  'var(--pastel-amber)',
  'var(--pastel-orange)'
];

const TimeAllocationChart = ({ data }: { data: Array<{ name: string; value: number }> }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--tooltip-bg)',
            border: '1px solid var(--tooltip-border)',
            borderRadius: '0.75rem',
            backdropFilter: 'blur(8px)',
          }}
        />
        <Legend wrapperStyle={{ fontSize: '0.875rem' }} />
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
          labelLine={false}
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
};

export default TimeAllocationChart;
