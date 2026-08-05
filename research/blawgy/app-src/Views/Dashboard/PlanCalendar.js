import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, CalendarDays, Clock, X, Loader2, Plus } from 'lucide-react';
import PlanCard from './PlanCard';
import PlanDrawer from './PlanDrawer';
import {
  StatusRows, ElapsedCounter, useElapsed, useOnboardingStyles,
} from '../Onboarding/Primitives';

// ---- date helpers (local time, day-granular) ------------------------------
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay()); // Sunday start
  return x;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}
// True only for a value that parses to a real calendar date. Guards every
// helper below against a truthy-but-garbage publishDate (e.g. "soon") that
// would otherwise throw RangeError on .toISOString() and blank the board.
function isValidDate(d) {
  const t = new Date(d).getTime();
  return !Number.isNaN(t);
}
function dayKey(d) {
  return startOfDay(d).toISOString().slice(0, 10);
}
function isPast(d) {
  return startOfDay(d).getTime() < startOfDay(new Date()).getTime();
}
function fmtShort(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// The board shows exactly this many week columns per page; paging moves a full
// page at a time (typeform-style slide), forward-only from the current week.
const WEEKS_PER_PAGE = 3;

// One-time keyframes for the page slide. Injected once per mount tree.
const SLIDE_STYLE_ID = 'plan-calendar-slide-style';
function usePageSlideStyles() {
  useEffect(() => {
    if (document.getElementById(SLIDE_STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = SLIDE_STYLE_ID;
    el.textContent = `
      @keyframes plan-page-fwd { from { opacity: 0; transform: translateX(32px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes plan-page-back { from { opacity: 0; transform: translateX(-32px); } to { opacity: 1; transform: translateX(0); } }
      .plan-page-fwd { animation: plan-page-fwd 240ms ease-out; }
      .plan-page-back { animation: plan-page-back 240ms ease-out; }
      @media (prefers-reduced-motion: reduce) {
        .plan-page-fwd, .plan-page-back { animation: none; }
      }
    `;
    document.head.appendChild(el);
  }, []);
}

// ---- plan-build walkthrough -----------------------------------------------
// The generate call is a single blocking request (no incremental poll), so the
// staged lines advance on elapsed time. Each line names a real phase the plan
// engine runs: collect candidates -> score against site authority -> schedule.
// Seconds each stage becomes "active". The build holds a minimum ~8s arc
// (PLAN_BUILD_MIN_MS in index.js), so the last stage must go active well before
// 8s or stage 3 never visibly completes. [0, 3, 6] leaves ~2s for stage 3 to
// read as active-then-done inside the arc.
const STAGE_AT = [0, 3, 6]; // seconds each stage becomes "active"

/**
 * Staged status lines shown while the plan is building. Replaces the bare
 * spinner: live elapsed counter (tabular-nums) + one active line at a time,
 * completed lines checked. `cadence` / `weeks` fill the scheduling line from
 * the site's real config.
 */
function PlanBuildWalkthrough({ cadence, weeks, gscConnected }) {
  useOnboardingStyles();
  const elapsed = useElapsed(true);
  const active = STAGE_AT.reduce((acc, at, i) => (elapsed >= at ? i : acc), 0);

  const labels = [
    gscConnected
      ? 'Pulling opportunities from your keyword research and Search Console'
      : 'Pulling opportunities from your keyword research',
    'Checking which topics your site can realistically rank for',
    `Scheduling ${weeks} week${weeks === 1 ? '' : 's'} at your pace${cadence ? `, ${cadence} post${cadence === 1 ? '' : 's'} per week` : ''}`,
  ];
  const rows = labels.map((label, i) => ({
    label,
    state: i < active ? 'done' : i === active ? 'active' : 'pending',
  }));

  return (
    <div className="mb-5 rounded-xl border border-slate-200 bg-white p-6" data-testid="plan-build-walkthrough">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Building your plan</h3>
        <ElapsedCounter seconds={elapsed} className="text-sm font-medium text-slate-500" />
      </div>
      <StatusRows rows={rows} />
    </div>
  );
}

/**
 * "Why this plan" strip. On a mature site the engine correctly schedules FEW new
 * posts (intent guard + quality floor): a healthy outcome that otherwise reads
 * as broken. So instead of only listing sources, we narrate the FULL honest
 * picture from the generate summary + runway:
 *
 *   "Scheduled N new articles. M topic ideas matched content you already have, so
 *    they became refresh suggestions instead. About R weeks of new topics in the
 *    tank."
 *
 * Every clause is gated on real data: a clause with no number is omitted, so we
 * never claim what the response can't back. `summary` is the generate response
 * ({ scheduled, refreshSuggestions, suggestions }); `runway` is the plan view's
 * runway ({ weeksOfRunway }). When neither is available we fall back to counting
 * the entries' provenance so the strip still says something true. Dismissal
 * persists per site in localStorage.
 */
function WhyThisPlan({ site, entries, summary, runway, cadence, projection, onDismiss, onGoToKeywords }) {
  // Provenance fallback (no generate summary in hand, e.g. after a plain reload).
  const provenance = useMemo(() => {
    let research = 0, gsc = 0, ranked = 0;
    (entries || []).forEach((e) => {
      const raw = String(e.seoMetrics?.contentPlanSource || e.source || '').toLowerCase();
      if (raw === 'cluster' || raw === 'keyword-research') research += 1;
      else if (raw === 'rec' || raw === 'gsc' || raw === 'search-console') gsc += 1;
      else if (raw === 'ranked') ranked += 1;
    });
    return { research, gsc, ranked, total: research + gsc + ranked };
  }, [entries]);

  const dismiss = () => {
    try { localStorage.setItem(`planWhyDismissed:${site}`, '1'); } catch (_) { /* noop */ }
    onDismiss();
  };

  // Build the honest sentence set from the generate summary when we have it.
  const sentences = [];
  const haveSummary = summary && typeof summary.scheduled === 'number';
  let zeroNew = false;

  if (haveSummary) {
    const scheduled = summary.scheduled || 0;
    const refresh = summary.refreshSuggestions || 0;
    const weeks = runway && typeof runway.weeksOfRunway === 'number'
      ? Math.max(0, runway.weeksOfRunway)
      : null;

    if (scheduled > 0) {
      sentences.push(`Scheduled ${scheduled} new article${scheduled === 1 ? '' : 's'}${cadence ? ` at ${cadence} per week` : ''}.`);
    } else if (summary.research && !summary.research.hasResearch) {
      // Fresh site: the site has never been researched, and the generate call
      // just auto-started (or found in-flight) its first research. The plan
      // fills itself when the deep pass lands; say that, not "already covered".
      zeroNew = true;
      sentences.push(
        summary.research.started || summary.research.running
          ? 'We are researching keywords for your site right now. Your plan will fill itself with topics in a few minutes, nothing to do on your end.'
          : 'We could not start keyword research automatically. Run keyword research to fill your plan.'
      );
    } else {
      // Zero new is the honest, correct outcome on a mature site: say so plainly.
      zeroNew = true;
      sentences.push('No brand-new topics to schedule right now. Your site already covers your current research.');
    }
    if (refresh > 0) {
      sentences.push(`${refresh} topic idea${refresh === 1 ? '' : 's'} matched content you already have, so we skipped ${refresh === 1 ? 'it' : 'them'}: writing ${refresh === 1 ? 'it' : 'them'} again would make your own pages compete with each other.`);
    }
    if (weeks !== null && weeks > 0) {
      sentences.push(`About ${weeks} week${weeks === 1 ? '' : 's'} of new topics in the tank.`);
    }
  } else if (provenance.total > 0) {
    // Fallback: describe where the scheduled entries came from.
    const parts = [];
    if (provenance.research) parts.push(`${provenance.research} from your keyword research topics`);
    if (provenance.gsc) parts.push(`${provenance.gsc} from Search Console queries you are close to ranking for`);
    if (provenance.ranked) parts.push(`${provenance.ranked} from keywords you already rank on`);
    const sourcesLine = parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
    sentences.push(`${sourcesLine}. Picked as topics your site can realistically rank for${cadence ? ` and spaced ${cadence} per week` : ''}.`);
  }

  // Rough traffic upside of the scheduled pipeline (server-computed; honest
  // "aiming" framing). Only stated when the projection exists and we already
  // have something true to say.
  if (sentences.length > 0 && projection && typeof projection.high === 'number' && projection.high > 0) {
    const low = Math.max(0, projection.low || 0);
    sentences.push(`If these land where we are aiming, that is roughly ${low.toLocaleString()} to ${projection.high.toLocaleString()} extra visits every month.`);
  }

  if (sentences.length === 0) return null;

  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" data-testid="why-this-plan">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">Why this plan</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          {sentences.join(' ')}
        </p>
        {zeroNew && onGoToKeywords && (
          <button
            onClick={onGoToKeywords}
            className="mt-1.5 text-sm font-medium text-primary underline hover:text-primary-hover"
          >
            Run new keyword research to find more topics
          </button>
        )}
      </div>
      <button
        onClick={dismiss}
        className="flex-shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}

/**
 * The calendar board. Forward-only, three week columns per page, paged with
 * arrow buttons or keyboard arrows (typeform-style slide, no horizontal
 * scroll). Each column is a simple ordered stack of that week's article cards;
 * exact days live on the cards' date chips, not in day sub-rows. Suggestions
 * no longer render as ghost cards: autopilot schedules them itself (weekly
 * replenish), and fresh auto-adds carry an "Added by Blawgy" marker instead.
 * Native HTML5 drag reschedules an entry into another week's next open day.
 */
const PlanCalendar = ({
  site,
  entries,
  suggestions,       // passed through to the drawer's swap picker only
  trial,
  loading,
  onReschedule,      // (id, newISODate) => Promise<bool>  (parent does optimistic + rollback)
  onGenerate,        // (entry) => void
  onPreview,         // (entry) => void
  onPublish,         // (entry) => void
  onEdit,            // (entry) => void: open the edit modal (published cards)
  onRemove,          // (entry) => void
  onPatched,         // (id, patch) => void
  onDeleted,         // (id) => void
  onSwapTopic,       // (entry, {keyword,title}) => void
  onGeneratePlan,    // () => void
  generatingPlan,
  planSummary,       // last generate response { scheduled, refreshSuggestions, suggestions, projection }
  runway,            // plan view runway { weeksOfRunway, ... } | null
  projection,        // plan view traffic projection { low, high, entriesCounted, note } | null
  config,            // { postsPerWeek, horizon } from the plan view
  onUpgrade,
  toast,
  gscConnected,      // bool | undefined: drives whether build copy mentions Search Console
  onGoToKeywords,    // () => void: switch to the Keywords tab (zero-new-topics link)
  onAddTopics,       // () => void: open the Add-topics drawer (keyword picker over the plan)
}) => {
  usePageSlideStyles();
  const [page, setPage] = useState(0);           // 0 = current 3 weeks; forward-only
  const [slideDir, setSlideDir] = useState('fwd');
  const [drawerEntry, setDrawerEntry] = useState(null);
  const [dragOverWeek, setDragOverWeek] = useState(null); // week index under drag
  const draggedRef = useRef(null);

  const cadence = config?.postsPerWeek || null;
  // 6 weeks is the engine's default horizon; only used for the build copy.
  const planWeeks = config?.horizon || 6;

  // "Why this plan" strip: show it once a build finishes, unless the user already
  // dismissed it for this site. We show it even when ZERO new posts were
  // scheduled (mature site) as long as there's a summary or entries to narrate -
  // that honest "no new topics, they became refreshes" message is the whole point
  // of Bug 3.
  const [showWhy, setShowWhy] = useState(false);
  const wasGeneratingRef = useRef(generatingPlan);
  useEffect(() => {
    const wasGenerating = wasGeneratingRef.current;
    wasGeneratingRef.current = generatingPlan;
    const haveSomethingToSay =
      (planSummary && typeof planSummary.scheduled === 'number') || (entries || []).length > 0;
    // Build just finished (true -> false) and we can say something true.
    if (wasGenerating && !generatingPlan && haveSomethingToSay) {
      let dismissed = false;
      try { dismissed = localStorage.getItem(`planWhyDismissed:${site}`) === '1'; } catch (_) { /* noop */ }
      if (!dismissed) setShowWhy(true);
    }
  }, [generatingPlan, entries, planSummary, site]);

  // First load per site: also show the strip on a plain reload (not just the
  // post-generate transition), as long as there is a plan to narrate and the
  // user has not dismissed it for this site. Reuses the same localStorage key.
  useEffect(() => {
    if (generatingPlan || loading) return;
    if ((entries || []).length === 0) return;
    let dismissed = false;
    try { dismissed = localStorage.getItem(`planWhyDismissed:${site}`) === '1'; } catch (_) { /* noop */ }
    if (!dismissed) setShowWhy(true);
    // Intentionally keyed on `site` (and load state) so switching sites re-evaluates
    // once, without re-showing after an in-session dismiss.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site]);

  // The board's fixed origin: the current week. Forward-only paging from here.
  const baseWeek = useMemo(() => startOfWeek(new Date()), []);
  const pageStart = useMemo(() => addDays(baseWeek, page * WEEKS_PER_PAGE * 7), [baseWeek, page]);
  const pageEnd = useMemo(() => addDays(pageStart, WEEKS_PER_PAGE * 7), [pageStart]);

  // Split entries into scheduled (has date) and unscheduled (tray).
  const { scheduledEntries, unscheduled } = useMemo(() => {
    const s = [], u = [];
    (entries || []).forEach((e) => {
      // A truthy but unparseable publishDate ("soon", "") can't be placed on a
      // day without crashing dayKey: treat it as unscheduled (tray) instead.
      if (e.publishDate && isValidDate(e.publishDate)) s.push(e); else u.push(e);
    });
    return { scheduledEntries: s, unscheduled: u };
  }, [entries]);

  // Overdue: scheduled before the current week but never published. The board
  // is forward-only, so without this tray these rows are invisible while the
  // header still counts them ("8 scheduled" over an empty calendar). Published
  // history stays summarized by the published-last-week line instead.
  const overdue = useMemo(() => {
    const from = baseWeek.getTime();
    return scheduledEntries
      .filter((e) => e.blogStatus !== 'published' && startOfDay(e.publishDate).getTime() < from)
      .sort((a, b) => new Date(a.publishDate) - new Date(b.publishDate));
  }, [scheduledEntries, baseWeek]);

  // Forward-only: nothing before the current week renders. One summary line
  // keeps last week's shipped work visible without hauling history around.
  const publishedLastWeek = useMemo(() => {
    const from = addDays(baseWeek, -7).getTime();
    const to = baseWeek.getTime();
    return scheduledEntries.filter((e) => {
      if (e.blogStatus !== 'published') return false;
      const t = startOfDay(e.publishDate).getTime();
      return t >= from && t < to;
    }).length;
  }, [scheduledEntries, baseWeek]);

  // Trial frost boundary.
  const visibleUntil = useMemo(
    () => (trial?.isTrialing && trial?.visibleUntilDate ? new Date(trial.visibleUntilDate) : null),
    [trial]
  );
  const isFrosted = useCallback(
    (d) => !!visibleUntil && startOfDay(d).getTime() > startOfDay(visibleUntil).getTime(),
    [visibleUntil]
  );

  // How many real (non-published) entries sit beyond the trial preview boundary.
  // Drives the boundary strip's "N more articles are already planned" count.
  const frostedCount = useMemo(() => {
    if (!visibleUntil) return 0;
    return (entries || []).filter(
      (e) => e.publishDate && isValidDate(e.publishDate) && e.blogStatus !== 'published' && isFrosted(e.publishDate)
    ).length;
  }, [entries, visibleUntil, isFrosted]);

  // Build the visible week columns: [{ start, end, entries[] }] sorted by date.
  const weekColumns = useMemo(() => {
    const cols = [];
    for (let w = 0; w < WEEKS_PER_PAGE; w++) {
      const start = addDays(pageStart, w * 7);
      const end = addDays(start, 7);
      cols.push({ start, end, entries: [] });
    }
    const from = baseWeek.getTime(); // forward-only: current week onward
    scheduledEntries.forEach((e) => {
      const t = startOfDay(e.publishDate).getTime();
      if (t < from) return;
      cols.forEach((col) => {
        if (t >= col.start.getTime() && t < col.end.getTime()) col.entries.push(e);
      });
    });
    cols.forEach((col) => col.entries.sort((a, b) => new Date(a.publishDate) - new Date(b.publishDate)));
    return cols;
  }, [scheduledEntries, pageStart, baseWeek]);

  // Does the site have any future scheduled entry? Drives the hero prompt.
  const hasFuture = useMemo(
    () => scheduledEntries.some((e) => !isPast(e.publishDate) && e.blogStatus !== 'published'),
    [scheduledEntries]
  );

  // ---- paging -------------------------------------------------------------
  const goForward = useCallback(() => { setSlideDir('fwd'); setPage((p) => p + 1); }, []);
  const goBack = useCallback(() => { setSlideDir('back'); setPage((p) => Math.max(0, p - 1)); }, []);
  const goToday = useCallback(() => { setSlideDir('back'); setPage(0); }, []);

  // Keyboard paging (typeform-style). Ignored while typing or with the drawer
  // open (the drawer owns Escape/oncoming keys there).
  useEffect(() => {
    const onKey = (e) => {
      if (drawerEntry) return;
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); goForward(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerEntry, goForward, goBack]);

  // ---- drag handlers (drop on a week -> next open day in that week) -------
  const handleDragStart = (e, entry) => {
    draggedRef.current = entry;
    try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', entry.id?.$oid || entry.id); } catch (_) { /* noop */ }
  };
  const handleDragEnd = () => { draggedRef.current = null; setDragOverWeek(null); };
  const handleWeekDragOver = (e, wi) => {
    if (!draggedRef.current) return;
    e.preventDefault();
    try { e.dataTransfer.dropEffect = 'move'; } catch (_) { /* noop */ }
    setDragOverWeek(wi);
  };
  const handleWeekDrop = async (e, col) => {
    e.preventDefault();
    const entry = draggedRef.current;
    setDragOverWeek(null);
    if (!entry) return;

    // Days already taken in the target week (one article per day).
    const taken = new Set(col.entries.map((x) => dayKey(x.publishDate)));
    const entryKey = entry.publishDate && isValidDate(entry.publishDate) ? dayKey(entry.publishDate) : null;
    if (entryKey) taken.delete(entryKey); // moving within the week frees its own day

    let target = null;
    for (let i = 0; i < 7; i++) {
      const d = addDays(col.start, i);
      if (isPast(d) && !sameDay(d, new Date())) continue;
      if (isFrosted(d)) continue;
      if (taken.has(dayKey(d))) continue;
      target = d;
      break;
    }
    if (!target) {
      const frostedWeek = isFrosted(col.start);
      toast?.(frostedWeek
        ? 'That week is past your trial preview. Upgrade to schedule that far out.'
        : isPast(addDays(col.end, -1))
          ? 'That week is in the past. Pick a future week.'
          : 'That week is full. Pick another week.');
      draggedRef.current = null;
      return;
    }
    if (entry.publishDate && sameDay(entry.publishDate, target)) { draggedRef.current = null; return; }

    const id = entry.id?.$oid || entry.id;
    // Preserve the entry's time-of-day; just move the calendar day.
    const src = entry.publishDate && isValidDate(entry.publishDate) ? new Date(entry.publishDate) : new Date();
    const next = startOfDay(target);
    next.setHours(src.getHours() || 9, src.getMinutes() || 0, 0, 0);
    await onReschedule(id, next.toISOString());
    draggedRef.current = null;
  };

  const rangeLabel = `${fmtShort(pageStart)} - ${fmtShort(addDays(pageEnd, -1))}`;

  return (
    <div>
      {/* Board controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            disabled={page === 0}
            className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous weeks"
            title="Previous 3 weeks (left arrow key)"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={goToday}
            disabled={page === 0}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Today
          </button>
          <button
            onClick={goForward}
            className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
            aria-label="Next weeks"
            title="Next 3 weeks (right arrow key)"
          >
            <ChevronRight size={16} />
          </button>
          <span className="ml-1 text-sm font-medium text-slate-600">{rangeLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          {publishedLastWeek > 0 && page === 0 && (
            <span className="text-xs text-slate-500" data-testid="published-last-week">
              Published last week: {publishedLastWeek}
            </span>
          )}
          {onAddTopics && (
            <button
              onClick={onAddTopics}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              data-testid="add-topics-button"
            >
              <Plus size={15} /> Add topics
            </button>
          )}
        </div>
      </div>

      {/* Plan-build walkthrough (staged "why") while a build is in flight. */}
      {generatingPlan && <PlanBuildWalkthrough cadence={cadence} weeks={planWeeks} gscConnected={gscConnected} />}

      {/* "Why this plan" strip once a build lands: narrates the full guard
          outcome (scheduled new / became refreshes / weeks of runway). */}
      {showWhy && !generatingPlan && (
        <WhyThisPlan
          site={site}
          entries={entries}
          summary={planSummary}
          runway={runway}
          cadence={cadence}
          projection={projection || planSummary?.projection || null}
          onDismiss={() => setShowWhy(false)}
          onGoToKeywords={onGoToKeywords}
        />
      )}

      {/* Hero prompt when there is nothing scheduled ahead (hidden while building) */}
      {!loading && !hasFuture && !generatingPlan && (
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
            <Sparkles className="h-6 w-6 text-slate-700" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Let Blawgy plan your next month</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            We will pull your best keyword opportunities and fill your calendar with a steady stream of posts. You can move, swap, or remove anything.
          </p>
          <button
            onClick={onGeneratePlan}
            disabled={generatingPlan}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {generatingPlan ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {generatingPlan ? 'Building your plan...' : 'Plan my next month'}
          </button>
          {onAddTopics && (
            <p className="mt-2 text-xs text-slate-500">
              or{' '}
              <button
                onClick={onAddTopics}
                className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
              >
                pick the topics yourself
              </button>
            </p>
          )}
        </div>
      )}

      {/* Overdue tray: past-week entries that never published. Drag one onto a
          week to reschedule it, or use its card actions (write now / retry). */}
      {overdue.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3" data-testid="overdue-tray">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
            <Clock size={13} /> Overdue ({overdue.length})
          </p>
          <p className="mb-2 text-xs text-amber-700/80">
            These were scheduled in past weeks and have not published. Write them now or drag them onto a future week.
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {overdue.map((e) => (
              <div key={e.id?.$oid || e.id} className="w-60 flex-shrink-0">
                <PlanCard
                  entry={e}
                  onOpen={setDrawerEntry}
                  onGenerate={onGenerate}
                  onPreview={onPreview}
                  onPublish={onPublish}
                  onEdit={onEdit}
                  onRemove={onRemove}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unscheduled tray */}
      {unscheduled.length > 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <CalendarDays size={13} /> Unscheduled ({unscheduled.length})
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {unscheduled.map((e) => (
              <div key={e.id?.$oid || e.id} className="w-60 flex-shrink-0">
                <PlanCard
                  entry={e}
                  onOpen={setDrawerEntry}
                  onGenerate={onGenerate}
                  onPreview={onPreview}
                  onPublish={onPublish}
                  onEdit={onEdit}
                  onRemove={onRemove}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Board-level autopilot line: sets the expectation that nothing here is a
          to-do. Shown whenever there is something scheduled ahead. */}
      {hasFuture && !generatingPlan && (
        <p className="mb-3 text-xs text-slate-500" data-testid="autopilot-line">
          Articles write and publish themselves on their dates. New topics are added for you every week. You can jump ahead anytime.
        </p>
      )}

      {/* Trial frosting boundary strip: explains what the frost is and what is
          waiting behind it. */}
      {visibleUntil && frostedCount > 0 && (
        <div
          className="mb-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600"
          data-testid="trial-frost-boundary"
        >
          <div className="min-w-0">
            Your trial shows your plan through {visibleUntil.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.{' '}
            {frostedCount} more article{frostedCount === 1 ? ' is' : 's are'} already planned.{' '}
            <button
              onClick={() => onUpgrade && onUpgrade()}
              className="font-semibold text-primary hover:text-primary-hover underline"
            >
              Upgrade to unlock them.
            </button>
          </div>
        </div>
      )}

      {/* Week-column board: 3 columns per page, slid in on paging. Keyed by
          `page` so each page mounts fresh and animates. */}
      <div
        key={page}
        className={`grid grid-cols-1 gap-3 md:grid-cols-3 ${slideDir === 'fwd' ? 'plan-page-fwd' : 'plan-page-back'}`}
        data-testid="plan-board"
      >
        {weekColumns.map((col, wi) => {
          const isThisWeek = sameDay(col.start, baseWeek);
          const isDragOver = dragOverWeek === wi;
          return (
            <div
              key={dayKey(col.start)}
              onDragOver={(e) => handleWeekDragOver(e, wi)}
              onDrop={(e) => handleWeekDrop(e, col)}
              onDragLeave={() => setDragOverWeek((cur) => (cur === wi ? null : cur))}
              className={`flex min-h-[10rem] flex-col rounded-xl border bg-white transition-colors ${
                isDragOver ? 'border-dashed border-slate-400 bg-slate-50' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-900">
                  {fmtShort(col.start)} - {fmtShort(addDays(col.end, -1))}
                </p>
                {isThisWeek && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-white">This week</span>
                )}
              </div>
              <div className="flex-1 space-y-2 p-2">
                {col.entries.map((e) => (
                  <PlanCard
                    key={e.id?.$oid || e.id}
                    entry={e}
                    frosted={isFrosted(e.publishDate) && e.blogStatus !== 'published'}
                    onOpen={setDrawerEntry}
                    onGenerate={onGenerate}
                    onPreview={onPreview}
                    onPublish={onPublish}
                    onEdit={onEdit}
                    onRemove={onRemove}
                    onUpgrade={onUpgrade}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))}
                {col.entries.length === 0 && (
                  <p className="px-1 py-3 text-center text-[11px] text-slate-300">
                    Nothing scheduled this week
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail drawer. drawerEntry is a click-time snapshot; derive the LIVE
          entry from `entries` by id so the drawer reflects status changes (e.g.
          after "Write now" flips it to in_queue) instead of staying "Scheduled"
          with a live Generate button. Fall back to the snapshot for entries that
          have since left the list. */}
      {drawerEntry && (() => {
        const drawerId = drawerEntry.id?.$oid || drawerEntry.id;
        const live = (entries || []).find((e) => (e.id?.$oid || e.id) === drawerId);
        const shown = live || drawerEntry;
        return (
        <PlanDrawer
          entry={shown}
          site={site}
          suggestions={suggestions}
          onClose={() => setDrawerEntry(null)}
          onGenerate={onGenerate}
          onPreview={onPreview}
          onPublish={onPublish}
          onPatched={(id, patch) => { onPatched(id, patch); setDrawerEntry((cur) => (cur && (cur.id?.$oid || cur.id) === id ? { ...cur, ...patch } : cur)); }}
          onDeleted={(id) => { onDeleted(id); setDrawerEntry(null); }}
          // Don't close the drawer here: a blocked swap ("you already rank for
          // this") needs to stay open and show the owner message inline in the
          // picker. The drawer resolves onSwapTopic's return, closes itself only
          // on a successful swap.
          onSwapTopic={onSwapTopic}
          toast={toast}
        />
        );
      })()}
    </div>
  );
};

export default PlanCalendar;
