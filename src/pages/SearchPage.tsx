import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, LayoutGrid, List, Users, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { searchCandidates } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Candidate, PaginatedResponse } from '@/types/models';

// ── Constants ──────────────────────────────────────────────

const PARTY_LABELS: Record<string, string> = {
  democratic: 'Democrat',
  republican: 'Republican',
  libertarian: 'Libertarian',
  green: 'Green',
  independent: 'Independent',
  constitution: 'Constitution',
  no_party: 'No Party',
  other: 'Other',
};

const PARTY_BADGE_VARIANT: Record<
  string,
  'democratic' | 'republican' | 'libertarian' | 'green' | 'independent' | 'other' | 'secondary'
> = {
  democratic: 'democratic',
  republican: 'republican',
  libertarian: 'libertarian',
  green: 'green',
  independent: 'independent',
  constitution: 'other',
  no_party: 'secondary',
  other: 'other',
};

const PARTY_INITIALS_BG: Record<string, string> = {
  democratic: 'bg-blue-600/30 text-blue-400',
  republican: 'bg-red-600/30 text-red-400',
  libertarian: 'bg-yellow-600/30 text-yellow-400',
  green: 'bg-emerald-600/30 text-emerald-400',
  independent: 'bg-purple-600/30 text-purple-400',
  constitution: 'bg-gray-600/30 text-gray-400',
  no_party: 'bg-slate-600/30 text-slate-400',
  other: 'bg-gray-600/30 text-gray-400',
};

function getInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return '--';
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

// ── SearchPage ─────────────────────────────────────────────

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState(searchParams.get('q') || '');

  const q = searchParams.get('q') || '';

  // Sync input when URL query changes externally (e.g. from navbar search)
  useEffect(() => {
    const urlQ = searchParams.get('q') || '';
    if (urlQ !== inputValue) {
      setInputValue(urlQ);
    }
    // Only react to searchParams changes, not inputValue
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const party = searchParams.get('party') || '';
  const office = searchParams.get('office') || '';
  const state = searchParams.get('state') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const view = (searchParams.get('view') as 'grid' | 'list') || 'list';

  const { data, isLoading, isError } = useQuery<PaginatedResponse<Candidate>>({
    queryKey: ['search', q, party, office, state, page],
    queryFn: () => searchCandidates({ search: q, party, office, state, page, limit: 25 }),
    enabled: q.length > 0 || party.length > 0 || office.length > 0 || state.length > 0,
  });

  // ── URL param helpers ──────────────────────────────────

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = {};
    if (inputValue.trim()) params.q = inputValue.trim();
    if (party) params.party = party;
    if (office) params.office = office;
    if (state) params.state = state;
    if (view !== 'list') params.view = view;
    params.page = '1';
    setSearchParams(params);
  };

  const setFilter = (key: string, value: string) => {
    const params = Object.fromEntries(searchParams.entries());
    if (value) {
      params[key] = value;
    } else {
      delete params[key];
    }
    params.page = '1';
    setSearchParams(params);
  };

  const setView = (v: 'grid' | 'list') => {
    const params = Object.fromEntries(searchParams.entries());
    if (v === 'list') {
      delete params.view; // list is default
    } else {
      params.view = v;
    }
    setSearchParams(params);
  };

  const setPage = (p: number) => {
    const params = Object.fromEntries(searchParams.entries());
    params.page = String(p);
    setSearchParams(params);
  };

  const clearAll = () => {
    setInputValue('');
    setSearchParams({});
  };

  const hasFilters = q || party || office || state;

  // Build active filter tags for display
  const activeFilters: { key: string; label: string; value: string }[] = [];
  if (q) activeFilters.push({ key: 'q', label: 'Search', value: q });
  if (party)
    activeFilters.push({ key: 'party', label: 'Party', value: PARTY_LABELS[party] || party });
  if (office)
    activeFilters.push({
      key: 'office',
      label: 'Office',
      value: office === 'senate' ? 'Senate' : office === 'house' ? 'House' : office === 'governor' ? 'Governor' : office,
    });
  if (state) activeFilters.push({ key: 'state', label: 'State', value: state });

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Search Candidates</h2>
          <p className="text-sm text-slate-400 mt-1">
            Find candidates by name, party, office, or state
          </p>
        </div>
        {data && (
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400">
            <Users className="w-4 h-4" />
            <span className="tabular-nums">{data.pagination.total.toLocaleString()}</span>
            <span>result{data.pagination.total !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* ── Search Bar ──────────────────────────────────── */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search by name..."
            className="pl-10 h-11"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => {
                setInputValue('');
                if (q) setFilter('q', '');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button type="submit" className="h-11 px-5 gap-2">
          <Search className="w-4 h-4" />
          Search
        </Button>
      </form>

      {/* ── Filters Row ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={office}
          onChange={(e) => setFilter('office', e.target.value)}
          className="w-40"
        >
          <option value="">All Offices</option>
          <option value="senate">Senate</option>
          <option value="house">House</option>
          <option value="governor">Governor</option>
        </Select>

        <Select
          value={party}
          onChange={(e) => setFilter('party', e.target.value)}
          className="w-44"
        >
          <option value="">All Parties</option>
          <option value="democratic">Democratic</option>
          <option value="republican">Republican</option>
          <option value="libertarian">Libertarian</option>
          <option value="green">Green</option>
          <option value="independent">Independent</option>
        </Select>

        {/* Spacer to push view toggle right */}
        <div className="flex-1" />

        {/* Grid / List toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/50 p-0.5">
          <Button
            variant={view === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setView('list')}
            aria-label="List view"
            className="h-7 w-7 p-0"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={view === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setView('grid')}
            aria-label="Grid view"
            className="h-7 w-7 p-0"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Active Filter Tags ──────────────────────────── */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((f) => (
            <Badge
              key={f.key}
              variant="secondary"
              className="gap-1.5 pr-1.5 cursor-pointer hover:bg-slate-600/50"
              onClick={() => {
                if (f.key === 'q') {
                  setInputValue('');
                }
                setFilter(f.key, '');
              }}
            >
              <span className="text-slate-400">{f.label}:</span> {f.value}
              <X className="w-3 h-3 text-slate-400 hover:text-white" />
            </Badge>
          ))}
          <button
            onClick={clearAll}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Results Area ────────────────────────────────── */}
      {!hasFilters ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mb-4">
            <Search className="w-7 h-7 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Find a candidate</h3>
          <p className="text-sm text-slate-400 max-w-md">
            Enter a search term or select filters above to find candidates.
          </p>
        </div>
      ) : isLoading ? (
        view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )
      ) : isError ? (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          Search failed. Please try again.
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No candidates found</h3>
          <p className="text-sm text-slate-400 max-w-md mb-4">
            No candidates match your current search and filters. Try broadening your search or
            removing some filters.
          </p>
          <Button variant="outline" size="sm" onClick={clearAll}>
            Clear all filters
          </Button>
        </div>
      ) : (
        <ResultsView data={data} view={view} page={page} setPage={setPage} />
      )}
    </div>
  );
}

// ── Results sub-component (extracted for clean TS narrowing) ──

function ResultsView({
  data,
  view,
  page,
  setPage,
}: {
  data: PaginatedResponse<Candidate>;
  view: 'grid' | 'list';
  page: number;
  setPage: (p: number) => void;
}) {
  return (
    <>
      {/* ── Result count (mobile) ────────────────────── */}
      <div className="flex items-center justify-between sm:hidden">
        <p className="text-sm text-slate-400">
          <span className="text-slate-200 tabular-nums">
            {data.pagination.total.toLocaleString()}
          </span>{' '}
          result{data.pagination.total !== 1 ? 's' : ''}
        </p>
      </div>

      {view === 'grid' ? (
        /* ── Grid view ─────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.data.map((c) => (
            <Link key={c.id} to={`/candidate/${c.id}`} className="group">
              <Card className="h-full hover:border-slate-600 hover:bg-slate-800/50 transition-all">
                <CardContent className="p-4">
                  {/* Top row: initials + name */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0',
                        PARTY_INITIALS_BG[c.party] || 'bg-slate-600/30 text-slate-400'
                      )}
                    >
                      {getInitials(c.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                        {c.full_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant={PARTY_BADGE_VARIANT[c.party] || 'other'}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {PARTY_LABELS[c.party] || c.party}
                        </Badge>
                        <span className="text-[11px] text-slate-500 capitalize">{c.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Details row */}
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
                    <span>{c.state}</span>
                    <span className="text-slate-600">&middot;</span>
                    <span className="capitalize">{c.office}</span>
                    {c.office === 'house' && c.district != null && (
                      <>
                        <span className="text-slate-600">&middot;</span>
                        <span>District {c.district}</span>
                      </>
                    )}
                    {c.office === 'senate' && c.senate_class != null && (
                      <>
                        <span className="text-slate-600">&middot;</span>
                        <span>Class {c.senate_class}</span>
                      </>
                    )}
                    {c.total_raised != null && c.total_raised > 0 && (
                      <>
                        <span className="text-slate-600">&middot;</span>
                        <span className="text-emerald-400">
                          {formatCurrency(c.total_raised)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Incumbent badge */}
                  {c.incumbent && (
                    <Badge variant="secondary" className="text-[10px] mt-2">
                      Incumbent
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        /* ── List view ─────────────────────────────────── */
        <div className="rounded-lg border border-slate-800 overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 text-xs font-medium text-slate-500 uppercase tracking-wider">
            <span>Candidate</span>
            <span className="w-28 text-center">Location</span>
            <span className="w-24 text-center">Office</span>
            <span className="w-24 text-right">Raised</span>
          </div>

          {/* Table rows */}
          {data.data.map((c) => (
            <Link
              key={c.id}
              to={`/candidate/${c.id}`}
              className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2 md:gap-4 px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors items-center group"
            >
              {/* Candidate name + party */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                    PARTY_INITIALS_BG[c.party] || 'bg-slate-600/30 text-slate-400'
                  )}
                >
                  {getInitials(c.full_name)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                      {c.full_name}
                    </span>
                    {c.incumbent && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 shrink-0"
                      >
                        Incumbent
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge
                      variant={PARTY_BADGE_VARIANT[c.party] || 'other'}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {PARTY_LABELS[c.party] || c.party}
                    </Badge>
                    <span className="text-[11px] text-slate-500 capitalize">{c.status}</span>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="w-28 text-center text-sm text-slate-400">
                <span>{c.state}</span>
                {c.office === 'house' && c.district != null && (
                  <span className="text-slate-500">-{c.district}</span>
                )}
              </div>

              {/* Office */}
              <div className="w-24 flex justify-center">
                <Badge
                  variant={c.office === 'senate' ? 'default' : 'secondary'}
                  className="text-[10px] capitalize"
                >
                  {c.office}
                </Badge>
              </div>

              {/* Fundraising */}
              <div className="w-24 text-right text-sm tabular-nums">
                {c.total_raised != null && c.total_raised > 0 ? (
                  <span className="text-emerald-400">{formatCurrency(c.total_raised)}</span>
                ) : (
                  <span className="text-slate-600">--</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────── */}
      {data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={!data.pagination.hasPrev}
            onClick={() => setPage(page - 1)}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <span className="text-sm text-slate-500 tabular-nums">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!data.pagination.hasNext}
            onClick={() => setPage(page + 1)}
            className="gap-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </>
  );
}
