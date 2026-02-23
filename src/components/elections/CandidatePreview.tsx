import React from 'react';
import { Link } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Candidate, PartyAffiliation } from '@/types/models';

interface CandidatePreviewProps {
  candidates: Candidate[];
  electionId: string;
  total: number;
  className?: string;
}

const MAX_PREVIEW = 4;

const PARTY_COLORS: Record<PartyAffiliation, string> = {
  democratic: 'bg-blue-600',
  republican: 'bg-red-600',
  libertarian: 'bg-yellow-500',
  green: 'bg-emerald-600',
  constitution: 'bg-orange-600',
  independent: 'bg-purple-600',
  no_party: 'bg-slate-600',
  other: 'bg-gray-600',
};

const PARTY_LABELS: Record<PartyAffiliation, string> = {
  democratic: 'Democrat',
  republican: 'Republican',
  libertarian: 'Libertarian',
  green: 'Green',
  constitution: 'Constitution',
  independent: 'Independent',
  no_party: 'No Party',
  other: 'Other',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function statusLabel(status: Candidate['status']): string | null {
  switch (status) {
    case 'withdrawn':
      return 'Withdrawn';
    case 'won':
      return 'Winner';
    case 'lost':
      return 'Lost';
    case 'runoff':
      return 'Runoff';
    case 'filed':
      return 'Filed';
    case 'qualified':
      return 'Qualified';
    case 'exploratory':
      return 'Exploratory';
    default:
      return null;
  }
}

function CandidateMiniCard({ candidate }: { candidate: Candidate }) {
  const initials = getInitials(candidate.full_name);
  const bgColor = PARTY_COLORS[candidate.party] ?? PARTY_COLORS.other;
  const partyLabel = PARTY_LABELS[candidate.party] ?? 'Other';

  const subtitle = candidate.incumbent ? 'Incumbent' : statusLabel(candidate.status);

  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-800/40 px-3 py-2.5">
      {/* Initials avatar */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
          bgColor
        )}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {candidate.full_name}
        </p>
        <p className="truncate text-xs text-slate-400">
          {partyLabel}
          {subtitle ? (
            <span className="text-slate-500"> &middot; {subtitle}</span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

export function CandidatePreview({
  candidates,
  electionId,
  total,
  className,
}: CandidatePreviewProps) {
  // Empty state
  if (!candidates || candidates.length === 0) {
    return (
      <div className={cn('rounded-lg border border-slate-800 bg-slate-800/20 p-4', className)}>
        <div className="flex items-center gap-2 text-slate-500">
          <Users className="h-4 w-4" />
          <span className="text-sm">Candidates TBD</span>
        </div>
      </div>
    );
  }

  const preview = candidates.slice(0, MAX_PREVIEW);
  const displayTotal = total > 0 ? total : candidates.length;
  const showingLabel =
    displayTotal > MAX_PREVIEW
      ? `Showing top ${MAX_PREVIEW}`
      : `${displayTotal} total`;

  // Derive state code from first candidate for the link
  const stateCode = candidates[0]?.state ?? '';

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400">
          <Users className="h-4 w-4" />
          <span className="text-sm font-medium">
            Candidates ({displayTotal})
          </span>
        </div>
        <span className="text-xs text-slate-500">{showingLabel}</span>
      </div>

      {/* Candidate grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {preview.map((candidate) => (
          <CandidateMiniCard key={candidate.id} candidate={candidate} />
        ))}
      </div>

      {/* View all link */}
      {displayTotal > MAX_PREVIEW && stateCode && (
        <Link
          to={`/state/${stateCode}`}
          className="group flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          View all {displayTotal} candidates
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
