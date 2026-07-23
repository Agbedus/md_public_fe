'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Task } from '@/types/task';
import { startTaskTimer, pauseTaskTimer, stopTaskTimer as stopTaskTimerAction } from '@/app/(dashboard)/[orgSlug]/tasks/actions';
import { toast } from '@/lib/toast';

interface TaskTimerContextType {
    activeTask: Task | null;
    isPaused: boolean;
    elapsedTime: number;
    targetTime: number | null;
    startTimer: (task: Task, targetMinutes?: number) => Promise<void>;
    pauseTimer: () => Promise<void>;
    resumeTimer: () => Promise<void>;
    stopTimer: () => Promise<void>;
}

const TaskTimerContext = createContext<TaskTimerContextType | undefined>(undefined);

export function TaskTimerProvider({ children }: { children: React.ReactNode }) {
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [targetTime, setTargetTime] = useState<number | null>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (activeTask && !isPaused) {
            interval = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [activeTask, isPaused]);

    const startTimer = useCallback(async (task: Task, targetMinutes?: number) => {
        if (activeTask && activeTask.id !== task.id) {
            toast.error("Finish your current task first!");
            return;
        }

        // Optimistic UI update
        const previousActiveTask = activeTask;
        const previousIsPaused = isPaused;
        const previousElapsedTime = elapsedTime;
        const previousTargetTime = targetTime;

        setActiveTask(task);
        setIsPaused(false);
        setElapsedTime(0);
        setTargetTime(targetMinutes ? targetMinutes * 60 : null);
        toast.success(`Starting work on: ${task.name}`);

        try {
            const result = await startTaskTimer(task.id);
            if (!result.success) {
                // Rollback if failed
                setActiveTask(previousActiveTask);
                setIsPaused(previousIsPaused);
                setElapsedTime(previousElapsedTime);
                setTargetTime(previousTargetTime);
                toast.error(result.error || "Failed to start timer");
            }
        } catch (error) {
            // Rollback on network error
            setActiveTask(previousActiveTask);
            setIsPaused(previousIsPaused);
            setElapsedTime(previousElapsedTime);
            setTargetTime(previousTargetTime);
            toast.error("Network error: Failed to start timer");
        }
    }, [activeTask, isPaused, elapsedTime, targetTime]);

    const pauseTimer = useCallback(async () => {
        if (!activeTask) return;

        // Optimistic UI update
        setIsPaused(true);
        toast.success("Timer paused");

        try {
            const result = await pauseTaskTimer(activeTask.id);
            if (!result.success) {
                setIsPaused(false);
                toast.error(result.error || "Failed to pause timer");
            }
        } catch (error) {
            setIsPaused(false);
            toast.error("Network error: Failed to pause timer");
        }
    }, [activeTask]);

    const resumeTimer = useCallback(async () => {
        if (!activeTask) return;

        // Optimistic UI update
        setIsPaused(false);
        toast.success("Resuming work");

        try {
            const result = await startTaskTimer(activeTask.id);
            if (!result.success) {
                setIsPaused(true);
                toast.error(result.error || "Failed to resume timer");
            }
        } catch (error) {
            setIsPaused(true);
            toast.error("Network error: Failed to resume timer");
        }
    }, [activeTask]);

    const stopTimer = useCallback(async () => {
        if (!activeTask) return;

        // Optimistic UI update
        const previousActiveTask = activeTask;
        setActiveTask(null);
        setIsPaused(false);
        setElapsedTime(0);
        setTargetTime(null);
        toast.success("Work session completed and logged");

        try {
            const result = await stopTaskTimerAction(activeTask.id);
            if (!result.success) {
                // Rollback
                setActiveTask(previousActiveTask);
                toast.error(result.error || "Failed to stop timer");
            }
        } catch (error) {
            // Rollback
            setActiveTask(previousActiveTask);
            toast.error("Network error: Failed to stop timer");
        }
    }, [activeTask]);

    const value = React.useMemo(() => ({
        activeTask,
        isPaused,
        elapsedTime,
        targetTime,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer
    }), [
        activeTask,
        isPaused,
        elapsedTime,
        targetTime,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer
    ]);

    return (
        <TaskTimerContext.Provider value={value}>
            {children}
        </TaskTimerContext.Provider>
    );
}

export function useTaskTimer() {
    const context = useContext(TaskTimerContext);
    if (!context) {
        throw new Error('useTaskTimer must be used within a TaskTimerProvider');
    }
    return context;
}
