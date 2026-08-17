import Calendar from "@/components/ui/calendar/Calendar";
import { getCalendarData } from "@/app/(dashboard)/[orgSlug]/calendar/actions";
import { auth } from "@/auth";

export default async function CalendarPage() {
  const [data, session] = await Promise.all([
    getCalendarData(),
    auth(),
  ]);

  return (
    <div className="mx-auto min-h-[calc(100dvh-8rem)] max-w-[1600px] px-3 py-4 pb-6 sm:px-4 md:min-h-screen md:py-8 md:pb-32">
      <Calendar
        initialEvents={data.events}
        initialTasks={data.tasks}
        initialUsers={data.users}
        initialProjects={data.projects}
        initialTimeOff={data.timeOff}
        currentUserRoles={session?.user?.roles || []}
        currentUserOrgRole={session?.user?.orgRole}
        currentUserId={session?.user?.id}
      />
    </div>
  );
}
