"use client";

interface ReportWidgetProps {
  title: string;
  data: {
    period: { start: string; end: string };
    tasks: {
      total: number;
      created: number;
      completed: number;
      pending: number;
      byStatus: Record<string, number>;
    };
    notes: { total: number; createdThisMonth: number };
    projects: { total: number; active: number; completed: number; onHold: number };
    events: { total: number; thisMonth: number };
  };
}

export default function ReportWidget({ title, data }: ReportWidgetProps) {
  const sections = [
    {
      label: "Tasks",
      stats: [
        { label: "Total", value: data.tasks.total, color: "text-accent-text" },
        { label: "Created This Month", value: data.tasks.created, color: "text-cyan-400" },
        { label: "Completed", value: data.tasks.completed, color: "text-success-text" },
        { label: "Pending", value: data.tasks.pending, color: "text-text-muted" },
        { label: "In Progress", value: data.tasks.byStatus.inProgress, color: "text-warning-text" },
        { label: "QA/Review", value: data.tasks.byStatus.qa + data.tasks.byStatus.review, color: "text-priority-high-text" },
      ],
    },
    {
      label: "Projects & Notes",
      stats: [
        { label: "Total Projects", value: data.projects.total, color: "text-pink-400" },
        { label: "Active Projects", value: data.projects.active, color: "text-success-text" },
        { label: "Completed Projects", value: data.projects.completed, color: "text-accent-text" },
        { label: "Total Notes", value: data.notes.total, color: "text-purple-400" },
        { label: "Notes This Month", value: data.notes.createdThisMonth, color: "text-violet-400" },
        { label: "Events This Month", value: data.events.thisMonth, color: "text-danger-text" },
      ],
    },
  ];

  return (
    <div className="bg-card rounded-xl border border-card-border overflow-hidden my-3">
      <div className="bg-foreground/[0.03] p-4 border-b border-card-border">
        <h4 className="font-bold text-foreground text-lg">{title}</h4>
        <p className="text-xs text-text-muted font-medium mt-0.5">
          {data.period.start} – {data.period.end}
        </p>
      </div>
      <div className="p-4 space-y-4">
        {sections.map((section, si) => (
          <div key={si}>
            <h5 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">{section.label}</h5>
            <div className="grid grid-cols-3 gap-2">
              {section.stats.map((stat, idx) => (
                <div key={idx} className="bg-foreground/[0.03] rounded-lg p-2.5">
                  <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
