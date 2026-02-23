import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Info,
  Bookmark,
  Loader2,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { CountdownTimer } from './CountdownTimer';
import { CandidatePreview } from './CandidatePreview';
import { useAuth } from '@/contexts/AuthContext';
import { addToWatchlist, removeFromWatchlist, getWatchlist } from '@/lib/api';
import type { Election, Candidate } from '@/types/models';

interface ElectionCardProps {
  election: Election;
  candidates?: Candidate[];
  featured?: boolean;
  className?: string;
}

// ── Helpers ──────────────────────────────────────────────────

function electionTypeBadgeVariant(type: Election['election_type']) {
  return type === 'special' ? 'special' : 'general';
}

function electionTypeLabel(type: Election['election_type']): string {
  return type === 'special' ? 'Special' : 'General';
}

function officeBadgeVariant(office: Election['office']) {
  return 'secondary' as const;
}

function officeLabel(office: Election['office']): string {
  switch (office) {
    case 'senate':
      return 'Federal - Senate';
    case 'house':
      return 'Federal - House';
    case 'governor':
      return 'State - Governor';
    default:
      return 'Federal';
  }
}

function buildTitle(election: Election): string {
  const state = election.state_name ?? election.state;
  const year = election.election_date
    ? new Date(election.election_date).getFullYear()
    : '2026';

  if (election.office === 'senate') {
    return `${year} ${state} Senate Race`;
  }

  if (election.office === 'governor') {
    return `${year} ${state} Governor Race`;
  }

  if (election.office === 'house' && election.district != null) {
    return `${year} ${state} House District ${election.district}`;
  }

  return `${year} ${state} House Elections`;
}

function buildSubtitle(election: Election): string | null {
  if (election.description) return election.description;

  if (election.office === 'senate' && election.senate_class != null) {
    return `Class ${election.senate_class === 1 ? 'I' : election.senate_class === 2 ? 'II' : 'III'} Senate Seat`;
  }

  if (election.office === 'governor') {
    return 'Statewide Executive Race';
  }

  if (election.office === 'house' && election.district == null) {
    const count = election.total_candidates ?? election.candidate_count;
    if (count && count > 0) {
      return `${count} candidates across all districts`;
    }
    return 'All House Seats';
  }

  return null;
}

function formatElectionDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Date TBD';
  const parsed = parseISO(dateStr);
  if (!isValid(parsed)) return 'Date TBD';
  return format(parsed, 'EEEE, MMMM d, yyyy');
}

function getCompetitiveLabel(rating: string | null): {
  label: string;
  color: string;
} | null {
  if (!rating) return null;
  const r = rating.toLowerCase();
  if (r.includes('toss') || r.includes('tilt')) {
    return { label: rating, color: 'text-amber-400' };
  }
  if (r.includes('lean')) {
    return { label: rating, color: 'text-yellow-400' };
  }
  if (r.includes('likely')) {
    return { label: rating, color: 'text-slate-400' };
  }
  if (r.includes('safe') || r.includes('solid')) {
    return { label: rating, color: 'text-slate-500' };
  }
  return { label: rating, color: 'text-slate-400' };
}

// ── Component ────────────────────────────────────────────────

export function ElectionCard({
  election,
  candidates,
  featured = false,
  className,
}: ElectionCardProps) {
  const title = buildTitle(election);
  const subtitle = buildSubtitle(election);
  const dateFormatted = formatElectionDate(election.election_date);
  const stateName = election.state_name ?? election.state;
  const stateCode = election.state;
  const competitive = getCompetitiveLabel(election.cook_rating);
  const totalCandidates =
    election.total_candidates ?? election.candidate_count ?? 0;

  return (
    <article
      className={cn(
        'group relative rounded-xl border bg-slate-900/60 transition-all duration-200',
        featured
          ? 'border-blue-500/40 shadow-lg shadow-blue-500/5'
          : 'border-slate-700 hover:border-blue-500/50',
        className
      )}
    >
      {/* Featured top accent */}
      {featured && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
      )}

      <div className="p-5 sm:p-6">
        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={electionTypeBadgeVariant(election.election_type)}>
            {electionTypeLabel(election.election_type)}
          </Badge>
          <Badge variant={officeBadgeVariant(election.office)}>
            {officeLabel(election.office)}
          </Badge>
          {election.is_competitive && (
            <Badge variant="special">Competitive</Badge>
          )}
          {competitive && (
            <span className={cn('text-xs font-medium', competitive.color)}>
              {competitive.label}
            </span>
          )}
        </div>

        {/* Title + subtitle */}
        <h3 className="mt-3 text-lg font-semibold text-white leading-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        )}

        {/* Date + location */}
        <div className="mt-4 flex flex-col gap-2 text-sm text-slate-400 sm:flex-row sm:items-center sm:gap-4">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-slate-500" />
            {dateFormatted}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-slate-500" />
            {stateName}
          </span>
        </div>

        {/* Countdown */}
        <div className="mt-4">
          <CountdownTimer targetDate={election.election_date} />
        </div>

        {/* Candidates preview */}
        {candidates !== undefined && (
          <div className="mt-4">
            <CandidatePreview
              candidates={candidates}
              electionId={election.id}
              total={totalCandidates}
            />
          </div>
        )}

        {/* Action row */}
        <div className="mt-5 flex items-center border-t border-slate-800 pt-4">
          <span className={cn('text-xs', totalCandidates === 0 ? 'text-amber-500/70' : 'text-slate-500')}>
            {totalCandidates === 0
              ? 'No candidates yet'
              : `${totalCandidates} candidate${totalCandidates !== 1 ? 's' : ''}`}
          </span>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <WatchlistButton electionId={election.id} />
            <Link
              to={`/state/${stateCode}`}
              className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'gap-1.5')}
            >
              <Info className="h-3.5 w-3.5" />
              View Details
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

// ── Watchlist bookmark button ────────────────────────────────

function WatchlistButton({ electionId }: { electionId: string }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: watchlistData } = useQuery({
    queryKey: ['watchlist'],
    queryFn: getWatchlist,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const isBookmarked = watchlistData?.data?.some((e) => e.id === electionId) ?? false;

  const addMutation = useMutation({
    mutationFn: () => addToWatchlist(electionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  });

  const removeMutation = useMutation({
    mutationFn: () => removeFromWatchlist(electionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  });

  const isPending = addMutation.isPending || removeMutation.isPending;

  if (!isAuthenticated) return null;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        if (isBookmarked) {
          removeMutation.mutate();
        } else {
          addMutation.mutate();
        }
      }}
      disabled={isPending}
      className={cn(
        'p-2 rounded-lg transition-colors',
        isBookmarked
          ? 'text-blue-400 hover:text-blue-300 bg-blue-500/10'
          : 'text-slate-500 hover:text-blue-400 hover:bg-blue-500/10',
        'disabled:opacity-50'
      )}
      title={isBookmarked ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bookmark className={cn('h-4 w-4', isBookmarked && 'fill-current')} />
      )}
    </button>
  );
}
