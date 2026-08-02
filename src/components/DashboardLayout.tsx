import { ReactNode, useState } from 'react';
import { Menu, X, PanelLeftClose, PanelLeftOpen, LogOut } from 'lucide-react';
import { Footer } from './Footer';

interface NavItemConfig {
  id: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  badge?: number;
}

type ThemeName = 'slate' | 'teal' | 'amber' | 'sky';

interface ThemeColors {
  accentColor: string;
  dot: string;
  portalName: string;
}

const themes: Record<ThemeName, ThemeColors> = {
  slate: { accentColor: '#475569', dot: '#64748b', portalName: 'Operations' },
  teal:  { accentColor: '#0d9488', dot: '#0d9488', portalName: 'Partner'    },
  amber: { accentColor: '#d97706', dot: '#d97706', portalName: 'Institution' },
  sky:   { accentColor: '#0284c7', dot: '#0284c7', portalName: 'Government' },
};

interface DashboardLayoutProps {
  navItems: NavItemConfig[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onLogout: () => void;
  children: ReactNode;
  banner?: ReactNode;
  theme?: ThemeName;
}

export function DashboardLayout({
  navItems,
  activeTab,
  onTabChange,
  onLogout,
  children,
  banner,
  theme = 'slate',
}: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const t = themes[theme];

  const handleTabChange = (id: string) => {
    onTabChange(id);
    setMobileOpen(false);
    window.scrollTo(0, 0);
  };

  const sidebarWidth  = collapsed ? 'w-[68px]' : 'w-52';
  const contentMargin = collapsed ? 'md:ml-[68px]' : 'md:ml-52';

  return (
    <div className="pt-14 flex flex-col min-h-screen bg-neutral-50">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-14 bottom-0 z-40 flex flex-col transition-all duration-300 ease-in-out ${sidebarWidth} ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} bg-white border-r border-neutral-200`}
      >
        {/* Collapse toggle (desktop only) */}
        <div className="hidden md:flex items-center justify-between px-3 py-3 border-b border-neutral-100">
          {!collapsed && (
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] ml-2 text-neutral-400">
              {t.portalName}
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all ${collapsed ? 'mx-auto' : 'ml-auto'}`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav items */}
        <nav className="p-2 flex-1 overflow-y-auto mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 mb-0.5 rounded-lg text-xs font-medium transition-all duration-150 relative ${collapsed ? 'justify-center' : ''} ${
                  isActive
                    ? 'text-neutral-900 bg-neutral-100'
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
                }`}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[55%] rounded-r"
                    style={{ background: t.accentColor }}
                  />
                )}
                <span className="relative flex-shrink-0">
                  <Icon className="w-[18px] h-[18px]" style={isActive ? { color: t.accentColor } : {}} />
                  {item.badge && item.badge > 0 && collapsed && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </span>
                {!collapsed && (
                  <>
                    <span className="truncate flex-1 text-left tracking-wide">{item.label}</span>
                    {item.badge && item.badge > 0 ? (
                      <span className="ml-auto w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    ) : null}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-neutral-100">
          <button
            onClick={onLogout}
            title={collapsed ? 'Logout' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed top-14 left-0 right-0 z-20 flex items-center gap-3 px-4 py-2.5 md:hidden border-b border-neutral-200 bg-white">
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors">
          {mobileOpen ? <X className="w-5 h-5 text-neutral-700" /> : <Menu className="w-5 h-5 text-neutral-700" />}
        </button>
        <span className="text-sm font-semibold text-neutral-800">
          {navItems.find((n) => n.id === activeTab)?.label}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.dot }} />
          <span className="text-xs text-neutral-500 font-medium">{t.portalName}</span>
        </span>
      </div>

      {/* Main content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${contentMargin}`}>
        <main className="flex-1 p-4 md:p-8 pt-16 md:pt-8">
          {banner}
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
