import { useEffect } from 'react';
import { LogIn, X } from 'lucide-react';

interface AuthPromptToastProps {
  message?: string;
  onClose: () => void;
  visible: boolean;
}

export function AuthPromptToast({ message, onClose, visible }: AuthPromptToastProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] flex items-start gap-3 bg-stone-900 text-white px-4 py-3.5 rounded-2xl shadow-2xl max-w-sm w-[calc(100vw-2rem)] animate-slide-down border border-stone-700/50">
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center mt-0.5">
        <LogIn className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight">Login required</p>
        <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
          {message || 'You need to be logged in to continue. Redirecting to login…'}
        </p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-stone-500 hover:text-white hover:bg-stone-700 transition-all mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
