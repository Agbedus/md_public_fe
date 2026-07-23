'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/providers/theme-provider';

type PipVariant = 'classic' | 'smart' | 'sleepy' | 'cool' | 'shocked' | 'spicy' | 'lovely' | 'cyber';
type PipStatus = 'idle' | 'thinking' | 'error';

interface PipMascotProps {
  variant?: PipVariant;
  status?: PipStatus;
  size?: 'sm' | 'md' | 'lg';
  errorMessage?: string;
  className?: string;
}

interface FaceColors {
  face: string;
  feature: string;
  featureAlt: string;
}

const SIZES = { sm: 64, md: 96, lg: 128 };

export default function PipMascot({ variant = 'classic', status = 'idle', size = 'md', errorMessage, className = '' }: PipMascotProps) {
  const { resolvedTheme } = useTheme();
  const s = SIZES[size];
  const isDark = resolvedTheme === 'dark';
  const colors: FaceColors = {
    face: isDark ? '#f1f5f9' : '#64748b',
    feature: isDark ? '#22c55e' : '#fff',
    featureAlt: isDark ? '#166534' : '#333',
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: s, height: s }}>
      <svg viewBox="0 0 200 200" className="w-full h-full" style={{ filter: status === 'thinking' ? 'drop-shadow(0 0 12px rgba(99,102,241,0.5))' : status === 'error' ? 'drop-shadow(0 0 12px rgba(239,68,68,0.5))' : 'drop-shadow(0 0 8px rgba(99,102,241,0.3))' }}>

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

        {/* Face bg */}
        <ellipse cx="100" cy="100" rx="38" ry="44" fill={colors.face} />

        {/* Face features */}
        {variant === 'classic' && <ClassicFace status={status} colors={colors} />}
        {variant === 'smart' && <SmartFace status={status} colors={colors} />}
        {variant === 'sleepy' && <SleepyFace status={status} colors={colors} />}
        {variant === 'cool' && <CoolFace status={status} colors={colors} />}
        {variant === 'shocked' && <ShockedFace status={status} colors={colors} />}
        {variant === 'spicy' && <SpicyFace status={status} colors={colors} />}
        {variant === 'lovely' && <LovelyFace status={status} colors={colors} />}
        {variant === 'cyber' && <CyberFace status={status} colors={colors} />}

        {/* Typing dots for thinking */}
        {status === 'thinking' && <TypingDots colors={colors} />}
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

/* ── Classic Face ────────────────────────────────────────────── */
function ClassicFace({ status, colors }: { status: PipStatus; colors: FaceColors }) {
  return (
    <g>
      <BlinkGroup>
        <circle cx="80" cy="95" r="12" fill={colors.feature} />
        <circle cx="120" cy="95" r="12" fill={colors.feature} />
        <circle cx="84" cy="95" r="4" fill={colors.featureAlt} />
        <circle cx="124" cy="95" r="4" fill={colors.featureAlt} />
      </BlinkGroup>
      <circle cx="70" cy="108" r="5" fill={colors.feature} opacity="0.3" />
      <circle cx="130" cy="108" r="5" fill={colors.feature} opacity="0.3" />
      <path d="M 95 112 Q 100 119 105 112" fill="none" stroke={colors.feature} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

/* ── Smart Face ──────────────────────────────────────────────── */
function SmartFace({ status, colors }: { status: PipStatus; colors: FaceColors }) {
  return (
    <g>
      <BlinkGroup>
        <circle cx="80" cy="95" r="14" fill="none" stroke={colors.feature} strokeWidth="3" />
        <circle cx="120" cy="95" r="14" fill="none" stroke={colors.feature} strokeWidth="3" />
        <line x1="96" y1="95" x2="104" y2="95" stroke={colors.feature} strokeWidth="3" />
        <line x1="66" y1="95" x2="52" y2="88" stroke={colors.feature} strokeWidth="3" strokeLinecap="round" />
        <line x1="134" y1="95" x2="148" y2="88" stroke={colors.feature} strokeWidth="3" strokeLinecap="round" />
        <circle cx="80" cy="95" r="5" fill={colors.feature} />
        <circle cx="120" cy="95" r="5" fill={colors.feature} />
      </BlinkGroup>
      <path d="M 94 115 Q 100 119 106 115" fill="none" stroke={colors.feature} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

/* ── Cool Face ──────────────────────────────────────────────── */
function CoolFace({ status, colors }: { status: PipStatus; colors: FaceColors }) {
  return (
    <g>
      <path d="M 65 85 L 135 85 L 130 105 Q 115 110 100 100 Q 85 110 70 105 Z" fill="#1e293b" />
      <path d="M 72 88 L 88 88 L 82 95 Z" fill={colors.feature} opacity="0.2" />
      <path d="M 90 118 Q 105 122 112 110" fill="none" stroke={colors.feature} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

/* ── Shocked Face ───────────────────────────────────────────── */
function ShockedFace({ status, colors }: { status: PipStatus; colors: FaceColors }) {
  return (
    <g>
      <BlinkGroup>
        <circle cx="80" cy="92" r="14" fill={colors.feature} />
        <circle cx="120" cy="92" r="14" fill={colors.feature} />
        <circle cx="80" cy="92" r="3" fill={colors.featureAlt} />
        <circle cx="120" cy="92" r="3" fill={colors.featureAlt} />
      </BlinkGroup>
      <rect x="93" y="109" width="14" height="18" rx="7" fill="none" stroke={colors.feature} strokeWidth="3" />
    </g>
  );
}

/* ── Spicy Face ─────────────────────────────────────────────── */
function SpicyFace({ status, colors }: { status: PipStatus; colors: FaceColors }) {
  return (
    <g>
      <path d="M 68 85 L 88 95" stroke={colors.feature} strokeWidth="4" strokeLinecap="round" />
      <path d="M 132 85 L 112 95" stroke={colors.feature} strokeWidth="4" strokeLinecap="round" />
      <BlinkGroup>
        <path d="M 70 95 A 10 10 0 0 0 90 95 Z" fill={colors.feature} />
        <path d="M 110 95 A 10 10 0 0 0 130 95 Z" fill={colors.feature} />
      </BlinkGroup>
      <path d="M 90 118 L 96 112 L 104 118 L 110 112" fill="none" stroke={colors.feature} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/* ── Lovely Face ────────────────────────────────────────────── */
function LovelyFace({ status, colors }: { status: PipStatus; colors: FaceColors }) {
  const heartColor = '#ef4444';
  return (
    <g>
      <BlinkGroup>
        <path d="M 80 104 C 80 104 68 92 68 86 A 7 7 0 0 1 80 86 A 7 7 0 0 1 92 86 C 92 92 80 104 80 104 Z" fill={heartColor} />
        <path d="M 120 104 C 120 104 108 92 108 86 A 7 7 0 0 1 120 86 A 7 7 0 0 1 132 86 C 132 92 120 104 120 104 Z" fill={heartColor} />
      </BlinkGroup>
      <path d="M 90 115 Q 100 128 110 115 Z" fill={heartColor} />
    </g>
  );
}

/* ── Cyber Face ──────────────────────────────────────────────── */
function CyberFace({ status, colors }: { status: PipStatus; colors: FaceColors }) {
  const eyeColor = status === 'thinking' ? '#38ef7d' : '#38ef7d';
  return (
    <g>
      <rect x="65" y="85" width="70" height="22" rx="6" fill="#1e293b" />
      <BlinkGroup>
        <rect x="75" y="92" width="12" height="6" rx="2" fill={eyeColor} />
        <rect x="113" y="92" width="12" height="6" rx="2" fill={eyeColor} />
      </BlinkGroup>
      <line x1="92" y1="120" x2="108" y2="120" stroke={colors.feature} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

/* ── Sleepy Face ─────────────────────────────────────────────── */
function SleepyFace({ status, colors }: { status: PipStatus; colors: FaceColors }) {
  return (
    <g>
      <path d="M 76 95 Q 82 102 88 95" fill="none" stroke={colors.feature} strokeWidth="3" strokeLinecap="round" />
      <path d="M 112 95 Q 118 102 124 95" fill="none" stroke={colors.feature} strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="113" r="3" fill="none" stroke={colors.feature} strokeWidth="2" />
      <motion.text x="120" y="70" fill={colors.feature} fontSize="14" fontWeight="bold" opacity="0.6"
        animate={{ y: [-2, -6, -2] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >z</motion.text>
      <motion.text x="135" y="52" fill={colors.feature} fontSize="20" fontWeight="bold" opacity="0.8"
        animate={{ y: [-3, -8, -3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      >Z</motion.text>
    </g>
  );
}

/* ── Typing Dots ─────────────────────────────────────────────── */
function TypingDots({ colors }: { colors: FaceColors }) {
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={90 + i * 10} cy={131} r={2.5}
          fill={colors.feature}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
        />
      ))}
    </g>
  );
}
