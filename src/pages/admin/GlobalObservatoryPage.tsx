import { Globe, ArrowLeft, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

export function GlobalObservatoryPage() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Lock className="h-8 w-8 text-slate-500 mx-auto" />
            <h2 className="text-lg font-semibold text-white">Access Denied</h2>
            <p className="text-sm text-slate-400">This page is restricted to administrators.</p>
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Elections
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Globe className="h-6 w-6 text-cyan-400" />
          <h1 className="text-2xl font-bold text-white">Global Observatory</h1>
          <Badge variant="default" className="text-[10px]">Admin Only</Badge>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          International election tracking and monitoring
        </p>
      </div>

      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <Globe className="h-12 w-12 text-slate-600 mx-auto" />
          <h2 className="text-lg font-semibold text-white">
            Global Observatory — Coming Soon
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Track international elections worldwide with cross-country comparison tools,
            election calendars, democratic index monitoring, and global trend analysis.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Elections
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
