import React, { useState, useMemo } from 'react';
import { FiCheckSquare, FiCheckCircle, FiClock, FiAlertCircle, FiCheck, FiActivity } from "react-icons/fi";
import { Task } from "@/types/task";
import { batchUpdateTaskStatus } from '@/app/(dashboard)/[orgSlug]/tasks/actions';
import { StatTile } from "@/components/ui/stat-tile";
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
      title: 'Complete all tasks',
      message: `Are you sure you want to mark all ${activeTasks.length} active tasks as completed? This will affect all current items in your workflow.`,
      confirmText: 'Complete all',
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

  const weekly = (days: number[], verb = 'new') => {
    const n = days.reduce((sum, d) => sum + d, 0);
    return n > 0 ? `${n} ${verb} this week` : undefined;
  };

  const stats = [
    { label: 'Total tasks', value: totalTasks, icon: FiCheckSquare, tone: 'var(--accent)', hint: weekly(trends.total) },
    { label: 'Completed', value: completedTasks, icon: FiCheckCircle, tone: 'var(--success)', hint: `${progressPercent}% progress` },
    { label: 'In progress', value: inProgress, icon: FiActivity, tone: 'var(--status-qa)', hint: weekly(trends.inProgress, 'moved') },
    { label: 'High priority', value: highPriority, icon: FiAlertCircle, tone: 'var(--priority-high)', hint: weekly(trends.highPriority) },
  ];

  return (
    <div className="flex flex-col gap-4 mb-4 lg:mb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-muted">Overview</h2>
        {activeTasks.length > 0 && (
          <button
            onClick={handleMarkAllDone}
            disabled={isUpdating}
            className="md-btn md-btn-primary md-btn-sm"
          >
            {isUpdating ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
            ) : (
              <FiCheck className="w-3 h-3" />
            )}
            Mark all as done ({activeTasks.length})
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatTile key={stat.label} {...stat} />
        ))}
      </div>
    </div>
  );
}
