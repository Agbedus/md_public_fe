'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import qrcode from 'qrcode-generator';
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
  FiArrowLeft,
  FiCopy,
  FiDownload,
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
const TILE_CLASS = 'group flex min-h-20 w-full flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-center transition-all duration-200 hover:bg-foreground/[0.045] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 active:scale-[0.97]';

function TileContent({ icon, label, iconClass }: TileContentProps) {
  return (
    <>
      <span className={`flex h-10 w-10 items-center justify-center transition-transform duration-200 group-hover:scale-110 ${iconClass}`} aria-hidden="true">
        {icon}
      </span>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </>
  );
}

function CustomQrCode({ value }: { value: string }) {
  const qr = useMemo(() => {
    const code = qrcode(0, 'H');
    code.addData(value, 'Byte');
    code.make();
    return code;
  }, [value]);
  const count = qr.getModuleCount();
  const quietZone = 2;
  const size = count + quietZone * 2;
  const finderCenters = [
    { x: quietZone + 3.5, y: quietZone + 3.5 },
    { x: quietZone + count - 3.5, y: quietZone + 3.5 },
    { x: quietZone + 3.5, y: quietZone + count - 3.5 },
  ];
  const isFinderModule = (row: number, column: number) => (
    (row < 7 && column < 7)
    || (row < 7 && column >= count - 7)
    || (row >= count - 7 && column < 7)
  );

  const dots: ReactNode[] = [];
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (qr.isDark(row, column) && !isFinderModule(row, column)) {
        dots.push(
          <circle
            key={`${row}-${column}`}
            cx={quietZone + column + 0.5}
            cy={quietZone + row + 0.5}
            r="0.42"
            fill="#172033"
          />,
        );
      }
    }
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${size} ${size}`} className="h-full w-full" aria-hidden="true">
      <rect width={size} height={size} fill="#FFFFFF" />
      {dots}
      {finderCenters.map((center) => (
        <g key={`${center.x}-${center.y}`}>
          <circle cx={center.x} cy={center.y} r="3.5" fill="#6366F1" />
          <circle cx={center.x} cy={center.y} r="2.25" fill="#FFFFFF" />
          <circle cx={center.x} cy={center.y} r="1.35" fill="#172033" />
        </g>
      ))}
      <rect x={size / 2 - 4.1} y={size / 2 - 4.1} width="8.2" height="8.2" rx="1.7" fill="#FFFFFF" />
      <image href="/logo.svg" x={size / 2 - 3.25} y={size / 2 - 3.25} width="6.5" height="6.5" preserveAspectRatio="xMidYMid meet" />
    </svg>
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
  const [isPreparingQr, setIsPreparingQr] = useState(false);
  const [isQrCopied, setIsQrCopied] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const qrCodeRef = useRef<HTMLDivElement>(null);
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
    setIsQrCopied(false);
    record('qr_displayed', 'qr_code', 'qr_code');
  };

  const createQrPng = useCallback(async (): Promise<Blob> => {
    const svg = qrCodeRef.current?.querySelector('svg');
    if (!svg) throw new Error('The QR image could not be prepared.');

    const loadImage = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('The QR image could not be prepared.'));
      image.src = source;
    });
    const clone = svg.cloneNode(true) as SVGElement;
    clone.querySelector('image')?.remove();
    const serialized = new XMLSerializer().serializeToString(clone);
    const svgUrl = URL.createObjectURL(new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' }));

    try {
      const [qrImage, logoImage] = await Promise.all([loadImage(svgUrl), loadImage('/logo.svg')]);
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1200;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('This browser cannot prepare the QR image.');
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, 1200, 1200);
      context.drawImage(qrImage, 0, 0, 1200, 1200);
      context.drawImage(logoImage, 510, 510, 180, 180);
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The PNG could not be created.')), 'image/png');
      });
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }, []);

  const downloadQrPng = async () => {
    if (isPreparingQr) return;
    setIsPreparingQr(true);
    try {
      const blob = await createQrPng();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `mynddesk-share-${share?.code || 'qr'}.png`;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast.success('QR code downloaded as a PNG');
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'The QR code could not be downloaded.');
    } finally {
      setIsPreparingQr(false);
    }
  };

  const copyQrPng = async () => {
    if (isPreparingQr) return;
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      toast.info('Image copying is not available in this browser. Download the PNG instead.');
      return;
    }
    setIsPreparingQr(true);
    try {
      const blob = await createQrPng();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setIsQrCopied(true);
      window.setTimeout(() => setIsQrCopied(false), 2000);
      toast.success('QR image copied');
    } catch {
      toast.error('The QR image could not be copied. Download the PNG instead.');
    } finally {
      setIsPreparingQr(false);
    }
  };

  const triggerClass = variant === 'landing'
    ? 'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-0 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white md:px-5'
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
        {variant !== 'icon' && !isCollapsed && (
          <span className={variant === 'landing' ? 'hidden md:inline' : ''}>{label}</span>
        )}
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
                      <AnimatePresence mode="wait" initial={false}>
                      {!isQrVisible ? (
                      <motion.div key="share-options" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-3 gap-1 sm:grid-cols-4">
                        <FacebookShareButton url={urls.facebook} hashtag="#MyndDesk" onClick={() => record('platform_selected', 'facebook', 'direct_platform')} className={TILE_CLASS} resetButtonStyle={false}>
                          <TileContent icon={<FaFacebookF className="h-6 w-6" />} label="Facebook" iconClass="text-blue-500" />
                        </FacebookShareButton>

                        <button type="button" onClick={() => void handleInstagram()} className={TILE_CLASS}>
                          <TileContent icon={<FaInstagram className="h-6 w-6" />} label="Instagram" iconClass="text-rose-500" />
                        </button>

                        <LinkedinShareButton url={urls.linkedin} title={SHARE_TITLE} summary={SHARE_TEXT} source="MyndDesk" onClick={() => record('platform_selected', 'linkedin', 'direct_platform')} className={TILE_CLASS} resetButtonStyle={false}>
                          <TileContent icon={<FaLinkedinIn className="h-6 w-6" />} label="LinkedIn" iconClass="text-blue-500" />
                        </LinkedinShareButton>

                        <TelegramShareButton url={urls.telegram} title={SHARE_TEXT} onClick={() => record('platform_selected', 'telegram', 'direct_platform')} className={TILE_CLASS} resetButtonStyle={false}>
                          <TileContent icon={<FaTelegram className="h-6 w-6" />} label="Telegram" iconClass="text-sky-500" />
                        </TelegramShareButton>

                        <WhatsappShareButton url={urls.whatsapp} title={SHARE_TEXT} separator=" " onClick={() => record('platform_selected', 'whatsapp', 'direct_platform')} className={TILE_CLASS} resetButtonStyle={false}>
                          <TileContent icon={<FaWhatsapp className="h-6 w-6" />} label="WhatsApp" iconClass="text-emerald-500" />
                        </WhatsappShareButton>

                        <div onClick={() => record('platform_selected', 'email', 'email')}>
                          <EmailShareButton url={urls.email} subject={SHARE_TITLE} body={SHARE_TEXT} className={TILE_CLASS} resetButtonStyle={false}>
                            <TileContent icon={<FiMail className="h-6 w-6" />} label="Email" iconClass="text-amber-500" />
                          </EmailShareButton>
                        </div>

                        <ThreadsShareButton url={urls.threads} title={SHARE_TEXT} onClick={() => record('platform_selected', 'threads', 'direct_platform')} className={TILE_CLASS} resetButtonStyle={false}>
                          <TileContent icon={<FaThreads className="h-6 w-6" />} label="Threads" iconClass="text-foreground" />
                        </ThreadsShareButton>

                        <TwitterShareButton url={urls.x} title={SHARE_TEXT} hashtags={['MyndDesk']} onClick={() => record('platform_selected', 'x', 'direct_platform')} className={TILE_CLASS} resetButtonStyle={false}>
                          <TileContent icon={<FaXTwitter className="h-6 w-6" />} label="X" iconClass="text-foreground" />
                        </TwitterShareButton>

                        <button type="button" onClick={() => void handleNativeShare()} className={TILE_CLASS}>
                          <TileContent icon={<FiSmartphone className="h-6 w-6" />} label="Your device" iconClass="text-indigo-500" />
                        </button>

                        <button type="button" onClick={() => void handleCopy()} className={TILE_CLASS}>
                          <TileContent icon={isCopied ? <FiCheck className="h-6 w-6" /> : <FiCopy className="h-6 w-6" />} label={isCopied ? 'Copied' : 'Copy link'} iconClass="text-emerald-500" />
                        </button>

                        <button type="button" onClick={showQrCode} className={`${TILE_CLASS} sm:col-span-2`}>
                          <TileContent icon={<FiGrid className="h-6 w-6" />} label="QR code" iconClass="text-purple-500" />
                        </button>
                      </motion.div>
                      ) : (
                          <motion.div
                            key="qr-code"
                            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="flex min-h-[25rem] flex-col items-center justify-center gap-5 text-center"
                          >
                            <button type="button" onClick={() => setIsQrVisible(false)} className="absolute left-5 top-[6.5rem] inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-text-muted transition-colors hover:bg-foreground/[0.05] hover:text-foreground sm:left-6">
                              <FiArrowLeft className="h-4 w-4" />
                              All options
                            </button>
                            <div
                              ref={qrCodeRef}
                              role="img"
                              aria-label="Custom QR code with rounded dots, circular corner eyes, and the MyndDesk logo"
                              className="flex h-[236px] w-[236px] items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5 [&_canvas]:max-h-full [&_canvas]:max-w-full [&_svg]:max-h-full [&_svg]:max-w-full"
                            >
                              <CustomQrCode value={urls.qrCode} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">Scan with a phone camera</p>
                              <p className="mt-1 text-xs text-text-muted">The scan uses the same tracked MyndDesk invitation link.</p>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <button type="button" onClick={() => void downloadQrPng()} disabled={isPreparingQr} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500/90 disabled:cursor-wait disabled:opacity-60">
                                {isPreparingQr ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiDownload className="h-4 w-4" />}
                                Download PNG
                              </button>
                              <button type="button" onClick={() => void copyQrPng()} disabled={isPreparingQr} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-foreground ring-1 ring-inset ring-card-border transition-colors hover:bg-foreground/[0.05] disabled:cursor-wait disabled:opacity-60">
                                {isQrCopied ? <FiCheck className="h-4 w-4 text-emerald-500" /> : <FiCopy className="h-4 w-4" />}
                                {isQrCopied ? 'Copied' : 'Copy image'}
                              </button>
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
