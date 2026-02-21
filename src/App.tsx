import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from './pages/Dashboard';
import { StatePage } from './pages/StatePage';
import { CandidatePage } from './pages/CandidatePage';
import { SearchPage } from './pages/SearchPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-950 text-white">
          {/* Navigation */}
          <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="flex h-14 items-center justify-between">
                <Link to="/" className="flex items-center gap-2 font-bold text-white">
                  <span className="text-lg">🏛️</span>
                  <span className="hidden sm:inline">Federal Candidates Tracker</span>
                  <span className="sm:hidden">FCT</span>
                </Link>
                <nav className="flex items-center gap-1">
                  <NavItem to="/" label="Dashboard" />
                  <NavItem to="/search" label="Search" />
                </nav>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/state/:code" element={<StatePage />} />
              <Route path="/candidate/:id" element={<CandidatePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-800 py-8 mt-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center text-sm text-slate-600">
              <p>
                Data sourced from{' '}
                <a href="https://www.fec.gov" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300">FEC.gov</a>,{' '}
                <a href="https://ballotpedia.org" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300">Ballotpedia</a>, and state election boards.
              </p>
              <p className="mt-1">Built for civic transparency. MIT License.</p>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-md text-sm transition-colors ${
          isActive
            ? 'bg-slate-800 text-white'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

function NotFound() {
  return (
    <div className="py-20 text-center">
      <h2 className="text-2xl font-bold text-white">404 — Not Found</h2>
      <p className="mt-2 text-slate-400">That page doesn't exist.</p>
      <Link to="/" className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300">
        ← Back to dashboard
      </Link>
    </div>
  );
}
