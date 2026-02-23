// ── Enums ──────────────────────────────────────────────────

export type OfficeType = 'senate' | 'house' | 'governor';
export type ElectionType = 'regular' | 'special' | 'primary' | 'runoff';
export type CandidateStatus = 'declared' | 'exploratory' | 'filed' | 'qualified' | 'withdrawn' | 'won' | 'lost' | 'runoff';
export type PartyAffiliation =
  | 'democratic' | 'republican' | 'libertarian' | 'green'
  | 'constitution' | 'independent' | 'no_party' | 'other';

// ── Core Models ────────────────────────────────────────────

export interface Candidate {
  id: string;
  election_id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  party: PartyAffiliation;
  state: string;
  state_name?: string;
  office: OfficeType;
  district: number | null;
  senate_class: number | null;
  incumbent: boolean;
  status: CandidateStatus;
  election_type: ElectionType;
  election_date: string;
  fec_candidate_id: string | null;
  ballotpedia_url: string | null;
  website: string | null;
  photo_url: string | null;
  total_raised: number | null;
  total_spent: number | null;
  cash_on_hand: number | null;
  latest_poll_pct: number | null;
  data_confidence: number;
  created_at: string;
  updated_at: string;
}

export interface CandidateDetail extends Candidate {
  bio: string | null;
  ballotpedia_id: string | null;
  opensecrets_id: string | null;
  finance_updated_at: string | null;
  poll_source: string | null;
  poll_date: string | null;
  data_sources: string[];
  last_verified: string | null;
  verification_notes: string | null;
  filing_date: string | null;
  // Joined from election
  cook_rating: string | null;
  is_competitive: boolean;
  primary_date: string | null;
  filing_deadline: string | null;
}

export interface Election {
  id: string;
  state: string;
  state_name?: string;
  office: OfficeType;
  district: number | null;
  senate_class: number | null;
  election_type: ElectionType;
  election_date: string;
  primary_date: string | null;
  filing_deadline: string | null;
  runoff_date: string | null;
  description: string | null;
  total_candidates: number;
  is_competitive: boolean;
  cook_rating: string | null;
  candidate_count?: number;
}

export interface StateSummary {
  state: string;
  state_name: string;
  senate_races: number;
  house_races: number;
  governor_races: number;
  total_candidates: number;
  democratic_candidates: number;
  republican_candidates: number;
  other_candidates: number;
  incumbents_running: number;
  avg_data_confidence: number;
}

export interface StateInfo {
  code: string;
  name: string;
  fips_code: string;
  house_seats: number;
  region: string | null;
}

export interface StateDetail {
  state: StateInfo;
  elections: Election[];
  candidates: Candidate[];
  summary: {
    total_candidates: number;
    total_races: number;
    candidates_by_party: Record<string, number>;
  };
}

// ── Candidate Profile Models ──────────────────────────────

export interface CandidateProfile {
  id: string;
  candidate_id: string;
  user_id: string;
  claim_status: 'pending' | 'approved' | 'rejected';
  headline: string | null;
  about: string | null;
  platform_summary: string | null;
  video_url: string | null;
  social_twitter: string | null;
  social_facebook: string | null;
  social_instagram: string | null;
  social_youtube: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_published: boolean;
  updated_at: string;
  created_at: string;
  user_display_name?: string;
}

export interface CandidatePosition {
  id: string;
  candidate_id: string;
  title: string;
  stance: string | null;
  description: string;
  priority: number;
  updated_at: string;
  created_at: string;
}

export interface CandidateEndorsement {
  id: string;
  candidate_id: string;
  endorser_name: string;
  endorser_title: string | null;
  endorser_org: string | null;
  quote: string | null;
  endorsement_date: string | null;
  created_at: string;
}

export interface CandidateProfileResponse {
  profile: CandidateProfile | null;
  positions: CandidatePosition[];
  endorsements: CandidateEndorsement[];
}

// ── API Response Wrappers ──────────────────────────────────

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface Stats {
  total_candidates: number;
  total_incumbents: number;
  total_challengers: number;
  total_senate_races: number;
  total_house_races: number;
  total_governor_races: number;
  total_special_elections: number;
  senate_candidates: number;
  house_candidates: number;
  governor_candidates: number;
  candidates_by_party: Record<string, number>;
  avg_data_confidence: number;
  high_confidence_count: number;
  low_confidence_count: number;
  recent_collections: Array<{
    source: string;
    status: string;
    records_found: number;
    completed_at: string;
  }>;
  top_fundraisers: Array<{
    full_name: string;
    state: string;
    office: string;
    party: string;
    total_raised: number;
  }>;
  last_updated: string;
}
