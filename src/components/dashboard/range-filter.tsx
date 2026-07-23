'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const RANGES = [
  { value: '7d', label: '7D' },
  { value: 'last_week', label: 'LW' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '1y', label: '1Y' },
];

export function RangeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentRange = searchParams.get('range') || '7d';

  const handleRangeChange = (range: string) => {
    const params = new URLSearchParams(searchParams);
    if (range === '7d') {
      params.delete('range');
    } else {
      params.set('range', range);
    }
    const queryString = params.toString();
    const url = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(url, { scroll: false });
  };

  return (
    <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5">
      {RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => handleRangeChange(range.value)}
          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all duration-200 ${
            currentRange === range.value
              ? 'bg-white text-zinc-950 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
