import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import apiClient from '../utils/apiClient';
import NavbarWrapper from '../components/Navbar';
import { useModals } from '../contexts/ModalContext';

// Full-page, RevenueCat-style business dashboard (see docs/future-plans/
// business-dashboard.md). One global granularity control (day/week/month/quarter)
// plus a periods preset re-buckets every stat at once by re-fetching both admin
// endpoints. Supersedes the cramped modal Stats tab, which is now a link card.
// Admin-gated on the same user.isAdmin flag the Navbar uses.

// Data-mark colors (validated CVD-safe against a white surface via the dataviz
// skill's validator): blue is the single-series color everywhere; orange is only
// the 2nd series in the signups-vs-trials chart. Text/axes stay gray, never the
// data color.
const C_PRIMARY = '#2563eb'; // blue-600
const C_SECONDARY = '#d97706'; // amber-600
const C_GRID = '#eef0f2';
const AXIS_TICK = { fontSize: 12, fill: '#6b7280' }; // gray-500
const PARTIAL_OPACITY = 0.45;

// Segmented granularity control. Value is the API grain; label is human.
const SIGNUP_WINDOWS = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
];

const GRANULARITIES = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'quarter', label: 'Quarterly' },
];

// Periods presets adapt to the active granularity.
const PERIOD_PRESETS = {
  day: [30, 90, 180],
  week: [12, 26, 52],
  month: [6, 12, 24],
  quarter: [4, 8, 12],
};
const DEFAULT_PERIODS = { day: 30, week: 12, month: 12, quarter: 8 };
const UNIT_PLURAL = { day: 'days', week: 'weeks', month: 'months', quarter: 'quarters' };

const DASH = '–'; // en dash: "no value" placeholder (never an em dash)

const formatNum = (n) => (Number(n) || 0).toLocaleString('en-US');
const formatCurrency = (n) => `$${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
const formatPct = (v) => `${(Number(v) || 0).toFixed(1)}%`;

// "12m 27s" / "45s" — used for session replay lengths.
const formatDuration = (seconds) => {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s` : `${m}m`;
};

const formatDateTime = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return DASH;
  return d.toLocaleString('en-US', {
    timeZone: 'America/Denver',
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
};

const SOURCE_LABELS = { google_ads: 'Google Ads', direct: 'Direct' };
const sourceLabel = (source) => SOURCE_LABELS[source] || source;

// Green when they got through, grey when they didn't. No judgement beyond that.
const StatusPill = ({ ok, yes, no }) => (
  <span
    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
      ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}
  >
    {ok ? yes : no}
  </span>
);
const priorWindowLabel = (granularity, periods) => `prior ${periods} ${UNIT_PLURAL[granularity]}`;
// A conversion rate as "X.X%", or "n/a" when the denominator cohort is empty.
const rateOrNa = (num, den) => {
  const d = Number(den) || 0;
  if (d <= 0) return 'n/a';
  return `${(((Number(num) || 0) / d) * 100).toFixed(1)}%`;
};
// Currency, or an en-dash when the value is null/undefined (e.g. LTV with no customers).
const currencyOrDash = (v) => (v === null || v === undefined ? DASH : formatCurrency(v));

// A bucket-keyed series row keys on `bucket`, falling back to `date` (contract:
// weeks are Monday-anchored ISO start dates).
const bucketKey = (row) => row.bucket ?? row.date;

// Short x-axis tick per granularity: day/week -> "Jul 5", month -> "Jul",
// quarter -> "Q3 '26".
const formatBucketTick = (value, granularity) => {
  if (!value) return '';
  const d = dayjs(value);
  if (!d.isValid()) return String(value);
  if (granularity === 'quarter') {
    return `Q${Math.floor(d.month() / 3) + 1} '${d.format('YY')}`;
  }
  if (granularity === 'month') return d.format('MMM');
  return d.format('MMM D');
};

// Full label for tooltips.
const formatBucketFull = (value, granularity) => {
  if (!value) return '';
  const d = dayjs(value);
  if (!d.isValid()) return String(value);
  if (granularity === 'quarter') {
    return `Q${Math.floor(d.month() / 3) + 1} ${d.format('YYYY')}`;
  }
  if (granularity === 'month') return d.format('MMMM YYYY');
  if (granularity === 'week') return `Week of ${d.format('MMM D, YYYY')}`;
  return d.format('MMM D, YYYY');
};

// Delta vs the equal-length prior window. Returns null when there is no prev
// value to compare (point-in-time KPIs get no chip). `pct: null` marks growth
// from a zero base ("new"), which has no finite percentage.
const computeDelta = (current, prev) => {
  if (prev === undefined || prev === null) return null;
  const c = Number(current) || 0;
  const p = Number(prev) || 0;
  if (p === 0) {
    return c === 0 ? { dir: 'flat', pct: 0 } : { dir: 'up', pct: null };
  }
  const pct = ((c - p) / p) * 100;
  if (Math.abs(pct) < 0.05) return { dir: 'flat', pct: 0 };
  return { dir: pct >= 0 ? 'up' : 'down', pct };
};

const deltaColorClass = (delta) => {
  if (delta.dir === 'up') return 'text-green-600 font-medium';
  if (delta.dir === 'down') return 'text-red-600 font-medium';
  return 'text-gray-400 font-medium';
};

const deltaText = (delta) => {
  if (delta.dir === 'flat') return 'flat';
  const glyph = delta.dir === 'up' ? '▲' : '▼';
  const magnitude = delta.pct === null ? 'new' : `${Math.abs(delta.pct).toFixed(1)}%`;
  return `${glyph} ${magnitude}`;
};

// ---- Presentational pieces ----

const SegmentedControl = ({ options, value, onChange, ariaLabel }) => (
  <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden" role="group" aria-label={ariaLabel}>
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        aria-pressed={value === o.value}
        className={`px-4 py-2 text-sm transition-colors ${
          value === o.value ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const KpiCard = ({ testId, label, value, note, subLabel, secondary, delta, priorLabel }) => (
  <div className="bg-white rounded-xl shadow p-5">
    <p className="text-xs font-medium text-gray-500">{label}</p>
    <p data-testid={testId} className="mt-1 text-3xl font-semibold text-gray-900">
      {value}
    </p>
    {subLabel && <p className="mt-0.5 text-xs text-gray-400">{subLabel}</p>}
    {delta && (
      <p className="mt-1.5 text-xs">
        <span data-testid={`${testId}-delta`} className={deltaColorClass(delta)}>
          {deltaText(delta)}
        </span>
        {priorLabel && <span className="text-gray-400"> vs {priorLabel}</span>}
      </p>
    )}
    {secondary && <p data-testid={`${testId}-secondary`} className="mt-1 text-xs text-gray-400">{secondary}</p>}
    {note && <p className="mt-1 text-xs text-amber-600">{note}</p>}
  </div>
);

// Compact stat used inside the Google Ads panel (smaller than a KPI card).
const GAdsStat = ({ testId, label, value, delta, priorLabel }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p data-testid={testId} className="mt-0.5 text-2xl font-semibold text-gray-900">{value}</p>
    {delta && (
      <p className="mt-0.5 text-xs">
        <span data-testid={`${testId}-delta`} className={deltaColorClass(delta)}>{deltaText(delta)}</span>
        {priorLabel && <span className="text-gray-400"> vs {priorLabel}</span>}
      </p>
    )}
  </div>
);

const FunnelStage = ({ testId, label, value, delta }) => (
  <div className="text-center px-3">
    <p className="text-xs text-gray-500">{label}</p>
    <p data-testid={testId} className="text-2xl font-semibold text-gray-900">{formatNum(value)}</p>
    {delta && (
      <p data-testid={`${testId}-delta`} className={`mt-0.5 text-xs ${deltaColorClass(delta)}`}>
        {deltaText(delta)}
      </p>
    )}
  </div>
);

const FunnelArrow = ({ pct }) => (
  <div className="flex flex-col items-center px-3 text-gray-400">
    <span className="text-lg leading-none" aria-hidden="true">{'→'}</span>
    <span className="text-xs font-medium text-primary">{formatPct(pct)}</span>
  </div>
);

const TrendCell = ({ pct }) => {
  if (pct === null || pct === undefined) return <span className="text-gray-400">n/a</span>;
  const up = Number(pct) >= 0;
  return (
    <span className={up ? 'text-green-600' : 'text-red-600'}>
      {up ? '▲' : '▼'} {Math.abs(Number(pct)).toFixed(1)}%
    </span>
  );
};

const ChartCard = ({ title, subtitle, footnote, children }) => (
  <div className="bg-white rounded-xl shadow p-5">
    <h3 className="text-sm font-medium text-gray-700">{title}</h3>
    {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
    <div className="mt-3" style={{ height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
    {footnote && <p className="mt-2 text-xs text-gray-400">{footnote}</p>}
  </div>
);

const LoadingCard = ({ label }) => (
  <div className="mb-6 flex items-center gap-3 p-4 bg-white rounded-lg shadow text-sm text-gray-600">
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    {label}
  </div>
);

const ErrorCard = ({ message, onRetry }) => (
  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
    <span>{message}</span>
    <button type="button" onClick={onRetry} className="ml-4 text-red-700 underline hover:text-red-900">
      Retry
    </button>
  </div>
);

// ---- Page ----

const BusinessDashboard = ({ user, logout, currentSite, updateCurrentSite }) => {
  const isAdmin = !!user?.isAdmin;
  const adminEmail = user?.email || '';
  // Wire the shared app sidebar (NavbarWrapper) so its buttons work on this
  // route too; the modals themselves are hosted globally by ModalProvider.
  const {
    setShowBulkGenerateModal,
    setShowImageStyleModal,
    setShowSupportModal,
    setShowAdminPanel,
    setShowSubscriptionModal,
  } = useModals();

  const [granularity, setGranularity] = useState('week');
  const [periods, setPeriods] = useState(DEFAULT_PERIODS.week);

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');

  const [gsc, setGsc] = useState(null);
  const [gscLoading, setGscLoading] = useState(false);
  const [gscError, setGscError] = useState('');

  const [signups, setSignups] = useState(null);
  const [signupsLoading, setSignupsLoading] = useState(false);
  const [signupsError, setSignupsError] = useState('');
  const [signupDays, setSignupDays] = useState(7);

  // Guard against out-of-order responses when the granularity/periods change mid-flight.
  const statsSeq = useRef(0);
  const gscSeq = useRef(0);
  const signupsSeq = useRef(0);

  // Weekly is GSC's native snapshot grain, so daily maps up to weekly; every
  // other granularity passes through unchanged.
  const gscGranularity = granularity === 'day' ? 'week' : granularity;

  const loadStats = useCallback(async () => {
    if (!adminEmail || !isAdmin) return;
    const seq = ++statsSeq.current;
    setStatsLoading(true);
    setStatsError('');
    try {
      const res = await apiClient.get('/admin/stats', { params: { adminEmail, granularity, periods } });
      if (seq !== statsSeq.current) return;
      if (res.data && res.data.success) {
        setStats(res.data);
      } else {
        setStatsError('Could not load stats');
      }
    } catch (err) {
      if (seq !== statsSeq.current) return;
      console.error('Failed to load admin stats:', err);
      setStatsError('Could not load stats');
    } finally {
      if (seq === statsSeq.current) setStatsLoading(false);
    }
  }, [adminEmail, isAdmin, granularity, periods]);

  const loadGsc = useCallback(async () => {
    if (!adminEmail || !isAdmin) return;
    const seq = ++gscSeq.current;
    setGscLoading(true);
    setGscError('');
    try {
      const res = await apiClient.get('/admin/stats/gsc', {
        params: { adminEmail, granularity: gscGranularity, periods },
      });
      if (seq !== gscSeq.current) return;
      if (res.data && res.data.success) {
        setGsc(res.data);
      } else {
        setGscError('Could not load search performance');
      }
    } catch (err) {
      if (seq !== gscSeq.current) return;
      console.error('Failed to load admin GSC stats:', err);
      setGscError('Could not load search performance');
    } finally {
      if (seq === gscSeq.current) setGscLoading(false);
    }
  }, [adminEmail, isAdmin, gscGranularity, periods]);

  const loadSignups = useCallback(async () => {
    if (!adminEmail || !isAdmin) return;
    const seq = ++signupsSeq.current;
    setSignupsLoading(true);
    setSignupsError('');
    try {
      const res = await apiClient.get('/admin/stats/signups', {
        params: { adminEmail, days: signupDays },
      });
      if (seq !== signupsSeq.current) return;
      if (res.data && res.data.success) {
        setSignups(res.data);
      } else {
        setSignupsError('Could not load signups');
      }
    } catch (err) {
      if (seq !== signupsSeq.current) return;
      setSignupsError('Could not load signups');
    } finally {
      if (seq === signupsSeq.current) setSignupsLoading(false);
    }
  }, [adminEmail, isAdmin, signupDays]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadGsc(); }, [loadGsc]);
  useEffect(() => { loadSignups(); }, [loadSignups]);

  const handleGranularity = (g) => {
    if (g === granularity) return;
    setGranularity(g);
    setPeriods(DEFAULT_PERIODS[g]);
  };

  const series = stats?.series || {};
  const lastBucketPartial = !!stats?.lastBucketPartial;

  // Merge signups + trial starts by bucket so each x-position carries both.
  const signupTrialSeries = useMemo(() => {
    const map = new Map();
    (series.signups || []).forEach((d) => {
      const k = bucketKey(d);
      map.set(k, { bucket: k, signups: d.count || 0, trialStarts: 0 });
    });
    (series.trialStarts || []).forEach((d) => {
      const k = bucketKey(d);
      const row = map.get(k) || { bucket: k, signups: 0, trialStarts: 0 };
      row.trialStarts = d.count || 0;
      map.set(k, row);
    });
    return Array.from(map.values()).sort((a, b) => String(a.bucket).localeCompare(String(b.bucket)));
  }, [series.signups, series.trialStarts]);

  const loginSeries = useMemo(
    () => (series.logins || []).map((d) => ({ bucket: bucketKey(d), uniqueUsers: d.uniqueUsers || 0 })),
    [series.logins],
  );
  const revenueSeries = useMemo(
    () => (series.revenue || []).map((d) => ({ bucket: bucketKey(d), amount: d.amount || 0 })),
    [series.revenue],
  );
  const blogSeries = useMemo(
    () => (series.blogsPosted || []).map((d) => ({ bucket: bucketKey(d), count: d.count || 0 })),
    [series.blogsPosted],
  );

  // GSC time series field name is unspecified in the v2 doc; accept the likely
  // shapes (buckets / series / the back-compat weekly) and normalize.
  const gscSeries = useMemo(() => {
    const raw = gsc?.buckets || gsc?.series || gsc?.weekly || [];
    return raw.map((d) => ({
      bucket: d.bucket ?? d.weekStart ?? d.date,
      clicks: d.clicks || 0,
      impressions: d.impressions || 0,
    }));
  }, [gsc]);

  const gscSites = useMemo(() => {
    const list = gsc?.sites ? [...gsc.sites] : [];
    return list.sort((a, b) => (b.lastWeekClicks || 0) - (a.lastWeekClicks || 0));
  }, [gsc]);

  // Traffic sources are delivered already sorted by visitors desc; we only force
  // any catch-all "unknown" row to the very end so real sources lead. Absent or
  // empty attribution hides the section entirely.
  const attributionSources = useMemo(() => {
    const rows = stats?.attribution?.sources;
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const known = rows.filter((r) => r.source !== 'unknown');
    const unknown = rows.filter((r) => r.source === 'unknown');
    return [...known, ...unknown];
  }, [stats]);

  // Non-admins never see this page. Placed after hooks so hook order is stable.
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const kpis = stats?.kpis || {};
  const prev = stats?.prev || {};
  const funnel = stats?.funnel || {};
  const priorLabel = priorWindowLabel(granularity, periods);
  // Customers (trial-to-paid) rides on Stripe; the whole stage is absent when
  // it (and its prev/pct) can't be computed. Guard on presence, not truthiness,
  // so a legitimate 0 customers still renders the stage.
  const hasCustomers = funnel.customers !== undefined && funnel.customers !== null;
  const maxSourceVisitors = attributionSources.reduce((m, r) => Math.max(m, Number(r.visitors) || 0), 0);
  // LTV + its all-time context ride on Stripe; the whole card is absent when LTV
  // can't be computed. Paid conversion is the metric Adam cares about most.
  const hasLtv = kpis.ltv !== undefined && kpis.ltv !== null;
  // Google Ads is split out (PostHog first-touch gclid) from the direct/google
  // referrer buckets; the whole panel is absent when the block isn't supplied.
  const googleAds = stats?.googleAds;
  const hasGoogleAds = googleAds !== undefined && googleAds !== null;

  const kpiCards = [
    {
      key: 'mrr',
      label: 'MRR',
      value: formatCurrency(kpis.mrr),
      // Money KPIs come live from Stripe; on an outage the API downgrades to
      // DB-derived numbers (which drift) and says so, incl. unpriced subs.
      note: kpis.mrrSource === 'db'
        ? `DB fallback${kpis.mrrUnpriced > 0 ? `, +${kpis.mrrUnpriced} unpriced` : ''} (Stripe unreachable)`
        : null,
    },
    // Money first (is the business growing): revenue, then LTV.
    { key: 'revenueCollected', label: 'Revenue collected', value: formatCurrency(kpis.revenueCollected), prevKey: 'revenueCollected' },
    ...(hasLtv
      ? [{
        key: 'ltv',
        label: 'LTV',
        value: formatCurrency(kpis.ltv),
        subLabel: 'avg lifetime revenue / paying customer',
        secondary: `${formatNum(kpis.payingCustomersAllTime)} customers · ${formatCurrency(kpis.totalCollectedAllTime)} all-time`,
      }]
      : []),
    { key: 'activePaying', label: 'Active paying', value: formatNum(kpis.activePaying) },
    { key: 'activeTrials', label: 'Active trials', value: formatNum(kpis.activeTrials) },
    { key: 'trialStarts', label: 'Trial starts', value: formatNum(kpis.trialStarts), prevKey: 'trialStarts' },
    { key: 'signups', label: 'Signups', value: formatNum(kpis.signups), prevKey: 'signups' },
    { key: 'blogsPosted', label: 'Blogs posted', value: formatNum(kpis.blogsPosted), prevKey: 'blogsPosted' },
    { key: 'uniqueLogins', label: 'Unique logins', value: formatNum(kpis.uniqueLogins), prevKey: 'uniqueLogins' },
  ].map((c) => ({
    ...c,
    delta: c.prevKey ? computeDelta(kpis[c.key], prev[c.prevKey]) : null,
  }));

  const partialFootnote = lastBucketPartial ? 'The current period is partial.' : null;
  const gscEmpty = gsc && gscSeries.length === 0 && gscSites.length === 0;

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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header: one global time control scopes every stat below. */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Business</h1>
            <p className="mt-1 text-sm text-gray-500">
              Test and admin accounts excluded. Deltas compare the {priorLabel}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl
              options={GRANULARITIES}
              value={granularity}
              onChange={handleGranularity}
              ariaLabel="Granularity"
            />
            <select
              aria-label="Periods"
              value={periods}
              onChange={(e) => setPeriods(Number(e.target.value))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
            >
              {PERIOD_PRESETS[granularity].map((p) => (
                <option key={p} value={p}>
                  {p} {UNIT_PLURAL[granularity]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ---- Core business health ---- */}
        {statsError && !stats && <ErrorCard message={statsError} onRetry={loadStats} />}
        {statsLoading && !stats && <LoadingCard label="Loading stats…" />}

        {stats && (
          <div className={statsLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {kpiCards.map((c) => (
                <KpiCard
                  key={c.key}
                  testId={`kpi-${c.key}`}
                  label={c.label}
                  value={c.value}
                  note={c.note}
                  subLabel={c.subLabel}
                  secondary={c.secondary}
                  delta={c.delta}
                  priorLabel={priorLabel}
                />
              ))}
            </div>

            {/* Growth charts: money + acquisition, the highest-signal pair. */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-8">
              <ChartCard
                title="Revenue collected"
                subtitle="Cash-in from succeeded Stripe payments"
                footnote={partialFootnote}
              >
                <BarChart data={revenueSeries} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                  <CartesianGrid vertical={false} stroke={C_GRID} />
                  <XAxis
                    dataKey="bucket"
                    tickFormatter={(v) => formatBucketTick(v, granularity)}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value), 'Revenue collected']}
                    labelFormatter={(v) => formatBucketFull(v, granularity)}
                    cursor={{ fill: 'rgba(37,99,235,0.06)' }}
                  />
                  <Bar dataKey="amount" name="Revenue collected" fill={C_PRIMARY} maxBarSize={36} radius={[4, 4, 0, 0]}>
                    {revenueSeries.map((entry, i) => (
                      <Cell
                        key={entry.bucket}
                        fillOpacity={lastBucketPartial && i === revenueSeries.length - 1 ? PARTIAL_OPACITY : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartCard>

              <ChartCard
                title="Signups & trial starts"
                subtitle="New accounts and trials started"
                footnote={partialFootnote}
              >
                <LineChart data={signupTrialSeries} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                  <CartesianGrid vertical={false} stroke={C_GRID} />
                  <XAxis
                    dataKey="bucket"
                    tickFormatter={(v) => formatBucketTick(v, granularity)}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(v) => formatBucketFull(v, granularity)}
                    formatter={(value) => formatNum(value)}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="signups" name="Signups" stroke={C_PRIMARY} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="trialStarts" name="Trial starts" stroke={C_SECONDARY} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ChartCard>
            </div>

            {/* Acquisition funnel band. The Customers stage only appears when the
                API supplies it (it needs Stripe, so it can be absent). */}
            <div className="bg-white rounded-xl shadow p-6 mb-8">
              <h2 className="text-sm font-medium text-gray-700 mb-4">Acquisition funnel</h2>
              <div className="flex flex-wrap items-center justify-center gap-y-3">
                <FunnelStage
                  testId="funnel-visitors"
                  label="Visitors"
                  value={funnel.visitors}
                  delta={computeDelta(funnel.visitors, prev.visitors)}
                />
                <FunnelArrow pct={funnel.visitorToSignupPct} />
                <FunnelStage
                  testId="funnel-signups"
                  label="Signups"
                  value={funnel.signups}
                  delta={computeDelta(funnel.signups, prev.funnelSignups)}
                />
                <FunnelArrow pct={funnel.signupToTrialPct} />
                <FunnelStage
                  testId="funnel-trials"
                  label="Trials"
                  value={funnel.trials}
                  delta={computeDelta(funnel.trials, prev.funnelTrials)}
                />
                {hasCustomers && (
                  <>
                    <FunnelArrow pct={funnel.trialToCustomerPct} />
                    <FunnelStage
                      testId="funnel-customers"
                      label="Customers"
                      value={funnel.customers}
                      delta={computeDelta(funnel.customers, prev.customers)}
                    />
                  </>
                )}
              </div>
              <p className="text-center text-xs text-gray-400 mt-4">
                Visitor to trial: {formatPct(funnel.visitorToTrialPct)}
              </p>
              {hasCustomers && (
                <p className="text-center text-xs text-gray-400 mt-1">
                  Customers = first successful payment in period (Stripe)
                </p>
              )}
            </div>

            {/* Google Ads split out from the direct/google referrer buckets
                (PostHog first-touch gclid). Hidden when the block is absent. */}
            {hasGoogleAds && (
              <div className="bg-white rounded-xl shadow p-6 mb-8" data-testid="google-ads-panel">
                <h2 className="text-sm font-medium text-gray-700 mb-4">Google Ads</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <GAdsStat
                    testId="gads-visitors"
                    label="Visitors"
                    value={formatNum(googleAds.visitors)}
                    delta={computeDelta(googleAds.visitors, googleAds.prevVisitors)}
                    priorLabel={priorLabel}
                  />
                  <GAdsStat
                    testId="gads-signups"
                    label="Signups"
                    value={formatNum(googleAds.signups)}
                    delta={computeDelta(googleAds.signups, googleAds.prevSignups)}
                    priorLabel={priorLabel}
                  />
                  <GAdsStat testId="gads-customers" label="Customers" value={formatNum(googleAds.customers)} />
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
                  <span>Signups all-time: <b className="font-medium text-gray-900">{formatNum(googleAds.signupsAllTime)}</b></span>
                  <span>Customers all-time: <b className="font-medium text-gray-900">{formatNum(googleAds.customersAllTime)}</b></span>
                  <span>Signup → paid: <b className="font-medium text-gray-900">{rateOrNa(googleAds.customersAllTime, googleAds.signupsAllTime)}</b></span>
                  <span>Revenue all-time: <b className="font-medium text-gray-900">{formatCurrency(googleAds.revenueAllTime)}</b></span>
                  <span>LTV: <b data-testid="gads-ltv" className="font-medium text-gray-900">{currencyOrDash(googleAds.ltv)}</b></span>
                </div>
                <p className="mt-3 text-xs text-gray-400">Attributed via PostHog first-touch gclid</p>
              </div>
            )}

            {/* Where they come from — traffic sources for the main window (no prev).
                Hidden entirely when the API omits attribution. */}
            {attributionSources.length > 0 && (
              <div className="bg-white rounded-xl shadow p-6 mb-8" data-testid="attribution-section">
                <h2 className="text-sm font-medium text-gray-700 mb-4">Where they come from</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                        <th className="px-4 py-3 font-medium">Source</th>
                        <th className="px-4 py-3 font-medium text-right">Visitors</th>
                        <th className="px-4 py-3 font-medium text-right">Signups</th>
                        <th className="px-4 py-3 font-medium text-right">Trials</th>
                        <th className="px-4 py-3 font-medium text-right">Customers</th>
                        <th className="px-4 py-3 font-medium text-right">Visitor → signup %</th>
                        <th className="px-4 py-3 font-medium text-right">Signup → paid %</th>
                        <th className="px-4 py-3 font-medium text-right">LTV</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {attributionSources.map((r) => {
                        const visitors = Number(r.visitors) || 0;
                        const signups = Number(r.signups) || 0;
                        const barPct = maxSourceVisitors > 0 ? (visitors / maxSourceVisitors) * 100 : 0;
                        return (
                          <tr key={r.source} className="border-b border-gray-100 last:border-0">
                            <td className="px-4 py-3 text-gray-900 font-medium">{r.source}</td>
                            <td className="px-4 py-3 text-right align-middle">
                              <div className="text-gray-700">{formatNum(visitors)}</div>
                              <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                                <div className="h-full rounded-full bg-primary/40" style={{ width: `${barPct}%` }} />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700">{formatNum(signups)}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{formatNum(r.trials)}</td>
                            {/* Customers + LTV are the paid-conversion columns Adam weighs most. */}
                            <td className="px-4 py-3 text-right font-medium text-gray-900">{formatNum(r.customers)}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{rateOrNa(signups, visitors)}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{rateOrNa(r.customersAllTime, r.signupsAllTime)}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">{currencyOrDash(r.ltv)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-gray-400">
                  Ad-level attribution (Google Ads vs organic) accrues from signups after Jul 29, 2026, when gclid capture shipped; earlier signups predate it.
                </p>
              </div>
            )}

            {/* Activity charts: operational cadence, lower priority than growth. */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-10">
              <ChartCard title="Logins" subtitle="Unique users" footnote={partialFootnote}>
                <LineChart data={loginSeries} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                  <CartesianGrid vertical={false} stroke={C_GRID} />
                  <XAxis
                    dataKey="bucket"
                    tickFormatter={(v) => formatBucketTick(v, granularity)}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                  <Tooltip
                    formatter={(value) => [formatNum(value), 'Unique users']}
                    labelFormatter={(v) => formatBucketFull(v, granularity)}
                  />
                  <Line type="monotone" dataKey="uniqueUsers" name="Unique users" stroke={C_PRIMARY} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ChartCard>

              <ChartCard title="Blogs posted" subtitle="Published posts" footnote={partialFootnote}>
                <BarChart data={blogSeries} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                  <CartesianGrid vertical={false} stroke={C_GRID} />
                  <XAxis
                    dataKey="bucket"
                    tickFormatter={(v) => formatBucketTick(v, granularity)}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                  <Tooltip
                    formatter={(value) => [formatNum(value), 'Blogs posted']}
                    labelFormatter={(v) => formatBucketFull(v, granularity)}
                    cursor={{ fill: 'rgba(37,99,235,0.06)' }}
                  />
                  <Bar dataKey="count" name="Blogs posted" fill={C_PRIMARY} maxBarSize={36} radius={[4, 4, 0, 0]}>
                    {blogSeries.map((entry, i) => (
                      <Cell
                        key={entry.bucket}
                        fillOpacity={lastBucketPartial && i === blogSeries.length - 1 ? PARTIAL_OPACITY : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartCard>
            </div>
          </div>
        )}

        {/* ---- Customer search performance (GSC) ---- */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Customer search performance</h2>
          <p className="text-xs text-gray-400">
            Search Console across all customer sites. Movers table is always weekly-grain.
          </p>
        </div>

        {gscError && !gsc && <ErrorCard message={gscError} onRetry={loadGsc} />}
        {gscLoading && !gsc && <LoadingCard label="Loading search performance…" />}

        {gsc && gscEmpty && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow text-sm text-gray-500">
            No GSC-connected sites yet
          </div>
        )}

        {gsc && !gscEmpty && (
          <div className={gscLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {/* Clicks and impressions get their own axes (impressions dwarf clicks). */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
              <ChartCard title="Total clicks" subtitle="All customer sites">
                <LineChart data={gscSeries} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                  <CartesianGrid vertical={false} stroke={C_GRID} />
                  <XAxis
                    dataKey="bucket"
                    tickFormatter={(v) => formatBucketTick(v, gscGranularity)}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={52} allowDecimals={false} tickFormatter={formatNum} />
                  <Tooltip
                    formatter={(value) => [formatNum(value), 'Clicks']}
                    labelFormatter={(v) => formatBucketFull(v, gscGranularity)}
                  />
                  <Line type="monotone" dataKey="clicks" name="Clicks" stroke={C_PRIMARY} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ChartCard>

              <ChartCard title="Total impressions" subtitle="All customer sites">
                <LineChart data={gscSeries} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                  <CartesianGrid vertical={false} stroke={C_GRID} />
                  <XAxis
                    dataKey="bucket"
                    tickFormatter={(v) => formatBucketTick(v, gscGranularity)}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={52} allowDecimals={false} tickFormatter={formatNum} />
                  <Tooltip
                    formatter={(value) => [formatNum(value), 'Impressions']}
                    labelFormatter={(v) => formatBucketFull(v, gscGranularity)}
                  />
                  <Line type="monotone" dataKey="impressions" name="Impressions" stroke={C_PRIMARY} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ChartCard>
            </div>

            {gscSites.length > 0 && (
              <div className="bg-white rounded-xl shadow overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                      <th className="px-4 py-3 font-medium">Site</th>
                      <th className="px-4 py-3 font-medium text-right">Last wk clicks</th>
                      <th className="px-4 py-3 font-medium text-right">Prev wk</th>
                      <th className="px-4 py-3 font-medium text-right">4 wks ago</th>
                      <th className="px-4 py-3 font-medium text-right">Trend</th>
                      <th className="px-4 py-3 font-medium text-right">Last wk impressions</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {gscSites.map((s) => (
                      <tr key={s.site} className="border-b border-gray-100 last:border-0">
                        <td className="px-4 py-3 text-gray-900 font-medium">{s.site}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatNum(s.lastWeekClicks)}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{formatNum(s.prevWeekClicks)}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{formatNum(s.fourWeeksAgoClicks)}</td>
                        <td className="px-4 py-3 text-right"><TrendCell pct={s.trendPct} /></td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatNum(s.lastWeekImpressions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ---- Recent signups + session replays ---- */}
        <div className="mt-8 mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recent signups</h2>
            <p className="text-xs text-gray-400">
              Every signup with its PostHog session replays, so you can watch onboarding. Active
              time excludes idle tabs.
            </p>
          </div>
          <SegmentedControl
            options={SIGNUP_WINDOWS}
            value={signupDays}
            onChange={setSignupDays}
            ariaLabel="Signup window"
          />
        </div>

        {signupsError && !signups && <ErrorCard message={signupsError} onRetry={loadSignups} />}
        {signupsLoading && !signups && <LoadingCard label="Loading signups…" />}

        {signups && signups.signups.length === 0 && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow text-sm text-gray-500">
            No signups in the last {signups.days} days
          </div>
        )}

        {signups && signups.signups.length > 0 && (
          <div
            className={`mb-6 bg-white rounded-xl shadow overflow-hidden ${
              signupsLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'
            }`}
          >
            {!signups.replaysAvailable && (
              <p className="px-4 py-2 bg-amber-50 text-xs text-amber-700">
                Session replays unavailable right now, so the replay columns are empty. This does
                not mean nobody visited.
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Signed up</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Onboarding</th>
                    <th className="px-4 py-3 font-medium">Trial</th>
                    <th className="px-4 py-3 font-medium text-right">Active</th>
                    <th className="px-4 py-3 font-medium text-right">Clicks</th>
                    <th className="px-4 py-3 font-medium">Watch</th>
                  </tr>
                </thead>
                <tbody>
                  {signups.signups.map((s) => (
                    <tr key={s.email} className="border-b border-gray-100 last:border-0 align-top">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDateTime(s.at)}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{s.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            s.fromAds ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {sourceLabel(s.source)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill ok={s.connectedSite} yes="Site connected" no="Not finished" />
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill ok={s.startedTrial} yes="Started" no="None" />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                        {s.sessions.length ? formatDuration(s.activeSeconds) : DASH}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                        {s.sessions.length ? formatNum(s.clicks) : DASH}
                      </td>
                      <td className="px-4 py-3">
                        {s.sessions.length === 0 ? (
                          <span className="text-gray-400 text-xs">No replay</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {s.sessions.map((sess) => (
                              <a
                                key={sess.sessionId}
                                href={sess.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline text-xs whitespace-nowrap"
                              >
                                {formatDateTime(sess.started)} · {formatDuration(sess.durationS)}
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </NavbarWrapper>
  );
};

export default BusinessDashboard;
