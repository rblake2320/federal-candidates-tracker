import { useMemo, useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueries } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  X,
  Star,
  Users,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react';
import { getElections, getCandidatesByState } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ElectionCard } from '@/components/elections/ElectionCard';
import { ElectionCardSkeleton } from '@/components/elections/ElectionCardSkeleton';
import { FilterPanel } from '@/components/filters/FilterPanel';
import type { Election, Candidate, PaginatedResponse } from '@/types/models';

// ── Constants ──────────────────────────────────────────────

const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
  AS: 'American Samoa', GU: 'Guam', MP: 'Northern Mariana Islands',
  PR: 'Puerto Rico', VI: 'Virgin Islands',
};

const OFFICE_LABELS: Record<string, string> = {
  senate: 'Senate',
  house: 'House',
  governor: 'Governor',
};

const ELECTION_TYPE_LABELS: Record<string, string> = {
  regular: 'Regular',
  special: 'Special',
  primary: 'Primary',
  runoff: 'Runoff',
};

const PARTY_LABELS: Record<string, string> = {
  democratic: 'Democratic',
  republican: 'Republican',
  independent: 'Independent',
  other: 'Other Parties',
};

const GOV_LEVEL_LABELS: Record<string, string> = {
  federal: 'Federal',
  state: 'State',
};

const TIME_RANGE_LABELS: Record<string, string> = {
  '30': 'Next 30 Days',
  '90': 'Next 90 Days',
  '180': 'Next 6 Months',
  year: 'This Year',
};

const PAGE_SIZE = 12;

// ── ElectionsPage ──────────────────────────────────────────

export function ElectionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read filters from URL
  const state = searchParams.get('state') || '';
  const office = searchParams.get('office') || '';
  const electionType = searchParams.get('type') || '';
  const timeRange = searchParams.get('time') || '';
  const partyFilter = searchParams.get('party') || '';
  const govLevel = searchParams.get('gov') || '';
  const view = (searchParams.get('view') as 'grid' | 'list') || 'grid';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Compute date range from timeRange selection
  const dateRange = useMemo(() => {
    if (!timeRange) return {};
    const now = new Date();
    const dateFrom = now.toISOString().split('T')[0];
    if (timeRange === 'year') {
      return { date_from: `${now.getFullYear()}-01-01`, date_to: `${now.getFullYear()}-12-31` };
    }
    const days = parseInt(timeRange, 10);
    if (isNaN(days)) return {};
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return { date_from: dateFrom, date_to: future.toISOString().split('T')[0] };
  }, [timeRange]);

  // Compute office filter from gov level checkboxes (combines with explicit office)
  const computedOffice = useMemo(() => {
    if (office) return office; // explicit office overrides gov level
    if (govLevel === '') return ''; // no gov filter
    const levels = govLevel.split(',');
    const hasFederal = levels.includes('federal');
    const hasState = levels.includes('state');
    if (hasFederal && hasState) return ''; // both = no filter
    if (hasFederal) return ''; // senate+house = need to handle via multiple params
    if (hasState) return 'governor';
    return '';
  }, [office, govLevel]);

  // ── Data fetching ──────────────────────────────────────

  const { data: electionsResponse, isLoading, isError } = useQuery<PaginatedResponse<Election>>({
    queryKey: ['elections', { state, office: computedOffice, election_type: electionType, page, ...dateRange, party: partyFilter }],
    queryFn: () =>
      getElections({
        ...(state && { state }),
        ...(computedOffice && { office: computedOffice }),
        ...(electionType && { election_type: electionType }),
        ...(dateRange.date_from && { date_from: dateRange.date_from }),
        ...(dateRange.date_to && { date_to: dateRange.date_to }),
        ...(partyFilter && { party: partyFilter }),
        page,
        limit: PAGE_SIZE,
      }),
  });

  // Fetch all elections (first page, large limit) to pick featured ones
  const { data: allElectionsResponse } = useQuery<PaginatedResponse<Election>>({
    queryKey: ['elections', 'featured-source'],
    queryFn: () => getElections({ limit: 100, page: 1 }),
    staleTime: 10 * 60 * 1000, // 10 min — featured list doesn't change often
  });

  // ── Featured elections: top 3 by total_candidates ──────

  const featuredElections = useMemo(() => {
    if (!allElectionsResponse?.data) return [];
    return [...allElectionsResponse.data]
      .sort((a, b) => (b.total_candidates ?? 0) - (a.total_candidates ?? 0))
      .slice(0, 3);
  }, [allElectionsResponse]);

  // Fetch candidates for each featured election's state using useQueries (hook-safe)
  const featuredStates = useMemo(
    () => [...new Set(featuredElections.map((e) => e.state))],
    [featuredElections]
  );

  const featuredCandidateResults = useQueries({
    queries: featuredStates.map((st) => ({
      queryKey: ['candidates', 'state', st],
      queryFn: () => getCandidatesByState(st),
      enabled: st.length > 0,
      staleTime: 10 * 60 * 1000,
    })),
  });

  // Build a map of election_id -> candidates[]
  const candidatesByElectionId = useMemo(() => {
    const map: Record<string, Candidate[]> = {};
    for (const q of featuredCandidateResults) {
      if (q.data?.candidates) {
        for (const c of q.data.candidates) {
          if (!map[c.election_id]) map[c.election_id] = [];
          map[c.election_id].push(c);
        }
      }
    }
    return map;
  }, [featuredCandidateResults]);

  // ── URL param helpers ──────────────────────────────────

  const setFilter = (key: string, value: string) => {
    const params = Object.fromEntries(searchParams.entries());
    if (value) {
      params[key] = value;
    } else {
      delete params[key];
    }
    params.page = '1'; // Reset to page 1 on filter change
    setSearchParams(params);
  };

  const removeFilter = (key: string) => setFilter(key, '');

  const setView = (v: 'grid' | 'list') => {
    const params = Object.fromEntries(searchParams.entries());
    if (v === 'grid') {
      delete params.view; // grid is default
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

  // ── Derived values ─────────────────────────────────────

  const elections = electionsResponse?.data ?? [];
  const pagination = electionsResponse?.pagination;
  const totalElections = pagination?.total ?? 0;
  const hasFilters = !!(state || office || electionType || timeRange || partyFilter || govLevel);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Close mobile filter sheet on ESC key
  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileFiltersOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [mobileFiltersOpen]);

  const activeFilters: { key: string; label: string; value: string }[] = [];
  if (state) {
    activeFilters.push({
      key: 'state',
      label: 'State',
      value: US_STATES[state.toUpperCase()] || state,
    });
  }
  if (office) {
    activeFilters.push({
      key: 'office',
      label: 'Office',
      value: OFFICE_LABELS[office] || office,
    });
  }
  if (electionType) {
    activeFilters.push({
      key: 'type',
      label: 'Type',
      value: ELECTION_TYPE_LABELS[electionType] || electionType,
    });
  }
  if (timeRange) {
    activeFilters.push({
      key: 'time',
      label: 'Time',
      value: TIME_RANGE_LABELS[timeRange] || timeRange,
    });
  }
  if (partyFilter) {
    activeFilters.push({
      key: 'party',
      label: 'Party',
      value: partyFilter.split(',').map(p => PARTY_LABELS[p] || p).join(', '),
    });
  }
  if (govLevel) {
    activeFilters.push({
      key: 'gov',
      label: 'Level',
      value: govLevel.split(',').map(l => GOV_LEVEL_LABELS[l] || l).join(', '),
    });
  }

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
      {/* ── Filter Panel (left sidebar) ──────────────── */}
      <div className="hidden lg:block w-64 shrink-0">
        <FilterPanel
          state={state}
          onStateChange={(v) => setFilter('state', v)}
          office={office}
          onOfficeChange={(v) => setFilter('office', v)}
          electionTypes={electionType ? [electionType] : []}
          onElectionTypesChange={(types) =>
            setFilter('type', types.length > 0 ? types[types.length - 1] : '')
          }
          timeRange={timeRange}
          onTimeRangeChange={(v) => setFilter('time', v)}
          parties={partyFilter ? partyFilter.split(',') : []}
          onPartiesChange={(ps) => setFilter('party', ps.join(','))}
          govLevels={govLevel ? govLevel.split(',') : []}
          onGovLevelsChange={(ls) => setFilter('gov', ls.join(','))}
          onClear={() => {
            setSearchParams({ page: '1' });
          }}
        />
      </div>

      {/* ── Mobile filter sheet ──────────────────────── */}
      {mobileFiltersOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileFiltersOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filters-title"
            className="fixed inset-x-0 bottom-0 z-[70] max-h-[85vh] overflow-y-auto rounded-t-2xl bg-slate-900 border-t border-slate-700 p-4 lg:hidden animate-slide-in-bottom"
          >
            <div className="flex items-center justify-between mb-4">
              <span id="mobile-filters-title" className="text-sm font-semibold text-white">Filters</span>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <FilterPanel
              state={state}
              onStateChange={(v) => { setFilter('state', v); }}
              office={office}
              onOfficeChange={(v) => { setFilter('office', v); }}
              electionTypes={electionType ? [electionType] : []}
              onElectionTypesChange={(types) =>
                setFilter('type', types.length > 0 ? types[types.length - 1] : '')
              }
              timeRange={timeRange}
              onTimeRangeChange={(v) => setFilter('time', v)}
              parties={partyFilter ? partyFilter.split(',') : []}
              onPartiesChange={(ps) => setFilter('party', ps.join(','))}
              govLevels={govLevel ? govLevel.split(',') : []}
              onGovLevelsChange={(ls) => setFilter('gov', ls.join(','))}
              onClear={() => {
                setSearchParams({ page: '1' });
              }}
            />
          </div>
        </>
      )}

      {/* ── Main content ─────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-8">
        {/* ── Featured Elections ──────────────────────── */}
        {!hasFilters && featuredElections.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-white">Featured Elections</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featuredElections.map((election) => (
                <ElectionCard
                  key={election.id}
                  election={election}
                  candidates={candidatesByElectionId[election.id]}
                  featured
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Upcoming Elections header ───────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Upcoming Elections</h2>
              {pagination && (
                <p className="text-sm text-slate-400 mt-1">
                  Showing{' '}
                  <span className="text-slate-200 tabular-nums">
                    {elections.length}
                  </span>{' '}
                  of{' '}
                  <span className="text-slate-200 tabular-nums">
                    {totalElections.toLocaleString()}
                  </span>{' '}
                  elections
                </p>
              )}
            </div>

            {/* Mobile filter button + Grid/List toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {hasFilters && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                    {activeFilters.length}
                  </span>
                )}
              </button>
            <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/50 p-0.5">
              <Button
                variant={view === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setView('grid')}
                aria-label="Grid view"
                className="h-7 w-7 p-0"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={view === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setView('list')}
                aria-label="List view"
                className="h-7 w-7 p-0"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            </div>
          </div>

          {/* ── Active filter tags ────────────────────── */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {activeFilters.map((f) => (
                <Badge
                  key={f.key}
                  variant="secondary"
                  className="gap-1.5 pr-1.5 cursor-pointer hover:bg-slate-600/50"
                  onClick={() => removeFilter(f.key)}
                >
                  <span className="text-slate-400">{f.label}:</span>{' '}
                  {f.value}
                  <X className="w-3 h-3 text-slate-400 hover:text-white" />
                </Badge>
              ))}
              <button
                onClick={() => setSearchParams({ page: '1' })}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}

          {/* ── Election content ──────────────────────── */}
          {isError ? (
            <div className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
              Failed to load elections. Please try again.
            </div>
          ) : isLoading ? (
            // Loading skeleton
            view === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ElectionCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            )
          ) : elections.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                No elections match your filters
              </h3>
              <p className="text-sm text-slate-400 max-w-md mb-4">
                Try adjusting your search criteria. You can remove individual
                filters or clear them all to see all available elections.
              </p>
              {hasFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchParams({ page: '1' })}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          ) : view === 'grid' ? (
            // ── Grid view ─────────────────────────────
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {elections.map((election) => (
                <ElectionCard key={election.id} election={election} />
              ))}
            </div>
          ) : (
            // ── List view ─────────────────────────────
            <div className="rounded-lg border border-slate-800 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <span>State</span>
                <span>Office / District</span>
                <span className="text-center">Date</span>
                <span className="text-center">Candidates</span>
                <span className="text-center">Status</span>
              </div>

              {/* Table rows */}
              {elections.map((election) => (
                <Link
                  key={election.id}
                  to={`/state/${election.state}`}
                  className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors items-center group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors truncate">
                      {election.state_name || US_STATES[election.state] || election.state}
                    </span>
                    <span className="text-xs text-slate-500">{election.state}</span>
                  </div>

                  <div className="text-sm text-slate-300 truncate">
                    <span className="capitalize">{election.office}</span>
                    {election.office === 'house' && election.district != null && (
                      <span className="text-slate-500"> District {election.district}</span>
                    )}
                    {election.office === 'senate' && election.senate_class != null && (
                      <span className="text-slate-500"> Class {election.senate_class}</span>
                    )}
                  </div>

                  <div className="text-sm text-slate-400 tabular-nums whitespace-nowrap w-28 text-center">
                    {election.election_date
                      ? format(new Date(election.election_date), 'MMM d, yyyy')
                      : '--'}
                  </div>

                  <div className="flex items-center justify-center gap-1 w-24">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-sm text-slate-300 tabular-nums">
                      {election.total_candidates ?? election.candidate_count ?? 0}
                    </span>
                  </div>

                  <div className="w-24 flex justify-center">
                    {election.election_type === 'special' ? (
                      <Badge variant="special" className="text-[10px]">Special</Badge>
                    ) : election.is_competitive ? (
                      <Badge variant="destructive" className="text-[10px]">Competitive</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Regular</Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* ── Pagination ────────────────────────────── */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasPrev}
                onClick={() => setPage(page - 1)}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <span className="text-sm text-slate-500 tabular-nums">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasNext}
                onClick={() => setPage(page + 1)}
                className="gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
