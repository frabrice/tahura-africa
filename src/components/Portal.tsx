import { ReactNode } from 'react';
import { PortalSwitcher } from './PortalSwitcher';
import { Footer } from './Footer';

interface PortalProps {
  children: ReactNode;
  currentPortal: string;
  hideFooter?: boolean;
}

export function Portal({ children, currentPortal, hideFooter }: PortalProps) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col">
      <PortalSwitcher currentPortal={currentPortal} />
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
    </div>
  );
}
