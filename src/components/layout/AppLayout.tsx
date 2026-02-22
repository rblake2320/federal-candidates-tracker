import { useState, useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ServiceStatusBanner } from './ServiceStatusBanner';

// ── Breakpoints (must match Tailwind's lg = 1024, md = 768) ──

function getDeviceClass(width: number): 'mobile' | 'tablet' | 'desktop' {
  if (width >= 1024) return 'desktop';
  if (width >= 768) return 'tablet';
  return 'mobile';
}

// ── Component ──────────────────────────────────────────────

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile sheet
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Start collapsed on tablet-sized screens
    return getDeviceClass(window.innerWidth) === 'tablet';
  });
  const [device, setDevice] = useState(() => getDeviceClass(window.innerWidth));

  // Track window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const next = getDeviceClass(window.innerWidth);
      setDevice(next);

      // Auto-collapse on tablet, auto-expand on desktop
      if (next === 'tablet') {
        setSidebarCollapsed(true);
      } else if (next === 'desktop') {
        // Respect user preference — don't force-expand
      }

      // Close mobile sheet when resizing away from mobile
      if (next !== 'mobile') {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const toggleCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const isDesktopOrTablet = device !== 'mobile';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-white">
      {/* ── Desktop / Tablet sidebar ───────────────────── */}
      {isDesktopOrTablet && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleCollapse}
          className="hidden md:flex shrink-0"
        />
      )}

      {/* ── Mobile sidebar overlay (sheet) ─────────────── */}
      {sidebarOpen && device === 'mobile' && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={closeMobileSidebar}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 flex md:hidden animate-slide-in-left">
            <Sidebar
              collapsed={false}
              onToggleCollapse={closeMobileSidebar}
            />
            <button
              onClick={closeMobileSidebar}
              className="flex items-center justify-center w-9 h-9 mt-3 ml-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </>
      )}

      {/* ── Main area ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ServiceStatusBanner />
        <TopBar onToggleSidebar={toggleMobileSidebar} />

        <main
          className={cn(
            'flex-1 overflow-y-auto',
            'px-4 py-6 sm:px-6 lg:px-8'
          )}
        >
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
