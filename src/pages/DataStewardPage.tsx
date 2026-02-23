import { Database, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function DataStewardPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Data Steward</h1>
          <Badge variant="default" className="text-[10px]">Coming Soon</Badge>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Data curation and quality management tools
        </p>
      </div>

      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <Database className="h-12 w-12 text-slate-600 mx-auto" />
          <h2 className="text-lg font-semibold text-white">
            Data Steward Tools — Coming Soon
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Tools for managing data quality including duplicate detection, source verification,
            data confidence scoring, bulk corrections, and audit trails.
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
