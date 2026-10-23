"use client";

import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";

interface WizardContext {
  step: number;
  steps: string[];
  formId: string;
  id: string;
  error: string;
  busy: boolean;
  goTo: (step: number) => void;
}
const Context = createContext<WizardContext | null>(null);
function useWizard() {
  const context = useContext(Context);
  if (!context)
    throw new Error("Form step controls must be inside FormWizard.");
  return context;
}

export function FormWizard({
  formId,
  steps,
  children,
  busy = false,
  enabled = true,
  validateStep,
  className = "",
}: {
  formId: string;
  steps: string[];
  children: ReactNode;
  busy?: boolean;
  enabled?: boolean;
  validateStep?: (step: number) => string | null;
  className?: string;
}) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const id = useId();
  const validateRef = useRef(validateStep);
  useEffect(() => {
    validateRef.current = validateStep;
  }, [validateStep]);

  const focusStep = (index: number, field?: HTMLElement) => {
    setStep(index);
    requestAnimationFrame(() => {
      const section = document
        .getElementById(formId)
        ?.querySelector<HTMLElement>(`[data-form-step="${index}"]`);
      (field ?? section)?.focus({ preventScroll: true });
      section?.scrollIntoView({ block: "nearest", behavior: "auto" });
    });
  };
  const validate = (index: number) => {
    const section = document
      .getElementById(formId)
      ?.querySelector(`[data-form-step="${index}"]`);
    const fields =
      section?.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >("input, textarea, select") ?? [];
    for (const field of fields) {
      if (field.willValidate && !field.checkValidity()) {
        const label = field.labels?.[0]?.textContent?.replace("*", "").trim();
        setError(
          label
            ? `${label}: ${field.validationMessage}`
            : field.validationMessage,
        );
        field.setAttribute("aria-invalid", "true");
        focusStep(index, field);
        return false;
      }
    }
    const message = validateRef.current?.(index);
    if (message) {
      setError(message);
      focusStep(index);
      return false;
    }
    return true;
  };
  const goTo = (next: number) => {
    if (busy || next < 0 || next >= steps.length) return;
    setError("");
    if (next > step) {
      for (let index = step; index < next; index++)
        if (!validate(index)) return;
    }
    focusStep(next);
  };

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form || !enabled) return;
    const originalNoValidate = form.noValidate;
    form.noValidate = true;
    const submit = (event: Event) => {
      if (busy || step < steps.length - 1) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!busy) goTo(step + 1);
        return;
      }
      setError("");
      for (let index = 0; index < steps.length; index++) {
        if (!validate(index)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
      }
    };
    const input = (event: Event) => {
      if (event.target instanceof HTMLElement)
        event.target.removeAttribute("aria-invalid");
    };
    form.addEventListener("submit", submit, true);
    form.addEventListener("input", input);
    return () => {
      form.noValidate = originalNoValidate;
      form.removeEventListener("submit", submit, true);
      form.removeEventListener("input", input);
    };
  });

  return (
    <Context.Provider value={{ step, steps, formId, id, error, busy, goTo }}>
      <div className={className}>{children}</div>
    </Context.Provider>
  );
}

export function FormStepHeader() {
  const { step, steps, id, error, busy, goTo } = useWizard();
  return (
    <div className="space-y-3">
      <nav aria-label="Form progress" className="flex gap-2">
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            disabled={busy}
            onClick={(event) => {
              event.preventDefault();
              goTo(index);
            }}
            aria-current={step === index ? "step" : undefined}
            className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl px-2 py-2 text-left text-xs transition-colors sm:px-3 ${step === index ? "bg-foreground/[0.06] text-foreground" : "text-text-muted hover:bg-foreground/[0.03]"}`}
          >
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] ${index <= step ? "bg-ink text-on-ink" : "border border-card-border"}`}
            >
              {index < step ? <FiCheck /> : index + 1}
            </span>
            <span
              id={`${id}-${index}`}
              className="min-w-0 break-words font-medium"
            >
              {label}
            </span>
          </button>
        ))}
      </nav>
      <p className="text-xs text-text-muted">
        Step {step + 1} of {steps.length} · {steps[step]}
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-danger/10 px-3 py-2 text-sm text-danger-text"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function FormStep({
  index,
  children,
  className = "space-y-5",
}: {
  index: number;
  children: ReactNode;
  className?: string;
}) {
  const { step, id } = useWizard();
  // Keep every field mounted: switching steps must preserve uncontrolled inputs,
  // file selections, custom picker state, and the final FormData payload.
  return (
    <section
      data-form-step={index}
      aria-labelledby={`${id}-${index}`}
      tabIndex={-1}
      hidden={step !== index}
      inert={step !== index}
      style={step !== index ? { display: "none" } : undefined}
      className={`focus:outline-none ${className}`}
    >
      {children}
    </section>
  );
}

export function FormStepNavigation({ children }: { children: ReactNode }) {
  const { step, steps, busy, goTo } = useWizard();
  return (
    <div className="flex items-center justify-end gap-2 sm:gap-3">
      {step > 0 && (
        <button
          key="back"
          type="button"
          onClick={(event) => {
            event.preventDefault();
            goTo(step - 1);
          }}
          disabled={busy}
          className="md-btn md-btn-secondary"
        >
          <FiArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
      )}
      {step === steps.length - 1 ? (
        <Fragment key="submit">{children}</Fragment>
      ) : (
        <button
          key="continue"
          type="button"
          onClick={(event) => {
            // The last Continue click can render Submit before the browser
            // finishes its default click action. Never let that click submit.
            event.preventDefault();
            goTo(step + 1);
          }}
          disabled={busy}
          className="md-btn md-btn-primary"
        >
          Continue{" "}
          <span className="md-btn-chip">
            <FiArrowRight />
          </span>
        </button>
      )}
    </div>
  );
}
