import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getStats, getStates } from '../lib/api';

// ── Types ──────────────────────────────────────────────────

interface Stats {
  total_candidates: number;
  total_senate_races: number;
  total_house_races: number;
  total_special_elections: number;
  candidates_by_party: Record<string, number>;
  avg_data_confidence: number;
}

interface StateSummary {
  state: string;
  state_name: string;
  total_candidates: number;
  senate_races: number;
  house_races: number;
}

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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Candidates"
          value={stats?.total_candidates ?? '—'}
          loading={statsLoading}
          error={statsError}
        />
        <StatCard
          label="Senate Races"
          value={stats?.total_senate_races ?? '—'}
          loading={statsLoading}
          error={statsError}
        />
        <StatCard
          label="House Races"
          value={stats?.total_house_races ?? '—'}
          loading={statsLoading}
          error={statsError}
        />
        <StatCard
          label="Special Elections"
          value={stats?.total_special_elections ?? '—'}
          loading={statsLoading}
          error={statsError}
        />
      </div>

      {/* Party Breakdown */}
      {stats?.candidates_by_party && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Candidates by Party</h3>
          <div className="space-y-3">
            {Object.entries(stats.candidates_by_party)
              .sort(([, a], [, b]) => b - a)
              .map(([party, count]) => {
                const total = stats.total_candidates || 1;
                const pct = (count / total) * 100;
                return (
                  <div key={party} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-slate-400 text-right">
                      {PARTY_LABELS[party] || party}
                    </span>
                    <div className="flex-1 h-6 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${PARTY_COLORS[party] || 'bg-slate-500'}`}
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
        </div>
      )}

      {/* State Grid */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Browse by State</h3>
        {statesError ? (
          <ErrorBanner message="Failed to load states. Please refresh." />
        ) : statesLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
            {Array.from({ length: 50 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-800/50" />
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
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Data Quality</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
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
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────

function StatCard({
  label,
  value,
  loading,
  error,
}: {
  label: string;
  value: number | string;
  loading: boolean;
  error?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="text-2xl font-bold text-white">
        {error ? (
          <span className="text-red-400 text-base">Error</span>
        ) : loading ? (
          <div className="h-8 w-16 animate-pulse rounded bg-slate-800" />
        ) : (
          typeof value === 'number' ? value.toLocaleString() : value
        )}
      </div>
      <div className="text-sm text-slate-400 mt-1">{label}</div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
      {message}
    </div>
  );
}
