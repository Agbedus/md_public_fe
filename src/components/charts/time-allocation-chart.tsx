"use client";

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { ChartEmpty } from './chart-empty';

// Slices are priorities, so colour follows the priority rather than the
// slice's position: urgent reads red wherever it lands in the ring.
const PRIORITY_COLORS: Record<string, string> = {
  'High Priority': 'var(--pastel-rose)',
  'Medium Priority': 'var(--pastel-amber)',
  'Low Priority': 'var(--pastel-blue)',
};

const TimeAllocationChart = ({ data }: { data: Array<{ name: string; value: number }> }) => {
  if (!data.some((d) => d.value > 0)) {
    return <ChartEmpty message="No tasks yet. Their split by priority appears here." actionLabel="Add a task" actionHref="tasks" />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--tooltip-bg)',
            border: '1px solid var(--tooltip-border)',
            borderRadius: '0.75rem',
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
            <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] ?? 'var(--chart-axis)'} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
};

export default TimeAllocationChart;
