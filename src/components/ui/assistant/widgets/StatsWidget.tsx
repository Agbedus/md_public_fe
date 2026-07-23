"use client";

interface StatItem {
  label: string;
  value: number | string;
  color?: string;
}

interface StatsWidgetProps {
  title: string;
  stats: StatItem[];
}

export default function StatsWidget({ title, stats }: StatsWidgetProps) {
  return (
    <div className="bg-card p-4 rounded-xl border border-card-border">
      <h4 className="font-semibold text-foreground mb-4">{title}</h4>
      
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-foreground/[0.03] rounded-lg p-3">
            <div className={`text-2xl font-bold mb-1 ${stat.color || 'text-foreground'}`}>
              {stat.value}
            </div>
            <div className="text-xs text-text-muted font-bold uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
