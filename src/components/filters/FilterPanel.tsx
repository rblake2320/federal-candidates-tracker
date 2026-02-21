import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Filter,
  Building2,
  Calendar,
  BarChart3,
  RefreshCw,
  X,
} from 'lucide-react';
import { getStates } from '@/lib/api';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { STATE_NAMES } from '@/utils/dataGuards';

// ── Types ────────────────────────────────────────────────────

interface FilterPanelProps {
  state: string;
  onStateChange: (state: string) => void;
  electionTypes: string[];
  onElectionTypesChange: (types: string[]) => void;
  onClear: () => void;
}

// ── Constants ────────────────────────────────────────────────

const ELECTION_TYPE_OPTIONS = [
  { value: 'general', label: 'General Elections' },
  { value: 'primary', label: 'Primary Elections' },
  { value: 'runoff', label: 'Runoff Elections' },
  { value: 'special', label: 'Special Elections' },
] as const;

const GOVERNMENT_LEVELS = [
  { value: 'federal', label: 'Federal', enabled: true, checked: true },
  { value: 'state', label: 'State', enabled: false, checked: false },
  { value: 'local', label: 'Local', enabled: false, checked: false },
] as const;

// ── Component ────────────────────────────────────────────────

export function FilterPanel({
  state,
  onStateChange,
  electionTypes,
  onElectionTypesChange,
  onClear,
}: FilterPanelProps) {
  const { data: statesData, isLoading: statesLoading } = useQuery({
    queryKey: ['states'],
    queryFn: getStates,
  });

  // Build sorted state options from API data or fallback to static list
  const stateOptions = buildStateOptions(statesData?.data);

  const hasActiveFilters =
    state !== '' || electionTypes.length > 0;

  function handleElectionTypeToggle(type: string) {
    if (electionTypes.includes(type)) {
      onElectionTypesChange(electionTypes.filter((t) => t !== type));
    } else {
      onElectionTypesChange([...electionTypes, type]);
    }
  }

  function handleClear() {
    onClear();
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-6">
      {/* ── Election Cycle Section ─────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader icon={RefreshCw} label="Election Cycle" />
        <p className="text-xs text-slate-500">
          Switch between election cycles
        </p>
        <Select disabled className="w-full cursor-not-allowed">
          <option>2026 Cycle</option>
        </Select>
      </div>

      <Separator />

      {/* ── Cycle Info Badges ──────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Calendar className="h-3.5 w-3.5 text-slate-500" />
          <span>November 3, 2026</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <BarChart3 className="h-3.5 w-3.5 text-slate-500" />
          <span>Tracking Available</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
          <Badge variant="default" className="text-[10px] px-1.5 py-0">
            2026 Election Cycle
          </Badge>
        </div>
      </div>

      <Separator />

      {/* ── Filters Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <X className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-200">Filters</span>
        </div>
        <button
          onClick={handleClear}
          disabled={!hasActiveFilters}
          className={cn(
            'text-xs font-medium transition-colors',
            hasActiveFilters
              ? 'text-blue-400 hover:text-blue-300 cursor-pointer'
              : 'text-slate-600 cursor-not-allowed'
          )}
        >
          Clear
        </button>
      </div>

      {/* ── State Filter ───────────────────────────────────── */}
      <div className="space-y-2">
        <SectionHeader icon={MapPin} label="State" />
        <Select
          value={state}
          onChange={(e) => onStateChange(e.target.value)}
          className="w-full"
        >
          <option value="">All States</option>
          {statesLoading ? (
            <option disabled>Loading states...</option>
          ) : (
            stateOptions.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))
          )}
        </Select>
      </div>

      {/* ── Election Type Filter ───────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader icon={Filter} label="Election Type" />
        <div className="space-y-2">
          {ELECTION_TYPE_OPTIONS.map((opt) => (
            <Checkbox
              key={opt.value}
              label={opt.label}
              checked={electionTypes.includes(opt.value)}
              onChange={() => handleElectionTypeToggle(opt.value)}
            />
          ))}
        </div>
      </div>

      {/* ── Government Level ───────────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader icon={Building2} label="Government Level" />
        <div className="space-y-2">
          {GOVERNMENT_LEVELS.map((level) => (
            <Checkbox
              key={level.value}
              label={level.label}
              checked={level.checked}
              disabled={!level.enabled || level.value === 'federal'}
              onChange={() => {
                /* Federal is always on; state/local not available */
              }}
              muted={!level.enabled}
            />
          ))}
        </div>
        {/* Explanatory note */}
        <p className="text-[11px] text-slate-600 leading-tight">
          Only federal races (Senate &amp; House) are currently tracked.
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-slate-400" />
      <span className="text-sm font-medium text-slate-300">{label}</span>
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
  disabled = false,
  muted = false,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  muted?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex items-center gap-2.5 cursor-pointer select-none group',
        disabled && 'cursor-not-allowed'
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          'h-4 w-4 rounded border border-slate-600 bg-slate-800 accent-blue-500',
          'focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-slate-900',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'transition-colors'
        )}
      />
      <span
        className={cn(
          'text-sm transition-colors',
          muted
            ? 'text-slate-600'
            : disabled
              ? 'text-slate-500'
              : 'text-slate-300 group-hover:text-slate-200'
        )}
      >
        {label}
      </span>
    </label>
  );
}

// ── Helpers ──────────────────────────────────────────────────

interface StateOption {
  code: string;
  name: string;
}

function buildStateOptions(
  apiStates: { state: string; state_name: string }[] | undefined
): StateOption[] {
  if (apiStates && apiStates.length > 0) {
    return [...apiStates]
      .map((s) => ({ code: s.state, name: s.state_name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Fallback to static STATE_NAMES if API hasn't loaded yet
  return Object.entries(STATE_NAMES)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type { FilterPanelProps };
