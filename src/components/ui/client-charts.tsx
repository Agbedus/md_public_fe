"use client"

import dynamic from "next/dynamic"

export const ProductivityChart = dynamic(() => import('@/components/charts/productivity-chart'), { ssr: false });
export const TasksChart = dynamic(() => import('@/components/charts/tasks-chart'), { ssr: false });
export const WorkloadChart = dynamic(() => import('@/components/charts/workload-chart'), { ssr: false });
export const TimeAllocationChart = dynamic(() => import('@/components/charts/time-allocation-chart'), { ssr: false });
export const ProjectProgressChart = dynamic(() => import('@/components/charts/project-progress-chart'), { ssr: false });
export const ActivityHeatmap = dynamic(() => import('@/components/charts/activity-heatmap'), { ssr: false });
export const VelocityChart = dynamic(() => import('@/components/charts/velocity-chart'), { ssr: false });