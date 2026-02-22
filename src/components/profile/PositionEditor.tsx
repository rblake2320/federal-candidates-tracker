import { useState, type FormEvent } from 'react';
import { Plus, Trash2, Edit3, X, Loader2, GripVertical } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CandidatePosition } from '@/types/models';
import { addPosition, updatePosition, deletePosition } from '@/lib/api';

interface PositionEditorProps {
  positions: CandidatePosition[];
  onChange: (positions: CandidatePosition[]) => void;
}

const STANCE_OPTIONS = ['Support', 'Oppose', 'Reform', 'Expand', 'Reduce', 'Maintain'];

export function PositionEditor({ positions, onChange }: PositionEditorProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {positions.length} position{positions.length !== 1 ? 's' : ''}
        </p>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Position
          </button>
        )}
      </div>

      {adding && (
        <PositionForm
          onSave={async (data) => {
            const result = await addPosition(data);
            onChange([...positions, result.position]);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {positions.length === 0 && !adding && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">
            No platform positions yet. Add your first position to let voters know where you stand.
          </CardContent>
        </Card>
      )}

      {positions
        .sort((a, b) => a.priority - b.priority || a.created_at.localeCompare(b.created_at))
        .map((pos) => (
          <PositionCard
            key={pos.id}
            position={pos}
            isEditing={editing === pos.id}
            onEdit={() => setEditing(pos.id)}
            onCancelEdit={() => setEditing(null)}
            onUpdate={async (data) => {
              const result = await updatePosition(pos.id, data);
              onChange(positions.map((p) => (p.id === pos.id ? result.position : p)));
              setEditing(null);
            }}
            onDelete={async () => {
              await deletePosition(pos.id);
              onChange(positions.filter((p) => p.id !== pos.id));
            }}
          />
        ))}
    </div>
  );
}

// ── Position Card ───────────────────────────────────────────

function PositionCard({
  position,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}: {
  position: CandidatePosition;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (data: PositionFormData) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  if (isEditing) {
    return (
      <PositionForm
        initial={position}
        onSave={onUpdate}
        onCancel={onCancelEdit}
      />
    );
  }

  return (
    <Card className="group">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <GripVertical className="h-4 w-4 text-slate-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium text-white truncate">{position.title}</h4>
              {position.stance && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {position.stance}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-400 line-clamp-2">{position.description}</p>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={onEdit}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Edit"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={async () => {
                setDeleting(true);
                try { await onDelete(); } finally { setDeleting(false); }
              }}
              disabled={deleting}
              className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Delete"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Position Form ───────────────────────────────────────────

interface PositionFormData {
  title: string;
  stance?: string;
  description: string;
  priority?: number;
  [key: string]: unknown;
}

function PositionForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: CandidatePosition;
  onSave: (data: PositionFormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || '');
  const [stance, setStance] = useState(initial?.stance || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [priority, setPriority] = useState(initial?.priority ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ title: title.trim(), stance: stance || undefined, description: description.trim(), priority });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setSaving(false);
    }
  }

  return (
    <Card className="border-blue-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          {initial ? 'Edit Position' : 'New Position'}
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

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Title *</label>
            <input
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Healthcare Reform"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Stance</label>
            <div className="flex flex-wrap gap-1.5">
              {STANCE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStance(stance === s ? '' : s)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                    stance === s
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/50'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Description *</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain your position in detail..."
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Priority (lower = higher)</label>
            <input
              type="number"
              min={0}
              max={99}
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
              className={cn(inputCls, 'w-20')}
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
              {initial ? 'Update' : 'Add'}
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
