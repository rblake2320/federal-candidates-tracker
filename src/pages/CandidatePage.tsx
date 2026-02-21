import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCandidate } from '../lib/api';
import type { CandidateDetail } from '../types/models';

const PARTY_FULL: Record<string, string> = {
  democratic: 'Democratic Party',
  republican: 'Republican Party',
  libertarian: 'Libertarian Party',
  green: 'Green Party',
  independent: 'Independent',
  constitution: 'Constitution Party',
  no_party: 'No Party Affiliation',
  other: 'Other',
};

const STATUS_BADGE: Record<string, string> = {
  declared: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  filed: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  qualified: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  exploratory: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  withdrawn: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  won: 'bg-green-500/10 text-green-400 border-green-500/30',
  lost: 'bg-red-500/10 text-red-400 border-red-500/30',
  runoff: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
};

export function CandidatePage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery<{ data: CandidateDetail }>({
    queryKey: ['candidate', id],
    queryFn: () => getCandidate(id!),
    enabled: !!id,
  });

  if (isLoading) return <LoadingSkeleton />;
  if (isError || !data?.data) return <ErrorState />;

  const c = data.data;
  const raceLabel = c.office === 'senate'
    ? `U.S. Senate — ${c.state_name}`
    : `${c.state_name} District ${c.district}`;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/" className="hover:text-slate-300">Home</Link>
        <span>/</span>
        <Link to={`/state/${c.state}`} className="hover:text-slate-300">{c.state}</Link>
        <span>/</span>
        <span className="text-slate-300">{c.full_name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-5">
        {c.photo_url ? (
          <img
            src={c.photo_url}
            alt={c.full_name}
            className="w-20 h-20 rounded-full object-cover border-2 border-slate-700"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-2xl text-slate-500 border-2 border-slate-700">
            {(c.first_name?.[0] || '') + (c.last_name?.[0] || '')}
          </div>
        )}

        <div className="flex-1">
          <h2 className="text-3xl font-bold text-white">{c.full_name}</h2>
          <p className="mt-1 text-slate-400">{PARTY_FULL[c.party] || c.party}</p>
          <p className="text-sm text-slate-500">{raceLabel}</p>

          <div className="flex items-center gap-2 mt-3">
            <span className={`px-2 py-0.5 text-xs font-medium border rounded-full ${STATUS_BADGE[c.status] || 'bg-slate-500/10 text-slate-400'}`}>
              {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
            </span>
            {c.incumbent && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full">
                Incumbent
              </span>
            )}
            {c.cook_rating && (
              <span className="px-2 py-0.5 text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/30 rounded-full">
                {c.cook_rating}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Finance */}
      {(c.total_raised || c.total_spent || c.cash_on_hand) && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Campaign Finance</h3>
          <div className="grid grid-cols-3 gap-4">
            <FinanceStat label="Total Raised" value={c.total_raised} />
            <FinanceStat label="Total Spent" value={c.total_spent} />
            <FinanceStat label="Cash on Hand" value={c.cash_on_hand} />
          </div>
          {c.finance_updated_at && (
            <p className="text-xs text-slate-600 mt-3">
              Last updated: {new Date(c.finance_updated_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Polling */}
      {c.latest_poll_pct && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Latest Polling</h3>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-white tabular-nums">{c.latest_poll_pct}%</div>
            <div className="text-sm text-slate-500">
              {c.poll_source && <span>{c.poll_source}</span>}
              {c.poll_date && <span> · {new Date(c.poll_date).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Links */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Links</h3>
        <div className="space-y-2">
          {c.website && (
            <ExternalLink label="Campaign Website" href={c.website} />
          )}
          {c.ballotpedia_url && (
            <ExternalLink label="Ballotpedia" href={c.ballotpedia_url} />
          )}
          {c.fec_candidate_id && (
            <ExternalLink
              label="FEC Filing"
              href={`https://www.fec.gov/data/candidate/${c.fec_candidate_id}/`}
            />
          )}
        </div>
      </div>

      {/* Election Info */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Election Details</h3>
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-slate-500">Election Date</dt>
          <dd className="text-slate-300">{new Date(c.election_date).toLocaleDateString()}</dd>

          {c.primary_date && (
            <>
              <dt className="text-slate-500">Primary Date</dt>
              <dd className="text-slate-300">{new Date(c.primary_date).toLocaleDateString()}</dd>
            </>
          )}

          {c.filing_deadline && (
            <>
              <dt className="text-slate-500">Filing Deadline</dt>
              <dd className="text-slate-300">{new Date(c.filing_deadline).toLocaleDateString()}</dd>
            </>
          )}

          <dt className="text-slate-500">Election Type</dt>
          <dd className="text-slate-300 capitalize">{c.election_type}</dd>

          <dt className="text-slate-500">Data Confidence</dt>
          <dd className="text-slate-300">{((c.data_confidence || 0) * 100).toFixed(0)}%</dd>
        </dl>
      </div>
    </div>
  );
}

function FinanceStat({ label, value }: { label: string; value?: number | null }) {
  const formatted = value
    ? value >= 1_000_000
      ? `$${(value / 1_000_000).toFixed(1)}M`
      : value >= 1_000
        ? `$${(value / 1_000).toFixed(0)}K`
        : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
    : '—';

  return (
    <div>
      <div className="text-xl font-bold text-white tabular-nums">{formatted}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function ExternalLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
    >
      <span>{label}</span>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex gap-5">
        <div className="w-20 h-20 rounded-full animate-pulse bg-slate-800" />
        <div className="space-y-3 flex-1">
          <div className="h-8 w-64 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-40 animate-pulse rounded bg-slate-800" />
        </div>
      </div>
      {[1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-800/50" />)}
    </div>
  );
}

function ErrorState() {
  return (
    <div className="rounded-xl border border-red-800/50 bg-red-900/20 p-8 text-center">
      <p className="text-red-300">Failed to load candidate data.</p>
      <Link to="/" className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300">← Back to dashboard</Link>
    </div>
  );
}
