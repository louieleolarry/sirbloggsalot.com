import React, { useState, useEffect, useCallback } from 'react';
import {
  XIcon, Trash2Icon, LoaderIcon, CheckIcon, Wand2Icon, EyeIcon,
  Send, RefreshCwIcon, CalendarIcon
} from 'lucide-react';
import apiClient from '../../utils/apiClient';
import { formatDate } from '../../utils/dateFormatter';
import { useBodyScrollLock, useHideIntercomLauncher } from '../../components/Modals';
import { sourceMeta } from './PlanCard';

const STATUS_TEXT = {
  scheduled: 'Scheduled',
  in_queue: 'In queue',
  generating: 'Writing now',
  generated: 'Written, ready to review',
  generated_by_api: 'Written, ready to review',
  cms_draft: 'Draft on your site',
  publishing: 'Publishing',
  published: 'Published',
  failed: 'Failed',
};

// Plain-English difficulty from a 0-100 keyword-difficulty score, with the raw
// number in parens so power users still see it. "-" only for truly missing data.
function difficultyLabel(kd) {
  if (kd == null || !(kd > 0)) return '-';
  const band = kd <= 20 ? 'Easy' : kd <= 45 ? 'Moderate' : 'Hard';
  return `${band} (${kd}/100)`;
}

/**
 * Right slide-over detail drawer for a plan entry. Owns its own scroll and Esc /
 * backdrop close (does not use the shared modal). Provides: keyword metrics,
 * edit-title, a swap-topic picker fed by the plan suggestions + best-bet
 * research clusters, generate/preview/publish, and delete.
 */
const PlanDrawer = ({
  entry,
  site,
  suggestions = [],
  onClose,
  onGenerate,
  onPreview,
  onPublish,
  onPatched,   // (id, patch) => optimistic parent update
  onDeleted,   // (id) => remove from parent
  onSwapTopic, // (entry, { keyword, title }) => patches keyword+title
  toast,
}) => {
  const [title, setTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [clusters, setClusters] = useState([]);
  const [clustersLoading, setClustersLoading] = useState(false);
  // Inline "you already rank for this" message shown in the swap picker when a
  // swap is blocked by the intent guard. { ownerTitle, ownerUrl, message } | null
  const [swapBlocked, setSwapBlocked] = useState(null);
  const [swapping, setSwapping] = useState(false);

  useEffect(() => {
    setTitle(entry?.title || '');
    setShowSwap(false);
    setConfirmDelete(false);
    setSwapBlocked(null);
  }, [entry]);

  // Lock the page behind the drawer so scrolling stays inside the panel, and
  // clear the Intercom launcher off the footer buttons while we own the corner.
  useBodyScrollLock(!!entry);
  useHideIntercomLauncher(!!entry);

  // Esc closes.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Lazy-load best-bet clusters when the swap picker opens.
  const loadClusters = useCallback(async () => {
    if (clusters.length || clustersLoading) return;
    setClustersLoading(true);
    try {
      const res = await apiClient.get(`/api/keyword-research/${site}/clusters`);
      const raw = res.data?.clusters || [];
      const flat = [];
      raw.forEach((c) => {
        // Skip anything the site already covers (annotated server-side): a
        // covered option is a guaranteed "we won't write a duplicate" dead end.
        if (c.covered) return;
        (c.keywords || []).filter((kw) => kw && !kw.covered).slice(0, 6).forEach((kw) => {
          const keyword = kw.kw || kw.keyword;
          if (keyword) flat.push({ keyword, volume: kw.volume ?? kw.searchVolume ?? 0, kd: kw.kd ?? kw.difficulty ?? 0, intent: kw.intent || null, clusterLabel: c.label });
        });
      });
      setClusters(flat);
    } catch (err) {
      // Degrade gracefully: suggestions still populate the picker.
      setClusters([]);
    } finally {
      setClustersLoading(false);
    }
  }, [site, clusters.length, clustersLoading]);

  useEffect(() => {
    if (showSwap) loadClusters();
  }, [showSwap, loadClusters]);

  if (!entry) return null;

  const id = entry.id?.$oid || entry.id;
  const isPublished = entry.blogStatus === 'published';
  const hasContent = !!entry.blogContent;
  const canEditTopic = !hasContent && !isPublished;
  const vol = entry.seoMetrics?.searchVolume ?? entry.searchVolume;
  const kd = entry.seoMetrics?.difficulty ?? entry.difficulty;
  const intent = entry.seoMetrics?.intent ?? entry.intent;
  const searcherIntent = entry.seoMetrics?.searcherIntent;
  const winningFormat = entry.seoMetrics?.winningFormat;
  const meta = sourceMeta(entry); // per-entry provenance (null when unknown -> omit line)

  const saveTitle = async () => {
    if (savingTitle || title === entry.title) return;
    setSavingTitle(true);
    try {
      const res = await apiClient.patch(`/api/plan/${site}/entry/${id}`, { title });
      if (res.data?.success) {
        onPatched(id, { title });
        toast('Title updated');
      } else {
        toast(res.data?.message || 'Could not update title');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Could not update title');
    } finally {
      setSavingTitle(false);
    }
  };

  const doDelete = async () => {
    if (deleting || isPublished) return;
    setDeleting(true);
    try {
      const res = await apiClient.delete(`/api/plan/${site}/entry/${id}`);
      if (res.data?.success) {
        onDeleted(id);
        toast('Removed from plan');
        onClose();
      } else {
        toast(res.data?.message || 'Could not remove');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Could not remove');
    } finally {
      setDeleting(false);
    }
  };

  // Swap the topic. onSwapTopic returns a result object so a blocked swap ("you
  // already rank for this") keeps the drawer OPEN and shows the owner message
  // inline in the picker, instead of closing the drawer to a dead-end toast. A
  // successful swap closes the drawer. Degrades gracefully if the parent handler
  // returns nothing (older contract): we just close on no-block.
  const doSwap = async (opt) => {
    if (swapping) return;
    setSwapping(true);
    setSwapBlocked(null);
    try {
      // Carry the picked option's metrics so the swapped entry shows real
      // volume/difficulty/intent instead of the old keyword's stale numbers.
      const result = await onSwapTopic(entry, {
        keyword: opt.keyword,
        title: opt.title,
        searchVolume: opt.volume,
        difficulty: opt.kd,
        intent: opt.intent,
      });
      if (result && result.blocked) {
        setSwapBlocked({
          ownerTitle: result.owner?.title || result.ownerTitle || null,
          ownerUrl: result.owner?.url || result.ownerUrl || null,
          message: result.message || null,
        });
        return;
      }
      // Success (or legacy handler that returns nothing): close the drawer.
      onClose();
    } finally {
      setSwapping(false);
    }
  };

  // Combine plan suggestions + research clusters into one picker list, deduped.
  const swapOptions = [];
  const seen = new Set();
  suggestions.forEach((s) => {
    const key = (s.keyword || '').toLowerCase();
    if (key && !seen.has(key)) { seen.add(key); swapOptions.push({ keyword: s.keyword, title: s.title, volume: s.searchVolume, kd: s.difficulty, intent: s.intent || null, from: 'Suggested' }); }
  });
  clusters.forEach((c) => {
    const key = (c.keyword || '').toLowerCase();
    if (key && !seen.has(key)) { seen.add(key); swapOptions.push({ keyword: c.keyword, title: null, volume: c.volume, kd: c.kd, intent: c.intent || null, from: c.clusterLabel || 'Research' }); }
  });

  return (
    <div className="fixed inset-0 z-[60]" data-testid="plan-drawer">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* Panel */}
      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Plan entry</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-700">
              {STATUS_TEXT[entry.blogStatus] || 'Scheduled'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
            <XIcon size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Title */}
          <label className="text-xs font-medium text-gray-500">Title</label>
          {canEditTopic ? (
            <div className="mt-1.5 flex items-center gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Article title"
              />
              {savingTitle
                ? <LoaderIcon size={16} className="animate-spin text-gray-400" />
                : title !== entry.title && <CheckIcon size={16} className="text-slate-700" />}
            </div>
          ) : (
            <>
              <p className="mt-1.5 text-sm font-medium text-gray-800">{entry.title || entry.keyword}</p>
              {hasContent && !isPublished && (
                <p className="mt-1 text-xs text-gray-400">Topic is locked because the article is already written.</p>
              )}
            </>
          )}

          {/* Keyword + metrics. Each cell carries a plain-English caption/tooltip
              so the grid teaches instead of just showing raw numbers. Genuine
              zero volume reads "New/low data" (a real signal), not "-" (missing). */}
          <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-500">Target keyword</p>
            <p className="mt-1 text-sm font-medium text-gray-800">{entry.keyword || entry.seoMetrics?.targetKeyword || '-'}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-white p-2" title="How many people search this every month">
                <p className="text-[10px] uppercase text-gray-400">Searches/mo</p>
                <p className="text-sm font-semibold text-gray-800 tabular-nums">
                  {vol != null && vol > 0 ? Number(vol).toLocaleString() : (vol === 0 ? 'New/low data' : '-')}
                </p>
              </div>
              <div className="rounded-md bg-white p-2" title="How hard it is to rank, 0 to 100. Lower is easier.">
                <p className="text-[10px] uppercase text-gray-400">How hard</p>
                <p className="text-sm font-semibold text-gray-800">
                  {difficultyLabel(kd)}
                </p>
              </div>
              <div className="rounded-md bg-white p-2" title="What the searcher wants: to buy, to learn, or to find a site">
                <p className="text-[10px] uppercase text-gray-400">Intent</p>
                <p className="text-sm font-semibold capitalize text-gray-800">{intent || '-'}</p>
              </div>
            </div>
          </div>

          {/* Why this article: plain-English factors + the honest aim + rough
              traffic upside. All computed server-side at read time from the
              entry's own metrics; anything missing is simply omitted. */}
          {(entry.why?.factors?.length > 0 || entry.why?.aim || entry.upside) && (
            <div className="mt-4" data-testid="plan-drawer-why">
              <p className="text-xs font-medium text-gray-500">Why this article</p>
              {entry.why?.factors?.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {entry.why.factors.map((factor, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-slate-400" />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              )}
              {entry.why?.aim && (
                <p className="mt-2 text-xs font-semibold text-slate-900">{entry.why.aim}</p>
              )}
              {entry.upside && (
                <p className="mt-2 text-sm text-slate-600" data-testid="plan-drawer-upside">
                  Potential: roughly {Number(entry.upside.low).toLocaleString()} to {Number(entry.upside.high).toLocaleString()} visits every month once it ranks{' '}
                  <span className="text-xs text-slate-400">(rough estimate)</span>
                </p>
              )}
            </div>
          )}

          {/* Searcher intent + winning format: plain-English SERP context pulled
              from the entry's own seoMetrics. Each line renders only when its
              field is present, so a bare seoMetrics (or none at all) shows
              nothing rather than an empty container. */}
          {typeof searcherIntent === 'string' && searcherIntent.trim() !== '' && (
            <p className="mt-4 text-sm text-slate-600" data-testid="searcher-intent">
              What the searcher wants: {searcherIntent}
            </p>
          )}
          {winningFormat && (
            <p className="mt-1.5 text-[11px] text-slate-400" data-testid="winning-format">
              Ranking pages are mostly: {winningFormat}
            </p>
          )}
          {intent === 'tool' && (
            <p
              className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700"
              data-testid="tool-intent-note"
            >
              Searchers for this query want an interactive tool. An article can rank, but a calculator or checker would fit better.
            </p>
          )}

          {/* Provenance: plain-English "where did this keyword come from?" */}
          {meta && (
            <div className="mt-4 flex items-start gap-2 text-sm text-slate-600" data-testid="plan-drawer-provenance">
              <meta.Icon size={15} className="mt-0.5 flex-shrink-0 text-slate-400" />
              <span>{meta.sentence(entry)}</span>
            </div>
          )}

          {/* Scheduled date */}
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <CalendarIcon size={15} className="text-slate-400" />
            <span>{formatDate(entry.publishDate)}</span>
          </div>

          {/* Swap topic */}
          {canEditTopic && (
            <div className="mt-5">
              <button
                onClick={() => setShowSwap((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <span className="flex items-center gap-2"><RefreshCwIcon size={15} /> Swap topic</span>
                <span className="text-xs text-gray-400">{showSwap ? 'Hide' : 'Browse'}</span>
              </button>
              {showSwap && (
                <div className="mt-2">
                  {swapBlocked && (
                    <div
                      className="mb-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-900"
                      data-testid="swap-blocked-notice"
                    >
                      <p className="font-medium">
                        You already rank for this
                        {swapBlocked.ownerTitle ? ` with "${swapBlocked.ownerTitle}"` : ''}. We won't write a duplicate.
                      </p>
                      {swapBlocked.ownerUrl && (
                        <a
                          href={swapBlocked.ownerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block font-medium text-emerald-800 underline hover:text-emerald-900"
                        >
                          View the post
                        </a>
                      )}
                    </div>
                  )}
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200">
                    {clustersLoading && swapOptions.length === 0 && (
                      <div className="flex items-center justify-center py-6 text-sm text-gray-400">
                        <LoaderIcon size={16} className="mr-2 animate-spin" /> Loading topics
                      </div>
                    )}
                    {swapOptions.length === 0 && !clustersLoading && (
                      <p className="px-3 py-6 text-center text-sm text-gray-400">No alternative topics available yet.</p>
                    )}
                    {swapOptions.map((opt, i) => (
                      <button
                        key={`${opt.keyword}-${i}`}
                        onClick={() => doSwap(opt)}
                        disabled={swapping}
                        className="flex w-full items-start justify-between gap-2 border-b border-gray-100 px-3 py-2 text-left last:border-0 hover:bg-slate-50 disabled:opacity-60"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-gray-800">{opt.title || opt.keyword}</p>
                          <p className="mt-0.5 truncate text-[11px] text-gray-400">
                            {opt.from}{opt.volume ? ` · ${Number(opt.volume).toLocaleString()} searches/mo` : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 border-t border-gray-200 px-5 py-4">
          {entry.blogStatus === 'cms_draft' ? (
            <button onClick={() => onPublish(entry)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover">
              <Send size={16} /> Publish now
            </button>
          ) : hasContent ? (
            <button onClick={() => onPreview(entry)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover">
              <EyeIcon size={16} /> Preview
            </button>
          ) : !isPublished ? (
            <button onClick={() => onGenerate(entry)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover">
              <Wand2Icon size={16} /> Generate now
            </button>
          ) : (
            <button onClick={() => onPreview(entry)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover">
              <EyeIcon size={16} /> View live
            </button>
          )}
          {!isPublished && (
            confirmDelete ? (
              <div className="flex items-center gap-2" data-testid="delete-confirm">
                <span className="text-xs text-slate-600">Remove this article? It can't be undone.</span>
                <button
                  onClick={doDelete}
                  disabled={deleting}
                  className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {deleting ? <LoaderIcon size={14} className="animate-spin" /> : 'Remove'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={deleting}
                className="flex items-center justify-center rounded-lg border border-gray-300 px-3 py-2.5 text-gray-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                aria-label="Delete entry"
              >
                <Trash2Icon size={16} />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanDrawer;
