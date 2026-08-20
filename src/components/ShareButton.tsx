import { useState, useRef, useEffect } from 'react';
import { Share2, Copy, MessageCircle, Facebook, Mail, X as XIcon } from 'lucide-react';
import { useToast } from './Toast';

interface ShareButtonProps {
  title: string;
  path: string;
  variant?: 'overlay' | 'chip' | 'plain';
  className?: string;
}

export function ShareButton({ title, path, variant = 'overlay', className = '' }: ShareButtonProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const url = `${window.location.origin}${path}`;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err: any) {
        // AbortError means the user closed the native share sheet — a real
        // no-op. Anything else (no share targets registered, permission
        // denied, etc. — common on Windows with no apps wired up to Share)
        // previously failed completely silently, making the button look
        // broken. Fall back to the dropdown, which always works.
        if (err?.name === 'AbortError') return;
      }
    }
    setOpen(v => !v);
  };

  const copyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied!', 'success');
    } catch {
      showToast('Could not copy link', 'error');
    }
    setOpen(false);
  };

  const openShareLink = (e: React.MouseEvent, href: string) => {
    e.stopPropagation();
    window.open(href, '_blank', 'noopener,noreferrer,width=600,height=500');
    setOpen(false);
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const btnClass = variant === 'overlay'
    ? 'w-9 h-9 grid place-items-center rounded-full bg-black/35 backdrop-blur-sm text-white hover:bg-black/50 transition-colors'
    : variant === 'plain'
    ? `p-3 grid place-items-center rounded-full border-2 border-neutral-200 text-neutral-400 hover:border-neutral-400 hover:text-neutral-600 transition-all ${className}`
    : `w-8 h-8 grid place-items-center rounded-full bg-white/90 backdrop-blur-sm text-neutral-700 hover:bg-white shadow-sm transition-colors ${className}`;

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={handleClick} className={btnClass} aria-label="Share">
        <Share2 className={variant === 'plain' ? 'w-5 h-5' : 'w-4 h-4'} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-neutral-200 py-1.5 z-50">
          <button
            onClick={e => openShareLink(e, `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" /> WhatsApp
          </button>
          <button
            onClick={e => openShareLink(e, `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <XIcon className="w-4 h-4 text-neutral-900" /> X / Twitter
          </button>
          <button
            onClick={e => openShareLink(e, `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <Facebook className="w-4 h-4 text-blue-600" /> Facebook
          </button>
          <button
            onClick={e => openShareLink(e, `mailto:?subject=${encodedTitle}&body=${encodedUrl}`)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <Mail className="w-4 h-4 text-neutral-500" /> Email
          </button>
          <div className="my-1 border-t border-neutral-100" />
          <button
            onClick={copyLink}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <Copy className="w-4 h-4 text-neutral-500" /> Copy link
          </button>
        </div>
      )}
    </div>
  );
}
