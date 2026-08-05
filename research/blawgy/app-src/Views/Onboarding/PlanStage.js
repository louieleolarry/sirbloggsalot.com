import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Calendar, ArrowRight, Sparkles } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import {
  Screen,
  StatusRows,
  ElapsedCounter,
  useElapsed,
  PrimaryButton,
  SoftNote,
  PayoffStat
} from './Primitives';

/*
 * The onboarding ending (Phase B, spec §Onboarding "Ending").
 *
 * After SUBSCRIBE completes we DO NOT hard-cut to the dashboard. Instead the
 * user lands here on a staged "Your plan is being prepared" page that:
 *   1. fires POST /api/plan/:site/generate (idempotent per horizon window),
 *   2. polls GET /api/plan/:site every 3s with a decoupled 1s elapsed tick,
 *   3. reveals staged copy ("Scoring your topics… / Scheduling 6 weeks… /
 *      Writing titles…") as entries materialize,
 *   4. renders a compact read-only first-2-weeks preview (date + title +
 *      keyword, grouped by week — its OWN small component, NOT the Dashboard
 *      calendar), then a single CTA "Open your content plan" → /dashboard.
 *
 * Degradation: if the plan API 404s (Phase A not merged yet) we fall back to
 * the keyword quick-pass reveal the user already saw plus a "Your plan will
 * appear on your calendar shortly" note. Signup is NEVER blocked by this
 * stage — every failure path ends with a working "Open your content plan"
 * button.
 *
 * Idempotent staged finish: the parent owns a small `planProgress` snapshot
 * (persisted to localStorage) with done-flags so a refresh mid-prepare
 * resumes the poll instead of restarting generation.
 */

const POLL_MS = 3000;
const READY_TARGET_ENTRIES = 3; // enough dated entries to show a real preview
const MAX_POLL_MS = 90000; // stop hammering after 90s; show whatever we have

// The staged reveal copy. We advance through these as elapsed time and entry
// counts grow so the page always feels like it's doing something specific.
const STAGES = [
  { key: 'scoring', label: 'Scoring your topics' },
  { key: 'scheduling', label: 'Scheduling the next 6 weeks' },
  { key: 'titles', label: 'Writing your titles' },
  { key: 'finishing', label: 'Putting your plan together' }
];

// ---- entry field normalizers -------------------------------------------------
// Plan entries come "from blogs[] with dates+status" (spec). Field names vary
// across the blogs pipeline, so read defensively.
const entryDate = (e) =>
  e?.publishDate || e?.scheduledDate || e?.date || e?.scheduledFor || null;
const entryTitle = (e) =>
  e?.title || e?.postTitle || e?.headline || '';
const entryKeyword = (e) =>
  e?.keyword ||
  e?.primaryKeyword ||
  e?.targetKeyword ||
  e?.seoMetrics?.keyword ||
  '';

const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const fmtDay = (d) =>
  d ? d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : '';

// Group the first N dated entries into week buckets (Mon-anchored) so the
// preview reads "Week 1 / Week 2". Undated entries are dropped from the
// preview (they still exist in the real plan).
const groupFirstTwoWeeks = (entries) => {
  const dated = (entries || [])
    .map((e) => ({ e, d: parseDate(entryDate(e)) }))
    .filter((x) => x.d)
    .sort((a, b) => a.d - b.d);
  if (dated.length === 0) return [];

  const first = dated[0].d;
  const startOfWeek = (d) => {
    const c = new Date(d);
    const day = (c.getDay() + 6) % 7; // Mon = 0
    c.setDate(c.getDate() - day);
    c.setHours(0, 0, 0, 0);
    return c;
  };
  const week0 = startOfWeek(first);
  const weeks = [[], []];
  for (const { e, d } of dated) {
    const diffWeeks = Math.floor((startOfWeek(d) - week0) / (7 * 24 * 60 * 60 * 1000));
    if (diffWeeks <= 0) weeks[0].push({ e, d });
    else if (diffWeeks === 1) weeks[1].push({ e, d });
    // beyond week 2 is intentionally not shown in the onboarding preview
  }
  return weeks
    .map((rows, i) => ({ week: i + 1, rows }))
    .filter((w) => w.rows.length > 0);
};

// A compact read-only plan row. Deliberately tiny + self-contained: date pill,
// title, keyword. No drag, no status morphing — that's the Dashboard's job.
const PlanRow = ({ date, title, keyword }) => (
  <div className="flex items-start gap-3 py-2.5" data-testid="plan-preview-row">
    <div className="flex-shrink-0 w-[92px] text-xs font-medium text-gray-500 tabular-nums pt-0.5">
      {fmtDay(date)}
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-sm font-medium text-gray-900 leading-snug">
        {title || keyword || 'Untitled post'}
      </div>
      {keyword && title && (
        <div className="mt-0.5 text-xs text-gray-400 truncate">{keyword}</div>
      )}
    </div>
  </div>
);

const KeywordTasteRow = ({ cluster }) => {
  const kws = (cluster.keywords || []).slice(0, 3);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3" data-testid="plan-keyword-taste">
      <div className="text-sm font-medium text-gray-900">{cluster.label || cluster.pillarKeyword}</div>
      {kws.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {kws.map((k, j) => (
            <span key={j} className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600">
              {k.kw || k.keyword}
              {k.volume ? (
                <span className="font-medium text-emerald-600 tabular-nums">
                  {k.volume >= 1000 ? `${(k.volume / 1000).toFixed(1)}K` : k.volume}/mo
                </span>
              ) : null}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const PlanStage = ({ site, keywordPreview, progress, onProgress, onOpenPlan }) => {
  // `progress` is the persisted snapshot from the parent. We treat it as the
  // resume point and mirror local phase state off it.
  const [phase, setPhase] = useState(() => progress?.phase || 'preparing'); // preparing | ready | degraded
  const [entries, setEntries] = useState(() => progress?.entries || []);
  const [note, setNote] = useState(null); // soft-fail amber note
  const elapsed = useElapsed(phase === 'preparing');

  const generateFiredRef = useRef(!!progress?.generateFired);
  const stoppedRef = useRef(false);
  const pollTimerRef = useRef(null);
  const startAtRef = useRef(progress?.startAt || Date.now());

  // Persist snapshot upward whenever the meaningful bits change so a refresh
  // resumes here (done-flags: generateFired + phase) instead of restarting.
  const pushProgress = useCallback(
    (patch) => {
      onProgress?.({
        phase,
        entries,
        generateFired: generateFiredRef.current,
        startAt: startAtRef.current,
        ...patch
      });
    },
    [onProgress, phase, entries]
  );

  const finish = useCallback(
    (nextPhase, nextEntries) => {
      if (stoppedRef.current) return;
      stoppedRef.current = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      setPhase(nextPhase);
      if (nextEntries) setEntries(nextEntries);
      onProgress?.({
        phase: nextPhase,
        entries: nextEntries || entries,
        generateFired: generateFiredRef.current,
        startAt: startAtRef.current
      });
    },
    [entries, onProgress]
  );

  useEffect(() => {
    // Already resolved on a prior mount → don't re-run the pipeline.
    if (phase === 'ready' || phase === 'degraded') {
      stoppedRef.current = true;
      return undefined;
    }
    stoppedRef.current = false;

    const poll = async () => {
      if (stoppedRef.current) return;
      try {
        const res = await apiClient.get(`/api/plan/${encodeURIComponent(site)}`);
        const planEntries = res.data?.entries || res.data?.plan?.entries || [];
        const dated = planEntries.filter((e) => entryDate(e));
        setEntries(planEntries);
        pushProgress({ entries: planEntries });

        const enough = dated.length >= READY_TARGET_ENTRIES;
        const timedOut = Date.now() - startAtRef.current > MAX_POLL_MS;
        if (enough || (timedOut && dated.length > 0)) {
          finish('ready', planEntries);
          return;
        }
        if (timedOut) {
          // Generation ran but produced nothing datable in time. Don't block —
          // degrade to the "appear on your calendar shortly" ending.
          setNote("Your plan is still being built, usually within 10 minutes. Refresh your calendar, or it'll be there next time you log in.");
          finish('degraded');
          return;
        }
      } catch (err) {
        const status = err?.response?.status;
        if (status === 404) {
          // Phase A not merged: the plan API doesn't exist. Fall back to the
          // keyword reveal + calendar note. Never block signup.
          finish('degraded');
          return;
        }
        // Transient error — keep polling until the timeout budget runs out.
        if (Date.now() - startAtRef.current > MAX_POLL_MS) {
          setNote("We could not reach the plan builder just now. Your plan will land on your calendar, usually within 10 minutes. Refresh your calendar, or it'll be there next time you log in.");
          finish('degraded');
          return;
        }
      }
      if (!stoppedRef.current) {
        pollTimerRef.current = setTimeout(poll, POLL_MS);
      }
    };

    const kickoff = async () => {
      if (!generateFiredRef.current) {
        generateFiredRef.current = true;
        pushProgress({ generateFired: true });
        try {
          await apiClient.post(`/api/plan/${encodeURIComponent(site)}/generate`, { horizonWeeks: 6 });
        } catch (err) {
          const status = err?.response?.status;
          if (status === 404) {
            finish('degraded');
            return;
          }
          // Non-404 generate failure: still try to poll — the plan may already
          // exist from a prior run, and worst case the poll degrades cleanly.
        }
      }
      poll();
    };

    kickoff();

    return () => {
      stoppedRef.current = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
    // Run the pipeline once on mount. `site` is stable for the lifetime of the
    // stage; poll/finish close over refs so they don't need to be deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- staged reveal derivation ----------------------------------------
  // Advance the visible stage from elapsed time + how many entries have shown
  // up. Purely presentational — the real gate is the poll above.
  const datedCount = entries.filter((e) => entryDate(e)).length;
  const stageIndex = (() => {
    if (datedCount >= READY_TARGET_ENTRIES) return STAGES.length - 1;
    if (datedCount > 0) return Math.min(2, STAGES.length - 1);
    if (elapsed >= 6) return 1;
    return 0;
  })();

  const statusRows = STAGES.map((s, i) => ({
    label: s.label,
    state: i < stageIndex ? 'done' : i === stageIndex ? 'active' : 'pending'
  }));

  // ---------------- RENDER ---------------------------------------------------

  if (phase === 'preparing') {
    return (
      <Screen
        title="Your plan is being prepared"
        subtitle="We're turning everything you told us into a month of content, scheduled and ready to go."
        testId="plan-preparing"
      >
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <StatusRows rows={statusRows} />
          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>This usually takes under a minute</span>
            <ElapsedCounter seconds={elapsed} />
          </div>
        </div>
      </Screen>
    );
  }

  if (phase === 'ready') {
    const weeks = groupFirstTwoWeeks(entries);
    const totalDated = entries.filter((e) => entryDate(e)).length;
    return (
      <Screen
        title="Your content plan is ready"
        testId="plan-ready"
      >
        <div className="mb-6">
          <PayoffStat value={totalDated} label={totalDated === 1 ? 'post scheduled' : 'posts scheduled and lined up'} />
        </div>
        <div className="space-y-5">
          {weeks.map((w) => (
            <div key={w.week} className="ob-rise-sm">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Week {w.week}</span>
                <span className="h-px flex-1 bg-gray-100" />
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white px-4 divide-y divide-gray-50">
                {w.rows.map(({ e, d }, i) => (
                  <PlanRow key={i} date={d} title={entryTitle(e)} keyword={entryKeyword(e)} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <PrimaryButton onClick={onOpenPlan} testId="open-content-plan">
            <span className="inline-flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Open your content plan
              <ArrowRight className="w-4 h-4" />
            </span>
          </PrimaryButton>
          <p className="mt-3 text-center text-xs text-gray-400">
            The rest of your month is scheduled too. See it all on your calendar.
          </p>
          <p className="mt-2 text-center text-xs text-gray-500" data-testid="cms-headsup">
            One last step on your dashboard: connect your website platform (about 2 minutes) so we can publish these for you automatically.
          </p>
        </div>
      </Screen>
    );
  }

  // phase === 'degraded' — plan API unavailable or slow. Show the keyword
  // taste we already have + a calendar note, and still hand off cleanly.
  const clusters = (keywordPreview?.clusters || []).slice(0, 3);
  return (
    <Screen
      title="You're all set"
      subtitle="Your account is ready. Your content plan is being built in the background, usually within 10 minutes. Refresh your calendar, or it'll be there next time you log in."
      testId="plan-degraded"
    >
      {clusters.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            Topics we lined up for you
          </div>
          <div className="space-y-2">
            {clusters.map((cl, i) => (
              <KeywordTasteRow key={i} cluster={cl} />
            ))}
          </div>
        </div>
      )}
      {note && (
        <div className="mb-6">
          <SoftNote>{note}</SoftNote>
        </div>
      )}
      <PrimaryButton onClick={onOpenPlan} testId="open-content-plan">
        <span className="inline-flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Open your content plan
          <ArrowRight className="w-4 h-4" />
        </span>
      </PrimaryButton>
      <p className="mt-3 text-center text-xs text-gray-500" data-testid="cms-headsup">
        One last step on your dashboard: connect your website platform (about 2 minutes) so we can publish these for you automatically.
      </p>
    </Screen>
  );
};

export default PlanStage;
