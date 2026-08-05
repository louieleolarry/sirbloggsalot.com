import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight, ChevronRight, Loader2, RefreshCw, Sparkles,
} from 'lucide-react';
import apiClient from '../../utils/apiClient';
import UpdateReviewPanel from './UpdateReviewPanel';
import UpdateHistoryCard from './UpdateHistoryCard';
import { TriggerChip } from './updateShared';

/**
 * The Updates view, two segments:
 *  - Opportunities: the approval queue (proposed / generating / ready). Cards
 *    are a compact index; the whole story (evidence, analysis, the GitHub-style
 *    diff, editing, approve) lives in UpdateReviewPanel. Nothing touches a live
 *    page without an Approve click there.
 *  - History: every published update with its weekly impact readings vs the
 *    page's own pre-update baseline, the stored diff, and the one-click revert
 *    on flagged regressions. Dismissed proposals hide behind a quiet toggle.
 */

const STATUS_LABELS = {
  proposed: { label: 'Ready to start', tone: 'text-slate-500' },
  generating: { label: 'Writing...', tone: 'text-primary' },
  ready: { label: 'Ready for your review', tone: 'text-emerald-700' },
};

const QUEUE_STATUSES = ['proposed', 'generating', 'ready'];
const HISTORY_STATUSES = ['published', 'flagged', 'reverted'];
const WEEKS_PER_MONTH = 4.3;

function UpdateRow({ update, onOpen }) {
  const status = STATUS_LABELS[update.status] || { label: update.status, tone: 'text-slate-500' };
  return (
    <button
      data-testid="update-card"
      onClick={() => onOpen(update)}
      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {(update.triggers || []).map((t) => <TriggerChip key={t} trigger={t} />)}
            {update.estMonthlyClickGain > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-700">
                <ArrowUpRight size={12} /> up to ~{update.estMonthlyClickGain} clicks/mo
              </span>
            )}
          </div>
          <div className="mt-1.5 truncate text-sm font-semibold text-slate-900">
            {update.blogTitle || update.pagePath}
          </div>
          {(update.why || [])[0] && (
            <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">{update.why[0]}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${status.tone}`}>
            {update.status === 'generating' && <Loader2 size={12} className="animate-spin" />}
            {status.label}
          </span>
          <ChevronRight size={16} className="text-slate-300" />
        </div>
      </div>
    </button>
  );
}

/** "N updates published. Estimated +X clicks/mo..." Only claims what readings support. */
function HistoryRollup({ history }) {
  const published = history.filter((u) => ['published', 'flagged'].includes(u.status));
  if (!published.length && !history.length) return null;
  const measurable = published.filter(
    (u) => Number.isFinite(u.impact?.recentWeeklyClicks) && Number.isFinite(u.watch?.baseline?.avgWeeklyClicks)
  );
  const estMonthly = Math.round(
    measurable.reduce(
      (sum, u) => sum + (u.impact.recentWeeklyClicks - u.watch.baseline.avgWeeklyClicks) * WEEKS_PER_MONTH,
      0
    )
  );
  const count = published.length;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm" data-testid="history-rollup">
      <span className="font-semibold text-slate-900">
        {count} {count === 1 ? 'update' : 'updates'} published.
      </span>{' '}
      {measurable.length ? (
        <span className="text-slate-700">
          Estimated {estMonthly >= 0 ? '+' : ''}{estMonthly} clicks/mo versus their baselines so far.
        </span>
      ) : (
        <span className="text-slate-500">
          Too early to measure impact; the first verdict lands about 3 weeks after each update.
        </span>
      )}
    </div>
  );
}

const PlanUpdates = ({ site, toast }) => {
  const [updates, setUpdates] = useState(null); // null = loading
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [segment, setSegment] = useState('opportunities');
  const [showDismissed, setShowDismissed] = useState(false);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    if (!site) return;
    try {
      const res = await apiClient.get(`/api/updates/${site}`);
      setUpdates(res.data?.updates || []);
      setLoadError(false);
    } catch (err) {
      setLoadError(true);
      setUpdates((prev) => prev || []);
    }
  }, [site]);

  useEffect(() => {
    setUpdates(null);
    setSelectedId(null);
    setSegment('opportunities');
    setShowDismissed(false);
    load();
  }, [load]);

  // While anything is generating, poll so the panel flips to ready on its own.
  useEffect(() => {
    const anyGenerating = (updates || []).some((u) => u.status === 'generating');
    if (anyGenerating && !pollRef.current) {
      pollRef.current = setInterval(load, 6000);
    }
    if (!anyGenerating && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [updates, load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await apiClient.post(`/api/updates/${site}/refresh`);
      setUpdates(res.data?.updates || []);
      const created = res.data?.result?.created || 0;
      toast?.(created > 0
        ? `Found ${created} new update ${created === 1 ? 'opportunity' : 'opportunities'}.`
        : 'No new update opportunities right now. We keep checking weekly.');
    } catch (err) {
      toast?.({ message: 'Could not check for opportunities just now. Please try again.', tone: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  const mutate = async (update, action, okMessage) => {
    setBusyId(update._id);
    try {
      await apiClient.post(`/api/updates/${site}/${update._id}/${action}`, {}, { timeout: 300000 });
      await load();
      if (okMessage) toast?.(okMessage);
      if (action === 'dismiss') setSelectedId(null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
      toast?.({ message: msg, tone: 'error' });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const saveDraft = async (update, edits) => {
    setSavingDraft(true);
    try {
      await apiClient.patch(`/api/updates/${site}/${update._id}/draft`, edits);
      await load();
      toast?.('Your edits are saved. Approve when you are ready.');
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not save your edits. Please try again.';
      toast?.({ message: msg, tone: 'error' });
      return false;
    } finally {
      setSavingDraft(false);
    }
  };

  if (updates === null) {
    return (
      <div className="flex items-center gap-2 py-16 justify-center text-slate-500 text-sm">
        <Loader2 size={16} className="animate-spin" /> Loading your page updates...
      </div>
    );
  }

  const queue = updates.filter((u) => QUEUE_STATUSES.includes(u.status));
  const history = updates
    .filter((u) => HISTORY_STATUSES.includes(u.status))
    .sort((a, b) => new Date(b.publishedAt || b.updatedAt || 0) - new Date(a.publishedAt || a.updatedAt || 0));
  const dismissed = updates.filter((u) => u.status === 'dismissed');
  const flaggedCount = history.filter((u) => u.status === 'flagged').length;
  const selected = selectedId ? updates.find((u) => u._id === selectedId) : null;

  const segmentButton = (key, label, count, alert) => (
    <button
      onClick={() => setSegment(key)}
      data-testid={`segment-${key}`}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        segment === key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 text-xs font-semibold ${
        segment === key ? 'bg-white/20 text-white' : alert ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
      }`}
      >
        {count}
      </span>
    </button>
  );

  return (
    <div data-testid="plan-updates">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Updates to pages you already have</h3>
          <p className="mt-0.5 text-sm text-slate-500 max-w-2xl">
            Blawgy watches how your published pages perform on Google and proposes improvements,
            with the numbers behind each one. Open an update to see the full case, the exact
            before and after, and edit anything before it goes live.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Checking...' : 'Check for opportunities'}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 w-fit">
        {segmentButton('opportunities', 'Opportunities', queue.length, false)}
        {segmentButton('history', 'History', history.length, flaggedCount > 0)}
      </div>

      {loadError && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          We couldn't load your updates just now. Your data is safe.{' '}
          <button onClick={load} className="font-semibold underline">Retry</button>
        </div>
      )}

      {segment === 'opportunities' && (
        <div className="mt-4">
          {queue.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <Sparkles size={18} className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-700">Nothing needs an update right now.</p>
              <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                That is good news: no page is losing traffic or stuck short of page 1. We re-check
                every week as new Search Console data lands.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((u) => <UpdateRow key={u._id} update={u} onOpen={(x) => setSelectedId(x._id)} />)}
            </div>
          )}
        </div>
      )}

      {segment === 'history' && (
        <div className="mt-4 space-y-3">
          {history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <p className="text-sm font-medium text-slate-700">No published updates yet.</p>
              <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                When you approve an update, it shows up here with what changed and how the page's
                clicks and rankings moved afterward.
              </p>
            </div>
          ) : (
            <>
              <HistoryRollup history={history} />
              {history.map((u) => (
                <UpdateHistoryCard
                  key={u._id}
                  update={u}
                  busy={busyId === u._id}
                  onRevert={(x) => mutate(x, 'revert', 'The old version is back live.')}
                />
              ))}
              <p className="text-xs text-slate-400">
                Rankings move for many reasons. We compare each page against its own 4 weeks before the update.
              </p>
            </>
          )}
          {dismissed.length > 0 && (
            <div>
              <button
                onClick={() => setShowDismissed((v) => !v)}
                className="text-xs font-medium text-slate-400 hover:text-slate-600"
                data-testid="toggle-dismissed"
              >
                {showDismissed ? 'Hide' : 'Show'} dismissed ({dismissed.length})
              </button>
              {showDismissed && (
                <div className="mt-2 space-y-2">
                  {dismissed.map((u) => (
                    <div key={u._id} className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-500">
                      <span className="font-medium text-slate-600">{u.blogTitle || u.pagePath}</span>
                      {' '}was dismissed{u.dismissedAt ? ` on ${new Date(u.dismissedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}.
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selected && (
        <UpdateReviewPanel
          update={selected}
          busy={busyId === selected._id}
          savingDraft={savingDraft}
          onClose={() => setSelectedId(null)}
          onGenerate={(u) => mutate(u, 'generate')}
          onApprove={(u) => mutate(u, 'approve', 'Published. We watch its results for the next 4 weeks.')}
          onDismiss={(u) => mutate(u, 'dismiss')}
          onRevert={(u) => mutate(u, 'revert', 'The old version is back live.')}
          onSaveDraft={saveDraft}
        />
      )}
    </div>
  );
};

export default PlanUpdates;
