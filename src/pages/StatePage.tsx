import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStateDetail } from '../lib/api';
import type { StateDetail, Candidate } from '../types/models';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft, Users, MapPin, Building2, Home, Landmark } from 'lucide-react';

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

  const senateElections = elections.filter(e => e.office === 'senate');
  const governorElections = elections.filter(e => e.office === 'governor');
  const houseElections = elections
    .filter(e => e.office === 'house')
    .sort((a, b) => (a.district || 0) - (b.district || 0));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 mb-3 text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            All States
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <MapPin className="h-7 w-7 text-blue-400 shrink-0" />
          <div>
            <h2 className="text-3xl font-bold text-white">
              {state.name}
            </h2>
            <p className="mt-0.5 text-slate-400">
              {summary.total_races} races &middot; {summary.total_candidates} candidates
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat icon={<Users className="h-4 w-4 text-blue-400" />} label="Total Candidates" value={summary.total_candidates} />
        <MiniStat icon={<Building2 className="h-4 w-4 text-emerald-400" />} label="Senate Races" value={senateElections.length} />
        <MiniStat icon={<Landmark className="h-4 w-4 text-rose-400" />} label="Governor" value={governorElections.length} />
        <MiniStat icon={<Home className="h-4 w-4 text-amber-400" />} label="House Races" value={houseElections.length} />
      </div>

      {/* Governor Race */}
      {governorElections.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-xl font-semibold text-white mb-4">
            <Landmark className="h-5 w-5 text-slate-400" />
            Governor
          </h3>
          <div className="space-y-4">
            {governorElections.map(election => (
              <RaceCard
                key={election.id}
                title={`Governor${election.election_type === 'special' ? ' (Special)' : ''}`}
                subtitle={election.cook_rating || 'No rating'}
                competitive={election.is_competitive}
                isSpecial={election.election_type === 'special'}
                candidates={candidatesByElection.get(election.id) || []}
              />
            ))}
          </div>
        </section>
      )}

      {/* Senate Races */}
      {senateElections.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-xl font-semibold text-white mb-4">
            <Building2 className="h-5 w-5 text-slate-400" />
            U.S. Senate
          </h3>
          <div className="space-y-4">
            {senateElections.map(election => (
              <RaceCard
                key={election.id}
                title={`U.S. Senate${election.election_type === 'special' ? ' (Special)' : ''}`}
                subtitle={election.cook_rating || 'No rating'}
                competitive={election.is_competitive}
                isSpecial={election.election_type === 'special'}
                candidates={candidatesByElection.get(election.id) || []}
              />
            ))}
          </div>
        </section>
      )}

      {/* House Races */}
      {houseElections.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-xl font-semibold text-white mb-4">
            <Home className="h-5 w-5 text-slate-400" />
            U.S. House
          </h3>
          <div className="space-y-4">
            {houseElections.map(election => (
              <RaceCard
                key={election.id}
                title={`District ${election.district}`}
                subtitle={election.cook_rating || 'No rating'}
                competitive={election.is_competitive}
                isSpecial={election.election_type === 'special'}
                candidates={candidatesByElection.get(election.id) || []}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RaceCard({
  title, subtitle, competitive, isSpecial, candidates,
}: {
  title: string;
  subtitle: string;
  competitive: boolean;
  isSpecial: boolean;
  candidates: Candidate[];
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 pb-4">
        <div className="flex flex-col gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isSpecial && (
            <Badge variant="special">Special</Badge>
          )}
          {competitive && (
            <Badge variant="special">Competitive</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {candidates.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No candidates filed yet</p>
        ) : (
          <div className="space-y-2">
            {candidates.map(c => (
              <Link
                key={c.id}
                to={`/candidate/${c.id}`}
                className={cn(
                  'flex items-center justify-between rounded-lg border border-slate-800 p-3',
                  'hover:border-slate-600 hover:bg-slate-800/50 transition-all group'
                )}
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant={PARTY_BADGE_VARIANT[c.party] || 'other'}
                    className="h-8 w-8 justify-center rounded-full px-0 text-xs font-bold"
                  >
                    {PARTY_LABELS[c.party] || '?'}
                  </Badge>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                      {c.full_name}
                    </span>
                    {c.incumbent && (
                      <Badge variant="secondary" className="text-[11px] py-0">
                        Incumbent
                      </Badge>
                    )}
                  </div>
                </div>
                {c.total_raised != null && c.total_raised > 0 && (
                  <span className="text-xs text-slate-500 tabular-nums shrink-0 ml-2">
                    {formatDollars(c.total_raised)} raised
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white tabular-nums">{value.toLocaleString()}</div>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Back button skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-28 rounded-md" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="p-4">
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-7 w-16" />
          </Card>
        ))}
      </div>

      {/* Section heading skeleton */}
      <Skeleton className="h-6 w-32" />

      {/* Race card skeletons */}
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardHeader className="pb-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-24" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2].map(j => (
                <div key={j} className="flex items-center gap-3 rounded-lg border border-slate-800 p-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-36" />
                  <div className="flex-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ErrorState() {
  return (
    <Card className="border-red-800/50 bg-red-900/20">
      <CardContent className="p-8 text-center">
        <p className="text-red-300 mb-4">Failed to load state data. Please try again.</p>
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back to Elections
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
