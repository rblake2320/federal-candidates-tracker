import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapPin, Search, Users, Vote, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getVoterInfo } from '@/lib/api';
import { STATE_NAMES } from '@/utils/dataGuards';

export function VoterInfoLookup() {
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['voter-info', state, district],
    queryFn: () => getVoterInfo(state, district ? parseInt(district, 10) : undefined),
    enabled: submitted && state.length === 2,
  });

  function handleLookup() {
    if (state) setSubmitted(true);
  }

  const stateList = Object.entries(STATE_NAMES)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Voter Info Lookup</span>
        </div>

        <div className="space-y-2">
          <Select
            value={state}
            onChange={(e) => { setState(e.target.value); setSubmitted(false); }}
            className="w-full text-sm"
          >
            <option value="">Select State</option>
            {stateList.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </Select>

          <input
            type="number"
            min="1"
            max="53"
            value={district}
            onChange={(e) => { setDistrict(e.target.value); setSubmitted(false); }}
            placeholder="District # (optional)"
            className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          <button
            onClick={handleLookup}
            disabled={!state || isLoading}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              state
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            Look Up
          </button>
        </div>

        {submitted && data && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            {data.state && (
              <p className="text-xs text-slate-400">
                {data.state.name} — {data.state.house_seats} House seat{data.state.house_seats !== 1 ? 's' : ''}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-slate-400">
                <Vote className="h-3 w-3" />
                {data.total_elections} election{data.total_elections !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <Users className="h-3 w-3" />
                {data.total_candidates} candidate{data.total_candidates !== 1 ? 's' : ''}
              </span>
            </div>

            {data.elections.length > 0 ? (
              <div className="space-y-1.5">
                {data.elections.slice(0, 5).map((e) => (
                  <Link
                    key={e.id}
                    to={`/state/${e.state}`}
                    className="block text-xs text-blue-400 hover:text-blue-300 truncate"
                  >
                    {e.state_name} — {e.office} {e.district ? `D-${e.district}` : ''}
                    <Badge variant="default" className="text-[9px] ml-1.5">{e.election_type}</Badge>
                  </Link>
                ))}
                {data.elections.length > 5 && (
                  <p className="text-[10px] text-slate-500">
                    +{data.elections.length - 5} more
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No elections found for this location.</p>
            )}
          </div>
        )}

        {submitted && isError && (
          <p className="text-xs text-red-400 pt-2">Lookup failed. Please try again.</p>
        )}
      </CardContent>
    </Card>
  );
}
