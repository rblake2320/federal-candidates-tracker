/**
 * Page tracking is handled automatically by AnalyticsProvider.
 * This hook exists for manual page view tracking in special cases
 * (e.g., dynamic content that changes without a route change).
 */
export { useAnalytics } from '@/contexts/AnalyticsContext';
