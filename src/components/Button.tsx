import { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'copper' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  ...rest
}: ButtonProps) {
  const base = 'font-semibold transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap leading-none select-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper-500 focus-visible:ring-offset-2';

  const variants = {
    primary:   'bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-950 disabled:bg-neutral-300 disabled:text-neutral-500',
    secondary: 'bg-white border border-neutral-200 text-neutral-800 hover:border-copper-400 hover:text-neutral-900 hover:bg-sand-50 active:bg-sand-100 disabled:bg-neutral-50 disabled:text-neutral-400 shadow-warm-sm',
    ghost:     'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 active:bg-neutral-200 disabled:text-neutral-300',
    copper:    'btn-copper text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-copper',
    dark:      'bg-obsidian text-white hover:bg-obsidian-900 active:bg-obsidian-950 disabled:bg-neutral-700 disabled:text-neutral-500 border border-white/10 hover:border-copper-500/30',
  };

  const sizes = {
    sm: 'px-3.5 py-2 text-xs tracking-wide',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-sm tracking-wide',
  };

  return (
    <button
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
