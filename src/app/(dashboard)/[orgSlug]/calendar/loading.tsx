import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function CalendarLoading() {
  return (
    <div className="px-4 py-8 max-w-[1600px] mx-auto space-y-8">
      <div className="mb-10 space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>

      <div className="space-y-6">
        {/* Toolbar Skeleton */}
        <div className="flex justify-between items-center glass p-4 rounded-xl border border-card-border">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-48 rounded-lg" />
          <div className="flex gap-1 bg-skeleton-bg p-1 rounded-xl">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-7 gap-px glass rounded-2xl overflow-hidden border border-card-border bg-border-subtle">
          {[...Array(7)].map((_, i) => (
            <div key={`head-${i}`} className="h-12 bg-foreground/[0.04] flex items-center justify-center">
              <Skeleton className="h-4 w-12 rounded" />
            </div>
          ))}
          {[...Array(35)].map((_, i) => (
            <div key={`cell-${i}`} className="h-32 bg-foreground/[0.01] p-2">
               <Skeleton className="h-4 w-6 rounded mb-2" />
               {i % 5 === 0 && <Skeleton className="h-6 w-full rounded-md mb-1" />}
               {i % 7 === 0 && <Skeleton className="h-6 w-3/4 rounded-md" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
