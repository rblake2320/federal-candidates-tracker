import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Loader2, User, Vote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { aiSearch } from '@/lib/api';

export function AiSearchWidget() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = useQuery({
    queryKey: ['ai-search', debouncedQuery],
    queryFn: () => aiSearch(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const hasResults = data && (data.total_candidates > 0 || data.total_elections > 0);
  const showDropdown = debouncedQuery.length >= 2;

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-medium text-white">Smart Search</span>
        </div>

        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search candidates, races..."
            className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 pr-8"
          />
          {isLoading && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 animate-spin" />
          )}
        </div>

        {showDropdown && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {isLoading ? (
              <p className="text-xs text-slate-500 text-center py-2">Searching...</p>
            ) : !hasResults ? (
              <p className="text-xs text-slate-500 text-center py-2">No results found</p>
            ) : (
              <>
                {data.candidates.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Candidates
                    </p>
                    {data.candidates.slice(0, 5).map((c) => (
                      <Link
                        key={c.id}
                        to={`/candidate/${c.id}`}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-slate-800 transition-colors"
                      >
                        <User className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="text-white truncate">{c.full_name}</span>
                        <span className={cn(
                          'text-[10px] capitalize shrink-0',
                          c.party === 'democratic' ? 'text-blue-400' :
                          c.party === 'republican' ? 'text-red-400' : 'text-slate-400'
                        )}>
                          {c.party.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-500 shrink-0">{c.state}</span>
                      </Link>
                    ))}
                  </div>
                )}
                {data.elections.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Elections
                    </p>
                    {data.elections.slice(0, 5).map((e) => (
                      <Link
                        key={e.id}
                        to={`/state/${e.state}`}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-slate-800 transition-colors"
                      >
                        <Vote className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="text-white truncate">
                          {e.state_name} — {e.office} {e.district ? `D-${e.district}` : ''}
                        </span>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {e.election_type}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
