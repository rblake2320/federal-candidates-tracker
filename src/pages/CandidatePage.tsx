import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCandidate, getCandidateProfile, claimCandidateProfile } from '../lib/api';
import type { CandidateDetail, CandidateStatus, CandidateProfileResponse } from '../types/models';
import type { BadgeProps } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  DollarSign,
  BarChart3,
  Calendar,
  ExternalLink as ExternalLinkIcon,
  Globe,
  FileText,
  User,
  AlertCircle,
  ShieldCheck,
  Quote,
  Loader2,
  Video,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────

const PARTY_FULL: Record<string, string> = {
  democratic: 'Democratic Party',
  republican: 'Republican Party',
  libertarian: 'Libertarian Party',
  green: 'Green Party',
  independent: 'Independent',
  constitution: 'Constitution Party',
  no_party: 'No Party Affiliation',
  other: 'Other',
};

type BadgeVariant = NonNullable<BadgeProps['variant']>;

const PARTY_BADGE_VARIANT: Record<string, BadgeVariant> = {
  democratic: 'democratic',
  republican: 'republican',
  libertarian: 'libertarian',
  green: 'green',
  independent: 'independent',
  constitution: 'other',
  no_party: 'other',
  other: 'other',
};

const STATUS_BADGE_VARIANT: Record<CandidateStatus, string> = {
  declared: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
  filed: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
  qualified: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
  exploratory: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
  withdrawn: 'bg-slate-500/10 text-slate-400 border border-slate-500/30',
  won: 'bg-green-500/10 text-green-400 border border-green-500/30',
  lost: 'bg-red-500/10 text-red-400 border border-red-500/30',
  runoff: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
};

// ── Main Component ─────────────────────────────────────────

export function CandidatePage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();

  const { data, isLoading, isError } = useQuery<{ data: CandidateDetail }>({
    queryKey: ['candidate', id],
    queryFn: () => getCandidate(id!),
    enabled: !!id,
  });

  const { data: profileData } = useQuery<CandidateProfileResponse>({
    queryKey: ['candidate-profile', id],
    queryFn: () => getCandidateProfile(id!),
    enabled: !!id,
  });

  if (isLoading) return <LoadingSkeleton />;
  if (isError || !data?.data) return <ErrorState />;

  const c = data.data;
  const profile = profileData?.profile;
  const profilePositions = profileData?.positions || [];
  const profileEndorsements = profileData?.endorsements || [];
  const raceLabel =
    c.office === 'senate'
      ? `U.S. Senate \u2014 ${c.state_name}`
      : c.office === 'governor'
        ? `Governor \u2014 ${c.state_name}`
        : `${c.state_name} District ${c.district}`;

  const hasFinanceData = !!(c.total_raised || c.total_spent || c.cash_on_hand);
  const hasPollingData = !!c.latest_poll_pct;
  const hasAnyLink = !!(c.website || c.ballotpedia_url || c.fec_candidate_id);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* ── Breadcrumb ─────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link
          to="/"
          className="inline-flex items-center gap-1 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Elections
        </Link>
        <span>/</span>
        <Link
          to={`/state/${c.state}`}
          className="hover:text-slate-300 transition-colors"
        >
          {c.state}
        </Link>
        <span>/</span>
        <span className="text-slate-300 truncate">{c.full_name}</span>
      </nav>

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start gap-5">
        {c.photo_url ? (
          <img
            src={c.photo_url}
            alt={c.full_name}
            className="w-20 h-20 rounded-full object-cover border-2 border-slate-700 shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-2xl text-slate-500 border-2 border-slate-700 shrink-0">
            {(c.first_name?.[0] || '') + (c.last_name?.[0] || '')}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-bold text-white truncate">
            {c.full_name}
          </h2>

          <div className="flex items-center gap-2 mt-1">
            <Badge variant={PARTY_BADGE_VARIANT[c.party] || 'other'}>
              {PARTY_FULL[c.party] || c.party}
            </Badge>
          </div>

          <p className="text-sm text-slate-500 mt-1">{raceLabel}</p>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge
              className={cn(
                STATUS_BADGE_VARIANT[c.status] ||
                  'bg-slate-500/10 text-slate-400 border border-slate-500/30'
              )}
            >
              {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
            </Badge>

            {c.incumbent && (
              <Badge variant="default">Incumbent</Badge>
            )}

            {c.cook_rating && (
              <Badge variant="secondary">{c.cook_rating}</Badge>
            )}

            {c.is_competitive && (
              <Badge variant="special">Competitive</Badge>
            )}
          </div>
        </div>
      </div>

      {/* ── Bio (if available) ─────────────────────────── */}
      {c.bio && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              Biography
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400 leading-relaxed">{c.bio}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Campaign Finance ───────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            Campaign Finance
          </CardTitle>
          {hasFinanceData && c.finance_updated_at && (
            <CardDescription>
              Last updated {new Date(c.finance_updated_at).toLocaleDateString()}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {hasFinanceData ? (
            <div className="grid grid-cols-3 gap-4">
              <FinanceStat label="Total Raised" value={c.total_raised} />
              <FinanceStat label="Total Spent" value={c.total_spent} />
              <FinanceStat label="Cash on Hand" value={c.cash_on_hand} />
            </div>
          ) : (
            <EmptyPlaceholder message="No finance data reported yet" />
          )}
        </CardContent>
      </Card>

      {/* ── Latest Polling ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-400" />
            Latest Polling
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasPollingData ? (
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-white tabular-nums">
                {c.latest_poll_pct}%
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div className="text-sm text-slate-500">
                {c.poll_source && <span>{c.poll_source}</span>}
                {c.poll_date && (
                  <span>
                    {c.poll_source ? ' \u00B7 ' : ''}
                    {new Date(c.poll_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <EmptyPlaceholder message="No polling data available" />
          )}
        </CardContent>
      </Card>

      {/* ── Links ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLinkIcon className="h-4 w-4 text-slate-400" />
            Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasAnyLink ? (
            <div className="space-y-2">
              {c.website && (
                <CandidateLink
                  icon={<Globe className="h-4 w-4" />}
                  label="Campaign Website"
                  href={c.website}
                />
              )}
              {c.ballotpedia_url && (
                <>
                  {c.website && <Separator className="my-2" />}
                  <CandidateLink
                    icon={<FileText className="h-4 w-4" />}
                    label="Ballotpedia"
                    href={c.ballotpedia_url}
                  />
                </>
              )}
              {c.fec_candidate_id && (
                <>
                  {(c.website || c.ballotpedia_url) && (
                    <Separator className="my-2" />
                  )}
                  <CandidateLink
                    icon={<DollarSign className="h-4 w-4" />}
                    label="FEC Filing"
                    href={`https://www.fec.gov/data/candidate/${c.fec_candidate_id}/`}
                  />
                </>
              )}
            </div>
          ) : (
            <EmptyPlaceholder message="No external links available" />
          )}
        </CardContent>
      </Card>

      {/* ── Election Details ───────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-400" />
            Election Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-slate-500">Election Date</dt>
            <dd className="text-slate-300">
              {new Date(c.election_date).toLocaleDateString()}
            </dd>

            {c.primary_date && (
              <>
                <dt className="text-slate-500">Primary Date</dt>
                <dd className="text-slate-300">
                  {new Date(c.primary_date).toLocaleDateString()}
                </dd>
              </>
            )}

            {c.filing_deadline && (
              <>
                <dt className="text-slate-500">Filing Deadline</dt>
                <dd className="text-slate-300">
                  {new Date(c.filing_deadline).toLocaleDateString()}
                </dd>
              </>
            )}

            {c.filing_date && (
              <>
                <dt className="text-slate-500">Filing Date</dt>
                <dd className="text-slate-300">
                  {new Date(c.filing_date).toLocaleDateString()}
                </dd>
              </>
            )}

            <Separator className="col-span-2 my-1" />

            <dt className="text-slate-500">Election Type</dt>
            <dd className="text-slate-300">
              <Badge variant={c.election_type === 'special' ? 'special' : 'general'}>
                {c.election_type.charAt(0).toUpperCase() +
                  c.election_type.slice(1)}
              </Badge>
            </dd>

            <dt className="text-slate-500">Data Confidence</dt>
            <dd>
              <ConfidenceMeter value={c.data_confidence || 0} />
            </dd>
          </dl>
        </CardContent>

        {c.last_verified && (
          <CardFooter className="text-xs text-slate-600">
            Last verified {new Date(c.last_verified).toLocaleDateString()}
            {c.verification_notes && ` \u2014 ${c.verification_notes}`}
          </CardFooter>
        )}
      </Card>

      {/* ── Candidate Profile (self-managed content) ────── */}
      {profile && (
        <>
          {profile.headline && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-medium">Verified Candidate</span>
                </div>
                <p className="text-lg font-medium text-white">{profile.headline}</p>
              </CardContent>
            </Card>
          )}

          {profile.about && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  About the Candidate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                  {profile.about}
                </p>
              </CardContent>
            </Card>
          )}

          {profile.platform_summary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-400" />
                  Platform
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                  {profile.platform_summary}
                </p>
              </CardContent>
            </Card>
          )}

          {profile.video_url && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-purple-400" />
                  Campaign Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={profile.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  Watch Campaign Video
                  <ExternalLinkIcon className="h-3.5 w-3.5" />
                </a>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ── Platform Positions ───────────────────────────── */}
      {profilePositions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-400" />
              Platform Positions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profilePositions
              .sort((a, b) => a.priority - b.priority)
              .map((pos) => (
                <div key={pos.id} className="border-l-2 border-blue-500/30 pl-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{pos.title}</span>
                    {pos.stance && (
                      <Badge variant="secondary" className="text-xs">{pos.stance}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">{pos.description}</p>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* ── Endorsements ─────────────────────────────────── */}
      {profileEndorsements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Quote className="h-4 w-4 text-blue-400" />
              Endorsements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileEndorsements.map((end) => (
              <div key={end.id}>
                {end.quote && (
                  <p className="text-sm text-slate-300 italic mb-1">"{end.quote}"</p>
                )}
                <p className="text-sm text-slate-500">
                  — <span className="text-white">{end.endorser_name}</span>
                  {end.endorser_title && `, ${end.endorser_title}`}
                  {end.endorser_org && ` (${end.endorser_org})`}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Social Links (from profile) ──────────────────── */}
      {profile && (profile.social_twitter || profile.social_facebook || profile.social_instagram || profile.social_youtube) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-slate-400" />
              Social Media
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {profile.social_twitter && (
              <SocialBadge href={profile.social_twitter} icon={<Twitter className="h-3.5 w-3.5" />} label="Twitter" />
            )}
            {profile.social_facebook && (
              <SocialBadge href={profile.social_facebook} icon={<Facebook className="h-3.5 w-3.5" />} label="Facebook" />
            )}
            {profile.social_instagram && (
              <SocialBadge href={profile.social_instagram} icon={<Instagram className="h-3.5 w-3.5" />} label="Instagram" />
            )}
            {profile.social_youtube && (
              <SocialBadge href={profile.social_youtube} icon={<Youtube className="h-3.5 w-3.5" />} label="YouTube" />
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Claim Profile Button ─────────────────────────── */}
      {!profile && isAuthenticated && user?.role !== 'candidate' && (
        <ClaimProfileButton candidateId={c.id} />
      )}
    </div>
  );
}

// ── Profile Sub-components ─────────────────────────────────

function SocialBadge({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
    >
      {icon}
      {label}
    </a>
  );
}

function ClaimProfileButton({ candidateId }: { candidateId: string }) {
  const [claiming, setClaiming] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleClaim() {
    setClaiming(true);
    setResult(null);
    try {
      await claimCandidateProfile(candidateId);
      setResult('success');
    } catch (err) {
      setResult('error');
      setErrorMsg(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      setClaiming(false);
    }
  }

  if (result === 'success') {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="py-4 text-center">
          <ShieldCheck className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm text-emerald-400 font-medium">
            Claim submitted! An admin will review and verify your identity.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-4 text-center">
        <p className="text-sm text-slate-400 mb-3">
          Are you this candidate? Claim this profile to add your platform, endorsements, and social links.
        </p>
        {result === 'error' && (
          <p className="text-xs text-red-400 mb-2">{errorMsg}</p>
        )}
        <button
          onClick={handleClaim}
          disabled={claiming}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
            'bg-blue-600 text-white hover:bg-blue-500 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Claim This Profile
        </button>
      </CardContent>
    </Card>
  );
}

// ── Sub-components ─────────────────────────────────────────

function FinanceStat({
  label,
  value,
}: {
  label: string;
  value?: number | null;
}) {
  const formatted = value
    ? value >= 1_000_000
      ? `$${(value / 1_000_000).toFixed(1)}M`
      : value >= 1_000
        ? `$${(value / 1_000).toFixed(0)}K`
        : new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
          }).format(value)
    : '\u2014';

  return (
    <div>
      <div className="text-xl font-bold text-white tabular-nums">
        {formatted}
      </div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function CandidateLink({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 text-sm text-blue-400 hover:text-blue-300 transition-colors group py-1"
    >
      <span className="text-slate-500 group-hover:text-blue-400 transition-colors">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <ExternalLinkIcon className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

function EmptyPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 py-4 text-sm text-slate-600">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 80
      ? 'bg-emerald-500'
      : pct >= 50
        ? 'bg-amber-500'
        : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 tabular-nums">{pct}%</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Header skeleton */}
      <div className="flex gap-5">
        <Skeleton className="w-20 h-20 rounded-full shrink-0" />
        <div className="space-y-3 flex-1">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>

      {/* Card skeletons */}
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ErrorState() {
  return (
    <div className="max-w-3xl mx-auto">
      <Card className="border-red-800/50 bg-red-900/20">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-300 font-medium">
            Failed to load candidate data.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Elections
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
