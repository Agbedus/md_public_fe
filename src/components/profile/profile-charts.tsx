import { ProductivityChart, TasksChart, WorkloadChart } from '@/components/ui/client-charts';

interface ProfileChartsProps {
  productivityData: any[];
  tasksOverviewData: any[];
  workloadData: any[];
}

const ProfileCharts: React.FC<ProfileChartsProps> = ({ 
  productivityData, 
  tasksOverviewData, 
  workloadData
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Productivity Trends - Full Width */}
      <div className="lg:col-span-2 glass p-6 rounded-3xl border border-card-border">
        <h3 className="text-lg font-semibold text-foreground mb-6">Productivity Growth</h3>
        <div className="h-[300px] w-full">
          <ProductivityChart data={productivityData} />
        </div>
      </div>

      {/* Task Breakdown */}
      <div className="glass p-6 rounded-3xl border border-card-border">
        <h3 className="text-lg font-semibold text-foreground mb-6">Task Distribution</h3>
        <div className="h-[250px] w-full">
          <TasksChart data={tasksOverviewData} />
        </div>
      </div>

      {/* Workload Distribution */}
      <div className="glass p-6 rounded-3xl border border-card-border">
        <h3 className="text-lg font-semibold text-foreground mb-6">Project Workload</h3>
        <div className="h-[250px] w-full">
          <WorkloadChart data={workloadData} />
        </div>
      </div>
    </div>
  );
};

export default ProfileCharts;
