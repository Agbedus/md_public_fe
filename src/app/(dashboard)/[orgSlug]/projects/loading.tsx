import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProjectsLoading() {
  return (
    <div className="p-4 md:p-8 pt-24 min-h-screen bg-transparent">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-10 w-24 rounded-xl hidden sm:block" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>

        {/* Search & Tabs Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-skeleton-bg/20 p-2 rounded-2xl border border-card-border">
          <Skeleton className="h-10 w-full sm:w-64 rounded-xl border border-card-border" />
          <Skeleton className="h-10 w-48 rounded-xl" />
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-foreground/[0.02] border border-card-border rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-start">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
              <Skeleton className="h-6 w-3/4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <div className="pt-4 border-t border-card-border flex justify-between items-center">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
