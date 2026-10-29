"use client";

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Sector } from 'recharts';
import type { PieSectorShapeProps } from 'recharts';

import { ChartEmpty } from './chart-empty';

// Slices are priorities, so colour follows the priority rather than the
// slice's position: urgent reads red wherever it lands in the ring.
const PRIORITY_COLORS: Record<string, string> = {
  'High Priority': 'var(--pastel-rose)',
  'Medium Priority': 'var(--pastel-amber)',
  'Low Priority': 'var(--success)',
};

function RoundedAllocationSector(props: PieSectorShapeProps) {
  const { innerRadius, outerRadius, startAngle, endAngle } = props;
  const halfAngle = Math.min(Math.abs(endAngle - startAngle), 180) * Math.PI / 360;
  const sine = Math.sin(halfAngle);
  // Fit both corner pairs inside the actual slice. Forcing a full-radius
  // corner on a tiny slice makes Recharts draw an off-track circle instead.
  const cornerRadius = Math.max(0, Math.min(
    10,
    (outerRadius - innerRadius) / 2,
    outerRadius * sine / (1 + sine) * 0.95,
    sine < 1 ? innerRadius * sine / (1 - sine) * 0.95 : 10,
  ));
  return <Sector {...props} cornerRadius={cornerRadius} forceCornerRadius={false} />;
}

const TimeAllocationChart = ({ data }: { data: Array<{ name: string; value: number }> }) => {
  if (!data.some((d) => d.value > 0)) {
    return <ChartEmpty message="No tasks yet. Their split by priority appears here." actionLabel="Add a task" actionHref="tasks" />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
          paddingAngle={4}
          cornerRadius={10}
          shape={RoundedAllocationSector}
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
