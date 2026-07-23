import Calendar from "@/components/ui/calendar/Calendar";
import { getCalendarData } from "@/app/(dashboard)/[orgSlug]/calendar/actions";
import { auth } from "@/auth";

export default async function CalendarPage() {
  const [data, session] = await Promise.all([
    getCalendarData(),
    auth(),
  ]);

  return (
    <div className="px-4 py-8 pb-32 max-w-[1600px] mx-auto min-h-screen">
      <Calendar
        initialEvents={data.events}
        initialTasks={data.tasks}
        initialUsers={data.users}
        initialProjects={data.projects}
        initialTimeOff={data.timeOff}
        currentUserRoles={session?.user?.roles || []}
      />
    </div>
  );
}
