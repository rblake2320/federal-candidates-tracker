import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building, Search, Loader2, Vote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getElections } from '@/lib/api';
import { STATE_NAMES } from '@/utils/dataGuards';

export function LocalElectionSearch() {
  const [state, setState] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['local-elections', state],
    queryFn: () => getElections({ state, limit: 20 }),
    enabled: submitted && state.length === 2,
  });

  function handleSearch() {
    if (state) setSubmitted(true);
  }

  const stateList = Object.entries(STATE_NAMES)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-white">Local Elections</span>
        </div>

        <div className="space-y-2">
          <Select
            value={state}
            onChange={(e) => { setState(e.target.value); setSubmitted(false); }}
            className="w-full text-sm"
          >
            <option value="">Select State</option>
            {stateList.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </Select>

          <button
            onClick={handleSearch}
            disabled={!state || isLoading}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              state
                ? 'bg-amber-600 text-white hover:bg-amber-500'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            Find Elections
          </button>
        </div>

        {submitted && data && (
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            {data.data.length > 0 ? (
              <>
                <p className="text-[10px] text-slate-500">
                  {data.pagination.total} election{data.pagination.total !== 1 ? 's' : ''} in {STATE_NAMES[state] || state}
                </p>
                {data.data.slice(0, 5).map((e) => (
                  <Link
                    key={e.id}
                    to={`/state/${e.state}`}
                    className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300"
                  >
                    <Vote className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {e.office === 'senate' ? 'Senate' : e.office === 'governor' ? 'Governor' : `House D-${e.district}`}
                    </span>
                    <Badge variant={e.election_type === 'special' ? 'special' : 'general'} className="text-[9px]">
                      {e.election_type}
                    </Badge>
                  </Link>
                ))}
                {data.data.length > 5 && (
                  <Link
                    to={`/state/${state}`}
                    className="block text-[10px] text-blue-400 hover:text-blue-300"
                  >
                    View all →
                  </Link>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-500">No elections found in this state.</p>
            )}
          </div>
        )}

        {submitted && isError && (
          <p className="text-xs text-red-400 pt-2">Search failed. Please try again.</p>
        )}
      </CardContent>
    </Card>
  );
}
