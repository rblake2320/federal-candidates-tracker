import type {
  Stats,
  StateSummary,
  StateDetail,
  Candidate,
  CandidateDetail,
  Election,
  PaginatedResponse,
  CandidateProfile,
  CandidatePosition,
  CandidateEndorsement,
  CandidateProfileResponse,
} from '../types/models';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// ── Auth Token Management ────────────────────────────────────

let _authToken: string | null = null;
let _onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

export function clearAuthToken() {
  _authToken = null;
}

export function onUnauthorized(callback: () => void) {
  _onUnauthorized = callback;
}

// ── Core Fetch ────────────────────────────────────────────────

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };

  if (_authToken) {
    headers['Authorization'] = `Bearer ${_authToken}`;
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (response.status === 401 && _onUnauthorized) {
    _onUnauthorized();
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${response.status}`);
  }

  return response.json();
}

// ── Stats ──────────────────────────────────────────────────

export function getStats(): Promise<Stats> {
  return fetchJSON(`${API_BASE}/stats`);
}

// ── States ─────────────────────────────────────────────────

export function getStates(): Promise<{ data: StateSummary[] }> {
  return fetchJSON(`${API_BASE}/states`);
}

export function getStateDetail(code: string): Promise<StateDetail> {
  return fetchJSON(`${API_BASE}/states/${code.toUpperCase()}`);
}

// ── Candidates ─────────────────────────────────────────────

export function getCandidates(params?: Record<string, string | number>): Promise<PaginatedResponse<Candidate>> {
  const qs = params ? '?' + new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== '' && v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString() : '';
  return fetchJSON(`${API_BASE}/candidates${qs}`);
}

export function getCandidate(id: string): Promise<{ data: CandidateDetail }> {
  return fetchJSON(`${API_BASE}/candidates/${id}`);
}

export function searchCandidates(params: {
  search?: string;
  party?: string;
  office?: string;
  state?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Candidate>> {
  return getCandidates(params as Record<string, string | number>);
}

export function getCandidatesByState(state: string): Promise<{ state: string; total: number; candidates: Candidate[] }> {
  return fetchJSON(`${API_BASE}/candidates/state/${state.toUpperCase()}`);
}

export function getCandidatesByDistrict(state: string, district: number): Promise<{ state: string; district: number; total: number; candidates: Candidate[] }> {
  return fetchJSON(`${API_BASE}/candidates/district/${state.toUpperCase()}/${district}`);
}

// ── Elections ──────────────────────────────────────────────

export function getElections(params?: Record<string, string | number>): Promise<PaginatedResponse<Election>> {
  const qs = params ? '?' + new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== '' && v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString() : '';
  return fetchJSON(`${API_BASE}/elections${qs}`);
}

export function getSpecialElections(): Promise<{ total: number; elections: Election[] }> {
  return fetchJSON(`${API_BASE}/elections/special`);
}

export function getElection(id: string): Promise<{ data: Election & { candidates: Candidate[] } }> {
  return fetchJSON(`${API_BASE}/elections/${id}`);
}

// ── Watchlist ──────────────────────────────────────────────

export function getWatchlist(): Promise<{ data: Election[] }> {
  return fetchJSON(`${API_BASE}/watchlist`);
}

export function addToWatchlist(electionId: string): Promise<{ success: boolean }> {
  return fetchJSON(`${API_BASE}/watchlist`, {
    method: 'POST',
    body: JSON.stringify({ election_id: electionId }),
  });
}

export function removeFromWatchlist(electionId: string): Promise<{ success: boolean }> {
  return fetchJSON(`${API_BASE}/watchlist/${electionId}`, {
    method: 'DELETE',
  });
}

// ── Candidate Profiles ─────────────────────────────────────

export function getMyProfile(): Promise<CandidateProfileResponse> {
  return fetchJSON(`${API_BASE}/profile`);
}

export function getCandidateProfile(candidateId: string): Promise<CandidateProfileResponse> {
  return fetchJSON(`${API_BASE}/candidates/${candidateId}/profile`);
}

export function claimCandidateProfile(candidateId: string): Promise<{ profile: CandidateProfile }> {
  return fetchJSON(`${API_BASE}/candidates/${candidateId}/claim`, {
    method: 'POST',
  });
}

export function updateProfile(data: Record<string, unknown>): Promise<{ profile: CandidateProfile }> {
  return fetchJSON(`${API_BASE}/profile`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function getProfilePositions(): Promise<{ data: CandidatePosition[] }> {
  return fetchJSON(`${API_BASE}/profile/positions`);
}

export function addPosition(data: { title: string; stance?: string; description: string; priority?: number }): Promise<{ position: CandidatePosition }> {
  return fetchJSON(`${API_BASE}/profile/positions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updatePosition(id: string, data: Record<string, unknown>): Promise<{ position: CandidatePosition }> {
  return fetchJSON(`${API_BASE}/profile/positions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deletePosition(id: string): Promise<{ success: boolean }> {
  return fetchJSON(`${API_BASE}/profile/positions/${id}`, {
    method: 'DELETE',
  });
}

export function addEndorsement(data: Record<string, unknown>): Promise<{ endorsement: CandidateEndorsement }> {
  return fetchJSON(`${API_BASE}/profile/endorsements`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteEndorsement(id: string): Promise<{ success: boolean }> {
  return fetchJSON(`${API_BASE}/profile/endorsements/${id}`, {
    method: 'DELETE',
  });
}

export function togglePublishProfile(): Promise<{ is_published: boolean }> {
  return fetchJSON(`${API_BASE}/profile/publish`, {
    method: 'PUT',
  });
}

export function getAdminClaims(): Promise<{ data: (CandidateProfile & { candidate_name: string; state: string; office: string; claimant_email: string; claimant_name: string })[] }> {
  return fetchJSON(`${API_BASE}/admin/claims`);
}

export function updateAdminClaim(id: string, status: 'approved' | 'rejected'): Promise<{ success: boolean; status: string }> {
  return fetchJSON(`${API_BASE}/admin/claims/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

// ── Voter Info ────────────────────────────────────────────────

export function getVoterInfo(state: string, district?: number): Promise<{
  state: { code: string; name: string; house_seats: number } | null;
  elections: Election[];
  candidates: Candidate[];
  total_elections: number;
  total_candidates: number;
}> {
  const params = new URLSearchParams({ state });
  if (district !== undefined) params.set('district', String(district));
  return fetchJSON(`${API_BASE}/voter-info?${params}`);
}

// ── AI Search ─────────────────────────────────────────────────

export function aiSearch(q: string): Promise<{
  query: string;
  candidates: Candidate[];
  elections: Election[];
  total_candidates: number;
  total_elections: number;
}> {
  return fetchJSON(`${API_BASE}/search/ai?q=${encodeURIComponent(q)}`);
}

// ── Missing Elections ─────────────────────────────────────────

export function getMissingElections(): Promise<{
  data: Array<{
    code: string;
    name: string;
    house_seats: number;
    senate_elections: number;
    house_elections: number;
    governor_elections: number;
  }>;
  total: number;
}> {
  return fetchJSON(`${API_BASE}/elections/missing`);
}
