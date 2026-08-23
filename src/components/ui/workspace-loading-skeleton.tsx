'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface WorkspaceLoadingSkeletonProps {
  isOverlay?: boolean;
}

export function WorkspaceLoadingSkeleton({ isOverlay = false }: WorkspaceLoadingSkeletonProps) {
  return (
    <div
      className={`${isOverlay ? 'fixed inset-0 z-[140]' : 'min-h-[calc(100dvh-5rem)]'} bg-background`}
      role="status"
      aria-live="polite"
      aria-label="Loading workspace"
    >
      {isOverlay && (
        <div className="flex h-16 items-center justify-between border-b border-card-border px-4 md:h-20 md:px-8">
          <Skeleton className="h-9 w-36 rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <Skeleton className="h-11 w-11 rounded-xl" />
            <Skeleton className="h-11 w-24 rounded-xl" />
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-[1600px] space-y-6 px-3 py-5 sm:px-4 md:px-8 md:py-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl sm:h-32" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
        <Skeleton className="h-44 rounded-2xl" />
      </div>
    </div>
  );
}
