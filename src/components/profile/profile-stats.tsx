"use client";

import React from "react";
import { FiCheckCircle, FiClock, FiLayers, FiFileText } from "react-icons/fi";

interface ProfileStatsProps {
  stats: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    totalProjects: number;
    totalNotes: number;
  };
}

const ProfileStats: React.FC<ProfileStatsProps> = ({ stats }) => {
  const completionRate =
    stats.totalTasks > 0
      ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
      : 0;

  const statItems = [
    {
      label: "Tasks Completed",
      value: stats.completedTasks,
      total: stats.totalTasks,
      icon: <FiCheckCircle className="w-5 h-5 text-success-text" />,
      bg: "bg-success/10",
      border: "border-success/20",
    },
    {
      label: "Active Tasks",
      value: stats.pendingTasks,
      icon: <FiClock className="w-5 h-5 text-warning-text" />,
      bg: "bg-warning/10",
      border: "border-warning/20",
    },
    {
      label: "Projects",
      value: stats.totalProjects,
      icon: <FiLayers className="w-5 h-5 text-accent-text" />,
      bg: "bg-accent/10",
      border: "border-accent/20",
    },
    {
      label: "Notes & Ideas",
      value: stats.totalNotes,
      icon: <FiFileText className="w-5 h-5 text-[var(--status-qa)]" />,
      bg: "bg-[color-mix(in_oklab,var(--status-qa)_10%,transparent)]",
      border: "border-[color-mix(in_oklab,var(--status-qa)_20%,transparent)]",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {statItems.map((item, idx) => (
        <div
          key={idx}
          className={`bg-card p-5 rounded-2xl border ${item.border} ${item.bg} flex items-center gap-4 transition-all hover:scale-[1.02]`}
        >
          <div className="p-3 rounded-xl bg-background/50 border border-card-border">{item.icon}</div>
          <div>
            <p className="text-sm font-medium text-(--text-muted)">{item.label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground tracking-tight">
                {item.value}
              </span>
              {item.total !== undefined && (
                <span className="text-xs text-(--text-muted)">/ {item.total}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProfileStats;
