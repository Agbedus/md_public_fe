'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    FiBookOpen,
    FiChevronLeft,
    FiSearch,
    FiUsers,
    FiCheckSquare,
    FiFolder,
    FiFileText,
    FiCalendar,
    FiMapPin,
    FiBell,
    FiCpu,
    FiClock,
    FiSettings,
    FiInfo,
    FiAlertTriangle,
    FiShield,
} from 'react-icons/fi';

/* ────────────────────────────────────────────────────────────────
   Documentation primitives

   The previous version rendered every topic as a boxed card in a grid, which
   made continuous reading hard: the eye had to re-enter a new container every
   two sentences. These are prose-first instead — a readable column, real
   heading hierarchy, and boxes reserved for the things that genuinely are
   tabular or set apart.
   ──────────────────────────────────────────────────────────────── */

/** A top-level documentation section. */
function Section({
    id,
    title,
    icon: Icon,
    color = 'text-emerald-400',
    children,
}: {
    id: string;
    title: string;
    icon: React.ElementType;
    /** Per-section accent, matching the coloured-icon convention the main sidebar uses. */
    color?: string;
    children: React.ReactNode;
}) {
    return (
        <section id={id} className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-foreground/[0.05] shrink-0 ${color}`}>
                    <Icon className="h-4 w-4" />
                </span>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
            </div>
            <div className="space-y-6">{children}</div>
        </section>
    );
}

/** A subsection within a documentation section. */
function Topic({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    return (
        <div id={id} className="scroll-mt-8 space-y-3">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {children}
        </div>
    );
}

/** Body copy. Constrained to a comfortable measure for reading. */
function P({ children }: { children: React.ReactNode }) {
    return <p className="max-w-[68ch] text-sm leading-7 text-text-secondary">{children}</p>;
}

/** A list of steps or points. */
function List({ items, isOrdered = false }: { items: React.ReactNode[]; isOrdered?: boolean }) {
    const Tag = isOrdered ? 'ol' : 'ul';
    return (
        <Tag
            className={`max-w-[68ch] space-y-2 pl-5 text-sm leading-7 text-text-secondary ${
                isOrdered ? 'list-decimal' : 'list-disc'
            } marker:text-text-muted`}
        >
            {items.map((item, i) => (
                <li key={i} className="pl-1">
                    {item}
                </li>
            ))}
        </Tag>
    );
}

/** Set-apart guidance. Colour is always paired with an icon and a label. */
function Callout({
    type = 'note',
    title,
    children,
}: {
    type?: 'note' | 'warning';
    title: string;
    children: React.ReactNode;
}) {
    const isWarning = type === 'warning';
    const Icon = isWarning ? FiAlertTriangle : FiInfo;
    return (
        <div
            className={`max-w-[68ch] rounded-xl border p-4 ${
                isWarning
                    ? 'border-amber-500/30 bg-amber-500/[0.06]'
                    : 'border-card-border bg-foreground/[0.02]'
            }`}
        >
            <div className="mb-1.5 flex items-center gap-2">
                <Icon className={`h-3.5 w-3.5 ${isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-text-muted'}`} />
                <span className="text-xs font-semibold text-foreground">{title}</span>
            </div>
            <div className="text-sm leading-6 text-text-secondary">{children}</div>
        </div>
    );
}

/** A reference table. */
function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
    return (
        <div className="max-w-[68ch] overflow-x-auto rounded-xl border border-card-border">
            <table className="w-full border-collapse text-left text-sm">
                <thead>
                    <tr className="border-b border-card-border bg-foreground/[0.03]">
                        {headers.map((h) => (
                            <th key={h} className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-foreground">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                    {rows.map((row, i) => (
                        <tr key={i} className="align-top">
                            {row.map((cell, j) => (
                                <td key={j} className="px-4 py-2.5 leading-6 text-text-secondary">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ────────────────────────────────────────────────────────────────
   Navigation
   ──────────────────────────────────────────────────────────────── */

const NAV: { id: string; title: string; icon: React.ElementType; color: string; topics: { id: string; title: string }[] }[] = [
    {
        id: 'getting-started',
        title: 'Getting started',
        icon: FiBookOpen,
        color: 'text-blue-400',
        topics: [
            { id: 'what-it-is', title: 'What this platform does' },
            { id: 'organizations', title: 'Organizations' },
            { id: 'finding-things', title: 'Finding things' },
        ],
    },
    {
        id: 'roles',
        title: 'Roles and permissions',
        icon: FiShield,
        color: 'text-rose-400',
        topics: [
            { id: 'the-five-roles', title: 'The five roles' },
            { id: 'the-rules', title: 'What each role can do' },
            { id: 'role-exceptions', title: 'Two exceptions' },
        ],
    },
    {
        id: 'tasks',
        title: 'Tasks',
        icon: FiCheckSquare,
        color: 'text-purple-400',
        topics: [
            { id: 'creating-tasks', title: 'Creating and assigning' },
            { id: 'board-and-table', title: 'Board and table views' },
            { id: 'time-logging', title: 'Logging time' },
        ],
    },
    {
        id: 'projects',
        title: 'Projects and clients',
        icon: FiFolder,
        color: 'text-pink-400',
        topics: [
            { id: 'projects-basics', title: 'Working with projects' },
            { id: 'clients', title: 'Clients' },
        ],
    },
    {
        id: 'notes',
        title: 'Notes',
        icon: FiFileText,
        color: 'text-yellow-400',
        topics: [
            { id: 'notes-basics', title: 'Writing notes' },
            { id: 'sharing-notes', title: 'Sharing' },
        ],
    },
    {
        id: 'calendar',
        title: 'Calendar and time off',
        icon: FiCalendar,
        color: 'text-green-400',
        topics: [
            { id: 'events', title: 'Events' },
            { id: 'time-off', title: 'Requesting time off' },
        ],
    },
    {
        id: 'attendance',
        title: 'Attendance',
        icon: FiMapPin,
        color: 'text-sky-400',
        topics: [
            { id: 'clocking-in', title: 'Clocking in and out' },
            { id: 'office-locations', title: 'Office locations' },
        ],
    },
    {
        id: 'team',
        title: 'Your team',
        icon: FiUsers,
        color: 'text-teal-400',
        topics: [
            { id: 'inviting', title: 'Inviting people' },
            { id: 'changing-roles', title: 'Changing roles' },
        ],
    },
    {
        id: 'notifications',
        title: 'Announcements and alerts',
        icon: FiBell,
        color: 'text-indigo-400',
        topics: [
            { id: 'announcements', title: 'Announcements' },
            { id: 'who-gets-notified', title: 'Who gets notified' },
            { id: 'live-updates', title: 'Live updates' },
        ],
    },
    {
        id: 'assistant',
        title: 'Assistant',
        icon: FiCpu,
        color: 'text-fuchsia-400',
        topics: [{ id: 'assistant-basics', title: 'Asking questions' }],
    },
    {
        id: 'focus',
        title: 'Focus timer',
        icon: FiClock,
        color: 'text-orange-400',
        topics: [{ id: 'focus-basics', title: 'Running a session' }],
    },
    {
        id: 'settings',
        title: 'Settings',
        icon: FiSettings,
        color: 'text-cyan-400',
        topics: [{ id: 'settings-basics', title: 'Your preferences' }],
    },
];

export default function WikiPage() {
    const router = useRouter();
    const [activeId, setActiveId] = useState('what-it-is');
    const [query, setQuery] = useState('');
    const mainRef = useRef<HTMLElement>(null);

    // Highlight the nav entry for whatever is currently on screen.
    useEffect(() => {
        const ids = NAV.flatMap((s) => [s.id, ...s.topics.map((t) => t.id)]);
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
                if (visible) setActiveId(visible.target.id);
            },
            { rootMargin: '0px 0px -70% 0px', threshold: 0 },
        );
        ids.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, []);

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveId(id);
    };

    const filteredNav = query.trim()
        ? NAV.map((s) => ({
              ...s,
              topics: s.topics.filter(
                  (t) =>
                      t.title.toLowerCase().includes(query.toLowerCase()) ||
                      s.title.toLowerCase().includes(query.toLowerCase()),
              ),
          })).filter((s) => s.topics.length > 0 || s.title.toLowerCase().includes(query.toLowerCase()))
        : NAV;

    return (
        <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-6rem)] overflow-hidden border-t border-card-border bg-background">
            {/* Sidebar */}
            <aside className="hidden w-72 shrink-0 flex-col border-r border-card-border lg:flex">
                <div className="space-y-4 border-b border-card-border p-5">
                    <button
                        onClick={() => router.back()}
                        className="group flex items-center gap-1.5 text-xs font-medium text-text-muted transition-colors hover:text-foreground"
                    >
                        <FiChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                        Back
                    </button>

                    <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                            <FiBookOpen className="h-4 w-4" />
                        </span>
                        <div>
                            <h1 className="text-sm font-semibold text-foreground">Documentation</h1>
                            <p className="text-xs text-text-muted">How the platform works</p>
                        </div>
                    </div>

                    <div className="relative">
                        <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search docs"
                            className="w-full rounded-lg border border-card-border bg-foreground/[0.03] py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:bg-foreground/[0.06] transition-all"
                        />
                    </div>
                </div>

                <nav className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-4">
                    {filteredNav.map((section) => (
                        <div key={section.id}>
                            <button
                                onClick={() => scrollTo(section.id)}
                                className="mb-1.5 flex w-full items-center gap-2 px-2 text-left"
                            >
                                <section.icon className={`h-3.5 w-3.5 shrink-0 ${section.color}`} />
                                <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                                    {section.title}
                                </span>
                            </button>
                            <div className="space-y-0.5">
                                {section.topics.map((topic) => (
                                    <button
                                        key={topic.id}
                                        onClick={() => scrollTo(topic.id)}
                                        className={`block w-full rounded-md border-l-2 py-1.5 pl-4 pr-2 text-left text-sm transition-colors ${
                                            activeId === topic.id
                                                ? 'border-emerald-500 bg-emerald-500/[0.07] font-medium text-foreground'
                                                : 'border-transparent text-text-muted hover:bg-foreground/[0.03] hover:text-foreground'
                                        }`}
                                    >
                                        {topic.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                    {filteredNav.length === 0 && (
                        <p className="px-2 text-sm text-text-muted">No matching topics.</p>
                    )}
                </nav>
            </aside>

            {/* Content */}
            <main ref={mainRef} className="custom-scrollbar flex-1 overflow-y-auto scroll-smooth">
                <div className="mx-auto max-w-3xl space-y-16 px-6 py-12 md:px-10">
                    <header className="space-y-2 border-b border-card-border pb-8">
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Documentation</h1>
                        <P>
                            How this platform works, what each part is for, and who can do what. If
                            you are new here, start with Getting started and Roles.
                        </P>
                    </header>

                    <Section id="getting-started" title="Getting started" icon={FiBookOpen} color="text-blue-400">
                        <Topic id="what-it-is" title="What this platform does">
                            <P>
                                This is a shared workspace for running day-to-day operations. It
                                keeps tasks, projects, clients, notes, schedules and attendance in
                                one place, so your team is not spread across half a dozen tools.
                            </P>
                            <P>
                                Everything you see is scoped to your organization. People in other
                                organizations cannot see your data, and you cannot see theirs.
                            </P>
                        </Topic>

                        <Topic id="organizations" title="Organizations">
                            <P>
                                An organization is your company or team. Your access is decided by
                                your role inside that organization, and every page you open shows
                                only that organization&apos;s records.
                            </P>
                            <P>
                                If you belong to more than one organization, use the switcher at the
                                top of the sidebar. Switching changes everything on screen — tasks,
                                projects, people and notifications all follow.
                            </P>
                        </Topic>

                        <Topic id="finding-things" title="Finding things">
                            <P>
                                Press <Kbd>Ctrl</Kbd> <Kbd>K</Kbd> (or <Kbd>⌘</Kbd> <Kbd>K</Kbd> on
                                a Mac) anywhere to open the command menu. You can jump to a page,
                                create a task, or search across your work from there. The Search page
                                does the same thing with more room for results.
                            </P>
                        </Topic>
                    </Section>

                    <Section id="roles" title="Roles and permissions" icon={FiShield} color="text-rose-400">
                        <Topic id="the-five-roles" title="The five roles">
                            <P>
                                Every person in an organization has one role. Roles run from most to
                                least access:
                            </P>
                            <Table
                                headers={['Role', 'What it means']}
                                rows={[
                                    ['Owner', 'Full control, including organization settings and transferring ownership.'],
                                    ['Admin', "Runs the organization day to day and can change anyone's work."],
                                    ['Manager', 'Sees everything the team is doing, but only changes their own work.'],
                                    ['Member', 'Creates and manages their own work, plus anything shared with them.'],
                                    ['Guest', 'Read-only, and only for things shared with them directly.'],
                                ]}
                            />
                            <Callout title="Manager is about visibility, not authority">
                                A Manager can see every task, project and note in the organization —
                                that is the point of the role. It does not let them edit or delete
                                other people&apos;s work. Only Owners and Admins can do that.
                            </Callout>
                        </Topic>

                        <Topic id="the-rules" title="What each role can do">
                            <P>The same four rules apply to every part of the platform:</P>
                            <List
                                isOrdered
                                items={[
                                    <>
                                        <strong className="font-medium text-foreground">Seeing things.</strong>{' '}
                                        Owners, Admins and Managers see everything in the organization.
                                        Members see their own work plus anything assigned or shared
                                        with them. Guests see only what was shared with them.
                                    </>,
                                    <>
                                        <strong className="font-medium text-foreground">Creating things.</strong>{' '}
                                        Everyone except Guests can create work.
                                    </>,
                                    <>
                                        <strong className="font-medium text-foreground">Editing and deleting.</strong>{' '}
                                        Owners and Admins can change anything. Everyone else can only
                                        change what they created.
                                    </>,
                                    <>
                                        <strong className="font-medium text-foreground">Administration.</strong>{' '}
                                        Organization settings, team members, office locations and
                                        attendance rules are Owner and Admin only.
                                    </>,
                                ]}
                            />
                            <P>
                                If you cannot see a button, it is because your role does not allow
                                that action. The buttons are hidden rather than shown-and-refused.
                            </P>
                        </Topic>

                        <Topic id="role-exceptions" title="Two exceptions">
                            <List
                                items={[
                                    <>
                                        If a task is <strong className="font-medium text-foreground">assigned</strong>{' '}
                                        to you, you can edit it even though you did not create it —
                                        that is how work moves across a board. Deleting it still
                                        requires being the person who created it.
                                    </>,
                                    <>
                                        Adding a <strong className="font-medium text-foreground">client</strong>{' '}
                                        needs Manager level or above, rather than the usual Member
                                        level. Everyone can still see the client list.
                                    </>,
                                ]}
                            />
                        </Topic>
                    </Section>

                    <Section id="tasks" title="Tasks" icon={FiCheckSquare} color="text-purple-400">
                        <Topic id="creating-tasks" title="Creating and assigning">
                            <P>
                                Add a task from the Tasks page, or from anywhere with the command
                                menu. A task needs a name; everything else — description, due date,
                                priority, project, assignees — is optional and can be filled in
                                later.
                            </P>
                            <P>
                                Assigning a task tells that person about it and lets them work on it.
                                You can assign several people to the same task.
                            </P>
                        </Topic>

                        <Topic id="board-and-table" title="Board and table views">
                            <P>
                                The board view groups tasks by status so you can drag them from To do
                                through In progress, QA and Review to Done. The table view shows more
                                detail at once and lets you edit a row in place.
                            </P>
                            <P>
                                Priority is Low, Medium or High. Marking a task as needing QA or
                                Review flags it for a second pair of eyes before it counts as
                                finished. You can also mark a task as depending on another one when
                                the order matters.
                            </P>
                        </Topic>

                        <Topic id="time-logging" title="Logging time">
                            <P>
                                Start the timer on a task to record how long it takes. Time logged
                                rolls up to the task and to the project, which is what the reports
                                and the budget figures on projects are based on.
                            </P>
                        </Topic>
                    </Section>

                    <Section id="projects" title="Projects and clients" icon={FiFolder} color="text-pink-400">
                        <Topic id="projects-basics" title="Working with projects">
                            <P>
                                A project groups related tasks and gives you a place to track dates,
                                budget and progress. Open a project to see its tasks, the time logged
                                against it, and how much of its budget has been used.
                            </P>
                            <P>
                                Projects can be linked to a client, given a short key for reference,
                                and set to Planning, In progress, Completed or On hold.
                            </P>
                        </Topic>

                        <Topic id="clients" title="Clients">
                            <P>
                                Clients are the companies you do work for. Each one holds a contact
                                name, email and website, and can be linked to any number of projects.
                            </P>
                            <P>
                                Everyone in the organization can see the client list. Adding, editing
                                or removing a client needs Manager level or above.
                            </P>
                        </Topic>
                    </Section>

                    <Section id="notes" title="Notes" icon={FiFileText} color="text-yellow-400">
                        <Topic id="notes-basics" title="Writing notes">
                            <P>
                                Notes are for anything that does not fit a task — meeting minutes,
                                research, checklists, ideas. The editor supports headings, lists,
                                links and formatting, and notes can be tagged by type so they are
                                easier to find later.
                            </P>
                        </Topic>

                        <Topic id="sharing-notes" title="Sharing">
                            <P>
                                A note starts private to you. Share it with specific colleagues and
                                it appears in their Notes page too. Owners, Admins and Managers can
                                see every note in the organization whether or not it was shared.
                            </P>
                        </Topic>
                    </Section>

                    <Section id="calendar" title="Calendar and time off" icon={FiCalendar} color="text-green-400">
                        <Topic id="events" title="Events">
                            <P>
                                The calendar shows events alongside task due dates, project
                                milestones and approved time off, so you can see the whole picture in
                                one place. Switch between month, week and day views.
                            </P>
                            <P>
                                Events pulled in from tasks, projects and time off are read-only on
                                the calendar — change them where they live and the calendar follows.
                            </P>
                        </Topic>

                        <Topic id="time-off" title="Requesting time off">
                            <P>
                                Request time off from the calendar. Choose the type — leave, sick,
                                other — and the dates. Some types need a short reason.
                            </P>
                            <P>
                                Requests go to your Owners and Admins for approval. Once approved,
                                the time appears on the shared calendar so nobody double-books you.
                                You can cancel your own request while it is still pending.
                            </P>
                        </Topic>
                    </Section>

                    <Section id="attendance" title="Attendance" icon={FiMapPin} color="text-sky-400">
                        <Topic id="clocking-in" title="Clocking in and out">
                            <P>
                                Attendance uses your device location. When you arrive within range of
                                a registered office you are clocked in automatically, and when you
                                leave you are clocked out. Your browser will ask for location
                                permission the first time.
                            </P>
                            <Callout type="warning" title="Location permission is required">
                                If you deny location access, attendance cannot record your hours. You
                                can change this in your browser&apos;s site settings.
                            </Callout>
                        </Topic>

                        <Topic id="office-locations" title="Office locations">
                            <P>
                                Owners and Admins set up offices by placing a point on the map and
                                choosing a radius. Anyone inside that radius counts as present.
                            </P>
                            <P>
                                Attendance rules — expected start time, how much lateness is
                                allowed, working days — are set per office. Managers can see the
                                team&apos;s attendance; changing a record or the rules is Owner and
                                Admin only.
                            </P>
                        </Topic>
                    </Section>

                    <Section id="team" title="Your team" icon={FiUsers} color="text-teal-400">
                        <Topic id="inviting" title="Inviting people">
                            <P>
                                Owners and Admins can invite colleagues from the Team page by sharing
                                an invite link. New joiners appear as Pending until someone approves
                                them, at which point they get access at the role you choose.
                            </P>
                        </Topic>

                        <Topic id="changing-roles" title="Changing roles">
                            <P>
                                Change someone&apos;s role from the Team page. Two limits apply: only
                                an Owner can grant Owner or Admin, and an Admin cannot change or
                                remove another Admin. This stops administrators from locking each
                                other out.
                            </P>
                            <P>
                                You can also suspend someone to remove their access without deleting
                                their history, and restore them later.
                            </P>
                        </Topic>
                    </Section>

                    <Section id="notifications" title="Announcements and alerts" icon={FiBell} color="text-indigo-400">
                        <Topic id="announcements" title="Announcements">
                            <P>
                                Announcements go to everyone in the organization at once — useful for
                                notices that should not sit in one person&apos;s inbox. Posting one
                                needs Manager level or above. You can remove your own; Owners and
                                Admins can remove any.
                            </P>
                        </Topic>

                        <Topic id="who-gets-notified" title="Who gets notified">
                            <P>
                                Notifications follow the same permission rules as everything else:
                                you are only told about things you are allowed to see. In practice
                                that means:
                            </P>
                            <Table
                                headers={['You are told when', 'Who hears about it']}
                                rows={[
                                    ['A task is assigned to you', 'You'],
                                    ['A note is shared with you', 'You'],
                                    ['Someone creates or updates work', 'Owners, Admins and Managers'],
                                    ['Time off is requested', 'Owners and Admins'],
                                    ['Your time off is approved or declined', 'You'],
                                ]}
                            />
                            <P>
                                You will never be notified about a record you could not open. Choose
                                which alerts you receive in Settings.
                            </P>
                        </Topic>

                        <Topic id="live-updates" title="Live updates">
                            <P>
                                Pages update themselves. When a colleague creates a task, shares a
                                note or adds a project, it appears on your screen without a refresh —
                                the same way a chat message arrives. If your connection drops, the
                                platform reconnects on its own and catches up.
                            </P>
                        </Topic>
                    </Section>

                    <Section id="assistant" title="Assistant" icon={FiCpu} color="text-fuchsia-400">
                        <Topic id="assistant-basics" title="Asking questions">
                            <P>
                                The assistant answers questions about your organization&apos;s work in
                                plain language — what is overdue, who is working on what, how a
                                project is tracking. You do not need to learn a query syntax.
                            </P>
                            <P>
                                It can only reach data you already have permission to see, so its
                                answers respect your role.
                            </P>
                        </Topic>
                    </Section>

                    <Section id="focus" title="Focus timer" icon={FiClock} color="text-orange-400">
                        <Topic id="focus-basics" title="Running a session">
                            <P>
                                Focus mode runs a work-and-break timer for concentrated stretches of
                                work. Set the session and break lengths in Settings. Time recorded
                                against a task while the timer runs counts towards that task.
                            </P>
                        </Topic>
                    </Section>

                    <Section id="settings" title="Settings" icon={FiSettings} color="text-cyan-400">
                        <Topic id="settings-basics" title="Your preferences">
                            <P>
                                Settings covers the choices that are yours alone: which notifications
                                you receive, sound, focus timer lengths, and light or dark theme.
                                They follow you across devices.
                            </P>
                            <P>
                                Organization-wide settings — the name, logo, offices and attendance
                                rules — live elsewhere and are Owner and Admin only.
                            </P>
                        </Topic>
                    </Section>

                    <footer className="border-t border-card-border pt-8">
                        <P>
                            Something missing or out of date? Tell an Owner or Admin in your
                            organization and they can pass it on.
                        </P>
                    </footer>
                </div>
            </main>
        </div>
    );
}

/** A keyboard key. */
function Kbd({ children }: { children: React.ReactNode }) {
    return (
        <kbd className="rounded border border-card-border bg-foreground/[0.04] px-1.5 py-0.5 font-mono text-xs text-foreground">
            {children}
        </kbd>
    );
}
