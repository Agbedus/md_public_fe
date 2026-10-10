"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

import { ChartEmpty } from './chart-empty';

// Projects are categories, so each bar keeps its own hue; the brand accent
// leads so the busiest project reads in the app's main colour.
const COLORS = [
  'var(--pastel-emerald)',
  'var(--pastel-blue)',
  'var(--pastel-amber)',
  'var(--pastel-teal)',
  'var(--pastel-rose)'
];

// Buckets the data action uses for tasks that sit outside any project.
const UNGROUPED = new Set(['No Project', 'No Projects']);

export function WorkloadChart({ data }: { data: any[] }) {
  // A lone "No Project" bar fills the card and says nothing about workload,
  // so the chart only draws once at least one real project has tasks.
  const hasProjectTasks = data.some((d) => !UNGROUPED.has(d.name) && d.tasks > 0);
  if (!hasProjectTasks) {
    const hasTasks = data.some((d) => d.tasks > 0);
    return hasTasks ? (
      <ChartEmpty
        message="None of your tasks belong to a project yet."
        actionLabel="Create a project"
        actionHref="projects"
      />
    ) : (
      <ChartEmpty message="No tasks yet. Workload appears here once tasks are added." actionLabel="Add a task" actionHref="tasks" />
    );
  }

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
