'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { register } from '@/app/lib/actions';
import { FiUser, FiMail, FiLock, FiArrowRight, FiArrowLeft, FiLoader, FiEye, FiEyeOff, FiBriefcase, FiLink, FiCheck, FiGlobe, FiPhone, FiXCircle } from 'react-icons/fi';
import Link from 'next/link';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { ALL_COUNTRIES, CODE_TO_DIAL, getFlagEmoji } from '@/lib/countries';
import { useAdaptiveDropdown } from '@/hooks/use-adaptive-dropdown';

// Public, unauthenticated lookup — same endpoint and same client-exposed base
// URL the standalone /invite page already uses to preview an invite before
// the visitor has an account.
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL_LOCAL || process.env.NEXT_PUBLIC_BASE_URL_PRODUCTION || 'http://127.0.0.1:8000';
const API_BASE_URL = `${BASE_URL}/api/v1`;

const STEPS = [
  { num: 1, label: 'Account' },
  { num: 2, label: 'Organization' },
  { num: 3, label: 'Review' },
];

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'Real Estate',
  'Manufacturing', 'Retail', 'Media & Entertainment', 'Energy',
  'Agriculture', 'Transportation', 'Consulting', 'Legal', 'Non-Profit',
  'Government', 'Other',
];

const COMPANY_SIZES = [
  '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+',
];

const easeOut = [0.23, 1, 0.32, 1] as [number, number, number, number];
const easeInOut = [0.77, 0, 0.175, 1] as [number, number, number, number];

const formContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.15,
    },
  },
};

const formItem = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: easeOut },
  },
};

function stripLeadingZero(v: string) {
  return v.replace(/^0+/, '');
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ref, handler]);
}

function SearchableCountrySelect({
  value,
  onChange,
  placeholder = 'Select country',
  showDial = false,
  flat = false,
  icon,
  className = '',
}: {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  showDial?: boolean;
  flat?: boolean;
  icon?: React.ReactNode;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { style: dropdownStyle, side: dropdownSide } = useAdaptiveDropdown({
    isOpen,
    anchorRef: containerRef,
    dropdownRef,
    preferredSide: 'bottom',
    preferredAlign: 'start',
    gap: 8,
  });

  useClickOutside(containerRef, () => { setIsOpen(false); setSearch(''); });

  const selected = ALL_COUNTRIES.find((c) => c.code === value);

  const filtered = useMemo(() => {
    if (!search) return ALL_COUNTRIES;
    const q = search.toLowerCase();
    return ALL_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dial.includes(q)
    );
  }, [search]);

  const displayText = selected
    ? showDial
      ? `+${selected.dial}`
      : selected.name
    : '';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2.5 px-4 py-3 text-[15px] text-left cursor-pointer transition-all [font-size:max(16px,inherit)] ${
          selected ? 'text-foreground' : 'text-text-muted/40'
        } focus:outline-none ${flat ? '' : 'bg-foreground/[0.03] border border-card-border rounded-xl focus:bg-foreground/[0.06]'} ${className}`}
      >
        {icon && <span className="shrink-0 text-text-muted">{icon}</span>}
        {selected && <span className="text-lg leading-none shrink-0">{getFlagEmoji(selected.code)}</span>}
        <span className="shrink-0 text-sm">{displayText || placeholder}</span>
        <svg className={`w-4 h-4 text-text-muted transition-transform ml-auto ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          data-side={dropdownSide}
          className={`z-[9999] w-72 rounded-xl border border-card-border bg-background shadow-lg shadow-black/5 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ease-out motion-reduce:animate-none ${dropdownSide === 'top' ? 'origin-bottom' : 'origin-top'}`}
        >
          <div className="p-1.5 border-b border-card-border">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search countries..."
              className="w-full px-3 py-2 text-sm bg-foreground/[0.03] border border-card-border rounded-lg text-foreground placeholder:text-text-muted/40 outline-none focus:bg-foreground/[0.06] transition-all"
              autoFocus
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => { onChange(country.code); setIsOpen(false); setSearch(''); }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
                  country.code === value ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-foreground hover:bg-foreground/[0.03]'
                }`}
              >
                <span className="text-base leading-none">{getFlagEmoji(country.code)}</span>
                <span className="flex-1 truncate">{country.name}</span>
                <span className="text-text-muted text-xs">+{country.dial}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-sm text-text-muted text-center">No countries found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PhoneInput({
  code,
  onCodeChange,
  value,
  onChange,
  placeholder,
}: {
  code: string;
  onCodeChange: (code: string) => void;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex rounded-xl border border-card-border overflow-hidden bg-foreground/[0.03] focus-within:bg-foreground/[0.06] transition-all">
      <div className="shrink-0 border-r border-card-border">
        <SearchableCountrySelect
          value={code}
          onChange={onCodeChange}
          showDial
          placeholder="+233"
          flat
        />
      </div>
      <input
        type="tel"
        value={value}
        onChange={(e) => onChange(stripLeadingZero(e.target.value))}
        placeholder={placeholder}
        className="block w-full px-4 py-3 text-[15px] bg-transparent text-foreground placeholder:text-text-muted/40 focus:outline-none [font-size:max(16px,inherit)]"
      />
    </div>
  );
}

const reviewVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

const reviewItem = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: easeOut },
  },
};

export default function RegisterForm({
  initialInviteCode,
  initialReferralCode,
  initialShareClickId,
  initialEmail,
  initialInvitationToken,
}: {
  initialInviteCode?: string | null;
  initialReferralCode?: string | null;
  initialShareClickId?: string | null;
  initialEmail?: string | null;
  initialInvitationToken?: string | null;
}) {
  const [step, setStep] = useState(1);
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [phoneCode, setPhoneCode] = useState('GH');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  const [orgAction, setOrgAction] = useState<'create' | 'join'>(initialInviteCode ? 'join' : 'create');
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [orgIndustry, setOrgIndustry] = useState('');
  const [orgCompanySize, setOrgCompanySize] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [orgCountry, setOrgCountry] = useState(() => ALL_COUNTRIES.find((c) => c.code === 'GH')?.name || 'Ghana');
  const [orgPhone, setOrgPhone] = useState('');
  const [inviteCode, setInviteCode] = useState(initialInviteCode || '');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [inviteOrgName, setInviteOrgName] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const countryManuallyChanged = useRef(false);

  const handlePhoneCodeChange = (code: string) => {
    setPhoneCode(code);
    if (!countryManuallyChanged.current) {
      const country = ALL_COUNTRIES.find((candidate) => candidate.code === code);
      if (country) setOrgCountry(country.name);
    }
  };

  // Verify the invite code actually resolves to an organization before letting
  // the visitor proceed — debounced so we're not hammering the endpoint on
  // every keystroke. Uses the same public GET /organizations/by-invite/{code}
  // the standalone /invite page already relies on; no auth needed.
  useEffect(() => {
    if (orgAction !== 'join') return;
    const code = inviteCode.trim();
    if (!code) {
      const frame = window.requestAnimationFrame(() => {
        setInviteStatus('idle');
        setInviteOrgName(null);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const frame = window.requestAnimationFrame(() => setInviteStatus('checking'));
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/organizations/by-invite/${encodeURIComponent(code)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setInviteOrgName(data.name || null);
          setInviteStatus('valid');
        } else {
          setInviteOrgName(null);
          setInviteStatus('invalid');
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setInviteOrgName(null);
        setInviteStatus('invalid');
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      controller.abort();
    };
  }, [inviteCode, orgAction]);

  function validateStep(s: number) {
    const newErrors: Record<string, string> = {};

    if (s === 1) {
      if (!fullName.trim()) newErrors.fullName = 'Full name is required';
      if (!email.trim()) newErrors.email = 'Email is required';
      else if (!validateEmail(email)) newErrors.email = 'Invalid email address';
      if (!password) newErrors.password = 'Password is required';
      else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    }

    if (s === 2) {
      if (orgAction === 'create') {
        if (!orgName.trim()) newErrors.orgName = 'Organization name is required';
        if (!validateEmail(email)) newErrors.email = 'Invalid email address';
      } else {
        if (!inviteCode) newErrors.inviteCode = 'Invite code is required';
        else if (inviteStatus === 'checking') newErrors.inviteCode = 'Still checking this code — wait a moment';
        else if (inviteStatus !== 'valid') newErrors.inviteCode = 'No organization found with this invite code';
      }
    }

    if (s === 3) {
      if (!agreedToTerms) newErrors.agreedToTerms = 'You must agree to the Terms of Use and Privacy Policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleContinue() {
    if (validateStep(step)) {
      setStep(Math.min(step + 1, 3));
    }
  }

  function handleBack() {
    setStep(Math.max(step - 1, 1));
    setErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep(step)) return;

    setIsPending(true);

    const phoneDial = CODE_TO_DIAL[phoneCode] || '233';

    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('email', email);
    formData.append('password', password);
    if (phone) formData.append('phone', `+${phoneDial}${phone}`);
    if (jobTitle) formData.append('jobTitle', jobTitle);
    formData.append('agreedToTerms', String(agreedToTerms));

    if (orgAction) formData.append('orgAction', orgAction);
    if (orgAction === 'create') {
      if (orgName) formData.append('orgName', orgName);
      if (orgSlug) formData.append('orgSlug', orgSlug);
      if (orgIndustry) formData.append('orgIndustry', orgIndustry);
      if (orgCompanySize) formData.append('orgCompanySize', orgCompanySize);
      if (orgWebsite) formData.append('orgWebsite', orgWebsite);
      if (orgCountry) formData.append('orgCountry', orgCountry);
      const countryDial = getCountryDial(orgCountry);
      if (orgPhone) formData.append('orgPhone', `+${countryDial}${orgPhone}`);
    } else if (orgAction === 'join') {
      if (inviteCode) formData.append('inviteCode', inviteCode);
    }
    if (initialReferralCode) formData.append('referralCode', initialReferralCode);
    if (initialShareClickId) formData.append('shareClickId', initialShareClickId);
    if (initialInvitationToken) formData.append('invitationToken', initialInvitationToken);

    try {
      // Store org details in sessionStorage for the verify-otp step
      if (orgAction === 'create') {
        const pendingOrg = {
          orgAction: 'create',
          orgName,
          orgSlug,
          orgIndustry,
          orgCompanySize,
          orgWebsite,
          orgCountry,
          orgPhone: orgPhone ? `+${getCountryDial(orgCountry)}${orgPhone}` : '',
        };
        sessionStorage.setItem('pendingOrg', JSON.stringify(pendingOrg));
      } else if (orgAction === 'join') {
        const pendingOrg = {
          orgAction: 'join',
          inviteCode,
        };
        sessionStorage.setItem('pendingOrg', JSON.stringify(pendingOrg));
      }

      const msg = await register(undefined, formData as any);
      if (msg === "Verification code sent") {
        toast.success("Verification code sent to your email");
        const verifyParams = new URLSearchParams({ email });
        if (initialInvitationToken) {
          verifyParams.set('callbackUrl', '/dashboard');
          if (inviteOrgName) verifyParams.set('organizationName', inviteOrgName);
        }
        setTimeout(() => router.push(`/verify-otp?${verifyParams.toString()}`), 1000);
      } else if (msg) {
        toast.error(msg);
        sessionStorage.removeItem('pendingOrg');
      }
    } catch {
      toast.error('An unexpected error occurred');
      sessionStorage.removeItem('pendingOrg');
    } finally {
      setIsPending(false);
    }
  }

  function inputClass(error?: string) {
    return `block w-full pl-12 pr-3.5 py-3 bg-foreground/[0.03] border rounded-xl text-[15px] text-foreground placeholder:text-text-muted/40 focus:outline-none focus:bg-foreground/[0.06] transition-all [font-size:max(16px,inherit)] ${
      error ? 'border-rose-500/50' : 'border-card-border'
    }`;
  }

  function getCountryDial(countryName: string): string {
    const c = ALL_COUNTRIES.find((c) => c.name === countryName);
    return c ? c.dial : '233';
  }

  return (
    <motion.form
      onSubmit={(e) => { e.preventDefault(); if (step === 3) handleSubmit(e); }}
      className="space-y-6"
      variants={formContainer as Variants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={formItem as Variants}>
        <div className="flex items-center justify-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: easeOut, delay: 0.08 * i }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  step > s.num
                    ? 'bg-emerald-500 text-white'
                    : step === s.num
                      ? 'bg-emerald-500/10 text-emerald-500 border-2 border-emerald-500/30'
                      : 'bg-foreground/[0.03] text-text-muted border border-card-border'
                }`}>
                  {step > s.num ? <FiCheck className="h-4 w-4" /> : s.num}
                </div>
                <span className={`text-xs font-medium hidden sm:block transition-colors ${
                  step >= s.num ? 'text-foreground' : 'text-text-muted'
                }`}>
                  {s.label}
                </span>
              </motion.div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 sm:w-16 h-px mx-2 transition-colors duration-300 ${
                  step > s.num ? 'bg-emerald-500/50' : 'bg-card-border'
                }`} />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={formItem as Variants}>
        <AnimatePresence mode="wait">
          {/* Step 1: Account Details */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: easeOut }}
              className="space-y-4"
            >
              <div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiUser className="h-4 w-4 text-text-muted" />
                      </div>
                      <input
                        className={inputClass(errors.fullName)}
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Full name"
                        autoComplete="name"
                      />
                    </div>
                    {errors.fullName && <p className="text-xs text-rose-500 mt-1">{errors.fullName}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiMail className="h-4 w-4 text-text-muted" />
                      </div>
                      <input
                        className={`${inputClass(errors.email)} ${initialInvitationToken ? 'cursor-not-allowed opacity-70' : ''}`}
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        readOnly={!!initialInvitationToken}
                        placeholder="Email address"
                        autoComplete="email"
                      />
                    </div>
                    {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
                    {initialInvitationToken && !errors.email && <p className="text-xs text-text-muted">This invitation is reserved for this email address.</p>}
                  </div>

                  <div className="space-y-1.5">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiLock className="h-4 w-4 text-text-muted" />
                      </div>
                      <input
                        className={`${inputClass(errors.password)} pr-10`}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-rose-500 mt-1">{errors.password}</p>}
                  </div>
                </div>
              </div>

              <div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <PhoneInput
                      code={phoneCode}
                      onCodeChange={handlePhoneCodeChange}
                      value={phone}
                      onChange={setPhone}
                      placeholder="555 123 4567"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiBriefcase className="h-4 w-4 text-text-muted" />
                      </div>
                      <input
                        className={inputClass()}
                        id="jobTitle"
                        type="text"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="Job title"
                        autoComplete="organization-title"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Organization */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: easeOut }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <div className="relative flex bg-foreground/[0.03] rounded-xl p-1 border border-card-border">
                  <div className="absolute inset-0 flex">
                    <motion.div
                      layoutId="org-toggle"
                      className="absolute top-1 bottom-1 rounded-lg bg-card border border-card-border shadow-sm"
                      initial={false}
                      animate={{
                        left: orgAction === 'create' ? '0.25rem' : '50%',
                        right: orgAction === 'create' ? '50%' : '0.25rem',
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setOrgAction('create')}
                    disabled={!!initialInvitationToken}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      orgAction === 'create' ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-muted hover:text-foreground'
                    } ${initialInvitationToken ? 'cursor-not-allowed opacity-40' : ''}`}
                  >
                    <FiBriefcase className="h-4 w-4" />
                    Create new
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrgAction('join')}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      orgAction === 'join' ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-muted hover:text-foreground'
                    }`}
                  >
                    <FiLink className="h-4 w-4" />
                    Join existing
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {orgAction === 'create' ? (
                  <motion.div
                    key="create-fields"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: easeOut }}
                    className="space-y-4"
                  >
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <FiBriefcase className="h-4 w-4 text-text-muted" />
                          </div>
                          <input
                            className={inputClass(errors.orgName)}
                            id="orgName"
                            type="text"
                            value={orgName}
                            onChange={(e) => {
                              const nextName = e.target.value;
                              setOrgName(nextName);
                              if (!slugManuallyEdited) {
                                setOrgSlug(nextName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
                              }
                              if (!nextName) {
                                setOrgSlug('');
                                setSlugManuallyEdited(false);
                              }
                            }}
                            placeholder="Organization name"
                          />
                        </div>
                        {errors.orgName && <p className="text-xs text-rose-500 mt-1">{errors.orgName}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <span className="text-text-muted text-sm font-mono">/</span>
                          </div>
                          <input
                            className={`${inputClass()} font-mono`}
                            id="orgSlug"
                            type="text"
                            value={orgSlug}
                            onChange={(e) => {
                              setSlugManuallyEdited(true);
                              setOrgSlug(e.target.value);
                            }}
                            onFocus={() => { if (!orgSlug) setSlugManuallyEdited(false); }}
                            placeholder="my_company"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                              <FiBriefcase className="h-4 w-4 text-text-muted" />
                            </div>
                            <select
                              className="block w-full pl-12 pr-3.5 py-3 bg-foreground/[0.03] border rounded-xl text-[15px] text-foreground focus:outline-none focus:bg-foreground/[0.06] transition-all [font-size:max(16px,inherit)] appearance-none cursor-pointer border-card-border"
                              id="orgIndustry"
                              value={orgIndustry}
                              onChange={(e) => setOrgIndustry(e.target.value)}
                            >
                              <option value="">Industry</option>
                              {INDUSTRIES.map((ind) => (
                                <option key={ind} value={ind}>{ind}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                              <FiUser className="h-4 w-4 text-text-muted" />
                            </div>
                            <select
                              className="block w-full pl-12 pr-3.5 py-3 bg-foreground/[0.03] border rounded-xl text-[15px] text-foreground focus:outline-none focus:bg-foreground/[0.06] transition-all [font-size:max(16px,inherit)] appearance-none cursor-pointer border-card-border"
                              id="orgCompanySize"
                              value={orgCompanySize}
                              onChange={(e) => setOrgCompanySize(e.target.value)}
                            >
                              <option value="">Company size</option>
                              {COMPANY_SIZES.map((s) => (
                                <option key={s} value={s}>{s} employees</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <FiGlobe className="h-4 w-4 text-text-muted" />
                          </div>
                          <input
                            className={inputClass()}
                            id="orgWebsite"
                            type="url"
                            value={orgWebsite}
                            onChange={(e) => setOrgWebsite(e.target.value)}
                            placeholder="Website"
                            autoComplete="url"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <SearchableCountrySelect
                            value={orgCountry ? ALL_COUNTRIES.find((c) => c.name === orgCountry)?.code || '' : ''}
                            onChange={(code) => {
                              countryManuallyChanged.current = true;
                              const country = ALL_COUNTRIES.find((c) => c.code === code);
                              if (country) {
                                setOrgCountry(country.name);
                              }
                            }}
                            placeholder="Country"
                            icon={<FiGlobe className="h-4 w-4" />}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <FiPhone className="h-4 w-4 text-text-muted" />
                            </div>
                            <input
                              className={inputClass(undefined)}
                              id="orgPhone"
                              type="tel"
                              value={orgPhone}
                              onChange={(e) => setOrgPhone(e.target.value)}
                              placeholder="Org phone number"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="join-fields"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: easeOut }}
                  >
                    <div className="space-y-1.5">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <FiLink className="h-4 w-4 text-text-muted" />
                        </div>
                        <input
                          className={`${inputClass(errors.inviteCode)} tracking-wider uppercase font-mono pr-11`}
                          id="inviteCode"
                          type="text"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value)}
                          placeholder="Invite code"
                          autoComplete="off"
                        />
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                          {inviteStatus === 'checking' && (
                            <FiLoader className="h-4 w-4 text-text-muted animate-spin" />
                          )}
                          {inviteStatus === 'valid' && (
                            <FiCheck className="h-4 w-4 text-emerald-500" />
                          )}
                          {inviteStatus === 'invalid' && (
                            <FiXCircle className="h-4 w-4 text-rose-500" />
                          )}
                        </div>
                      </div>
                      {errors.inviteCode ? (
                        <p className="text-xs text-rose-500 mt-1">{errors.inviteCode}</p>
                      ) : inviteStatus === 'valid' ? (
                        <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1.5">
                          <FiCheck className="h-3 w-3 shrink-0" />
                          Organization verified{inviteOrgName ? `: ${inviteOrgName}` : ''}
                        </p>
                      ) : inviteStatus === 'invalid' ? (
                        <p className="text-xs text-rose-500 mt-1 flex items-center gap-1.5">
                          <FiXCircle className="h-3 w-3 shrink-0" />
                          No organization found with this code
                        </p>
                      ) : inviteStatus === 'checking' ? (
                        <p className="text-xs text-text-muted mt-1">Checking invite code...</p>
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: easeOut }}
              className="space-y-4"
            >
              <motion.div
                className="rounded-xl bg-foreground/[0.02] border border-card-border divide-y divide-card-border"
                variants={reviewVariants as Variants}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={reviewItem as Variants} className="px-4 py-3.5 flex items-center justify-between">
                  <span className="text-sm text-text-muted">Full name</span>
                  <span className="text-sm font-medium text-foreground">{fullName}</span>
                </motion.div>
                <motion.div variants={reviewItem as Variants} className="px-4 py-3.5 flex items-center justify-between">
                  <span className="text-sm text-text-muted">Email</span>
                  <span className="text-sm font-medium text-foreground">{email}</span>
                </motion.div>
                <motion.div variants={reviewItem as Variants} className="px-4 py-3.5 flex items-center justify-between">
                  <span className="text-sm text-text-muted">Password</span>
                  <span className="text-sm font-medium text-foreground">{'•'.repeat(12)}</span>
                </motion.div>
                {phone && (
                  <motion.div variants={reviewItem as Variants} className="px-4 py-3.5 flex items-center justify-between">
                    <span className="text-sm text-text-muted">Phone</span>
                    <span className="text-sm font-medium text-foreground">+{CODE_TO_DIAL[phoneCode]} {phone}</span>
                  </motion.div>
                )}
                {jobTitle && (
                  <motion.div variants={reviewItem as Variants} className="px-4 py-3.5 flex items-center justify-between">
                    <span className="text-sm text-text-muted">Job title</span>
                    <span className="text-sm font-medium text-foreground">{jobTitle}</span>
                  </motion.div>
                )}
                <motion.div variants={reviewItem as Variants} className="px-4 py-3.5 flex items-center justify-between">
                  <span className="text-sm text-text-muted">Organization</span>
                  <span className="text-sm font-medium text-foreground">
                    {orgAction === 'create' ? orgName : 'Join via invite code'}
                  </span>
                </motion.div>
                {orgAction === 'create' && (
                  <>
                    {orgSlug && (
                      <motion.div variants={reviewItem as Variants} className="px-4 py-3.5 flex items-center justify-between">
                        <span className="text-sm text-text-muted">Slug</span>
                        <span className="text-sm font-medium text-foreground font-mono">/{orgSlug}</span>
                      </motion.div>
                    )}
                    {orgIndustry && (
                      <motion.div variants={reviewItem as Variants} className="px-4 py-3.5 flex items-center justify-between">
                        <span className="text-sm text-text-muted">Industry</span>
                        <span className="text-sm font-medium text-foreground">{orgIndustry}</span>
                      </motion.div>
                    )}
                    {orgCompanySize && (
                      <motion.div variants={reviewItem as Variants} className="px-4 py-3.5 flex items-center justify-between">
                        <span className="text-sm text-text-muted">Company size</span>
                        <span className="text-sm font-medium text-foreground">{orgCompanySize} employees</span>
                      </motion.div>
                    )}
                    {orgWebsite && (
                      <motion.div variants={reviewItem as Variants} className="px-4 py-3.5 flex items-center justify-between">
                        <span className="text-sm text-text-muted">Website</span>
                        <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{orgWebsite}</span>
                      </motion.div>
                    )}
                    {orgCountry && (
                      <motion.div variants={reviewItem as Variants} className="px-4 py-3.5 flex items-center justify-between">
                        <span className="text-sm text-text-muted">Country</span>
                        <span className="text-sm font-medium text-foreground">{orgCountry}</span>
                      </motion.div>
                    )}
                    {orgPhone && (
                      <motion.div variants={reviewItem as Variants} className="px-4 py-3.5 flex items-center justify-between">
                        <span className="text-sm text-text-muted">Org phone</span>
                        <span className="text-sm font-medium text-foreground">+{getCountryDial(orgCountry)} {orgPhone}</span>
                      </motion.div>
                    )}
                  </>
                )}
                {orgAction === 'join' && (
                  <motion.div variants={reviewItem as Variants} className="px-4 py-3.5 flex items-center justify-between">
                    <span className="text-sm text-text-muted">Invite code</span>
                    <span className="text-sm font-medium text-foreground tracking-wider uppercase">{inviteCode}</span>
                  </motion.div>
                )}
              </motion.div>

              <motion.div variants={reviewItem as Variants} initial="hidden" animate="visible">
                <label
                  htmlFor="agreedToTerms"
                  className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border cursor-pointer transition-all ${
                    errors.agreedToTerms ? 'border-rose-500/50 bg-rose-500/5' : 'border-card-border bg-foreground/[0.03] hover:bg-foreground/[0.05]'
                  }`}
                >
                  <input
                    type="checkbox"
                    id="agreedToTerms"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked);
                      if (e.target.checked) setErrors((prev) => { const next = { ...prev }; delete next.agreedToTerms; return next; });
                    }}
                    className="mt-0.5 rounded-md border-card-border bg-background text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0 h-4 w-4 shrink-0 transition-all"
                  />
                  <span className="text-xs text-text-muted leading-relaxed select-none">
                    I agree to the{' '}
                    <Link href="/terms" onClick={(e) => e.stopPropagation()} className="text-emerald-500 hover:text-emerald-400 underline underline-offset-2 transition-colors">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" onClick={(e) => e.stopPropagation()} className="text-emerald-500 hover:text-emerald-400 underline underline-offset-2 transition-colors">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.agreedToTerms && (
                  <p className="text-rose-500 text-xs mt-1.5 ml-1">{errors.agreedToTerms}</p>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Navigation */}
      <motion.div variants={formItem as Variants} className="flex items-center gap-3 pt-1">
        <AnimatePresence mode="wait">
          {step > 1 && (
            <motion.div
              key="back-btn"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2, ease: easeOut }}
              className="flex-1"
            >
              <button
                type="button"
                onClick={handleBack}
                disabled={isPending}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-card-border bg-card text-sm font-medium text-foreground hover:bg-foreground/[0.03] transition-all active:scale-[0.97] disabled:opacity-50"
              >
                <FiArrowLeft className="h-4 w-4" />
                Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {step < 3 ? (
          <motion.div
            key="continue-btn"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: easeOut, delay: 0.15 }}
            className={step === 1 ? 'w-full' : 'flex-1'}
          >
            <button
              type="button"
              onClick={handleContinue}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all active:scale-[0.97] hover:shadow-lg hover:shadow-emerald-500/20 ${
                step === 1 ? '' : ''
              }`}
            >
              Continue
              <FiArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="submit-btn"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: easeOut, delay: 0.15 }}
            className="flex-1"
          >
            <button
              type="submit"
              disabled={isPending || (step === 3 && !agreedToTerms)}
              className="relative w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] hover:shadow-lg hover:shadow-emerald-500/20"
            >
              <span className={isPending ? 'opacity-0' : 'inline-flex items-center gap-2'}>
                Create account
                <FiArrowRight className="h-4 w-4" />
              </span>
              {isPending && (
                <span className="absolute inset-0 flex items-center justify-center gap-2">
                  <FiLoader className="h-4 w-4 animate-spin" />
                  <span>Creating account...</span>
                </span>
              )}
            </button>
          </motion.div>
        )}
      </motion.div>

      <motion.p variants={formItem as Variants} className="text-center text-sm text-text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors">
          Sign in
        </Link>
      </motion.p>
    </motion.form>
  );
}
