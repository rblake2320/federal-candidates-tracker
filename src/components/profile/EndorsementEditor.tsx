import { useState, type FormEvent } from 'react';
import { Plus, Trash2, X, Loader2, Quote } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CandidateEndorsement } from '@/types/models';
import { addEndorsement, deleteEndorsement } from '@/lib/api';

interface EndorsementEditorProps {
  endorsements: CandidateEndorsement[];
  onChange: (endorsements: CandidateEndorsement[]) => void;
}

export function EndorsementEditor({ endorsements, onChange }: EndorsementEditorProps) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {endorsements.length} endorsement{endorsements.length !== 1 ? 's' : ''}
        </p>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Endorsement
          </button>
        )}
      </div>

      {adding && (
        <EndorsementForm
          onSave={async (data) => {
            const result = await addEndorsement(data);
            onChange([result.endorsement, ...endorsements]);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {endorsements.length === 0 && !adding && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">
            No endorsements yet. Add endorsements to showcase support for your campaign.
          </CardContent>
        </Card>
      )}

      {endorsements.map((end) => (
        <EndorsementCard
          key={end.id}
          endorsement={end}
          onDelete={async () => {
            await deleteEndorsement(end.id);
            onChange(endorsements.filter((e) => e.id !== end.id));
          }}
        />
      ))}
    </div>
  );
}

// ── Endorsement Card ────────────────────────────────────────

function EndorsementCard({
  endorsement,
  onDelete,
}: {
  endorsement: CandidateEndorsement;
  onDelete: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  return (
    <Card className="group">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <Quote className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            {endorsement.quote && (
              <p className="text-sm text-slate-300 italic mb-2">"{endorsement.quote}"</p>
            )}
            <div className="text-sm">
              <span className="font-medium text-white">{endorsement.endorser_name}</span>
              {endorsement.endorser_title && (
                <span className="text-slate-500">, {endorsement.endorser_title}</span>
              )}
              {endorsement.endorser_org && (
                <span className="text-slate-500"> — {endorsement.endorser_org}</span>
              )}
            </div>
            {endorsement.endorsement_date && (
              <p className="text-xs text-slate-600 mt-1">
                {new Date(endorsement.endorsement_date).toLocaleDateString()}
              </p>
            )}
          </div>
          <button
            onClick={async () => {
              setDeleting(true);
              try { await onDelete(); } finally { setDeleting(false); }
            }}
            disabled={deleting}
            className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
            title="Delete"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Endorsement Form ────────────────────────────────────────

function EndorsementForm({
  onSave,
  onCancel,
}: {
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [endorserName, setEndorserName] = useState('');
  const [endorserTitle, setEndorserTitle] = useState('');
  const [endorserOrg, setEndorserOrg] = useState('');
  const [quote, setQuote] = useState('');
  const [endorsementDate, setEndorsementDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!endorserName.trim()) {
      setError('Endorser name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        endorser_name: endorserName.trim(),
        endorser_title: endorserTitle.trim() || null,
        endorser_org: endorserOrg.trim() || null,
        quote: quote.trim() || null,
        endorsement_date: endorsementDate || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setSaving(false);
    }
  }

  return (
    <Card className="border-blue-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          New Endorsement
          <button onClick={onCancel} className="p-1 rounded text-slate-400 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="px-3 py-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Endorser Name *</label>
              <input
                type="text"
                required
                maxLength={200}
                value={endorserName}
                onChange={(e) => setEndorserName(e.target.value)}
                placeholder="e.g. Jane Smith"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
              <input
                type="text"
                maxLength={200}
                value={endorserTitle}
                onChange={(e) => setEndorserTitle(e.target.value)}
                placeholder="e.g. Mayor"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Organization</label>
              <input
                type="text"
                maxLength={200}
                value={endorserOrg}
                onChange={(e) => setEndorserOrg(e.target.value)}
                placeholder="e.g. City of Springfield"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
              <input
                type="date"
                value={endorsementDate}
                onChange={(e) => setEndorsementDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Quote</label>
            <textarea
              rows={2}
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="What did they say about your candidacy?"
              className={inputCls}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
                'bg-blue-600 text-white hover:bg-blue-500 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Add Endorsement
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const inputCls = cn(
  'w-full px-3 py-2 rounded-lg text-sm',
  'bg-slate-800 border border-slate-700 text-white placeholder-slate-500',
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
);
