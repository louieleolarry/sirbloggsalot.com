import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import toast from 'react-hot-toast';
import { useImpersonation } from '../contexts/ImpersonationContext';
import { useModals } from '../contexts/ModalContext';
import NavbarWrapper from '../components/Navbar';
import SiteRankingsTable from '../components/SiteRankingsTable';
import apiClient from '../utils/apiClient';
import {
  Search,
  TrendingUp,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Minus,
  Clock,
  Zap,
  Target,
  BarChart3,
  Lock,
  Calendar,
  X
} from 'lucide-react';

// Skeleton loaders
const StatCardSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
    <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-20"></div>
  </div>
);

const ChartSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
    <div className="h-[300px] flex items-end justify-between gap-1">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="bg-gray-200 rounded-t w-full"
          style={{ height: `${Math.random() * 60 + 20}%` }}
        />
      ))}
    </div>
  </div>
);

const TableSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
    <div className="space-y-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-4 bg-gray-200 rounded w-8"></div>
          <div className="h-4 bg-gray-200 rounded flex-1"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
          <div className="h-4 bg-gray-200 rounded w-12"></div>
        </div>
      ))}
    </div>
  </div>
);

// Stat Card Component
const StatCard = ({ title, value, change, changeType, icon: Icon, format = 'number', tooltip }) => {
  const formatValue = (val) => {
    if (format === 'number') return val?.toLocaleString() || '0';
    if (format === 'decimal') return (val || 0).toFixed(1);
    if (format === 'currency') return `$${(val || 0).toLocaleString()}`;
    if (format === 'percent') return `${((val || 0) * 100).toFixed(0)}%`;
    return val;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow" title={tooltip}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        {Icon && <Icon className="w-5 h-5 text-gray-400" />}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">
        {formatValue(value)}
      </div>
      {change !== undefined && (
        <div className={`flex items-center text-sm ${
          changeType === 'positive' ? 'text-green-600' :
          changeType === 'negative' ? 'text-red-600' :
          'text-gray-500'
        }`}>
          {changeType === 'positive' ? <ChevronUp className="w-4 h-4" /> :
           changeType === 'negative' ? <ChevronDown className="w-4 h-4" /> :
           <Minus className="w-4 h-4" />}
          <span>{change}</span>
        </div>
      )}
    </div>
  );
};

// Pro Gate Component
const ProGate = ({ onUpgrade }) => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="text-center max-w-md mx-auto px-6">
      <div className="w-16 h-16 bg-gradient-to-br from-primary to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Lock className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        Unlock Rankings
      </h2>
      <p className="text-gray-600 mb-6">
        See how your site is doing in Google: where you rank, what brings people in, and how that changes over time. Included with Pro+.
      </p>
      <ul className="text-left space-y-3 mb-8">
        <li className="flex items-center text-sm text-gray-700">
          <TrendingUp className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
          Daily rank tracking for your site
        </li>
        <li className="flex items-center text-sm text-gray-700">
          <Search className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
          See exactly which keywords bring you clicks
        </li>
        <li className="flex items-center text-sm text-gray-700">
          <BarChart3 className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
          Historical growth chart
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

// Main Component
const SeoAnalysis = ({ logout, currentSite, updateCurrentSite }) => {
  const { user, siteSettings, currentSite: activeSiteName } = useImpersonation();
  const { setShowSubscriptionModal, setShowSupportModal, setShowImageStyleModal, setShowAdminPanel, setShowBulkGenerateModal } = useModals();
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  // Separate "snapshot fetched at least once" flag from the access-check
  // loading. Without this, the page renders empty stat cards / charts for a
  // beat between hasPro flipping true and fetchSnapshot resolving — the user
  // sees what looks like a blank page mid-demo. Skeletons stay up until we
  // know there is (or isn't) snapshot data to render.
  const [snapshotLoaded, setSnapshotLoaded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [hasPro, setHasPro] = useState(false);
  const [seoStatus, setSeoStatus] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [snapshotError, setSnapshotError] = useState(false);
  const [chartTimeRange, setChartTimeRange] = useState(12); // months - default 12 months

  // Saved keywords from KeywordFinder (count feeds the Overview no-data card)
  const [savedKeywordsCount, setSavedKeywordsCount] = useState(0);
  const [savedKeywordsError, setSavedKeywordsError] = useState(false);

  // ---- Rankings tab (shared "Your rankings" surface) ----------------------
  // The Rankings tab now renders the same GET /:site/rankings data + shared
  // table as the Keywords > "Your rankings" view (GSC when connected, else a
  // cached DataForSEO estimate), with a source toggle when both are available.
  // Independent of the legacy /api/seo/keywords fetch that feeds Overview.
  const [rankingRows, setRankingRows] = useState([]);
  const [rankingSource, setRankingSource] = useState(null); // active source: 'gsc' | 'dfs'
  const [rankingAsOf, setRankingAsOf] = useState(null);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState(false);
  const [rankingAvailableSources, setRankingAvailableSources] = useState([]);
  const [rankingsBySource, setRankingsBySource] = useState({}); // per-source cache
  const [rankingSearch, setRankingSearch] = useState('');
  const [rankingAddingKey, setRankingAddingKey] = useState(null);
  // Honesty flags from the rankings endpoint: `stale` when the estimate could
  // not be refreshed and we're showing an old cache; `truncated` when the
  // server capped the rows at its 200 max.
  const [rankingStale, setRankingStale] = useState(false);
  const [rankingTruncated, setRankingTruncated] = useState(false);
  const [preferredRankingSource, setPreferredRankingSource] = useState(null);
  const rankingFetchedRef = useRef(false);

  // Drive everything off the selected site (instant) rather than
  // siteSettings.site (only set after /get-site-settings resolves). The
  // [site] reset effect below already re-shows the skeleton on change, so
  // switching sites now repaints immediately instead of holding the previous
  // site's snapshot for ~10s. Falls back to siteSettings.site defensively.
  const site = activeSiteName || siteSettings?.site;

  // Check if we have meaningful scan data
  const hasRankingData = snapshot?.rankedKeywords?.length > 0 ||
                         snapshot?.domainMetrics?.totalKeywords > 0;

  // Whether Google Search Console is connected for this site. Keeps the
  // Overview "not yet indexed" copy honest when Google itself already has
  // data (the estimates just haven't caught up).
  const gscConnected = !!(siteSettings?.gsc?.access_token || siteSettings?.gsc?.refresh_token) ||
                       rankingAvailableSources.includes('gsc');

  // Check Pro access
  const checkAccess = useCallback(async () => {
    if (!site) return;

    try {
      const response = await apiClient.get(`/api/seo/status/${site}`);
      if (response.data.success) {
        setHasPro(response.data.hasPro);
        setSeoStatus(response.data);
      } else {
        setHasPro(false);
      }
    } catch (error) {
      console.error('Error checking SEO access:', error);
      // If we get needsUpgrade, show subscription modal
      if (error.response?.data?.needsUpgrade) {
        setHasPro(false);
      }
    } finally {
      setLoading(false);
    }
  }, [site]);

  // Request-sequencing guard so a slow earlier snapshot response can't clobber
  // newer data. The snapshot effect re-fires on site switch with no abort;
  // without this, an in-flight request from the old site can resolve last and
  // write stale rows.
  const snapshotRequestIdRef = useRef(0);

  // Fetch snapshot data
  const fetchSnapshot = useCallback(async () => {
    if (!site || !hasPro) return;

    const requestId = ++snapshotRequestIdRef.current;
    setSnapshotError(false);
    try {
      const response = await apiClient.get(`/api/seo/snapshot/${site}`);
      // Ignore stale responses (site switched / newer fetch started)
      if (requestId !== snapshotRequestIdRef.current) return;
      if (response.data.success) {
        setSnapshot(response.data.snapshot);
      }
    } catch (error) {
      if (requestId !== snapshotRequestIdRef.current) return;
      if (error.response?.data?.needsUpgrade) {
        setHasPro(false);
      } else {
        // A failed load is NOT "no data yet" — flag it so the Overview shows a
        // retryable error instead of the first-scan empty state.
        setSnapshotError(true);
        console.error('Error fetching snapshot:', error);
      }
    } finally {
      if (requestId === snapshotRequestIdRef.current) {
        setSnapshotLoaded(true);
      }
    }
  }, [site, hasPro]);

  // Run new scan
  const runScan = async () => {
    if (!site || scanning) return;

    // Button shows "Scanning..." via the scanning flag; skip the progress
    // toast and only surface the terminal result.
    try {
      setScanning(true);

      const response = await apiClient.post(`/api/seo/scan/${site}`);

      if (response.data.success) {
        setSnapshot(response.data.snapshot);
        setSeoStatus(prev => ({
          ...prev,
          lastScanned: new Date().toISOString(),
          canScan: false,
          hoursRemaining: 24
        }));
        toast.success('Scan complete!');
      }
    } catch (error) {
      if (error.response?.status === 429) {
        const { hoursRemaining } = error.response.data;
        toast.error(`Please wait ${hoursRemaining} hours before scanning again`);
      } else {
        toast.error('Scan failed. Please try again.');
      }
    } finally {
      setScanning(false);
    }
  };

  // Initial load
  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  // When the site changes (e.g. switching impersonation), reset the snapshot
  // gate so we re-show the skeleton instead of stale data from the previous
  // site while the new fetch is in flight.
  useEffect(() => {
    setSnapshotLoaded(false);
    setSnapshot(null);
    setSnapshotError(false);
  }, [site]);

  // Safety net: if the snapshot fetch never resolves (network hang, paused
  // request, dev-server hot-reload mid-flight), drop the skeleton gate after
  // ~8s so the page is at least usable instead of stuck loading forever.
  // Skip when there's no site yet — that's a legitimate "still booting" state,
  // not a stuck fetch, and we'll flip snapshotLoaded the moment site lands.
  useEffect(() => {
    if (!site || snapshotLoaded) return;
    const timer = setTimeout(() => setSnapshotLoaded(true), 8000);
    return () => clearTimeout(timer);
  }, [site, snapshotLoaded]);

  // Same safety net for the access-check loading flag. If impersonation
  // context never resolves a site (or fetchSiteSettings hangs upstream),
  // checkAccess never fires and `loading` stays true forever — the user
  // sees a skeleton until they bail to the dashboard. After 10s without a
  // site, drop the gate so the header + ProGate render with the "Connect
  // your site to get started" copy.
  useEffect(() => {
    if (site || !loading) return;
    const timer = setTimeout(() => setLoading(false), 10000);
    return () => clearTimeout(timer);
  }, [site, loading]);

  // If the user isn't Pro+, there's no snapshot to wait on — render the
  // ProGate immediately instead of holding the skeleton until the timeout.
  useEffect(() => {
    if (!loading && !hasPro) setSnapshotLoaded(true);
  }, [loading, hasPro]);

  // Load snapshot once when premium is confirmed.
  useEffect(() => {
    if (hasPro) fetchSnapshot();
  }, [hasPro, fetchSnapshot]);

  // Fetch saved keywords from site's keyword list
  const fetchSavedKeywords = useCallback(async () => {
    if (!site || !hasPro) return;

    setSavedKeywordsError(false);
    try {
      const response = await apiClient.get(`/api/seo/saved-keywords/${site}`);
      if (response.data.success) {
        setSavedKeywordsCount(response.data.keywords?.length || 0);
      }
    } catch (error) {
      // Don't pass a failed load off as "0 saved keywords".
      setSavedKeywordsError(true);
      console.error('Error fetching saved keywords:', error);
    }
  }, [site, hasPro]);

  // Load saved keywords when pro access is confirmed
  useEffect(() => {
    if (hasPro) {
      fetchSavedKeywords();
    }
  }, [hasPro, fetchSavedKeywords]);

  // -------------------------------------------------------------------------
  // Rankings tab: shared "Your rankings" surface
  // -------------------------------------------------------------------------
  // Source-aware fetch with a per-source cache. `explicitSource` forces a
  // source; otherwise the server auto-picks. Cached sources are served without
  // a network hit (and never re-fetch DFS just to compare — that costs money).
  const fetchRankings = useCallback(async (explicitSource = null) => {
    if (!site) return;
    if (explicitSource && rankingsBySource[explicitSource]) {
      const cached = rankingsBySource[explicitSource];
      setRankingRows(cached.rows);
      setRankingSource(explicitSource);
      setRankingAsOf(cached.asOf);
      setRankingStale(!!cached.stale);
      setRankingTruncated(!!cached.truncated);
      setRankingError(false);
      return;
    }
    setRankingLoading(true);
    setRankingError(false);
    try {
      const response = await apiClient.get(`/api/keyword-research/${site}/rankings`, {
        params: explicitSource ? { source: explicitSource } : {}
      });
      const data = response.data || {};
      if (data.success) {
        const rows = Array.isArray(data.rows) ? data.rows : [];
        const src = data.source || null;
        setRankingRows(rows);
        setRankingSource(src);
        setRankingAsOf(data.asOf || null);
        setRankingStale(!!data.stale);
        setRankingTruncated(!!data.truncated);
        if (Array.isArray(data.availableSources)) setRankingAvailableSources(data.availableSources);
        if (src) {
          setRankingsBySource(prev => ({
            ...prev,
            [src]: { rows, asOf: data.asOf || null, stale: !!data.stale, truncated: !!data.truncated }
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching rankings:', error);
      if (!explicitSource) rankingFetchedRef.current = false;
      setRankingError(true);
    } finally {
      setRankingLoading(false);
    }
  }, [site, rankingsBySource]);

  // Switch the displayed source and remember the choice per site.
  const selectRankingSource = useCallback((src) => {
    if (!src || src === rankingSource) return;
    setPreferredRankingSource(src);
    try { localStorage.setItem(`blawgy_rankings_source_${site}`, src); } catch { /* ignore */ }
    fetchRankings(src);
  }, [rankingSource, site, fetchRankings]);

  // Add a ranked keyword to the content plan. The plan accepts
  // 'cluster' | 'rec' | 'manual' (else coerced to manual); send manual and pass
  // the DFS volume when present. Mirrors KeywordFinder; degrades gracefully if
  // the plan API isn't available. A blocked add ("you already rank for this")
  // is advice, not a wall: the toast offers "add anyway", which retries with
  // force (the explicit-override contract the backend already honors).
  const addRankingToPlan = useCallback(async function addRankedInner(row, { force = false } = {}) {
    const keyword = row?.keyword;
    if (!keyword) return;
    setRankingAddingKey(keyword);
    try {
      const resp = await apiClient.post(`/api/plan/${site}/add`, {
        keyword,
        source: 'ranked',
        ...(row.volume ? { searchVolume: Number(row.volume) || 0 } : {}),
        ...(force ? { force: true } : {})
      });
      if (resp.data?.blocked === 'intent-owned') {
        const owner = resp.data.owner || {};
        const base = resp.data.message || 'You already rank for this. Refresh that post instead of adding a new one.';
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
              onClick={() => { toast.dismiss(t.id); addRankedInner(row, { force: true }); }}
              className="text-primary font-medium underline underline-offset-2 hover:opacity-80 whitespace-nowrap"
            >
              add anyway
            </button>
          </span>
        ), { icon: '✋', duration: 8000 });
        return;
      }
      toast.success(resp.data?.message || `Added "${keyword}" to your plan.`);
    } catch (err) {
      if (err?.response?.status === 404) {
        // The add endpoint 404s only when the site itself can't be found for
        // this account (stale selection / access change) — not a transient
        // "plan updating" state, so don't tell people to retry forever.
        toast.error('We could not find that site on your account. Refresh the page and try again.');
      } else {
        toast.error(err?.response?.data?.message || 'We could not add that to your plan.');
      }
    } finally {
      setRankingAddingKey(null);
    }
  }, [site]);

  // Reset rankings state + remembered source when the site changes.
  useEffect(() => {
    rankingFetchedRef.current = false;
    setRankingRows([]);
    setRankingSource(null);
    setRankingAsOf(null);
    setRankingAvailableSources([]);
    setRankingsBySource({});
    setRankingError(false);
    setRankingSearch('');
    setRankingStale(false);
    setRankingTruncated(false);
    try {
      const saved = localStorage.getItem(`blawgy_rankings_source_${site}`);
      setPreferredRankingSource(saved === 'gsc' || saved === 'dfs' ? saved : null);
    } catch {
      setPreferredRankingSource(null);
    }
  }, [site]);

  // Fetch rankings once when the Rankings tab first opens (per site). The
  // toggle drives any later source fetches. Honors the remembered preference.
  useEffect(() => {
    if (activeTab !== 'rankings' || !hasPro || !site) return;
    if (rankingFetchedRef.current) return;
    rankingFetchedRef.current = true;
    fetchRankings(preferredRankingSource);
  }, [activeTab, hasPro, site, fetchRankings, preferredRankingSource]);

  // Filter the displayed rows by the rankings search box (keyword or page).
  const rankingTerm = rankingSearch.trim().toLowerCase();
  const filteredRankings = useMemo(() => {
    if (!rankingTerm) return rankingRows;
    return rankingRows.filter(r => `${r.keyword || ''} ${r.page || ''}`.toLowerCase().includes(rankingTerm));
  }, [rankingRows, rankingTerm]);

  // The other (already-loaded) source as Map<keyword, position> for the quiet
  // cross-source delta chip. Built only from cache; never triggers a DFS fetch.
  const otherRankingSource = rankingSource === 'gsc' ? 'dfs' : rankingSource === 'dfs' ? 'gsc' : null;
  const otherRankingMap = useMemo(() => {
    if (!otherRankingSource) return null;
    const cached = rankingsBySource[otherRankingSource];
    if (!cached || !Array.isArray(cached.rows) || cached.rows.length === 0) return null;
    const map = new Map();
    for (const r of cached.rows) {
      if (r?.keyword && Number.isFinite(Number(r.position))) map.set(r.keyword, Number(r.position));
    }
    return map.size > 0 ? map : null;
  }, [otherRankingSource, rankingsBySource]);

  // Format date
  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render tabs - simplified UX with badges
  // The old Competitors tab and Content Planner wizard were intentionally
  // hidden (broken / not production-ready) and their unreachable JSX has been
  // deleted — recover it from git history if either ever comes back.
  // Keyword discovery now lives entirely in the Keywords tab (KeywordFinder);
  // SEO Analysis keeps just Overview + Rankings. "Rankings" is its own tab so
  // the ranked-keywords table — the answer to "am I ranking?" — isn't buried
  // below the chart/stats in Overview.
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'rankings', label: 'Keyword rankings', icon: Search, badge: rankingRows.length > 0 ? rankingRows.length : null }
  ];

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
      {/* Page chrome matches Dashboard / Keyword Finder: p-4 lg:p-12 with
          max-w-full, h2 text-xl/lg:text-2xl, description text-sm gray. Keeps
          the header consistent across Articles, Pages, Keyword Finder, SEO
          Analysis, AI Mentions, and GSC. */}
      <main className="flex-1 p-4 lg:p-12 lg:pt-8 overflow-auto pb-20 lg:pb-12">
        <div className="max-w-full">
          {/* Header. The scan control lives inside the Overview tab (not here)
              because the scan only refreshes the Overview's estimate snapshot;
              the Rankings tab reads Google's own data on its own schedule. */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
            <div className="flex-1">
              <h2 className="text-xl lg:text-2xl font-bold text-left mb-2">Rankings</h2>
              <p className="text-sm text-gray-500 text-left mb-2">
                {site ? (
                  <>
                    How your site is performing in Google. Looking for new topics? That's the{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/keyword-finder')}
                      className="text-primary hover:underline font-medium"
                    >
                      Topics page
                    </button>.
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="text-primary hover:underline font-medium"
                  >
                    Connect your site to get started
                  </button>
                )}
              </p>
            </div>
          </div>

          {/* Loading State — keep skeletons up until the snapshot fetch has
              resolved (or we know there's no Pro access) so we never flash
              empty stat cards while data is still in flight. */}
          {(loading || (hasPro && !snapshotLoaded)) && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
              </div>
              <ChartSkeleton />
              <TableSkeleton />
            </div>
          )}

          {/* Premium Gate */}
          {!loading && !hasPro && (
            <ProGate onUpgrade={() => setShowSubscriptionModal(true)} />
          )}

          {/* Main Content */}
          {!loading && hasPro && snapshotLoaded && (
            <>
              {/* Tabs */}
              <div data-tour="seo-tabs" className="border-b border-gray-200 mb-6">
                <nav className="flex space-x-8">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                      {tab.badge && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Scan control — scoped here because it only refreshes this
                      tab's estimate snapshot. */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-sm text-gray-500">
                      These stats are industry estimates for your whole site. The Rankings tab shows Google's own data.
                    </p>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-sm text-gray-500 whitespace-nowrap">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Last scan: {formatDate(seoStatus?.lastScanned)}
                      </div>
                      <button
                        data-tour="seo-run-scan"
                        onClick={runScan}
                        disabled={scanning || !seoStatus?.canScan}
                        title="Checks Google for every keyword your site ranks for. Limited to once a day."
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                          seoStatus?.canScan && !scanning
                            ? 'bg-primary hover:bg-primary-hover text-white'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                        {scanning ? 'Refreshing...' : seoStatus?.canScan ? 'Refresh SEO data' : `${seoStatus?.hoursRemaining}h until next refresh`}
                      </button>
                    </div>
                  </div>

                  {/* Stats Grid — only once there's real scan data; a wall of
                      0 / 0 / $0 / 0% on first load reads as "your site is
                      failing", not "we haven't scanned yet". */}
                  {hasRankingData && (
                  <div data-tour="seo-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      title="Total Keywords"
                      tooltip="How many search terms your site shows up for in Google's top 100. Industry estimate."
                      value={snapshot?.domainMetrics?.totalKeywords}
                      change={snapshot?.domainMetrics?.newKeywords > 0 ? `+${snapshot?.domainMetrics?.newKeywords} new` : undefined}
                      changeType={snapshot?.domainMetrics?.newKeywords > 0 ? 'positive' : undefined}
                      icon={Search}
                    />
                    <StatCard
                      title="Top 10 Rankings"
                      tooltip="Keywords where you show up on page one of Google."
                      value={(snapshot?.domainMetrics?.positions?.pos_1 || 0) +
                             (snapshot?.domainMetrics?.positions?.pos_2_3 || 0) +
                             (snapshot?.domainMetrics?.positions?.pos_4_10 || 0)}
                      icon={TrendingUp}
                    />
                    <StatCard
                      title="Traffic worth (est.)"
                      tooltip="What you'd pay Google Ads for the visitors your rankings bring in free."
                      value={snapshot?.domainMetrics?.etv}
                      format="currency"
                      icon={Zap}
                    />
                    <StatCard
                      title="Site health"
                      tooltip="How well your pages follow Google's technical guidelines. Not your rankings."
                      value={snapshot?.lighthouse?.seo}
                      format="percent"
                      icon={Target}
                    />
                  </div>
                  )}

                  {/* Combined: Page Health + Ranking Distribution — gated with
                      the stats grid so first load isn't a wall of zeros. */}
                  {hasRankingData && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Page Health Scores. The overall SEO score already renders
                        as the "Site health" stat card above, so it isn't
                        repeated here. */}
                    {snapshot?.lighthouse && (
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Page Health</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'Performance', value: snapshot.lighthouse.performance, tip: 'How fast your pages load.' },
                            { label: 'Accessibility', value: snapshot.lighthouse.accessibility, tip: 'How easy your pages are to use for people with disabilities.' }
                          ].map(metric => (
                            <div key={metric.label} className="text-center p-2 bg-gray-50 rounded-lg" title={metric.tip}>
                              <div className={`text-2xl font-bold ${
                                metric.value >= 0.9 ? 'text-green-600' :
                                metric.value >= 0.5 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {metric.value ? Math.round(metric.value * 100) : '-'}
                              </div>
                              <div className="text-xs text-gray-500">{metric.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Position Distribution */}
                    {snapshot?.domainMetrics?.positions && (
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Ranking Distribution</h3>
                        <div className="grid grid-cols-6 gap-2">
                          {[
                            { label: '#1', value: snapshot.domainMetrics.positions.pos_1, color: 'bg-green-500' },
                            { label: '#2-3', value: snapshot.domainMetrics.positions.pos_2_3, color: 'bg-green-400' },
                            { label: '#4-10', value: snapshot.domainMetrics.positions.pos_4_10, color: 'bg-blue-400' },
                            { label: '#11-20', value: snapshot.domainMetrics.positions.pos_11_20, color: 'bg-yellow-400' },
                            { label: '#21-50', value: (snapshot.domainMetrics.positions.pos_21_30 || 0) +
                                                      (snapshot.domainMetrics.positions.pos_31_40 || 0) +
                                                      (snapshot.domainMetrics.positions.pos_41_50 || 0), color: 'bg-orange-400' },
                            { label: '#51+', value: (snapshot.domainMetrics.positions.pos_51_60 || 0) +
                                                    (snapshot.domainMetrics.positions.pos_61_70 || 0) +
                                                    (snapshot.domainMetrics.positions.pos_71_80 || 0) +
                                                    (snapshot.domainMetrics.positions.pos_81_90 || 0) +
                                                    (snapshot.domainMetrics.positions.pos_91_100 || 0), color: 'bg-gray-400' }
                          ].map(item => (
                            <div key={item.label} className="text-center p-2 bg-gray-50 rounded-lg">
                              <div className={`w-2 h-2 rounded-full ${item.color} mx-auto mb-1`}></div>
                              <div className="text-lg font-bold text-gray-900">{item.value || 0}</div>
                              <div className="text-xs text-gray-500">{item.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  )}

                  {/* Historical Trend */}
                  {snapshot?.historicalRank && snapshot.historicalRank.length > 0 && (() => {
                    // Data comes in newest-first order, so slice from start for most recent
                    const allData = snapshot.historicalRank.slice().reverse(); // Convert to oldest-first for display
                    // Only offer period options the customer actually has data
                    // for. Showing "12 months" when we only have 3 months of
                    // history flattens the chart and looks broken in a demo.
                    const availableMonths = allData.length;
                    const periodOptions = [
                      { value: 3, label: '3 months' },
                      { value: 6, label: '6 months' },
                      { value: 12, label: '12 months' },
                      { value: 24, label: '2 years' }
                    ].filter(opt => opt.value < availableMonths);
                    periodOptions.push({ value: 0, label: 'All time' });
                    const effectiveRange = periodOptions.some(opt => opt.value === chartTimeRange)
                      ? chartTimeRange
                      : 0;
                    const displayData = effectiveRange === 0
                      ? allData
                      : allData.slice(-effectiveRange); // Take last N months (most recent)

                    return (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Keyword Growth</h3>
                          <p className="text-sm text-gray-500">Total keywords ranking in search results over time</p>
                          <button
                            type="button"
                            onClick={() => navigate('/reports')}
                            className="mt-1 text-xs text-primary hover:underline font-medium"
                          >
                            Want actual visitors from Google? Open Search Console.
                          </button>
                        </div>
                        {periodOptions.length > 1 && (
                          <select
                            value={effectiveRange}
                            onChange={(e) => setChartTimeRange(Number(e.target.value))}
                            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-primary focus:border-primary"
                          >
                            {periodOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={displayData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="month"
                            tick={{ fontSize: 11 }}
                            tickFormatter={(val) => {
                              const [year, month] = val.split('-');
                              return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(month)-1]} ${year.slice(2)}`;
                            }}
                          />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            formatter={(value) => [value.toLocaleString(), 'Keywords']}
                            labelFormatter={(label) => {
                              const [year, month] = label.split('-');
                              return `${['January','February','March','April','May','June','July','August','September','October','November','December'][parseInt(month)-1]} ${year}`;
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="totalKeywords"
                            stroke="#0F172A"
                            fill="#99F6E4"
                            fillOpacity={0.3}
                            name="Total Keywords"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    );
                  })()}

                  {/* Load failure is NOT an empty state — a customer with real
                      data must never be told to "run your first scan" because
                      one request dropped. */}
                  {snapshotError && !snapshot && (
                    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                      <p className="text-sm text-gray-600 mb-4">We couldn't load this just now. Your data is safe.</p>
                      <button
                        type="button"
                        onClick={fetchSnapshot}
                        className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Retry
                      </button>
                    </div>
                  )}

                  {/* No Data State - Show helpful guidance */}
                  {!(snapshotError && !snapshot) && (!snapshot || !hasRankingData) && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="p-8 text-center border-b border-gray-100">
                        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {!snapshot ? 'Run Your First Scan' : 'Building Your SEO Data'}
                        </h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                          {!snapshot
                            ? 'Scan your site to discover which keywords you\'re ranking for and find new opportunities.'
                            : gscConnected
                              ? "Estimates haven't caught up with your site yet. Check the Rankings tab for Google's own data."
                              : 'Your site is new or not yet indexed in search engines. Rankings will appear as your content gains visibility.'}
                        </p>
                        {!snapshot && (
                          <button
                            onClick={runScan}
                            disabled={scanning}
                            className="mt-4 bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-medium"
                          >
                            {scanning ? 'Scanning...' : 'Run First Scan'}
                          </button>
                        )}
                      </div>

                      {/* Show what they CAN do */}
                      <div className="p-6 bg-gray-50">
                        <p className="text-sm font-medium text-gray-700 mb-4">In the meantime, you can:</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
                              <Search className="w-4 h-4 text-blue-600" />
                            </div>
                            <h4 className="font-medium text-gray-900 text-sm">Find keywords</h4>
                            <p className="text-xs text-gray-500 mt-1">Research and save target keywords on the Topics page</p>
                            {savedKeywordsError ? (
                              <p className="text-xs text-gray-500 mt-2">
                                We couldn't load this just now. Your data is safe.{' '}
                                <button type="button" onClick={fetchSavedKeywords} className="text-primary hover:underline font-medium">
                                  Retry
                                </button>
                              </p>
                            ) : savedKeywordsCount > 0 && (
                              <span className="inline-block mt-2 text-xs text-green-600 font-medium">
                                {savedKeywordsCount} keywords saved
                              </span>
                            )}
                          </div>
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center mb-2">
                              <Zap className="w-4 h-4 text-green-600" />
                            </div>
                            <h4 className="font-medium text-gray-900 text-sm">Get ideas</h4>
                            <p className="text-xs text-gray-500 mt-1">Browse topics and keyword ideas on the Topics page</p>
                            <button
                              type="button"
                              onClick={() => navigate('/keyword-finder')}
                              className="mt-2 inline-block text-xs text-primary hover:underline font-medium"
                            >
                              Open Keywords →
                            </button>
                          </div>
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center mb-2">
                              <Calendar className="w-4 h-4 text-purple-600" />
                            </div>
                            <h4 className="font-medium text-gray-900 text-sm">Plan content</h4>
                            <p className="text-xs text-gray-500 mt-1">Turn your keywords into a scheduled content plan</p>
                            <button
                              onClick={() => navigate('/dashboard')}
                              className="mt-2 text-xs text-primary hover:underline font-medium"
                            >
                              Open content plan →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rankings Tab — the same "Your rankings" surface as the
                  Keywords tab: real Search Console data when connected, else a
                  cached DataForSEO estimate, via the shared SiteRankingsTable.
                  A source toggle appears when both are available. */}
              {activeTab === 'rankings' && (
                <div data-tour="seo-ranked-keywords" className="space-y-4">
                  {rankingLoading && rankingRows.length === 0 ? (
                    <div className="rounded-xl bg-white border border-slate-200 p-10 flex items-center justify-center gap-2 text-sm text-slate-600">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Loading your rankings...
                    </div>
                  ) : rankingError && rankingRows.length === 0 ? (
                    <div className="rounded-xl bg-white border border-slate-200 p-10 text-center max-w-xl mx-auto">
                      <X className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-1.5">We could not load your rankings right now</h3>
                      <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">Something went wrong on our end. Give it another try.</p>
                      <button
                        type="button"
                        onClick={() => fetchRankings(rankingSource)}
                        className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                      >
                        <RefreshCw className="w-4 h-4 mr-1.5" />
                        Retry
                      </button>
                    </div>
                  ) : (rankingRows.length === 0 && !(rankingAvailableSources.includes('gsc') && rankingAvailableSources.includes('dfs'))) ? (
                    <div className="rounded-xl bg-white border border-slate-200 p-10 text-center max-w-xl mx-auto">
                      <Search className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-1.5">See what you already rank for</h3>
                      <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
                        Connect Search Console to see your real rankings, how they're moving week to week, and turn the ones worth a push into new posts.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate('/reports')}
                        className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                      >
                        Connect Search Console
                      </button>
                    </div>
                  ) : (() => {
                    const isGsc = rankingSource === 'gsc';
                    const asOfLabel = rankingAsOf
                      ? new Date(rankingAsOf).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                      : null;
                    const staleSuffix = rankingStale ? ' (may be out of date)' : '';
                    const sourceLine = isGsc
                      ? `Straight from Google Search Console${asOfLabel ? `, week of ${asOfLabel}` : ''}${staleSuffix}`
                      : `Estimated rankings (industry data)${asOfLabel ? `, last checked ${asOfLabel}` : ''}${staleSuffix}`;
                    const canToggle = rankingAvailableSources.includes('gsc') && rankingAvailableSources.includes('dfs');
                    return (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm text-slate-600">{sourceLine}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              <span className="font-semibold text-slate-900">{filteredRankings.length}</span>
                              {' '}keyword{filteredRankings.length === 1 ? '' : 's'} you rank for
                            </p>
                            {canToggle && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                Google's numbers are what actually happened; the estimate helps before Google has enough history.
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                            {canToggle && (
                              <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden divide-x divide-slate-200 shrink-0">
                                {[['gsc', 'Google (your data)'], ['dfs', 'Estimate']].map(([src, label]) => (
                                  <button
                                    key={src}
                                    type="button"
                                    onClick={() => selectRankingSource(src)}
                                    disabled={rankingLoading}
                                    aria-pressed={rankingSource === src}
                                    className={`px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                                      rankingSource === src ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="relative flex-1 min-w-[12rem] max-w-sm">
                              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={rankingSearch}
                                onChange={(e) => setRankingSearch(e.target.value)}
                                placeholder="Search your rankings"
                                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                              />
                            </div>
                          </div>
                        </div>

                        <SiteRankingsTable
                          rows={filteredRankings}
                          source={rankingSource}
                          asOf={rankingAsOf}
                          onAddToPlan={addRankingToPlan}
                          addingKey={rankingAddingKey}
                          otherRows={otherRankingMap}
                          otherSource={otherRankingSource}
                          truncated={rankingTruncated}
                          emptyMessage={rankingTerm
                            ? 'No keywords match your search.'
                            : 'Nothing ranking in the top 50 yet. New sites usually take 4 to 8 weeks to show up in Google. Your scheduled posts are how this list grows.'}
                        />
                      </>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </NavbarWrapper>
  );
};

export default SeoAnalysis;
