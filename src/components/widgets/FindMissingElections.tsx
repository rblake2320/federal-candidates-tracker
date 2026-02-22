import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, Search, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getMissingElections } from '@/lib/api';

export function FindMissingElections() {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['missing-elections'],
    queryFn: getMissingElections,
    enabled: expanded,
    staleTime: 5 * 60_000,
  });

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-400" />
          <span className="text-sm font-medium text-white">Missing Elections</span>
        </div>

        <p className="text-xs text-slate-400">
          Find states with incomplete election records for the 2026 cycle.
        </p>

        {!expanded ? (
          <button
            onClick={() => setExpanded(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-orange-600 text-white hover:bg-orange-500 transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            Scan for Gaps
          </button>
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Scanning...
          </div>
        ) : isError ? (
          <p className="text-xs text-red-400">Failed to scan. Please try again.</p>
        ) : data && data.data.length > 0 ? (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            <p className="text-[10px] text-slate-500">
              {data.total} state{data.total !== 1 ? 's' : ''} with gaps
            </p>
            {data.data.map((row) => {
              const gaps: string[] = [];
              if (row.senate_elections === 0) gaps.push('Senate');
              if (Number(row.house_elections) < row.house_seats) {
                gaps.push(`House (${row.house_elections}/${row.house_seats})`);
              }
              return (
                <Link
                  key={row.code}
                  to={`/state/${row.code}`}
                  className="flex items-center justify-between gap-2 px-2 py-1 rounded-md text-xs hover:bg-slate-800 transition-colors"
                >
                  <span className="text-white font-medium">{row.name}</span>
                  <div className="flex gap-1">
                    {gaps.map((g) => (
                      <Badge key={g} variant="special" className="text-[9px]">
                        {g}
                      </Badge>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-xs text-emerald-400">All states have complete records!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
