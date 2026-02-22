import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { StatePage } from './pages/StatePage';
import { CandidatePage } from './pages/CandidatePage';
import { SearchPage } from './pages/SearchPage';
import { ElectionsPage } from './pages/ElectionsPage';
import { CandidatePortalPage } from './pages/CandidatePortalPage';
import { WatchlistPage } from './pages/WatchlistPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function NotFound() {
  return (
    <div className="py-20 text-center">
      <h2 className="text-2xl font-bold text-white">404 — Not Found</h2>
      <p className="mt-2 text-slate-400">That page doesn't exist.</p>
      <Link to="/" className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300">
        ← Back to Elections
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<ElectionsPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/state/:code" element={<StatePage />} />
              <Route path="/candidate/:id" element={<CandidatePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/portal/candidate" element={<CandidatePortalPage />} />
              <Route path="/watchlist" element={<WatchlistPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
