import React, { useState, useMemo } from 'react';
import { FiCheckSquare, FiCheckCircle, FiClock, FiAlertCircle, FiCheck } from "react-icons/fi";
import { Task } from "@/types/task";
import { batchUpdateTaskStatus } from '@/app/(dashboard)/[orgSlug]/tasks/actions';
import { Sparkline } from "@/components/ui/sparkline";
import { format, subDays, isSameDay } from 'date-fns';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/providers/confirmation-provider';

interface TaskSummarySectionProps {
  tasks: Task[];
}

export function TaskSummarySection({ tasks }: TaskSummarySectionProps) {
  const confirm = useConfirm();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const totalTasks = tasks.length;
  const activeTasks = tasks.filter(t => t.status !== 'DONE');
  const completedTasks = tasks.filter(t => t.status === 'DONE').length;
  const highPriority = tasks.filter(t => t.priority === 'high').length;
  const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate 7-day trends
  const trends = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
    
    const getTrend = (items: Task[], dateField: 'createdAt' | 'updatedAt') => {
      return last7Days.map(day => 
        items.filter(item => {
          const date = item[dateField] ? new Date(item[dateField]!) : null;
          return date && isSameDay(date, day);
        }).length
      );
    };

    return {
      total: getTrend(tasks, 'createdAt'),
      completed: getTrend(tasks.filter(t => t.status === 'DONE'), 'updatedAt'),
      inProgress: getTrend(tasks.filter(t => t.status === 'IN_PROGRESS'), 'updatedAt'),
      highPriority: getTrend(tasks.filter(t => t.priority === 'high'), 'createdAt'),
    };
  }, [tasks]);

  const handleMarkAllDone = async () => {
    if (activeTasks.length === 0) return;
    const confirmed = await confirm({
      title: 'Batch Complete Tasks',
      message: `Are you sure you want to mark all ${activeTasks.length} active tasks as completed? This will affect all current items in your workflow.`,
      confirmText: 'Complete All',
      type: 'warning'
    });

    if (!confirmed) return;

    setIsUpdating(true);
    try {
      const taskIds = activeTasks.map(t => t.id);
      const result = await batchUpdateTaskStatus(taskIds, 'DONE');
      if (result.success) {
        toast.success(`Successfully completed ${taskIds.length} tasks`);
      } else {
        toast.error(result.error || "Failed to update some tasks");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  const FiActivity = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
  );

  const stats = [
    { label: 'Total Tasks', value: totalTasks, icon: FiCheckSquare, color: 'text-[var(--pastel-blue)]', bg: 'bg-[var(--pastel-blue)]/10', trend: trends.total },
    { label: 'Completed', value: completedTasks, icon: FiCheckCircle, color: 'text-[var(--pastel-emerald)]', bg: 'bg-[var(--pastel-emerald)]/10', sub: `${progressPercent}% progress`, trend: trends.completed },
    { label: 'In Progress', value: inProgress, icon: FiActivity, color: 'text-[var(--pastel-purple)]', bg: 'bg-[var(--pastel-purple)]/10', trend: trends.inProgress },
    { label: 'High Priority', value: highPriority, icon: FiAlertCircle, color: 'text-[var(--pastel-rose)]', bg: 'bg-[var(--pastel-rose)]/10', trend: trends.highPriority },
  ];

  return (
    <div className="flex flex-col gap-4 mb-4 lg:mb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Quick Stats</h2>
        {activeTasks.length > 0 && (
          <button
            onClick={handleMarkAllDone}
            disabled={isUpdating}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-[11px] font-medium uppercase tracking-wider text-emerald-400 transition-all disabled:opacity-50"
          >
            {isUpdating ? (
              <div className="h-3 w-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <FiCheck className="w-3 h-3" />
            )}
            Mark all as Done ({activeTasks.length})
          </button>
        )}
      </div>

      <div className="flex overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-4 gap-3 lg:gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-card p-3 lg:p-6 rounded-xl lg:rounded-2xl border border-card-border hover:border-foreground/10 transition-all duration-300 flex flex-col justify-between group min-w-[120px] lg:min-w-0 flex-shrink-0">
            <div className="flex items-center justify-between gap-4 mb-2 lg:mb-4">
              <div className="flex items-center gap-2 lg:gap-4 overflow-hidden">
                <div className={`p-1.5 lg:p-3 rounded-lg lg:rounded-xl ${stat.bg} ${stat.color} transition-colors group-hover:bg-foreground/[0.06] flex-shrink-0`}>
                  <stat.icon className="text-sm lg:text-xl" />
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] lg:text-[11px] text-text-muted font-bold uppercase tracking-wider truncate">{stat.label}</p>
                    {stat.sub && (
                        <p className="text-[11px] lg:text-[11px] font-bold text-text-secondary mt-0.5 uppercase tracking-tight truncate">
                            {stat.sub}
                        </p>
                    )}
                </div>
              </div>
              <div className="h-6 w-12 lg:h-8 lg:w-16 opacity-40 group-hover:opacity-100 transition-all duration-300 flex-shrink-0">
                <Sparkline 
                  data={stat.trend} 
                  color={stat.color.match(/\[(.*?)\]/)?.[1] || "#6366f1"}
                  width={60}
                  height={32}
                />
              </div>
            </div>
            <div className="text-left lg:text-right mt-auto">
              <p className="text-xl lg:text-4xl font-medium font-numbers text-foreground leading-none tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
