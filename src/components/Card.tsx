import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  dark?: boolean;
}

export function Card({ children, className = '', hover = false, onClick, dark = false }: CardProps) {
  const hasCustomBg = className.includes('bg-');

  const baseLight = hasCustomBg ? '' : 'bg-white';
  const baseDark  = hasCustomBg ? '' : 'bg-obsidian-900/80';

  const hoverLight = hover ? 'card-hover-glow cursor-pointer' : '';
  const hoverDark  = hover ? 'dark-card-hover cursor-pointer' : '';

  const borderLight = 'border border-neutral-200/80';
  const borderDark  = 'border border-white/[0.07]';

  if (dark) {
    return (
      <div
        onClick={onClick}
        className={`${baseDark} ${borderDark} rounded-2xl transition-all ${hoverDark} ${onClick && !hover ? 'cursor-pointer' : ''} ${className}`}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`${baseLight} ${borderLight} rounded-2xl transition-all ${hoverLight} ${onClick && !hover ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
