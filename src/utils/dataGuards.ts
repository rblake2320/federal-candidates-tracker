import type { Candidate, Election } from '@/types/models';

// ── Candidate Helpers ────────────────────────────────────────

/**
 * Get top N candidates for preview cards, or empty array.
 * Sorts by incumbent status first, then total_raised descending.
 */
export function getCandidatePreview(
  candidates: Candidate[],
  max: number = 4
): Candidate[] {
  if (!candidates || candidates.length === 0) return [];
  return [...candidates]
    .sort((a, b) => {
      // Incumbents first
      if (a.incumbent && !b.incumbent) return -1;
      if (!a.incumbent && b.incumbent) return 1;
      // Then by fundraising (nulls last)
      const aRaised = a.total_raised ?? 0;
      const bRaised = b.total_raised ?? 0;
      return bRaised - aRaised;
    })
    .slice(0, max);
}

// ── Countdown / Date Helpers ─────────────────────────────────

export type CountdownState = 'upcoming' | 'today' | 'concluded' | 'unknown';

/**
 * Determine countdown display state from an ISO date string.
 * Compares against local midnight to avoid timezone edge cases.
 */
export function getCountdownState(
  dateStr: string | null | undefined
): CountdownState {
  if (!dateStr) return 'unknown';

  const electionDate = new Date(dateStr);
  if (isNaN(electionDate.getTime())) return 'unknown';

  const now = new Date();
  // Compare at date-level precision (ignore hours/minutes)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(
    electionDate.getFullYear(),
    electionDate.getMonth(),
    electionDate.getDate()
  );

  if (target.getTime() === today.getTime()) return 'today';
  if (target.getTime() > today.getTime()) return 'upcoming';
  return 'concluded';
}

// ── Election Formatting ──────────────────────────────────────

/**
 * Format election title from election object.
 * Examples:
 *   "2026 California Senate Race"
 *   "2026 Texas House District 7"
 */
export function formatElectionTitle(election: Election): string {
  const year = election.election_date
    ? new Date(election.election_date).getFullYear()
    : '2026';

  const stateName =
    election.state_name || STATE_NAMES[election.state] || election.state;

  if (election.office === 'senate') {
    return `${year} ${stateName} Senate Race`;
  }

  if (election.office === 'governor') {
    return `${year} ${stateName} Governor Race`;
  }

  if (election.office === 'house') {
    const districtLabel =
      election.district !== null && election.district !== undefined
        ? `District ${election.district}`
        : 'At-Large';
    return `${year} ${stateName} House ${districtLabel}`;
  }

  return `${year} ${stateName} Election`;
}

/**
 * Format election subtitle.
 * Examples:
 *   "Class II Senate Seat"
 *   "All 435 House Seats"
 *   "Special Election"
 */
export function formatElectionSubtitle(election: Election): string {
  if (election.election_type === 'special') {
    if (election.office === 'senate') return 'Special Senate Election';
    if (election.office === 'house') return 'Special House Election';
    if (election.office === 'governor') return 'Special Governor Election';
    return 'Special Election';
  }

  if (election.office === 'senate' && election.senate_class) {
    return `Class ${toRoman(election.senate_class)} Senate Seat`;
  }

  if (election.office === 'senate') {
    return 'Senate Seat';
  }

  if (election.office === 'governor') {
    return 'Statewide Executive Race';
  }

  if (election.office === 'house') {
    return election.district !== null && election.district !== undefined
      ? `Congressional District ${election.district}`
      : 'At-Large Congressional Seat';
  }

  return '';
}

function toRoman(num: number): string {
  const map: [number, string][] = [
    [3, 'III'],
    [2, 'II'],
    [1, 'I'],
  ];
  for (const [val, roman] of map) {
    if (num === val) return roman;
  }
  return String(num);
}

// ── Party Helpers ────────────────────────────────────────────

const PARTY_COLORS: Record<string, string> = {
  democratic: 'bg-blue-500',
  republican: 'bg-red-500',
  libertarian: 'bg-yellow-500',
  green: 'bg-emerald-500',
  constitution: 'bg-orange-500',
  independent: 'bg-purple-500',
  no_party: 'bg-gray-500',
  other: 'bg-gray-500',
};

const PARTY_TEXT_COLORS: Record<string, string> = {
  democratic: 'text-blue-400',
  republican: 'text-red-400',
  libertarian: 'text-yellow-400',
  green: 'text-emerald-400',
  constitution: 'text-orange-400',
  independent: 'text-purple-400',
  no_party: 'text-gray-400',
  other: 'text-gray-400',
};

const PARTY_LABELS: Record<string, string> = {
  democratic: 'Democratic',
  republican: 'Republican',
  libertarian: 'Libertarian',
  green: 'Green',
  constitution: 'Constitution',
  independent: 'Independent',
  no_party: 'No Party Affiliation',
  other: 'Other',
};

/** Get consistent party background color as a Tailwind class name. */
export function getPartyColor(party: string): string {
  return PARTY_COLORS[party.toLowerCase()] || 'bg-gray-500';
}

/** Get party text color as a Tailwind class name. */
export function getPartyTextColor(party: string): string {
  return PARTY_TEXT_COLORS[party.toLowerCase()] || 'text-gray-400';
}

/** Get full human-readable party label. */
export function getPartyLabel(party: string): string {
  return PARTY_LABELS[party.toLowerCase()] || party;
}

// ── Name Helpers ─────────────────────────────────────────────

/**
 * Get initials from a full name.
 * "John Smith" -> "JS"
 * "Mary Jane Watson" -> "MJ" (first + last)
 * "Madonna" -> "M"
 */
export function getInitials(fullName: string): string {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Dollar Formatting ────────────────────────────────────────

/**
 * Format a dollar amount for display.
 * null/undefined -> null
 * 1500000 -> "$1.5M"
 * 50000   -> "$50K"
 * 500     -> "$500"
 * 0       -> "$0"
 */
export function formatDollars(
  value: number | null | undefined
): string | null {
  if (value === null || value === undefined) return null;
  if (value === 0) return '$0';

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    const formatted = (abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '');
    return `${sign}$${formatted}B`;
  }
  if (abs >= 1_000_000) {
    const formatted = (abs / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${sign}$${formatted}M`;
  }
  if (abs >= 1_000) {
    const formatted = (abs / 1_000).toFixed(1).replace(/\.0$/, '');
    return `${sign}$${formatted}K`;
  }

  return `${sign}$${abs.toLocaleString()}`;
}

// ── State Names ──────────────────────────────────────────────

/** All 50 states + DC mapped from two-letter code to full name. */
export const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
};
