import React from 'react';
import {
  FiShield, FiUsers, FiDatabase, FiMapPin, FiCpu, FiLink2,
  FiClock, FiLock, FiUserCheck, FiGlobe, FiFileText, FiSettings, FiEye,
} from 'react-icons/fi';
import { LegalDocument, type LegalSection } from '@/components/ui/legal/legal-document';

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      {children}
    </div>
  );
}

const sections: LegalSection[] = [
  {
    id: 'who-we-are',
    index: '01',
    icon: <FiUsers />,
    title: 'Who this policy covers',
    children: (
      <>
        <p>
          This Privacy Policy explains how <strong>MyndDesk</strong> collects, uses, and protects information
          across our marketing site and the dashboard application — attendance, tasks, projects, notes,
          calendar, clients, and the Pip AI assistant.
        </p>
        <p>
          MyndDesk is a multi-tenant workspace: your data lives inside an <strong>organization</strong>, and
          what a teammate can see within that organization depends on their role. Section 5 explains exactly
          how that works.
        </p>
      </>
    ),
  },
  {
    id: 'information-we-collect',
    index: '02',
    icon: <FiDatabase />,
    title: 'Information we collect',
    children: (
      <>
        <p>We collect information in three ways: what you give us, what your device sends automatically, and what your organization’s admin configures.</p>

        <Card>
          <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2"><FiUserCheck className="text-zinc-500" /> Account &amp; profile</h4>
          <p className="text-xs text-zinc-500 leading-relaxed">Full name, email address, password (stored as a salted hash — we never see or store it in plain text), phone number, job title, and profile photo. Creating an organization adds its name, URL slug, website, country, and phone number.</p>
        </Card>
        <Card>
          <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2"><FiFileText className="text-zinc-500" /> Content you create</h4>
          <p className="text-xs text-zinc-500 leading-relaxed">Tasks, notes, projects, client records, calendar events, decisions, time logs, and any files or comments you add to them. This is your operational data — we store it so the product works, not to read it ourselves.</p>
        </Card>
        <Card>
          <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2"><FiMapPin className="text-zinc-500" /> Location, only for Attendance</h4>
          <p className="text-xs text-zinc-500 leading-relaxed">If your organization enables the Attendance feature and you grant your browser’s location permission, we read your device’s GPS position (roughly every 5 minutes while the tab is active) to calculate your distance from your office and drive automatic clock-in/out. Nothing is read if the feature is off or permission is denied.</p>
        </Card>
        <Card>
          <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2"><FiCpu className="text-zinc-500" /> Pip AI conversations</h4>
          <p className="text-xs text-zinc-500 leading-relaxed">When you message the assistant, your prompt and a snapshot of the dashboard data needed to answer it (e.g. your task list) are sent to our AI provider for that single request. See Section&nbsp;3 for how this is handled.</p>
        </Card>
        <Card>
          <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2"><FiEye className="text-zinc-500" /> Automatic &amp; device data</h4>
          <p className="text-xs text-zinc-500 leading-relaxed">Sign-in sessions, IP address, browser and device type, and basic usage events (pages viewed, features used) if you’ve allowed analytics cookies. See Section&nbsp;6.</p>
        </Card>
        <Card>
          <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2"><FiSettings className="text-zinc-500" /> Waitlist &amp; contact forms</h4>
          <p className="text-xs text-zinc-500 leading-relaxed">If you join our early-access waitlist: name, company, role, phone number, email, and where you heard about us. This never requires an account.</p>
        </Card>
      </>
    ),
  },
  {
    id: 'how-we-use',
    index: '03',
    icon: <FiSettings />,
    title: 'How we use it, and the AI assistant',
    children: (
      <>
        <p>We use information to operate and secure the platform: authenticate you, enforce your organization’s roles and permissions, run the features you turn on (Attendance, notifications, invitations), send you transactional email and SMS, and fix bugs.</p>
        <p>
          <strong>Pip AI</strong> is powered by a cloud model we call through NVIDIA’s inference API. Each query
          sends only what’s needed to answer it — your message plus the relevant slice of your own dashboard
          data — for that single exchange. We don’t persist assistant conversations on our servers beyond the
          request, and neither we nor our AI provider use your data to train models.
        </p>
        <p>We do not sell your personal information, and we do not use your operational data (tasks, notes, client records) for advertising.</p>
      </>
    ),
  },
  {
    id: 'sharing',
    index: '04',
    icon: <FiLink2 />,
    title: 'Who we share information with',
    children: (
      <>
        <p>We share information only where it’s needed to run the service:</p>
        <ul className="space-y-2 list-disc pl-5">
          <li><strong>Inside your organization</strong> — following the role visibility described in Section&nbsp;5, never beyond your organization’s boundary.</li>
          <li><strong>Service providers</strong> — our AI inference provider (NVIDIA) for assistant queries, our SMS provider for time-off and task alerts, and our email/SMTP provider for transactional messages. Each only receives what a specific feature needs to function.</li>
          <li><strong>Webhooks your admin configures</strong> — if an organization owner or admin sets up outbound webhooks, attendance events (clock-in, clock-out) are forwarded, HMAC-signed, to the URL they specify. That destination is outside our control — treat it as your organization’s own integration.</li>
          <li><strong>Legal &amp; safety</strong> — if required to comply with law, enforce our Terms, or protect the rights and safety of our users.</li>
        </ul>
        <p>We do not sell personal information to third parties, and we have no advertising or data-broker relationships.</p>
      </>
    ),
  },
  {
    id: 'visibility-model',
    index: '05',
    icon: <FiShield />,
    title: 'Who inside your organization can see what',
    children: (
      <>
        <p>MyndDesk enforces role-based visibility on every organization-scoped record:</p>
        <ul className="space-y-2 list-disc pl-5">
          <li><strong>Owner &amp; Admin</strong> see every record in the organization, whether or not it was shared with them.</li>
          <li><strong>Manager</strong> sees everything too, but can only edit or delete records they created (or, for tasks, are assigned to).</li>
          <li><strong>Member</strong> sees their own records plus anything explicitly shared or assigned to them.</li>
          <li><strong>Guest</strong> is read-only, and only for what’s been explicitly shared.</li>
        </ul>
        <p>This is enforced the same way on our servers as in the interface — a Member’s private note is never returned to another Member’s session, regardless of what the screen shows.</p>
      </>
    ),
  },
  {
    id: 'cookies',
    index: '06',
    icon: <FiDatabase />,
    title: 'Cookies & local storage',
    children: (
      <>
        <p>We use three categories of cookies and local storage, matching the choices in our cookie banner:</p>
        <Card>
          <h4 className="text-white font-semibold text-sm mb-1">Strictly essential — always on</h4>
          <p className="text-xs text-zinc-500 leading-relaxed">Keeps you signed in and your session secure. Without these the app cannot function, so they cannot be turned off.</p>
        </Card>
        <Card>
          <h4 className="text-white font-semibold text-sm mb-1">Performance &amp; analytics — optional</h4>
          <p className="text-xs text-zinc-500 leading-relaxed">Helps us see which parts of the product are slow or confusing, in aggregate. Off by default until you opt in.</p>
        </Card>
        <Card>
          <h4 className="text-white font-semibold text-sm mb-1">Personalization — optional</h4>
          <p className="text-xs text-zinc-500 leading-relaxed">Remembers your theme, sidebar layout, and assistant preferences between visits. Off by default until you opt in.</p>
        </Card>
        <p>You can change your choice at any time from the cookie settings link in the footer, or by clearing your browser’s local storage for this site.</p>
      </>
    ),
  },
  {
    id: 'retention',
    index: '07',
    icon: <FiClock />,
    title: 'How long we keep data',
    children: (
      <>
        <p>We keep information for as long as it’s needed for the purpose it was collected:</p>
        <ul className="space-y-2 list-disc pl-5">
          <li><strong>Account &amp; organizational data</strong> — for as long as your account or organization exists, plus a reasonable window for backups and legal obligations after deletion.</li>
          <li><strong>Notifications</strong> — read notifications are cleared after 7 days, all notifications after 30 days, as a routine housekeeping policy.</li>
          <li><strong>Location readings</strong> — used to compute a live presence state; historical attendance logs are retained per your organization’s own policy, set by your admin.</li>
          <li><strong>Pip AI queries</strong> — not persisted server-side beyond the request that generated the response.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'security',
    index: '08',
    icon: <FiLock />,
    title: 'How we protect it',
    children: (
      <>
        <p>Passwords are hashed, never stored or logged in plain text. Sessions use signed, HTTP-only cookies alongside bearer tokens for API access, so session tokens aren’t reachable from page scripts. Every request is scoped to your organization on the server — widening a query never lets it cross a tenant boundary. Administrative tooling capable of touching raw database tables is restricted to platform super-admins only, never regular organization owners or admins.</p>
        <p>No system is perfectly secure. If you discover a vulnerability, please report it to the contact below before disclosing it publicly.</p>
      </>
    ),
  },
  {
    id: 'your-rights',
    index: '09',
    icon: <FiUserCheck />,
    title: 'Your rights and choices',
    children: (
      <>
        <p>Wherever you’re located, you can ask us to:</p>
        <ul className="space-y-2 list-disc pl-5">
          <li><strong>Access or export</strong> the personal data we hold about you.</li>
          <li><strong>Correct</strong> inaccurate profile information — most of this you can edit directly from Settings.</li>
          <li><strong>Delete</strong> your account, or ask your organization’s owner to remove you from an organization.</li>
          <li><strong>Withdraw consent</strong> for Attendance location tracking (by disabling it or revoking browser permission) or for optional cookies at any time.</li>
        </ul>
        <p>If data-protection law where you live (such as the GDPR or CCPA/CPRA) gives you additional rights — like lodging a complaint with a supervisory authority — those rights apply in full; nothing here limits them. Contact us using the details at the bottom of this page to exercise any of these.</p>
      </>
    ),
  },
  {
    id: 'children',
    index: '10',
    icon: <FiUsers />,
    title: "Children’s privacy",
    children: (
      <p>MyndDesk is a workplace tool intended for users 18 and older, consistent with our Terms of Use. We do not knowingly collect information from anyone under 18. If you believe a minor has provided us information, contact us and we’ll remove it.</p>
    ),
  },
  {
    id: 'international',
    index: '11',
    icon: <FiGlobe />,
    title: 'International data transfers',
    children: (
      <p>Because MyndDesk is used by distributed teams, your information may be processed in a country other than the one you live in — including wherever our hosting, database, and service providers operate. Where required, we rely on appropriate contractual safeguards to protect data that crosses borders.</p>
    ),
  },
  {
    id: 'changes',
    index: '12',
    icon: <FiFileText />,
    title: 'Changes to this policy',
    children: (
      <p>We review this policy regularly and will update the “Last updated” date whenever it changes. For material changes — anything that meaningfully affects how we handle your data — we’ll post a notice in the app ahead of the change taking effect.</p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      eyebrow="Privacy Policy"
      title={<>Privacy<br />Policy</>}
      subtitle="What MyndDesk collects, why, and how you stay in control of it — written in plain language, covering every feature in the product today."
      lastUpdated="July 31, 2026"
      meta={['Version 2.0', 'Applies platform-wide']}
      highlight={{
        icon: <FiShield />,
        title: 'The short version',
        body: "We collect what’s needed to run your workspace — your account, the content you create, and (only if your org enables it) your location for attendance. We never sell your data, and Pip AI only sees what a query needs to answer it.",
      }}
      sections={sections}
      closing={{
        title: 'Questions about your data?',
        body: "Reach out any time — whether it’s a rights request, a security report, or you just want clarity on how something works.",
        email: 'privacy@agbedus.com',
      }}
      siblingHref="/terms"
      siblingLabel="Terms of Use"
    />
  );
}
