import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStateDetail } from '../lib/api';
import type { StateDetail, Candidate } from '../types/models';

const PARTY_COLORS: Record<string, string> = {
  democratic: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  republican: 'text-red-400 bg-red-500/10 border-red-500/30',
  libertarian: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  green: 'text-green-400 bg-green-500/10 border-green-500/30',
  independent: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
};

const PARTY_LABELS: Record<string, string> = {
  democratic: 'D', republican: 'R', libertarian: 'L',
  green: 'G', independent: 'I', constitution: 'C',
  no_party: 'NP', other: 'O',
};

function formatDollars(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export function StatePage() {
  const { code } = useParams<{ code: string }>();

  const { data, isLoading, isError } = useQuery<StateDetail>({
    queryKey: ['state', code],
    queryFn: () => getStateDetail(code!),
    enabled: !!code,
  });

  if (isLoading) return <LoadingSkeleton />;
  if (isError || !data) return <ErrorState />;

  const { state, elections, candidates, summary } = data;

  // Group candidates by election
  const candidatesByElection = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const list = candidatesByElection.get(c.election_id) || [];
    list.push(c);
    candidatesByElection.set(c.election_id, list);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
          ← All States
        </Link>
        <h2 className="mt-2 text-3xl font-bold text-white">
          {state.name}
        </h2>
        <p className="mt-1 text-slate-400">
          {summary.total_races} races · {summary.total_candidates} candidates
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat label="Total Candidates" value={summary.total_candidates} />
        <MiniStat label="Senate Races" value={elections.filter(e => e.office === 'senate').length} />
        <MiniStat label="House Races" value={elections.filter(e => e.office === 'house').length} />
        <MiniStat label="House Seats" value={state.house_seats} />
      </div>

      {/* Senate Races */}
      {elections.filter(e => e.office === 'senate').map(election => (
        <RaceCard
          key={election.id}
          title={`U.S. Senate${election.election_type === 'special' ? ' (Special)' : ''}`}
          subtitle={election.cook_rating || 'No rating'}
          competitive={election.is_competitive}
          candidates={candidatesByElection.get(election.id) || []}
        />
      ))}

      {/* House Races */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">U.S. House</h3>
        <div className="space-y-4">
          {elections
            .filter(e => e.office === 'house')
            .sort((a, b) => (a.district || 0) - (b.district || 0))
            .map(election => (
              <RaceCard
                key={election.id}
                title={`District ${election.district}`}
                subtitle={election.cook_rating || 'No rating'}
                competitive={election.is_competitive}
                candidates={candidatesByElection.get(election.id) || []}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

function RaceCard({
  title, subtitle, competitive, candidates,
}: {
  title: string;
  subtitle: string;
  competitive: boolean;
  candidates: Candidate[];
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-lg font-semibold text-white">{title}</h4>
          <span className="text-sm text-slate-500">{subtitle}</span>
        </div>
        {competitive && (
          <span className="px-2 py-1 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full">
            Competitive
          </span>
        )}
      </div>

      {candidates.length === 0 ? (
        <p className="text-sm text-slate-500 italic">No candidates filed yet</p>
      ) : (
        <div className="space-y-2">
          {candidates.map(c => (
            <Link
              key={c.id}
              to={`/candidate/${c.id}`}
              className="flex items-center justify-between rounded-lg border border-slate-800 p-3
                         hover:border-slate-600 hover:bg-slate-800/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border ${PARTY_COLORS[c.party] || 'text-slate-400 bg-slate-500/10 border-slate-500/30'}`}>
                  {PARTY_LABELS[c.party] || '?'}
                </span>
                <div>
                  <span className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                    {c.full_name}
                  </span>
                  {c.incumbent && (
                    <span className="ml-2 text-xs text-slate-500">(Incumbent)</span>
                  )}
                </div>
              </div>
              {c.total_raised != null && c.total_raised > 0 && (
                <span className="text-xs text-slate-500 tabular-nums">
                  {formatDollars(c.total_raised)} raised
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="text-2xl font-bold text-white tabular-nums">{value.toLocaleString()}</div>
      <div className="text-sm text-slate-400 mt-1">{label}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-48 animate-pulse rounded bg-slate-800" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-800/50" />)}
      </div>
      {[1, 2, 3].map(i => <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-800/50" />)}
    </div>
  );
}

function ErrorState() {
  return (
    <div className="rounded-xl border border-red-800/50 bg-red-900/20 p-8 text-center">
      <p className="text-red-300">Failed to load state data. Please try again.</p>
      <Link to="/" className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300">
        ← Back to dashboard
      </Link>
    </div>
  );
}
