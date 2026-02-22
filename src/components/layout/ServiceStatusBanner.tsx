import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface HealthResponse {
  status: 'healthy' | 'degraded';
  database: string;
}

export function ServiceStatusBanner() {
  const { data, isError } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/health`);
      return res.json();
    },
    refetchInterval: 60_000, // check every minute
    retry: 1,
    staleTime: 30_000,
  });

  // Don't show anything when healthy
  if (data?.status === 'healthy' && !isError) return null;

  const isDegraded = data?.status === 'degraded' || isError;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-1.5 text-xs font-medium shrink-0',
        isDegraded
          ? 'bg-amber-500/10 text-amber-400 border-b border-amber-500/20'
          : 'bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/20'
      )}
    >
      {isDegraded ? (
        <>
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Service degraded — some features may be unavailable</span>
        </>
      ) : (
        <>
          <Activity className="h-3.5 w-3.5" />
          <span>All systems operational</span>
        </>
      )}
    </div>
  );
}
