'use client';

import { useEffect, useRef, useState } from 'react';
import { FiGlobe, FiX } from 'react-icons/fi';
import { Portal } from '@/components/ui/portal';
import { useAdaptiveDropdown } from '@/hooks/use-adaptive-dropdown';

export function AttachLinkPopover({ onAttach }: { onAttach: (url: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { style } = useAdaptiveDropdown({ isOpen, anchorRef, dropdownRef: menuRef, preferredSide: 'top', gap: 8 });
  const close = () => { setIsOpen(false); anchorRef.current?.focus(); };

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    const outside = (event: PointerEvent) => {
      if (!anchorRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('pointerdown', outside); };
  }, [isOpen]);

  return (
    <>
      <button ref={anchorRef} type="button" aria-label="Attach URL" aria-haspopup="dialog" aria-expanded={isOpen}
        data-tooltip="Attach URL" onClick={() => { setError(''); setIsOpen(!isOpen); }}
        className="grid h-10 w-10 place-items-center rounded-full text-text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground active:scale-[0.96]">
        <FiGlobe className="h-5 w-5" />
      </button>
      {isOpen && <Portal>
        <form ref={menuRef} role="dialog" aria-label="Attach a link" style={style} noValidate
          className="md-menu z-[10000] w-80 max-w-[calc(100vw-32px)] shadow-md"
          onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } }}
          onSubmit={(event) => {
            event.preventDefault();
            try {
              const parsed = new URL(url.trim());
              if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Invalid link');
              onAttach(parsed.href);
              setUrl('');
              close();
            } catch { setError('Enter a complete link starting with https:// or http://.'); }
          }}>
          <div className="flex items-center justify-between px-3.5 py-2">
            <label htmlFor="assistant-attach-url" className="text-sm font-medium text-foreground">Attach a link</label>
            <button type="button" onClick={close} aria-label="Close link popover" className="grid h-8 w-8 place-items-center rounded-full text-text-muted hover:bg-foreground/[0.05]"><FiX /></button>
          </div>
          <div className="space-y-3 px-2 pb-2">
            <input ref={inputRef} id="assistant-attach-url" type="url" value={url} onChange={(event) => { setUrl(event.target.value); setError(''); }}
              aria-invalid={!!error} aria-describedby={error ? 'assistant-link-error' : undefined} placeholder="https://example.com"
              className="h-11 w-full border border-card-border bg-input-bg px-3 text-sm text-foreground" />
            {error && <p id="assistant-link-error" role="alert" className="px-1 text-xs text-danger-text">{error}</p>}
            <button type="submit" disabled={!url.trim()} className="md-btn md-btn-primary md-btn-sm w-full">Attach link</button>
          </div>
        </form>
      </Portal>}
    </>
  );
}
