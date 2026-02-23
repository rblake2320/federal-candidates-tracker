import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { API_BASE } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────

interface AnalyticsEvent {
  session_id: string;
  event_type: string;
  event_name: string;
  properties?: Record<string, unknown>;
  page_url?: string;
  referrer?: string;
  timestamp: string;
  duration_ms?: number;
}

interface AnalyticsContextValue {
  trackEvent: (type: string, name: string, properties?: Record<string, unknown>) => void;
  trackPageView: (path: string) => void;
  trackClick: (element: string, properties?: Record<string, unknown>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

// ── Constants ────────────────────────────────────────────────

const SESSION_KEY = 'bw_session_id';
const FLUSH_INTERVAL_MS = 10_000;
const MAX_BATCH_SIZE = 50;
const MAX_QUEUE_SIZE = 150; // Drop oldest events if queue overflows

function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
  } catch { /* sessionStorage unavailable */ }

  const id = crypto.randomUUID();
  try { sessionStorage.setItem(SESSION_KEY, id); } catch { /* ignore */ }
  return id;
}

// ── Provider ─────────────────────────────────────────────────

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const sessionIdRef = useRef(getSessionId());
  const queueRef = useRef<AnalyticsEvent[]>([]);
  const pageViewStart = useRef(Date.now());
  const currentPath = useRef(location.pathname);
  const viewportRef = useRef({ w: window.innerWidth, h: window.innerHeight });

  // Stable flush function via ref (avoids dependency issues in useEffect)
  const flushRef = useRef<() => void>(() => {});

  const doFlush = useCallback(async () => {
    if (queueRef.current.length === 0) return;

    // Prevent unbounded queue growth
    if (queueRef.current.length > MAX_QUEUE_SIZE) {
      queueRef.current = queueRef.current.slice(-MAX_BATCH_SIZE);
    }

    const batch = queueRef.current.splice(0, MAX_BATCH_SIZE);

    try {
      let token: string | null = null;
      try { token = localStorage.getItem('et_auth_token'); } catch { /* ignore */ }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`${API_BASE}/analytics/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ events: batch }),
      });
    } catch {
      // Fail silently — analytics should never break the app
    }
  }, []);

  flushRef.current = doFlush;

  // Periodic flush + cleanup
  useEffect(() => {
    const id = setInterval(() => flushRef.current(), FLUSH_INTERVAL_MS);

    // Use sendBeacon on page unload for reliable final flush
    const handleUnload = () => {
      if (queueRef.current.length === 0) return;
      const blob = new Blob(
        [JSON.stringify({ events: queueRef.current.splice(0, MAX_BATCH_SIZE) })],
        { type: 'application/json' }
      );
      navigator.sendBeacon(`${API_BASE}/analytics/events`, blob);
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(id);
      window.removeEventListener('beforeunload', handleUnload);
      doFlush();
    };
  }, [doFlush]);

  // Track page views on route changes — NO flush in deps to prevent duplicates
  useEffect(() => {
    const now = Date.now();

    // Log duration for previous page
    if (currentPath.current !== location.pathname) {
      const duration = now - pageViewStart.current;
      if (duration > 500) {
        queueRef.current.push({
          session_id: sessionIdRef.current,
          event_type: 'page_view',
          event_name: 'page_exit',
          page_url: currentPath.current,
          timestamp: new Date().toISOString(),
          duration_ms: duration,
        });
      }
    }

    // Log new page view
    pageViewStart.current = now;
    currentPath.current = location.pathname;

    queueRef.current.push({
      session_id: sessionIdRef.current,
      event_type: 'page_view',
      event_name: 'page_load',
      page_url: location.pathname,
      referrer: document.referrer || undefined,
      timestamp: new Date().toISOString(),
      properties: {
        viewport_width: viewportRef.current.w,
        viewport_height: viewportRef.current.h,
      },
    });

    if (queueRef.current.length >= MAX_BATCH_SIZE) flushRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Generic event tracking
  const trackEvent = useCallback((type: string, name: string, properties?: Record<string, unknown>) => {
    queueRef.current.push({
      session_id: sessionIdRef.current,
      event_type: type,
      event_name: name,
      properties,
      page_url: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
    if (queueRef.current.length >= MAX_BATCH_SIZE) flushRef.current();
  }, []);

  const trackPageView = useCallback((path: string) => {
    queueRef.current.push({
      session_id: sessionIdRef.current,
      event_type: 'page_view',
      event_name: 'page_load',
      page_url: path,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const trackClick = useCallback((element: string, properties?: Record<string, unknown>) => {
    trackEvent('click', element, properties);
  }, [trackEvent]);

  return (
    <AnalyticsContext.Provider value={{ trackEvent, trackPageView, trackClick }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) throw new Error('useAnalytics must be used within AnalyticsProvider');
  return ctx;
}
