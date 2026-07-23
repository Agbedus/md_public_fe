import { Skeleton } from "@/components/ui/skeleton";

export function ChartSkeleton() {
  return (
    <div className="glass p-6 rounded-2xl h-96 flex flex-col border border-card-border">
      <Skeleton className="h-7 w-48 mb-6" />
      <Skeleton className="flex-1 rounded-xl" />
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="glass p-6 rounded-2xl border border-card-border">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-8 w-8" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function SummarySkeleton() {
    return (
        <div className="col-span-1 lg:col-span-12 grid grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
        </div>
    );
}

export function CardSkeleton() {
    return (
        <div className="glass p-6 rounded-2xl border border-card-border h-full">
            <Skeleton className="h-7 w-32 mb-4" />
            <div className="space-y-2">
                 <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-2/3" />
            </div>
        </div>
    )
}
