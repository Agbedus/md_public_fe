"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  type ReactNode,
} from "react";
import Image from "next/image";
import { FiX, FiMail, FiPhone, FiCalendar } from "react-icons/fi";
import type { OrganizationMembershipWithUser } from "@/types/organization";
import { Portal } from "@/components/ui/portal";
import { avatarStyle } from "@/lib/avatar-color";

interface MemberDetailPanelProps {
  member: OrganizationMembershipWithUser;
  role: {
    label: string;
    hint: string;
    icon: ReactNode;
    color: string;
    bg: string;
  };
  status: { label: string; color: string; bg: string };
  roleControl: ReactNode;
  actions: ReactNode;
  onClose: () => void;
}

export function MemberDetailPanel({
  member,
  role,
  status,
  roleControl,
  actions,
  onClose,
}: MemberDetailPanelProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const close = useEffectEvent(onClose);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() =>
      panel.current
        ?.querySelector<HTMLButtonElement>("[data-close-member]")
        ?.focus(),
    );
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        document.querySelector("[data-member-role-menu]")
      )
        return;
      if (panel.current?.contains(document.activeElement)) {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  const name = member.user.full_name || member.user.email.split("@")[0];
  return (
    <Portal>
      <div className="fixed inset-0 z-[110] flex justify-end">
        <div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-150 motion-reduce:animate-none"
          onClick={onClose}
        />
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onKeyDown={(event) => {
            if (
              event.key !== "Tab" ||
              !panel.current?.contains(event.target as Node)
            )
              return;
            const items = Array.from(
              panel.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), a[href], [tabindex="0"]',
              ),
            );
            const first = items[0],
              last = items.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}
          className="relative flex h-full w-full max-w-md flex-col border-l border-card-border bg-background shadow-2xl animate-in slide-in-from-right-4 fade-in duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:animate-none"
        >
          <header className="flex items-center justify-between border-b border-card-border px-5 py-4">
            <h2
              id={titleId}
              className="text-base font-semibold text-foreground"
            >
              Member details
            </h2>
            <button
              type="button"
              data-close-member
              onClick={onClose}
              aria-label="Close member details"
              className="grid h-11 w-11 place-items-center rounded-full text-text-muted transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
            >
              <FiX className="h-5 w-5" />
            </button>
          </header>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
            <div>
              <div className="relative mb-4 h-16 w-16">
                {member.user.avatar_url ? (
                  <Image
                    src={member.user.avatar_url}
                    alt=""
                    fill
                    className="rounded-full object-cover"
                  />
                ) : (
                  <span
                    style={avatarStyle(name)}
                    className="grid h-16 w-16 place-items-center rounded-full text-2xl font-semibold"
                  >
                    {name[0].toUpperCase()}
                  </span>
                )}
              </div>
              <h3 className="break-words text-2xl font-semibold tracking-tight text-foreground">
                {name}
              </h3>
              {member.user.job_title && (
                <p className="mt-1 text-sm text-text-muted">
                  {member.user.job_title}
                </p>
              )}
              <span
                className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${status.bg} ${status.color}`}
              >
                {status.label}
              </span>
            </div>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="mb-1 flex items-center gap-2 text-xs text-text-muted">
                  <FiMail />
                  Email
                </dt>
                <dd>
                  <a
                    href={`mailto:${member.user.email}`}
                    className="break-all text-foreground hover:text-accent-text"
                  >
                    {member.user.email}
                  </a>
                </dd>
              </div>
              {member.user.phone && (
                <div>
                  <dt className="mb-1 flex items-center gap-2 text-xs text-text-muted">
                    <FiPhone />
                    Phone
                  </dt>
                  <dd>
                    <a
                      href={`tel:${member.user.phone}`}
                      className="text-foreground hover:text-accent-text"
                    >
                      {member.user.phone}
                    </a>
                  </dd>
                </div>
              )}
              {member.joined_at &&
                Number.isFinite(new Date(member.joined_at).getTime()) && (
                  <div>
                    <dt className="mb-1 flex items-center gap-2 text-xs text-text-muted">
                      <FiCalendar />
                      Joined
                    </dt>
                    <dd className="text-foreground">
                      {new Date(member.joined_at).toLocaleDateString(
                        undefined,
                        { day: "numeric", month: "long", year: "numeric" },
                      )}
                    </dd>
                  </div>
                )}
            </dl>
            <section className="rounded-[24px] bg-foreground/[0.03] p-4">
              <h4 className="mb-3 text-xs font-medium text-text-muted">
                Role & access
              </h4>
              {roleControl}
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                {role.hint}
              </p>
            </section>
          </div>
          {actions && (
            <footer className="border-t border-card-border px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-text-muted">Member actions</span>
                {actions}
              </div>
            </footer>
          )}
        </div>
      </div>
    </Portal>
  );
}
