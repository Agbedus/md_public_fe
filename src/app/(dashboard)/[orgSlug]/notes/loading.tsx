import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotesLoading() {
  return (
    <div className="flex flex-col h-screen px-4 py-8 max-w-[1600px] mx-auto space-y-8">
      {/* Page Header Skeleton */}
      <div className="mb-10 space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Controls Bar Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <Skeleton className="h-11 w-full md:w-64 rounded-xl" />
        <div className="flex items-center gap-4 ml-auto">
          <Skeleton className="h-11 w-24 rounded-xl" />
          <Skeleton className="h-11 w-44 rounded-xl" />
        </div>
      </div>

      {/* Filter Row Skeleton */}
      <div className="flex overflow-x-auto gap-2 mb-8 pb-2">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full shrink-0" />
        ))}
      </div>

      {/* Masonry Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-grow overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-80 w-full rounded-2xl glass border border-card-border" />
        ))}
      </div>
    </div>
  );
}
