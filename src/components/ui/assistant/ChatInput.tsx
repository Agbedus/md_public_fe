'use client';

import React from 'react';
import { FiSend, FiMic, FiMicOff, FiPaperclip, FiGlobe, FiSquare } from 'react-icons/fi';
import TextareaAutosize from 'react-textarea-autosize';
import { useIsClient } from '@/hooks/use-is-client';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  onStop?: () => void;
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

export default function ChatInput({ onSendMessage, isLoading, onStop }: ChatInputProps) {
  const [baseText, setBaseText] = React.useState('');
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
  }, []);

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
    if (combined) {
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const displayValue = (baseText + (interimText ? ' ' + interimText : '')).trimStart();

  return (
    <div className="p-4 pt-2">
      <div className="bg-white dark:bg-card p-2 relative flex flex-col w-full max-w-full rounded-[2rem] border border-card-border shadow-sm">
        <TextareaAutosize
          minRows={1}
          maxRows={8}
          value={displayValue}
          onChange={(e) => { setBaseText(e.target.value); setInterimText(''); }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message or use voice..."
          className="flex-grow !bg-white dark:!bg-transparent text-foreground placeholder:text-text-muted px-4 py-3 resize-none focus:outline-none focus:!bg-white dark:focus:!bg-transparent focus:!shadow-none scrollbar-hide"
          aria-label="Message"
        />

        <div className="flex items-center justify-between pl-2 pr-2 pb-1 mt-1">
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
                className="p-2 rounded-full text-text-muted hover:text-foreground hover:bg-foreground/[0.06] transition-all duration-200"
                aria-label="Attach file"
                title="Attach file"
            >
              <FiPaperclip className="w-5 h-5"/>
            </button>

            <button
                type="button"
                onClick={() => {
                  const url = prompt('Enter URL to attach');
                  if (url) onSendMessage(url);
                }}
                className="p-2 rounded-full text-text-muted hover:text-foreground hover:bg-foreground/[0.06] transition-all duration-200"
                aria-label="Attach URL"
                title="Attach URL"
            >
              <FiGlobe className="w-5 h-5"/>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isSpeechSupported && (
                <button
                    type="button"
                    onClick={toggleRecording}
                    className={`p-2 rounded-full transition-all duration-200 ${isRecording ? 'bg-foreground/[0.1] text-foreground animate-pulse' : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.06]'}`}
                    aria-pressed={isRecording}
                    aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
                    title={isRecording ? 'Stop' : 'Voice'}
                >
                  {isRecording ? <FiMicOff className="w-5 h-5"/> : <FiMic className="w-5 h-5"/>}
                </button>
            )}

            {isLoading ? (
                <button
                    type="button"
                    onClick={onStop}
                    className="group flex items-center justify-center p-1.5 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border text-text-muted hover:text-foreground transition-all duration-200 shrink-0"
                    aria-label="Stop generating"
                    title="Stop"
                >
                    <span className="p-1 rounded-lg bg-foreground/[0.03] group-hover:bg-foreground/[0.06] transition-colors">
                        <FiSquare className="w-4 h-4 text-rose-500 fill-current" />
                    </span>
                </button>
            ) : (
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={!displayValue.trim()}
                    className="group flex items-center justify-center p-1.5 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border text-text-muted hover:text-foreground transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none shrink-0"
                    aria-label="Send message"
                    title="Send"
                >
                    <span className="p-1 rounded-lg bg-foreground/[0.03] group-hover:bg-foreground/[0.06] transition-colors">
                        <FiSend className="w-4 h-4"/>
                    </span>
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
