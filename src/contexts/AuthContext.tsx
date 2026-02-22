import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { setAuthToken, clearAuthToken, API_BASE } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  candidate_id?: string | null;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, display_name?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'et_auth_token';

// ── Provider ──────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  });
  const [isLoading, setIsLoading] = useState(!!token);

  // Sync token to api module and localStorage
  const updateToken = useCallback((newToken: string | null) => {
    setToken(newToken);
    if (newToken) {
      setAuthToken(newToken);
      try { localStorage.setItem(TOKEN_KEY, newToken); } catch { /* ignore */ }
    } else {
      clearAuthToken();
      try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
    }
  }, []);

  // On mount: verify existing token
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setAuthToken(token);

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Invalid token');
        const data = await res.json();
        setUser(data.user);
        if (data.token) updateToken(data.token); // silent refresh
      })
      .catch(() => {
        updateToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    updateToken(data.token);
    setUser(data.user);
  }, [updateToken]);

  const register = useCallback(async (email: string, password: string, display_name?: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, display_name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    updateToken(data.token);
    setUser(data.user);
  }, [updateToken]);

  const logout = useCallback(() => {
    updateToken(null);
    setUser(null);
  }, [updateToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
