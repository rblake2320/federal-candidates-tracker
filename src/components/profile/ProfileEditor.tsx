import { useState, type FormEvent } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CandidateProfile } from '@/types/models';
import { updateProfile } from '@/lib/api';

interface ProfileEditorProps {
  profile: CandidateProfile;
  onUpdate: (profile: CandidateProfile) => void;
}

export function ProfileEditor({ profile, onUpdate }: ProfileEditorProps) {
  const [form, setForm] = useState({
    headline: profile.headline || '',
    about: profile.about || '',
    platform_summary: profile.platform_summary || '',
    video_url: profile.video_url || '',
    social_twitter: profile.social_twitter || '',
    social_facebook: profile.social_facebook || '',
    social_instagram: profile.social_instagram || '',
    social_youtube: profile.social_youtube || '',
    contact_email: profile.contact_email || '',
    contact_phone: profile.contact_phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const result = await updateProfile(form);
      onUpdate(result.profile);
      setMessage({ type: 'success', text: 'Profile saved successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          className={cn(
            'px-3 py-2 text-sm rounded-lg border',
            message.type === 'success'
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
              : 'text-red-400 bg-red-500/10 border-red-500/30'
          )}
        >
          {message.text}
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Headline" hint="A short tagline for your campaign">
            <input
              type="text"
              maxLength={300}
              value={form.headline}
              onChange={(e) => set('headline', e.target.value)}
              placeholder="e.g. Fighting for affordable healthcare in District 5"
              className={inputCls}
            />
          </Field>

          <Field label="About" hint="Tell voters about yourself">
            <textarea
              rows={4}
              value={form.about}
              onChange={(e) => set('about', e.target.value)}
              placeholder="Your background, experience, and why you're running..."
              className={inputCls}
            />
          </Field>

          <Field label="Platform Summary" hint="Brief overview of your key platform positions">
            <textarea
              rows={3}
              value={form.platform_summary}
              onChange={(e) => set('platform_summary', e.target.value)}
              placeholder="Your core policy priorities..."
              className={inputCls}
            />
          </Field>

          <Field label="Campaign Video URL" hint="YouTube or Vimeo link">
            <input
              type="url"
              value={form.video_url}
              onChange={(e) => set('video_url', e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className={inputCls}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Social Media */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Social Media</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Twitter / X">
            <input
              type="url"
              value={form.social_twitter}
              onChange={(e) => set('social_twitter', e.target.value)}
              placeholder="https://twitter.com/yourhandle"
              className={inputCls}
            />
          </Field>
          <Field label="Facebook">
            <input
              type="url"
              value={form.social_facebook}
              onChange={(e) => set('social_facebook', e.target.value)}
              placeholder="https://facebook.com/yourpage"
              className={inputCls}
            />
          </Field>
          <Field label="Instagram">
            <input
              type="url"
              value={form.social_instagram}
              onChange={(e) => set('social_instagram', e.target.value)}
              placeholder="https://instagram.com/yourhandle"
              className={inputCls}
            />
          </Field>
          <Field label="YouTube">
            <input
              type="url"
              value={form.social_youtube}
              onChange={(e) => set('social_youtube', e.target.value)}
              placeholder="https://youtube.com/@yourchannel"
              className={inputCls}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Public Email">
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => set('contact_email', e.target.value)}
              placeholder="campaign@example.com"
              className={inputCls}
            />
          </Field>
          <Field label="Public Phone">
            <input
              type="tel"
              value={form.contact_phone}
              onChange={(e) => set('contact_phone', e.target.value)}
              placeholder="(555) 123-4567"
              className={inputCls}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className={cn(
            'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium',
            'bg-blue-600 text-white hover:bg-blue-500 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Profile
        </button>
      </div>
    </form>
  );
}

// ── Helpers ─────────────────────────────────────────────────

const inputCls = cn(
  'w-full px-3 py-2 rounded-lg text-sm',
  'bg-slate-800 border border-slate-700 text-white placeholder-slate-500',
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
);

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      {hint && <p className="text-xs text-slate-500 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}
