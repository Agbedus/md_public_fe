# MyndDesk Frontend

The MyndDesk web application is the organization-facing workspace for projects,
tasks, attendance, time off, team collaboration, notifications, and Pip, the AI
assistant. It is built with Next.js App Router, TypeScript, Tailwind CSS, and
Framer Motion, and consumes the sibling `md_public_be` FastAPI service.

## Local development

Install dependencies and start the frontend:

```bash
npm install
npm run dev
```

The default application URL is `http://localhost:3000`. Configure `.env.local`
from the project example and point `BASE_URL_LOCAL` at the backend origin. Never
commit environment files or secret values.

The shared backend development environment lives outside both repositories:

```bash
~/Desktop/web-dev/fastdev/bin/python -m uvicorn app.main:app --reload
```

Run that command from the sibling `md_public_be` directory. The backend defaults
to `http://127.0.0.1:8000`.

## Product areas

- Multi-organization registration, invitations, membership, and workspace switching
- Projects, tasks, kanban workflows, notes, calendar events, and time tracking
- Geofenced attendance with window-aware automatic clock-in monitoring
- Time-off requests, approval workflows, announcements, and live notifications
- Team profiles, organization settings, onboarding, and guided setup
- Pip AI chat, streamed responses, structured widgets, and downloadable reports
- Attributed social sharing through major platforms, native share, copy, and QR code

## Frontend reliability

Browser-only UI uses the shared `src/hooks/use-is-client.ts` hook when a
hydration-safe client boundary is required. Effects use complete dependency sets
and clean up subscriptions, timers, and animation frames. Display-only state is
derived during rendering where possible, keeping React updates predictable across
assistant, calendar, notification, location, onboarding, and optimistic workflows.

## Quality checks

Run both checks before pushing:

```bash
npm run lint
npx tsc --noEmit
```

The current codebase passes both checks without lint warnings or TypeScript errors.

## Related documentation

Detailed API, attendance, architecture, and migration notes are maintained in the
local Markdown reference files in this repository and alongside the backend. The
backend API and OpenAPI schema remain the source of truth when a reference differs
from current implementation.
