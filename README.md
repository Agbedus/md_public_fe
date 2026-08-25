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
- Time-off requests, approval workflows, announcements, and live notification inbox
- Invite acceptance, attendance exit, and time-off/task conflict alerts
- Team profiles, organization settings, onboarding, and guided setup
- Pip AI chat, streamed responses, structured widgets, and downloadable reports
- Attributed social sharing through major platforms, native share, copy, and QR code

## Interaction feedback

User-initiated create, update, and delete flows provide immediate success or error
feedback through the shared toast system. Destructive actions use the compact,
accessible confirmation dialog, which defaults keyboard focus to the safe action
and supports Escape to cancel.

The task workspace supports project-based filtering rather than project sorting.
Selecting a project shows its tasks, while selecting a leaderboard member filters
the same task table or kanban view to work they own or are assigned to. Combined
filters have contextual empty states and a single action to clear the active
selection.

## Frontend reliability

Browser-only UI uses the shared `src/hooks/use-is-client.ts` hook when a
hydration-safe client boundary is required. Effects use complete dependency sets
and clean up subscriptions, timers, and animation frames. Display-only state is
derived during rendering where possible, keeping React updates predictable across
assistant, calendar, notification, location, onboarding, and optimistic workflows.

Floating menus use the shared `src/hooks/use-adaptive-dropdown.ts` positioning
hook. Dropdowns, popovers, date pickers, and time pickers stay inside the visual
viewport, reverse direction when an edge is reached, and account for mobile browser
viewport changes. Their entrance motion is limited to a short opacity-and-scale
transition with a reduced-motion fallback. Registration country menus deliberately
open wider than their compact trigger and retain spacing from the source field.

The landing-page hero keeps its mobile actions on one line within the same readable
width as the supporting copy. The registration and sign-in actions remain labelled,
while the mobile share action uses an accessible icon-only control and restores its
full label on desktop.

## Search visibility

Public search metadata is centralized in `src/lib/seo.ts`. The App Router exposes
`/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, and a generated
`/opengraph-image` for search engines and social previews. The landing page includes
Organization, WebSite, SoftwareApplication, and FAQ structured data. Authentication,
onboarding, and organization dashboard routes explicitly use `noindex` metadata.

Set `NEXT_PUBLIC_SITE_URL` to the canonical production frontend origin. Optional
`GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION` values add their ownership
verification tags without code changes. Never place secret analytics credentials in
client-visible environment variables.

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
