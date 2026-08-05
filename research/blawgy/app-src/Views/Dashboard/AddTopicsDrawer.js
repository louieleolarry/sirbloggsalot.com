import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Loader2, Check, Sparkles, ChevronRight, Ban, RotateCcw } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import { cachedFetch, getCached, invalidate } from '../../utils/apiCache';
import { watchTopicAdd } from '../../utils/topicAddOutcomes';
import InfoTip from '../../components/InfoTip';
import { useHideIntercomLauncher } from '../../components/Modals';

// Compact volume formatting, matching the Keywords page.
const formatVolume = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}K`;
  return String(v);
};

/**
 * Where the post/page that already covers a topic lives, so "already covered"
 * is a place the user can go instead of dead copy. The guard hands us either a
 * Blawgy post (open it in the preview route) or a pre-existing ranking page
 * (open the page itself). Anything else has nowhere to point.
 */
const ownerLink = (owner, site) => {
  if (!owner || typeof owner !== 'object') return null;
  if (owner.kind === 'blawgy-post' && owner.blogId) {
    return { href: `/preview/${site}/${owner.blogId}`, label: owner.title || 'your existing post' };
  }
  if (owner.kind === 'existing-page' && owner.page) {
    let label = owner.title;
    if (!label) {
      try { label = new URL(owner.page).pathname || owner.page; } catch (e) { label = owner.page; }
    }
    return { href: owner.page, label };
  }
  return null;
};

// "You already rank for this with <link>." — or nothing at all when the guard
// gave us no owner to point at (better silence than copy the user can't act on).
const CoveredLine = ({ site, owner, fallback }) => {
  const link = ownerLink(owner, site);
  if (!link) {
    return fallback ? <p className="mt-1 text-xs text-slate-500">{fallback}</p> : null;
  }
  return (
    <p className="mt-1 text-xs text-slate-500">
      You already rank for this with{' '}
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
        data-testid="add-topic-covered-owner"
      >
        {link.label}
      </a>
      . Refreshing that will beat a second page competing with it.
    </p>
  );
};

// One plain-English WHY line per topic, mirrored from the Keywords page.
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

/**
 * "Add topics" drawer over the Content Plan. The lean keyword picker for
 * plan-first users: the best research topics with one-click add, so filling
 * the calendar never requires the page-hop to the Keywords page. Reads the
 * same cached clusters the Keywords page uses (`kwclusters:<site>`) and posts
 * the same plan-add payload, so the two surfaces can never disagree.
 */
const AddTopicsDrawer = ({ site, open, onClose, onAdded, toast }) => {
  const navigate = useNavigate();
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // Research is running right now (first run, or the background deep pass that
  // refines a quick-only result). Drives the honest "cooking" states below.
  const [processing, setProcessing] = useState(false);
  const [addingKey, setAddingKey] = useState(null);
  // { [label]: { status: 'added'|'expanding'|'covered'|'failed'|'slow', publishDate, count, message } }
  const [outcomes, setOutcomes] = useState({});
  // Topics settled on a PAST visit (already added/covered into the plan, or
  // dismissed): hidden from the list. This-visit outcomes stay visible so an
  // add always shows its confirmation. null (fetch pending/failed) = no filter.
  const [settled, setSettled] = useState(null); // { added: Set, hidden: Set }
  // Optimistic overrides for hard-prune exclusions this visit: key -> true
  // (excluded) | false (restored). Falls back to the server's cluster.excluded
  // flag (annotated by the clusters GET) when a key is absent.
  const [excludeOverrides, setExcludeOverrides] = useState({});
  // label -> cancel() for the shared outcome watcher of a background add.
  const outcomeWatchesRef = useRef({});

  const stopOutcomePolls = useCallback(() => {
    Object.values(outcomeWatchesRef.current).forEach((cancel) => cancel());
    outcomeWatchesRef.current = {};
  }, []);

  // A slow topic add ACKs (expanding: true) and finishes on the backend; the
  // shared watcher polls the recorded outcome until it lands, then flips the
  // row truthfully. Times out to a soft "still working" state instead of
  // spinning forever.
  const pollOutcome = useCallback((key, startedAt) => {
    outcomeWatchesRef.current[key] = watchTopicAdd({
      site,
      label: key,
      startedAt,
      onOutcome: (outcome) => {
        delete outcomeWatchesRef.current[key];
        if (outcome.status === 'added') {
          setOutcomes((prev) => ({ ...prev, [key]: { status: 'added', count: outcome.count } }));
          onAdded && onAdded();
        } else if (outcome.status === 'slow') {
          setOutcomes((prev) => ({ ...prev, [key]: { status: 'slow' } }));
          onAdded && onAdded();
        } else {
          // covered / failed. For covered, carry the owner (first of the bounded
          // owners the backend recorded) so the async path renders the same
          // CoveredLine link the synchronous path does, not dead text.
          setOutcomes((prev) => ({
            ...prev,
            [key]: {
              status: outcome.status,
              message: outcome.message,
              ...(outcome.owners ? { owner: outcome.owners[0]?.owner || null } : {}),
            },
          }));
        }
      },
    });
  }, [site, onAdded]);

  const fetchClusters = useCallback(async () => {
    if (!site) return;
    const key = `kwclusters:${site}`;
    const hadCache = getCached(key) !== undefined;
    if (!hadCache) setLoading(true);
    setLoadError(false);
    try {
      const data = await cachedFetch(
        key,
        () => apiClient.get(`/api/keyword-research/${site}/clusters`).then((r) => r.data || {}),
        { ttlMs: 60_000, staleMs: 600_000 }
      );
      setClusters(Array.isArray(data?.clusters) ? data.clusters : []);
      setProcessing(Boolean(data?.processing));
    } catch (err) {
      console.error('AddTopicsDrawer clusters fetch failed:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [site]);

  // Settled topics for filtering. Best-effort: any failure just means no filter.
  const fetchSettled = useCallback(async () => {
    if (!site) return;
    try {
      const resp = await apiClient.get(`/api/plan/${site}/topic-adds`);
      if (!resp.data?.success) return;
      const results = resp.data.results || {};
      const added = new Set(
        Object.entries(results)
          .filter(([, r]) => r?.status === 'added' || r?.status === 'covered')
          .map(([label]) => label)
      );
      const hidden = new Set(Array.isArray(resp.data.hiddenTopics) ? resp.data.hiddenTopics : []);
      setSettled({ added, hidden });
    } catch (err) {
      // Leave settled null.
    }
  }, [site]);

  useEffect(() => {
    if (open) {
      fetchClusters();
      fetchSettled();
    }
  }, [open, fetchClusters, fetchSettled]);

  // Reset per-visit outcomes when the drawer opens for a (possibly new) site;
  // stop any pending outcome polls when it closes or unmounts.
  useEffect(() => {
    if (open) { setOutcomes({}); setSettled(null); setExcludeOverrides({}); }
    else stopOutcomePolls();
  }, [open, site, stopOutcomePolls]);
  useEffect(() => () => stopOutcomePolls(), [stopOutcomePolls]);

  // Keep the Intercom launcher off the drawer's bottom-right actions.
  useHideIntercomLauncher(open);

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

  const addTopic = async (cluster) => {
    const key = cluster.label || cluster.pillarKeyword;
    const kws = Array.isArray(cluster.keywords) ? cluster.keywords : [];
    const pillar =
      kws.find((k) => (k.kw || k.keyword) === (cluster.pillarKeyword || cluster.label)) || kws[0] || {};
    setAddingKey(key);
    try {
      const resp = await apiClient.post(`/api/plan/${site}/add`, {
        keyword: cluster.pillarKeyword || cluster.label,
        source: 'cluster',
        clusterLabel: cluster.label,
        searchVolume: Number(pillar.volume ?? pillar.searchVolume) || 0,
        difficulty: Number(pillar.kd ?? pillar.difficulty) || 0,
        ...(pillar.intent ? { intent: pillar.intent } : {}),
      });
      invalidate(`plan:${site}`);
      if (resp.data?.blocked === 'excluded') {
        // The topic/keyword was hard-pruned in Settings since the list loaded.
        // Grey the row (Restore in place) and say why, instead of a dead add.
        setExcludeOverrides((prev) => ({ ...prev, [key]: true }));
        toast && toast({
          message: resp.data.message || 'You removed this in Settings. Restore it there first to add it back.',
          tone: 'error',
        });
      } else if (resp.data?.blocked === 'intent-owned') {
        // Keep the owner the guard returned so the covered row can link to the
        // post/page that already covers the topic instead of dead-ending.
        setOutcomes((prev) => ({
          ...prev,
          [key]: { status: 'covered', owner: resp.data.owner || resp.data.owners?.[0]?.owner || null },
        }));
      } else if (resp.data?.expanding) {
        setOutcomes((prev) => ({
          ...prev,
          [key]: { status: 'expanding', count: Number(resp.data.estimatedEntries) || 0 },
        }));
        onAdded && onAdded();
        pollOutcome(key, Date.now());
      } else {
        const first = resp.data?.entry || resp.data?.entries?.[0] || null;
        setOutcomes((prev) => ({
          ...prev,
          [key]: {
            status: 'added',
            publishDate: first?.publishDate || null,
            count: Number(resp.data?.added) || (resp.data?.entries?.length ?? 1),
          },
        }));
        onAdded && onAdded();
      }
    } catch (err) {
      console.error('AddTopicsDrawer add failed:', err);
      // Trial cap (403): name the real reason instead of a generic "try again",
      // so the honest message is "you're out of trial articles", not a fake error.
      if (err.response?.data?.error === 'trial_limit_reached') {
        toast && toast({
          message: err.response.data.message || 'You have reached your trial limit. Upgrade to schedule more articles.',
          tone: 'error',
        });
      } else {
        toast && toast({ message: 'We could not add that topic. Give it another try.', tone: 'error' });
      }
    } finally {
      setAddingKey(null);
    }
  };

  // Dismiss a topic row: HIDE it from this list only (config.hiddenTopics). This
  // is UI-only — the topic still feeds autopilot. Distinct from "Don't write
  // about this" (excludeTopic) below, which is a hard prune. Quiet failure
  // handling: restore the row and say so.
  const dismissTopic = async (cluster) => {
    const key = cluster.label || cluster.pillarKeyword;
    if (!key) return;
    const prevSettled = settled;
    setSettled((prev) => ({
      added: prev?.added || new Set(),
      hidden: new Set([...(prev?.hidden || []), key]),
    }));
    try {
      await apiClient.post(`/api/plan/${site}/topics/dismiss`, { label: key });
      toast && toast('Hidden from this list.');
    } catch (err) {
      console.error('AddTopicsDrawer dismiss failed:', err);
      setSettled(prevSettled);
      toast && toast({ message: 'We could not hide that topic. Give it another try.', tone: 'error' });
    }
  };

  // Effective exclusion state: an optimistic this-visit override wins, else the
  // server's annotation (clusters GET reads config.excludedTopics).
  const isExcluded = (cluster, key) =>
    key in excludeOverrides ? excludeOverrides[key] : cluster.excluded === true;

  // "Don't write about this": HARD prune (config.excludedTopics). The planner
  // never schedules it again and the add route refuses it. Greys the row in
  // place with a Restore affordance. Optimistic; reverts on failure.
  const excludeTopic = async (cluster) => {
    const key = cluster.label || cluster.pillarKeyword;
    if (!key) return;
    setExcludeOverrides((prev) => ({ ...prev, [key]: true }));
    try {
      await apiClient.post(`/api/plan/${site}/topics/exclude`, { topic: key });
      invalidate(`kwclusters:${site}`);
      toast && toast("Removed. We won't write about this.");
    } catch (err) {
      console.error('AddTopicsDrawer exclude failed:', err);
      setExcludeOverrides((prev) => { const next = { ...prev }; delete next[key]; return next; });
      toast && toast({ message: 'We could not remove that topic. Give it another try.', tone: 'error' });
    }
  };

  // Undo a hard prune: restore the topic so it can be scheduled again.
  const restoreTopic = async (cluster) => {
    const key = cluster.label || cluster.pillarKeyword;
    if (!key) return;
    setExcludeOverrides((prev) => ({ ...prev, [key]: false }));
    try {
      await apiClient.post(`/api/plan/${site}/topics/exclude`, { topic: key, undo: true });
      invalidate(`kwclusters:${site}`);
      toast && toast('Restored.');
    } catch (err) {
      console.error('AddTopicsDrawer restore failed:', err);
      setExcludeOverrides((prev) => { const next = { ...prev }; delete next[key]; return next; });
      toast && toast({ message: 'We could not restore that topic. Give it another try.', tone: 'error' });
    }
  };

  if (!open) return null;

  const sorted = [...clusters]
    .filter((c) => {
      const key = c.label || c.pillarKeyword;
      if (outcomes[key]) return true; // this-visit outcome keeps its confirmation row
      if (!settled) return true;
      return !settled.hidden.has(key) && !settled.added.has(key);
    })
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));

  const outcomeLine = (o) => {
    if (o.status === 'covered') return o.message || 'You already cover this, so we skipped it.';
    if (o.status === 'failed') return 'That did not go through. Try adding it again.';
    if (o.status === 'slow') return 'Still working on it. Check the calendar in a couple of minutes.';
    if (o.status === 'expanding') {
      return o.count > 0
        ? `Adding up to ${o.count} articles. They will appear within a minute.`
        : 'Adding articles. They will appear within a minute.';
    }
    const week = o.publishDate && !Number.isNaN(new Date(o.publishDate).getTime())
      ? new Date(o.publishDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : null;
    if (o.count > 1) return `${o.count} articles scheduled.`;
    return week ? `Scheduled for the week of ${week}.` : 'Scheduled.';
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Add topics to your plan">
      <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md min-h-0 flex-col bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900">Add topics</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              From your keyword research, best opportunities first. One click schedules the articles.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your topics...
            </div>
          ) : loadError ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-600">We could not load your topics just now.</p>
              <button
                type="button"
                onClick={fetchClusters}
                className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Retry
              </button>
            </div>
          ) : sorted.length === 0 && clusters.length > 0 ? (
            <div className="p-8 text-center" data-testid="add-topics-all-settled">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                <Check className="h-5 w-5 text-emerald-700" />
              </div>
              <p className="text-sm font-semibold text-slate-900">Everything here is in your plan or dismissed</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
                Re-run keyword research from the Keywords page to find more topics.
              </p>
            </div>
          ) : sorted.length === 0 ? (
            processing ? (
              <div className="p-8 text-center" data-testid="add-topics-processing">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
                </div>
                <p className="text-sm font-semibold text-slate-900">Finding your best topics...</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
                  This takes a minute or two. You can close this, your topics will be here when they're ready.
                </p>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                  <Sparkles className="h-5 w-5 text-emerald-700" />
                </div>
                <p className="text-sm font-semibold text-slate-900">No keyword research yet</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
                  Run keyword research once and your best topics will show up here and flow into your plan automatically.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/keyword-finder')}
                  className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
                >
                  Run keyword research
                </button>
              </div>
            )
          ) : (
            <div className="divide-y divide-slate-100">
              {processing && (
                <div className="flex items-center gap-2 bg-slate-50 px-5 py-2.5 text-xs text-slate-500" data-testid="add-topics-refining">
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                  Refining your topics in the background. Better ones will show up here in a couple of minutes.
                </div>
              )}
              {sorted.map((cluster) => {
                const key = cluster.label || cluster.pillarKeyword;
                const outcome = outcomes[key];
                const isAdding = addingKey === key;
                const kwCount = cluster.keywordCount ?? (cluster.keywords?.length || 0);
                // Pre-flight covered: the API already ran the REAL add judge on
                // this topic (or, for research that predates the precompute, the
                // cheap all-keywords-owned check) and there is nothing net-new
                // left, so show that up front instead of a dead-end Add button.
                const preCovered = !outcome && cluster.covered === true;
                // Hard-pruned in Settings: greyed in place with a Restore, never
                // an Add button (the add route would refuse it anyway).
                const excluded = !outcome && isExcluded(cluster, key);
                // The precomputed number of articles this add would actually
                // schedule. null on legacy clusters -> generic "Add" label.
                const addable = Number.isFinite(Number(cluster.addableCount))
                  ? Number(cluster.addableCount)
                  : null;
                const addLabel = addable && addable > 0
                  ? `Add ${addable} article${addable === 1 ? '' : 's'}`
                  : 'Add';
                return (
                  <div key={key} className="px-5 py-3.5" data-testid="add-topic-row">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${excluded ? 'text-slate-400' : 'text-slate-900'}`}>{cluster.label}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {kwCount} keyword{kwCount === 1 ? '' : 's'} · {formatVolume(cluster.totalVolume)}{' '}
                          <InfoTip term="searchVolume">searches/mo</InfoTip>
                        </p>
                        {!excluded && (
                          <p className="mt-1 text-xs text-emerald-800">{clusterWhy(cluster)}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {!outcome && !excluded && (
                          <>
                            {/* Hide from THIS list (soft, still feeds autopilot). */}
                            <button
                              type="button"
                              onClick={() => dismissTopic(cluster)}
                              aria-label="Hide this topic from the list"
                              title="Hide from this list"
                              className="rounded-lg p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                              data-testid="add-topic-dismiss"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                            {/* Hard prune: never write about this again. */}
                            <button
                              type="button"
                              onClick={() => excludeTopic(cluster)}
                              aria-label="Don't write about this"
                              title="Don't write about this"
                              className="rounded-lg p-1 text-slate-300 hover:bg-slate-100 hover:text-rose-500"
                              data-testid="add-topic-exclude"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        {outcome && outcome.status !== 'failed' ? (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium ${
                              outcome.status === 'added' || outcome.status === 'expanding' ? 'text-emerald-700' : 'text-slate-500'
                            }`}
                            data-testid="add-topic-outcome"
                          >
                            {outcome.status === 'expanding'
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : (outcome.status === 'added' || outcome.status === 'covered') && <Check className="h-3.5 w-3.5" />}
                            {outcome.status === 'covered' ? 'Already covered'
                              : outcome.status === 'expanding' ? 'Adding'
                              : outcome.status === 'slow' ? 'Still working'
                              : 'In your plan'}
                          </span>
                        ) : excluded ? (
                          <button
                            type="button"
                            onClick={() => restoreTopic(cluster)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            data-testid="add-topic-restore"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restore
                          </button>
                        ) : preCovered ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500"
                            data-testid="add-topic-covered"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Already covered
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addTopic(cluster)}
                            disabled={isAdding}
                            className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                          >
                            {isAdding
                              ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              : <Plus className="mr-1 h-3.5 w-3.5" />}
                            {addLabel}
                          </button>
                        )}
                      </div>
                    </div>
                    {outcome ? (
                      outcome.status === 'covered' && outcome.owner ? (
                        <CoveredLine site={site} owner={outcome.owner} fallback={outcomeLine(outcome)} />
                      ) : (
                        <p className="mt-1 text-xs text-slate-500">{outcomeLine(outcome)}</p>
                      )
                    ) : excluded ? (
                      <p className="mt-1 text-xs text-slate-400" data-testid="add-topic-excluded-note">
                        Removed in Settings. Restore it to add it back.
                      </p>
                    ) : preCovered ? (
                      <CoveredLine
                        site={site}
                        owner={cluster.coveredBy?.[0]}
                        fallback="Your existing pages already cover this, so there is nothing net-new to add."
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={() => navigate('/keyword-finder')}
            className="inline-flex items-center text-sm font-medium text-primary hover:opacity-80"
          >
            Open full keyword research
            <ChevronRight className="ml-0.5 h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTopicsDrawer;
