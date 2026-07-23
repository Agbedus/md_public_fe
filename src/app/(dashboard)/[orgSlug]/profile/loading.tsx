import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen space-y-8">
      <Skeleton className="h-10 w-48 mb-8" />

      <div className="glass p-8 rounded-3xl border border-card-border backdrop-blur-xl">
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
