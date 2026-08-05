import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  LogOutIcon, Trash2Icon, Download, Wand2Icon, LoaderIcon,
  CalendarIcon, LayoutGrid, List, MoreHorizontal, PauseIcon, PlayCircle, PlayIcon, SlidersHorizontal, RefreshCw
} from 'lucide-react';
import apiClient from '../../utils/apiClient';
import { cachedFetch, invalidate as invalidateCache } from '../../utils/apiCache';
import { useImpersonation } from '../../contexts/ImpersonationContext';
import { isMockMode, supplementArticles } from '../../mocks';
import { useModals } from '../../contexts/ModalContext';
import ImpersonationBanner from '../../components/ImpersonationBanner';
import NavbarWrapper from '../../components/Navbar';
import Tooltip from '../../components/Tooltip';
import { useNavigate } from 'react-router-dom';
import { TOUR_TYPES, useTour } from '../../contexts/TourContext';

import SkeletonLoader from './SkeletonLoader';
import ArticlesTable, { resolveTitle } from './ArticlesTable';
import EmptyDashboard from './EmptyDashboard';
import PlanCalendar from './PlanCalendar';
import PlanStrategyPanel from './PlanStrategyPanel';
import PlanUpdates from './PlanUpdates';
import AddTopicsDrawer from './AddTopicsDrawer';
import ArticleEditor from './ArticleEditor';
import {
  QuickEditModal, ExportDialog,
  GenerateConfirmModal, BulkGenerateConfirmModal, ConfirmDialog
} from './Modals';

const animationStyles = `
  @keyframes pulsatePreview {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(15, 23, 42, 0.4); }
    70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(15, 23, 42, 0); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(15, 23, 42, 0); }
  }
  .preview-pulse { animation: pulsatePreview 2s infinite cubic-bezier(0.66, 0, 0, 1); }
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = animationStyles;
document.head.appendChild(styleSheet);

const UPDATE_ENDPOINTS = {
  webflow: (article) => `/posts/${article.id}`,
  rest: () => '/save-post',
  default: () => '/save-post'
};

const UPDATE_METHODS = {
  webflow: 'patch',
  rest: 'post',
  default: 'post'
};

// Platforms whose update client pushes a saved edit to the live CMS post in
// place (backend platformRegistry `update` entries). Everything else saves to
// Blawgy only and needs Republish; the editor states which one honestly.
const LIVE_SYNC_TYPES = ['wordpress', 'wix', 'webflow', 'shopify', 'ghost', 'framer'];

// localStorage access throws in Safari private mode. These are all best-effort
// UI-preference writes, so a failed write must never break render or an effect.
const safeSetItem = (key, value) => {
  try { localStorage.setItem(key, value); } catch (_) { /* noop */ }
};

const Dashboard = ({ currentSite: changedSite, logout, email, updateCurrentSite }) => {
  const { currentSite, user, siteSettings, impersonatedSite, currentSubscription } = useImpersonation();
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedKeywords, setEditedKeywords] = useState("");
  const [editedContent, setEditedContent] = useState("");
  // Article body is fetched on-intent (the list no longer ships blogContent).
  // `editContentLoading` gates the edit modal's spinner while that fetch runs.
  const [editContentLoading, setEditContentLoading] = useState(false);
  const [editedProductIds, setEditedProductIds] = useState([]);
  const [, setGeneratingIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  // Articles list load failure. Distinct from the toast channel: a failed list
  // fetch must NOT masquerade as "No articles yet", so we render a real error
  // state with a Retry button instead.
  const [articlesLoadError, setArticlesLoadError] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [quickEditModal, setQuickEditModal] = useState(false);
  const [quickEditPost, setQuickEditPost] = useState(null);
  const [toast, setToastState] = useState(null);
  const [editingDateId, setEditingDateId] = useState(null);
  const [datePickerPosition, setDatePickerPosition] = useState({ top: 0, left: 0 });
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  // Export fetches each article's body on click (bodies aren't in the list).
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState(false);
  const [hasGeneratingArticles, setHasGeneratingArticles] = useState(false);
  const [showPublished, setShowPublished] = useState(() => {
    // localStorage access throws in Safari private mode. A throw inside a
    // useState initializer takes the whole Dashboard down to a white screen,
    // so read defensively and fall back to the default.
    try {
      const stored = localStorage.getItem('showPublished');
      return stored ? JSON.parse(stored) : false;
    } catch (_) { return false; }
  });
  const [statusFilter, setStatusFilter] = useState('scheduled');
  const [showGenerateConfirmation, setShowGenerateConfirmation] = useState(false);
  const [articleToGenerate, setArticleToGenerate] = useState({ id: null, index: null });
  const [showBulkGenerateConfirmation, setShowBulkGenerateConfirmation] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingArticleId, setDeletingArticleId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  // Generic confirm dialog for destructive actions (delete written articles,
  // bulk delete). { title, body, confirmLabel, onConfirm } or null.
  const [confirmDialog, setConfirmDialog] = useState(null);

  // ---- Content Plan state ----
  const [view, setView] = useState(() => {
    try { return localStorage.getItem('planView') || 'calendar'; } catch (_) { return 'calendar'; }
  });
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);
  // A failed plan load is a hiccup, never "you have no plan": we keep the last
  // good plan and flag the error so the calendar shows a retry instead of the
  // misleading (and destructive, it invites a duplicate re-plan) empty hero.
  const [planLoadError, setPlanLoadError] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);
  // "Add topics" drawer: the lean keyword picker over the plan, so filling the
  // calendar never requires the page-hop to the Keywords page.
  const [showAddTopics, setShowAddTopics] = useState(false);
  // Quiet inline indicator + count while an async cluster add ("expanding")
  // is still landing entries. { active, count } — count is the estimate we show.
  // Last generate response summary (scheduled / refreshSuggestions counts),
  // stashed so the "Why this plan" strip can narrate the honest guard outcome.
  const [planSummary, setPlanSummary] = useState(null);
  const moreMenuRef = useRef(null);
  // Guards so per-site background work runs once per mount/site.
  const autoGenTriedRef = useRef(null);   // site we've already auto-kicked this session
  const undoDeleteRef = useRef(null);     // pending premise-delete undo handle

  const {
    setShowSupportModal, setShowImageStyleModal, setShowAdminPanel,
    setShowBulkGenerateModal, setShowSubscriptionModal, setOnCloseBulkGenerate, onCloseBulkGenerate
  } = useModals();
  const navigate = useNavigate();
  const { startTour } = useTour();

  // Small helper so all plan actions surface a consistent transient toast.
  // Accepts either a plain string (neutral slate, 3s) or
  // { message, tone: 'error' } for failures (red accent, longer dwell so the
  // user can actually read what went wrong). Kept string-compatible so every
  // existing call site keeps working unchanged.
  const setToast = useCallback((msg) => {
    if (!msg) { setToastState(null); return; }
    const next = typeof msg === 'string' ? { message: msg, tone: 'neutral' } : msg;
    setToastState(next);
    const dwell = next.tone === 'error' ? 7000 : 3000;
    setTimeout(() => setToastState(null), dwell);
  }, []);

  // Failure helper: one call site so every error reads the same way.
  const setErrorToast = useCallback((message) => {
    setToast({ message, tone: 'error' });
  }, [setToast]);

  // Drop the cached plan view for this site so the next fetch is authoritative.
  // Called after any plan mutation (accept/dismiss/add/patch/delete/generate/pause).
  const invalidatePlan = useCallback(() => {
    if (currentSite) invalidateCache(`plan:${currentSite}`);
  }, [currentSite]);

  // Fetch articles (list view + polling source of truth, unchanged)
  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      setArticlesLoadError(false);

      if (isMockMode()) {
        setArticles(supplementArticles);
        setHasGeneratingArticles(false);
        setLoading(false);
        return;
      }

      const response = await apiClient.get('/all-blog-posts', {
        params: { email: !currentSite ? email : undefined, site: currentSite || undefined }
      });

      const data = Array.isArray(response.data) ? response.data : [];
      setArticles(data);
      setHasGeneratingArticles(data.some(a => a.blogStatus === 'generating' || a.blogStatus === 'in_queue'));
    } catch (error) {
      console.error('Error fetching articles:', error);
      // Do NOT clear articles or fall through to the empty state: a failed load
      // must read as a loading hiccup, never as "you have no articles".
      setArticlesLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [currentSite, email]);

  // On-intent single-post body fetch. The list response dropped blogContent to
  // stop shipping ~10MB of article HTML per dashboard load; anything that shows
  // or copies a body (edit modal, CSV export) pulls one post's content here when
  // the user actually opens it. Returns { blogContent, articleSummary } or null.
  const fetchBlogContent = useCallback(async (articleId) => {
    if (!articleId) return null;
    if (isMockMode()) {
      const a = supplementArticles.find(x => (x.id?.$oid || x.id) === articleId);
      return { blogContent: a?.blogContent || '', articleSummary: a?.articleSummary || '' };
    }
    try {
      const response = await apiClient.get('/blog-content', {
        params: {
          id: articleId,
          email: !currentSite ? email : undefined,
          site: currentSite || undefined,
        },
      });
      if (response.data?.success) {
        return {
          blogContent: response.data.blogContent || '',
          articleSummary: response.data.articleSummary || '',
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching blog content:', error);
      return null;
    }
  }, [currentSite, email]);

  // Fetch the content plan (calendar entries + suggestions + config + trial).
  // Reads through apiCache so a tab switch / remount renders the last plan
  // instantly, then revalidates in the background (onUpdate lands the fresh
  // copy). `force` skips the cache after a mutation (belt-and-suspenders with
  // invalidateCache). Never shows the skeleton once we already have a plan.
  const fetchPlan = useCallback(async ({ force = false } = {}) => {
    if (!currentSite || isMockMode()) { setPlanLoading(false); return; }
    const key = `plan:${currentSite}`;
    if (force) invalidateCache(key);
    const applyPlan = (data) => {
      setPlan(data || null);
      setPaused(!!data?.config?.paused);
      setPlanLoadError(false);
    };
    // getPlanView is a heavy read on large sites (a slow cold query, or a backend
    // restart mid-request in dev, can drop a single attempt). Retry a couple of
    // times before giving up so one hiccup never blanks a real calendar.
    const fetchOnce = async () => {
      let lastErr;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const r = await apiClient.get(`/api/plan/${currentSite}`);
          return r.data;
        } catch (err) {
          lastErr = err;
          await new Promise((res) => setTimeout(res, 500 * (attempt + 1)));
        }
      }
      throw lastErr;
    };
    try {
      setPlanLoading(true);
      const data = await cachedFetch(
        key,
        fetchOnce,
        { ttlMs: 15_000, staleMs: 5 * 60_000, onUpdate: applyPlan }
      );
      applyPlan(data);
    } catch (error) {
      console.error('Error fetching content plan:', error);
      // Mirror fetchArticles: a failed load must read as a hiccup, never as
      // "you have no plan". Keep the last good plan (if any) and flag the error
      // so the calendar offers a retry instead of the empty re-plan hero.
      setPlanLoadError(true);
    } finally {
      setPlanLoading(false);
    }
  }, [currentSite]);

  // Initial setup
  useEffect(() => {
    setStatusFilter('scheduled');
    setShowPublished(false);
    safeSetItem('showPublished', 'false');
  }, []);

  useEffect(() => {
    if (isMockMode()) {
      setArticles(supplementArticles);
      setLoading(false);
    }
  }, []);

  // New site: drop the previous site's plan so its calendar never flashes under
  // the new site while the fresh load runs (fetchPlan no longer nulls on error,
  // so without this a failed load on site B could keep showing site A's plan).
  useEffect(() => { setPlan(null); setPlanLoadError(false); }, [currentSite]);

  useEffect(() => {
    if (currentSite) {
      fetchArticles();
      fetchPlan();
      setOnCloseBulkGenerate(null);
      if (onCloseBulkGenerate) {
        setShowPublished(false);
        safeSetItem('showPublished', 'false');
      }
    }
  }, [currentSite, onCloseBulkGenerate, setOnCloseBulkGenerate, fetchArticles, fetchPlan]);

  useEffect(() => {
    safeSetItem('showPublished', JSON.stringify(showPublished));
  }, [showPublished]);

  useEffect(() => {
    safeSetItem('planView', view);
  }, [view]);

  useEffect(() => {
    if (!loading && articles.length > 0) {
      const hasUnpublished = articles.some(a => a.blogStatus !== 'published');
      if (!hasUnpublished) setShowPublished(true);
    }
  }, [loading, articles]);

  // Polling for generating articles (updates both list + calendar via articles)
  useEffect(() => {
    let intervalId;
    if (hasGeneratingArticles && !loading) {
      intervalId = setInterval(async () => {
        try {
          const response = await apiClient.get('/all-blog-posts', {
            params: { email: !currentSite ? email : undefined, site: currentSite || undefined }
          });
          if (response.data) {
            setArticles(prev => {
              const updated = [...prev];
              response.data.forEach(serverArticle => {
                const idx = updated.findIndex(a =>
                  a.id === serverArticle.id || (a.id.$oid && a.id.$oid === serverArticle.id.$oid)
                );
                // Only update existing articles, don't re-add deleted ones
                if (idx !== -1) updated[idx] = { ...updated[idx], ...serverArticle };
              });
              return updated;
            });
            const stillGenerating = response.data.some(a => a.blogStatus === 'generating' || a.blogStatus === 'in_queue');
            if (!stillGenerating) { setHasGeneratingArticles(false); fetchPlan({ force: true }); }
          }
        } catch (error) {
          console.error('Error polling articles:', error);
        }
      }, 5000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [hasGeneratingArticles, loading, currentSite, email, fetchPlan]);

  // Click outside to close datepicker
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.datepicker-container')) setEditingDateId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Click outside to close the More overflow menu
  useEffect(() => {
    const onDown = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) setShowMoreMenu(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Toast auto-hide (legacy showToast flag)
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Handlers
  const handleEdit = async (article) => {
    setSelectedArticle(article);
    setEditedTitle(article.title);
    setEditedKeywords(article.keywords);
    // The list no longer carries blogContent, so pull this post's body on open.
    // Start empty + loading so the editor doesn't flash stale/blank content.
    setEditedContent("");
    if (article.hasContent) {
      setEditContentLoading(true);
      const content = await fetchBlogContent(article.id?.$oid || article.id);
      setEditedContent(content?.blogContent || "");
      setEditContentLoading(false);
    }
  };

  // `overrides` lets the editor pass its live values (Cmd+S can fire before the
  // editor's blur has synced state back here).
  // Deep link from the preview page's "Edit article" button. The handoff rides
  // sessionStorage, NOT a query param: the app's auth/redirect dance rewrites
  // the URL on the way into /dashboard and drops any params. The key is
  // cleared when the editor CLOSES (not on open), so a dashboard remount while
  // auth/site state settles re-opens the editor instead of losing it.
  const pendingEditHandled = useRef(false);
  const clearPendingEdit = useCallback(() => {
    try { sessionStorage.removeItem('blawgy:pendingEdit'); } catch (_) { /* noop */ }
  }, []);
  useEffect(() => {
    if (pendingEditHandled.current || loading) return;
    let pending = null;
    try { pending = JSON.parse(sessionStorage.getItem('blawgy:pendingEdit') || 'null'); } catch (_) { /* noop */ }
    if (!pending?.id) { pendingEditHandled.current = true; return; }
    // Stale handoff (e.g. leftover from an abandoned tab): ignore and clean up.
    if (Date.now() - (pending.at || 0) > 5 * 60_000) {
      clearPendingEdit();
      pendingEditHandled.current = true;
      return;
    }
    const match = (articles || []).find((a) => (a.id?.$oid || a.id) === pending.id);
    if (!match) return; // list may still be for another site or mid-refresh
    pendingEditHandled.current = true;
    handleEdit(match);
    // handleEdit is re-created per render; the guard ref keeps this one-shot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles, loading]);

  const handleSave = async (overrides = {}) => {
    if (isSaving || editContentLoading) return;
    try {
      setIsSaving(true);
      const blogType = user?.blogType || 'default';
      const getEndpoint = UPDATE_ENDPOINTS[blogType] || UPDATE_ENDPOINTS.default;
      const method = UPDATE_METHODS[blogType] || UPDATE_METHODS.default;

      const response = await apiClient[method](getEndpoint(selectedArticle), {
        id: selectedArticle.id,
        title: overrides.title !== undefined ? overrides.title : editedTitle,
        keywords: overrides.keywords !== undefined ? overrides.keywords : editedKeywords,
        site: currentSite,
        blogContent: overrides.blogContent !== undefined ? overrides.blogContent : editedContent,
        blogStatus: selectedArticle.blogStatus || 'draft',
        isConnectedViaApi: blogType === 'rest',
        publishDate: selectedArticle.publishDate,
      });

      if (response.data.success) {
        setSelectedArticle(null);
        clearPendingEdit();
        // The backend saves to Blawgy, then best-effort syncs the edit to the
        // live CMS post; a failed sync comes back as cmsWarning. Say so instead
        // of claiming the live post updated when it did not.
        if (response.data.cmsWarning) {
          setErrorToast('Saved to Blawgy, but your live post could not be updated. Try Republish in a moment.');
        } else {
          setToast('Article updated');
        }
        await fetchArticles();
      } else {
        setErrorToast("We couldn't save your changes. Nothing was lost. Try again in a moment.");
      }
    } catch (error) {
      console.error('Error updating article:', error);
      setErrorToast("We couldn't save your changes. Nothing was lost. Try again in a moment.");
    } finally {
      setIsSaving(false);
    }
  };

  // Trial limit check
  const isTrialing = currentSubscription?.isTrialing || false;
  const trialArticlesRemaining = currentSubscription?.trialArticlesRemaining ?? null;
  const trialLimitReached = isTrialing && trialArticlesRemaining === 0;
  // Best-available credit balance for the "Uses 1 of your N credits" line.
  // Trialing: their remaining trial articles. Paid: their remaining credits if
  // the subscription exposes them. null means "we don't know", so the modal
  // falls back to a plain "Uses 1 credit".
  const creditBalance = isTrialing
    ? (typeof trialArticlesRemaining === 'number' ? trialArticlesRemaining : null)
    : (typeof currentSubscription?.credits === 'number' ? currentSubscription.credits : null);

  const handleGenerateBlog = async (id, index) => {
    // Check trial limit before generating. Do NOT auto-navigate: teleporting to
    // billing unmounts any toast and strands the user with no context. The
    // persistent trial banner (rendered below) carries the Upgrade action.
    if (trialLimitReached) {
      setErrorToast('You have used all your trial articles. Upgrade to keep generating.');
      return;
    }

    // OPTIMISTIC flip to in_queue on BOTH surfaces. The list view renders from
    // `articles`; the calendar renders from `plan.entries`. Generating from a
    // calendar card only ever touched `articles` before, so the card the user
    // clicked never morphed and the action read as a no-op. Flip both, remember
    // the prior plan so we can roll back if the request fails.
    const matchId = (a) => (a.id?.$oid || a.id) === id;
    // Remember only THIS row's prior status so we roll back just it. A full
    // snapshot revert would clobber concurrent poll updates to other rows.
    const prevArticleStatus = articles.find(matchId)?.blogStatus;
    const prevEntryStatus = plan?.entries?.find(matchId)?.blogStatus;
    setGeneratingIndex(index);
    setArticles(prev => prev.map(a => matchId(a) ? { ...a, blogStatus: 'in_queue' } : a));
    setPlan(p => p ? {
      ...p,
      entries: p.entries.map(e => matchId(e) ? { ...e, blogStatus: 'in_queue' } : e)
    } : p);

    // Roll back only the single row we flipped, restoring its prior status.
    const revert = () => {
      setArticles(prev => prev.map(a => matchId(a) ? { ...a, blogStatus: prevArticleStatus } : a));
      setPlan(p => p ? {
        ...p,
        entries: p.entries.map(e => matchId(e) ? { ...e, blogStatus: prevEntryStatus } : e)
      } : p);
    };

    try {
      const response = await apiClient.put(`/generate-blog/${id}`, {
        site: impersonatedSite?.site || user?.site,
        email: siteSettings?.email || email
      });

      if (response.data.success) {
        setHasGeneratingArticles(true);
        setToast('Queued. Writing starts shortly.');
        // Revalidate the plan so the server's own status wins once it lands.
        invalidatePlan();
        fetchPlan({ force: true });
      } else {
        // Trial limit: keep the user in place, let the banner offer upgrade.
        if (response.data.message?.includes('Trial limit')) {
          revert();
          setErrorToast('You have used all your trial articles. Upgrade to keep generating.');
        } else {
          revert();
          setErrorToast('We could not start writing that one. Try again in a moment.');
        }
      }
    } catch (error) {
      console.error('Error generating blog:', error);
      // Roll the optimistic flip back on both surfaces.
      revert();
      if (error.response?.status === 403 && error.response?.data?.message?.includes('Trial limit')) {
        setErrorToast('You have used all your trial articles. Upgrade to keep generating.');
      } else {
        setErrorToast('We could not start writing that one. Try again in a moment.');
      }
    }
    setGeneratingIndex(null);
  };

  const bulkGenerateEligible = useMemo(() => {
    return articles.filter(a => {
      const id = a.id.$oid || a.id;
      return selectedArticles.includes(id) && !a.hasContent &&
        a.blogStatus !== 'in_queue' && a.blogStatus !== 'generating' && a.blogStatus !== 'published';
    });
  }, [articles, selectedArticles]);

  // The set we'll actually queue, capped to the trial remaining. Computed here
  // (not inside the handler) so the confirm modal can show the honest count
  // BEFORE the user clicks: "You selected 10, but your trial has 2 left."
  const bulkToGenerate = useMemo(() => {
    if (isTrialing) return bulkGenerateEligible.slice(0, trialArticlesRemaining || 0);
    return [...bulkGenerateEligible];
  }, [isTrialing, bulkGenerateEligible, trialArticlesRemaining]);

  const handleBulkGenerate = async () => {
    // Trial limit reached: keep the user in place; the banner offers upgrade.
    if (trialLimitReached) {
      setErrorToast('You have used all your trial articles. Upgrade to keep generating.');
      return;
    }

    const toGenerate = bulkToGenerate;
    const count = toGenerate.length;

    if (count === 0) {
      setToast('No articles available to generate.');
      return;
    }

    try {
      setBulkGenerating(true);
      setShowBulkGenerateConfirmation(false);

      let successCount = 0;
      let hitTrialLimit = false;
      for (const article of toGenerate) {
        const id = article.id.$oid || article.id;
        try {
          await apiClient.put(`/generate-blog/${id}`, {
            site: impersonatedSite?.site || user?.site,
            email: siteSettings?.email || email
          });
          setArticles(prev => prev.map(a => (a.id.$oid || a.id) === id ? { ...a, blogStatus: 'in_queue' } : a));
          successCount++;
        } catch (error) {
          // Stop if we hit trial limit
          if (error.response?.status === 403 && error.response?.data?.message?.includes('Trial limit')) {
            hitTrialLimit = true;
            break;
          }
          console.error(`Error generating article ${id}:`, error);
        }
      }

      setHasGeneratingArticles(true);
      setSelectedArticles([]);

      const failed = count - successCount;
      const plural = (n) => (n === 1 ? '' : 's');
      if (hitTrialLimit) {
        setErrorToast(`${successCount} queued. You have used all your trial articles. Upgrade to queue the rest.`);
      } else if (failed > 0) {
        // Honest partial-failure report instead of only counting successes.
        setErrorToast(`${successCount} of ${count} queued. ${failed} couldn't start. Try those again.`);
      } else {
        setToast(`${successCount} article${plural(successCount)} queued for generation`);
      }
    } catch (error) {
      console.error('Error bulk generating articles:', error);
      setErrorToast('We could not queue those articles. Try again in a moment.');
    } finally {
      setBulkGenerating(false);
    }
  };

  const handleQuickEdit = async (updates) => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      const response = await apiClient.post('/save-post', {
        id: quickEditPost.id,
        title: editedTitle,
        keywords: editedKeywords,
        site: currentSite,
        email: email,
        // No blogContent: QuickEdit only touches title/keywords/date/products.
        // The list no longer carries the body, and /save-post preserves the
        // stored content when blogContent is omitted (falsy = no overwrite).
        publishDate: updates.publishDate || quickEditPost.publishDate,
        blogStatus: quickEditPost.blogStatus || 'draft',
        isConnectedViaApi: user?.blogType === 'rest',
        productIds: editedProductIds,
      });

      if (response.data.success) {
        const titleChanged = editedTitle !== quickEditPost.title;
        const keywordsChanged = editedKeywords !== quickEditPost.keywords;
        const dateChanged = updates.publishDate !== quickEditPost.publishDate;

        setArticles(prev => prev.map(a =>
          a.id === quickEditPost.id
            ? { ...a, title: editedTitle, keywords: editedKeywords, publishDate: updates.publishDate || a.publishDate, productIds: editedProductIds }
            : a
        ));

        let msg = '';
        if (titleChanged && keywordsChanged && dateChanged) msg = 'Article title, keywords and date updated';
        else if (titleChanged && keywordsChanged) msg = 'Article title and keywords updated';
        else if (titleChanged && dateChanged) msg = 'Article title and date updated';
        else if (keywordsChanged && dateChanged) msg = 'Article keywords and date updated';
        else if (titleChanged) msg = 'Article title updated';
        else if (keywordsChanged) msg = 'Article keywords updated';
        else if (dateChanged) msg = 'Article date updated';

        setToast(msg);
        setQuickEditModal(false);
        setQuickEditPost(null);
      } else {
        setErrorToast("We couldn't save your changes. Nothing was lost. Try again in a moment.");
      }
    } catch (error) {
      console.error('Error updating article:', error);
      setErrorToast("We couldn't save your changes. Nothing was lost. Try again in a moment.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRowClick = (article) => {
    // A row click must never be a dead no-op. Editable rows open QuickEdit;
    // published/read-only rows open the preview in a new tab instead.
    if (!showPublished || user?.blogType === 'rest') {
      // Prefill the title with the same fallback the table shows, so a titleless
      // (add-to-plan) row opens with its keyword-derived title instead of blank.
      const fallbackTitle = article.title
        || article.blogTitle
        || (article.keyword || (Array.isArray(article.keywords) ? article.keywords[0] : '') || '');
      setQuickEditPost(article);
      setEditedTitle(fallbackTitle);
      setEditedKeywords(Array.isArray(article.keywords) ? article.keywords.join(', ') : article.keywords || '');
      setEditedProductIds(article.productIds || []);
      setQuickEditModal(true);
    } else {
      const id = article.id?.$oid || article.id;
      window.open(`/preview/${currentSite || email}/${id}`, '_blank');
    }
  };

  const handleDateClick = (e, articleId) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const calendarHeight = 300, calendarWidth = 300;

    let top = rect.bottom + window.scrollY;
    let left = rect.left + window.scrollX;

    if (top + calendarHeight > viewportHeight + window.scrollY) top = rect.top + window.scrollY - calendarHeight;
    if (left + calendarWidth > viewportWidth) left = viewportWidth - calendarWidth - 20;
    left = Math.max(20, left);
    top = Math.max(window.scrollY + 20, top);

    setDatePickerPosition({ top, left });
    setEditingDateId(articleId);
  };

  const handleDateChange = async (articleId, newDate) => {
    try {
      const response = await apiClient.post('/update-publish-date', {
        id: articleId,
        publishDate: newDate.toISOString(),
        site: currentSite,
        email: siteSettings?.email || impersonatedSite?.email || email
      });

      if (response.data.success) {
        setArticles(prev => prev.map(a => a.id === articleId ? { ...a, publishDate: newDate.toISOString() } : a));
        setEditingDateId(null);
        setToast('Article date updated');
      } else {
        setErrorToast("We couldn't change that date. It's unchanged. Try again in a moment.");
      }
    } catch (error) {
      console.error('Error updating article date:', error);
      setErrorToast("We couldn't change that date. It's unchanged. Try again in a moment.");
    }
  };

  const handleSelectAll = (e) => {
    if (e?.target?.checked) setSelectedArticles(filteredArticles.map(a => a.id.$oid || a.id));
    else setSelectedArticles([]);
  };

  const handleSelectArticle = (id, checked) => {
    if (checked) setSelectedArticles(prev => [...prev, id]);
    else setSelectedArticles(prev => prev.filter(x => x !== id));
  };

  // Perform the bulk delete once confirmed.
  const performBulkDelete = async (targets) => {
    const blogIds = targets.map(a => a.id.$oid || a.id);
    try {
      setIsDeleting(true);
      const response = await apiClient.put('/bulk-delete-premises', {
        email: siteSettings?.email || impersonatedSite?.email || email,
        siteDomain: changedSite?.site,
        blogIds
      });

      if (response.data.success) {
        setArticles(prev => prev.filter(a => !blogIds.includes(a.id.$oid || a.id)));
        setSelectedArticles([]);
        setToast(`${blogIds.length} article${blogIds.length === 1 ? '' : 's'} deleted`);
      } else {
        setErrorToast('We could not delete those articles. Nothing was deleted. Try again.');
      }
    } catch (error) {
      console.error('Error bulk deleting articles:', error);
      setErrorToast('We could not delete those articles. Nothing was deleted. Try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = () => {
    const targets = articles
      .filter(a => selectedArticles.includes(a.id.$oid || a.id) && (a?.blogStatus !== "published" || !a?.published));
    if (targets.length === 0) return;

    // How many of these are already-written articles that cost a credit? That
    // raises the stakes, so name it in the confirm copy.
    const writtenCount = targets.filter(a => a.hasContent).length;
    const n = targets.length;
    const body = writtenCount > 0
      ? `Delete ${n} article${n === 1 ? '' : 's'}? ${writtenCount} ${writtenCount === 1 ? 'is' : 'are'} already written and used ${writtenCount === 1 ? '1 credit' : `${writtenCount} credits`}. This can't be undone.`
      : `Delete ${n} scheduled article${n === 1 ? '' : 's'}? This can't be undone.`;

    setConfirmDialog({
      title: 'Delete selected articles?',
      body,
      confirmLabel: `Delete ${n}`,
      onConfirm: () => { setConfirmDialog(null); performBulkDelete(targets); },
    });
  };

  // Actually fire the delete for a single row. `silent` suppresses the success
  // toast for the deferred premise-undo path (the row is already gone from view
  // and the Undo toast already spoke).
  const performCancelPosting = async (blogId, { silent = false } = {}) => {
    try {
      setDeletingArticleId(blogId);
      const response = await apiClient.put('/cancel-blog-posting', {
        email: siteSettings?.email || impersonatedSite?.email || email,
        siteDomain: changedSite?.site,
        blogId
      });

      if (response.data.success) {
        setArticles(prev => prev.filter(a => (a.id.$oid || a.id) !== blogId));
        if (!silent) setToast('Article deleted');
      } else {
        setErrorToast('We could not delete that article. It is unchanged. Try again.');
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      setErrorToast('We could not delete that article. It is unchanged. Try again.');
    } finally {
      setDeletingArticleId(null);
    }
  };

  const handleCancelPosting = (blogId) => {
    const article = articles.find(a => (a.id?.$oid || a.id) === blogId);
    // Already-written article cost a credit: never delete on one click, confirm.
    if (article?.hasContent) {
      setConfirmDialog({
        title: 'Delete this article?',
        body: "Delete this article? It's already written and used 1 credit. This can't be undone.",
        confirmLabel: 'Delete',
        onConfirm: () => { setConfirmDialog(null); performCancelPosting(blogId); },
      });
      return;
    }
    // Premise-only row: cheap and unwritten, so remove it from view optimistically
    // and offer an Undo. We DEFER the real server delete until the undo window
    // closes, so tapping Undo is a true no-op rollback (nothing was deleted yet).
    if (!article) return;
    setArticles(prev => prev.filter(a => (a.id?.$oid || a.id) !== blogId));
    setSelectedArticles(prev => prev.filter(x => x !== blogId));

    const commit = setTimeout(() => {
      undoDeleteRef.current = null;
      performCancelPosting(blogId, { silent: true }).catch(() => {});
    }, 5000);

    undoDeleteRef.current = {
      undo: () => {
        clearTimeout(commit);
        undoDeleteRef.current = null;
        setArticles(prev => (prev.some(a => (a.id?.$oid || a.id) === blogId) ? prev : [...prev, article]));
        setToast('Restored to your plan');
      },
    };

    setToast({ message: 'Removed from your plan', tone: 'undo' });
  };

  const handleExport = async () => {
    if (isExporting) return;
    // Selection ids are normalized ($oid -> raw), and so is each article's id, so
    // the filter actually matches. The old code compared raw a.id against a
    // normalized selection set and could silently export 0 rows. `hasContent` is
    // the list flag now (blogContent bodies are no longer shipped with the list).
    const eArticles = articles.filter(a =>
      selectedArticles.includes(a.id?.$oid || a.id) && a?.hasContent
    );

    // Nothing with content selected: say so honestly instead of claiming success.
    if (eArticles.length === 0) {
      setErrorToast('Only generated articles can be exported. Select at least one with content.');
      return;
    }

    // Export bodies aren't in the list anymore — fetch each selected article's
    // content on click, with a small concurrency cap so a big selection doesn't
    // fire hundreds of requests at once.
    setIsExporting(true);
    const contentById = {};
    try {
      const CONCURRENCY = 5;
      for (let i = 0; i < eArticles.length; i += CONCURRENCY) {
        const batch = eArticles.slice(i, i + CONCURRENCY);
        const fetched = await Promise.all(
          batch.map(a => fetchBlogContent(a.id?.$oid || a.id))
        );
        batch.forEach((a, j) => { contentById[a.id?.$oid || a.id] = fetched[j] || {}; });
      }
    } catch (error) {
      console.error('Error fetching content for export:', error);
      setErrorToast("We couldn't export those articles. Try again in a moment.");
      setIsExporting(false);
      return;
    }
    setIsExporting(false);

    const headers = ['Title', 'Slug', 'Image', 'Content', 'Summary', 'Date'];
    const rows = eArticles.map(a => {
      const fetched = contentById[a.id?.$oid || a.id] || {};
      const body = fetched.blogContent || '';
      return {
        // Same fallback chain the table uses so the Title column is never blank.
        title: resolveTitle(a).text,
        slug: a?.slug || '',
        image: a?.imageUrl || '',
        content: body ? `"${body.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '')}"` : '',
        summary: fetched.articleSummary || '',
        date: a?.publishDate ? new Date(a.publishDate).toISOString() : '',
      };
    });

    const csvContent = [headers.join(','), ...rows.map(r => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${currentSite || (user.sites?.length && user.sites[0])}-${timestamp}.csv`;
    link.download = filename;
    link.click();
    setIsExportDialogOpen(true);
    setMessage(`${eArticles.length} article${eArticles.length === 1 ? '' : 's'} exported as ${filename}`);
  };

  const handleRepublish = async (article) => {
    try {
      const id = article.id.$oid || article.id;
      const response = await apiClient.post('/republish-article', {
        id, site: currentSite, email: siteSettings?.email || impersonatedSite?.email || email
      });
      if (response.data.success) {
        setToast('Article republished successfully');
      } else {
        setErrorToast("We couldn't republish that to your site. Nothing changed. Try again or check your website connection in Settings.");
      }
    } catch (error) {
      console.error('Error republishing article:', error);
      setErrorToast("We couldn't republish that to your site. Nothing changed. Try again or check your website connection in Settings.");
    }
  };

  const handlePublish = async (article) => {
    try {
      const id = article.id.$oid || article.id;
      const response = await apiClient.post('/publish-draft', {
        id, site: currentSite, email: siteSettings?.email || impersonatedSite?.email || email
      });
      if (response.data.success) {
        setToast('Draft published successfully');
        await fetchArticles();
        fetchPlan({ force: true });
      } else {
        setErrorToast("We couldn't publish that to your site. Nothing was published. Try again or check your website connection in Settings.");
      }
    } catch (error) {
      console.error('Error publishing draft:', error);
      setErrorToast("We couldn't publish that to your site. Nothing was published. Try again or check your website connection in Settings.");
    }
  };

  // ---- Content Plan actions (calendar) ----
  // Stable references so hooks depending on them don't re-run every render.
  const planEntries = useMemo(() => plan?.entries || [], [plan]);
  const planSuggestions = useMemo(() => plan?.suggestions || [], [plan]);

  // Preview opens the same window the list uses.
  const handlePlanPreview = useCallback((entry) => {
    const id = entry.id?.$oid || entry.id;
    window.open(`/preview/${currentSite || email}/${id}`, '_blank');
  }, [currentSite, email]);

  // Edit on a calendar card -> reuse the list's edit modal. Plan entries carry
  // blogContent as a boolean presence flag, not the list's hasContent; without
  // mapping it, handleEdit would skip the content fetch and open a blank
  // editor whose save wipes the published body.
  const handlePlanEdit = (entry) => handleEdit({ ...entry, hasContent: !!entry.blogContent });

  // Generate now on a calendar card -> reuse the confirm modal path.
  const handlePlanGenerate = useCallback((entry) => {
    if (trialLimitReached) {
      setErrorToast('You have used all your trial articles. Upgrade to keep generating.');
      return;
    }
    const id = entry.id?.$oid || entry.id;
    setArticleToGenerate({ id, index: null, entry });
    setShowGenerateConfirmation(true);
  }, [trialLimitReached, setErrorToast]);

  // Optimistically move an entry's publishDate; roll back on failure.
  const handleReschedule = useCallback(async (id, newISODate) => {
    const prevPlan = plan;
    setPlan(p => p ? {
      ...p,
      entries: p.entries.map(e => (e.id?.$oid || e.id) === id ? { ...e, publishDate: newISODate } : e)
    } : p);
    try {
      const res = await apiClient.patch(`/api/plan/${currentSite}/entry/${id}`, { publishDate: newISODate });
      if (!res.data?.success) throw new Error(res.data?.message || 'move failed');
      invalidatePlan();
      setArticles(prev => prev.map(a => (a.id?.$oid || a.id) === id ? { ...a, publishDate: newISODate } : a));
      setToast('Moved');
      return true;
    } catch (err) {
      setPlan(prevPlan);
      setToast(err.response?.data?.message || 'Could not move that one');
      return false;
    }
  }, [plan, currentSite, invalidatePlan, setToast]);

  // Remove an entry from the plan (delete blogs row for non-published).
  const handlePlanRemove = useCallback(async (entry) => {
    const id = entry.id?.$oid || entry.id;
    const prevPlan = plan;
    setPlan(p => p ? { ...p, entries: p.entries.filter(e => (e.id?.$oid || e.id) !== id) } : p);
    try {
      const res = await apiClient.delete(`/api/plan/${currentSite}/entry/${id}`);
      if (!res.data?.success) throw new Error(res.data?.message);
      invalidatePlan();
      setArticles(prev => prev.filter(a => (a.id?.$oid || a.id) !== id));
      setToast('Removed from plan');
    } catch (err) {
      setPlan(prevPlan);
      setToast(err.response?.data?.message || 'Could not remove');
    }
  }, [plan, currentSite, invalidatePlan, setToast]);

  // Patch (title/keyword) from the drawer -> reflect in plan + articles.
  const handlePlanPatched = useCallback((id, patch) => {
    invalidatePlan();
    setPlan(p => p ? { ...p, entries: p.entries.map(e => (e.id?.$oid || e.id) === id ? { ...e, ...patch } : e) } : p);
    setArticles(prev => prev.map(a => (a.id?.$oid || a.id) === id ? { ...a, ...patch } : a));
  }, [invalidatePlan]);

  const handlePlanDeleted = useCallback((id) => {
    invalidatePlan();
    setPlan(p => p ? { ...p, entries: p.entries.filter(e => (e.id?.$oid || e.id) !== id) } : p);
    setArticles(prev => prev.filter(a => (a.id?.$oid || a.id) !== id));
  }, [invalidatePlan]);

  // Swap topic on an existing entry (keyword + title). The keyword swap runs
  // through the intent guard, which can return a blocked body
  // ({ blocked:'intent-owned', owner, message }) when the site already ranks
  // for the new keyword. On blocked we KEEP the old keyword and RETURN the
  // blocked outcome so the drawer can show the owner inline and stay open.
  // Never apply the patch, never look like an error.
  const handleSwapTopic = useCallback(async (entry, choice) => {
    const id = entry.id?.$oid || entry.id;
    try {
      const body = { keyword: choice.keyword };
      if (choice.title) body.title = choice.title;
      // Ship the picked option's metrics so the server stores them with the
      // new keyword instead of carrying the old keyword's stale numbers.
      if (choice.searchVolume != null) body.searchVolume = choice.searchVolume;
      if (choice.difficulty != null) body.difficulty = choice.difficulty;
      if (choice.intent) body.intent = choice.intent;
      const res = await apiClient.patch(`/api/plan/${currentSite}/entry/${id}`, body);
      if (res.data?.blocked) {
        // Let the drawer keep itself open and show the owner inline.
        return { blocked: true, owner: res.data.owner || null, message: res.data.message || null };
      }
      if (res.data?.success) {
        invalidatePlan();
        // The server regenerates the title when the picked option has none
        // (cluster picks), so prefer the picked title, then the server's.
        const serverTitle = res.data.entry?.title || null;
        handlePlanPatched(id, {
          keyword: choice.keyword,
          ...(choice.title || serverTitle ? { title: choice.title || serverTitle } : {}),
          // Optimistic metrics so the card/drawer show the new keyword's
          // numbers immediately; the next plan fetch brings the full record.
          seoMetrics: {
            targetKeyword: choice.keyword,
            ...(choice.searchVolume != null ? { searchVolume: choice.searchVolume } : {}),
            ...(choice.difficulty != null ? { difficulty: choice.difficulty } : {}),
            ...(choice.intent ? { intent: choice.intent } : {}),
          },
          // The old topic's rationale and traffic projection describe the OLD
          // keyword; blank them rather than show a mixed old/new card. The
          // next plan fetch recomputes both from the new metrics.
          why: null,
          upside: null,
        });
        setToast('Topic swapped');
        return { success: true };
      }
      setToast(res.data?.message || 'Could not swap');
      return { success: false };
    } catch (err) {
      setToast(err.response?.data?.message || 'Could not swap');
      return { success: false };
    }
  }, [currentSite, handlePlanPatched, invalidatePlan, setToast]);

  // Suggestions no longer render as accept/dismiss ghosts: autopilot (the
  // weekly replenish) schedules them itself and marks fresh auto-adds
  // "Added by Blawgy" on the card, with the normal remove/undo as the veto.

  // Generate a fresh plan. Gives the walkthrough a MINIMUM display arc so it
  // never barely-flashes when the engine returns fast (guard blocks most
  // candidates on a mature site). We hold `generatingPlan` true until BOTH the
  // POST has resolved AND the min arc has elapsed, then reveal results. The
  // generate summary (scheduled / refreshSuggestions counts + runway) is stashed
  // so the calendar's "Why this plan" strip can narrate the honest outcome.
  const PLAN_BUILD_MIN_MS = 8000;
  const handleGeneratePlan = useCallback(async () => {
    if (generatingPlan) return;
    setGeneratingPlan(true);
    setPlanSummary(null);
    const startedAt = Date.now();
    try {
      const res = await apiClient.post(`/api/plan/${currentSite}/generate`, {});
      // Load the fresh plan + articles while the min arc runs out.
      if (res.data?.success !== false) {
        setPlanSummary(res.data || null);
        invalidatePlan();
        await fetchPlan({ force: true });
        await fetchArticles();
      } else {
        setToast(res.data?.message || 'Could not build the plan');
      }
      // Hold the walkthrough until the minimum arc has passed.
      const remaining = PLAN_BUILD_MIN_MS - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
    } catch (err) {
      setToast(err.response?.data?.message || 'Could not build the plan');
    } finally {
      setGeneratingPlan(false);
    }
  }, [generatingPlan, currentSite, fetchPlan, fetchArticles, invalidatePlan, setToast]);

  // Pause / resume the plan (optimistic).
  const handleTogglePause = useCallback(async () => {
    const next = !paused;
    setPaused(next);
    try {
      const res = await apiClient.post(`/api/plan/${currentSite}/${next ? 'pause' : 'resume'}`);
      if (res.data?.success === false) throw new Error();
      invalidatePlan();
      setToast(next ? 'Plan paused' : 'Plan resumed');
    } catch (err) {
      setPaused(!next);
      setToast('Could not update the plan');
    }
  }, [paused, currentSite, invalidatePlan, setToast]);

  // Merge Strategy-panel changes into the local plan config so the header /
  // board reflect them immediately (postsPerWeek, horizon, autoRenew, priorities).
  const handleStrategyChange = useCallback((patch) => {
    setPlan(p => (p ? { ...p, config: { ...(p.config || {}), ...patch } } : p));
  }, []);

  const handleUpgrade = useCallback(() => {
    setShowSubscriptionModal(true);
  }, [setShowSubscriptionModal]);

  // Does the site already have a future (non-published) scheduled entry? If so
  // there's a live plan and we must NOT auto-generate over it.
  const hasFutureScheduled = useMemo(() => {
    const now = Date.now();
    return (planEntries || []).some((e) => {
      if (!e.publishDate || e.blogStatus === 'published') return false;
      const t = new Date(e.publishDate).getTime();
      return !Number.isNaN(t) && t >= now;
    });
  }, [planEntries]);

  // ---- Auto-start the plan FOR them (zero-effort default) ----
  // When the Content Plan opens for a site that HAS research supply (runway shows
  // net-new candidates) but NO future scheduled entries and NO active generation,
  // kick off generation automatically so the walkthrough plays and the calendar
  // fills itself. Gated once per site per day via a localStorage stamp, and once
  // per mount via a ref, so reruns/edge cases still fall back to the hero button.
  useEffect(() => {
    if (!currentSite || isMockMode()) return;
    if (planLoading || generatingPlan) return;
    if (!plan) return;                         // need the view before deciding
    if (hasFutureScheduled) return;            // a live plan already exists
    if (autoGenTriedRef.current === currentSite) return;
    // Only auto-start when there is genuinely net-new supply to schedule from.
    const netNew = plan?.runway?.netNewCandidates || 0;
    if (netNew <= 0) return;

    const stampKey = `planAutoGen:${currentSite}`;
    const today = new Date().toISOString().slice(0, 10);
    let stamped = null;
    try { stamped = localStorage.getItem(stampKey); } catch (_) { /* noop */ }
    if (stamped === today) return;             // already auto-started today

    autoGenTriedRef.current = currentSite;
    try { localStorage.setItem(stampKey, today); } catch (_) { /* noop */ }
    handleGeneratePlan();
  }, [currentSite, plan, planLoading, generatingPlan, hasFutureScheduled, handleGeneratePlan]);

  // Reset the per-mount auto-gen guard when the site changes so switching sites
  // re-evaluates the trigger for the new site.
  useEffect(() => {
    if (autoGenTriedRef.current && autoGenTriedRef.current !== currentSite) {
      autoGenTriedRef.current = null;
    }
  }, [currentSite]);

  // On site change, commit any pending premise-undo immediately (the row is no
  // longer visible to undo) so the deferred delete still runs.
  useEffect(() => () => {
    if (undoDeleteRef.current) { undoDeleteRef.current = null; }
  }, [currentSite]);

  // Computed values
  const filteredArticles = useMemo(() => {
    if (!articles || !Array.isArray(articles)) return [];
    const base = articles.filter(a => a.blogStatus !== 'cancelled');

    let list;
    switch (statusFilter) {
      case 'published': list = base.filter(a => a.hasContent && a.blogStatus === 'published'); break;
      case 'generated': list = base.filter(a => a.hasContent && a.blogStatus === 'generated'); break;
      case 'cms_draft': list = base.filter(a => a.blogStatus === 'cms_draft'); break;
      case 'failed': list = base.filter(a => a.blogStatus === 'failed'); break;
      // "Upcoming" = genuinely waiting to be written. Failed / processing /
      // written / draft each have their own home, so this bucket no longer
      // silently absorbs them (mutually exclusive buckets).
      case 'scheduled': list = base.filter(a =>
        a.blogStatus !== 'published' && a.blogStatus !== 'cms_draft' &&
        a.blogStatus !== 'failed' && a.blogStatus !== 'generated' &&
        a.blogStatus !== 'generating' && a.blogStatus !== 'in_queue'); break;
      case 'processing': list = base.filter(a => a.blogStatus === 'generating' || a.blogStatus === 'in_queue'); break;
      default: list = base;
    }

    return list.sort((a, b) => {
      const isProcessingA = a.blogStatus === 'generating' || a.blogStatus === 'in_queue';
      const isProcessingB = b.blogStatus === 'generating' || b.blogStatus === 'in_queue';

      if (statusFilter === 'all') {
        if (isProcessingA && !isProcessingB) return -1;
        if (!isProcessingA && isProcessingB) return 1;
        return new Date(b.publishDate || 0) - new Date(a.publishDate || 0);
      }
      if (statusFilter === 'published') return new Date(b.publishDate || 0) - new Date(a.publishDate || 0);
      if (!a.publishDate && !b.publishDate) return 0;
      if (!a.publishDate) return -1;
      if (!b.publishDate) return 1;
      return new Date(a.publishDate) - new Date(b.publishDate);
    });
  }, [articles, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts = { all: 0, scheduled: 0, generated: 0, cms_draft: 0, processing: 0, published: 0, failed: 0 };
    if (!Array.isArray(articles)) return counts;
    articles.forEach(a => {
      if (a.blogStatus === 'cancelled') return;
      counts.all += 1;
      if (a.blogStatus === 'published') counts.published += 1;
      else if (a.blogStatus === 'generated') counts.generated += 1;
      else if (a.blogStatus === 'cms_draft') counts.cms_draft += 1;
      else if (a.blogStatus === 'failed') counts.failed += 1;
      else if (a.blogStatus === 'generating' || a.blogStatus === 'in_queue') counts.processing += 1;
      // Everything left over is genuinely upcoming. Buckets are now exclusive so
      // the tab counts add up to the "All" total.
      else counts.scheduled += 1;
    });
    return counts;
  }, [articles]);

  // Plan header stats (scheduled / writing / published) computed from articles
  // so they stay live during generation polling.
  const planStats = useMemo(() => {
    const s = { scheduled: 0, writing: 0, published: 0 };
    (articles || []).forEach(a => {
      if (a.blogStatus === 'cancelled') return;
      if (a.blogStatus === 'published') s.published += 1;
      else if (a.blogStatus === 'generating' || a.blogStatus === 'in_queue') s.writing += 1;
      else s.scheduled += 1;
    });
    return s;
  }, [articles]);

  const publishedCount = useMemo(() => articles?.filter(a => a.blogStatus === 'published').length || 0, [articles]);
  const unpublishedCount = useMemo(() => articles?.filter(a => a.blogStatus !== 'published').length || 0, [articles]);
  const cadence = plan?.config?.postsPerWeek;

  const getPageTitle = () => {
    switch (statusFilter) {
      case 'published': return 'Published Articles';
      case 'generated': return 'Generated Articles';
      case 'cms_draft': return 'Drafts';
      case 'scheduled': return 'Upcoming Articles';
      case 'processing': return 'Processing Articles';
      case 'failed': return 'Failed Articles';
      default: return 'All Articles';
    }
  };

  const getPageDescription = () => {
    if (loading) return 'Loading your articles...';
    switch (statusFilter) {
      case 'published': return 'Your published articles, ready to drive traffic from Google to your site';
      case 'scheduled': return `${statusCounts.scheduled} article${statusCounts.scheduled === 1 ? '' : 's'} waiting to be written on their scheduled dates`;
      case 'generated': return `${statusCounts.generated} generated articles waiting for review`;
      case 'cms_draft': return `${statusCounts.cms_draft} drafts on your site waiting to be reviewed and published`;
      case 'processing': return `${statusCounts.processing} articles currently processing`;
      case 'failed': return `${statusCounts.failed} article${statusCounts.failed === 1 ? '' : 's'} that couldn't finish. See why below and retry.`;
      default: return `${unpublishedCount} articles scheduled for publishing`;
    }
  };

  return (
    <>
      {impersonatedSite && <ImpersonationBanner />}
      <NavbarWrapper
        user={user}
        logout={logout}
        onShowBulkGenerate={() => setShowBulkGenerateModal(true)}
        onShowImageStyle={() => setShowImageStyleModal(true)}
        onShowSupport={() => setShowSupportModal(true)}
        onShowAdmin={() => setShowAdminPanel(true)}
        onShowSubscription={() => setShowSubscriptionModal(true)}
        updateCurrentSite={updateCurrentSite}
        currentSite={changedSite}
      >
        <div className="flex flex-1 h-[calc(100vh-64px)] lg:h-screen relative">
          {/* Mobile navigation */}
          <div className="fixed bottom-0 left-0 right-0 bg-primary text-white p-4 flex justify-between items-center lg:hidden">
            <p className="text-sm">Support: adam@blawgy.com 😊</p>
            <button className="flex items-center text-sm" onClick={logout}>
              <LogOutIcon className="mr-2" size={18} />
              Log out
            </button>
          </div>

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-12 lg:pt-8 overflow-auto pb-20 lg:pb-12">
            <div className="max-w-full">
              {/* ===== Content Plan sticky header ===== */}
              <div className="sticky top-0 z-30 -mx-4 lg:-mx-12 px-4 lg:px-12 pt-1 pb-3 bg-white/90 backdrop-blur border-b border-gray-100 mb-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-xl lg:text-2xl font-bold">Content Plan</h2>
                      {/* Pause moved into the overflow menu; the pill keeps the
                          paused state visible at a glance. */}
                      {paused && plan?.config?.hasPlan && (
                        <span
                          data-testid="paused-pill"
                          className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                        >
                          <PauseIcon size={11} /> Paused
                        </span>
                      )}
                      {/* Counts demoted to quiet secondary text; the payoff
                          sentence below is the headline. */}
                      <span className="hidden sm:inline text-xs text-slate-500 tabular-nums" data-testid="plan-counts">
                        {planStats.scheduled} scheduled · {planStats.writing} writing · {planStats.published} published
                      </span>
                    </div>
                    {/* Payoff sentence, in unison with the cards: pace + what
                        the targeted keywords are worth if the plan lands. */}
                    {cadence ? (
                      <p className="mt-0.5 text-sm text-slate-600" data-testid="plan-payoff">
                        {plan?.projection?.high > 0
                          ? `Publishing ${cadence} article${cadence === 1 ? '' : 's'} a week, targeting keywords worth up to ~${Number(plan.projection.high).toLocaleString()} visits a month.`
                          : `Publishing ${cadence} article${cadence === 1 ? '' : 's'} a week on autopilot.`}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Tooltip content="Open the welcome walkthrough">
                      <button
                        onClick={() => startTour(TOUR_TYPES.MAIN)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                        data-testid="welcome-tour-start"
                      >
                        <PlayCircle size={15} />
                        <span className="hidden sm:inline">Start welcome tour</span>
                      </button>
                    </Tooltip>
                    {/* Strategy: configure posting pace, horizon, topics */}
                    <Tooltip content="Configure your content strategy">
                      <button
                        onClick={() => setShowStrategy(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                        data-testid="strategy-button"
                      >
                        <SlidersHorizontal size={15} />
                        <span className="hidden sm:inline">Strategy</span>
                      </button>
                    </Tooltip>

                    {/* Calendar | List | Updates segmented control (icon-only) */}
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                      <Tooltip content="Calendar view">
                        <button
                          onClick={() => setView('calendar')}
                          aria-label="Calendar view"
                          className={`flex items-center rounded-md px-2.5 py-1.5 transition-colors ${
                            view === 'calendar' ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <LayoutGrid size={16} />
                        </button>
                      </Tooltip>
                      <Tooltip content="List view">
                        <button
                          onClick={() => setView('list')}
                          aria-label="List view"
                          className={`flex items-center rounded-md px-2.5 py-1.5 transition-colors ${
                            view === 'list' ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <List size={16} />
                        </button>
                      </Tooltip>
                      <Tooltip content="Article updates">
                        <button
                          onClick={() => setView('updates')}
                          aria-label="Article updates"
                          className={`flex items-center rounded-md px-2.5 py-1.5 transition-colors ${
                            view === 'updates' ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <RefreshCw size={16} />
                        </button>
                      </Tooltip>
                    </div>

                    {/* More overflow (Pause + Bulk schedule live here now) */}
                    <div className="relative" ref={moreMenuRef}>
                      <button
                        onClick={() => setShowMoreMenu(v => !v)}
                        className="flex items-center justify-center p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                        aria-label="More actions"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {showMoreMenu && (
                        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-40 overflow-hidden">
                          {plan?.config?.hasPlan && (
                            <button
                              data-testid="pause-toggle-button"
                              onClick={() => { setShowMoreMenu(false); handleTogglePause(); }}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50"
                            >
                              {paused
                                ? <PlayIcon size={15} className="text-gray-400" />
                                : <PauseIcon size={15} className="text-gray-400" />}
                              {paused ? 'Resume publishing' : 'Pause publishing'}
                            </button>
                          )}
                          <button
                            data-testid="bulk-schedule-button"
                            onClick={() => { setShowMoreMenu(false); setShowBulkGenerateModal(true); }}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50"
                          >
                            <CalendarIcon size={15} className="shrink-0 text-gray-400" />
                            Schedule articles from your own keywords
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Trial Limit Reached Banner - only show when limit is hit */}
              {trialLimitReached && (
                <div className="mb-4 p-4 rounded-lg border bg-red-50 border-red-200">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm font-medium text-red-800">
                      Trial limit reached - Upgrade to continue generating articles
                    </span>
                    <button
                      onClick={() => navigate('/settings/subscription')}
                      className="text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors bg-red-600 text-white hover:bg-red-700"
                    >
                      Upgrade Now
                    </button>
                  </div>
                </div>
              )}

              {/* ===== Body: Calendar or List ===== */}
              {view === 'calendar' ? (
                (loading || planLoading) && !plan ? (
                  <SkeletonLoader />
                ) : planLoadError && !plan ? (
                  // Load failed with nothing cached: offer a retry. Never fall
                  // through to the "no plan" hero, that hides a real calendar and
                  // its "Plan my next month" button would build a duplicate plan.
                  <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                    <h3 className="text-lg font-bold text-slate-900">Couldn't load your calendar</h3>
                    <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
                      Your posts are safe. This was a loading hiccup, not an empty plan.
                    </p>
                    <button
                      onClick={() => fetchPlan({ force: true })}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <PlanCalendar
                    site={currentSite}
                    entries={planEntries}
                    suggestions={planSuggestions}
                    trial={plan?.trial}
                    loading={loading || planLoading}
                    onReschedule={handleReschedule}
                    onGenerate={handlePlanGenerate}
                    onPreview={handlePlanPreview}
                    onPublish={handlePublish}
                    onEdit={handlePlanEdit}
                    onRemove={handlePlanRemove}
                    onPatched={handlePlanPatched}
                    onDeleted={handlePlanDeleted}
                    onSwapTopic={handleSwapTopic}
                    onGoToKeywords={() => navigate('/keyword-finder')}
                    onAddTopics={() => setShowAddTopics(true)}
                    onGeneratePlan={handleGeneratePlan}
                    generatingPlan={generatingPlan}
                    planSummary={planSummary}
                    runway={plan?.runway}
                    projection={plan?.projection}
                    config={plan?.config}
                    onUpgrade={handleUpgrade}
                    toast={setToast}
                  />
                )
              ) : view === 'updates' ? (
                <PlanUpdates site={currentSite} toast={setToast} />
              ) : (
                <>
                  {/* List sub-header: filters + selection actions (preserved) */}
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4">
                    <div className="flex-1 w-full">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full">
                        <div>
                          <h3 className="text-lg font-bold text-left mb-1">{getPageTitle()}</h3>
                          <p className="text-sm text-gray-500 text-left mb-2">{getPageDescription()}</p>
                        </div>
                        {selectedArticles.length > 0 && (
                          <div className="flex items-center gap-3 mt-2 lg:mt-0">
                            <span className="text-sm text-gray-600 font-medium">{selectedArticles.length} selected</span>
                            <div className="h-6 w-px bg-gray-300" />
                            <Tooltip content={isDeleting ? "Deleting..." : "Delete selected articles"}>
                              <button
                                className={`flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                                  isDeleting ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                                onClick={handleBulkDelete}
                                disabled={isDeleting}
                              >
                                {isDeleting ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <Trash2Icon className="h-4 w-4" />}
                              </button>
                            </Tooltip>
                            {bulkGenerateEligible.length > 0 && (
                              <Tooltip content={`Generate ${bulkGenerateEligible.length} article${bulkGenerateEligible.length > 1 ? 's' : ''}`}>
                                <button
                                  className="flex items-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-all duration-200"
                                  onClick={() => setShowBulkGenerateConfirmation(true)}
                                  disabled={bulkGenerating}
                                >
                                  {bulkGenerating ? <LoaderIcon className="mr-2 h-4 w-4 animate-spin" /> : <Wand2Icon className="mr-2 h-4 w-4" />}
                                  Generate {bulkGenerateEligible.length}
                                </button>
                              </Tooltip>
                            )}
                            <Tooltip content="Export selected articles">
                              <button
                                className="flex items-center px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleExport}
                                disabled={isExporting}
                              >
                                {isExporting
                                  ? <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                                  : <Download className="mr-2 h-4 w-4" />}
                                {isExporting ? 'Exporting…' : 'Export'}
                              </button>
                            </Tooltip>
                          </div>
                        )}
                      </div>
                      <div data-tour="status-tabs" className="flex items-center gap-2 flex-wrap mt-3">
                        {[
                          { key: 'all', label: 'All' },
                          { key: 'scheduled', label: 'Upcoming' },
                          { key: 'processing', label: 'Processing' },
                          { key: 'generated', label: 'Generated' },
                          { key: 'cms_draft', label: 'Drafts' },
                          { key: 'published', label: 'Published' },
                          // Failed only earns a tab when there's something in it.
                          ...(statusCounts.failed > 0 ? [{ key: 'failed', label: 'Failed' }] : []),
                        ].map(tab => (
                          <button
                            key={tab.key}
                            onClick={() => setStatusFilter(tab.key)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center h-10 transition-all duration-200 ${
                              statusFilter === tab.key
                                ? 'bg-gray-200 text-gray-900'
                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                            }`}
                          >
                            <span>{tab.label}</span>
                            <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full leading-none ${
                              statusFilter === tab.key ? 'bg-gray-400 text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {statusCounts[tab.key]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {loading ? (
                    <SkeletonLoader />
                  ) : articlesLoadError && articles.length === 0 ? (
                    // A failed list load must NOT look like "you have no articles".
                    <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
                      <p className="text-base font-semibold text-amber-900">We couldn't load your articles.</p>
                      <p className="mt-1 text-sm text-amber-800">They're safe, this is a loading hiccup.</p>
                      <button
                        onClick={() => fetchArticles()}
                        className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  ) : !loading && articles.length === 0 ? (
                    <EmptyDashboard onStartBulkGenerate={() => setShowBulkGenerateModal(true)} />
                  ) : (
                    <ArticlesTable
                      articles={filteredArticles}
                      selectedArticles={selectedArticles}
                      statusFilter={statusFilter}
                      showPublished={showPublished}
                      publishedCount={publishedCount}
                      user={user}
                      currentSite={currentSite}
                      email={email}
                      onSelectAll={handleSelectAll}
                      onSelectArticle={handleSelectArticle}
                      onRowClick={handleRowClick}
                      onEdit={handleEdit}
                      onGenerate={(article, index) => {
                        if (trialLimitReached) {
                          setErrorToast('You have used all your trial articles. Upgrade to keep generating.');
                          return;
                        }
                        setArticleToGenerate({ id: article.id, index, entry: article });
                        setShowGenerateConfirmation(true);
                      }}
                      onDelete={handleCancelPosting}
                      deletingArticleId={deletingArticleId}
                      onRepublish={handleRepublish}
                      onPublish={handlePublish}
                      editingDateId={editingDateId}
                      datePickerPosition={datePickerPosition}
                      onDateClick={handleDateClick}
                      onDateChange={handleDateChange}
                      onDatePickerClose={() => setEditingDateId(null)}
                      trialLimitReached={trialLimitReached}
                    />
                  )}
                </>
              )}
            </div>
          </main>

          {/* Modals */}
          {selectedArticle && (
            <ArticleEditor
              article={selectedArticle}
              title={editedTitle}
              keywords={editedKeywords}
              content={editedContent}
              isLoading={editContentLoading}
              isSaving={isSaving}
              liveSync={LIVE_SYNC_TYPES.includes(user?.blogType)}
              onTitleChange={setEditedTitle}
              onKeywordsChange={setEditedKeywords}
              onContentChange={setEditedContent}
              onClose={() => { setSelectedArticle(null); clearPendingEdit(); }}
              onSave={handleSave}
            />
          )}

          {quickEditModal && (
            <QuickEditModal
              article={quickEditPost}
              onClose={() => setQuickEditModal(false)}
              onSave={handleQuickEdit}
              title={editedTitle}
              keywords={editedKeywords}
              onTitleChange={setEditedTitle}
              onKeywordsChange={setEditedKeywords}
              productIds={editedProductIds}
              onProductIdsChange={setEditedProductIds}
              isSaving={isSaving}
            />
          )}

          {showGenerateConfirmation && (
            <GenerateConfirmModal
              articleTitle={articleToGenerate.entry ? resolveTitle(articleToGenerate.entry).text : undefined}
              creditBalance={creditBalance}
              onClose={() => setShowGenerateConfirmation(false)}
              onConfirm={() => {
                handleGenerateBlog(articleToGenerate.id, articleToGenerate.index);
                setShowGenerateConfirmation(false);
              }}
            />
          )}

          {showBulkGenerateConfirmation && (
            <BulkGenerateConfirmModal
              count={bulkToGenerate.length}
              selectedCount={bulkGenerateEligible.length}
              onClose={() => setShowBulkGenerateConfirmation(false)}
              onConfirm={handleBulkGenerate}
              isGenerating={bulkGenerating}
            />
          )}

          {confirmDialog && (
            <ConfirmDialog
              title={confirmDialog.title}
              body={confirmDialog.body}
              confirmLabel={confirmDialog.confirmLabel}
              onConfirm={confirmDialog.onConfirm}
              onClose={() => setConfirmDialog(null)}
            />
          )}

          <ExportDialog
            isOpen={isExportDialogOpen}
            onClose={() => setIsExportDialogOpen(false)}
            message={message}
          />

          {showStrategy && (
            <PlanStrategyPanel
              site={currentSite}
              config={plan?.config}
              runway={plan?.runway}
              projection={plan?.projection}
              siteSettings={siteSettings}
              onClose={() => setShowStrategy(false)}
              onConfigChange={handleStrategyChange}
              onGoToKeywords={() => navigate('/keyword-finder')}
              toast={setToast}
            />
          )}

          <AddTopicsDrawer
            site={currentSite}
            open={showAddTopics}
            onClose={() => setShowAddTopics(false)}
            onAdded={() => fetchPlan({ force: true })}
            toast={setToast}
          />

          {/* Status toast. Neutral confirmations stay slate (emerald is reserved
              for genuine success). Failures get a red accent and a longer dwell
              (set in setToast) so the user can actually read what went wrong.
              The 'undo' tone carries an inline Undo button. */}
          {toast && (
            <div
              role={toast.tone === 'error' ? 'alert' : 'status'}
              aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
              className={`fixed top-4 right-4 z-[70] px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm font-medium animate-fade-in ${
                toast.tone === 'error'
                  ? 'bg-slate-900 text-white border-l-4 border-red-500'
                  : 'bg-slate-900 text-white'
              }`}
            >
              <span>{toast.message}</span>
              {toast.tone === 'undo' && (
                <button
                  onClick={() => { undoDeleteRef.current?.undo(); setToastState(null); }}
                  className="font-semibold text-emerald-300 hover:text-emerald-200 underline"
                >
                  Undo
                </button>
              )}
            </div>
          )}
        </div>
      </NavbarWrapper>
    </>
  );
};

export default Dashboard;
