import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersLoading() {
  return (
    <div className="p-4 md:p-8 pt-24 min-h-screen bg-transparent">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl md:self-end" />
        </div>

        {/* Users List Skeleton */}
        <div className="glass rounded-2xl overflow-hidden border border-card-border">
          <div className="h-12 border-b border-card-border px-4 flex items-center">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="divide-y divide-border-subtle">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-20 bg-transparent px-4 py-4 flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
