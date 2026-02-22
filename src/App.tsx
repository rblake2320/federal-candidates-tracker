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
import { CongressPage } from './pages/CongressPage';
import { CampaignPortalPage } from './pages/CampaignPortalPage';
import { RealTimeMonitorPage } from './pages/RealTimeMonitorPage';
import { DataStewardPage } from './pages/DataStewardPage';
import { CivicDataApisPage } from './pages/CivicDataApisPage';
import { CongressAdminPage } from './pages/admin/CongressAdminPage';
import { GlobalObservatoryPage } from './pages/admin/GlobalObservatoryPage';

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
              <Route path="/congress" element={<CongressPage />} />
              <Route path="/portal/candidate" element={<CandidatePortalPage />} />
              <Route path="/portal/campaign" element={<CampaignPortalPage />} />
              <Route path="/watchlist" element={<WatchlistPage />} />
              <Route path="/tools/realtime" element={<RealTimeMonitorPage />} />
              <Route path="/tools/data-steward" element={<DataStewardPage />} />
              <Route path="/tools/civic-apis" element={<CivicDataApisPage />} />
              <Route path="/admin/congress" element={<CongressAdminPage />} />
              <Route path="/admin/observatory" element={<GlobalObservatoryPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
