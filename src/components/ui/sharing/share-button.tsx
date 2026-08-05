'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  EmailShareButton,
  FacebookShareButton,
  LinkedinShareButton,
  TelegramShareButton,
  ThreadsShareButton,
  TwitterShareButton,
  WhatsappShareButton,
} from 'react-share';
import QRCode from 'react-qr-code';
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaTelegram,
  FaThreads,
  FaWhatsapp,
  FaXTwitter,
} from 'react-icons/fa6';
import {
  FiCheck,
  FiCopy,
  FiGrid,
  FiLoader,
  FiMail,
  FiShare2,
  FiSmartphone,
  FiX,
} from 'react-icons/fi';

import { toast } from '@/lib/toast';
import { Portal } from '@/components/ui/portal';

type ShareChannel =
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'telegram'
  | 'whatsapp'
  | 'email'
  | 'threads'
  | 'native_share'
  | 'copy_link'
  | 'x'
  | 'qr_code';

interface ShareRecord {
  share_id: string;
  code: string;
  tracking_url: string;
}

interface ShareButtonProps {
  sourceSurface: string;
  label?: string;
  variant?: 'default' | 'landing' | 'sidebar' | 'icon';
  isCollapsed?: boolean;
  className?: string;
}

interface TileContentProps {
  icon: ReactNode;
  label: string;
  iconClass: string;
}

const SHARE_TITLE = 'Discover MyndDesk';
const SHARE_TEXT = 'Run attendance, projects, tasks, notes, and team operations from one intelligent workspace.';
const TILE_CLASS = 'group flex min-h-20 w-full flex-col items-center justify-center gap-2 rounded-xl border border-card-border bg-foreground/[0.025] px-2 py-3 text-center transition-all duration-200 hover:border-emerald-500/30 hover:bg-emerald-500/[0.06] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 active:scale-[0.98]';

function TileContent({ icon, label, iconClass }: TileContentProps) {
  return (
    <>
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`} aria-hidden="true">
        {icon}
      </span>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </>
  );
}

function trackedUrl(baseUrl: string, channel: ShareChannel, method: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set('ch', channel);
  url.searchParams.set('method', method);
  return url.toString();
}

async function copyToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
}

export function ShareButton({
  sourceSurface,
  label = 'Share MyndDesk',
  variant = 'default',
  isCollapsed = false,
  className = '',
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [share, setShare] = useState<ShareRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isQrVisible, setIsQrVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  const createShare = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_surface: sourceSurface }),
      });
      if (!response.ok) throw new Error('Unable to create a share link');
      setShare((await response.json()) as ShareRecord);
    } catch {
      setError('We could not prepare the share link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [sourceSurface]);

  const open = () => {
    setShare(null);
    setError(null);
    setIsQrVisible(false);
    setIsCopied(false);
    setIsOpen(true);
    void createShare();
  };

  const close = useCallback(() => {
    setIsOpen(false);
    setIsQrVisible(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [close, isOpen]);

  const record = useCallback((eventType: string, channel: ShareChannel, shareMethod: string) => {
    if (!share) return;
    void fetch(`/api/shares/${encodeURIComponent(share.code)}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        channel,
        share_method: shareMethod,
      }),
      keepalive: true,
    });
  }, [share]);

  const urls = useMemo(() => {
    if (!share) return null;
    return {
      facebook: trackedUrl(share.tracking_url, 'facebook', 'direct_platform'),
      instagram: trackedUrl(share.tracking_url, 'instagram', 'copy_assist'),
      linkedin: trackedUrl(share.tracking_url, 'linkedin', 'direct_platform'),
      telegram: trackedUrl(share.tracking_url, 'telegram', 'direct_platform'),
      whatsapp: trackedUrl(share.tracking_url, 'whatsapp', 'direct_platform'),
      email: trackedUrl(share.tracking_url, 'email', 'email'),
      threads: trackedUrl(share.tracking_url, 'threads', 'direct_platform'),
      nativeShare: trackedUrl(share.tracking_url, 'native_share', 'native_share'),
      copyLink: trackedUrl(share.tracking_url, 'copy_link', 'copy'),
      x: trackedUrl(share.tracking_url, 'x', 'direct_platform'),
      qrCode: trackedUrl(share.tracking_url, 'qr_code', 'qr_code'),
    };
  }, [share]);

  const handleCopy = async () => {
    if (!urls) return;
    try {
      await copyToClipboard(urls.copyLink);
      record('link_copied', 'copy_link', 'copy');
      setIsCopied(true);
      toast.success('Share link copied');
      window.setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('Could not copy the share link');
    }
  };

  const handleInstagram = async () => {
    if (!urls) return;
    record('platform_selected', 'instagram', 'copy_assist');
    const copyPromise = copyToClipboard(urls.instagram);
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    try {
      await copyPromise;
      record('link_copied', 'instagram', 'copy_assist');
      toast.info('Link copied. Add it to your Instagram message, bio, or story.');
    } catch {
      toast.error('Instagram opened, but the link could not be copied');
    }
  };

  const handleNativeShare = async () => {
    if (!urls) return;
    if (!navigator.share) {
      await handleCopy();
      toast.info('Your browser does not offer a share menu, so the link was copied instead.');
      return;
    }

    record('platform_selected', 'native_share', 'native_share');
    try {
      await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: urls.nativeShare });
      record('share_completed', 'native_share', 'native_share');
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') {
        record('share_cancelled', 'native_share', 'native_share');
      } else {
        record('share_failed', 'native_share', 'native_share');
        toast.error('The device share menu could not be opened');
      }
    }
  };

  const showQrCode = () => {
    setIsQrVisible(true);
    record('qr_displayed', 'qr_code', 'qr_code');
  };

  const triggerClass = variant === 'landing'
    ? 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white'
    : variant === 'sidebar'
      ? `flex min-h-11 w-full items-center rounded-lg text-sm font-medium text-text-muted transition-colors hover:bg-foreground/[0.05] hover:text-foreground ${isCollapsed ? 'justify-center px-0' : 'justify-start gap-4 px-6'}`
      : variant === 'icon'
        ? 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-card-border bg-foreground/[0.03] text-text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground'
        : 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-card-border bg-foreground/[0.03] px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/[0.06]';

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={label}
        title={isCollapsed ? label : undefined}
        className={`${triggerClass} ${className}`}
      >
        <FiShare2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        {variant !== 'icon' && !isCollapsed && <span>{label}</span>}
      </button>

      <Portal>
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[140] flex items-end justify-center p-0 sm:items-center sm:p-6">
              <motion.button
                type="button"
                aria-label="Close share panel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={close}
                className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
              />
              <motion.section
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-dialog-title"
                initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-card-border bg-background shadow-2xl sm:max-w-xl sm:rounded-2xl"
              >
                <header className="flex items-start justify-between gap-4 border-b border-card-border p-5 sm:p-6">
                  <div>
                    <h2 id="share-dialog-title" className="font-sora text-xl font-semibold text-foreground">Share MyndDesk</h2>
                    <p className="mt-1 text-sm text-text-muted">Invite someone to discover a calmer way to run work.</p>
                  </div>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={close}
                    aria-label="Close share panel"
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </header>

                <div className="p-5 sm:p-6">
                  {isLoading && (
                    <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-text-muted" aria-live="polite">
                      <FiLoader className="h-5 w-5 animate-spin text-emerald-500" />
                      <p className="text-sm">Preparing your tracked share link…</p>
                    </div>
                  )}

                  {error && !isLoading && (
                    <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-center" role="alert">
                      <p className="max-w-sm text-sm text-text-secondary">{error}</p>
                      <button type="button" onClick={() => void createShare()} className="min-h-11 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500/90">
                        Try again
                      </button>
                    </div>
                  )}

                  {share && urls && !isLoading && !error && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                        <FacebookShareButton url={urls.facebook} hashtag="#MyndDesk" onClick={() => record('platform_selected', 'facebook', 'direct_platform')} className={TILE_CLASS} resetButtonStyle={false}>
                          <TileContent icon={<FaFacebookF className="h-4 w-4" />} label="Facebook" iconClass="bg-blue-500/10 text-blue-500" />
                        </FacebookShareButton>

                        <button type="button" onClick={() => void handleInstagram()} className={TILE_CLASS}>
                          <TileContent icon={<FaInstagram className="h-4 w-4" />} label="Instagram" iconClass="bg-rose-500/10 text-rose-500" />
                        </button>

                        <LinkedinShareButton url={urls.linkedin} title={SHARE_TITLE} summary={SHARE_TEXT} source="MyndDesk" onClick={() => record('platform_selected', 'linkedin', 'direct_platform')} className={TILE_CLASS} resetButtonStyle={false}>
                          <TileContent icon={<FaLinkedinIn className="h-4 w-4" />} label="LinkedIn" iconClass="bg-blue-500/10 text-blue-500" />
                        </LinkedinShareButton>

                        <TelegramShareButton url={urls.telegram} title={SHARE_TEXT} onClick={() => record('platform_selected', 'telegram', 'direct_platform')} className={TILE_CLASS} resetButtonStyle={false}>
                          <TileContent icon={<FaTelegram className="h-4 w-4" />} label="Telegram" iconClass="bg-sky-500/10 text-sky-500" />
                        </TelegramShareButton>

                        <WhatsappShareButton url={urls.whatsapp} title={SHARE_TEXT} separator=" " onClick={() => record('platform_selected', 'whatsapp', 'direct_platform')} className={TILE_CLASS} resetButtonStyle={false}>
                          <TileContent icon={<FaWhatsapp className="h-4 w-4" />} label="WhatsApp" iconClass="bg-emerald-500/10 text-emerald-500" />
                        </WhatsappShareButton>

                        <div onClick={() => record('platform_selected', 'email', 'email')}>
                          <EmailShareButton url={urls.email} subject={SHARE_TITLE} body={SHARE_TEXT} className={TILE_CLASS} resetButtonStyle={false}>
                            <TileContent icon={<FiMail className="h-4 w-4" />} label="Email" iconClass="bg-amber-500/10 text-amber-500" />
                          </EmailShareButton>
                        </div>

                        <ThreadsShareButton url={urls.threads} title={SHARE_TEXT} onClick={() => record('platform_selected', 'threads', 'direct_platform')} className={TILE_CLASS} resetButtonStyle={false}>
                          <TileContent icon={<FaThreads className="h-4 w-4" />} label="Threads" iconClass="bg-foreground/[0.08] text-foreground" />
                        </ThreadsShareButton>

                        <TwitterShareButton url={urls.x} title={SHARE_TEXT} hashtags={['MyndDesk']} onClick={() => record('platform_selected', 'x', 'direct_platform')} className={TILE_CLASS} resetButtonStyle={false}>
                          <TileContent icon={<FaXTwitter className="h-4 w-4" />} label="X" iconClass="bg-foreground/[0.08] text-foreground" />
                        </TwitterShareButton>

                        <button type="button" onClick={() => void handleNativeShare()} className={TILE_CLASS}>
                          <TileContent icon={<FiSmartphone className="h-4 w-4" />} label="Your device" iconClass="bg-indigo-500/10 text-indigo-500" />
                        </button>

                        <button type="button" onClick={() => void handleCopy()} className={TILE_CLASS}>
                          <TileContent icon={isCopied ? <FiCheck className="h-4 w-4" /> : <FiCopy className="h-4 w-4" />} label={isCopied ? 'Copied' : 'Copy link'} iconClass="bg-emerald-500/10 text-emerald-500" />
                        </button>

                        <button type="button" onClick={showQrCode} className={`${TILE_CLASS} sm:col-span-2`}>
                          <TileContent icon={<FiGrid className="h-4 w-4" />} label="QR code" iconClass="bg-purple-500/10 text-purple-500" />
                        </button>
                      </div>

                      <AnimatePresence initial={false}>
                        {isQrVisible && (
                          <motion.div
                            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="flex flex-col items-center gap-3 rounded-xl border border-card-border bg-foreground/[0.025] p-5 text-center"
                          >
                            <div className="relative rounded-xl bg-white p-3 shadow-sm">
                              <QRCode value={urls.qrCode} size={156} level="H" aria-label="QR code for sharing MyndDesk" />
                              <span
                                aria-hidden="true"
                                className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-black/5"
                              >
                                <Image src="/logo.svg" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">Scan with a phone camera</p>
                              <p className="mt-1 text-xs text-text-muted">The scan uses the same tracked MyndDesk invitation link.</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <p className="text-center text-xs leading-relaxed text-text-muted">
                        Link visits and registrations are measured to understand how MyndDesk is discovered.
                      </p>
                    </div>
                  )}
                </div>
              </motion.section>
            </div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}
