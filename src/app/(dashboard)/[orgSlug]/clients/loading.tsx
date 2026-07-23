import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientsLoading() {
  return (
    <div className="p-4 md:p-8 pt-24 min-h-screen bg-transparent">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-11 w-44 rounded-xl" />
        </div>

        {/* Search & View Mode Skeleton */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-10">
          <Skeleton className="h-11 w-full lg:w-96 rounded-xl" />
          <Skeleton className="h-11 w-24 rounded-xl" />
        </div>

        {/* Clients Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass border border-card-border rounded-2xl p-6 space-y-4 h-64">
              <div className="flex justify-between items-start">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-7 w-3/4 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <div className="pt-4 border-t border-card-border flex gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
