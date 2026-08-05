import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  Target,
  ExternalLink,
  Clock,
  Lock,
  Users,
  ChevronDown,
  X
} from 'lucide-react';
import { useImpersonation } from '../../contexts/ImpersonationContext';
import { useModals } from '../../contexts/ModalContext';
import { useTour } from '../../contexts/TourContext';
import NavbarWrapper from '../../components/Navbar';
import apiClient from '../../utils/apiClient';
import { cachedFetch, invalidate } from '../../utils/apiCache';

// ---------- helpers ----------

const formatDate = (date) => {
  if (!date) return 'Never';
  const d = new Date(date);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
};

// Compact large numbers for tight table cells: 2138296 -> "2.1M", 646625 -> "647K".
const formatCompact = (n) => {
  if (!n || n <= 0) return '—';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return `${Math.round(n)}`;
};

const LLM_STYLES = {
  chatgpt: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'ChatGPT' },
  chat_gpt: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'ChatGPT' },
  claude: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Claude' },
  gemini: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Gemini' },
  google: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Google AI' },
  google_ai_overview: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Google AI' },
  perplexity: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Perplexity' },
  unknown: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Other' }
};

// Normalize backend platform keys (chat_gpt, google) to display labels
const normalizeLlmKey = (llm) => {
  const k = (llm || '').toLowerCase().replace(/[\s-]/g, '_');
  if (k === 'chatgpt') return 'chat_gpt';
  return k;
};

const LlmBadge = ({ llm }) => {
  const key = normalizeLlmKey(llm);
  const style = LLM_STYLES[key] || LLM_STYLES.unknown;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
};

// ---------- skeletons ----------

// Compact strip skeleton mirrors the single-row summary so the loading state
// is the same height as the loaded state (no layout jump above the fold).
const StripSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
    <div className="flex items-center gap-8">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="h-3 bg-gray-200 rounded w-20"></div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
        </div>
      ))}
      <div className="flex-1 h-3 bg-gray-200 rounded"></div>
    </div>
  </div>
);

const GridSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {[...Array(2)].map((_, c) => (
      <div key={c} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 bg-gray-200 rounded flex-1"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ---------- subcomponents ----------

// Single summary metric inside the slim stat strip: small label above a bold
// tabular number. Semantic color reserved for values; labels stay slate-600.
const StatItem = ({ label, value, valueClass = 'text-gray-900', title }) => (
  <div className="flex flex-col" title={title}>
    <span className="text-xs font-medium text-gray-600">{label}</span>
    <span className={`text-xl font-bold tabular-nums leading-tight ${valueClass}`}>{value}</span>
  </div>
);

// One tooltip string for every "AI search volume" number on the page, so the
// metric is taught the same way everywhere it appears.
const AI_VOLUME_EXPLAINER = 'How many times per month people ask AI the questions where you appear.';

const ProGate = ({ onUpgrade }) => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="text-center max-w-md mx-auto px-6">
      <div className="w-16 h-16 bg-gradient-to-br from-primary to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Lock className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">Unlock AI Mention Tracker</h2>
      <p className="text-gray-600 mb-6">
        See exactly when ChatGPT, Claude, Gemini, and Perplexity cite your site, and where you stand against competitors in AI search.
      </p>
      <ul className="text-left space-y-3 mb-8">
        <li className="flex items-center text-sm text-gray-700">
          <Sparkles className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
          Track citations across ChatGPT, Gemini, Google AI, and more
        </li>
        <li className="flex items-center text-sm text-gray-700">
          <Target className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
          See the exact queries that surface your brand
        </li>
        <li className="flex items-center text-sm text-gray-700">
          <Users className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
          Benchmark against competitors in your niche
        </li>
      </ul>
      <button
        onClick={onUpgrade}
        className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 px-6 rounded-lg transition-colors"
      >
        Upgrade to Pro+
      </button>
    </div>
  </div>
);

const EmptyState = ({ site, onRefresh, refreshing }) => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Run your first AI mentions scan</h3>
      <p className="text-sm text-gray-600 mb-6">
        We'll check whether ChatGPT, Gemini, and Google AI are citing <span className="font-medium">{site || 'your site'}</span>.
        Takes about 30 seconds, then re-checks automatically every week.
      </p>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
          refreshing
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-primary hover:bg-primary-hover text-white'
        }`}
      >
        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        {refreshing ? 'Fetching…' : 'Run first scan'}
      </button>
    </div>
  </div>
);

// ISO week key (e.g. "2026-W27") for a date, Thursday-based per ISO 8601.
// Used to bucket snapshot history to one point per week.
const isoWeekKey = (dateStr) => {
  const d = new Date(dateStr);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${week}`;
};

// Normalize snapshot history into chart points, bucketed to one point per
// ISO week (latest snapshot wins). Manual refreshes write extra snapshot
// rows mid-week; without bucketing they jag a chart we describe as weekly.
const historyPoints = (history) => {
  const byWeek = new Map();
  (history || [])
    .filter((p) => p && p.date)
    .forEach((p) => {
      const key = isoWeekKey(p.date);
      const existing = byWeek.get(key);
      if (!existing || new Date(p.date) > new Date(existing.date)) {
        byWeek.set(key, { date: p.date, totalMentions: p.totalMentions || 0 });
      }
    });
  return [...byWeek.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Full axis-labeled trend chart, shown inside the detail drawer only.
const MentionsTrendChart = ({ history }) => {
  const points = historyPoints(history);

  if (points.length < 2) {
    return (
      <div className="h-[220px] flex flex-col items-center justify-center text-center px-6">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <p className="text-sm font-medium text-gray-700">History builds weekly</p>
        <p className="text-xs text-gray-500 mt-1 max-w-xs">
          We snapshot your AI mentions once a week. Your trend line fills in
          as more snapshots land, check back after the next refresh.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            interval="preserveEnd"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            stroke="#e5e7eb"
          />
          <YAxis
            allowDecimals={false}
            width={40}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            stroke="#e5e7eb"
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K` : v)}
          />
          <Tooltip
            labelFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            formatter={(value) => [Number(value).toLocaleString(), 'Mentions']}
          />
          <Line
            type="monotone"
            dataKey="totalMentions"
            name="Mentions"
            stroke="#7c3aed"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Right-side detail drawer: full trend chart + the complete queries table.
// Internal scroll, closes on Esc or backdrop click. Keeps the deep detail off
// the main page so nothing important sits below the fold at 1440x900.
const DetailDrawer = ({ open, onClose, children }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-gray-900/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI mentions detail"
        className="relative bg-gray-50 w-full max-w-2xl h-full shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Mentions detail</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Close detail"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// ---------- main view ----------

const AiMentions = ({ logout, currentSite, updateCurrentSite }) => {
  const { user, siteSettings, currentSubscription, isImpersonating, currentSite: activeSiteName } = useImpersonation();
  const {
    setShowSubscriptionModal,
    setShowSupportModal,
    setShowImageStyleModal,
    setShowAdminPanel,
    setShowBulkGenerateModal
  } = useModals();

  // The guided tour spotlights the trend + queries panels, which now live in
  // the "See detail" drawer. Steps flagged openDrawer tell us to pop the
  // drawer so their selectors resolve; other steps leave it as the user set it.
  const tour = useTour();
  const tourStep = tour?.getCurrentStepConfig?.();

  // Router navigation for the "Add competitors in Settings" link.
  const navigate = useNavigate();

  // Drive off the selected site (instant) instead of siteSettings.site, which
  // only lands after /get-site-settings resolves. Without this, switching
  // sites kept showing the previous site's mentions for ~10s. Falls back to
  // siteSettings/prop defensively.
  const site = activeSiteName
    || siteSettings?.site
    || (typeof currentSite === 'string' ? currentSite : currentSite?.site);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Trust the subscription context until the API tells us otherwise
  const [hasPro, setHasPro] = useState(!!currentSubscription?.isActive);
  const [snapshot, setSnapshot] = useState(null);
  const [lastQueriedAt, setLastQueriedAt] = useState(null);
  // Snapshot history for the "Mentions over time" trend chart. Accumulates one
  // point per weekly refresh; fetched alongside the latest snapshot.
  const [history, setHistory] = useState([]);
  // True when DataForSEO returned a task-level access-denied (their AI
  // Optimization API isn't on our plan). We show an admin banner instead
  // of pretending refresh succeeded — that's why customers were seeing
  // zero mentions despite running fine before.
  const [providerAccessDenied, setProviderAccessDenied] = useState(false);
  // Deep detail (full trend chart + all-queries table) lives in a drawer so
  // the main page never needs scrolling to reach the payoff content.
  const [detailOpen, setDetailOpen] = useState(false);

  // Open the detail drawer when the tour reaches a drawer step so its anchor
  // resolves; the tour's own scroll-into-view then finds the mounted element.
  useEffect(() => {
    if (tourStep?.openDrawer) setDetailOpen(true);
  }, [tourStep?.openDrawer, tourStep?.id]);

  // Raw provider diagnostics belong in the console, not on a customer-facing
  // page. Even the admin-only banner stays short; the vendor error code and
  // billing detail live here for anyone debugging with devtools open.
  useEffect(() => {
    if (!providerAccessDenied) return;
    console.log(
      'AI mentions provider diagnostics: DataForSEO returned 40204 Access denied on /ai_optimization/llm_mentions/*. ' +
      'The LLM Mentions endpoint family requires a $100/month minimum commitment activated on the account ' +
      '(llm_mentions_subscription_expiry_date is currently null, separate from the credit balance). ' +
      'Activate at https://dataforseo.com/pricing/ai-optimization/llm-mentions or email support@dataforseo.com. ' +
      'The next refresh writes a real snapshot once the subscription is live.'
    );
  }, [providerAccessDenied]);

  // Keep hasPro in sync with subscription context while we wait for first API response
  useEffect(() => {
    if (currentSubscription?.isActive) setHasPro(true);
  }, [currentSubscription?.isActive]);

  // Apply a snapshot API payload to local state (shared by fresh + cached
  // hits so the cachedFetch onUpdate repaint runs the same code path).
  const applySnapshot = useCallback((data) => {
    if (!data?.success) return;
    setHasPro(true);
    setSnapshot(data.snapshot);
    setLastQueriedAt(data.lastQueriedAt);
    setProviderAccessDenied(!!data.providerAccessDenied);
  }, []);

  // Fetch snapshot via the shared apiCache: tab switches render instantly from
  // the last snapshot (ttl 60s fresh / 10min stale) while a background refresh
  // repaints through onUpdate.
  const fetchSnapshot = useCallback(async () => {
    if (!site) {
      // Don't decide Pro status yet — wait for site to load
      return;
    }
    try {
      const data = await cachedFetch(
        `aim:${site}`,
        () => apiClient.get(`/api/ai-mentions/${site}`).then((r) => r.data),
        { ttlMs: 60_000, staleMs: 600_000, onUpdate: applySnapshot }
      );
      applySnapshot(data);
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.needsUpgrade) {
        setHasPro(false);
      } else {
        console.error('Error fetching AI mentions:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [site, applySnapshot]);

  // Fetch the trend history via the shared cache. Best-effort: a failure here
  // just leaves the chart in its empty state and never blocks the snapshot.
  const fetchHistory = useCallback(async () => {
    if (!site) return;
    try {
      const data = await cachedFetch(
        `aimhist:${site}`,
        () => apiClient.get(`/api/ai-mentions/${site}/history`).then((r) => r.data),
        { ttlMs: 60_000, staleMs: 600_000, onUpdate: (d) => { if (d?.success) setHistory(d.history || []); } }
      );
      if (data?.success) setHistory(data.history || []);
    } catch (error) {
      // Non-fatal (e.g. 403 before Pro status resolves); keep chart empty.
      setHistory([]);
    }
  }, [site]);

  // Reset to the skeleton the instant the site changes so a switch never
  // shows the previous site's snapshot while the new fetch is in flight.
  // fetchSnapshot itself doesn't flip loading back on (it only clears it),
  // so without this the stale snapshot would linger until the new one lands.
  useEffect(() => {
    setLoading(true);
    setSnapshot(null);
    setHistory([]);
  }, [site]);

  useEffect(() => { fetchSnapshot(); }, [fetchSnapshot]);
  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleRefresh = async () => {
    if (!site || refreshing) return;
    // The refresh button shows a spinner + "Refreshing…" label while in
    // flight, so we skip the progress toast (it was rendering at the same
    // time and felt noisy). Only fire a toast on the terminal states the
    // button can't communicate: the actual count found, or an error.
    try {
      setRefreshing(true);
      const response = await apiClient.post(`/api/ai-mentions/${site}/refresh`);
      if (response.data.success) {
        setSnapshot(response.data.snapshot);
        setLastQueriedAt(response.data.snapshot?.queriedAt);
        setProviderAccessDenied(false);
        // A manual refresh writes a new snapshot row — drop the cached
        // snapshot/history so a later tab switch reloads the fresh data,
        // then pull the new history point into the trend now.
        invalidate(`aim:${site}`);
        invalidate(`aimhist:${site}`);
        fetchHistory();
        const found = response.data.snapshot?.metrics?.totalMentions ?? 0;
        if (found > 0) {
          toast.success(`Found ${found.toLocaleString()} mentions across AI`);
        } else {
          // Neutral toast, not a green success checkmark: the scan worked,
          // but "no mentions" isn't good news to celebrate.
          toast("Scan complete. No AI mentions yet, we'll keep checking weekly.");
        }
      }
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.needsUpgrade) {
        setHasPro(false);
      } else if (error.response?.status === 503 && error.response?.data?.providerAccessDenied) {
        // DFS plan-gating — preserve any cached snapshot the server sent
        // back and flip the admin banner. Only surface the error toast to
        // admins (impersonators); customers shouldn't be told the backend
        // is broken when their cached data is still rendering fine.
        setProviderAccessDenied(true);
        if (error.response.data.snapshot) {
          setSnapshot(error.response.data.snapshot);
          setLastQueriedAt(error.response.data.lastQueriedAt);
        }
        if (isImpersonating) {
          toast.error('AI mentions provider is unavailable. See banner for details.');
        }
      } else {
        toast.error('Refresh failed. Try again.');
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Derived stats
  const metrics = snapshot?.metrics;
  const mentions = snapshot?.mentions || [];
  const competitors = snapshot?.topCompetitors || [];

  const totalMentions = metrics?.totalMentions ?? 0;
  const totalAiVolume = metrics?.totalAiSearchVolume ?? 0;
  const topLlm = metrics?.topLlm;
  const domainLower = (site || '').toLowerCase();

  // Match the "You" row loosely on the www prefix: the backend normalizes
  // landscape domains with cleanDomain, so "www.foo.com" and "foo.com" are
  // the same site here.
  const isYouRow = (c) =>
    (c.domain || '').toLowerCase().replace(/^www\./, '') === domainLower.replace(/^www\./, '');

  // Top 6 competitor rows for display, but never cut the customer's own row:
  // the backend appends their domain to the landscape, and the whole point of
  // the "You" badge is seeing yourself next to the rivals.
  const competitorRows = (() => {
    const top = competitors.slice(0, 6);
    const you = competitors.find(isYouRow);
    if (you && !top.some(isYouRow)) top[top.length - 1] = you;
    return top;
  })();

  // Platform mix (Google AI vs ChatGPT etc.) — for visual breakdown
  const byLlm = metrics?.byLlm || {};
  const platformBreakdown = Object.entries(byLlm)
    .map(([key, val]) => ({
      key,
      label: LLM_STYLES[normalizeLlmKey(key)]?.label || key,
      mentions: val.mentions || 0,
      aiSearchVolume: val.aiSearchVolume || 0,
      bg: LLM_STYLES[normalizeLlmKey(key)]?.bg || 'bg-gray-100',
      text: LLM_STYLES[normalizeLlmKey(key)]?.text || 'text-gray-700'
    }))
    .sort((a, b) => b.mentions - a.mentions);

  // Group mentions by source URL: which of THEIR pages power the most AI traffic
  const topPages = (() => {
    const grouped = new Map();
    mentions.forEach((m) => {
      const url = m.sourceUrl;
      if (!url) return;
      const existing = grouped.get(url) || {
        url,
        title: m.title || '',
        queryCount: 0,
        totalAiVolume: 0,
        queries: []
      };
      existing.queryCount += 1;
      existing.totalAiVolume += m.aiSearchVolume || 0;
      existing.queries.push({ query: m.query, aiSearchVolume: m.aiSearchVolume || 0, llm: m.llm });
      if (!existing.title && m.title) existing.title = m.title;
      grouped.set(url, existing);
    });
    return [...grouped.values()].sort((a, b) => b.totalAiVolume - a.totalAiVolume);
  })();

  // Full queries list (drawer only), sorted by AI volume — biggest first.
  const sortedMentions = [...mentions].sort(
    (a, b) => (b.aiSearchVolume || 0) - (a.aiSearchVolume || 0)
  );

  const platformBarColor = (key) =>
    key === 'google' || key === 'google_ai_overview' ? 'bg-indigo-400'
      : key === 'chat_gpt' || key === 'chatgpt' ? 'bg-teal-400'
      : key === 'claude' ? 'bg-purple-400'
      : key === 'perplexity' ? 'bg-amber-400'
      : key === 'gemini' ? 'bg-blue-400'
      : 'bg-gray-300';

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
      {/* Page chrome matches Dashboard / Keyword Finder — see the matching
          comment in SeoAnalysis. Keeps title + description placement
          consistent across all primary tool pages. */}
      <main className="flex-1 p-4 lg:p-12 lg:pt-8 overflow-auto pb-20 lg:pb-12">
        <div className="max-w-full">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
            <div className="flex-1">
              <h2 className="text-xl lg:text-2xl font-bold text-left mb-2">AI Mentions</h2>
              {/* Persistent plain-words definition: most customers have never
                  heard "AI mention" before, so teach the metric right under
                  the title on every visit, not just in empty states. */}
              <p className="text-sm text-gray-500 text-left mb-1">
                {site
                  ? `When someone asks ChatGPT or Google AI a question and the answer points to ${site}, that's a mention. More mentions means more customers finding you through AI.`
                  : 'Connect a site to get started'}
              </p>
              {site && (
                <p className="text-sm text-gray-500 text-left mb-2">
                  We scan ChatGPT, Gemini, and Google AI for citations of {site} every week.
                </p>
              )}
            </div>

            {hasPro && (
              <div className="mt-4 lg:mt-0 flex items-center gap-4">
                <div className="text-sm text-gray-500">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Last updated: {formatDate(lastQueriedAt)} · re-checks automatically every week
                </div>
                <button
                  data-tour="ai-mentions-refresh"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    refreshing
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary-hover text-white'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
            )}
          </div>

          {/* Provider access-denied banner. Only rendered during admin
              impersonation — this is an actionable message for us, not for
              the customer. Customers keep seeing their cached snapshot
              quietly until we re-enable the DFS AI Optimization add-on. */}
          {!loading && hasPro && providerAccessDenied && isImpersonating && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">!</div>
                <div className="flex-1 text-sm">
                  <p className="font-medium text-amber-900">
                    AI mentions data isn't refreshing <span className="ml-1 text-xs text-amber-700 font-normal">(admin: see server logs, visible to admins only)</span>
                  </p>
                  {snapshot && (
                    <p className="text-amber-700 mt-2 text-xs">
                      Showing the most recent snapshot with data{lastQueriedAt ? ` from ${formatDate(lastQueriedAt)}` : ''}.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="space-y-6">
              <StripSkeleton />
              <GridSkeleton />
            </div>
          )}

          {/* Premium gate */}
          {!loading && !hasPro && (
            <ProGate onUpgrade={() => setShowSubscriptionModal(true)} />
          )}

          {/* Empty state — suppressed when the provider banner is showing
              so we don't tell the user "we're checking AI mentions" right
              under a banner explaining we can't. */}
          {!loading && hasPro && !snapshot && !providerAccessDenied && (
            <EmptyState site={site} onRefresh={handleRefresh} refreshing={refreshing} />
          )}

          {/* Main content */}
          {!loading && hasPro && snapshot && (
            <div className="space-y-6">
              {/* Honest zero-state. The snapshot ran fine — DFS just had no
                  citations indexed for this host. Without this, the user
                  sees an empty strip with no explanation and the whole page
                  reads like a broken refresh button. Suppressed when the
                  provider banner is showing so we don't double up on
                  "nothing to see here" messaging. */}
              {totalMentions === 0 && !providerAccessDenied && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 mb-1">
                        No AI Mentions Yet for {site}
                      </h3>
                      <p className="text-sm text-gray-600">
                        ChatGPT, Gemini, and Google AI haven't cited your site yet. That's normal for newer sites, most brands start at zero. Every article Blawgy publishes gives AI tools another page worth quoting. We re-check every week, and you'll see your first mentions land right here.
                      </p>
                      {/* Host-variant / data-flow debugging tips are for us,
                          not the customer. Admin-only. */}
                      {isImpersonating && (
                        <p className="text-xs text-amber-700 mt-2">
                          Admin: some brands get indexed under www, others bare. Double-check the domain variant, or run a competitor's domain to confirm the data is flowing.
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-3">
                        Last checked {formatDate(lastQueriedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Slim summary strip: three headline numbers + inline platform
                  split, all in one row. Replaces the three tall stat cards and
                  the standalone "Where you're being cited" bar so the payoff
                  content leads without scrolling. The platform split keeps the
                  ai-mentions-platforms tour anchor. */}
              <div data-tour="ai-mentions-stats" className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
                  <div className="flex items-center gap-8 flex-shrink-0">
                    <StatItem label="Mentions across AI" value={totalMentions.toLocaleString()} />
                    <StatItem
                      label="AI search volume"
                      value={totalAiVolume.toLocaleString()}
                      title={AI_VOLUME_EXPLAINER}
                    />
                    <StatItem
                      label="Top AI tool"
                      value={topLlm ? (LLM_STYLES[normalizeLlmKey(topLlm)]?.label || topLlm) : '—'}
                    />
                  </div>

                  {/* Inline platform split (merged from the old bar). Keeps the
                      ai-mentions-platforms tour selector. */}
                  {platformBreakdown.length > 0 && totalMentions > 0 && (
                    <div data-tour="ai-mentions-platforms" className="flex-1 min-w-0 lg:border-l lg:border-gray-100 lg:pl-8">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600">Where you're being cited</span>
                      </div>
                      <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
                        {platformBreakdown.map((p) => {
                          const pct = (p.mentions / totalMentions) * 100;
                          return (
                            <div
                              key={p.key}
                              className={platformBarColor(p.key)}
                              style={{ width: `${pct}%` }}
                              title={`${p.label}: ${p.mentions} mentions`}
                            />
                          );
                        })}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {platformBreakdown.map((p) => (
                          <span key={p.key} className="inline-flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${platformBarColor(p.key)}`} />
                            <span className="text-xs text-gray-600">{p.label}</span>
                            <span className="text-xs font-semibold text-gray-900 tabular-nums">
                              {p.mentions.toLocaleString()}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setDetailOpen(true)}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover transition-colors self-start lg:self-center"
                  >
                    See detail
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </button>
                </div>
              </div>

              {/* Two-column payoff content, above the fold: your cited pages
                  (left) + competitor standing (right). These lead because they
                  are what customers came for. Stacks 1-col on smaller screens. */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Your top performing pages — grouped by source URL */}
              <div data-tour="ai-mentions-top-pages" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Your top pages cited by AI</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    The content on your site that AI tools quote the most
                  </p>
                </div>
                {topPages.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-600">
                    No cited pages yet. Citations typically appear within a few days of indexing.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {topPages.slice(0, 6).map((p) => {
                      const path = (() => {
                        try { return new URL(p.url).pathname; }
                        catch { return p.url; }
                      })();
                      return (
                        <div key={p.url} className="px-6 py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <a
                                href={p.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-gray-900 hover:text-primary truncate inline-flex items-center gap-1"
                              >
                                {path}
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              </a>
                              {p.title && (
                                <p className="text-xs text-gray-600 mt-0.5 truncate">{p.title}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-gray-100 text-xs font-medium text-gray-700 tabular-nums">
                                  {p.queryCount} {p.queryCount === 1 ? 'query' : 'queries'}
                                </span>
                                <span className="text-xs text-gray-500 truncate">
                                  {p.queries.slice(0, 2).map((q) => q.query).join(', ')}
                                  {p.queries.length > 2 ? ` +${p.queries.length - 2}` : ''}
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0" title={AI_VOLUME_EXPLAINER}>
                              <div className="text-sm font-semibold text-gray-900 tabular-nums">
                                {p.totalAiVolume.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">AI searches/mo</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top competitors in niche */}
              <div data-tour="ai-mentions-competitors" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Top competitors in your niche</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Your competitors, ranked by traffic and AI citations
                  </p>
                </div>
                {competitors.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-600">
                    No competitors yet.{' '}
                    <button
                      onClick={() => navigate('/settings/site-settings')}
                      className="text-primary hover:underline font-medium"
                    >
                      Add competitors in Settings
                    </button>{' '}
                    to see how you rank on traffic and AI citations.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Rank</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Domain</th>
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Traffic/mo</th>
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Mentions</th>
                          <th
                            className="px-4 py-2.5 text-right text-xs font-medium text-gray-600 uppercase tracking-wider"
                            title="Mentions compared to AI search volume. Higher means AI cites this site more often for the questions people ask."
                          >
                            Citation rate
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {competitorRows.map((c) => {
                          const isYou = isYouRow(c);
                          return (
                            <tr
                              key={`${c.domain}-${c.rank}`}
                              className={isYou ? 'bg-accent/30' : 'hover:bg-gray-50'}
                            >
                              <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900 tabular-nums">
                                #{c.rank}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-900">
                                <span className="font-medium">{c.domain}</span>
                                {isYou && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary text-white">
                                    You
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700 text-right tabular-nums">
                                {formatCompact(c.etv)}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700 text-right tabular-nums">
                                {(c.mentions || 0).toLocaleString()}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700 text-right tabular-nums">
                                {c.citationRate ? `${(c.citationRate * 100).toFixed(1)}%` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Detail drawer: full trend chart + complete queries table. Off-page so
          the summary + payoff content fit above the fold; internal scroll,
          Esc/backdrop closes. Carries the ai-mentions-trend + ai-mentions-queries
          tour anchors so the tour still resolves — it opens the drawer first. */}
      <DetailDrawer open={detailOpen} onClose={() => setDetailOpen(false)}>
        <div data-tour="ai-mentions-trend" className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Mentions over time</h2>
              <p className="text-sm text-gray-600 mt-0.5">Total AI citations per week</p>
            </div>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <MentionsTrendChart history={history} />
        </div>

        <div data-tour="ai-mentions-queries" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Queries you appear in</h2>
            <p className="text-sm text-gray-600 mt-1">
              Showing your top 50 queries by AI search volume
            </p>
          </div>
          {sortedMentions.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-600">
              No mentions tracked yet. Citations typically appear within a few days of indexing.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Query</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Where</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider" title={AI_VOLUME_EXPLAINER}>AI Volume</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Your page</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {sortedMentions.slice(0, 50).map((m, i) => {
                    const path = (() => {
                      try { return new URL(m.sourceUrl).pathname; }
                      catch { return m.sourceUrl || ''; }
                    })();
                    return (
                      <tr key={`${m.query}-${i}`} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm text-gray-900 max-w-xs">
                          <div className="truncate" title={m.query}>{m.query || '—'}</div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <LlmBadge llm={m.llm} />
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium tabular-nums">
                          {(m.aiSearchVolume || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-sm">
                          {m.sourceUrl ? (
                            <a
                              href={m.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-primary hover:underline max-w-xs truncate"
                              title={m.sourceUrl}
                            >
                              {path}
                              <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0" />
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DetailDrawer>
    </NavbarWrapper>
  );
};

export default AiMentions;
