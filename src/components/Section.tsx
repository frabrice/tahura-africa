import { ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
  dark?: boolean;
  action?: ReactNode;
}

export function Section({ children, title, description, className = '', dark = false, action }: SectionProps) {
  return (
    <section className={`mb-12 ${className}`}>
      {(title || description || action) && (
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            {title && (
              <h2 className={`text-base font-bold tracking-tight mb-1 ${dark ? 'text-white' : 'text-neutral-900'}`}>
                {title}
              </h2>
            )}
            {description && (
              <p className={`text-sm ${dark ? 'text-white/50' : 'text-neutral-500'}`}>
                {description}
              </p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
