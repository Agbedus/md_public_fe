"use client";

import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

function abbreviateProject(name: string): string {
  if (name.length <= 8) return name;
  const words = name.match(/[\p{L}\p{N}]+/gu) ?? [];
  if (words.length < 2) return `${name.slice(0, 7)}…`;
  return words.map((word) => /^\d+$/.test(word) || (word === word.toUpperCase() && word.length <= 5)
    ? word : word[0]).join('').toUpperCase().slice(0, 8);
}

export function WorkloadChart({ data }: { data: Array<{ name: string; tasks: number }> }) {
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
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={data} margin={{ top: 12, right: 12, left: 12, bottom: 4 }}>
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          interval={0}
          tickMargin={10}
          height={32}
          tickFormatter={abbreviateProject}
          tick={{ fill: 'var(--chart-axis)', fontSize: 10, textAnchor: 'middle' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'var(--tooltip-bg)', 
            border: '1px solid var(--tooltip-border)', 
            borderRadius: '12px',
          }}
          itemStyle={{ color: 'var(--foreground)', fontSize: '12px' }}
          labelStyle={{ color: 'var(--foreground)', whiteSpace: 'normal', overflowWrap: 'anywhere' }}
          wrapperStyle={{ maxWidth: 240 }}
          cursor={{ fill: 'var(--chart-grid)' }}
        />
        <Bar dataKey="tasks" name="Tasks" radius={[10, 10, 10, 10]} maxBarSize={44}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default WorkloadChart;
