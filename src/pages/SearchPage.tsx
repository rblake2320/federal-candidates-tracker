import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchCandidates } from '../lib/api';
import type { Candidate, PaginatedResponse } from '../types/models';

const PARTY_LABELS: Record<string, string> = {
  democratic: 'Democrat', republican: 'Republican', libertarian: 'Libertarian',
  green: 'Green', independent: 'Independent', constitution: 'Constitution',
  no_party: 'No Party', other: 'Other',
};

const PARTY_DOT: Record<string, string> = {
  democratic: 'bg-blue-500', republican: 'bg-red-500', libertarian: 'bg-yellow-500',
  green: 'bg-green-500', independent: 'bg-purple-500', other: 'bg-slate-500',
};

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState(searchParams.get('q') || '');

  const q = searchParams.get('q') || '';
  const party = searchParams.get('party') || '';
  const office = searchParams.get('office') || '';
  const state = searchParams.get('state') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const { data, isLoading, isError } = useQuery<PaginatedResponse<Candidate>>({
    queryKey: ['search', q, party, office, state, page],
    queryFn: () => searchCandidates({ search: q, party, office, state, page, limit: 25 }),
    enabled: q.length > 0 || party.length > 0 || office.length > 0 || state.length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = {};
    if (inputValue.trim()) params.q = inputValue.trim();
    if (party) params.party = party;
    if (office) params.office = office;
    if (state) params.state = state;
    params.page = '1';
    setSearchParams(params);
  };

  const setFilter = (key: string, value: string) => {
    const params = Object.fromEntries(searchParams.entries());
    if (value) {
      params[key] = value;
    } else {
      delete params[key];
    }
    params.page = '1';
    setSearchParams(params);
  };

  const setPage = (p: number) => {
    const params = Object.fromEntries(searchParams.entries());
    params.page = String(p);
    setSearchParams(params);
  };

  const hasFilters = q || party || office || state;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Search Candidates</h2>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Search by name..."
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5
                     text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none
                     focus:ring-1 focus:ring-blue-500 transition-colors"
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white
                     hover:bg-blue-500 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <FilterSelect
          label="Office"
          value={office}
          options={[
            { value: '', label: 'All Offices' },
            { value: 'senate', label: 'Senate' },
            { value: 'house', label: 'House' },
          ]}
          onChange={v => setFilter('office', v)}
        />
        <FilterSelect
          label="Party"
          value={party}
          options={[
            { value: '', label: 'All Parties' },
            { value: 'democratic', label: 'Democratic' },
            { value: 'republican', label: 'Republican' },
            { value: 'libertarian', label: 'Libertarian' },
            { value: 'green', label: 'Green' },
            { value: 'independent', label: 'Independent' },
          ]}
          onChange={v => setFilter('party', v)}
        />
        {state && (
          <button
            onClick={() => setFilter('state', '')}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700"
          >
            State: {state} ✕
          </button>
        )}
      </div>

      {/* Results */}
      {!hasFilters ? (
        <div className="text-center py-16 text-slate-500">
          Enter a search term or select filters to find candidates.
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-800/50" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-4 text-sm text-red-300">
          Search failed. Please try again.
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            {data.pagination.total.toLocaleString()} result{data.pagination.total !== 1 ? 's' : ''}
          </p>

          <div className="space-y-2">
            {data.data.map(c => (
              <Link
                key={c.id}
                to={`/candidate/${c.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-4
                           hover:border-slate-600 hover:bg-slate-800/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${PARTY_DOT[c.party] || 'bg-slate-500'}`} />
                  <div>
                    <span className="font-medium text-white group-hover:text-blue-400 transition-colors">
                      {c.full_name}
                    </span>
                    <span className="ml-2 text-xs text-slate-500">
                      {PARTY_LABELS[c.party] || c.party}
                    </span>
                    {c.incumbent && <span className="ml-1 text-xs text-slate-600">(I)</span>}
                  </div>
                </div>
                <div className="text-sm text-slate-500 text-right">
                  <span>{c.state}</span>
                  {c.office === 'house' && c.district && <span>-{c.district}</span>}
                  <span className="ml-2 capitalize">{c.office}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                disabled={!data.pagination.hasPrev}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-sm rounded border border-slate-700 text-slate-400
                           hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500 tabular-nums">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </span>
              <button
                disabled={!data.pagination.hasNext}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-sm rounded border border-slate-700 text-slate-400
                           hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterSelect({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300
                 focus:border-blue-500 focus:outline-none transition-colors cursor-pointer"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
