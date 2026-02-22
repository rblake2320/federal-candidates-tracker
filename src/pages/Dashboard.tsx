import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, Building2, Home, Landmark, Zap, TrendingUp, Database, MapPin, BarChart3, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getStats, getStates } from '../lib/api';
import type { Stats, StateSummary } from '../types/models';

interface StatesResponse {
  data: StateSummary[];
}

// ── Constants ──────────────────────────────────────────────

const PARTY_COLORS: Record<string, string> = {
  democratic: 'bg-blue-600',
  republican: 'bg-red-600',
  libertarian: 'bg-yellow-500',
  green: 'bg-green-600',
  independent: 'bg-purple-600',
  constitution: 'bg-amber-700',
  no_party: 'bg-slate-600',
  other: 'bg-slate-500',
};

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

const PARTY_BADGE_VARIANT: Record<string, 'democratic' | 'republican' | 'libertarian' | 'green' | 'independent' | 'other'> = {
  democratic: 'democratic',
  republican: 'republican',
  libertarian: 'libertarian',
  green: 'green',
  independent: 'independent',
  constitution: 'other',
  no_party: 'other',
  other: 'other',
};

// ── Dashboard ──────────────────────────────────────────────

export function Dashboard() {
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: getStats,
  });

  const {
    data: states,
    isLoading: statesLoading,
    isError: statesError,
  } = useQuery<StatesResponse>({
    queryKey: ['states'],
    queryFn: getStates,
  });

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          2026 Midterm Elections
        </h2>
        <p className="mt-2 text-lg text-slate-400">
          Every federal candidate. Every state. Every district.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total Candidates"
          value={stats?.total_candidates ?? '—'}
          loading={statsLoading}
          error={statsError}
          icon={Users}
          iconColor="text-blue-400"
        />
        <StatCard
          label="Senate Races"
          value={stats?.total_senate_races ?? '—'}
          loading={statsLoading}
          error={statsError}
          icon={Building2}
          iconColor="text-violet-400"
        />
        <StatCard
          label="House Races"
          value={stats?.total_house_races ?? '—'}
          loading={statsLoading}
          error={statsError}
          icon={Home}
          iconColor="text-emerald-400"
        />
        <StatCard
          label="Governor Races"
          value={stats?.total_governor_races ?? '—'}
          loading={statsLoading}
          error={statsError}
          icon={Landmark}
          iconColor="text-rose-400"
        />
        <StatCard
          label="Special Elections"
          value={stats?.total_special_elections ?? '—'}
          loading={statsLoading}
          error={statsError}
          icon={Zap}
          iconColor="text-amber-400"
        />
      </div>

      {/* Party Breakdown */}
      {stats?.candidates_by_party && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              <CardTitle>Candidates by Party</CardTitle>
            </div>
            <CardDescription>
              Distribution of {stats.total_candidates.toLocaleString()} declared candidates across party affiliations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.candidates_by_party)
                .sort(([, a], [, b]) => b - a)
                .map(([party, count]) => {
                  const total = stats.total_candidates || 1;
                  const pct = (count / total) * 100;
                  return (
                    <div key={party} className="flex items-center gap-3">
                      <div className="w-28 flex justify-end">
                        <Badge variant={PARTY_BADGE_VARIANT[party] || 'other'}>
                          {PARTY_LABELS[party] || party}
                        </Badge>
                      </div>
                      <div className="flex-1 h-6 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            PARTY_COLORS[party] || 'bg-slate-500'
                          )}
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                      <span className="w-20 text-sm text-slate-300 text-right tabular-nums">
                        {count.toLocaleString()} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Fundraisers */}
      {stats?.top_fundraisers && stats.top_fundraisers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              <CardTitle>Top Fundraisers</CardTitle>
            </div>
            <CardDescription>
              Leading candidates by total funds raised
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.top_fundraisers.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-slate-600 text-right tabular-nums">{i + 1}.</span>
                    <span className="text-white font-medium">{f.full_name}</span>
                    <span className="text-slate-500 hidden sm:inline">{f.state} &middot; {f.office}</span>
                    <Badge variant={PARTY_BADGE_VARIANT[f.party] || 'other'} className="hidden sm:inline-flex">
                      {PARTY_LABELS[f.party] || f.party}
                    </Badge>
                  </div>
                  <span className="text-emerald-400 font-medium tabular-nums">
                    {formatDollars(f.total_raised)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Data Collections */}
      {stats?.recent_collections && stats.recent_collections.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-sky-400" />
              <CardTitle>Recent Data Collections</CardTitle>
            </div>
            <CardDescription>
              Latest data pipeline runs and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recent_collections.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {c.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : c.status === 'failed' ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="text-slate-300">{c.source}</span>
                    <Badge
                      variant={c.status === 'completed' ? 'default' : c.status === 'failed' ? 'destructive' : 'secondary'}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {c.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500">
                    <span className="tabular-nums">{c.records_found.toLocaleString()} records</span>
                    <span className="tabular-nums">{new Date(c.completed_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* State Grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Browse by State</h3>
        </div>
        {statesError ? (
          <ErrorBanner message="Failed to load states. Please refresh." />
        ) : statesLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
            {Array.from({ length: 50 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
            {(states?.data || []).map((s) => (
              <Link
                key={s.state}
                to={`/state/${s.state}`}
                className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-center
                           hover:border-blue-500/50 hover:bg-slate-800/50 transition-all group"
              >
                <div className="text-lg font-bold text-white group-hover:text-blue-400">
                  {s.state}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {(s.total_candidates || 0).toLocaleString()} candidates
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Data Quality */}
      {stats?.avg_data_confidence !== undefined && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-400" />
              <CardTitle>Data Quality</CardTitle>
            </div>
            <CardDescription>
              Aggregate confidence score across all sourced records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    (stats.avg_data_confidence || 0) >= 0.8
                      ? 'bg-emerald-500'
                      : (stats.avg_data_confidence || 0) >= 0.5
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  )}
                  style={{ width: `${(stats.avg_data_confidence || 0) * 100}%` }}
                />
              </div>
              <span className="text-sm text-slate-300 tabular-nums">
                {((stats.avg_data_confidence || 0) * 100).toFixed(1)}% confidence
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Data sourced from FEC.gov, Ballotpedia, and state election boards.
              Updated every 6 hours.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────

function formatDollars(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

// ── Sub-components ─────────────────────────────────────────

function StatCard({
  label,
  value,
  loading,
  error,
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: number | string;
  loading: boolean;
  error?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-white">
              {error ? (
                <span className="flex items-center gap-1.5 text-red-400 text-base">
                  <AlertCircle className="h-4 w-4" />
                  Error
                </span>
              ) : loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                typeof value === 'number' ? value.toLocaleString() : value
              )}
            </div>
            <div className="text-sm text-slate-400">{label}</div>
          </div>
          <div className={cn('rounded-md bg-slate-800/80 p-2', iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <Card className="border-red-800/50 bg-red-900/20">
      <CardContent className="flex items-center gap-3 p-4">
        <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
        <span className="text-sm text-red-300">{message}</span>
      </CardContent>
    </Card>
  );
}
