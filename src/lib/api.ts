import type {
  Stats,
  StateSummary,
  StateDetail,
  Candidate,
  CandidateDetail,
  Election,
  PaginatedResponse,
} from '../types/models';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

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
