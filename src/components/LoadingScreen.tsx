import { useState, useEffect } from 'react';
import { Logo } from './Logo';

interface LoadingScreenProps {
  onReady?: () => void;
}

const MESSAGES = [
  'Preparing your experience...',
  'Almost there...',
];

export function LoadingScreen({ onReady }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const duration = 1200;
    let raf: number;

    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(eased * 100);

      if (p >= 0.5 && messageIndex === 0) {
        setMessageIndex(1);
      }

      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setFadeOut(true);
        setTimeout(() => onReady?.(), 400);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onReady, messageIndex]);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center transition-opacity duration-400 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="mb-8 animate-letter" style={{ animationDelay: '0ms' }}>
        <Logo height={56} className="md:h-14" />
      </div>

      <div className="w-48 md:w-56 h-1 bg-neutral-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-500 via-green-500 to-teal-500 transition-[width] duration-100 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-xs text-neutral-400 font-medium tracking-wide transition-opacity duration-300">
        {MESSAGES[messageIndex]}
      </p>
    </div>
  );
}
