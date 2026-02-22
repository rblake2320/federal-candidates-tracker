import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Landmark,
  Users,
  Filter,
  Trophy,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getCandidates } from '@/lib/api';
import type { Candidate, OfficeType } from '@/types/models';

// ── Component ──────────────────────────────────────────────

export function CongressPage() {
  const [chamberFilter, setChamberFilter] = useState<'' | OfficeType>('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['congress-winners', chamberFilter],
    queryFn: () =>
      getCandidates({
        status: 'won',
        ...(chamberFilter && { office: chamberFilter }),
        limit: 500,
      }),
  });

  const winners: Candidate[] = data?.data ?? [];

  const senateWinners = winners.filter((c) => c.office === 'senate');
  const houseWinners = winners.filter((c) => c.office === 'house');
  const governorWinners = winners.filter((c) => c.office === 'governor');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Landmark className="h-6 w-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">2026 Race Winners</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Candidates who have won their 2026 election races
          </p>
        </div>
        <Select
          value={chamberFilter}
          onChange={(e) => setChamberFilter(e.target.value as '' | OfficeType)}
          className="w-44"
        >
          <option value="">All Offices</option>
          <option value="senate">Senate</option>
          <option value="house">House</option>
          <option value="governor">Governor</option>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <Card className="border-red-800/50 bg-red-900/20">
          <CardContent className="py-6 text-center text-sm text-red-300">
            Failed to load results. Please try again.
          </CardContent>
        </Card>
      ) : winners.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="h-10 w-10 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              No results yet
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Race results will appear here after Election Day (November 3, 2026).
              Check back after the election for winners and results.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Senate Winners"
              count={senateWinners.length}
              icon={Landmark}
            />
            <StatCard
              label="House Winners"
              count={houseWinners.length}
              icon={Users}
            />
            <StatCard
              label="Governor Winners"
              count={governorWinners.length}
              icon={Trophy}
            />
          </div>

          {/* Senate */}
          {(chamberFilter === '' || chamberFilter === 'senate') && senateWinners.length > 0 && (
            <WinnerSection title="Senate" winners={senateWinners} />
          )}

          {/* House */}
          {(chamberFilter === '' || chamberFilter === 'house') && houseWinners.length > 0 && (
            <WinnerSection title="House" winners={houseWinners} />
          )}

          {/* Governor */}
          {(chamberFilter === '' || chamberFilter === 'governor') && governorWinners.length > 0 && (
            <WinnerSection title="Governor" winners={governorWinners} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function StatCard({
  label,
  count,
  icon: Icon,
}: {
  label: string;
  count: number;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="py-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <Icon className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{count}</p>
          <p className="text-xs text-slate-400">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function WinnerSection({
  title,
  winners,
}: {
  title: string;
  winners: Candidate[];
}) {
  // Group by state
  const byState = winners.reduce<Record<string, Candidate[]>>((acc, c) => {
    const key = c.state_name || c.state;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  const sortedStates = Object.keys(byState).sort();

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <Filter className="h-4 w-4 text-slate-400" />
        {title}
        <Badge variant="default" className="text-[10px]">
          {winners.length}
        </Badge>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedStates.map((state) =>
          byState[state].map((candidate) => (
            <WinnerCard key={candidate.id} candidate={candidate} />
          ))
        )}
      </div>
    </div>
  );
}

function WinnerCard({ candidate }: { candidate: Candidate }) {
  const partyColor =
    candidate.party === 'democratic'
      ? 'text-blue-400'
      : candidate.party === 'republican'
        ? 'text-red-400'
        : 'text-slate-400';

  const districtLabel =
    candidate.office === 'house' && candidate.district != null
      ? `District ${candidate.district}`
      : candidate.office === 'senate'
        ? 'Senate'
        : 'Governor';

  return (
    <Link to={`/candidate/${candidate.id}`}>
      <Card className="hover:border-blue-500/50 transition-colors h-full">
        <CardContent className="py-3">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-full bg-emerald-500/10 shrink-0 mt-0.5">
              <Trophy className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {candidate.full_name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn('text-xs font-medium capitalize', partyColor)}>
                  {candidate.party.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-slate-500">
                  {candidate.state_name || candidate.state} — {districtLabel}
                </span>
              </div>
              {candidate.incumbent && (
                <Badge variant="default" className="text-[10px] mt-1">
                  Incumbent
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-6 w-32" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
