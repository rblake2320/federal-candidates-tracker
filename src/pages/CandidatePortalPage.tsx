import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  FileText,
  Award,
  Eye,
  Loader2,
  ShieldCheck,
  Clock,
  Globe,
  EyeOff,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { PositionEditor } from '@/components/profile/PositionEditor';
import { EndorsementEditor } from '@/components/profile/EndorsementEditor';
import {
  getMyProfile,
  togglePublishProfile,
} from '@/lib/api';
import type {
  CandidateProfile,
  CandidatePosition,
  CandidateEndorsement,
} from '@/types/models';

type Tab = 'overview' | 'positions' | 'endorsements' | 'preview';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', icon: User },
  { key: 'positions', label: 'Positions', icon: FileText },
  { key: 'endorsements', label: 'Endorsements', icon: Award },
  { key: 'preview', label: 'Preview', icon: Eye },
];

export function CandidatePortalPage() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [positions, setPositions] = useState<CandidatePosition[]>([]);
  const [endorsements, setEndorsements] = useState<CandidateEndorsement[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/');
      return;
    }
    if (user.role !== 'candidate' && user.role !== 'admin') {
      setLoading(false);
      setError('You need an approved candidate profile to access this portal.');
      return;
    }
    if (!user.candidate_id) {
      setLoading(false);
      setError('No linked candidate profile found. Your claim may still be pending.');
      return;
    }

    async function loadProfile() {
      try {
        const data = await getMyProfile();
        setProfile(data.profile);
        setPositions(data.positions || []);
        setEndorsements(data.endorsements || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user, authLoading, navigate]);

  async function handleTogglePublish() {
    setPublishing(true);
    try {
      const result = await togglePublishProfile();
      setProfile((prev) => prev ? { ...prev, is_published: result.is_published } : prev);
    } catch {
      // ignore
    } finally {
      setPublishing(false);
    }
  }

  if (authLoading || loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="border-amber-800/50 bg-amber-900/10">
          <CardContent className="py-8 text-center">
            <Clock className="h-8 w-8 text-amber-400 mx-auto mb-3" />
            <p className="text-amber-300 font-medium">{error}</p>
            <Link
              to="/"
              className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Back to Elections
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">
            No profile data found. Please contact an admin.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Candidate Portal</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your public candidate profile
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={profile.is_published ? 'default' : 'secondary'}
            className="flex items-center gap-1.5"
          >
            {profile.is_published ? (
              <><Globe className="h-3 w-3" /> Published</>
            ) : (
              <><EyeOff className="h-3 w-3" /> Draft</>
            )}
          </Badge>
          <button
            onClick={handleTogglePublish}
            disabled={publishing}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              profile.is_published
                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                : 'bg-emerald-600 text-white hover:bg-emerald-500',
              'disabled:opacity-50'
            )}
          >
            {publishing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {profile.is_published ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Claim Status */}
      {profile.claim_status === 'approved' && (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Verified candidate profile
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800 pb-px">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2',
              activeTab === key
                ? 'text-blue-400 border-blue-500 bg-blue-500/5'
                : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <ProfileEditor
          profile={profile}
          onUpdate={(updated) => setProfile(updated)}
        />
      )}

      {activeTab === 'positions' && (
        <PositionEditor
          positions={positions}
          onChange={setPositions}
        />
      )}

      {activeTab === 'endorsements' && (
        <EndorsementEditor
          endorsements={endorsements}
          onChange={setEndorsements}
        />
      )}

      {activeTab === 'preview' && (
        <ProfilePreview
          profile={profile}
          positions={positions}
          endorsements={endorsements}
        />
      )}
    </div>
  );
}

// ── Preview ─────────────────────────────────────────────────

function ProfilePreview({
  profile,
  positions,
  endorsements,
}: {
  profile: CandidateProfile;
  positions: CandidatePosition[];
  endorsements: CandidateEndorsement[];
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        This is how your profile appears to voters.
      </p>

      {profile.headline && (
        <Card>
          <CardContent className="py-4">
            <p className="text-lg font-medium text-white">{profile.headline}</p>
          </CardContent>
        </Card>
      )}

      {profile.about && (
        <Card>
          <CardHeader><CardTitle className="text-base">About</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{profile.about}</p>
          </CardContent>
        </Card>
      )}

      {profile.platform_summary && (
        <Card>
          <CardHeader><CardTitle className="text-base">Platform</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{profile.platform_summary}</p>
          </CardContent>
        </Card>
      )}

      {positions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Positions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {positions
              .sort((a, b) => a.priority - b.priority)
              .map((pos) => (
                <div key={pos.id}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{pos.title}</span>
                    {pos.stance && <Badge variant="secondary" className="text-xs">{pos.stance}</Badge>}
                  </div>
                  <p className="text-sm text-slate-400">{pos.description}</p>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {endorsements.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Endorsements</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {endorsements.map((end) => (
              <div key={end.id}>
                {end.quote && (
                  <p className="text-sm text-slate-300 italic mb-1">"{end.quote}"</p>
                )}
                <p className="text-sm text-slate-500">
                  — {end.endorser_name}
                  {end.endorser_title && `, ${end.endorser_title}`}
                  {end.endorser_org && ` (${end.endorser_org})`}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(profile.social_twitter || profile.social_facebook || profile.social_instagram || profile.social_youtube) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Social Media</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {profile.social_twitter && <SocialLink label="Twitter" href={profile.social_twitter} />}
            {profile.social_facebook && <SocialLink label="Facebook" href={profile.social_facebook} />}
            {profile.social_instagram && <SocialLink label="Instagram" href={profile.social_instagram} />}
            {profile.social_youtube && <SocialLink label="YouTube" href={profile.social_youtube} />}
          </CardContent>
        </Card>
      )}

      {!profile.headline && !profile.about && positions.length === 0 && endorsements.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">
            Your profile is empty. Use the other tabs to add content.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SocialLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
    >
      <Globe className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-10 w-full" />
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
