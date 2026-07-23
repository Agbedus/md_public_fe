import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AttendanceLoading() {
    return (
        <div className="px-4 py-8 max-w-[1600px] mx-auto min-h-screen">
            <div className="mb-8 space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-80 rounded-2xl" />
                ))}
            </div>
        </div>
    );
}
