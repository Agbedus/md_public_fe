"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const ProjectProgressChart = ({ data }: { data: Array<{ name: string; progress: number; total: number; completed: number }> }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" />
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis 
          dataKey="name" 
          type="category" 
          width={80} 
          axisLine={false} 
          tickLine={false}
          stroke="var(--chart-axis)"
          fontSize={9}
        />
        <Tooltip
          cursor={{ fill: 'transparent' }}
          contentStyle={{
            backgroundColor: 'var(--tooltip-bg)',
            border: '1px solid var(--tooltip-border)',
            borderRadius: '0.75rem',
            fontSize: '12px'
          }}
          formatter={(value: any) => [`${value}%`, 'Progress']}
        />
        <Bar dataKey="progress" radius={[0, 4, 4, 0]} barSize={12}>
          {data.map((entry, index) => (
            <Cell 
                key={`cell-${index}`} 
                fill={entry.progress === 100 ? 'var(--pastel-emerald)' : 'var(--pastel-indigo)'} 
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ProjectProgressChart;
