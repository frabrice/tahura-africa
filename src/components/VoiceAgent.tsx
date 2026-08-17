import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Volume2, X, Loader2 } from 'lucide-react';
import { smartSearch, detectSearchType, generateVoiceResponse } from '../lib/searchEngine';
import { parseVoiceIntent } from '../lib/voiceIntent';

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

  const processVoiceQuery = useCallback(async (query: string) => {
    if (!activeRef.current) return;
    clearTimers();
    isProcessingRef.current = true;
    setAgentState('processing');
    setCaption('Searching...');

    const intent = await parseVoiceIntent(query);
    if (!activeRef.current) return;

    const detectedType = detectSearchType(query);
    const results = smartSearch(query, experiences, homestays, attractions, detectedType, intent);
    const responseType = intent?.type && intent.type !== 'all' ? intent.type : detectedType;
    const responseText = generateVoiceResponse(results, query, responseType, intent);

    if (results.length > 0) {
      onResultsFound(results, responseType === 'all' ? 'all' : responseType, query);
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
        synthRef.current?.cancel();
        setTranscript(interim);
        setCaption('');
        setAgentState('listening');
      }

      if (finalText.trim()) {
        hasSpokenRef.current = true;
        isProcessingRef.current = true;
        clearTimers();
        synthRef.current?.cancel();
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

      if (!ready) {
        setCaption('Voice search unavailable in this browser.');
        closingTimerRef.current = setTimeout(() => doClose(), 2500);
        return;
      }

      // Start listening immediately, in parallel with the greeting, so the
      // user can start talking right away instead of waiting it out — their
      // first word cancels the greeting (see rec.onresult) and takes over.
      startListening();
      speak("Hi! Tell me what you're looking for, and I'll find it for you.");
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
        className={`relative p-2 md:p-2.5 rounded-full bg-orange-50 text-orange-500 transition-all duration-300 hover:bg-orange-100 hover:text-orange-600 ${
          open ? 'bg-orange-100 text-orange-600 scale-105' : ''
        }`}
        title="Voice search"
        aria-label="Voice search"
      >
        <Mic className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={handleClose} />
          <div
            className="pointer-events-auto relative"
            style={{ filter: 'drop-shadow(0 25px 60px rgba(0,0,0,0.25))' }}
          >
            <div className="relative bg-white rounded-3xl overflow-hidden w-72 border border-stone-100 shadow-warm-lg">
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      isListening ? 'bg-orange-500 animate-pulse' :
                      agentState === 'speaking-results' ? 'bg-green-500 animate-pulse' :
                      isSpeaking ? 'bg-amber-500 animate-pulse' :
                      isSearching ? 'bg-stone-400 animate-pulse' :
                      'bg-stone-300'
                    }`} />
                    <span className="text-stone-500 text-xs font-medium tracking-wide uppercase">
                      {agentState === 'speaking-intro' ? 'Tahura Voice' :
                       agentState === 'listening' ? 'Listening' :
                       agentState === 'silence-warning' ? 'Waiting' :
                       agentState === 'processing' ? 'Searching' :
                       agentState === 'speaking-results' ? 'Found it' :
                       'Closing'}
                    </span>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-stone-400 hover:text-stone-600 transition-colors p-1 -mr-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex justify-center mb-4">
                  <div className="relative">
                    {isListening && (
                      <>
                        <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-orange-500" style={{ animationDuration: '1.5s' }} />
                        <span className="absolute -inset-3 rounded-full animate-ping opacity-10 bg-orange-500" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
                      </>
                    )}
                    {agentState === 'speaking-results' && (
                      <span className="absolute inset-0 rounded-full animate-ping opacity-15 bg-green-500" style={{ animationDuration: '1.5s' }} />
                    )}
                    <div className={`relative w-16 h-16 rounded-full p-[3px] transition-all duration-300 bg-gradient-to-br ${
                      isListening
                        ? 'from-orange-500 via-amber-400 to-red-500'
                        : agentState === 'speaking-results'
                        ? 'from-green-500 to-emerald-400'
                        : isSpeaking
                        ? 'from-amber-400 to-orange-400'
                        : 'from-stone-300 to-stone-400'
                    }`}>
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                        {isSearching ? (
                          <Loader2 className="w-6 h-6 text-stone-500 animate-spin" />
                        ) : agentState === 'speaking-results' ? (
                          <Volume2 className="w-6 h-6 text-green-600" />
                        ) : isSpeaking ? (
                          <Volume2 className="w-6 h-6 text-amber-500" />
                        ) : (
                          <Mic className="w-6 h-6 text-orange-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {isListening && (
                  <div className="flex items-end justify-center gap-0.5 h-7 mb-3">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-0.5 bg-orange-400 rounded-full"
                        style={{
                          height: `${Math.sin(i * 0.7 + Date.now() * 0.001) * 10 + 14}px`,
                          animation: `pulse ${0.4 + (i % 5) * 0.1}s ease-in-out infinite alternate`,
                          animationDelay: `${i * 40}ms`,
                          opacity: 0.5 + (i % 3) * 0.15,
                        }}
                      />
                    ))}
                  </div>
                )}

                {transcript && (
                  <div className="mb-3 px-3 py-2 bg-stone-50 rounded-xl border border-stone-100">
                    <p className="text-xs text-stone-400 mb-0.5">You said</p>
                    <p className="text-sm text-stone-900 font-medium italic leading-snug">"{transcript}"</p>
                  </div>
                )}

                {caption && !transcript && (
                  <div className="mb-1">
                    <p className="text-sm text-stone-600 text-center leading-relaxed px-1">{caption}</p>
                  </div>
                )}

                {caption && transcript && agentState === 'speaking-results' && (
                  <div className="mb-1 px-3 py-2 bg-green-50 rounded-xl border border-green-200/70">
                    <p className="text-xs text-green-700/70 mb-0.5">Results</p>
                    <p className="text-sm text-stone-700 leading-snug">{caption}</p>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-stone-100 text-center">
                  <p className="text-xs text-stone-400">
                    {isListening ? 'Speak now — I am listening' :
                     isSpeaking ? 'Playing response...' :
                     isSearching ? 'Finding best matches...' :
                     'Voice search'}
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
