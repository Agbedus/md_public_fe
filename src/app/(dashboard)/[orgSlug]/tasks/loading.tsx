import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <div className="px-4 py-8 max-w-[1600px] mx-auto">
      <div className="space-y-8">
        
        {/* Header Skeleton */}
        <div className="space-y-2 mb-10">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>

        {/* Summary Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 glass rounded-2xl border border-card-border" />
          ))}
        </div>

        {/* Filters Skeleton */}
        <Skeleton className="h-20 glass rounded-2xl border border-card-border mb-8" />

        {/* Table Skeleton */}
        <div className="glass rounded-2xl overflow-hidden border border-card-border">
          <Skeleton className="h-12 border-b border-card-border rounded-none" />
          <div className="divide-y divide-border-subtle">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-16 px-6 py-4 flex items-center gap-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="ml-auto h-8 w-8 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
