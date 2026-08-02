import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Volume2, X, Loader2 } from 'lucide-react';
import { smartSearch, detectSearchType, generateVoiceResponse } from '../lib/searchEngine';

interface VoiceAgentProps {
  experiences: any[];
  homestays: any[];
  attractions: any[];
  onResultsFound: (results: any[], type: string, query: string) => void;
}

type AgentState = 'speaking-intro' | 'listening' | 'silence-warning' | 'processing' | 'speaking-results' | 'closing';

export function VoiceAgent({ experiences, homestays, attractions, onResultsFound }: VoiceAgentProps) {
  const [open, setOpen] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>('speaking-intro');
  const [transcript, setTranscript] = useState('');
  const [caption, setCaption] = useState('');

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSpokenRef = useRef(false);
  const isProcessingRef = useRef(false);
  const activeRef = useRef(false);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    const handleVoicesChanged = () => {};
    synthRef.current?.addEventListener('voiceschanged', handleVoicesChanged);
    return () => synthRef.current?.removeEventListener('voiceschanged', handleVoicesChanged);
  }, []);

  const clearTimers = () => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (closingTimerRef.current) { clearTimeout(closingTimerRef.current); closingTimerRef.current = null; }
  };

  const doClose = useCallback(() => {
    activeRef.current = false;
    clearTimers();
    synthRef.current?.cancel();
    try { recognitionRef.current?.stop(); } catch {}
    setOpen(false);
    setTranscript('');
    setCaption('');
    isProcessingRef.current = false;
    hasSpokenRef.current = false;
  }, []);

  const getVoice = () => {
    const voices = synthRef.current?.getVoices() || [];
    return (
      voices.find(v => v.name.includes('Samantha')) ||
      voices.find(v => v.name.includes('Victoria')) ||
      voices.find(v => v.name.toLowerCase().includes('female') && v.lang.startsWith('en')) ||
      voices.find(v => v.lang === 'en-US') ||
      voices.find(v => v.lang.startsWith('en')) ||
      null
    );
  };

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!synthRef.current) { onDone?.(); return; }
    synthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = getVoice();
    if (voice) u.voice = voice;
    u.rate = 0.92;
    u.pitch = 1.05;
    u.volume = 1;
    u.onend = () => onDone?.();
    u.onerror = () => onDone?.();
    synthRef.current.speak(u);
  }, []);

  const startListening = useCallback(() => {
    if (!activeRef.current) return;
    clearTimers();
    hasSpokenRef.current = false;
    isProcessingRef.current = false;
    setAgentState('listening');
    setCaption('');

    try {
      recognitionRef.current?.start();
    } catch {
      // already started
    }

    silenceTimerRef.current = setTimeout(() => {
      if (!activeRef.current || hasSpokenRef.current || isProcessingRef.current) return;
      setAgentState('silence-warning');
      setCaption("I'm still listening. Tell me what you're looking for.");
      speak("I'm still listening. Tell me what you're looking for.", () => {
        if (!activeRef.current) return;
        closingTimerRef.current = setTimeout(() => {
          if (!activeRef.current || hasSpokenRef.current || isProcessingRef.current) return;
          setAgentState('closing');
          setCaption('Goodbye!');
          speak('Goodbye!', () => doClose());
        }, 4000);
      });
    }, 5000);
  }, [speak, doClose]);

  const processVoiceQuery = useCallback((query: string) => {
    if (!activeRef.current) return;
    clearTimers();
    isProcessingRef.current = true;
    setAgentState('processing');
    setCaption('Searching...');

    const detectedType = detectSearchType(query);
    const results = smartSearch(query, experiences, homestays, attractions, detectedType);
    const responseText = generateVoiceResponse(results, query, detectedType);

    if (results.length > 0) {
      onResultsFound(results, detectedType === 'all' ? 'all' : detectedType, query);
    }

    setAgentState('speaking-results');
    setCaption(responseText);

    speak(responseText, () => {
      if (!activeRef.current) return;
      closingTimerRef.current = setTimeout(() => doClose(), 1200);
    });
  }, [experiences, homestays, attractions, onResultsFound, speak, doClose]);

  const initRecognition = useCallback(() => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return false;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      if (!activeRef.current || isProcessingRef.current) return;

      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += t;
        } else {
          interim += t;
        }
      }

      if (interim) {
        hasSpokenRef.current = true;
        clearTimers();
        setTranscript(interim);
        setCaption('');
        setAgentState('listening');
      }

      if (finalText.trim()) {
        hasSpokenRef.current = true;
        isProcessingRef.current = true;
        clearTimers();
        const full = finalText.trim();
        setTranscript(full);
        try { rec.stop(); } catch {}
        setTimeout(() => processVoiceQuery(full), 200);
      }
    };

    rec.onerror = (event: any) => {
      if (!activeRef.current) return;
      if (event.error === 'no-speech') {
        if (!hasSpokenRef.current && !isProcessingRef.current) {
          try { rec.start(); } catch {}
        }
        return;
      }
      if (event.error === 'aborted') return;
      console.error('Speech recognition error:', event.error);
      isProcessingRef.current = false;
    };

    rec.onstart = () => {
      if (activeRef.current && !hasSpokenRef.current) {
        setAgentState('listening');
      }
    };

    rec.onend = () => {
      if (!activeRef.current || isProcessingRef.current) return;
      if (hasSpokenRef.current) return;
      try { rec.start(); } catch {}
    };

    recognitionRef.current = rec;
    return true;
  }, [processVoiceQuery]);

  const handleOpen = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice search is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    activeRef.current = true;
    hasSpokenRef.current = false;
    isProcessingRef.current = false;
    setTranscript('');
    setAgentState('speaking-intro');
    setCaption('Hi! Tell me what you’re looking for — try “gorilla trekking” or “a lakeside homestay”.');
    setOpen(true);

    setTimeout(() => {
      const ready = initRecognition();

      speak(
        "Hi! Tell me what you're looking for, and I'll find it for you.",
        () => {
          if (!activeRef.current) return;
          if (ready) {
            setTimeout(() => startListening(), 300);
          } else {
            setCaption('Voice search unavailable in this browser.');
            closingTimerRef.current = setTimeout(() => doClose(), 2500);
          }
        }
      );
    }, 100);
  };

  const handleClose = () => {
    synthRef.current?.cancel();
    doClose();
  };

  useEffect(() => {
    return () => {
      activeRef.current = false;
      clearTimers();
      synthRef.current?.cancel();
      try { recognitionRef.current?.stop(); } catch {}
    };
  }, []);

  const isListening = agentState === 'listening' || agentState === 'silence-warning';
  const isSpeaking = agentState === 'speaking-intro' || agentState === 'speaking-results' || agentState === 'closing';
  const isSearching = agentState === 'processing';

  // The browser speech engine only exists on Chrome / Android Chrome. On Safari
  // (incl. all iPhones) and Firefox it's absent, so rather than show a mic button
  // that does nothing, we hide the voice feature entirely on those browsers.
  const speechSupported = typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  if (!speechSupported) return null;

  return (
    <>
      <button
        onClick={handleOpen}
        className={`relative p-2 md:p-2.5 rounded-full transition-all duration-300 ${
          open
            ? 'bg-gradient-to-br from-red-500 via-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/50 scale-105'
            : 'bg-gradient-to-br from-neutral-100 to-neutral-200 text-neutral-700 hover:from-red-500 hover:via-amber-500 hover:to-orange-500 hover:text-white hover:shadow-lg hover:shadow-amber-500/30'
        }`}
        title="Voice search"
        aria-label="Voice search"
      >
        <Mic className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={handleClose} />
          <div
            className="pointer-events-auto relative"
            style={{ filter: 'drop-shadow(0 25px 60px rgba(0,0,0,0.35))' }}
          >
            <div className="relative bg-neutral-950 rounded-3xl overflow-hidden w-72">

              <div className="absolute inset-0 opacity-20"
                style={{
                  background: isListening
                    ? 'radial-gradient(circle at 50% 40%, #ef4444 0%, transparent 70%)'
                    : isSpeaking
                    ? 'radial-gradient(circle at 50% 40%, #f59e0b 0%, transparent 70%)'
                    : 'radial-gradient(circle at 50% 40%, #6b7280 0%, transparent 70%)'
                }}
              />

              <div className="relative px-5 py-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      isListening ? 'bg-red-400 animate-pulse' :
                      isSpeaking ? 'bg-amber-400 animate-pulse' :
                      isSearching ? 'bg-neutral-400 animate-pulse' :
                      'bg-green-400'
                    }`} />
                    <span className="text-white/70 text-xs font-medium tracking-wide uppercase">
                      {agentState === 'speaking-intro' ? 'AI Assistant' :
                       agentState === 'listening' ? 'Listening' :
                       agentState === 'silence-warning' ? 'Waiting' :
                       agentState === 'processing' ? 'Searching' :
                       agentState === 'speaking-results' ? 'Responding' :
                       'Closing'}
                    </span>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-white/40 hover:text-white/80 transition-colors p-1 -mr-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex justify-center mb-4">
                  <div className="relative">
                    {(isListening || isSpeaking) && (
                      <>
                        <span className={`absolute inset-0 rounded-full animate-ping opacity-15 ${
                          isListening ? 'bg-red-500' : 'bg-amber-500'
                        }`} style={{ animationDuration: '1.5s' }} />
                        <span className={`absolute -inset-3 rounded-full animate-ping opacity-10 ${
                          isListening ? 'bg-red-500' : 'bg-amber-500'
                        }`} style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
                      </>
                    )}
                    <div className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isListening
                        ? 'bg-red-500 shadow-lg shadow-red-500/50'
                        : isSpeaking
                        ? 'bg-amber-500 shadow-lg shadow-amber-500/50'
                        : isSearching
                        ? 'bg-neutral-700'
                        : 'bg-neutral-700'
                    }`}>
                      {isSearching ? (
                        <Loader2 className="w-7 h-7 text-white animate-spin" />
                      ) : isSpeaking ? (
                        <Volume2 className="w-7 h-7 text-white" />
                      ) : (
                        <Mic className="w-7 h-7 text-white" />
                      )}
                    </div>
                  </div>
                </div>

                {isListening && (
                  <div className="flex items-end justify-center gap-0.5 h-7 mb-3">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-0.5 bg-red-400 rounded-full"
                        style={{
                          height: `${Math.sin(i * 0.7 + Date.now() * 0.001) * 10 + 14}px`,
                          animation: `pulse ${0.4 + (i % 5) * 0.1}s ease-in-out infinite alternate`,
                          animationDelay: `${i * 40}ms`,
                          opacity: 0.6 + (i % 3) * 0.15,
                        }}
                      />
                    ))}
                  </div>
                )}

                {transcript && (
                  <div className="mb-3 px-3 py-2 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-xs text-white/50 mb-0.5">You said</p>
                    <p className="text-sm text-white font-medium italic leading-snug">"{transcript}"</p>
                  </div>
                )}

                {caption && !transcript && (
                  <div className="mb-1">
                    <p className="text-sm text-white/80 text-center leading-relaxed px-1">{caption}</p>
                  </div>
                )}

                {caption && transcript && agentState === 'speaking-results' && (
                  <div className="mb-1 px-3 py-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    <p className="text-xs text-amber-400/70 mb-0.5">Results</p>
                    <p className="text-sm text-white/80 leading-snug">{caption}</p>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-white/5 text-center">
                  <p className="text-xs text-white/25">
                    {isListening ? 'Speak now — I am listening' :
                     isSpeaking ? 'Playing response...' :
                     isSearching ? 'Finding best matches...' :
                     'Voice AI'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </>
  );
}
