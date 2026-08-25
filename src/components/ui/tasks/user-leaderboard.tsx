'use client';

import React from 'react';
import { User } from "@/types/user";
import { Task } from "@/types/task";
import { FiAward, FiCheck, FiStar, FiTrendingUp } from "react-icons/fi";
import Image from 'next/image';

interface UserLeaderboardProps {
  tasks: Task[];
  users: User[];
  selectedUserId?: string;
  onSelectUser: (user: User | null) => void;
}

function isTaskOwnedByOrAssignedTo(task: Task, userId: string): boolean {
  const normalizedUserId = String(userId);
  return String(task.userId ?? '') === normalizedUserId
    || String(task.owner?.id ?? '') === normalizedUserId
    || task.assigneeIds?.some((id) => String(id) === normalizedUserId) === true
    || task.assignees?.some((assignee) => String(assignee.user.id) === normalizedUserId) === true;
}

export function UserLeaderboard({ tasks, users, selectedUserId, onSelectUser }: UserLeaderboardProps) {
  // Keep every workspace member visible, including people who have not yet
  // completed a task. A stable name tie-break keeps ranks from jumping when
  // two people have the same completion count.
  const userPerformance = users.map(user => {
    const completedCount = tasks.filter(task =>
      task.status === 'DONE' && isTaskOwnedByOrAssignedTo(task, user.id)
    ).length;
    
    return { ...user, completedCount };
  }).sort((a, b) =>
    b.completedCount - a.completedCount
    || (a.fullName || a.email).localeCompare(b.fullName || b.email)
  );

  if (userPerformance.length === 0) return null;

  const getAwardIcon = (index: number) => {
    switch(index) {
      case 0: return <FiAward className="text-yellow-400 text-sm sm:text-base pulse-soft" />;
      case 1: return <FiAward className="text-text-secondary text-sm sm:text-base" />;
      case 2: return <FiAward className="text-orange-400 text-sm sm:text-base" />;
      default: return <FiStar className="text-text-muted text-[11px]" />;
    }
  };

  const getAwardBg = (index: number) => {
    switch(index) {
      case 0: return 'bg-yellow-400/10 border-yellow-400/20';
      case 1: return 'bg-zinc-300/10 border-zinc-300/20';
      case 2: return 'bg-orange-400/10 border-orange-400/20';
      default: return 'bg-foreground/[0.03] border-card-border';
    }
  };

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <FiTrendingUp className="text-indigo-500" />
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Leaderboard</h3>
      </div>
      <div className="flex flex-nowrap overflow-x-auto gap-3 pb-2 scrollbar-hide">
        {userPerformance.map((user, i) => (
          <button
            type="button"
            key={user.id}
            aria-pressed={String(selectedUserId ?? '') === String(user.id)}
            onClick={() => onSelectUser(String(selectedUserId ?? '') === String(user.id) ? null : user)}
            title={`Filter tasks for ${user.fullName || user.email}`}
            className={`group flex min-h-11 min-w-[140px] flex-shrink-0 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-[transform,color,background-color,border-color] duration-150 hover:bg-foreground/[0.05] hover:border-foreground/10 active:scale-[0.98] lg:min-w-0 lg:rounded-2xl lg:px-6 lg:py-4 ${
              String(selectedUserId ?? '') === String(user.id)
                ? 'border-indigo-500/40 bg-indigo-500/10 ring-1 ring-indigo-500/20'
                : getAwardBg(i)
            }`}
          >
            <div className="relative">
              {user.avatarUrl ? (
                <Image 
                  src={user.avatarUrl} 
                  alt={user.fullName || user.email} 
                  width={32} 
                  height={32} 
                  className="rounded-lg lg:rounded-xl border-2 border-card-border group-hover:border-foreground/10 transition-colors w-8 h-8 lg:w-12 lg:h-12"
                />
              ) : (
                <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold border border-emerald-500/20 text-xs lg:text-base">
                  {(user.fullName || user.email).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 p-0.5 bg-background rounded-full border border-card-border">
                {getAwardIcon(i)}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium text-text-muted">#{i + 1}</p>
              <p className="text-[11px] lg:text-xs font-bold text-foreground uppercase tracking-tight truncate max-w-[80px] lg:max-w-none">{user.fullName || user.email.split('@')[0]}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">
                {String(selectedUserId ?? '') === String(user.id) && <FiCheck className="h-3 w-3 text-indigo-500" />}
                <span className="text-foreground font-bold font-numbers">{user.completedCount}</span>
                {String(selectedUserId ?? '') === String(user.id) ? 'Filtering' : 'Completed'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
