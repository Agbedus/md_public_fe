"use client";

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ProductivityChart = ({ data }: { data: Array<{ name: string; productivity: number; previousProductivity?: number }> }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <defs>
          <linearGradient id="colorProductivity" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--pastel-indigo)" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="var(--pastel-indigo)" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorPrevious" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--pastel-indigo)" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="var(--pastel-indigo)" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis dataKey="name" stroke="var(--chart-axis)" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--chart-axis)" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--tooltip-bg)',
            border: '1px solid var(--tooltip-border)',
            borderRadius: '0.75rem',
            fontSize: '12px',
            backdropFilter: 'blur(8px)',
          }}
          itemStyle={{ padding: '2px 0' }}
        />
        <Legend 
            wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} 
            iconType="circle"
        />
        <Area 
            name="Previous Period"
            type="monotone" 
            dataKey="previousProductivity" 
            stroke="var(--pastel-indigo)" 
            fill="url(#colorPrevious)"
            strokeWidth={2} 
            strokeDasharray="5 5"
            dot={false}
        />
        <Area 
            name="Current Period"
            type="monotone" 
            dataKey="productivity" 
            stroke="var(--pastel-indigo)" 
            fill="url(#colorProductivity)"
            strokeWidth={3} 
            dot={{ r: 4, fill: 'var(--pastel-indigo)', strokeWidth: 2, stroke: 'var(--background)' }} 
            activeDot={{ r: 6, strokeWidth: 0 }} 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default ProductivityChart;
