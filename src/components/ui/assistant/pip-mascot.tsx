'use client';

import { motion, AnimatePresence } from 'framer-motion';

type PipVariant = 'classic' | 'smart' | 'sleepy' | 'cool' | 'shocked' | 'spicy' | 'lovely' | 'cyber';
type PipStatus = 'idle' | 'thinking' | 'error';

interface PipMascotProps {
  variant?: PipVariant;
  status?: PipStatus;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  errorMessage?: string;
  className?: string;
}

const SIZES = { sm: 64, md: 96, lg: 128, xl: 200 };

/** Each variant's signature accent — taken directly from the Pip Assets
 *  (glow flood-color and feature color both match this per file). Fixed
 *  rather than theme-flipped: the character's palette shouldn't change
 *  with light/dark mode. */
const VARIANT_ACCENT: Record<PipVariant, string> = {
  classic: '#6366f1',
  smart: '#8b5cf6',
  cool: '#f59e0b',
  shocked: '#ef4444',
  spicy: '#f97316',
  lovely: '#ec4899',
  cyber: '#10b981',
  sleepy: '#06b6d4',
};

function withAlpha(hex: string, alpha: number) {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

export default function PipMascot({ variant = 'classic', status = 'idle', size = 'md', errorMessage, className = '' }: PipMascotProps) {
  const s = SIZES[size];
  const accent = VARIANT_ACCENT[variant];
  const glow =
    status === 'thinking' ? withAlpha('#6366f1', 0.5)
    : status === 'error' ? withAlpha('#ef4444', 0.5)
    : withAlpha(accent, 0.3);
  const glowBlur = status === 'idle' ? 8 : 12;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: s, height: s }}>
      <svg viewBox="0 0 200 200" className="w-full h-full" style={{ filter: `drop-shadow(0 0 ${glowBlur}px ${glow})` }}>

        {/* Status pulse ring */}
        {status === 'thinking' && (
          <motion.circle
            cx="100" cy="100" r="80"
            fill="none" stroke="#6366f1" strokeWidth="2"
            initial={{ scale: 0.5, opacity: 0.5 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        {status === 'error' && (
          <motion.circle
            cx="100" cy="100" r="80"
            fill="none" stroke="#ef4444" strokeWidth="2"
            initial={{ scale: 0.5, opacity: 0.5 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          />
        )}

        {/* Face — matches the Pip Assets' ellipse exactly (rx 38, ry 44, white) */}
        <ellipse cx="100" cy="100" rx="38" ry="44" fill="#ffffff" />

        {/* Face features */}
        {variant === 'classic' && <ClassicFace accent={accent} />}
        {variant === 'smart' && <SmartFace accent={accent} />}
        {variant === 'sleepy' && <SleepyFace accent={accent} />}
        {variant === 'cool' && <CoolFace accent={accent} />}
        {variant === 'shocked' && <ShockedFace accent={accent} />}
        {variant === 'spicy' && <SpicyFace accent={accent} />}
        {variant === 'lovely' && <LovelyFace accent={accent} />}
        {variant === 'cyber' && <CyberFace accent={accent} />}

        {/* Typing dots for thinking */}
        {status === 'thinking' && <TypingDots color={accent} />}
      </svg>

      {/* Error message */}
      <AnimatePresence>
        {status === 'error' && errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20"
          >
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Blink animation ─────────────────────────────────────────── */
function BlinkGroup({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.g
      animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.9, 0.95, 1, 1], delay }}
      style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
    >
      {children}
    </motion.g>
  );
}

/* ── Classic Face (accent #6366f1) ──────────────────────────── */
function ClassicFace({ accent }: { accent: string }) {
  return (
    <g>
      <BlinkGroup>
        <circle cx="80" cy="95" r="12" fill={accent} />
        <circle cx="120" cy="95" r="12" fill={accent} />
        <circle cx="84" cy="95" r="4" fill="#ffffff" />
        <circle cx="124" cy="95" r="4" fill="#ffffff" />
      </BlinkGroup>
      <circle cx="70" cy="108" r="5" fill={accent} opacity="0.2" />
      <circle cx="130" cy="108" r="5" fill={accent} opacity="0.2" />
      <path d="M 95 112 Q 100 119 105 112" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

/* ── Smart Face (accent #8b5cf6) ─────────────────────────────── */
function SmartFace({ accent }: { accent: string }) {
  return (
    <g>
      <BlinkGroup>
        <circle cx="80" cy="95" r="14" fill="none" stroke={accent} strokeWidth="3" />
        <circle cx="120" cy="95" r="14" fill="none" stroke={accent} strokeWidth="3" />
        <line x1="96" y1="95" x2="104" y2="95" stroke={accent} strokeWidth="3" />
        <line x1="66" y1="95" x2="52" y2="88" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <line x1="134" y1="95" x2="148" y2="88" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <circle cx="80" cy="95" r="5" fill={accent} />
        <circle cx="120" cy="95" r="5" fill={accent} />
      </BlinkGroup>
      <path d="M 94 115 Q 100 119 106 115" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

/* ── Cool Face (accent #f59e0b) ──────────────────────────────── */
function CoolFace({ accent }: { accent: string }) {
  return (
    <g>
      <path d="M 65 85 L 135 85 L 130 105 Q 115 110 100 100 Q 85 110 70 105 Z" fill="#1e293b" />
      <path d="M 72 88 L 88 88 L 82 95 Z" fill={accent} opacity="0.4" />
      <path d="M 90 118 Q 105 122 112 110" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

/* ── Shocked Face (accent #ef4444) ───────────────────────────── */
function ShockedFace({ accent }: { accent: string }) {
  return (
    <g>
      <BlinkGroup>
        <circle cx="80" cy="92" r="14" fill={accent} />
        <circle cx="120" cy="92" r="14" fill={accent} />
        <circle cx="80" cy="92" r="3" fill="#ffffff" />
        <circle cx="120" cy="92" r="3" fill="#ffffff" />
      </BlinkGroup>
      <rect x="93" y="109" width="14" height="18" rx="7" fill="none" stroke={accent} strokeWidth="3" />
    </g>
  );
}

/* ── Spicy Face (accent #f97316) ─────────────────────────────── */
function SpicyFace({ accent }: { accent: string }) {
  return (
    <g>
      <path d="M 68 85 L 88 95" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      <path d="M 132 85 L 112 95" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      <BlinkGroup>
        <path d="M 70 95 A 10 10 0 0 0 90 95 Z" fill={accent} />
        <path d="M 110 95 A 10 10 0 0 0 130 95 Z" fill={accent} />
      </BlinkGroup>
      <path d="M 90 118 L 96 112 L 104 118 L 110 112" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/* ── Lovely Face (accent #ec4899) ────────────────────────────── */
function LovelyFace({ accent }: { accent: string }) {
  return (
    <g>
      <BlinkGroup>
        <path d="M 80 104 C 80 104 68 92 68 86 A 7 7 0 0 1 80 86 A 7 7 0 0 1 92 86 C 92 92 80 104 80 104 Z" fill={accent} />
        <path d="M 120 104 C 120 104 108 92 108 86 A 7 7 0 0 1 120 86 A 7 7 0 0 1 132 86 C 132 92 120 104 120 104 Z" fill={accent} />
      </BlinkGroup>
      <path d="M 90 115 Q 100 128 110 115 Z" fill={accent} />
    </g>
  );
}

/* ── Cyber Face (accent #10b981) ─────────────────────────────── */
function CyberFace({ accent }: { accent: string }) {
  return (
    <g>
      <rect x="65" y="85" width="70" height="22" rx="6" fill="#1e293b" />
      <BlinkGroup>
        <rect x="75" y="92" width="12" height="6" rx="2" fill={accent} />
        <rect x="113" y="92" width="12" height="6" rx="2" fill={accent} />
      </BlinkGroup>
      <line x1="92" y1="120" x2="108" y2="120" stroke={accent} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

/* ── Sleepy Face (accent #06b6d4) ─────────────────────────────── */
function SleepyFace({ accent }: { accent: string }) {
  return (
    <g>
      <path d="M 76 95 Q 82 102 88 95" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <path d="M 112 95 Q 118 102 124 95" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="113" r="3" fill="none" stroke={accent} strokeWidth="2" />
      <motion.text x="120" y="70" fill={accent} fontSize="14" fontWeight="bold" opacity="0.6"
        animate={{ y: [-2, -6, -2] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >z</motion.text>
      <motion.text x="135" y="52" fill={accent} fontSize="20" fontWeight="bold" opacity="0.8"
        animate={{ y: [-3, -8, -3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      >Z</motion.text>
    </g>
  );
}

/* ── Typing Dots ─────────────────────────────────────────────── */
function TypingDots({ color }: { color: string }) {
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={90 + i * 10} cy={131} r={2.5}
          fill={color}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
        />
      ))}
    </g>
  );
}
