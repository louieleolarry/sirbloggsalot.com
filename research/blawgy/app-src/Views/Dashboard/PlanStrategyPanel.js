import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  XIcon, Minus, Plus, LoaderIcon, CalendarRange, Repeat, Target, Info, Gauge, AlertTriangle, TrendingUp,
} from 'lucide-react';
import apiClient from '../../utils/apiClient';
import { useBodyScrollLock } from '../../components/Modals';

const HORIZON_CHOICES = [4, 6, 8];

// Below this many weeks of net-new topic supply the gauge flips to an amber
// low-supply state. Kept in lockstep with the backend planEngine.LOW_RUNWAY_WEEKS.
const LOW_RUNWAY_WEEKS = 3;

/**
 * Quiet supply gauge at the top of the Strategy panel. Answers "will we run out
 * of new topics?" honestly and visibly: about N weeks of new topics in the tank,
 * M refresh opportunities banked. Below LOW_RUNWAY_WEEKS it turns amber with a
 * plain nudge to refill the tank. Renders nothing when runway is unavailable.
 */
function RunwayGauge({ runway, postsPerWeek, onGoToKeywords }) {
  if (!runway || typeof runway.weeksOfRunway !== 'number') return null;
  const weeks = Math.max(0, runway.weeksOfRunway);
  const refresh = Math.max(0, runway.refreshOpportunities || 0);
  const low = weeks <= LOW_RUNWAY_WEEKS;
  const est = !!runway.estimate;

  const weekWord = weeks === 1 ? 'week' : 'weeks';
  const refreshWord = refresh === 1 ? 'opportunity' : 'opportunities';

  return (
    <div
      data-testid="runway-gauge"
      className={`mb-5 rounded-lg border p-3 ${
        low ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <div className="flex items-start gap-2">
        {low ? (
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-amber-500" />
        ) : (
          <Gauge size={15} className="mt-0.5 flex-shrink-0 text-slate-400" />
        )}
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${low ? 'text-amber-900' : 'text-slate-900'}`}>
            {weeks === 0 ? (
              'Less than a week of new topics in the tank'
            ) : (
              <>About <span className="tabular-nums">{weeks}</span> {weekWord} of new topics in the tank</>
            )}
            {refresh > 0 && (
              <>
                ,{' '}
                <span
                  className="tabular-nums underline decoration-dotted"
                  title="Topics you already cover that could be refreshed and re-ranked, rather than written new"
                >
                  {refresh} refresh {refreshWord} banked
                </span>
              </>
            )}
            {est && (
              <span
                className="ml-1 text-xs font-normal text-slate-400 underline decoration-dotted"
                title="A rough figure, based on your current topic supply and posting pace"
              >
                (estimate)
              </span>
            )}
          </p>
          {low && (
            <p className="mt-1 text-xs text-amber-800">
              You'll run out of new topics in about {weeks === 0 ? 'a' : weeks} {weeks === 1 ? 'week' : 'weeks'}.{' '}
              {onGoToKeywords ? (
                <button onClick={onGoToKeywords} className="font-medium underline hover:text-amber-900">
                  Run keyword research again
                </button>
              ) : (
                'Run keyword research again'
              )}{' '}
              to find more, or drop to fewer posts per week{postsPerWeek > 1 ? ` (you're at ${postsPerWeek})` : ''}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Quiet "Projected upside" block under the runway gauge. Sums the scheduled
 * pipeline's rough per-article traffic ranges (computed server-side from
 * monthly searches and typical click rates by position). Honest by design:
 * one plain subtext line says it is a target, not a promise. Renders nothing
 * when there is no projection.
 */
function ProjectedUpside({ projection }) {
  if (!projection || typeof projection.high !== 'number' || projection.high <= 0) return null;
  const low = Math.max(0, projection.low || 0);
  return (
    <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-3" data-testid="projected-upside">
      <div className="flex items-start gap-2">
        <TrendingUp size={15} className="mt-0.5 flex-shrink-0 text-slate-400" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            Projected upside: <span className="tabular-nums">{low.toLocaleString()}</span> to{' '}
            <span className="tabular-nums">{projection.high.toLocaleString()}</span> extra visits every month
          </p>
          <p className="mt-1 text-xs text-slate-500">
            If the scheduled articles rank where we are aiming. Not a promise, a target.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Small +/- stepper used for posts-per-week. Black outline chrome, slate text,
 * clamps to [min, max]. Matches the plan board's AA styling (color reserved for
 * status semantics only).
 */
function Stepper({ value, min, max, onChange, disabled }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
      <button
        type="button"
        onClick={dec}
        disabled={disabled || value <= min}
        className="flex h-9 w-9 items-center justify-center rounded-l-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
        aria-label="Fewer posts per week"
      >
        <Minus size={15} />
      </button>
      <span className="min-w-[2.5rem] px-1 text-center text-sm font-semibold tabular-nums text-slate-900" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={disabled || value >= max}
        className="flex h-9 w-9 items-center justify-center rounded-r-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
        aria-label="More posts per week"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}

/**
 * A slate toggle switch. On = slate-900 (bg-primary), off = slate-200. Color is
 * kept out of it on purpose (chrome, not status).
 */
function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-primary' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

/**
 * Right slide-over to configure the content strategy. Matches PlanDrawer's
 * pattern: fixed full-height panel, own internal scroll, Esc + backdrop close.
 *
 * Persistence paths:
 *   - postsPerWeek  -> POST /update-site-settings { site, settings } (existing,
 *                      whitelisted). Reuses the SettingsPage client call.
 *   - horizonWeeks / autoRenew / priorities
 *                   -> PATCH /api/plan/:site/config. The endpoint exists; any
 *                      error (including a 404, which means an ownership/domain
 *                      mismatch) surfaces the real failure message.
 */
const PlanStrategyPanel = ({
  site,
  config,          // plan config: { postsPerWeek, horizon/horizonWeeks, autoRenew, priorities }
  runway,          // { netNewCandidates, weeksOfRunway, refreshOpportunities, estimate } | null
  projection,      // { low, high, entriesCounted, note } | null — scheduled pipeline upside
  siteSettings,    // full site settings object (for a non-destructive settings save)
  onClose,
  onConfigChange,  // (patch) => void — lift accepted local changes to the parent plan
  toast,
  onGoToKeywords,  // () => void — switch to the Keywords tab (amber nudge + zero-topics link)
}) => {
  // ---- posts per week (site-settings path) ----
  // Fallback to 3/week, the recommended default for a new plan, so the control
  // matches what generation will actually do before a value is persisted.
  const [postsPerWeek, setPostsPerWeek] = useState(() => {
    const v = config?.postsPerWeek ?? siteSettings?.postsPerWeek;
    return Number.isFinite(v) && v > 0 ? Math.min(7, Math.max(1, v)) : 3;
  });
  const [savingPace, setSavingPace] = useState(false);

  // ---- plan config path (horizon / auto-replenish / priorities) ----
  const [horizonWeeks, setHorizonWeeks] = useState(() => {
    const v = config?.horizon ?? config?.horizonWeeks;
    // 6 weeks is the engine's default horizon; use it when nothing is persisted.
    return HORIZON_CHOICES.includes(v) ? v : 6;
  });
  const [autoRenew, setAutoRenew] = useState(() => !!config?.autoRenew);

  // ---- topic priorities (clusters) ----
  const [clusters, setClusters] = useState([]);
  const [clustersLoading, setClustersLoading] = useState(false);
  // Selected cluster labels. The engine treats an EMPTY or UNSET priorities list
  // as "draw from all topics", so a genuine explicit selection must be non-empty.
  // We therefore treat both null AND [] as "not yet chosen": seed every topic ON
  // once clusters load. Only a saved NON-EMPTY array is an explicit choice.
  const hasExplicitPriorities = Array.isArray(config?.priorities) && config.priorities.length > 0;
  const [priorities, setPriorities] = useState(() =>
    hasExplicitPriorities ? config.priorities : null
  );
  const prioritiesSeededRef = useRef(hasExplicitPriorities);

  const [savingConfig, setSavingConfig] = useState(false);

  // Lock the page behind the panel (matches PlanDrawer).
  useBodyScrollLock(true);

  // Esc closes (matches PlanDrawer).
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Load the site's research clusters (same endpoint the swap-picker uses).
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!site) return;
      setClustersLoading(true);
      try {
        const res = await apiClient.get(`/api/keyword-research/${site}/clusters`);
        if (!alive) return;
        const raw = Array.isArray(res.data?.clusters) ? res.data.clusters : [];
        const labels = raw.map((c) => c.label).filter(Boolean);
        setClusters(labels);
        // Default every topic on the first time we see them (no saved priorities).
        if (!prioritiesSeededRef.current) {
          prioritiesSeededRef.current = true;
          setPriorities(labels);
        }
      } catch (_) {
        if (alive) setClusters([]);
      } finally {
        if (alive) setClustersLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [site]);

  // ---- persistence: posts per week via existing site-settings path ----
  const savePostsPerWeek = useCallback(async (next) => {
    setSavingPace(true);
    try {
      const res = await apiClient.post('/update-site-settings', {
        site,
        settings: { ...(siteSettings || {}), postsPerWeek: next },
      });
      if (res.data?.success) {
        onConfigChange?.({ postsPerWeek: next });
        toast?.('Posting pace saved');
      } else {
        toast?.(res.data?.message || 'Could not save your pace');
      }
    } catch (err) {
      toast?.(err.response?.data?.message || 'Could not save your pace');
    } finally {
      setSavingPace(false);
    }
  }, [site, siteSettings, onConfigChange, toast]);

  const handlePostsPerWeek = (next) => {
    setPostsPerWeek(next);
    savePostsPerWeek(next);
  };

  // ---- persistence: horizon / auto-renew / priorities via plan config PATCH.
  // The PATCH body and the parent-plan config use DIFFERENT key names for the
  // horizon: the request wants `horizonWeeks`, but the plan view (GET /:site)
  // exposes it as `horizon`. So `body` goes to the backend as-is, while
  // `localPatch` (defaults to body) is what we lift into the parent so the board
  // reflects the change immediately without a refetch. 404 => keep local state,
  // gentle toast, never crash.
  const patchConfig = useCallback(async (body, okMsg, localPatch) => {
    const applied = localPatch || body;
    setSavingConfig(true);
    try {
      const res = await apiClient.patch(`/api/plan/${site}/config`, body);
      if (res.data?.success !== false) {
        onConfigChange?.(applied);
        if (okMsg) toast?.(okMsg);
      } else {
        toast?.(res.data?.message || 'Could not save strategy settings');
      }
    } catch (err) {
      // The config endpoint exists; a 404 here means an ownership/domain mismatch,
      // not "coming online". Surface the real failure instead of false reassurance.
      toast?.(err.response?.data?.message || 'Could not save strategy settings');
    } finally {
      setSavingConfig(false);
    }
  }, [site, onConfigChange, toast]);

  const handleHorizon = (weeks) => {
    setHorizonWeeks(weeks);
    // Send `horizonWeeks` to the API; mirror as `horizon` into the parent plan
    // config so the calendar's ghost-slot horizon updates right away.
    patchConfig({ horizonWeeks: weeks }, 'Plan horizon saved', { horizon: weeks });
  };

  const handleAutoRenew = (next) => {
    setAutoRenew(next);
    patchConfig({ autoRenew: next }, next ? 'Auto-replenish on' : 'Auto-replenish off');
  };

  const toggleCluster = (label) => {
    setPriorities((cur) => {
      // If unset (all-on default), the visible state is "every cluster selected";
      // materialize that before removing one so a toggle-off actually deselects.
      const base = Array.isArray(cur) ? cur : clusters;
      const isOn = base.includes(label);
      const next = isOn ? base.filter((l) => l !== label) : [...base, label];
      // Never let the user save an empty selection: the engine reads empty as
      // "all topics", so an all-off UI would silently mean the opposite.
      if (next.length === 0) {
        toast?.('Keep at least one topic on. With none selected we draw from all of them.');
        return base;
      }
      patchConfig({ priorities: next });
      return next;
    });
  };

  // When priorities is unset (null), the visible state is "all topics on".
  const selected = Array.isArray(priorities) ? priorities : clusters;
  const allOn = clusters.length > 0 && selected.length === clusters.length;

  // Runway reacts to the pace stepper without waiting for a server refetch: weeks
  // of supply = net-new candidates / posts per week. We only override the
  // server's weeksOfRunway when we can actually recompute it (netNewCandidates
  // present); otherwise we pass the server value through untouched.
  const localRunway = useMemo(() => {
    if (!runway || typeof runway.weeksOfRunway !== 'number') return runway;
    const candidates = runway.netNewCandidates;
    if (typeof candidates !== 'number' || !(postsPerWeek > 0)) return runway;
    const weeks = Math.floor(candidates / postsPerWeek);
    return { ...runway, weeksOfRunway: Math.max(0, weeks) };
  }, [runway, postsPerWeek]);

  return (
    <div className="fixed inset-0 z-[60]" data-testid="plan-strategy-panel">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* Panel */}
      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Content Plan</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-700">Strategy</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
            <XIcon size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Supply runway gauge (quiet, honest "will we run out?" answer) */}
          <RunwayGauge runway={localRunway} postsPerWeek={postsPerWeek} onGoToKeywords={onGoToKeywords} />

          {/* Rough traffic upside of the scheduled pipeline (target, not promise) */}
          <ProjectedUpside projection={projection} />

          {/* Explainer */}
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <Info size={15} className="mt-0.5 flex-shrink-0 text-slate-400" />
            <span>Your plan draws from these settings every week.</span>
          </div>

          {/* Posts per week */}
          <section className="mb-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <CalendarRange size={15} className="text-slate-400" /> Posts per week
                </p>
                <p className="mt-0.5 text-xs text-slate-500">Applies to new scheduling. Already scheduled posts stay where they are.</p>
              </div>
              <div className="flex items-center gap-2">
                {savingPace && <LoaderIcon size={15} className="animate-spin text-slate-400" />}
                <Stepper value={postsPerWeek} min={1} max={7} onChange={handlePostsPerWeek} disabled={savingPace} />
              </div>
            </div>
          </section>

          {/* Plan horizon */}
          <section className="mb-6">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <CalendarRange size={15} className="text-slate-400" /> Plan horizon
            </p>
            <p className="mt-0.5 text-xs text-slate-500">How far ahead we fill your calendar. Shrinking it deletes nothing that is already scheduled.</p>
            <div className="mt-2 inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              {HORIZON_CHOICES.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => handleHorizon(w)}
                  disabled={savingConfig}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                    horizonWeeks === w ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {w} weeks
                </button>
              ))}
            </div>
          </section>

          {/* Auto-replenish */}
          <section className="mb-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <Repeat size={15} className="text-slate-400" /> Auto-replenish
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {autoRenew
                    ? 'Blawgy finds new topics and schedules them for you every week, marked "Added by Blawgy" so you can remove any that are not a fit.'
                    : 'Off: your calendar stops filling after the last scheduled post. No new topics are added for you.'}
                </p>
              </div>
              <Toggle checked={autoRenew} onChange={handleAutoRenew} disabled={savingConfig} label="Auto-replenish weekly" />
            </div>
          </section>

          {/* Topic priorities */}
          <section>
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <Target size={15} className="text-slate-400" /> Topic priorities
              </p>
              {allOn && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600" data-testid="all-topics-badge">
                  All topics
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">Choose which research topics your plan draws from.</p>

            <div className="mt-3 space-y-1.5">
              {clustersLoading && clusters.length === 0 && (
                <div className="flex items-center justify-center py-6 text-sm text-slate-400">
                  <LoaderIcon size={16} className="mr-2 animate-spin" /> Loading your topics
                </div>
              )}
              {!clustersLoading && clusters.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
                  No research topics yet.{' '}
                  {onGoToKeywords ? (
                    <button onClick={onGoToKeywords} className="font-medium text-slate-600 underline hover:text-slate-800">
                      Run new keyword research to find more topics
                    </button>
                  ) : (
                    'Run keyword research to build some.'
                  )}
                </p>
              )}
              {clusters.map((label) => {
                const on = selected.includes(label);
                return (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-sm text-slate-800" title={label}>{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="hidden text-xs text-slate-400 sm:inline">Draw from this topic</span>
                      <Toggle checked={on} onChange={() => toggleCluster(label)} disabled={savingConfig} label={`Draw from ${label}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PlanStrategyPanel;
