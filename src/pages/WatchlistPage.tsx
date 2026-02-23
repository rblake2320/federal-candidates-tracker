import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Trash2, Calendar, MapPin, Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getWatchlist, removeFromWatchlist } from '@/lib/api';
import type { Election } from '@/types/models';

export function WatchlistPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['watchlist'],
    queryFn: getWatchlist,
    enabled: isAuthenticated,
  });

  const removeMutation = useMutation({
    mutationFn: (electionId: string) => removeFromWatchlist(electionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  const removingId = removeMutation.isPending ? removeMutation.variables : null;

  if (authLoading) {
    return <LoadingSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <Bookmark className="h-8 w-8 text-slate-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-white mb-2">Sign in to use Watchlist</h2>
            <p className="text-sm text-slate-400">
              Track elections you care about by signing in and bookmarking them.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const elections: Election[] = data?.data ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Watchlist</h1>
        <p className="text-sm text-slate-500 mt-1">
          Elections you're tracking
        </p>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <Card className="border-red-800/50 bg-red-900/20">
          <CardContent className="py-6 text-center text-sm text-red-300">
            Failed to load watchlist. Please try again.
          </CardContent>
        </Card>
      ) : elections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bookmark className="h-8 w-8 text-slate-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">No saved elections</h3>
            <p className="text-sm text-slate-400 mb-4">
              Browse elections and click the bookmark icon to save them here.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Browse Elections
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {elections.map((election) => (
            <WatchlistCard
              key={election.id}
              election={election}
              onRemove={() => removeMutation.mutate(election.id)}
              removing={removingId === election.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WatchlistCard({
  election,
  onRemove,
  removing,
}: {
  election: Election;
  onRemove: () => void;
  removing: boolean;
}) {
  const officeLabel =
    election.office === 'senate'
      ? 'U.S. Senate'
      : election.office === 'governor'
        ? 'Governor'
        : `House District ${election.district}`;

  return (
    <Card className="group hover:border-slate-700 transition-colors">
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <Link
              to={`/state/${election.state}`}
              className="text-sm font-medium text-white hover:text-blue-400 transition-colors"
            >
              {election.state_name || election.state} — {officeLabel}
            </Link>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {election.state}
              </span>
              {election.election_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(election.election_date).toLocaleDateString()}
                </span>
              )}
              <Badge
                variant={election.election_type === 'special' ? 'special' : 'general'}
                className="text-[10px]"
              >
                {election.election_type}
              </Badge>
            </div>
          </div>
          <button
            onClick={onRemove}
            disabled={removing}
            className={cn(
              'p-2 rounded-lg transition-colors shrink-0',
              'text-slate-500 hover:text-red-400 hover:bg-red-500/10',
              'sm:opacity-0 sm:group-hover:opacity-100',
              'disabled:opacity-50'
            )}
            title="Remove from watchlist"
          >
            {removing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  );
}
