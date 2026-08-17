import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <div className="mx-auto min-h-[calc(100dvh-8rem)] max-w-4xl space-y-5 p-3 sm:p-4 md:min-h-screen md:space-y-8 md:p-8">
      <Skeleton className="h-10 w-48 mb-8" />

      <div className="glass rounded-3xl border border-card-border p-4 backdrop-blur-xl sm:p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start gap-8">
          {/* Avatar Section Skeleton */}
          <div className="flex-shrink-0">
            <Skeleton className="w-32 h-32 rounded-full" />
          </div>

          {/* Details Section Skeleton */}
          <div className="flex-grow space-y-6 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
