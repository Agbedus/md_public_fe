'use server';

import { auth } from '@/auth';
import { getTasks } from '@/app/(dashboard)/[orgSlug]/tasks/actions';
import { getNotes } from '@/app/(dashboard)/[orgSlug]/notes/actions';
import { getProjects } from '@/app/(dashboard)/[orgSlug]/projects/actions';
import { getEvents } from '@/app/(dashboard)/[orgSlug]/calendar/actions';
import { getUsersSafe } from '@/app/(dashboard)/[orgSlug]/users/actions';
import { 
    getMyAttendanceToday, 
    getMyAttendanceHistory, 
    getTeamAttendanceToday 
} from '@/app/(dashboard)/[orgSlug]/attendance/actions';
import { cache } from 'react';
import { format, startOfWeek, endOfWeek, subWeeks, subDays, isSameDay } from 'date-fns';
import type { AttendanceRecord } from '@/types/attendance';
import type { User } from '@/types/user';
import type { Task } from '@/types/task';
import type { Note } from '@/types/note';
import type { CalendarEvent } from '@/types/calendar';
import type { Project } from '@/types/project';

export async function getUserName() {
  const session = await auth();
  return session?.user?.name || 'User';
}

export async function getAttendanceStats() {
    const [myToday, teamToday, myHistory] = await Promise.all([
        getMyAttendanceToday(),
        getTeamAttendanceToday(),
        getMyAttendanceHistory(),
    ]);

    const activeTeam = teamToday.filter(r => r.attendance_state === 'CLOCKED_IN').length;
    const totalTeam = teamToday.length;

    const computeHours = (r: AttendanceRecord) => {
        if (r.total_hours && r.total_hours > 0) return r.total_hours;
        if (r.total_seconds && r.total_seconds > 0) return r.total_seconds / 3600;
        
        const clockIn = r.clock_in_at || r.clock_in;
        const clockOut = r.clock_out_at || r.clock_out;
        
        if (clockIn && clockOut) {
            const start = new Date(clockIn);
            const end = new Date(clockOut);
            const diff = end.getTime() - start.getTime();
            return Math.max(0, diff / (1000 * 60 * 60));
        }
        return 0;
    };

    // Calculate average hours from history (last 5 records)
    const recentHistory = myHistory.slice(0, 5);
    const avgHours = recentHistory.length > 0 
        ? recentHistory.reduce((acc, r) => acc + computeHours(r), 0) / recentHistory.length 
        : 0;

    return {
        myStatus: myToday?.attendance_state || 'NOT_CLOCKED_IN',
        myPresence: myToday?.presence_state || 'OUT_OF_OFFICE',
        teamActiveCount: activeTeam,
        teamTotalCount: totalTeam,
        avgDailyHours: Math.round(avgHours * 10) / 10,
        lastClockIn: myToday?.clock_in_at || myToday?.clock_in || null,
    };
}

export async function getSummaryStats() {
    const [tasks, events, notes, users, projects, attendance] = await Promise.all([
        getTasks(undefined, undefined, undefined, undefined, 1000),
        getEvents(),
        getNotes(1000),
        getUsersSafe(),
        getProjects(),
        getAttendanceStats()
    ]);

    const now = new Date();
    const startOfCurrentWeek = startOfWeek(now);

    const upcomingEvents = events.filter(e => new Date(e.start) >= now);
    const completedTasks = tasks.filter(t => t.status === 'DONE');
    const recentNotes = notes.filter(n => n.updated_at && new Date(n.updated_at) >= startOfCurrentWeek);

    // Calculate 7-day trends for Sparklines
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(now, 6 - i);
        return format(date, 'yyyy-MM-dd');
    });

    const getTrendData = (items: { [key: string]: unknown }[], dateField: string) => {
        return last7Days.map(day => 
            items.filter(item => {
                const val = item[dateField];
                return val && format(new Date(val as string), 'yyyy-MM-dd') === day;
            }).length
        );
    };

    return {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        upcomingEvents: upcomingEvents.length,
        totalNotes: notes.length,
        recentNotesCount: recentNotes.length,
        pendingTasks: tasks.length - completedTasks.length,
        totalUsers: users.length,
        totalProjects: projects.length,
        attendance,
        users: users.slice(0, 3).map((u: { name: string; image: string | null }) => ({ name: u.name, image: u.image })),
        trends: {
            tasks: getTrendData(tasks as unknown as { [key: string]: unknown }[], 'createdAt'),
            completions: getTrendData(completedTasks as unknown as { [key: string]: unknown }[], 'updatedAt'),
            events: getTrendData(events as unknown as { [key: string]: unknown }[], 'start'),
            notes: getTrendData(notes as unknown as { [key: string]: unknown }[], 'created_at'),
            users: getTrendData(users as unknown as { [key: string]: unknown }[], 'created_at')
        }
    };
}

export const getProductivityData = cache(async function(range: string = '7d') {
  // Fetch completed tasks.
  const tasks = await getTasks(undefined, undefined, 'DONE', undefined, 1000);
  
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  
  let days: { name: string, current: string, previous: string }[] = [];
  
  if (range === '7d' || range === 'last_week') {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const anchor = range === '7d' ? now : subWeeks(now, 1);
    const startOfCurrent = range === '7d' ? subDays(now, 6) : startOfWeek(anchor);
    
    days = Array.from({ length: 7 }, (_, i) => {
      const current = new Date(startOfCurrent.getTime() + i * oneDay);
      const previous = subWeeks(current, 1);
      return {
        name: dayNames[current.getDay()],
        current: format(current, 'yyyy-MM-dd'),
        previous: format(previous, 'yyyy-MM-dd')
      };
    });
  } else if (range === '30d') {
    days = Array.from({ length: 30 }, (_, i) => {
      const current = subDays(now, 29 - i);
      const previous = subDays(current, 30);
      return {
        name: format(current, 'MMM d'),
        current: format(current, 'yyyy-MM-dd'),
        previous: format(previous, 'yyyy-MM-dd')
      };
    });
  } else if (range === '90d' || range === '1y') {
    // For longer ranges, we'll return simple current series for now 
    // but optimized to use similar logic if needed.
    // For now, let's keep it simple to avoid overwhelming the chart.
    if (range === '90d') {
      const weeks = 12;
      return Array.from({ length: weeks }, (_, i) => {
        const start = subDays(now, (weeks - i) * 7);
        const end = new Date(start.getTime() + 6 * oneDay);
        const startStr = format(start, 'yyyy-MM-dd');
        const endStr = format(end, 'yyyy-MM-dd');
        
        const currentCount = tasks.filter(t => t.updatedAt && t.updatedAt >= startStr && t.updatedAt <= endStr).length;
        return { name: `W${i + 1}`, productivity: currentCount, previousProductivity: 0 };
      });
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        const monthLabel = months[d.getMonth()];
        const count = tasks.filter(t => {
          if (!t.updatedAt) return false;
          const taskDate = new Date(t.updatedAt);
          return taskDate.getMonth() === d.getMonth() && taskDate.getFullYear() === d.getFullYear();
        }).length;
        return { name: monthLabel, productivity: count, previousProductivity: 0 };
      });
    }
  }

  return days.map(d => {
    const currentCount = tasks.filter(t => t.updatedAt && t.updatedAt.startsWith(d.current)).length;
    const previousCount = tasks.filter(t => t.updatedAt && t.updatedAt.startsWith(d.previous)).length;
    return { 
      name: d.name, 
      productivity: currentCount,
      previousProductivity: previousCount 
    };
  });
});

export async function getTasksOverviewData() {
    // Optimization: fetch tasks once
    const tasks = await getTasks(undefined, undefined, undefined, undefined, 1000);
    
    const now = new Date();
    const startOfCurrentWeek = startOfWeek(now);
    const startOfLastWeek = startOfWeek(subWeeks(now, 1));
    const endOfLastWeek = endOfWeek(subWeeks(now, 1));

    const counts = {
      todo: tasks.filter(t => t.status === 'TODO').length,
      inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      completed: tasks.filter(t => t.status === 'DONE').length
    };

    const previousCounts = {
      todo: tasks.filter(t => t.status === 'TODO' && t.createdAt && new Date(t.createdAt) < startOfCurrentWeek).length,
      inProgress: tasks.filter(t => t.status === 'IN_PROGRESS' && t.updatedAt && new Date(t.updatedAt) < startOfCurrentWeek).length,
      completed: tasks.filter(t => {
          if (!t.updatedAt) return false;
          const updatedDate = new Date(t.updatedAt);
          return updatedDate >= startOfLastWeek && updatedDate <= endOfLastWeek;
      }).length
    };

    const calculateTrend = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return [
      { name: 'Completed', value: counts.completed, trend: calculateTrend(counts.completed, previousCounts.completed) },
      { name: 'In Progress', value: counts.inProgress, trend: calculateTrend(counts.inProgress, previousCounts.inProgress) },
      { name: 'Pending', value: counts.todo, trend: calculateTrend(counts.todo, previousCounts.todo) }, 
    ];
}

export async function getWorkloadData() {
    // Top 5 projects by task count.
    // Complex because we need to join/group.
    // Fetching projects and tasks... parallel.
    const [tasks, projects] = await Promise.all([
        getTasks(undefined, undefined, undefined, undefined, 500),
        getProjects()
    ]);

    const projectTaskCounts = new Map<string, number>();
  
    tasks.forEach(t => {
        if (t.projectId) {
            const proj = projects.find(p => p.id === t.projectId);
            const projName = proj ? proj.name : 'Unknown Project';
            projectTaskCounts.set(projName, (projectTaskCounts.get(projName) || 0) + 1);
        } else {
            projectTaskCounts.set('No Project', (projectTaskCounts.get('No Project') || 0) + 1);
        }
    });

    const workloadData = Array.from(projectTaskCounts.entries())
        .map(([name, tasks]) => ({ name, tasks }))
        .sort((a, b) => b.tasks - a.tasks)
        .slice(0, 5);
  
    if (workloadData.length === 0) {
        workloadData.push({ name: 'No Projects', tasks: 0 });
    }
    return workloadData;
}

export async function getTimeAllocationData() {
    // Based on priorities of all tasks
    const tasks = await getTasks(undefined, undefined, undefined, undefined, 500);

    const highPriority = tasks.filter(t => t.priority === 'high').length;
    const mediumPriority = tasks.filter(t => t.priority === 'medium').length;
    const lowPriority = tasks.filter(t => t.priority === 'low').length;

    const nav = [
        { name: 'High Priority', value: highPriority },
        { name: 'Medium Priority', value: mediumPriority },
        { name: 'Low Priority', value: lowPriority },
    ];
    const cleanTimeAllocationData = nav.filter(d => d.value > 0);
    return cleanTimeAllocationData.length > 0 ? cleanTimeAllocationData : [{name: 'No Tasks', value: 1}];
}

export async function getKeyTasks() {
    // Only show high priority tasks that are in progress (never completed)
    const allTasks = await getTasks(undefined, 'high', 'IN_PROGRESS', undefined, 20);
    
    // Explicitly filter for in_progress only (in case API doesn't filter correctly)
    const tasks = allTasks.filter(t => t.status === 'IN_PROGRESS');
    
    const sorted = tasks.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }).slice(0, 5);

    return sorted.map(t => ({
        title: t.name,
        status: 'In Progress',
        priority: t.priority,
        dueDate: t.dueDate,
        color: 'text-blue-400',
        bg: 'bg-blue-400/10'
    }));
}

export async function getRecentDecisions() {
    // Fetch notes with limit 20 to check tags?
    // Optimization: Just fetch recent notes.
    const notes = await getNotes(50);
    const decisionNotes = notes.filter(n => n.tags.includes('decision') || n.type === 'idea'); 
    return decisionNotes.slice(0, 2).map(n => ({
        name: n.title,
        dueDate: null
    }));
}

export async function getRecentNotes() {
    const notes = await getNotes(4);
    
    return notes.map(n => {
        let color = 'text-zinc-400';
        if (n.type === 'meeting') color = 'text-blue-400';
        if (n.type === 'idea') color = 'text-yellow-400';
        if (n.type === 'journal') color = 'text-pink-400';
        if (n.type === 'code') color = 'text-purple-400';

        return {
            title: n.title,
            content: n.content,
            type: n.type,
            color: color,
            updatedAt: n.updated_at
        };
    });
}

export async function getProjectsOverviewData() {
    const projects = await getProjects();
    
    // For projects we can't easily calculate historical status changes without a log
    // So we'll just return the current counts for now.
    const planningCount = projects.filter(p => p.status === 'planning').length;
    const inProgressCount = projects.filter(p => p.status === 'in_progress').length;
    const completedCount = projects.filter(p => p.status === 'completed').length;
    const onHoldCount = projects.filter(p => p.status === 'on_hold').length;
    
    return [
        { name: 'Active', value: inProgressCount },
        { name: 'Planning', value: planningCount },
        { name: 'Completed', value: completedCount },
        { name: 'On Hold', value: onHoldCount },
    ];
}

export async function getProjectProgressData() {
    const [tasks, projects] = await Promise.all([
        getTasks(undefined, undefined, undefined, undefined, 1000),
        getProjects()
    ]);

    const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'planning').slice(0, 5);
    
    return activeProjects.map(p => {
        const projectTasks = tasks.filter(t => t.projectId === p.id);
        const total = projectTasks.length;
        const completed = projectTasks.filter(t => t.status === 'DONE').length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        return {
            name: p.name,
            progress: progress,
            total: total,
            completed: completed
        };
    }).sort((a, b) => b.progress - a.progress);
}

export async function getAggregatedDashboardData() {
    // Collect all data in parallel
    const [
        productivity,
        overview,
        workload,
        timeAllocation,
        keyTasks,
        decisions,
        notes,
        events,
        allProjects,
        attendance
    ] = await Promise.all([
        getProductivityData(),
        getTasksOverviewData(),
        getWorkloadData(),
        getTimeAllocationData(),
        getTasks(undefined, 'high', 'IN_PROGRESS', undefined, 20), // Fetch more key tasks for context
        getRecentDecisions(),
        getNotes(10), // Fetch more notes
        getEvents(),
        getProjects(),
        getAttendanceStats()
    ]);

    // Process events (upcoming 7 days)
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingEvents = events
        .filter(e => new Date(e.start) >= now && new Date(e.start) <= nextWeek)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, 10);

    // Format as a readable string for the AI
    return `
    FULL DASHBOARD CONTEXT:
    
    0. Attendance & Team Presence:
       - My Status: ${attendance.myStatus} (${attendance.myPresence})
       - Team Presence: ${attendance.teamActiveCount} / ${attendance.teamTotalCount} active
       - My Avg Daily Hours: ${attendance.avgDailyHours}h
       - Last Clock-in: ${attendance.lastClockIn || 'N/A'}
    
    1. Productivity Trend (Last 7 Days):
    ${productivity.map(p => `   - ${p.name}: ${p.productivity} completed tasks`).join('\n')}
    
    2. Task Status Overview:
    ${overview.map(o => `   - ${o.name}: ${o.value}`).join('\n')}
    
    3. Workload Distribution:
    ${workload.map(w => `   - ${w.name}: ${w.tasks} tasks`).join('\n')}
    
    4. Time Allocation (Priority):
    ${timeAllocation.map(t => `   - ${t.name}: ${t.value}`).join('\n')}
    
    5. Key/High-Priority Tasks (Top 20):
    ${keyTasks.map(t => `   - [${t.status}] ${t.name} (Due: ${t.dueDate || 'N/A'})`).join('\n')}
    
    6. Upcoming Events (Next 7 Days):
    ${upcomingEvents.length > 0 ? upcomingEvents.map(e => `   - ${e.title} at ${e.start} (${e.location || 'No location'})`).join('\n') : '   - No upcoming events found.'}
    
    7. Active Projects:
    ${allProjects.slice(0, 10).map(p => `   - ${p.name} [${p.status}]`).join('\n')}
    
    8. Recent Notes (Top 10):
    ${notes.map(n => `   - ${n.title} [${n.type}] (Tags: ${n.tags || 'none'})`).join('\n')}
    
    9. Recent Decisions/Ideas:
    ${decisions.map(d => `   - ${d.name}`).join('\n')}
    `;
}

let prioritiesCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function getAIPriorities() {
    if (prioritiesCache && Date.now() - prioritiesCache.timestamp < CACHE_TTL) {
        return prioritiesCache.data;
    }

    const dashboardData = await getAggregatedDashboardData();
    const apiKey = process.env.NVIDIA_BUILD_API_KEY;
    
    if (!apiKey) {
        console.error("NVIDIA_BUILD_API_KEY not set for priorities");
        return [];
    }

    try {
        const model = "minimaxai/minimax-m3";
        const baseUrl = "https://integrate.api.nvidia.com/v1/chat/completions";

        const response = await fetch(baseUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: "system",
                        content: `You are a strategic productivity assistant. Analyze the user's dashboard data (tasks, projects, events) and determine the top 5 most critical "Priorities" for today.

RULES:
1. Be specific. Mention project names or task titles.
2. Provide a short "reason" (max 10 words) for each priority.
3. Assign a priority level: 'high', 'medium', or 'low'.
4. Return ONLY valid JSON in this format: {"priorities": [{"action": "string", "reason": "string", "priority": "high" | "medium" | "low"}]}`
                    },
                    {
                        role: "user",
                        content: `Here is the dashboard context: ${dashboardData}`
                    }
                ],
                temperature: 0.1,
                max_tokens: 1024
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Failed to fetch priorities from NVIDIA:", errorText);
            if (prioritiesCache) return prioritiesCache.data;
            return [];
        }

        const result = await response.json();
        const prioritiesStr = result.choices?.[0]?.message?.content;
        
        if (!prioritiesStr) {
            if (prioritiesCache) return prioritiesCache.data;
            return [];
        }

        const cleaned = prioritiesStr.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);
        const priorities = parsed.priorities || parsed.items || (Array.isArray(parsed) ? parsed : []);
        const sliced = priorities.slice(0, 5);

        prioritiesCache = { data: sliced, timestamp: Date.now() };
        return sliced;
    } catch (error) {
        console.error("Error generating AI priorities:", error);
        if (prioritiesCache) return prioritiesCache.data;
        return [];
    }
}

// ── NEW TACTICAL INSIGHT FUNCTIONS ──────────────────────────────────

export async function getUnitLoadDistribution() {
    const [tasks, users] = await Promise.all([
        getTasks(undefined, undefined, undefined, undefined, 1000),
        getUsersSafe()
    ]);

    // Only count non-DONE tasks
    const activeTasks = tasks.filter(t => t.status !== 'DONE');

    const userTaskMap = new Map<string, { name: string; avatar: string | null; count: number }>();

    // Initialize with all known users
    users.forEach((u: { id: string; name: string; fullName: string; email: string; image: string | null; avatarUrl: string | null }) => {
        userTaskMap.set(String(u.id), {
            name: u.name || u.fullName || u.email || 'Unknown',
            avatar: u.image || u.avatarUrl || null,
            count: 0
        });
    });

    // Count tasks per assignee
    activeTasks.forEach(t => {
        if (t.assigneeIds && t.assigneeIds.length > 0) {
            t.assigneeIds.forEach(uid => {
                const existing = userTaskMap.get(uid);
                if (existing) {
                    existing.count += 1;
                }
            });
        } else if (t.userId) {
            const existing = userTaskMap.get(t.userId);
            if (existing) {
                existing.count += 1;
            }
        }
    });

    return Array.from(userTaskMap.values())
        .filter(u => u.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map(u => ({ name: u.name, activeTasks: u.count, avatar: u.avatar }));
}

export async function getPriorityMatrix() {
    const tasks = await getTasks(undefined, undefined, undefined, undefined, 1000);
    const activeTasks = tasks.filter(t => t.status !== 'DONE');

    const high = activeTasks.filter(t => t.priority === 'high').length;
    const medium = activeTasks.filter(t => t.priority === 'medium').length;
    const low = activeTasks.filter(t => t.priority === 'low').length;
    const total = activeTasks.length;

    return {
        segments: [
            { name: 'Critical', value: high, color: 'var(--pastel-rose)' },
            { name: 'Medium', value: medium, color: 'var(--pastel-amber)' },
            { name: 'Low', value: low, color: 'var(--pastel-emerald)' },
        ].filter(s => s.value > 0),
        total,
        criticalCount: high,
        hasCritical: high > 0,
    };
}

export async function getTemporalBurnRate() {
    const [tasks, projects] = await Promise.all([
        getTasks(undefined, undefined, undefined, undefined, 1000),
        getProjects()
    ]);

    const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'planning');

    // Aggregate actual hours from task timeLogs
    let totalActualHours = 0;
    let totalEstimatedHours = 0;

    activeProjects.forEach(p => {
        const projectTasks = tasks.filter(t => t.projectId === p.id);
        projectTasks.forEach(t => {
            if (t.totalHours) {
                totalActualHours += t.totalHours;
            }
        });
        // Use project budget as a proxy for estimated hours if no dedicated field
        // Since projects have budget/spent but no estimated_hours field,
        // we'll estimate based on task count * average hours
        totalEstimatedHours += projectTasks.length * 4; // 4h estimate per task as baseline
    });

    // Ensure minimum values for visual display
    if (totalEstimatedHours === 0) totalEstimatedHours = 1;

    const burnRatio = totalActualHours / totalEstimatedHours;
    const status = burnRatio > 1.2 ? 'over' : burnRatio > 0.8 ? 'on_track' : 'under';

    return {
        estimatedHours: Math.round(totalEstimatedHours),
        actualHours: Math.round(totalActualHours * 10) / 10,
        burnRatio: Math.round(burnRatio * 100),
        status,
        projectCount: activeProjects.length,
    };
}

export async function getCriticalBottlenecks() {
    const [tasks, projects] = await Promise.all([
        getTasks(undefined, undefined, undefined, undefined, 1000),
        getProjects()
    ]);

    const now = new Date();

    const overdueTasks = tasks
        .filter(t => {
            if (t.status === 'DONE') return false;
            if (!t.dueDate) return false;
            return new Date(t.dueDate) < now;
        })
        .map(t => {
            const dueDate = new Date(t.dueDate!);
            const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            const project = t.projectId ? projects.find(p => p.id === t.projectId) : null;
            return {
                title: t.name,
                dueDate: t.dueDate!,
                priority: t.priority,
                status: t.status,
                daysOverdue,
                projectName: project?.name || null,
            };
        })
        .sort((a, b) => b.daysOverdue - a.daysOverdue)
        .slice(0, 4);

    return overdueTasks;
}

export async function getLatestIntelligence() {
    const [notes, users] = await Promise.all([
        getNotes(5),
        getUsersSafe()
    ]);

    return notes.slice(0, 2).map(n => {
        const author = users.find((u: { id: string }) => String(u.id) === String(n.user_id));
        const excerpt = n.content
            ? n.content.replace(/<[^>]*>/g, '').substring(0, 120).trim() + (n.content.length > 120 ? '…' : '')
            : 'No content';

        return {
            title: n.title,
            type: n.type,
            authorName: author?.name || author?.fullName || 'Unknown',
            authorAvatar: author?.image || author?.avatarUrl || null,
            excerpt,
            updatedAt: n.updated_at,
        };
    });
}

export async function getOperationVelocity() {
    const tasks = await getTasks(undefined, undefined, 'DONE', undefined, 1000);

    const now = new Date();
    const days = 14;

    return Array.from({ length: days }, (_, i) => {
        const date = subDays(now, days - 1 - i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const count = tasks.filter(t =>
            t.updatedAt && format(new Date(t.updatedAt), 'yyyy-MM-dd') === dateStr
        ).length;

        return {
            date: format(date, 'MMM d'),
            count,
        };
    });
}

export async function getActivityData(userId?: string) {
  const [tasks, notes] = await Promise.all([
    getTasks(undefined, undefined, undefined, undefined, 2000),
    getNotes(2000)
  ]);

  const activityMap = new Map<string, number>();
  const now = new Date();
  
  // Last 365 days
  const startDate = subDays(now, 364);
  
  // Filter by userId if provided
  const filteredTasks = userId ? tasks.filter(t => t.userId === userId || t.assigneeIds?.includes(userId)) : tasks;
  const filteredNotes = userId ? notes.filter(n => n.user_id === userId) : notes;

  // Helper to increment count for a date string
  const addActivity = (dateStr: string | undefined | null) => {
    if (!dateStr) return;
    const date = format(new Date(dateStr), 'yyyy-MM-dd');
    activityMap.set(date, (activityMap.get(date) || 0) + 1);
  };

  // Process tasks
  filteredTasks.forEach(t => {
    addActivity(t.createdAt);
    if (t.status === 'DONE') {
      addActivity(t.updatedAt);
    }
  });

  // Process notes
  filteredNotes.forEach(n => {
    addActivity(n.created_at);
    addActivity(n.updated_at);
  });

  // Generate full series for the last 365 days
  const data = [];
  for (let i = 0; i <= 364; i++) {
    const d = subDays(now, 364 - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const count = activityMap.get(dateStr) || 0;
    
    // Level 0-4 based on count
    let level = 0;
    if (count > 0) level = 1;
    if (count > 3) level = 2;
    if (count > 6) level = 3;
    if (count > 10) level = 4;

    data.push({
      date: dateStr,
      count,
      level
    });
  }

  return data;
}
