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
      icon: <FiCheckCircle className="w-5 h-5 text-emerald-400" />,
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      label: "Active Tasks",
      value: stats.pendingTasks,
      icon: <FiClock className="w-5 h-5 text-amber-400" />,
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      label: "Projects",
      value: stats.totalProjects,
      icon: <FiLayers className="w-5 h-5 text-blue-400" />,
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "Notes & Ideas",
      value: stats.totalNotes,
      icon: <FiFileText className="w-5 h-5 text-violet-400" />,
      bg: "bg-violet-500/10",
      border: "border-violet-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {statItems.map((item, idx) => (
        <div
          key={idx}
          className={`glass p-5 rounded-2xl border ${item.border} ${item.bg} flex items-center gap-4 transition-all hover:scale-[1.02]`}
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
