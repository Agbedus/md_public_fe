import { NextResponse } from "next/server";
import { getAggregatedDashboardData } from "@/app/lib/dashboard-actions";
import { getTasks } from "@/app/(dashboard)/[orgSlug]/tasks/actions";
import { getNotes } from "@/app/(dashboard)/[orgSlug]/notes/actions";
import { getProjects } from "@/app/(dashboard)/[orgSlug]/projects/actions";
import { getEvents } from "@/app/(dashboard)/[orgSlug]/calendar/actions";
import { getClients } from "@/app/(dashboard)/[orgSlug]/clients/actions";
import { getUsersSafe } from "@/app/(dashboard)/[orgSlug]/users/actions";
import { getTimeOffRequests } from "@/app/(dashboard)/[orgSlug]/time-off/actions";
import { startOfMonth, endOfMonth, format, parse } from "date-fns";

async function streamSSEResponse(
  response: Response,
  onContent: (text: string) => void,
): Promise<void> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        try {
          const json = JSON.parse(data);
          const content = json.choices[0]?.delta?.content;
          if (content) onContent(content);
        } catch {
          // skip parse errors
        }
      }
    }
  }
}


// --- Tool Definitions (OpenAI Format) ---

const tools = [
  {
    type: "function",
    function: {
      name: "searchNotes",
      description: "Search for notes by title or content. Use this to find information in the user's notebook.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listTasks",
      description: "List recent tasks or todos.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["task", "in_progress", "completed"], description: "Filter by status" },
          limit: { type: "integer", description: "Number of tasks to return (default 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createNote",
      description: "Create a new note in the database.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "The title of the note" },
          content: { type: "string", description: "The content/body of the note" },
          tags: { type: "string", description: "Comma separated tags" },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createTask",
      description: "Create a new task in the database.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "The name of the task" },
          description: { type: "string", description: "Description" },
          dueDate: { type: "string", description: "Due date (YYYY-MM-DD)" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getNote",
      description: "Get full details of a specific note by ID.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "The ID of the note" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getTask",
      description: "Get full details of a specific task by ID.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "The ID of the task" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listProjects",
      description: "List projects with optional filtering.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["planning", "in_progress", "completed", "on_hold"], description: "Filter by status" },
          limit: { type: "integer", description: "Number of projects to return (default 10)" },
          name: { type: "string", description: "Filter by project name (partial match)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getProject",
      description: "Get full details of a specific project by ID.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "The ID of the project" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listEvents",
      description: "List calendar events for a specific date range.",
      parameters: {
        type: "object",
        properties: {
          start: { type: "string", description: "Start date (ISO string)" },
          end: { type: "string", description: "End date (ISO string)" },
        },
        required: ["start", "end"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchClients",
      description: "Search for clients by name.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "The client name to search for" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getStats",
      description: "Get high-level statistics about the user's data (counts of notes, tasks, projects).",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "displayTasks",
      description: "Display tasks as interactive cards. Use this when the user asks to see their tasks.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["task", "in_progress", "completed"], description: "Filter by status" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Filter by priority" },
          limit: { type: "integer", description: "Number of tasks to display (default 5, max 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "displayNotes",
      description: "Display notes as interactive cards. Use this when the user asks to see their notes.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", description: "Number of notes to display (default 5, max 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "displayEvents",
      description: "Display calendar events as interactive cards. Use this when the user asks about their schedule or calendar.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", description: "Number of events to display (default 5, max 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "displayProjects",
      description: "Display projects as interactive cards. Use this when the user asks about their projects.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["planning", "in_progress", "completed", "on_hold"], description: "Filter by status" },
          limit: { type: "integer", description: "Number of projects to display (default 5, max 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "displayStats",
      description: "Display statistics and metrics. Use this when the user asks about productivity, task counts, or overview.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generateMonthlyReport",
      description: "Generate a comprehensive monthly report of all tasks, projects, notes, events, attendance, time-off, and decisions worked on. The AI will analyze the data and write a natural language report. Use this when the user asks for a monthly report, monthly summary, or end-of-month review.",
      parameters: {
        type: "object",
        properties: {
          month: { type: "string", description: "The month and year for the report (e.g., 'June 2026'). Defaults to the current month if not specified." },
        },
      },
    },
  },
];

// --- Helper Functions ---

async function executeTool(name: string, args: any) {
  console.debug(`Executing tool: ${name}`, args);
  try {
    if (name === "searchNotes") {
      const notes = await getNotes(50);
      const query = args.query.toLowerCase();
      const filtered = notes.filter(n => 
        n.title.toLowerCase().includes(query) || 
        n.content.toLowerCase().includes(query)
      );
      return { notes: filtered.slice(0, 10) };
    }
    
    if (name === "getNote") {
      const notes = await getNotes(500);
      const note = notes.find(n => n.id === args.id);
      return note ? { note } : { error: "Note not found" };
    }

    if (name === "listTasks") {
      const tasks = await getTasks(undefined, args.priority, args.status, undefined, args.limit || 10);
      return { tasks };
    }

    if (name === "getTask") {
      const tasks = await getTasks(undefined, undefined, undefined, undefined, 500);
      const task = tasks.find(t => t.id === args.id);
      return task ? { task } : { error: "Task not found" };
    }

    if (name === "createNote") {
      return { success: true, message: "Use the UI to finalize note creation.", note: { ...args } };
    }

    if (name === "createTask") {
      return { success: true, message: "Use the UI to finalize task creation.", task: { ...args, status: "task" } };
    }

    if (name === "listProjects") {
      const allProjects = await getProjects();
      let filtered = allProjects;
      if (args.status) filtered = filtered.filter(p => p.status === args.status);
      if (args.name) filtered = filtered.filter(p => p.name.toLowerCase().includes(args.name.toLowerCase()));
      return { projects: filtered.slice(0, args.limit || 10) };
    }

    if (name === "getProject") {
      const allProjects = await getProjects();
      const project = allProjects.find(p => p.id === args.id);
      return project ? { project } : { error: "Project not found" };
    }

    if (name === "listEvents") {
      const allEvents = await getEvents();
      const start = new Date(args.start);
      const end = new Date(args.end);
      const filtered = allEvents.filter(e => {
        const eStart = new Date(e.start);
        return eStart >= start && eStart <= end;
      });
      return { events: filtered };
    }

    if (name === "searchClients") {
      const clients = await getClients();
      const query = args.name.toLowerCase();
      const filtered = clients.filter(c => 
        c.companyName.toLowerCase().includes(query) ||
        (c.contactPersonName && c.contactPersonName.toLowerCase().includes(query))
      );
      return { clients: filtered.slice(0, 10) };
    }

    if (name === "getStats") {
      const [tasks, notes, projects] = await Promise.all([
        getTasks(undefined, undefined, undefined, undefined, 500),
        getNotes(100),
        getProjects()
      ]);
      return {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'DONE').length,
        totalNotes: notes.length,
        totalProjects: projects.length
      };
    }

    // Widget display tools - return real data
    if (name === "displayTasks") {
      const limit = Math.min(args.limit || 5, 10);
      const tasks = await getTasks(undefined, args.priority, args.status, undefined, limit);
      return {
        widget: "task",
        data: tasks
      };
    }

    if (name === "displayNotes") {
      const limit = Math.min(args.limit || 5, 10);
      const notes = await getNotes(limit);
      return {
        widget: "note",
        data: notes
      };
    }

    if (name === "displayEvents") {
      const limit = Math.min(args.limit || 5, 10);
      const allEvents = await getEvents();
      // Get upcoming events
      const now = new Date();
      const upcomingEvents = allEvents
        .filter(e => new Date(e.start) >= now)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, limit);
      return {
        widget: "event",
        data: upcomingEvents
      };
    }

    if (name === "displayProjects") {
      const limit = Math.min(args.limit || 5, 10);
      const allProjects = await getProjects();
      let filtered = allProjects;
      if (args.status) {
        filtered = allProjects.filter(p => p.status === args.status);
      }
      return {
        widget: "project",
        data: filtered.slice(0, limit)
      };
    }

    if (name === "displayStats") {
      const [tasks, notes, projects] = await Promise.all([
        getTasks(undefined, undefined, undefined, undefined, 500),
        getNotes(100),
        getProjects()
      ]);
      
      const completedTasks = tasks.filter(t => t.status === 'DONE').length;
      const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
      const pendingTasks = tasks.filter(t => t.status === 'TODO').length;
      
      return {
        widget: "stats",
        data: {
          title: "Your Overview",
          stats: [
            { label: "Total Tasks", value: tasks.length, color: "text-blue-400" },
            { label: "Completed", value: completedTasks, color: "text-emerald-400" },
            { label: "In Progress", value: inProgressTasks, color: "text-yellow-400" },
            { label: "Pending", value: pendingTasks, color: "text-zinc-400" },
            { label: "Total Notes", value: notes.length, color: "text-purple-400" },
            { label: "Projects", value: projects.length, color: "text-pink-400" },
          ]
        }
      };
    }

    if (name === "generateMonthlyReport") {
      const now = new Date();
      let monthStart: Date;
      let monthEnd: Date;
      let monthLabel: string;

      if (args.month) {
        const parsed = parse(args.month, "MMMM yyyy", now);
        if (isNaN(parsed.getTime())) {
          monthStart = startOfMonth(now);
          monthEnd = endOfMonth(now);
          monthLabel = format(now, "MMMM yyyy");
        } else {
          monthStart = startOfMonth(parsed);
          monthEnd = endOfMonth(parsed);
          monthLabel = format(parsed, "MMMM yyyy");
        }
      } else {
        monthStart = startOfMonth(now);
        monthEnd = endOfMonth(now);
        monthLabel = format(now, "MMMM yyyy");
      }

      const [allTasks, allNotes, allProjects, allEvents, users, timeOff] = await Promise.all([
        getTasks(undefined, undefined, undefined, undefined, 1000),
        getNotes(1000),
        getProjects(),
        getEvents(),
        getUsersSafe(),
        getTimeOffRequests(),
      ]);

      const tasksThisMonth = allTasks.filter(t =>
        t.createdAt && new Date(t.createdAt) >= monthStart && new Date(t.createdAt) <= monthEnd
      );
      const completedThisMonth = allTasks.filter(t =>
        t.status === "DONE" && t.updatedAt && new Date(t.updatedAt) >= monthStart && new Date(t.updatedAt) <= monthEnd
      );
      const notesThisMonth = allNotes.filter(n =>
        n.created_at && new Date(n.created_at) >= monthStart && new Date(n.created_at) <= monthEnd
      );
      const eventsThisMonth = allEvents.filter(e =>
        new Date(e.start) >= monthStart && new Date(e.start) <= monthEnd
      );
      const timeOffThisMonth = timeOff.filter(t => {
        const start = new Date(t.start_date);
        const end = new Date(t.end_date);
        return start <= monthEnd && end >= monthStart;
      });

      const tasksWithDetails = tasksThisMonth.map(t => {
        const owner = t.owner || users.find((u: any) => u.id === t.userId);
        const assigneeNames = (t.assigneeIds || [])
          .map((id: string) => users.find((u: any) => u.id === id))
          .filter(Boolean)
          .map((u: any) => u.name || u.full_name || u.email);
        return {
          id: t.id,
          name: t.name,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          projectId: t.projectId,
          owner: owner ? (owner.name || owner.full_name || owner.email || "Unknown") : "Unknown",
          assignees: assigneeNames.length > 0 ? assigneeNames : ["Unassigned"],
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        };
      });

      const completedTasksWithDetails = completedThisMonth.map(t => {
        const owner = t.owner || users.find((u: any) => u.id === t.userId);
        const assigneeNames = (t.assigneeIds || [])
          .map((id: string) => users.find((u: any) => u.id === id))
          .filter(Boolean)
          .map((u: any) => u.name || u.full_name || u.email);
        const project = allProjects.find(p => p.id === t.projectId);
        return {
          id: t.id,
          name: t.name,
          project: project ? project.name : "No Project",
          owner: owner ? (owner.name || owner.full_name || owner.email || "Unknown") : "Unknown",
          assignees: assigneeNames.length > 0 ? assigneeNames : ["Unassigned"],
          completedAt: t.updatedAt,
        };
      });

      const projectSummaries = allProjects.map(p => {
        const projectTasks = allTasks.filter(t => t.projectId === p.id);
        const done = projectTasks.filter(t => t.status === "DONE").length;
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          totalTasks: projectTasks.length,
          completedTasks: done,
          progress: projectTasks.length > 0 ? Math.round((done / projectTasks.length) * 100) : 0,
        };
      });

      return {
        __reportData: true,
        month: monthLabel,
        data: {
          month: monthLabel,
          period: { start: format(monthStart, "MMM d, yyyy"), end: format(monthEnd, "MMM d, yyyy") },
          tasks: {
            total: allTasks.length,
            createdThisMonth: tasksThisMonth.length,
            completedThisMonthCount: completedThisMonth.length,
            pending: allTasks.filter(t => t.status !== "DONE").length,
            byStatus: {
              todo: allTasks.filter(t => t.status === "TODO").length,
              inProgress: allTasks.filter(t => t.status === "IN_PROGRESS").length,
              qa: allTasks.filter(t => t.status === "QA").length,
              review: allTasks.filter(t => t.status === "REVIEW").length,
              done: allTasks.filter(t => t.status === "DONE").length,
            },
            tasksThisMonth: tasksWithDetails,
            completedThisMonth: completedTasksWithDetails,
          },
          notes: {
            total: allNotes.length,
            createdThisMonth: notesThisMonth.length,
            recentNotes: notesThisMonth.slice(0, 20).map(n => ({
              title: n.title,
              type: n.type,
              tags: n.tags,
              createdAt: n.created_at,
            })),
          },
          projects: {
            total: allProjects.length,
            active: allProjects.filter(p => p.status === "in_progress" || p.status === "planning").length,
            completed: allProjects.filter(p => p.status === "completed").length,
            onHold: allProjects.filter(p => p.status === "on_hold").length,
            summaries: projectSummaries,
          },
          events: {
            total: allEvents.length,
            thisMonth: eventsThisMonth.map(e => ({
              title: e.title,
              start: e.start,
              end: e.end,
              location: e.location,
            })),
          },
          timeOff: {
            total: timeOff.length,
            thisMonth: timeOffThisMonth.map(t => ({
              user_id: t.user_id,
              type: t.type,
              start_date: t.start_date,
              end_date: t.end_date,
              status: t.status,
            })),
          },
          users: {
            total: users.length,
          },
        },
      };
    }

    return { error: "Unknown tool" };
  } catch (e: unknown) {
    console.error("Tool execution error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return { error: errorMessage };
  }
}

// --- Main Handler ---

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    const model = "minimaxai/minimax-m3";
    const baseUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
    const apiKey = process.env.NVIDIA_BUILD_API_KEY;

    const messages: any[] = [
      {
        role: "system",
        content: `You are an intelligent assistant for a productivity dashboard. 
        You have full access to the user's dashboard data — you can answer any question about their tasks, projects, notes, events, clients, attendance, and productivity. 
        You can also generate comprehensive monthly reports.
        
        Here is the current status of the user's dashboard:
        ${JSON.stringify(await getAggregatedDashboardData(), null, 2)}

        CRITICAL INSTRUCTIONS:
        1. When the user asks to "show", "list", or "display" specific items (tasks, notes, projects, events), you MUST call the corresponding 'displayX' tool (e.g., displayTasks).
        2. Do NOT manually list out tasks, notes, or projects. ALWAYS use the tool so the interactive UI widget is rendered for the user.
        3. When the user asks for a "monthly report", "monthly summary", or "end-of-month review", call the generateMonthlyReport tool. Do NOT try to write the report yourself — just call the tool and it will generate a thorough natural-language report. You can optionally specify a month like "June 2026" if the user asks for a specific month.
        4. You can answer ANY question about the user's dashboard data since it is provided in context above.
        5. Be brief and conversational for normal questions. Only use the report tool when explicitly asked.
        `
      },
      {
        role: "assistant",
        content: "Understood. I can display tasks, notes, projects, and events as interactive cards. I can also generate comprehensive monthly reports in natural language by calling the report tool."
      },
      {
        role: "user",
        content: message
      }
    ];

    if (!apiKey) {
      throw new Error("NVIDIA_BUILD_API_KEY environment variable is not set");
    }

    console.debug(`Sending request to NVIDIA NIM (${model})...`);

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        tools: tools,
        stream: true,
        max_tokens: 16384
      }),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      let errMessage = `API Error: ${response.status}`;
      try {
        const errData = JSON.parse(bodyText);
        errMessage = errData?.error?.message || errData?.error || JSON.stringify(errData);
      } catch {
        errMessage = bodyText || errMessage;
      }
      throw new Error(errMessage);
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const toolCallsMap: Record<number, any> = {};

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const json = JSON.parse(data);
                  const delta = json.choices[0]?.delta || {};

                  // Stream text directly to the client immediately
                  if (delta.content) {
                    controller.enqueue(new TextEncoder().encode(delta.content));
                  }

                  // Accumulate tool calls
                  if (delta.tool_calls) {
                    for (const tc of delta.tool_calls) {
                      if (tc.index !== undefined && tc.index !== null) {
                        const idx = tc.index;
                        if (!toolCallsMap[idx]) {
                          toolCallsMap[idx] = { id: tc.id, type: tc.type, function: { name: "", arguments: "" } };
                        }
                        if (tc.id) toolCallsMap[idx].id = tc.id;
                        if (tc.function?.name) toolCallsMap[idx].function.name += tc.function.name;
                        if (tc.function?.arguments) toolCallsMap[idx].function.arguments += tc.function.arguments;
                      }
                    }
                  }
                } catch (e) {
                  console.error("Error parsing stream chunk:", e);
                }
              }
            }
          }

          // Once the stream is done, check if the model invoked any tools
          const toolCalls = Object.values(toolCallsMap);
          if (toolCalls.length > 0) {
            console.debug(`Executing ${toolCalls.length} tool calls...`);
            for (const tc of toolCalls) {
              const functionName = tc.function.name;
              let functionArgs = {};
              try {
                functionArgs = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
              } catch (e) {
                console.error("Failed to parse tool arguments:", e);
              }

              const result = await executeTool(functionName, functionArgs);

              if (result.__reportData) {
                const reportMessages = [
                  {
                    role: "system",
                    content: `You are a senior productivity analyst. Your task is to write a comprehensive, natural-language monthly report based on the provided dashboard data.

Write in a professional, narrative tone. Use markdown formatting.

REPORT STRUCTURE:
1. **Executive Summary** — Brief overview of the month: how many tasks completed, notes created, project progress.
2. **Task Completion Highlights** — For each completed task, mention the task name, who owned it, who was assigned, and which project it belonged to. Group by project if possible.
3. **Project Progress** — For each project, mention its status, completion rate, and notable tasks.
4. **Notes & Decisions** — Mention notable notes created this month.
5. **Attendance & Time Off** — Summarize time-off taken by team members.
6. **Key Events** — Calendar events that occurred this month.
7. **Productivity Insights** — Patterns, trends, and recommendations.

IMPORTANT RULES:
- Always mention specific task names, owners, and assignees.
- Reference people by name wherever possible.
- Use specific numbers and data.
- The tone should be insightful and actionable, not robotic.
- End with a forward-looking recommendation for next month.
- Use headings (##) and bullet points for readability.`
                  },
                  {
                    role: "user",
                    content: `Generate a monthly report for ${result.month}. Here is all the data to analyze:

${JSON.stringify(result.data, null, 2)}`
                  }
                ];

                try {
                  const reportRes = await fetch(baseUrl, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                      model,
                      messages: reportMessages,
                      stream: true,
                      max_tokens: 16384,
                    }),
                  });

                  if (!reportRes.ok) {
                    const errText = await reportRes.text();
                    controller.enqueue(new TextEncoder().encode(`\n\n*Failed to generate report: ${errText}*\n\n`));
                  } else {
                    controller.enqueue(new TextEncoder().encode(`\n\n__REPORT__\n\n`));
                    await streamSSEResponse(reportRes, (text) => {
                      controller.enqueue(new TextEncoder().encode(text));
                    });
                  }
                } catch (reportErr) {
                  console.error("Report generation error:", reportErr);
                  controller.enqueue(new TextEncoder().encode("\n\n*Error generating the report. Please try again.*\n\n"));
                }
              } else if (result.widget && result.data) {
                const widgetStr = `\n\n__WIDGET__${JSON.stringify(result)}__WIDGET__\n\n`;
                controller.enqueue(new TextEncoder().encode(widgetStr));
              } else if (result.error) {
                controller.enqueue(new TextEncoder().encode(`\n\n*Error: ${result.error}*\n\n`));
              } else if (result.message) {
                controller.enqueue(new TextEncoder().encode(`\n\n*${result.message}*\n\n`));
              }
            }
          }
        } catch (streamErr) {
          console.error("Stream reading error:", streamErr);
          controller.enqueue(new TextEncoder().encode("\n\n*Error reading stream from assistant.*"));
        } finally {
          controller.close();
        }
      }
    });

    return new NextResponse(stream);

  } catch (error: unknown) {
    console.error("Error in assistant API:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
