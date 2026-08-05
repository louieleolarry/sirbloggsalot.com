import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarWrapper from '../components/Navbar';
import {
  Search,
  Loader,
  Check,
  ArrowUpDown,
  RefreshCw,
  Sparkles,
  Download,
  Plus,
  ListPlus,
  ChevronRight,
  ChevronDown,
  Layers,
  Table2,
  XCircle,
  X,
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../utils/apiClient';
import { cachedFetch, getCached, invalidate } from '../utils/apiCache';
import { watchTopicAdd } from '../utils/topicAddOutcomes';
import { useModals } from '../contexts/ModalContext';
import { useImpersonation } from '../contexts/ImpersonationContext';
import Tooltip from '../components/Tooltip';
import InfoTip from '../components/InfoTip';
import MetricChip from '../components/MetricChip';
import Pagination from '../components/Pagination';

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------

// Compact volume formatting: 2400 -> "2.4K", 1200000 -> "1.2M".
const formatVolume = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}K`;
  return String(v);
};

// KD and intent chips come from the shared MetricChip (one canonical KD color
// scale + built-in plain-words definitions on hover/tap).

const INTENT_OPTIONS = [
  { value: 'all', label: 'All intents' },
  { value: 'informational', label: 'Informational' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'transactional', label: 'Transactional' }
];

// Research mode (businessType) options. Values match the backend whitelist
// ('local' | 'ecommerce' | 'saas' | 'general' | 'dispensary'); labels are plain-language.
const MODE_OPTIONS = [
  { value: 'local', label: 'Local' },
  { value: 'dispensary', label: 'Dispensary' },
  { value: 'ecommerce', label: 'Online store' },
  { value: 'saas', label: 'SaaS' },
  { value: 'general', label: 'General' }
];

// Market options mirror the country set the backend's marketScope supports.
// Value is the country code we persist; locationName/languageCode match the
// backend MARKETS table exactly so a saved market re-runs against the right SERP.
const MARKET_OPTIONS = [
  // Scope options: research anchors to one market, volumes widen per scope.
  { code: 'GLOBAL_EN', locationName: 'United States', languageCode: 'en', label: 'English-speaking countries (US, UK, AU and more)' },
  { code: 'WORLDWIDE', locationName: 'United States', languageCode: 'en', label: 'Worldwide (every country, all languages)' },
  { code: 'US', locationName: 'United States', languageCode: 'en', label: 'United States' },
  { code: 'GB', locationName: 'United Kingdom', languageCode: 'en', label: 'United Kingdom' },
  { code: 'AU', locationName: 'Australia', languageCode: 'en', label: 'Australia' },
  { code: 'CA', locationName: 'Canada', languageCode: 'en', label: 'Canada' },
  { code: 'NZ', locationName: 'New Zealand', languageCode: 'en', label: 'New Zealand' },
  { code: 'IE', locationName: 'Ireland', languageCode: 'en', label: 'Ireland' },
  { code: 'ZA', locationName: 'South Africa', languageCode: 'en', label: 'South Africa' },
  { code: 'IN', locationName: 'India', languageCode: 'en', label: 'India' },
  { code: 'SG', locationName: 'Singapore', languageCode: 'en', label: 'Singapore' },
  { code: 'MY', locationName: 'Malaysia', languageCode: 'en', label: 'Malaysia' },
  { code: 'PH', locationName: 'Philippines', languageCode: 'en', label: 'Philippines' },
  { code: 'DE', locationName: 'Germany', languageCode: 'de', label: 'Germany' },
  { code: 'FR', locationName: 'France', languageCode: 'fr', label: 'France' },
  { code: 'ES', locationName: 'Spain', languageCode: 'es', label: 'Spain' },
  { code: 'IT', locationName: 'Italy', languageCode: 'it', label: 'Italy' },
  { code: 'NL', locationName: 'Netherlands', languageCode: 'nl', label: 'Netherlands' },
  { code: 'BE', locationName: 'Belgium', languageCode: 'nl', label: 'Belgium' },
  { code: 'PT', locationName: 'Portugal', languageCode: 'pt', label: 'Portugal' },
  { code: 'BR', locationName: 'Brazil', languageCode: 'pt', label: 'Brazil' },
  { code: 'MX', locationName: 'Mexico', languageCode: 'es', label: 'Mexico' },
  { code: 'AR', locationName: 'Argentina', languageCode: 'es', label: 'Argentina' },
  { code: 'SE', locationName: 'Sweden', languageCode: 'sv', label: 'Sweden' },
  { code: 'NO', locationName: 'Norway', languageCode: 'nb', label: 'Norway' },
  { code: 'DK', locationName: 'Denmark', languageCode: 'da', label: 'Denmark' },
  { code: 'FI', locationName: 'Finland', languageCode: 'fi', label: 'Finland' },
  { code: 'PL', locationName: 'Poland', languageCode: 'pl', label: 'Poland' },
  { code: 'AT', locationName: 'Austria', languageCode: 'de', label: 'Austria' },
  { code: 'CH', locationName: 'Switzerland', languageCode: 'de', label: 'Switzerland' },
  { code: 'JP', locationName: 'Japan', languageCode: 'ja', label: 'Japan' },
  { code: 'AE', locationName: 'United Arab Emirates', languageCode: 'en', label: 'United Arab Emirates' }
];

// Plain-language explainer of how research works for each mode. 3-4 sentences,
// no jargon, no em dashes. Shown in the "Where these come from" popover.
const MODE_EXPLAINERS = {
  local: "We look at what nearby competitors rank for and the searches people type when they want a local business like yours. We add location terms for your area and the towns around it. Then we check each keyword's search volume and how hard it is to rank against your site, and group them into topics.",
  dispensary: "We build keywords from the neighborhoods and towns around your store crossed with the products you carry and how people shop, like deals, delivery, and near me. We pull your real product lines from your site and add first-time and state law questions. Then we rank them by search volume but keep the hyper-local ones even when volume is thin, and every article stays within cannabis advertising rules.",
  ecommerce: "We look at what stores like yours rank for and the searches shoppers type when they're comparing or ready to buy. We expand those into buying guides, best-of lists, and product questions. Then we check each keyword's search volume and difficulty against your site's authority, and group them into topics.",
  saas: "We look at what your competitors rank for and the searches people type when they're looking for a tool like yours. We add comparisons, alternatives, and how-to questions your buyers ask. Then we check each keyword's search volume and difficulty against your site's authority, and group them into topics.",
  general: "We look at what similar sites in your space rank for and the related searches people actually type. We expand those into questions and guides your audience is looking for. Then we check each keyword's search volume and how hard it is to rank against your site, and group them into topics."
};

// Map a raw keyword `source` key to a full plain-words evidence line.
// Reads as a small, factual provenance line, not a watermark.
const SOURCE_EVIDENCE = {
  'competitor-gap': "Found by checking what competitors rank for that you don't",
  'competitor_gap': "Found by checking what competitors rank for that you don't",
  site: 'Found on your own site',
  suggestion: 'Found in related searches',
  related: 'Found in related searches',
  'seo-analysis': 'Found through competitor analysis',
  'keyword-research': 'Found through keyword research'
};

// Humanize a raw source key for the All-keywords "Source" column.
const SOURCE_LABELS = {
  'competitor-gap': 'Competitor gap',
  'competitor_gap': 'Competitor gap',
  site: 'Your site',
  suggestion: 'Related search',
  related: 'Related search',
  'seo-analysis': 'Competitor analysis',
  'keyword-research': 'Keyword research'
};

const humanizeSource = (source) => {
  const key = String(source || '').trim();
  if (!key) return 'Research';
  if (SOURCE_LABELS[key]) return SOURCE_LABELS[key];
  // Fallback: turn snake/kebab case into Sentence case ("competitor_gap" -> "Competitor gap").
  const spaced = key.replace(/[-_]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

// One quiet evidence line for a cluster, derived from the dominant source of
// its keywords. Returns null when there's no usable source signal.
const clusterEvidence = (keywords) => {
  const rows = Array.isArray(keywords) ? keywords : [];
  if (rows.length === 0) return null;
  const counts = {};
  for (const kw of rows) {
    const key = String(kw?.source || '').trim();
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  const [topKey] = entries[0];
  return SOURCE_EVIDENCE[topKey] || `Found via ${humanizeSource(topKey).toLowerCase()}`;
};

// Raw backend error strings (provider names, timeouts, stack fragments) must
// never reach the banner. Map them to plain copy a site owner can act on; the
// raw string still goes to the console for debugging.
const friendlyResearchError = (raw, fallback = 'Something went wrong while researching your keywords. Give it another try.') => {
  const s = String(raw || '').toLowerCase();
  if (!s) return fallback;
  if (s.includes('timeout') || s.includes('timed out') || s.includes('etimedout')) {
    return 'Keyword research took too long to answer. Give it another try.';
  }
  if (s.includes('rate limit') || s.includes('429') || s.includes('too many')) {
    return 'Our keyword data provider is busy right now. Try again in a few minutes.';
  }
  if (s.includes('econn') || s.includes('network') || s.includes('fetch failed') || s.includes('socket')) {
    return 'We had trouble reaching our keyword data provider. Try again in a minute.';
  }
  return fallback;
};

// Resolve the select value for a persisted market object. Match on
// countryCode first, then locationName, defaulting to the US.
const marketCodeFor = (market) =>
  MARKET_OPTIONS.find((m) => m.code === market?.countryCode)?.code ||
  MARKET_OPTIONS.find((m) => m.locationName === market?.locationName)?.code ||
  'US';

// One plain-English WHY line for a best-bet cluster, shown on the top plan
// slots. Reads from the cluster's own signals (low difficulty, competitor
// provenance) so it's specific, not boilerplate.
const clusterWhy = (cluster) => {
  const rows = Array.isArray(cluster?.keywords) ? cluster.keywords : [];
  const kds = rows.map((k) => Number(k.kd)).filter((n) => Number.isFinite(n));
  const avgKd = kds.length ? kds.reduce((a, b) => a + b, 0) / kds.length : null;
  const fromCompetitor = rows.some((k) => String(k.source || '').includes('competitor'));
  const easy = avgKd !== null && avgKd <= 30;
  if (easy && fromCompetitor) return 'Low difficulty for your site, and competitors already rank here.';
  if (easy) return 'Low difficulty for your site, so you can realistically rank.';
  if (fromCompetitor) return 'Competitors already rank here, so the demand is proven.';
  return 'Strong opportunity based on volume and how hard it is to rank.';
};

// Opportunity ranking key for a flat keyword row: prefer the backend score,
// fall back to a volume-to-difficulty ratio so the best bets sort to the top
// even when a row has no score.
const opportunityKey = (kw) => {
  const score = Number(kw?.score);
  if (Number.isFinite(score) && score > 0) return score;
  const volume = Number(kw?.volume) || 0;
  const kd = Number(kw?.kd) || 0;
  return volume / (kd + 10);
};

// Cluster-card "Best bet" threshold. Clusters at or above this score that also
// land in the top few by score get the emerald chip. Tuned against the
// service's cluster score (sum of the top ~5 member scores).
const BEST_BET_MIN_SCORE = 120;
const BEST_BET_MAX_COUNT = 3;

// ---------------------------------------------------------------------------
// Skeleton for the initial status/clusters fetch
// ---------------------------------------------------------------------------
// Mirrors the loaded Topics layout 1:1 so nothing jumps when data lands:
// tabs row -> settings + Re-run row -> first-run strip -> search + filters ->
// "Your next plan slots" header -> best-bet cards -> "More topics" header +
// cards. Same rows, same positions, same approximate block sizes.
function ClusterCardSkeleton() {
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-5 flex flex-col">
      {/* Title + best-bet chip */}
      <div className="flex items-center gap-2">
        <div className="h-5 bg-gray-200 rounded w-2/5" />
        <div className="h-4 bg-gray-100 rounded w-16" />
      </div>
      {/* Pillar line */}
      <div className="h-3 bg-gray-100 rounded w-1/3 mt-2" />
      {/* WHY line */}
      <div className="h-6 bg-gray-100 rounded w-3/4 mt-3" />
      {/* Keyword rows: keyword left, volume + KD right */}
      <div className="mt-4 space-y-2.5">
        {[1, 2, 3, 4, 5].map((j) => (
          <div key={j} className="flex items-center justify-between">
            <div className="h-3 bg-gray-100 rounded w-40" />
            <div className="flex items-center gap-2">
              <div className="h-3 bg-gray-100 rounded w-10" />
              <div className="h-4 bg-gray-100 rounded w-12" />
            </div>
          </div>
        ))}
      </div>
      {/* Stats footer */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
        <div className="h-3 bg-gray-100 rounded w-20" />
        <div className="h-3 bg-gray-100 rounded w-24" />
      </div>
      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <div className="h-9 bg-gray-200 rounded-lg w-32" />
        <div className="h-9 bg-gray-100 rounded-lg w-24" />
      </div>
    </div>
  );
}

function TopicsSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Tabs row (segmented tab pills) */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-8 pb-3">
          {[16, 24, 24, 20].map((w, i) => (
            <div key={i} className="h-5 bg-gray-100 rounded" style={{ width: `${w * 4}px` }} />
          ))}
        </div>
      </div>

      {/* Research settings + Re-run row, right-aligned */}
      <div className="flex items-center justify-end gap-2 mb-5">
        <div className="h-9 bg-gray-100 rounded-lg w-40" />
        <div className="h-9 bg-gray-100 rounded-lg w-24" />
      </div>

      {/* First-run 3-step strip */}
      <div className="h-16 bg-gray-100 rounded-xl mb-6" />

      {/* Search + filters row */}
      <div className="flex gap-2 mb-6">
        <div className="h-10 bg-gray-200 rounded-lg flex-1 max-w-sm" />
        <div className="h-10 bg-gray-100 rounded-lg w-40" />
        <div className="h-10 bg-gray-100 rounded-lg w-28" />
      </div>

      {/* Your next plan slots: section header line + best-bet cards */}
      <div className="mb-8">
        <div className="h-4 bg-gray-200 rounded w-56 mb-3" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => <ClusterCardSkeleton key={i} />)}
        </div>
      </div>

      {/* More topics: section header line + cards */}
      <div>
        <div className="h-4 bg-gray-100 rounded w-28 mb-3" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => <ClusterCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cluster card (Topics view)
// ---------------------------------------------------------------------------
// Quiet by default: adding a whole topic (pillar + supporting keywords) is the
// one primary action. Keyword rows are stripped to keyword + volume + KD; the
// per-keyword detail (intent, source, individual add) lives in the slide-over
// drawer opened by "See all". `whyLine` is passed for the top best-bet slots.
// `addedState` ({ status, publishDate, count } | undefined) flips the action
// row to a persistent "In your plan" outcome so adding feels done without
// leaving the page (no floating toast needed).
function ClusterCard({ cluster, isBestBet, whyLine, onAddCluster, onOpenDrawer, onDismiss, addingClusterKey, addedState, onViewPlan }) {
  const keywords = Array.isArray(cluster.keywords) ? cluster.keywords : [];
  const preview = keywords.slice(0, 5);
  const clusterKey = cluster.label || cluster.pillarKeyword;
  const isAdding = addingClusterKey === clusterKey;
  const evidence = clusterEvidence(keywords);
  const hiddenCount = keywords.length - preview.length;
  // How many articles this add would ACTUALLY schedule, precomputed by the
  // backend with the same judge the add runs (clusterAddableService). Absent on
  // research that predates the precompute, which keeps the generic label.
  const addable = Number.isFinite(Number(cluster.addableCount)) ? Number(cluster.addableCount) : null;
  const addLabel = addable && addable > 0
    ? `Add ${addable} article${addable === 1 ? '' : 's'} to your plan`
    : 'Add topic to plan';

  // Persistent add outcome, replacing the action button once resolved.
  // (Fully covered clusters never reach this card: the view hides them, and
  // the "In your plan" section is the record.)
  const addedNote = (() => {
    if (!addedState) return null;
    if (addedState.status === 'added') {
      const week = addedState.publishDate && !Number.isNaN(new Date(addedState.publishDate).getTime())
        ? new Date(addedState.publishDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : null;
      const countLine = addedState.count > 1
        ? `${addedState.count} articles scheduled`
        : week ? `Scheduled for the week of ${week}` : 'Scheduled';
      return { tone: 'emerald', title: 'In your plan', line: countLine };
    }
    if (addedState.status === 'expanding') {
      return {
        tone: 'emerald',
        title: 'Adding to your plan',
        line: addedState.count > 0
          ? `Up to ${addedState.count} articles will appear on your calendar within a minute.`
          : 'Articles will appear on your calendar within a minute.',
        spinner: true,
      };
    }
    if (addedState.status === 'slow') {
      return {
        tone: 'slate',
        title: 'Still working',
        line: 'This is taking longer than usual. Check your calendar in a couple of minutes.',
      };
    }
    // covered: the site already owns this intent. Calm, factual, not an error.
    // Prefer the backend's message (it can name the owning posts).
    return {
      tone: 'slate',
      check: true,
      title: 'Already covered',
      line: addedState.message || 'Writing it again would make your own pages compete, so we skipped it.',
    };
  })();

  return (
    <div className="rounded-xl bg-white border border-gray-200 flex flex-col">
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900 leading-snug">{cluster.label}</h3>
              {isBestBet && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                  <Sparkles className="w-2.5 h-2.5" /> Best bet
                </span>
              )}
            </div>
            {cluster.pillarKeyword && (
              <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5 min-w-0">
                <InfoTip term="pillar"><span className="whitespace-nowrap">Main keyword:</span></InfoTip>
                <span className="truncate">{cluster.pillarKeyword}</span>
              </p>
            )}
          </div>
          {/* Quiet dismiss: hides the card for good (undo lives in the toast). */}
          {onDismiss && !addedState && (
            <button
              type="button"
              onClick={() => onDismiss(cluster)}
              aria-label="Dismiss this topic"
              title="Not interested"
              className="shrink-0 -mr-1 -mt-1 rounded-lg p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-500"
              data-testid="cluster-dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* One-line WHY for the top best-bet slots. */}
        {whyLine && (
          <p className="mt-2 text-xs text-emerald-800 bg-emerald-50/70 rounded px-2 py-1 inline-block">
            {whyLine}
          </p>
        )}

        {/* Preview keyword rows: keyword + volume + KD only. */}
        <div className="mt-4 space-y-1">
          {preview.map((kw, i) => (
            <div key={`${kw.kw}-${i}`} className="flex items-center justify-between gap-2 py-1">
              <span className="text-sm text-gray-800 truncate">{kw.kw}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-500 tabular-nums w-12 text-right">{formatVolume(kw.volume)}</span>
                <MetricChip metric="kd" value={kw.kd} />
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          <span>
            <span className="font-semibold text-gray-700">{cluster.keywordCount ?? keywords.length}</span> keywords
          </span>
          <span>
            <span className="font-semibold text-gray-700">{formatVolume(cluster.totalVolume)}</span>{' '}
            <InfoTip term="searchVolume">searches/mo</InfoTip>
          </span>
        </div>

        {/* Small, left-aligned, icon-prefixed provenance line. */}
        {evidence && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
            <Search className="w-3 h-3 text-gray-400 shrink-0" />
            {evidence}
          </p>
        )}
      </div>

      {/* Actions, or the persistent add outcome once resolved. */}
      {addedNote ? (
        <div
          className={`mx-5 mb-4 rounded-lg px-3 py-2.5 ${
            addedNote.tone === 'emerald' ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50 border border-slate-200'
          }`}
          data-testid="cluster-added-state"
        >
          <p className={`flex items-center gap-1.5 text-sm font-semibold ${
            addedNote.tone === 'emerald' ? 'text-emerald-800' : 'text-slate-700'
          }`}>
            {addedNote.spinner
              ? <Loader className="w-3.5 h-3.5 animate-spin shrink-0" />
              : (addedNote.tone === 'emerald' || addedNote.check) && <Check className="w-4 h-4 shrink-0" />}
            {addedNote.title}
          </p>
          <p className={`mt-0.5 text-xs ${addedNote.tone === 'emerald' ? 'text-emerald-700' : 'text-slate-500'}`}>
            {addedNote.line}
            {addedNote.tone === 'emerald' && onViewPlan && (
              <>
                {' '}
                <button
                  type="button"
                  onClick={onViewPlan}
                  className="font-medium underline underline-offset-2 hover:opacity-80"
                >
                  View in plan
                </button>
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="px-5 pb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAddCluster(cluster)}
            disabled={isAdding}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover shadow-sm disabled:opacity-50"
          >
            {isAdding
              ? <Loader className="w-4 h-4 mr-1.5 animate-spin" />
              : <Plus className="w-4 h-4 mr-1.5" />}
            {addLabel}
          </button>
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => onOpenDrawer(cluster)}
              className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              See all {keywords.length}
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Keyword slide-over drawer (right, Esc closes, internal scroll)
// ---------------------------------------------------------------------------
// Opened from a cluster's "See all". Lists every keyword in the cluster with
// its volume / KD / intent / source and an individual "Add to plan" button.
function KeywordDrawer({ cluster, onClose, onAddKeyword, onSaveKeyword, addingRowKey }) {
  const open = !!cluster;

  // Esc closes; lock body scroll while open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const keywords = Array.isArray(cluster.keywords) ? cluster.keywords : [];
  const clusterKey = cluster.label || cluster.pillarKeyword;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Keywords in ${cluster.label}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} />
      {/* Panel */}
      <div className="relative w-full max-w-md h-full bg-white shadow-xl flex flex-col min-h-0">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900 leading-snug truncate">{cluster.label}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {keywords.length} keywords · {formatVolume(cluster.totalVolume)} searches/mo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 -mt-1 -mr-1 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50">
          {keywords.map((kw, i) => {
            const rowKey = `${clusterKey}::${kw.kw}`;
            return (
              <div key={rowKey} className="px-5 py-3 hover:bg-gray-50">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-900 font-medium min-w-0 truncate">{kw.kw}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-500 tabular-nums w-12 text-right">{formatVolume(kw.volume)}</span>
                    <MetricChip metric="kd" value={kw.kd} />
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MetricChip metric="intent" value={kw.intent} />
                    {kw.source && (
                      <span className="text-[11px] text-gray-400 truncate">{humanizeSource(kw.source)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {kw.covered ? (
                      // Pre-flight: already owned, so no dead-end Add button.
                      <span className="text-xs px-2 py-1 text-emerald-700 font-medium inline-flex items-center whitespace-nowrap">
                        Already covered
                      </span>
                    ) : (
                    <button
                      type="button"
                      onClick={() => onAddKeyword(kw, rowKey)}
                      disabled={addingRowKey === rowKey}
                      className="text-xs px-2 py-1 text-primary hover:bg-primary/10 rounded font-medium disabled:opacity-50 inline-flex items-center"
                    >
                      {addingRowKey === rowKey
                        ? <Loader className="w-3 h-3 animate-spin" />
                        : <><Plus className="w-3 h-3 mr-0.5" /> Add to plan</>}
                    </button>
                    )}
                    <Tooltip content="Save for later. Saved keywords show up when you bulk-generate articles.">
                      <button
                        type="button"
                        onClick={() => onSaveKeyword(kw)}
                        className="text-xs px-1.5 py-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded font-medium inline-flex items-center"
                      >
                        <ListPlus className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable header cell for the flat "All keywords" table
// ---------------------------------------------------------------------------
// `tip` is an optional glossary key: it renders a small info glyph NEXT TO the
// sort button (never inside it, so teaching a metric can't trigger a sort).
// The bubble opens downward because the table scroll container clips upward.
function SortableHeader({ label, column, sortBy, sortDir, onSort, align = 'left', tip }) {
  const active = sortBy === column;
  return (
    <th className={`px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onSort(column)}
          className={`inline-flex items-center gap-1.5 hover:text-gray-900 transition-colors ${active ? 'text-gray-900' : ''}`}
        >
          {label}
          <ArrowUpDown size={13} className={active ? 'text-primary' : 'text-gray-400'} />
        </button>
        {tip && <InfoTip term={tip} position="bottom" />}
      </span>
    </th>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const KeywordFinder = ({ logout, currentSite, email, updateCurrentSite }) => {
  const { user } = useImpersonation();
  const navigate = useNavigate();
  // Extract site string once to use as a stable dependency.
  const siteString = typeof currentSite === 'string' ? currentSite : currentSite?.site;

  const {
    setShowSupportModal,
    setShowImageStyleModal,
    setShowAdminPanel,
    setShowBulkGenerateModal,
    setShowSubscriptionModal
  } = useModals();

  // ---- Core research state -------------------------------------------------
  const [initialLoading, setInitialLoading] = useState(true);
  const [clusters, setClusters] = useState([]);
  const [mode, setMode] = useState(null);
  const [market, setMarket] = useState(null);
  const [hasResults, setHasResults] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [nextRunAllowedAt, setNextRunAllowedAt] = useState(null);
  const [error, setError] = useState(null);

  const [kickingOff, setKickingOff] = useState(false);
  const [deepRunning, setDeepRunning] = useState(false);

  // ---- View + filters ------------------------------------------------------
  // 'topics' = topic cards, 'all' = the same research as a flat table.
  const [activeView, setActiveView] = useState('topics'); // topics | all
  const [searchTerm, setSearchTerm] = useState('');
  const [intentFilter, setIntentFilter] = useState('all');
  const [maxKd, setMaxKd] = useState('');

  // ---- All-keywords table state -------------------------------------------
  // Default to opportunity order (best bets first) rather than alphabetical.
  // 'score' is a synthetic sort key (backend score, or a volume-to-KD ratio
  // fallback) with no column header; clicking any header switches to it.
  const [sortBy, setSortBy] = useState('score');
  const [sortDir, setSortDir] = useState('desc');
  const [allPage, setAllPage] = useState(1);
  const [allPageSize, setAllPageSize] = useState(50);
  const [selectedRows, setSelectedRows] = useState(() => new Set());

  // ---- Per-action in-flight tracking --------------------------------------
  // Keys of the cluster / keyword row whose "Add to plan" is currently in flight.
  const [addingClusterKey, setAddingClusterKey] = useState(null);
  // Persistent per-cluster add outcome for this visit, so an added topic card
  // flips to a visible "In your plan" state instead of only flashing a toast.
  // { [clusterKey]: { status: 'added'|'expanding'|'covered'|'slow', publishDate, count, message } }
  const [addedClusters, setAddedClusters] = useState({});
  // clusterKey -> cancel() for the shared outcome watcher that resolves an
  // 'expanding' card (added N / covered / failed / still working).
  const outcomeWatchesRef = useRef({});
  // Topics settled on a PAST visit (already in the plan, or dismissed by the
  // user). Their cards are hidden from the Topics view; this-visit outcomes in
  // addedClusters stay visible so adding always shows its confirmation first.
  // null until the (best-effort) fetch lands = no filtering.
  const [settledTopics, setSettledTopics] = useState(null); // { added: Set, hidden: Set, records }
  const [addingRowKey, setAddingRowKey] = useState(null);
  const [savingList, setSavingList] = useState(false);

  // ---- "In your plan" section (how the plan was built) ---------------------
  // Collapsed by default; expanding lazily fetches the plan once so autopilot
  // additions (which have no topicAddResults record) are counted too.
  const [inPlanOpen, setInPlanOpen] = useState(false);
  const [planTopicCounts, setPlanTopicCounts] = useState(null); // { [label]: count } | null
  const planTopicsFetchedRef = useRef(false);

  // ---- Slide-over drawer (per-cluster "See all") --------------------------
  const [drawerCluster, setDrawerCluster] = useState(null);

  // ---- First-run guidance strip -------------------------------------------
  const [guideDismissed, setGuideDismissed] = useState(false);

  // ---- Research settings popover (mode + market + explainer) --------------
  const [savingMode, setSavingMode] = useState(false);
  const [modeDirty, setModeDirty] = useState(false); // a change was saved; next run will use it
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);

  // ---- Refs for poll + one-shot guards ------------------------------------
  // pollTimeoutRef holds the pending status poll so it can be cancelled on
  // unmount / site switch. pollActiveSiteRef records which site currently owns
  // the poll loop so a stale recursion bails out. pollCountRef caps the loop.
  const pollTimeoutRef = useRef(null);
  const pollActiveSiteRef = useRef(null);
  const pollCountRef = useRef(0);
  const mountedRef = useRef(true);
  // Always-synced current site, for continuations that may straddle a switch.
  const currentSiteRef = useRef(siteString);
  useEffect(() => { currentSiteRef.current = siteString; }, [siteString]);

  const MAX_POLLS = 24;
  const POLL_INTERVAL_MS = 5000;

  // Whether a re-run is currently blocked by the cooldown.
  const rerunBlocked = useMemo(() => {
    if (!nextRunAllowedAt) return false;
    const when = new Date(nextRunAllowedAt).getTime();
    return Number.isFinite(when) && when > Date.now();
  }, [nextRunAllowedAt]);

  // -------------------------------------------------------------------------
  // Fetching
  // -------------------------------------------------------------------------
  // Apply a clusters payload to state. Shared by the direct fetch and the
  // stale-while-revalidate background repaint so both stay in sync.
  const applyClusters = useCallback((data) => {
    if (!data) return;
    setClusters(Array.isArray(data.clusters) ? data.clusters : []);
    setMode(data.mode ?? null);
    setMarket(data.market ?? null);
    setHasResults(Boolean(data.hasResults));
    if (data.status === 'error' && data.error) {
      console.error('Keyword research run error:', data.error);
      setError(friendlyResearchError(data.error));
    }
  }, []);

  const fetchClusters = useCallback(async ({ force = false } = {}) => {
    if (!siteString) return;
    const key = `kwclusters:${siteString}`;
    if (force) invalidate(key);
    try {
      const data = await cachedFetch(
        key,
        () => apiClient.get(`/api/keyword-research/${siteString}/clusters`).then((r) => r.data || {}),
        { ttlMs: 60_000, staleMs: 600_000, onUpdate: (fresh) => { if (mountedRef.current) applyClusters(fresh); } }
      );
      if (!mountedRef.current) return;
      applyClusters(data);
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('Error fetching clusters:', err);
      setError(friendlyResearchError(err?.response?.data?.message, 'We could not load your keyword topics. Give it another try.'));
    }
  }, [siteString, applyClusters]);

  // Recursive status poll. Claims ownership for `site`; stale recursions bail.
  const pollStatus = useCallback(async (site) => {
    pollActiveSiteRef.current = site;
    try {
      const resp = await apiClient.get(`/api/keyword-research/${site}/status`);
      if (pollActiveSiteRef.current !== site || !mountedRef.current) return;

      const data = resp.data || {};
      setProcessing(Boolean(data.processing));
      if (data.mode) setMode(data.mode);
      if (data.market) setMarket(data.market);
      if (data.nextRunAllowedAt !== undefined) setNextRunAllowedAt(data.nextRunAllowedAt);

      const deepDone = data.deep?.status === 'complete';
      const stillProcessing = Boolean(data.processing) && !deepDone;

      pollCountRef.current += 1;

      if (!stillProcessing || pollCountRef.current >= MAX_POLLS) {
        // Deep pass finished (or we hit the cap). Pull the final clusters.
        // Invalidate first: the deep pass changed both status and clusters.
        // If we stopped only because of the cap, say so instead of going quiet.
        if (stillProcessing && pollCountRef.current >= MAX_POLLS) {
          toast('Still refining your topics. Check back in a few minutes.', { icon: '⏳', duration: 6000 });
        }
        invalidate(`kwstatus:${site}`);
        setDeepRunning(false);
        setProcessing(false);
        if (data.hasResults) {
          await fetchClusters({ force: true });
        }
        return;
      }

      pollTimeoutRef.current = setTimeout(() => {
        if (pollActiveSiteRef.current !== site || !mountedRef.current) return;
        pollStatus(site);
      }, POLL_INTERVAL_MS);
    } catch (err) {
      if (pollActiveSiteRef.current !== site || !mountedRef.current) return;
      console.error('Error polling keyword research status:', err);
      setProcessing(false);
      setDeepRunning(false);
    }
  }, [fetchClusters]);

  // Apply a status payload to the header/gating state. Shared by the initial
  // fetch and the stale-while-revalidate background repaint.
  const applyStatus = useCallback((data) => {
    if (!data) return;
    setHasResults(Boolean(data.hasResults));
    setProcessing(Boolean(data.processing));
    setMode(data.mode ?? null);
    setMarket(data.market ?? null);
    setNextRunAllowedAt(data.nextRunAllowedAt ?? null);
  }, []);

  // Initial load: status -> clusters (or empty / processing states). Both fetches
  // are cached (kwstatus / kwclusters) so a remount renders instantly from cache
  // and only revalidates in the background. Topics is the default view, so this
  // is where status + clusters (its data) are fetched; the other views fetch
  // their own data lazily when opened.
  const loadInitial = useCallback(async () => {
    if (!siteString) {
      setInitialLoading(false);
      return;
    }
    // If we already have cached status, we can paint instantly (no skeleton).
    const hadCache = getCached(`kwstatus:${siteString}`) !== undefined;
    if (!hadCache) setInitialLoading(true);
    setError(null);
    try {
      const data = await cachedFetch(
        `kwstatus:${siteString}`,
        () => apiClient.get(`/api/keyword-research/${siteString}/status`).then((r) => r.data || {}),
        { ttlMs: 60_000, staleMs: 600_000, onUpdate: (fresh) => { if (mountedRef.current) applyStatus(fresh); } }
      );
      if (!mountedRef.current) return;
      applyStatus(data);

      if (data.hasResults) {
        await fetchClusters();
      }
      if (data.processing) {
        pollCountRef.current = 0;
        setDeepRunning(true);
        pollStatus(siteString);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('Error loading keyword research:', err);
      setError(friendlyResearchError(err?.response?.data?.message, 'We could not load your keyword research. Give it another try.'));
    } finally {
      if (mountedRef.current) setInitialLoading(false);
    }
  }, [siteString, fetchClusters, pollStatus, applyStatus]);

  // Topics settled on PAST visits: labels already added/covered into the plan
  // (config.topicAddResults) plus labels the user dismissed. Best-effort: on
  // any failure settledTopics stays null and nothing is filtered.
  const fetchSettledTopics = useCallback(async () => {
    if (!siteString) return;
    try {
      const resp = await apiClient.get(`/api/plan/${siteString}/topic-adds`);
      if (!mountedRef.current || !resp.data?.success) return;
      const results = resp.data.results || {};
      const added = new Set(
        Object.entries(results)
          .filter(([, r]) => r?.status === 'added' || r?.status === 'covered')
          .map(([label]) => label)
      );
      const hidden = new Set(Array.isArray(resp.data.hiddenTopics) ? resp.data.hiddenTopics : []);
      // Keep the raw added/covered records too: the "In your plan" section
      // shows them (label + articles scheduled) so the page doubles as a
      // record of how the plan was built.
      const records = Object.fromEntries(
        Object.entries(results).filter(([, r]) => r?.status === 'added' || r?.status === 'covered')
      );
      setSettledTopics({ added, hidden, records });
    } catch (err) {
      // Leave settledTopics null: cards simply are not filtered.
    }
  }, [siteString]);

  // Lazy count of plan entries per topic label, fetched once when the
  // "In your plan" section is first expanded. Counts autopilot additions that
  // never went through the add endpoints. Best-effort: on failure the section
  // just shows the add-record counts.
  const fetchPlanTopicCounts = useCallback(async () => {
    if (!siteString || planTopicsFetchedRef.current) return;
    planTopicsFetchedRef.current = true;
    try {
      const resp = await apiClient.get(`/api/plan/${siteString}`);
      if (!mountedRef.current) return;
      const entries = Array.isArray(resp.data?.entries) ? resp.data.entries : [];
      const counts = {};
      for (const e of entries) {
        if (!e?.clusterLabel) continue;
        counts[e.clusterLabel] = (counts[e.clusterLabel] || 0) + 1;
      }
      setPlanTopicCounts(counts);
    } catch (err) {
      // Section falls back to record counts.
    }
  }, [siteString]);

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------
  // Track mount so async callbacks never setState after unmount.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Reset per-site state + guards, then load. Cancels any live poll first so
  // two sites never poll concurrently.
  useEffect(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    pollActiveSiteRef.current = null;
    pollCountRef.current = 0;

    setClusters([]);
    setSettledTopics(null);
    setInPlanOpen(false);
    setPlanTopicCounts(null);
    planTopicsFetchedRef.current = false;
    setSelectedRows(new Set());
    setActiveView('topics');
    setSearchTerm('');
    setIntentFilter('all');
    setMaxKd('');
    setAllPage(1);
    setError(null);
    setModeDirty(false);
    setShowSettings(false);
    setDrawerCluster(null);
    setAddedClusters({});

    // Per-site first-run strip dismissal.
    try {
      setGuideDismissed(!!localStorage.getItem(`blawgy_kw_guide_dismissed_${siteString}`));
    } catch {
      setGuideDismissed(false);
    }

    loadInitial();
    fetchSettledTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteString]);

  // Cancel the poll loop on unmount.
  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      pollActiveSiteRef.current = null;
    };
  }, []);

  // Close the Research settings popover on outside click or Escape.
  useEffect(() => {
    if (!showSettings) return;
    const onClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    const onKey = (e) => { if (e.key === 'Escape') setShowSettings(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [showSettings]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------
  const runKickoff = async (force = false) => {
    if (!siteString) {
      toast.error('Select a site first.');
      return;
    }
    setKickingOff(true);
    setError(null);
    // A kickoff changes status + clusters; drop their cached copies so the poll
    // and any later remount read fresh data.
    invalidate(`kwstatus:${siteString}`);
    invalidate(`kwclusters:${siteString}`);
    try {
      const resp = await apiClient.post(`/api/keyword-research/${siteString}/kickoff`, {
        pass: 'both',
        ...(force ? { force: true } : {})
      });
      const data = resp.data || {};

      // Quick pass returns inline — render it right away.
      if (data.quick?.clusters?.length || data.clusters?.length) {
        const quickClusters = data.quick?.clusters || data.clusters || [];
        setClusters(quickClusters);
        setHasResults(true);
        if (data.quick?.mode) setMode(data.quick.mode);
        if (data.quick?.market) setMarket(data.quick.market);
      }
      if (data.alreadyFresh) {
        // The backend message here is developer-speak ("pass force=true"), so
        // always show our own copy and pick up the unlock date it returns.
        if (data.nextRunAllowedAt !== undefined) setNextRunAllowedAt(data.nextRunAllowedAt);
        toast.success('Your keyword research is already up to date.');
      }

      // Kick off polling for the deep pass unless it's already done.
      if (data.deepRunning || data.status === 'started' || data.status === 'processing') {
        setProcessing(true);
        setDeepRunning(true);
        pollCountRef.current = 0;
        // Cancel any leftover poll before starting a fresh one.
        if (pollTimeoutRef.current) {
          clearTimeout(pollTimeoutRef.current);
          pollTimeoutRef.current = null;
        }
        pollStatus(siteString);
      } else {
        // Nothing running: refresh clusters + status so the header is accurate.
        await fetchClusters();
        try {
          const s = await apiClient.get(`/api/keyword-research/${siteString}/status`);
          if (mountedRef.current) setNextRunAllowedAt(s.data?.nextRunAllowedAt ?? null);
        } catch { /* non-fatal */ }
      }
    } catch (err) {
      console.error('Error starting keyword research:', err);
      if (err?.response?.status === 429) {
        const when = err?.response?.data?.nextRunAllowedAt ?? null;
        setNextRunAllowedAt(when);
        const whenMs = when ? new Date(when).getTime() : NaN;
        const unlockDate = Number.isFinite(whenMs)
          ? new Date(whenMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : null;
        toast.error(
          unlockDate
            ? `You get one full research run per month. Your next run unlocks ${unlockDate}.`
            : 'You get one full research run per month. Your next run unlocks a little later.'
        );
      } else {
        setError(friendlyResearchError(err?.response?.data?.message, 'We could not start keyword research. Give it another try.'));
      }
    } finally {
      if (mountedRef.current) setKickingOff(false);
    }
  };

  // Success toast that points the user at their calendar. Rendered as a custom
  // toast so the "view calendar" link is clickable. When `undoEntryId` is
  // passed (single adds return the new entry's id), an Undo link removes the
  // entry again, so adding never needs a confirm step.
  const planAddedToast = useCallback((message, { undoEntryId = null } = {}) => {
    toast.success((t) => (
      <span className="flex items-center gap-2">
        <span>{message}</span>
        {undoEntryId && (
          <button
            type="button"
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await apiClient.delete(`/api/plan/${siteString}/entry/${undoEntryId}`);
                invalidate(`plan:${siteString}`);
                toast('Removed from your plan.', { duration: 3000 });
              } catch (err) {
                console.error('Undo plan add failed:', err);
                toast.error('We could not undo that. Remove it from your plan instead.');
              }
            }}
            className="text-gray-500 font-medium underline underline-offset-2 hover:opacity-80 whitespace-nowrap"
          >
            Undo
          </button>
        )}
        <button
          type="button"
          onClick={() => { toast.dismiss(t.id); navigate('/dashboard'); }}
          className="text-primary font-medium underline underline-offset-2 hover:opacity-80 whitespace-nowrap"
        >
          view calendar
        </button>
      </span>
    ));
  }, [navigate, siteString]);

  // Shared plan-add call and the single choke point for the cannibalization
  // firewall. Posts to the Phase A plan endpoint and returns
  //   { status, entry, entries, added, estimatedEntries, owner, message }
  // where status is one of:
  //   'added'     -> real scheduled entries were created (success toast fired
  //                  here unless silent; entry/entries carry publishDate + id)
  //   'expanding' -> the backend accepted the add and is expanding the topic in
  //                  the background; entries land within a minute
  //   'blocked'   -> the site already owns this intent; NOT an error, NOT an add
  //   'failed'    -> the call failed (error toast fired here unless silent)
  // Pass force:true in the payload to override a block and add anyway (an
  // explicit user choice, e.g. a distinct supporting post); the backend then
  // never returns blocked, so this surfaces a normal success toast.
  //
  // Options:
  //   successMessage    custom success toast copy
  //   silent            no toasts at all; caller renders the outcome itself
  //                     (e.g. the cluster cards' persistent "In your plan" state)
  //   preferServerCount prefer the backend message when it states an actual
  //                     entry count (cluster adds can expand to many articles)
  const addToPlan = useCallback(async function addToPlanInner(payload, opts = {}) {
    const { successMessage, silent = false, preferServerCount = false } = opts;
    try {
      const resp = await apiClient.post(`/api/plan/${siteString}/add`, payload);
      if (resp.data?.blocked === 'intent-owned') {
        const owner = resp.data.owner || {};
        const base = resp.data.message || 'You already rank for this. Refresh that post instead of adding a new one.';
        if (!silent) {
          // Point the user at the owning page when we have one, and always
          // leave the door open: blocking is advice, not a wall. "add anyway"
          // retries the same add with force (the explicit-override contract
          // the backend already honors), e.g. for a distinct supporting post.
          toast((t) => (
            <span className="flex items-center gap-2">
              <span>{base}</span>
              {owner.page && (
                <a
                  href={/^https?:\/\//.test(owner.page) ? owner.page : `https://${owner.page}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => toast.dismiss(t.id)}
                  className="text-primary font-medium underline underline-offset-2 hover:opacity-80 whitespace-nowrap"
                >
                  open page
                </a>
              )}
              <button
                onClick={() => { toast.dismiss(t.id); addToPlanInner({ ...payload, force: true }, opts); }}
                className="text-primary font-medium underline underline-offset-2 hover:opacity-80 whitespace-nowrap"
              >
                add anyway
              </button>
            </span>
          ), { icon: '✋', duration: 8000 });
        }
        return { status: 'blocked', owner, message: base };
      }
      // Slow cluster-expansion path: the backend accepted the add and is
      // expanding it in the background. Treat as success, not an error.
      if (resp.data?.expanding) {
        if (!silent && resp.data.alreadyInFlight) {
          toast('Already adding those, one moment.', { icon: '⏳' });
        }
        invalidate(`plan:${siteString}`);
        return {
          status: 'expanding',
          estimatedEntries: Number(resp.data.estimatedEntries) || 0,
          message: resp.data.message || null,
        };
      }
      if (!silent) {
        // A cluster add can expand into several articles; when the backend
        // states the real count ("Added 3 articles..."), that beats our guess.
        const serverCounted = preferServerCount && Number.isFinite(Number(resp.data?.added)) && resp.data?.message;
        planAddedToast(
          (serverCounted && resp.data.message) || successMessage || resp.data?.message || 'Added to your plan.',
          // Single adds return the created entry, so the toast can offer Undo.
          { undoEntryId: resp.data?.entry?.id || null }
        );
      }
      invalidate(`plan:${siteString}`);
      return {
        status: 'added',
        entry: resp.data?.entry || null,
        entries: Array.isArray(resp.data?.entries) ? resp.data.entries : [],
        added: Number.isFinite(Number(resp.data?.added)) ? Number(resp.data.added) : null,
        message: resp.data?.message || null,
      };
    } catch (err) {
      const status = err?.response?.status;
      if (!silent) {
        if (status === 404) {
          toast.error('We could not find that site on your account. Refresh the page and try again.');
        } else {
          console.error('Error adding to plan:', err);
          toast.error(err?.response?.data?.message || 'We could not add that to your plan.');
        }
      } else {
        console.error('Error adding to plan:', err);
      }
      return { status: 'failed' };
    }
  }, [siteString, planAddedToast]);

  // The plan `/add` payload for a whole cluster: the pillar keyword, tagged as
  // a research topic. The endpoint reads searchVolume/difficulty/intent off the
  // body (not volume/kd), so carry the pillar keyword's own metrics across when
  // we have them. clusterLabel travels so the plan can show the topic provenance.
  const clusterPlanPayload = (cluster) => {
    const kws = Array.isArray(cluster.keywords) ? cluster.keywords : [];
    // Prefer the row that matches the pillar; fall back to the strongest one.
    const pillar =
      kws.find((k) => (k.kw || k.keyword) === (cluster.pillarKeyword || cluster.label)) ||
      kws[0] ||
      {};
    return {
      keyword: cluster.pillarKeyword || cluster.label,
      source: 'cluster',
      clusterLabel: cluster.label,
      searchVolume: Number(pillar.volume ?? pillar.searchVolume) || 0,
      difficulty: Number(pillar.kd ?? pillar.difficulty) || 0,
      ...(pillar.intent ? { intent: pillar.intent } : {})
    };
  };

  // Resolve an 'expanding' card truthfully: the shared watcher polls the
  // recorded outcome (GET /:site/topic-adds) until it lands, then flips the
  // card to added / covered / retry, or softens to "still working" on timeout.
  // Same pattern as the Add-topics drawer, so the two surfaces agree.
  const watchClusterOutcome = useCallback((key, startedAt) => {
    // Capture the owning site: a watcher created by a continuation that
    // straddled a site switch must not write card state into the new site's
    // view (a same-label cluster there would render the old site's outcome).
    const watchSite = siteString;
    outcomeWatchesRef.current[key]?.();
    outcomeWatchesRef.current[key] = watchTopicAdd({
      site: watchSite,
      label: key,
      startedAt,
      onOutcome: (outcome) => {
        delete outcomeWatchesRef.current[key];
        if (!mountedRef.current || currentSiteRef.current !== watchSite) return;
        if (outcome.status === 'failed') {
          // Restore the Add button so the user can retry.
          setAddedClusters((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          toast.error(outcome.message || 'We could not add that topic to your plan. Give it another try.');
          return;
        }
        setAddedClusters((prev) => ({
          ...prev,
          [key]: outcome.status === 'added'
            ? { status: 'added', publishDate: null, count: outcome.count }
            : outcome.status === 'covered'
              ? { status: 'covered', publishDate: null, count: 0, message: outcome.message || null }
              : { status: 'slow', publishDate: null, count: 0 },
        }));
      },
    });
  }, [siteString]);

  // Cancel any pending outcome watchers when the site changes or on unmount.
  useEffect(() => () => {
    Object.values(outcomeWatchesRef.current).forEach((cancel) => cancel());
    outcomeWatchesRef.current = {};
  }, [siteString]);

  // Add a whole cluster. Silent: the card itself flips to a persistent
  // "In your plan" state (with the scheduled week), which reads better than a
  // toast and never covers the page. Only hard failures still toast.
  const addClusterToPlan = async (cluster) => {
    const key = cluster.label || cluster.pillarKeyword;
    setAddingClusterKey(key);
    try {
      const result = await addToPlan(clusterPlanPayload(cluster), { silent: true });
      if (!mountedRef.current) return;
      if (result.status === 'added') {
        const first = result.entry || result.entries?.[0] || null;
        setAddedClusters((prev) => ({
          ...prev,
          [key]: {
            status: 'added',
            publishDate: first?.publishDate || null,
            count: result.added ?? (result.entries?.length || 1),
          },
        }));
      } else if (result.status === 'expanding') {
        setAddedClusters((prev) => ({
          ...prev,
          [key]: { status: 'expanding', publishDate: null, count: result.estimatedEntries || 0 },
        }));
        watchClusterOutcome(key, Date.now());
      } else if (result.status === 'blocked') {
        setAddedClusters((prev) => ({
          ...prev,
          [key]: { status: 'covered', publishDate: null, count: 0, ownerPage: result.owner?.page || null },
        }));
      } else {
        toast.error('We could not add that topic to your plan. Give it another try.');
      }
    } finally {
      if (mountedRef.current) setAddingClusterKey(null);
    }
  };

  // Add a single keyword from the drawer / table. Cluster keyword rows carry
  // volume/kd/intent; the plan endpoint expects searchVolume/difficulty/intent,
  // so map them across so the plan card keeps its metrics.
  const addKeywordToPlan = async (kw, trackKey) => {
    const rowKey = trackKey || `${kw.kw}-${kw.volume}-${kw.kd}`;
    setAddingRowKey(rowKey);
    try {
      await addToPlan(
        {
          keyword: kw.kw || kw.keyword,
          source: 'manual',
          searchVolume: Number(kw.volume ?? kw.searchVolume) || 0,
          difficulty: Number(kw.kd ?? kw.difficulty) || 0,
          ...(kw.intent ? { intent: kw.intent } : {})
        },
        { successMessage: `Added "${kw.kw || kw.keyword}" to your plan.` }
      );
    } finally {
      if (mountedRef.current) setAddingRowKey(null);
    }
  };

  // Dismiss a research topic card the user does not want. Optimistic: the card
  // hides immediately, the dismissal persists per site (plan config), and the
  // toast offers a one-click Undo.
  const dismissTopic = async (cluster) => {
    const label = cluster.label || cluster.pillarKeyword;
    if (!label) return;
    const prevSettled = settledTopics;
    setSettledTopics((prev) => ({
      added: prev?.added || new Set(),
      hidden: new Set([...(prev?.hidden || []), label]),
    }));
    try {
      await apiClient.post(`/api/plan/${siteString}/topics/dismiss`, { label });
      toast.success((t) => (
        <span className="flex items-center gap-2">
          <span>Dismissed "{label}".</span>
          <button
            type="button"
            onClick={async () => {
              toast.dismiss(t.id);
              setSettledTopics((prev) => {
                const hidden = new Set(prev?.hidden || []);
                hidden.delete(label);
                return { added: prev?.added || new Set(), hidden };
              });
              try {
                await apiClient.post(`/api/plan/${siteString}/topics/dismiss`, { label, undo: true });
              } catch (err) {
                console.error('Undo topic dismiss failed:', err);
              }
            }}
            className="text-gray-500 font-medium underline underline-offset-2 hover:opacity-80 whitespace-nowrap"
          >
            Undo
          </button>
        </span>
      ));
    } catch (err) {
      console.error('Topic dismiss failed:', err);
      setSettledTopics(prevSettled);
      toast.error('We could not dismiss that topic. Give it another try.');
    }
  };

  // Save cluster keyword rows { kw, volume, kd } into the site's keyword list.
  const saveToList = async (rows, { silent = false } = {}) => {
    const list = (Array.isArray(rows) ? rows : [rows]).filter(Boolean);
    if (list.length === 0) return;
    setSavingList(true);
    try {
      const keywords = list.map((k) => ({
        keyword: k.kw,
        volume: Number(k.volume) || 0,
        difficulty: Number(k.kd) || 0,
        source: 'keyword-research'
      }));
      const resp = await apiClient.post('/api/save-keywords', { site: siteString, keywords });
      if (resp.data?.success) {
        if (!silent) {
          toast.success(
            list.length === 1
              ? `Added "${list[0].kw}" to your keyword list.`
              : `Added ${list.length} keywords to your list.`
          );
        }
      } else {
        throw new Error(resp.data?.message || 'Failed to save keywords');
      }
    } catch (err) {
      console.error('Error saving keywords:', err);
      toast.error(err?.response?.data?.message || err.message || 'We could not save those keywords.');
    } finally {
      if (mountedRef.current) setSavingList(false);
    }
  };

  // Persist a mode (businessType) and/or market change for this site. The
  // backend whitelist accepts businessType + market on /update-site-settings.
  // Updates local state optimistically and flags that the next run will use it.
  const saveMode = async ({ businessType, market: nextMarket } = {}) => {
    if (!siteString) return;
    // Snapshot for rollback on failure.
    const prevMode = mode;
    const prevMarket = market;
    if (businessType) setMode(businessType);
    if (nextMarket) setMarket(nextMarket);
    setSavingMode(true);
    try {
      const settings = {};
      if (businessType) settings.businessType = businessType;
      if (nextMarket && nextMarket.locationName) settings.market = nextMarket;
      const resp = await apiClient.post('/update-site-settings', {
        site: siteString,
        settings
      });
      if (resp.data?.success) {
        setModeDirty(true);
        // Pre-run there is no "re-run" yet; the first run just uses it.
        toast.success(hasResults ? 'Saved. Applies on your next re-run.' : 'Saved.');
      } else {
        throw new Error(resp.data?.message || 'Failed to save');
      }
    } catch (err) {
      console.error('Error saving research mode:', err);
      // Roll back optimistic change.
      setMode(prevMode);
      setMarket(prevMarket);
      toast.error(err?.response?.data?.message || 'We could not save that. Please try again.');
    } finally {
      if (mountedRef.current) setSavingMode(false);
    }
  };

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------
  const term = searchTerm.trim().toLowerCase();
  const maxKdNum = maxKd === '' ? null : parseFloat(maxKd);

  const rowMatches = useCallback((kw, clusterLabel) => {
    if (intentFilter !== 'all' && (kw.intent || '').toLowerCase() !== intentFilter) return false;
    if (maxKdNum !== null && Number(kw.kd) > maxKdNum) return false;
    if (term) {
      const hay = `${kw.kw} ${clusterLabel || ''}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  }, [intentFilter, maxKdNum, term]);

  // Topics view: clusters, each narrowed to keywords matching the filters.
  // A cluster survives if it still has any matching keyword (or its label matches).
  // Whether a topic card is settled: already in the plan from a past visit,
  // dismissed, or fully covered (the site already ranks for every keyword in
  // it — nothing to add, so the card would only be a dead end). Settled cards
  // are hidden; a card with a live outcome THIS visit keeps its confirmation
  // until reload. The "In your plan" section below the grid is the record.
  const isSettledTopic = useCallback((c) => {
    const key = c.label || c.pillarKeyword;
    if (addedClusters[key]) return false;
    if (c.covered) return true;
    if (!settledTopics) return false;
    return settledTopics.hidden.has(key) || settledTopics.added.has(key);
  }, [settledTopics, addedClusters]);

  const filteredClusters = useMemo(() => {
    return clusters
      .filter((c) => !isSettledTopic(c))
      .map((c) => {
        const kws = Array.isArray(c.keywords) ? c.keywords : [];
        const labelHit = term ? (c.label || '').toLowerCase().includes(term) : false;
        const matching = kws.filter((kw) => rowMatches(kw, c.label));
        // If only the label matched but no keyword did (intent/kd filters),
        // keep the label match only when no attribute filter is active.
        const keepAll = labelHit && intentFilter === 'all' && maxKdNum === null;
        return { ...c, keywords: keepAll ? kws : matching };
      })
      .filter((c) => (c.keywords && c.keywords.length > 0))
      // Best opportunities first. Backend already sorts by score, but re-sort
      // defensively so quick-pass inline results and filtering never reorder.
      .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
  }, [clusters, isSettledTopic, rowMatches, term, intentFilter, maxKdNum]);

  // The top few clusters that clear the score threshold are the "plan slots":
  // they surface up front under "Your next plan slots" with a one-line WHY.
  // The rest sit quieter below under "More topics".
  const { topSlots, moreClusters, bestBetKeys } = useMemo(() => {
    const slots = [];
    for (const c of filteredClusters) {
      if (slots.length >= BEST_BET_MAX_COUNT) break;
      if ((Number(c.score) || 0) >= BEST_BET_MIN_SCORE) slots.push(c);
    }
    const slotKeys = new Set(slots.map((c) => c.label || c.pillarKeyword));
    const rest = filteredClusters.filter((c) => !slotKeys.has(c.label || c.pillarKeyword));
    return { topSlots: slots, moreClusters: rest, bestBetKeys: slotKeys };
  }, [filteredClusters]);

  // Table view: flatten every keyword, tag with its cluster/topic. Fully
  // covered clusters are hidden here too (same rule as the cards): the table
  // is the same research in a different shape, not a different data set.
  const allRows = useMemo(() => {
    const out = [];
    for (const c of clusters) {
      if (c.covered) continue;
      const kws = Array.isArray(c.keywords) ? c.keywords : [];
      for (const kw of kws) {
        out.push({ ...kw, cluster: c.label });
      }
    }
    return out;
  }, [clusters]);

  const filteredAllRows = useMemo(() => {
    const rows = allRows.filter((kw) => rowMatches(kw, kw.cluster));
    const dir = sortDir === 'asc' ? 1 : -1;
    return rows.sort((a, b) => {
      // Synthetic "best opportunity" order (default): score, ratio fallback.
      if (sortBy === 'score') {
        return (opportunityKey(a) - opportunityKey(b)) * dir;
      }
      let av = a[sortBy];
      let bv = b[sortBy];
      if (sortBy === 'kw' || sortBy === 'intent' || sortBy === 'cluster' || sortBy === 'source') {
        av = String(av || '').toLowerCase();
        bv = String(bv || '').toLowerCase();
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      }
      return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
    });
  }, [allRows, rowMatches, sortBy, sortDir]);

  // Topics already in the plan (or covered), for the "In your plan" section.
  // Merge the add-outcome records with lazy per-topic plan counts so autopilot
  // additions are represented too. Sorted newest-first by record time.
  const inPlanTopics = useMemo(() => {
    const records = settledTopics?.records || {};
    const out = new Map();
    for (const [label, r] of Object.entries(records)) {
      out.set(label, {
        label,
        status: r.status,
        count: Number(r.added) || 0,
        at: r.at || null,
      });
    }
    for (const [label, count] of Object.entries(planTopicCounts || {})) {
      const existing = out.get(label);
      if (existing) {
        existing.count = Math.max(existing.count, count);
      } else {
        out.set(label, { label, status: 'added', count, at: null });
      }
    }
    return [...out.values()].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
  }, [settledTopics, planTopicCounts]);

  // Keep the current page valid as filters shrink the list.
  const allTotalPages = Math.max(1, Math.ceil(filteredAllRows.length / allPageSize));
  useEffect(() => {
    if (allPage > allTotalPages) setAllPage(1);
  }, [allPage, allTotalPages]);

  const allPageRows = useMemo(() => {
    const start = (allPage - 1) * allPageSize;
    return filteredAllRows.slice(start, start + allPageSize);
  }, [filteredAllRows, allPage, allPageSize]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir(column === 'kw' || column === 'cluster' || column === 'intent' || column === 'source' ? 'asc' : 'desc');
    }
  };

  const rowId = (kw) => `${kw.kw}::${kw.cluster || ''}`;

  const toggleRow = (kw) => {
    const id = rowId(kw);
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePageSelection = () => {
    const ids = allPageRows.map(rowId);
    const allSelected = ids.length > 0 && ids.every((id) => selectedRows.has(id));
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const saveSelected = async () => {
    const rows = filteredAllRows.filter((kw) => selectedRows.has(rowId(kw)));
    if (rows.length === 0) return;
    await saveToList(rows);
    setSelectedRows(new Set());
  };

  // CSV export of the (filtered) flat keyword list.
  const handleExport = () => {
    const header = ['Keyword', 'Volume', 'KD', 'Intent', 'Topic', 'CPC', 'Source'];
    const lines = filteredAllRows.map((k) => [
      k.kw,
      k.volume ?? 0,
      k.kd ?? 0,
      k.intent || '',
      k.cluster || '',
      k.cpc ?? 0,
      humanizeSource(k.source)
    ]);
    const csv = [header, ...lines]
      .map((row) => row.map((v) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v)).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `keywords-${siteString || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // -------------------------------------------------------------------------
  // Sub-renders
  // -------------------------------------------------------------------------
  // Cards/table view toggle: the table is the same research flattened into
  // rows, not a different data set, so it's a view switch rather than a tab.
  const viewToggle = (
    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden divide-x divide-gray-200 shrink-0" role="group" aria-label="View as">
      {[
        { id: 'topics', label: 'Cards', icon: Layers },
        { id: 'all', label: 'Table', icon: Table2 },
      ].map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => setActiveView(v.id)}
          aria-pressed={activeView === v.id}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
            activeView === v.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <v.icon className="w-3.5 h-3.5" />
          {v.label}
        </button>
      ))}
    </div>
  );

  const filterRow = (
    <div className="flex flex-col sm:flex-row gap-2 mb-6">
      <div className="relative flex-1 max-w-sm">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search topics and keywords"
          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
      <select
        value={intentFilter}
        onChange={(e) => setIntentFilter(e.target.value)}
        className="p-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {INTENT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <div className="relative">
        <input
          type="number"
          min="0"
          max="100"
          value={maxKd}
          onChange={(e) => setMaxKd(e.target.value)}
          placeholder="Max difficulty"
          aria-label="Max difficulty (0 to 100)"
          className="w-36 p-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  );

  // The Business type + Search market selects, shared by the settings popover
  // and the pre-run empty state (so the run never spends with wrong settings).
  const renderModeMarketSelects = () => (
    <>
      <div>
        <label className="block text-xs font-semibold text-gray-800 mb-1.5">Business type</label>
        <select
          value={mode || ''}
          onChange={(e) => saveMode({ businessType: e.target.value })}
          disabled={savingMode}
          aria-label="Keyword research mode"
          className="w-full py-1.5 pl-2.5 pr-7 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
        >
          {!mode && <option value="">General (auto)</option>}
          {MODE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-800 mb-1.5">Search market</label>
        <select
          value={marketCodeFor(market)}
          onChange={(e) => {
            const m = MARKET_OPTIONS.find((o) => o.code === e.target.value);
            if (m) saveMode({ market: { countryCode: m.code, locationName: m.locationName, languageCode: m.languageCode } });
          }}
          disabled={savingMode}
          aria-label="Search market"
          className="w-full py-1.5 pl-2.5 pr-7 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
        >
          {MARKET_OPTIONS.map((m) => (
            <option key={m.code} value={m.code}>{m.label}</option>
          ))}
        </select>
      </div>
    </>
  );

  // Empty state: no research yet. Settings live HERE, before the run, because
  // a full run is capped to one per month (RERUN_MIN_INTERVAL_DAYS = 30 in
  // keywordResearchRoutes.js); burning it on the wrong business type or market
  // is the most expensive mistake this page can make.
  const renderEmptyState = () => {
    const modeValue = mode || 'general';
    const modeLabel = MODE_OPTIONS.find((o) => o.value === modeValue)?.label || 'General';
    const modePhrase = modeValue === 'saas' ? 'SaaS' : modeLabel.toLowerCase();
    const article = /^[aeiou]/i.test(modePhrase) ? 'an' : 'a';
    const marketCode = marketCodeFor(market);
    const marketLabel = MARKET_OPTIONS.find((m) => m.code === marketCode)?.label || 'United States';
    const marketPhrase = marketCode === 'WORLDWIDE'
      ? 'worldwide'
      : marketCode === 'GLOBAL_EN'
        ? 'across English-speaking countries'
        : `in ${marketLabel}`;
    return (
      <div className="rounded-xl bg-white border border-gray-200 p-10 text-center max-w-xl mx-auto">
        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-6 h-6 text-emerald-700" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1.5">Find your best keywords</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
          We'll look at your site, group keywords into topics you can rank for, and pull real search volume and difficulty. This takes about a minute.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto mb-3 text-left">
          {renderModeMarketSelects()}
        </div>
        <p className="text-xs text-gray-500 mb-6 max-w-md mx-auto">
          We'll research keywords for {article} {modePhrase} business {marketPhrase}. You get one full research run per month, so set these first.
        </p>
        <button
          type="button"
          onClick={() => runKickoff(false)}
          disabled={kickingOff || !siteString}
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover shadow-sm disabled:opacity-50"
        >
          {kickingOff
            ? <Loader className="w-4 h-4 mr-1.5 animate-spin" />
            : <Search className="w-4 h-4 mr-1.5" />}
          {kickingOff ? 'Researching...' : 'Run keyword research'}
        </button>
        {kickingOff && (
          <p className="text-xs text-gray-500 mt-3">
            Looking at your site and competitors now. Your first topics show up in about half a minute.
          </p>
        )}
        {!siteString && (
          <p className="text-xs text-gray-400 mt-3">Select a site to get started.</p>
        )}
      </div>
    );
  };

  // Processing state: research is running.
  const renderProcessing = () => (
    <div className="rounded-xl bg-white border border-gray-200 p-10 text-center max-w-xl mx-auto">
      <Loader className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-1.5">We're finding your best keywords...</h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto">
        This usually takes about a minute. You can leave this page and come back, your topics will be here when they're ready.
      </p>
    </div>
  );

  // Topics header: a single quiet "Research settings" popover (mode + market +
  // how-it-works explainer) sitting next to Re-run. Re-run's disabled state
  // says exactly when it unlocks.
  const renderTopicsHeader = () => {
    // Explainer follows the current mode (default 'general').
    const explainer = MODE_EXPLAINERS[mode] || MODE_EXPLAINERS.general;
    // Friendly unlock date for the disabled Re-run.
    const unlockDate = nextRunAllowedAt
      ? new Date(nextRunAllowedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : null;

    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {deepRunning && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <Loader className="w-3 h-3 animate-spin" /> refining your topics
            </span>
          )}
          {!deepRunning && modeDirty && (
            <span className="text-xs text-gray-400">Settings saved. Applies on your next re-run.</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* One quiet "Research settings" popover. */}
          <div className="relative" ref={settingsRef}>
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              aria-label="Research settings"
              className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-100 ${showSettings ? 'bg-gray-100' : ''}`}
            >
              <SlidersHorizontal className="w-4 h-4 mr-1.5" />
              Research settings
            </button>
            {showSettings && (
              <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] z-20 rounded-lg border border-gray-200 bg-white shadow-lg p-4 space-y-4 text-left">
                {renderModeMarketSelects()}
                <div className="pt-1 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-800 mb-1 mt-2">How we find these</p>
                  <p className="text-xs leading-relaxed text-gray-600">{explainer}</p>
                </div>
                {savingMode && (
                  <p className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <Loader className="w-3 h-3 animate-spin" /> saving
                  </p>
                )}
              </div>
            )}
          </div>

          {rerunBlocked ? (
            <Tooltip content={unlockDate ? `You can re-run once a month. Next run unlocks ${unlockDate}.` : 'Re-run is available a little later.'} position="bottom">
              <button
                type="button"
                disabled
                className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed"
              >
                <RefreshCw className="w-4 h-4 mr-1.5" />
                {unlockDate ? `Next run unlocks ${unlockDate}` : 'Re-run'}
              </button>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={() => runKickoff(true)}
              disabled={kickingOff}
              className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${kickingOff ? 'animate-spin' : ''}`} />
              Re-run
            </button>
          )}
        </div>
      </div>
    );
  };

  // First-run guidance strip: shown atop Topics for sites that have research but
  // no plan yet. Three short steps + one CTA. Dismissal persists per site.
  const renderFirstRunStrip = () => {
    if (guideDismissed || topSlots.length === 0) return null;
    const dismiss = () => {
      setGuideDismissed(true);
      try { localStorage.setItem(`blawgy_kw_guide_dismissed_${siteString}`, '1'); } catch { /* ignore */ }
    };
    const addBestBets = async () => {
      // Add each best-bet slot silently, then report ONE summary toast with
      // real counts. The guide only dismisses when something actually landed.
      if (addingClusterKey) return;
      setAddingClusterKey('__best-bets__');
      let added = 0;      // landed synchronously — the only count we may claim
      let pending = 0;    // background expansions; their cards resolve via the watcher
      let blocked = 0;
      let failed = 0;
      try {
        for (const c of topSlots) {
          // Pre-flight covered: the card already says so; don't burn an add.
          if (c.covered) continue;
          const key = c.label || c.pillarKeyword;
          // eslint-disable-next-line no-await-in-loop
          const result = await addToPlan(clusterPlanPayload(c), { silent: true });
          if (result.status === 'added' || result.status === 'expanding') {
            if (result.status === 'expanding') pending += 1; else added += 1;
            const first = result.entry || result.entries?.[0] || null;
            setAddedClusters((prev) => ({
              ...prev,
              [key]: {
                status: result.status,
                publishDate: first?.publishDate || null,
                count: result.added ?? result.estimatedEntries ?? (result.entries?.length || 1),
              },
            }));
            // Background expansions resolve their card via the shared watcher.
            if (result.status === 'expanding') watchClusterOutcome(key, Date.now());
          } else if (result.status === 'blocked') {
            blocked += 1;
            setAddedClusters((prev) => ({ ...prev, [key]: { status: 'covered', publishDate: null, count: 0 } }));
          } else failed += 1;
        }
      } finally {
        if (mountedRef.current) setAddingClusterKey(null);
      }
      const parts = [];
      if (added > 0) parts.push(`Added ${added} topic${added === 1 ? '' : 's'}.`);
      if (pending > 0) parts.push(`${pending} still adding, the card${pending === 1 ? '' : 's'} will update.`);
      if (blocked > 0) parts.push(`${blocked} skipped, you already rank for ${blocked === 1 ? 'it' : 'them'}.`);
      if (failed > 0) parts.push(`${failed} failed, try ${failed === 1 ? 'it' : 'them'} again.`);
      const summary = parts.join(' ');
      // Only claim and dismiss the guide on adds that actually landed; a
      // pending expansion can still resolve to covered/failed.
      if (added > 0) {
        planAddedToast(summary);
        dismiss();
      } else if (summary) {
        toast(summary, { icon: pending > 0 ? '⏳' : '✋', duration: 6000 });
      }
    };
    return (
      <div className="relative rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 mb-6">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-3 right-3 p-1 rounded text-emerald-700/60 hover:text-emerald-800 hover:bg-emerald-100"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pr-8">
          <ol className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-emerald-900">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">1</span>
              Research finds topics you can rank for
            </li>
            <ArrowRight className="w-4 h-4 text-emerald-500 hidden sm:block shrink-0" />
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">2</span>
              The best ones flow into your plan automatically
            </li>
            <ArrowRight className="w-4 h-4 text-emerald-500 hidden sm:block shrink-0" />
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">3</span>
              Articles write themselves on your calendar
            </li>
          </ol>
          <button
            type="button"
            onClick={addBestBets}
            disabled={!!addingClusterKey}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover shadow-sm disabled:opacity-50 shrink-0"
          >
            {addingClusterKey ? <Loader className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
            Add best bets to plan
          </button>
        </div>
      </div>
    );
  };

  // Render a cluster card with the shared handlers.
  const renderClusterCard = (cluster, { whyLine } = {}) => (
    <ClusterCard
      key={cluster.label || cluster.pillarKeyword}
      cluster={cluster}
      isBestBet={bestBetKeys.has(cluster.label || cluster.pillarKeyword)}
      whyLine={whyLine}
      onAddCluster={addClusterToPlan}
      onOpenDrawer={setDrawerCluster}
      onDismiss={dismissTopic}
      addingClusterKey={addingClusterKey}
      addedState={addedClusters[cluster.label || cluster.pillarKeyword]}
      onViewPlan={() => navigate('/dashboard')}
    />
  );

  const renderTopicsView = () => {
    if (processing && clusters.length === 0) return renderProcessing();
    if (!hasResults && clusters.length === 0) return renderEmptyState();
    return (
      <>
        {renderTopicsHeader()}
        {renderFirstRunStrip()}
        {filterRow}
        {filteredClusters.length === 0 ? (
          <div className="rounded-xl bg-white border border-gray-200 p-10 text-center">
            <p className="text-sm text-gray-500">
              {term || intentFilter !== 'all' || maxKdNum !== null
                ? 'No topics match your filters. Try clearing the search or raising the max difficulty.'
                : 'Everything here is in your plan or dismissed. Re-run keyword research to find more topics.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Your next plan slots: the strongest topics, with a one-line WHY. */}
            {topSlots.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Best topics to add first</h3>
                  <span className="text-xs text-gray-400">Real demand, winnable difficulty for your site</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {topSlots.map((cluster) => renderClusterCard(cluster, { whyLine: clusterWhy(cluster) }))}
                </div>
              </div>
            )}

            {/* More topics: everything else, quieter. */}
            {moreClusters.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-3">
                  {topSlots.length > 0 ? 'More topics' : 'Topics'}
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {moreClusters.map((cluster) => renderClusterCard(cluster))}
                </div>
              </div>
            )}
          </div>
        )}
        {renderInPlanSection()}
      </>
    );
  };

  // Collapsed record of topics already in the plan, so this page reads as
  // "how your plan was built", not just a pile of buttons. Expanding lazily
  // fetches per-topic plan counts once (covers autopilot additions).
  const renderInPlanSection = () => {
    if (inPlanTopics.length === 0) return null;
    return (
      <div className="mt-8 rounded-xl bg-white border border-gray-200" data-testid="in-plan-section">
        <button
          type="button"
          onClick={() => {
            const next = !inPlanOpen;
            setInPlanOpen(next);
            if (next) fetchPlanTopicCounts();
          }}
          aria-expanded={inPlanOpen}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Check className="w-4 h-4 text-emerald-600" />
            In your plan
            <span className="text-xs font-normal text-gray-500">
              {inPlanTopics.length} topic{inPlanTopics.length === 1 ? '' : 's'} from this research
            </span>
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${inPlanOpen ? 'rotate-180' : ''}`} />
        </button>
        {inPlanOpen && (
          <div className="border-t border-gray-100 divide-y divide-gray-50">
            {inPlanTopics.map((t) => (
              <div key={t.label} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{t.label}</p>
                  <p className="text-xs text-gray-500">
                    {t.status === 'covered' && t.count === 0
                      ? 'Already covered by your existing posts'
                      : `${t.count || 1} article${(t.count || 1) === 1 ? '' : 's'} scheduled`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="shrink-0 text-xs font-medium text-primary hover:underline"
                >
                  View in plan
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAllView = () => {
    if (!hasResults && clusters.length === 0) return renderEmptyState();
    const pageIds = allPageRows.map(rowId);
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedRows.has(id));
    return (
      <>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>
              <span className="font-semibold text-gray-900">{filteredAllRows.length}</span> keywords
              {selectedRows.size > 0 && (
                <span className="ml-2 text-gray-700 font-medium">· {selectedRows.size} selected</span>
              )}
            </span>
            {/* Visible way back to the default best-first order after any
                header click reorders the table. */}
            <button
              type="button"
              onClick={() => { setSortBy('score'); setSortDir('desc'); }}
              aria-pressed={sortBy === 'score'}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                sortBy === 'score'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              Best opportunity first
            </button>
          </div>
          <div className="flex items-center gap-2">
            {selectedRows.size > 0 && (
              <button
                type="button"
                onClick={saveSelected}
                disabled={savingList}
                className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover shadow-sm disabled:opacity-50"
              >
                {savingList ? <Loader className="w-4 h-4 mr-1.5 animate-spin" /> : <ListPlus className="w-4 h-4 mr-1.5" />}
                Save {selectedRows.size} to list
              </button>
            )}
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 border border-gray-200"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </button>
          </div>
        </div>

        {filterRow}

        <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                      checked={allPageSelected}
                      onChange={togglePageSelection}
                    />
                  </th>
                  <SortableHeader label="Keyword" column="kw" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Volume" column="volume" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} tip="searchVolume" />
                  <SortableHeader label="KD" column="kd" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} tip="kd" />
                  <SortableHeader label="Intent" column="intent" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} tip="intent" />
                  <SortableHeader label="Topic" column="cluster" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Source" column="source" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allPageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500">
                      No keywords match your filters.
                    </td>
                  </tr>
                ) : allPageRows.map((kw) => {
                  const id = rowId(kw);
                  const rk = `${kw.kw}-${kw.volume}-${kw.kd}`;
                  return (
                    <tr key={id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                          checked={selectedRows.has(id)}
                          onChange={() => toggleRow(kw)}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{kw.kw}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 tabular-nums">{formatVolume(kw.volume)}</td>
                      <td className="px-4 py-3"><MetricChip metric="kd" value={kw.kd} /></td>
                      <td className="px-4 py-3"><MetricChip metric="intent" value={kw.intent} /></td>
                      <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-[200px]">{kw.cluster}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{humanizeSource(kw.source)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {kw.covered ? (
                            // Pre-flight: the site already owns this keyword, so
                            // never render an Add that can only come back blocked.
                            <span className="text-xs px-2 py-1 text-emerald-700 font-medium inline-flex items-center whitespace-nowrap">
                              Already covered
                            </span>
                          ) : (
                          <button
                            type="button"
                            onClick={() => addKeywordToPlan(kw, rk)}
                            disabled={addingRowKey === rk}
                            className="text-xs px-2 py-1 text-primary hover:bg-primary/10 rounded font-medium disabled:opacity-50 inline-flex items-center"
                          >
                            {addingRowKey === rk ? <Loader className="w-3 h-3 animate-spin" /> : '+ Add to plan'}
                          </button>
                          )}
                          <Tooltip content="Save for later. Saved keywords show up when you bulk-generate articles.">
                            <button
                              type="button"
                              onClick={() => saveToList(kw)}
                              className="text-xs px-1.5 py-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded inline-flex items-center"
                            >
                              <ListPlus className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredAllRows.length > 0 && (
            <Pagination
              page={allPage}
              pageSize={allPageSize}
              total={filteredAllRows.length}
              onPageChange={setAllPage}
              onPageSizeChange={(size) => { setAllPageSize(size); setAllPage(1); }}
              pageSizeOptions={[25, 50, 100, 200]}
              label="keywords"
            />
          )}
        </div>
      </>
    );
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <NavbarWrapper
      user={user}
      logout={logout}
      onShowBulkGenerate={() => setShowBulkGenerateModal(true)}
      onShowImageStyle={() => setShowImageStyleModal(true)}
      onShowSupport={() => setShowSupportModal(true)}
      onShowAdmin={() => setShowAdminPanel(true)}
      onShowSubscription={() => setShowSubscriptionModal(true)}
      updateCurrentSite={updateCurrentSite}
      currentSite={currentSite}
    >
      <div className="flex-1 overflow-auto">
        <div className="p-4 lg:p-12 lg:pt-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
            <div className="flex-1">
              <h2 className="text-xl lg:text-2xl font-bold text-left mb-2">Topics</h2>
              <p className="text-sm text-gray-500 text-left mb-2">
                Topics you can rank for, with real search volume and difficulty.
                Your plan pulls from this research automatically. Add anything here to jump the queue.
              </p>
            </div>
          </div>

          {initialLoading ? (
            <TopicsSkeleton />
          ) : (
            <>
              {/* Cards/table view toggle (rankings moved to the Rankings page). */}
              <div className="flex justify-end mb-6">
                {viewToggle}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 p-4 mb-6 rounded-lg flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 flex-1">{error}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      invalidate(`kwstatus:${siteString}`);
                      invalidate(`kwclusters:${siteString}`);
                      loadInitial();
                    }}
                    className="inline-flex items-center shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium text-red-700 border border-red-200 hover:bg-red-100"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </button>
                </div>
              )}

              {/* View body */}
              {activeView === 'topics' && renderTopicsView()}
              {activeView === 'all' && renderAllView()}
            </>
          )}
        </div>
      </div>

      {/* Per-cluster keyword slide-over (Topics "See all"). */}
      <KeywordDrawer
        cluster={drawerCluster}
        onClose={() => setDrawerCluster(null)}
        onAddKeyword={addKeywordToPlan}
        onSaveKeyword={(kw) => saveToList(kw)}
        addingRowKey={addingRowKey}
      />
    </NavbarWrapper>
  );
};

export default KeywordFinder;
