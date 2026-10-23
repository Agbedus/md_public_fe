'use client';

import React from 'react';
import { FiArrowUp, FiMic, FiMicOff, FiPaperclip, FiSquare } from 'react-icons/fi';
import TextareaAutosize from 'react-textarea-autosize';
import { useIsClient } from '@/hooks/use-is-client';
import { AttachLinkPopover } from './attach-link-popover';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  onStop?: () => void;
  compact?: boolean;
  inputRef?: React.Ref<HTMLTextAreaElement>;
  value?: string;
  onValueChange?: React.Dispatch<React.SetStateAction<string>>;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
}

interface WindowWithSpeech extends Window {
  SpeechRecognition?: { new(): SpeechRecognition };
  webkitSpeechRecognition?: { new(): SpeechRecognition };
}

export default function ChatInput({ onSendMessage, isLoading, onStop, compact = false, inputRef, value, onValueChange }: ChatInputProps) {
  const [localText, setLocalText] = React.useState('');
  const baseText = value ?? localText;
  const setBaseText = onValueChange ?? setLocalText;
  const [interimText, setInterimText] = React.useState('');
  const [isRecording, setIsRecording] = React.useState(false);
  const isClient = useIsClient();
  const isSpeechSupported = isClient && Boolean(
    (window as unknown as WindowWithSpeech).SpeechRecognition
    || (window as unknown as WindowWithSpeech).webkitSpeechRecognition
  );
  const recognitionRef = React.useRef<SpeechRecognition | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const lastFinalRef = React.useRef<string>('');

  React.useEffect(() => {
    const win = window as unknown as WindowWithSpeech;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    
    const recog = new SpeechRecognition();
    recog.interimResults = true;
    recog.continuous = false;
    recog.lang = 'en-US';

    recog.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final) {
        const finalTrim = final.trim();
        if (finalTrim && lastFinalRef.current !== finalTrim) {
          setBaseText((prev) => (prev ? prev + ' ' : '') + finalTrim);
          lastFinalRef.current = finalTrim;
        }
        setInterimText('');
      } else {
        setInterimText(interim);
      }
    };

    recog.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recog;

    return () => {
      try {
        recog.stop();
      } catch {}
      recognitionRef.current = null;
    };
  }, [setBaseText]);

  const toggleRecording = () => {
    const recog = recognitionRef.current;
    if (!recog) return;

    if (isRecording) {
      try { recog.stop(); } catch {}
      setIsRecording(false);
    } else {
      try {
        lastFinalRef.current = '';
        recog.start();
        setIsRecording(true);
      } catch (e) {
        console.warn('SpeechRecognition start error', e);
        setIsRecording(false);
      }
    }
  };

  const handleSend = () => {
    const combined = (baseText + (interimText ? ' ' + interimText : '')).trim();
    if (combined && !isLoading) {
      onSendMessage(combined);
      setBaseText('');
      setInterimText('');
      lastFinalRef.current = '';
      if (isRecording && recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {};
        setIsRecording(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const displayValue = (baseText + (interimText ? ' ' + interimText : '')).trimStart();

  return (
    <div className="w-full min-w-0">
      <div className={`relative flex w-full min-w-0 flex-col border border-card-border bg-card p-2 shadow-sm transition-colors focus-within:border-foreground/20 ${compact ? "rounded-3xl" : "rounded-[28px]"}`}>
        <TextareaAutosize
          ref={inputRef}
          minRows={compact ? 1 : 2}
          maxRows={compact ? 4 : 8}
          value={displayValue}
          onChange={(e) => { setBaseText(e.target.value); setInterimText(''); }}
          onKeyDown={handleKeyDown}
          placeholder={compact ? "Ask Pip…" : "Ask Pip about your workspace…"}
          className="min-w-0 flex-grow resize-none bg-transparent px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-text-muted focus:outline-none scrollbar-hide"
          aria-label="Message"
        />

        <div className="mt-1 flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-1">
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onSendMessage(`Attached file: ${file.name}`);
                    e.currentTarget.value = '';
                  }
                }}
            />

            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="grid h-10 w-10 place-items-center rounded-full text-text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground active:scale-[0.96]"
                aria-label="Attach file"
                data-tooltip="Attach file"
            >
              <FiPaperclip className="w-5 h-5"/>
            </button>

            <AttachLinkPopover onAttach={(url) => setBaseText((previous) => previous ? `${previous} ${url}` : url)} />
          </div>

          <div className="flex items-center gap-2">
            {isSpeechSupported && (
                <button
                    type="button"
                    onClick={toggleRecording}
                    className={`grid h-10 w-10 place-items-center rounded-full transition-colors ${isRecording ? 'bg-foreground/[0.1] text-foreground animate-pulse' : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.06]'}`}
                    aria-pressed={isRecording}
                    aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
                    data-tooltip={isRecording ? 'Stop' : 'Voice'}
                >
                  {isRecording ? <FiMicOff className="w-5 h-5"/> : <FiMic className="w-5 h-5"/>}
                </button>
            )}

            {!compact && <span className="hidden text-[11px] text-text-muted sm:inline">Shift + Enter for a new line</span>}
            <button
              type="button"
              onClick={isLoading ? onStop : handleSend}
              disabled={!isLoading && !displayValue.trim()}
              aria-label={isLoading ? 'Stop generating' : 'Send message'}
              data-tooltip={isLoading ? 'Stop generating' : 'Send message'}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-on-ink transition-[transform,opacity] duration-150 hover:opacity-85 active:scale-[0.94] disabled:opacity-30 motion-reduce:transition-none"
            >
              {isLoading ? <FiSquare className="h-3.5 w-3.5 fill-current" /> : <FiArrowUp className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
