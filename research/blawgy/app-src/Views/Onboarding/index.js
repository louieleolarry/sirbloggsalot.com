import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../utils/apiClient';
import { cleanDomain } from '../../utils/domainUtils';
import { auth, markIntentionalSignOut } from '../../firebaseConfig';
import {
  useOnboardingStyles,
  ProgressBar,
  Screen,
  BigInput,
  PrimaryButton,
  GhostButton,
  StatusRows,
  ElapsedCounter,
  useElapsed,
  SoftNote,
  AiFilledBadge,
  PayoffStat,
  Chip,
  BubbleSelect
} from './Primitives';
import PlanStage from './PlanStage';

/*
 * Onboarding — premium overhaul (Phase B).
 *
 * One thing per screen, Typeform-style: a thin animated progress bar, big
 * tracking-tight headlines, Enter-to-advance, live elapsed counters on every
 * background wait, pulsing status rows while the crawl streams, real-number
 * payoff reveals, "AI auto-filled — edit anything that's off" framing on
 * prefilled fields, a 30s escape hatch on every analysis wait, soft-fail as
 * amber notes (never blockers), and full resume-on-refresh.
 *
 * The DATA collected is byte-identical to the previous flow (domain →
 * description → competitors → who-you-sell-to → mode (+ local address) →
 * audience/tone → subscribe); this is a re-pace + re-skin, not a redesign of
 * the questions. persistOnboarding() still posts the exact same
 * /onboarding/complete payload.
 *
 * The ending is new: after SUBSCRIBE the user lands on an in-onboarding
 * "Your plan is being prepared" stage (PlanStage) that fires plan generation,
 * polls, and shows a first-2-weeks preview before handing off to the calendar.
 */

// Ordered stages. STAGE drives both the render and the progress bar. LOCAL is
// conditional (only when the user picks the Local mode).
const STAGE = {
  DOMAIN: 'DOMAIN',
  ANALYZING_SITE: 'ANALYZING_SITE',
  DESCRIPTION: 'DESCRIPTION',
  MANUAL_DESC: 'MANUAL_DESC',
  COMPETITORS: 'COMPETITORS',
  AUDIENCE: 'AUDIENCE',
  MODE: 'MODE',
  LOCAL: 'LOCAL',
  TONE: 'TONE',
  SUBSCRIBE: 'SUBSCRIBE',
  PLAN: 'PLAN'
};

// Progress-bar fill per stage (0..1). MANUAL_DESC mirrors DESCRIPTION; LOCAL
// sits between MODE and TONE.
const STAGE_PROGRESS = {
  [STAGE.DOMAIN]: 0.06,
  [STAGE.ANALYZING_SITE]: 0.16,
  [STAGE.DESCRIPTION]: 0.26,
  [STAGE.MANUAL_DESC]: 0.26,
  [STAGE.COMPETITORS]: 0.42,
  [STAGE.AUDIENCE]: 0.56,
  [STAGE.MODE]: 0.68,
  [STAGE.LOCAL]: 0.74,
  [STAGE.TONE]: 0.82,
  [STAGE.SUBSCRIBE]: 0.92,
  [STAGE.PLAN]: 1.0
};

// localStorage key. Bump the suffix when the persisted shape changes so old
// state is treated as stale instead of breaking the hydrator.
// Exported (with the reader/clearer below) so SuccessPage can resume the
// PlanStage reveal after the Stripe round-trip.
export const ONBOARDING_STORAGE_KEY = 'blawgy:onboarding:v2';
// Redo drafts (?redo=1 for already-onboarded users) live under their own key
// so an in-progress first-run draft and a redo draft can never collide.
export const REDO_ONBOARDING_STORAGE_KEY = 'blawgy:onboarding:redo:v1';
const ONBOARDING_STORAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const clearSavedOnboardingState = () => {
  try { localStorage.removeItem(ONBOARDING_STORAGE_KEY); } catch { /* noop */ }
};

export const clearSavedRedoState = () => {
  try { localStorage.removeItem(REDO_ONBOARDING_STORAGE_KEY); } catch { /* noop */ }
};

// Add-a-site drafts (?add=1 for an already-onboarded user setting up a NEW site)
// live under their own key so they never collide with a first-run or redo draft.
export const ADD_ONBOARDING_STORAGE_KEY = 'blawgy:onboarding:add:v1';

export const clearSavedAddSiteState = () => {
  try { localStorage.removeItem(ADD_ONBOARDING_STORAGE_KEY); } catch { /* noop */ }
};

// Parse + validate a saved snapshot (TTL, shape, has a domain). Returns
// null when there's nothing worth restoring.
const readSavedStateForKey = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > ONBOARDING_STORAGE_TTL_MS) return null;
    // Only restore if the user got past the first screen (has a domain).
    if (!parsed.websiteUrl) return null;
    return parsed;
  } catch { return null; }
};

export const readSavedOnboardingState = () => readSavedStateForKey(ONBOARDING_STORAGE_KEY);
export const readSavedRedoState = () => readSavedStateForKey(REDO_ONBOARDING_STORAGE_KEY);
export const readSavedAddSiteState = () => readSavedStateForKey(ADD_ONBOARDING_STORAGE_KEY);

// NOTE: cleanDomain is the SHARED util (imported above), which strips protocol,
// www, PATHS, query, hash, and ports. The old local copy here kept paths, so
// onboarding with a deep URL (e.g. a store's /location/... page) poisoned
// localStorage.currentSite with a pathful "domain" — every dashboard
// /api/plan/<site>/... call then split into extra URL segments and 404'd as
// "Route not found". The backend cleans its own copy, so the DB stayed right
// while the browser broke. Never re-introduce a local cleaner here.

// Strip markdown but keep the full text (users edit it on the description
// screen, so we never truncate).
const cleanDescription = (text) => {
  if (!text) return '';
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^#+\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
};

const MODE_OPTIONS = [
  { key: 'local', title: 'Local business', desc: 'You serve a specific area, like a shop, clinic, or service.' },
  { key: 'dispensary', title: 'Dispensary', desc: 'You sell cannabis products from a licensed storefront.' },
  { key: 'ecommerce', title: 'Online store', desc: 'You sell physical products online.' },
  { key: 'saas', title: 'Software / SaaS', desc: 'You offer an app or software product.' },
  { key: 'general', title: 'Something else', desc: 'A blog, agency, or anything not listed.' }
];
const VALID_MODES = ['local', 'ecommerce', 'saas', 'general', 'dispensary'];

const Onboarding = () => {
  useOnboardingStyles();
  const navigate = useNavigate();
  const initRef = useRef(false);

  // ?redo=1 lets a fully-onboarded user walk through setup again. Nothing is
  // persisted server-side until they finish, so entering (and abandoning) the
  // redo flow changes nothing on the current site. Captured once on mount.
  const isRedoRequestRef = useRef(
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('redo') === '1'
  );

  // ?add=1 lets a fully-onboarded user set up a NEW site. Distinct from redo:
  // it starts fresh at the domain step (no prefill from the current site) and
  // runs the full flow including billing (each site is billed separately).
  const isAddRequestRef = useRef(
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('add') === '1'
  );
  // The already-onboarded user's existing sites, for the add-mode own-domain
  // pre-check (so re-entering a site you already own doesn't hit the claim path).
  const userSitesRef = useRef([]);

  // In-flight background work. Awaited directly (never read off React state,
  // which is stale inside async handlers).
  const competitorsPromiseRef = useRef(null);
  const detectionPromiseRef = useRef(null);
  const researchPromiseRef = useRef(null);

  const [hydrated, setHydrated] = useState(false);
  const [stage, setStage] = useState(STAGE.DOMAIN);

  // Form state (identical fields to the previous flow).
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [description, setDescription] = useState('');   // raw (sent to backend)
  const [editedDesc, setEditedDesc] = useState('');     // cleaned + user-editable
  const [descIsAiFilled, setDescIsAiFilled] = useState(false); // drives amber glow + badge
  const [faviconUrl, setFaviconUrl] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [competitors, setCompetitors] = useState([]);
  const [selectedCompetitors, setSelectedCompetitors] = useState([]); // auto-selected
  const [newCompetitor, setNewCompetitor] = useState('');
  const [audienceSuggestions, setAudienceSuggestions] = useState([]);
  const [toneSuggestions, setToneSuggestions] = useState([]);
  const [targetAudience, setTargetAudience] = useState([]);
  const [customAudience, setCustomAudience] = useState('');
  const [tone, setTone] = useState('');
  const [customTone, setCustomTone] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [detectedMarket, setDetectedMarket] = useState(null);
  const [businessProfileInput, setBusinessProfileInput] = useState({ address: '', city: '', state: '', postalCode: '', serviceArea: '', serviceRadiusMiles: 30 });
  // Extra physical locations the detector found on the site (beyond the one
  // shown in the inputs). User can remove any; the rest are saved as
  // additional business profiles.
  const [detectedLocations, setDetectedLocations] = useState([]);
  const [keywordPreview, setKeywordPreview] = useState(null);

  // Redo mode (already-onboarded user re-running setup via ?redo=1).
  const [redoMode, setRedoMode] = useState(false);
  const [redoOriginalSite, setRedoOriginalSite] = useState('');
  const [redoHasActiveSub, setRedoHasActiveSub] = useState(false);

  // Add-a-site mode (already-onboarded user adding a NEW site via ?add=1).
  const [addMode, setAddMode] = useState(false);
  // Recoverable note shown on the DOMAIN screen (claimed site / already-owned).
  const [domainNote, setDomainNote] = useState(null);

  // Billing / plan.
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('growth');
  const [billingPeriod, setBillingPeriod] = useState('annual');
  const [pendingCompSlug, setPendingCompSlug] = useState(null);

  // Persisted snapshot of the plan-preparation stage so a refresh mid-prepare
  // resumes the poll (done-flags live inside).
  const [planProgress, setPlanProgress] = useState(null);

  // UI transient (not persisted): busy spinners + soft-fail notes + scrape err.
  const [busy, setBusy] = useState(false);
  const [subscribeBusy, setSubscribeBusy] = useState(false);
  const [preparingResearch, setPreparingResearch] = useState(false); // interstitial between Tone and Subscribe
  const [descNote, setDescNote] = useState(null);         // amber note on description screen

  const [userEmail, setUserEmail] = useState(auth.currentUser?.email || '');

  // -------------------------------------------------------------------------
  // Header: sign-out + live email.
  // -------------------------------------------------------------------------
  const handleSignOut = async () => {
    try {
      markIntentionalSignOut();
      await auth.signOut();
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentSite');
      localStorage.removeItem('impersonatedSite');
      clearSavedOnboardingState();
      clearSavedRedoState();
    } catch (err) {
      console.error('Sign out failed:', err);
    } finally {
      navigate('/login');
    }
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUserEmail(u?.email || ''));
    return unsub;
  }, []);

  // Reposition Intercom launcher so it doesn't cover controls on mobile.
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'intercom-onboarding-fix';
    style.textContent = `
      @media (max-width: 768px) {
        .intercom-launcher, iframe[name="intercom-launcher-frame"] {
          bottom: auto !important; top: 12px !important; right: 12px !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById('intercom-onboarding-fix');
      if (el) el.remove();
    };
  }, []);

  // -------------------------------------------------------------------------
  // Init: redirect if already onboarded, else restore or start fresh.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const restore = (saved) => {
      setStage(saved.stage || STAGE.DOMAIN);
      setWebsiteUrl(saved.websiteUrl || '');
      setDescription(saved.description || '');
      setEditedDesc(saved.editedDesc || '');
      setDescIsAiFilled(!!saved.descIsAiFilled);
      setFaviconUrl(saved.faviconUrl || '');
      setManualDesc(saved.manualDesc || '');
      setCompetitors(Array.isArray(saved.competitors) ? saved.competitors : []);
      setSelectedCompetitors(Array.isArray(saved.selectedCompetitors) ? saved.selectedCompetitors : []);
      setNewCompetitor(saved.newCompetitor || '');
      setAudienceSuggestions(Array.isArray(saved.audienceSuggestions) ? saved.audienceSuggestions : []);
      setToneSuggestions(Array.isArray(saved.toneSuggestions) ? saved.toneSuggestions : []);
      setTargetAudience(Array.isArray(saved.targetAudience) ? saved.targetAudience : []);
      setCustomAudience(saved.customAudience || '');
      setTone(saved.tone || '');
      setCustomTone(saved.customTone || '');
      if (saved.businessType) setBusinessType(saved.businessType);
      if (saved.detectedMarket) setDetectedMarket(saved.detectedMarket);
      // Merge over defaults so drafts saved before newer fields existed
      // (address, serviceRadiusMiles) don't leave inputs uncontrolled.
      if (saved.businessProfileInput) setBusinessProfileInput(p => ({ ...p, ...saved.businessProfileInput }));
      if (Array.isArray(saved.detectedLocations)) setDetectedLocations(saved.detectedLocations);
      if (saved.keywordPreview) setKeywordPreview(saved.keywordPreview);
      if (saved.selectedPlan) setSelectedPlan(saved.selectedPlan);
      if (saved.billingPeriod) setBillingPeriod(saved.billingPeriod);
      if (saved.pendingCompSlug) setPendingCompSlug(saved.pendingCompSlug);
      if (saved.planProgress) setPlanProgress(saved.planProgress);

      // If we restore mid-analysis (ANALYZING_SITE), the EventSource is gone.
      // Re-kick the crawl so the user isn't stuck on a frozen progress screen.
      if ((saved.stage === STAGE.ANALYZING_SITE) && saved.websiteUrl) {
        // Defer so state is set first.
        setTimeout(() => startSiteCrawl(cleanDomain(saved.websiteUrl)), 0);
      }
      // Restoring onto DESCRIPTION but competitors never fetched → refetch so
      // the COMPETITORS screen has data.
      if (saved.stage === STAGE.DESCRIPTION && saved.websiteUrl && (!saved.competitors || saved.competitors.length === 0)) {
        const site = cleanDomain(saved.websiteUrl);
        competitorsPromiseRef.current = fetchCompetitors(site, saved.description || '');
        detectionPromiseRef.current = fetchDetection(site, saved.description || '');
      }
    };

    // Prefill every step from what the site has today (redo mode). Starts on
    // the description screen: the domain is fixed unless the user explicitly
    // switches via "Use a different website".
    const prefillFromSite = (s) => {
      const domain = cleanDomain(s.site || '');
      setWebsiteUrl(domain);
      setDescription(s.businessDescription || '');
      setEditedDesc(cleanDescription(s.businessDescription || ''));
      setDescIsAiFilled(false); // it's their saved description, not an AI guess
      if (s.faviconUrl) setFaviconUrl(s.faviconUrl);
      const comps = (Array.isArray(s.competitors) ? s.competitors : [])
        .map((c) => (c && typeof c === 'object' ? c.domain : c))
        .filter(Boolean);
      setCompetitors(comps);
      setSelectedCompetitors(comps);
      // No saved competitors → research fresh ones now, same as restore(),
      // so the COMPETITORS screen never comes up empty with no suggestions.
      // Detection only runs when the site has no saved businessType:
      // fetchDetection setState-overwrites businessType/market on resolve,
      // which would clobber the saved values seeded below.
      if (comps.length === 0 && domain) {
        competitorsPromiseRef.current = fetchCompetitors(domain, s.businessDescription || '');
        if (!s.businessType) {
          detectionPromiseRef.current = fetchDetection(domain, s.businessDescription || '');
        }
      }
      const audience = Array.isArray(s.targetAudience)
        ? s.targetAudience.filter(Boolean)
        : (s.targetAudience ? [s.targetAudience] : []);
      setTargetAudience(audience);
      // Seed the bubble options with the saved picks so they render selected
      // immediately; fetchSuggestions() merges fresh options in later.
      setAudienceSuggestions(audience);
      if (s.tone) {
        setTone(s.tone);
        setToneSuggestions([s.tone]);
      }
      if (s.businessType) setBusinessType(s.businessType);
      if (s.market) setDetectedMarket(s.market);
      const bp = s.businessProfile || {};
      setBusinessProfileInput({
        address: bp.address || '',
        city: bp.city || '',
        state: bp.state || '',
        postalCode: bp.postalCode || '',
        serviceArea: Array.isArray(bp.serviceArea) ? bp.serviceArea.join(', ') : (bp.serviceArea || ''),
        serviceRadiusMiles: bp.serviceRadiusMiles || 30
      });
      setStage(STAGE.DESCRIPTION);
    };

    // Redo entry: resolve which site to prefill from, fetch its settings +
    // subscription, then restore a same-site redo draft or prefill fresh.
    const initRedo = async (meData) => {
      let target = null;
      try {
        const raw = localStorage.getItem('currentSite');
        if (raw && raw !== 'undefined' && raw !== 'null') {
          const parsed = JSON.parse(raw);
          // cleanDomain: stored values may be pathful from the old cleaner.
          if (parsed?.site) target = { site: cleanDomain(parsed.site), email: parsed.email };
        }
      } catch { /* noop */ }
      if (!target && meData?.currentSite) target = { site: meData.currentSite, email: meData.email };
      if (!target && Array.isArray(meData?.sites) && meData.sites.length > 0) {
        const first = meData.sites[0];
        target = { site: typeof first === 'object' ? first.site : first, email: meData.email };
      }
      if (!target?.site) {
        navigate('/dashboard');
        return;
      }

      let data = null;
      try {
        const resp = await apiClient.get('/get-site-settings', {
          params: { site: target.site, email: target.email || meData?.email }
        });
        data = resp.data;
      } catch { /* handled below */ }
      if (!data?.success || !data.settings) {
        toast.error('Could not load your current setup. Please try again.');
        navigate('/dashboard');
        return;
      }

      const originalSite = cleanDomain(data.settings.site || target.site);
      setRedoMode(true);
      setRedoOriginalSite(originalSite);
      setRedoHasActiveSub(Boolean(data.subscription?.isActive || data.subscription?.isTrialing));

      // A refresh mid-redo restores the draft (same site only); otherwise
      // start from what the site has today.
      const savedRedo = readSavedRedoState();
      if (savedRedo && cleanDomain(savedRedo.redoOriginalSite || savedRedo.websiteUrl || '') === originalSite) {
        restore(savedRedo);
      } else {
        clearSavedRedoState();
        prefillFromSite(data.settings);
      }
      setHydrated(true);
    };

    const init = async () => {
      try {
        const res = await apiClient.get('/me');
        if (res.data?.onboardingComplete) {
          if (isAddRequestRef.current) {
            // Add-a-site: start FRESH at the domain step (never prefill from the
            // current site). Its own draft key; a mid-add refresh resumes it.
            setAddMode(true);
            if (res.data.email) setUserEmail(res.data.email);
            userSitesRef.current = Array.isArray(res.data.sites) ? res.data.sites : [];
            const savedAdd = readSavedAddSiteState();
            if (savedAdd) restore(savedAdd);
            setHydrated(true);
            return;
          }
          if (isRedoRequestRef.current) {
            await initRedo(res.data);
            return;
          }
          clearSavedOnboardingState();
          navigate('/dashboard');
          return;
        }
        const saved = readSavedOnboardingState();

        if (saved) {
          restore(saved);
          setHydrated(true);
          return;
        }
        setHydrated(true);
      } catch {
        // /me dead → don't block onboarding; start at the domain screen.
        setHydrated(true);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // -------------------------------------------------------------------------
  // Persist on meaningful change. Transient flags (busy, notes) excluded.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!hydrated) return;
    if (!websiteUrl) return; // nothing worth restoring before the first answer
    try {
      // Redo and add-a-site drafts save under their own keys so they never
      // collide with (or resurrect into) a first-run draft.
      const storageKey = addMode
        ? ADD_ONBOARDING_STORAGE_KEY
        : redoMode ? REDO_ONBOARDING_STORAGE_KEY : ONBOARDING_STORAGE_KEY;
      localStorage.setItem(storageKey, JSON.stringify({
        ...(redoMode && { redoOriginalSite }),
        stage,
        websiteUrl,
        description,
        editedDesc,
        descIsAiFilled,
        faviconUrl,
        manualDesc,
        competitors,
        selectedCompetitors,
        newCompetitor,
        audienceSuggestions,
        toneSuggestions,
        targetAudience,
        customAudience,
        tone,
        customTone,
        businessType,
        detectedMarket,
        businessProfileInput,
        detectedLocations,
        keywordPreview,
        selectedPlan,
        billingPeriod,
        pendingCompSlug,
        planProgress,
        savedAt: Date.now()
      }));
    } catch { /* quota / private window — non-fatal */ }
  }, [
    hydrated, stage, websiteUrl, description, editedDesc, descIsAiFilled, faviconUrl,
    manualDesc, competitors, selectedCompetitors, newCompetitor, audienceSuggestions,
    toneSuggestions, targetAudience, customAudience, tone, customTone, businessType,
    detectedMarket, businessProfileInput, detectedLocations, keywordPreview, selectedPlan, billingPeriod,
    pendingCompSlug, planProgress, redoMode, redoOriginalSite, addMode
  ]);

  // -------------------------------------------------------------------------
  // Background fetchers (each returns its result so callers can await directly).
  // -------------------------------------------------------------------------
  const fetchCompetitors = async (site, desc) => {
    try {
      const res = await apiClient.post('/research-competitors', { website: site, productDescription: desc });
      const found = (res.data?.competitors || []).slice(0, 5).map(c => c.domain || c);
      setCompetitors(found);
      setSelectedCompetitors(found); // auto-select everything we found
      return found;
    } catch {
      return [];
    }
  };

  const fetchSuggestions = async (desc) => {
    try {
      const res = await apiClient.post('/onboarding-suggestions', { productDescription: desc });
      // Merge (not replace) so redo-mode seeds — the user's saved audience and
      // tone — stay in the option list as selected chips. First-run is
      // unchanged: prev is empty there.
      if (res.data?.audienceSuggestions) {
        setAudienceSuggestions(prev => Array.from(new Set([...prev, ...res.data.audienceSuggestions])));
      }
      if (res.data?.toneSuggestions) {
        setToneSuggestions(prev => Array.from(new Set([...prev, ...res.data.toneSuggestions])));
      }
    } catch { /* soft */ }
  };

  const fetchDetection = async (site, desc) => {
    try {
      const res = await apiClient.post('/detect-business-type', { website: site, productDescription: desc });
      const bt = res.data?.businessType || 'general';
      const mkt = res.data?.market || null;
      const locs = Array.isArray(res.data?.locations) ? res.data.locations : [];
      setBusinessType(bt);
      setDetectedMarket(mkt);
      if (locs.length > 0) {
        // Pre-fill the LOCAL inputs with the first detected location unless
        // the user already typed one; the rest become removable extras.
        const [first, ...rest] = locs;
        setBusinessProfileInput(p => (p.address || p.city) ? p : {
          ...p,
          address: first.address || '',
          city: first.city || '',
          state: first.state || '',
          postalCode: first.postalCode || ''
        });
        setDetectedLocations(rest);
      }
      return { businessType: bt, market: mkt };
    } catch {
      setBusinessType('general');
      return { businessType: 'general', market: null };
    }
  };

  const fetchKeywordPreview = async ({ site, desc, comps, bt, mkt }) => {
    try {
      const res = await apiClient.post('/api/keyword-research/onboarding-preview', {
        website: site,
        productDescription: desc,
        competitors: comps || [],
        businessType: bt || 'general',
        market: mkt || null
      });
      const preview = {
        clusters: res.data?.clusters || [],
        meta: res.data?.meta || {},
        mode: res.data?.mode,
        success: res.data?.success !== false
      };
      setKeywordPreview(preview);
      return preview;
    } catch {
      const empty = { clusters: [], meta: {}, success: false };
      setKeywordPreview(empty);
      return empty;
    }
  };

  const startKeywordPreview = (mode) => {
    const site = cleanDomain(websiteUrl);
    researchPromiseRef.current = (async () => {
      const detected = (await detectionPromiseRef.current) || {};
      return fetchKeywordPreview({
        site,
        desc: description || editedDesc,
        comps: selectedCompetitors,
        bt: mode || businessType || detected.businessType || 'general',
        mkt: detectedMarket || detected.market || null
      });
    })();
  };

  // -------------------------------------------------------------------------
  // Stage 1 → 2: crawl the site (streaming). Shows pulsing status rows +
  // elapsed counter on ANALYZING_SITE; the escape hatch is rendered there.
  // -------------------------------------------------------------------------
  const esRef = useRef(null);
  const crawlResolvedRef = useRef(false);

  // Close any in-flight scrape stream on unmount (exit / navigation) so a late
  // result/error event can't setState on an unmounted component.
  useEffect(() => () => {
    crawlResolvedRef.current = true;
    if (esRef.current && esRef.current.readyState !== 2) esRef.current.close();
  }, []);

  const startSiteCrawl = useCallback((site) => {
    crawlResolvedRef.current = false;

    const handleResult = async (data) => {
      const raw = data.productDescription || '';
      const clean = cleanDescription(raw);
      setDescription(raw);
      setEditedDesc(clean);
      setDescIsAiFilled(true);
      if (data.faviconUrl) setFaviconUrl(data.faviconUrl);
      setStage(STAGE.DESCRIPTION);
      // Kick off competitors + mode detection in the background.
      competitorsPromiseRef.current = fetchCompetitors(site, raw);
      detectionPromiseRef.current = fetchDetection(site, raw);
    };

    const handleError = (errorData) => {
      // A claimed domain can NEVER be onboarded, so don't drop into manual
      // description (that dead-ends: the flow would later 409 on the same
      // domain). Return to the domain step with a recoverable message.
      if (errorData?.alreadyClaimed) {
        setDomainNote("This site is already claimed. If it's yours, you might have signed up with a different email. If not, message us in the support chat and we'll get it sorted.");
        setStage(STAGE.DOMAIN);
        return;
      }
      // Soft-fail everything else: drop the user onto the manual-description
      // screen with a reason. Never a dead end.
      if (errorData?.antibotBlock) {
        setDescNote("That site blocks automated readers, so we couldn't pull it up. Describe your business in a sentence or two and we'll roll with that.");
      } else if (errorData?.blockedDomain) {
        setDescNote("That looks like a social or platform page. Describe your business below and we'll use that instead.");
      } else {
        setDescNote("We couldn't read that site. No worries, just describe your business in a sentence or two.");
      }
      setStage(STAGE.MANUAL_DESC);
    };

    const base = apiClient.defaults.baseURL || '';
    const streamUrl = `${base}/scrape-site/stream?website=${encodeURIComponent(site)}`;

    let es;
    try {
      es = new EventSource(streamUrl);
    } catch {
      // No EventSource: fall back to the non-stream endpoint.
      apiClient.get(`/scrape-site?website=${encodeURIComponent(site)}`)
        .then(res => handleResult(res.data))
        .catch(err => handleError(err.response?.data || {}));
      return;
    }
    esRef.current = es;

    es.addEventListener('progress', () => { /* status rows are time-driven; label events are informational */ });

    es.addEventListener('result', async (e) => {
      crawlResolvedRef.current = true;
      if (esRef.current && esRef.current.readyState !== 2) esRef.current.close();
      try {
        await handleResult(JSON.parse(e.data));
      } catch {
        handleError({});
      }
    });

    es.addEventListener('error', (e) => {
      if (crawlResolvedRef.current) {
        if (esRef.current && esRef.current.readyState !== 2) esRef.current.close();
        return;
      }
      let errorData = {};
      try { if (e && typeof e.data === 'string') errorData = JSON.parse(e.data); } catch { /* noop */ }
      crawlResolvedRef.current = true;
      if (esRef.current && esRef.current.readyState !== 2) esRef.current.close();
      handleError(errorData);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDomainSubmit = () => {
    const site = cleanDomain(websiteUrl);
    if (!site) return;
    setDomainNote(null);
    // Add-mode: if they already own this site, don't scrape/claim it — point
    // them at the site switcher instead of showing "already registered".
    if (addMode) {
      const owned = (userSitesRef.current || []).some(
        (s) => cleanDomain(typeof s === 'object' ? s.site : s) === site
      );
      if (owned) {
        setDomainNote('You already have this site. Switch to it from the site menu, or enter a different domain to add a new one.');
        return;
      }
    }
    setWebsiteUrl(site);
    setStage(STAGE.ANALYZING_SITE);
    startSiteCrawl(site);
  };

  // Escape hatch on the analyzing screen: stop waiting, take the user to the
  // manual-description screen so they can type it themselves.
  const handleSkipAnalysis = () => {
    crawlResolvedRef.current = true;
    if (esRef.current && esRef.current.readyState !== 2) esRef.current.close();
    setDescNote(null);
    setStage(STAGE.MANUAL_DESC);
  };

  // Manual description submit (also handles URL-paste / too-thin routing).
  const handleManualDescSubmit = async () => {
    const trimmed = manualDesc.trim();
    if (!trimmed) return;
    setBusy(true);
    let result;
    try {
      const res = await apiClient.post('/onboarding/classify-input', { text: trimmed });
      result = res.data || {};
    } catch {
      result = { kind: 'description', description: trimmed };
    }
    setBusy(false);

    if (result.kind === 'url' && result.url) {
      setManualDesc('');
      setWebsiteUrl(cleanDomain(result.url));
      setDescNote(null);
      setStage(STAGE.ANALYZING_SITE);
      startSiteCrawl(cleanDomain(result.url));
      return;
    }
    if (result.kind === 'too_thin' || result.kind === 'nonsense') {
      const raw = result.followUpMessage || "We need a bit more to go on. What does your business actually do?";
      setDescNote(raw.charAt(0).toUpperCase() + raw.slice(1));
      return;
    }

    const finalDesc = result.description || trimmed;
    setDescription(finalDesc);
    setEditedDesc(finalDesc);
    setDescIsAiFilled(false); // they typed it — no "AI auto-filled" glow
    setManualDesc('');
    setDescNote(null);
    setStage(STAGE.DESCRIPTION);
    const site = cleanDomain(websiteUrl);
    competitorsPromiseRef.current = fetchCompetitors(site, finalDesc);
    detectionPromiseRef.current = fetchDetection(site, finalDesc);
  };

  // -------------------------------------------------------------------------
  // Description → Competitors.
  // -------------------------------------------------------------------------
  const handleDescriptionConfirm = async () => {
    const finalDesc = (editedDesc || description || '').trim();
    if (!finalDesc) return;
    setDescription(finalDesc);
    setDescIsAiFilled(false);
    setBusy(true);
    // Ensure competitors have landed so the reveal + chips appear together.
    await (competitorsPromiseRef.current || Promise.resolve([]));
    setBusy(false);
    // Fire audience/tone suggestions for later screens.
    fetchSuggestions(finalDesc);
    setStage(STAGE.COMPETITORS);
  };

  const handleUseDifferentWebsite = () => {
    setDescription(''); setEditedDesc(''); setDescIsAiFilled(false); setManualDesc('');
    setCompetitors([]); setSelectedCompetitors([]);
    setAudienceSuggestions([]); setToneSuggestions([]);
    setBusinessType(''); setDetectedMarket(null);
    setBusinessProfileInput({ address: '', city: '', state: '', postalCode: '', serviceArea: '', serviceRadiusMiles: 30 });
    setKeywordPreview(null);
    setDescNote(null);
    setDomainNote(null);
    competitorsPromiseRef.current = null;
    detectionPromiseRef.current = null;
    researchPromiseRef.current = null;
    setStage(STAGE.DOMAIN);
  };

  // -------------------------------------------------------------------------
  // Competitors → Audience.
  // -------------------------------------------------------------------------
  const addCompetitor = () => {
    const clean = cleanDomain(newCompetitor);
    if (!clean || competitors.includes(clean)) { setNewCompetitor(''); return; }
    setCompetitors(prev => [...prev, clean]);
    setSelectedCompetitors(prev => [...prev, clean]);
    setNewCompetitor('');
  };
  const toggleCompetitor = (d) => {
    setSelectedCompetitors(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };
  const removeCompetitor = (d) => {
    setCompetitors(prev => prev.filter(x => x !== d));
    setSelectedCompetitors(prev => prev.filter(x => x !== d));
  };
  const handleCompetitorsConfirm = () => {
    setStage(STAGE.AUDIENCE);
  };

  // -------------------------------------------------------------------------
  // Audience → Mode.
  // -------------------------------------------------------------------------
  const addCustomAudience = () => {
    const v = customAudience.trim();
    if (!v || targetAudience.includes(v)) { setCustomAudience(''); return; }
    setTargetAudience(prev => [...prev, v]);
    setCustomAudience('');
  };
  const handleAudienceConfirm = async () => {
    const list = [...targetAudience];
    const v = customAudience.trim();
    if (v && !list.includes(v)) list.push(v);
    if (list.length === 0) return;
    setTargetAudience(list);
    setCustomAudience('');
    // Make sure detection landed so the mode is pre-selected.
    setBusy(true);
    const detected = (await detectionPromiseRef.current) || { businessType: businessType || 'general' };
    if (detected.businessType && !businessType) setBusinessType(detected.businessType);
    setBusy(false);
    setStage(STAGE.MODE);
  };

  // -------------------------------------------------------------------------
  // Redo helpers. redoSameSite: still redoing the ORIGINAL site (the user can
  // switch domains mid-redo, which becomes a normal new-site onboarding).
  // redoSkipBilling: same site + an active subscription → billing is never
  // touched, tone confirm saves directly and hands off to keyword research.
  // -------------------------------------------------------------------------
  const redoSameSite = redoMode && cleanDomain(websiteUrl) === cleanDomain(redoOriginalSite || '');
  const redoSkipBilling = redoSameSite && redoHasActiveSub;

  const handleExitRedo = () => {
    clearSavedRedoState();
    navigate('/dashboard');
  };

  // Exit add-a-site: nothing is persisted server-side until /onboarding/complete,
  // so this just closes the in-flight scrape stream, drops the add draft, and
  // returns to the dashboard. Confirm only once there's meaningful work to lose.
  const handleExitAddSite = () => {
    if (stage !== STAGE.DOMAIN && !window.confirm('Discard adding this site?')) return;
    crawlResolvedRef.current = true;
    if (esRef.current && esRef.current.readyState !== 2) esRef.current.close();
    competitorsPromiseRef.current = null;
    detectionPromiseRef.current = null;
    researchPromiseRef.current = null;
    clearSavedAddSiteState();
    navigate('/dashboard');
  };

  const REDO_DONE_TOAST = 'Setup updated. Run keyword research to get fresh keyword ideas based on your new info.';

  // Redo finish for subscribed users: persist, drop the draft, land in the
  // keyword research tool so they can re-run it with the updated info.
  const finishRedo = async (chosenTone) => {
    setBusy(true);
    try {
      await persistOnboarding({ tone: chosenTone });
      clearSavedRedoState();
      toast.success(REDO_DONE_TOAST, { duration: 6000 });
      navigate('/keyword-finder');
    } catch (err) {
      console.error('Redo finish failed:', err);
      toast.error('Could not save your setup. Please try again.');
      setBusy(false);
    }
  };

  // -------------------------------------------------------------------------
  // Mode (+ Local) → Tone.
  // -------------------------------------------------------------------------
  const handleModeConfirm = () => {
    const chosen = VALID_MODES.includes(businessType) ? businessType : 'general';
    setBusinessType(chosen);
    if (chosen === 'local' || chosen === 'dispensary') {
      setStage(STAGE.LOCAL);
      return;
    }
    // Redo with billing skipped never shows the subscribe reveal, so don't
    // spend a keyword-preview run on it.
    if (!redoSkipBilling) startKeywordPreview(chosen);
    setStage(STAGE.TONE);
  };
  const handleLocalConfirm = () => {
    if (!redoSkipBilling) startKeywordPreview('local');
    setStage(STAGE.TONE);
  };

  // -------------------------------------------------------------------------
  // Tone → Subscribe. Fetches comp status + plans + kicks the keyword reveal.
  // -------------------------------------------------------------------------
  const toneSelected = (opt) => setTone(opt);
  const addCustomTone = () => { if (customTone.trim()) setTone(customTone.trim()); };
  const handleToneConfirm = async () => {
    const chosen = (customTone.trim() || tone || '').trim();
    if (!chosen) return;
    setTone(chosen);
    setCustomTone('');
    // Subscribed redo: billing stages are skipped entirely — save and go.
    // (chosen is passed explicitly; the setTone above hasn't re-rendered yet.)
    if (redoSkipBilling) {
      await finishRedo(chosen);
      return;
    }
    // The waits below (plan fetch + keyword-preview race, up to ~12s) render
    // as a full interstitial with status rows, not a frozen button spinner.
    setPreparingResearch(true);

    // Comp-link check before we bother fetching plans.
    let compSlug = null;
    try {
      const meRes = await apiClient.get('/me');
      compSlug = meRes.data?.pendingCompSlug || null;
    } catch (err) {
      console.warn('Failed to fetch /me before subscribe step:', err);
    }
    setPendingCompSlug(compSlug);

    if (!compSlug) {
      try {
        const res = await apiClient.get('/get-plans');
        if (res.data.success && res.data.data) {
          setPlans(res.data.data.filter(p => p.isActive && !p.isRetentionPlan));
        }
      } catch (err) {
        console.error('Failed to fetch plans:', err);
      }
    }

    // Wait for the keyword preview but never block — cap it so a slow run just
    // shows the subscribe screen without the reveal.
    try {
      await Promise.race([
        researchPromiseRef.current || Promise.resolve(null),
        new Promise((resolve) => setTimeout(resolve, 12000))
      ]);
    } catch { /* soft */ }

    setPreparingResearch(false);
    setStage(STAGE.SUBSCRIBE);
  };

  // -------------------------------------------------------------------------
  // Finish: persist onboarding (byte-compatible payload), then either redeem a
  // comp OR create a Stripe checkout. On success we DON'T redirect — we advance
  // to the PLAN stage (except the Stripe path, which must leave for checkout).
  // -------------------------------------------------------------------------
  const persistOnboarding = async (overrides = {}) => {
    const { auth: fbAuth } = await import('../../firebaseConfig');
    const email = fbAuth.currentUser?.email;
    const domain = cleanDomain(websiteUrl);
    // Callers that persist in the same tick as a setState (redo tone confirm)
    // pass the fresh value directly instead of reading stale closure state.
    const resolvedTone = overrides.tone !== undefined ? overrides.tone : tone;

    const bp = businessProfileInput || {};
    const radius = Number(bp.serviceRadiusMiles) || 30;
    const isLocationBased = businessType === 'local' || businessType === 'dispensary';
    const businessProfilePayload = isLocationBased
      ? {
          address: bp.address || '',
          city: bp.city || '',
          state: bp.state || '',
          postalCode: bp.postalCode || '',
          serviceArea: (bp.serviceArea || '').split(',').map(s => s.trim()).filter(Boolean),
          serviceRadiusMiles: radius
        }
      : undefined;
    // Extra detected locations the user kept — saved as additional business
    // profiles so Local research builds a geo graph around each one.
    const additionalProfilesPayload = isLocationBased && detectedLocations.length > 0
      ? detectedLocations.map(l => ({
          businessName: l.businessName || '',
          address: l.address || '',
          city: l.city || '',
          state: l.state || '',
          postalCode: l.postalCode || '',
          serviceRadiusMiles: radius
        }))
      : undefined;

    await apiClient.post('/onboarding/complete', {
      site: domain,
      productDescription: description,
      competitors: selectedCompetitors,
      targetAudience,
      tone: resolvedTone,
      faviconUrl,
      ...(businessType && { businessType }),
      ...(detectedMarket && { market: detectedMarket }),
      ...(businessProfilePayload && { businessProfile: businessProfilePayload }),
      ...(additionalProfilesPayload && { additionalBusinessProfiles: additionalProfilesPayload })
    });

    localStorage.setItem('currentSite', JSON.stringify({ site: domain, email }));
    return { domain, email };
  };

  // Comp redeem → go to the plan stage (NOT straight to the dashboard). The
  // plan stage hands off to /dashboard via its CTA.
  const redeemCompThenPlan = async () => {
    try {
      // Send the just-onboarded domain so the backend binds the comp to THIS
      // site — without it, multi-site users fall back to newest-site binding.
      const redeemRes = await apiClient.post('/comp-links/redeem', {
        site: cleanDomain(websiteUrl)
      });
      if (redeemRes.data?.success) {
        setSubscribeBusy(false);
        // Redoing the original site: it already has a content plan, so skip
        // the plan stage and hand off to keyword research instead.
        if (redoSameSite) {
          toast.success(REDO_DONE_TOAST, { duration: 6000 });
          navigate('/keyword-finder');
          return true;
        }
        setStage(STAGE.PLAN);
        return true;
      }
      setSubscribeBusy(false);
      setDescNote('Could not redeem the comp link. Please try again.');
      return false;
    } catch (compErr) {
      console.error('Comp redeem failed:', compErr);
      setSubscribeBusy(false);
      setDescNote('Could not redeem the comp link. Please try again.');
      return false;
    }
  };

  const handleCompContinue = async () => {
    setSubscribeBusy(true);
    try {
      await persistOnboarding();
      if (redoMode) clearSavedRedoState(); // setup is saved server-side now
      await redeemCompThenPlan();
    } catch (err) {
      console.error('Comp finish failed:', err);
      setSubscribeBusy(false);
    }
  };

  const handleSubscribe = async () => {
    setSubscribeBusy(true);
    try {
      const { domain, email } = await persistOnboarding();
      if (redoMode) clearSavedRedoState(); // setup is saved server-side now

      // Comp safety net (an admin may have minted a comp mid-flow).
      let compSlug = pendingCompSlug;
      if (!compSlug) {
        try {
          const meRes = await apiClient.get('/me');
          compSlug = meRes.data?.pendingCompSlug || null;
        } catch (meErr) {
          console.warn('Failed to fetch /me before checkout:', meErr);
        }
      }
      if (compSlug) {
        await redeemCompThenPlan();
        return;
      }

      const plan = selectedPlan === 'seo_pro'
        ? plans.find(p => p.tier === 'seo_pro' && p.billingPeriod === billingPeriod)
        : plans.find(p => (!p.tier || p.tier === 'growth') && p.billingPeriod === billingPeriod);

      if (plan) {
        const response = await apiClient.post('/checkout-session', { planId: plan.planId, email, site: domain });
        if (response.data.url) {
          // Stripe checkout: the user leaves the app and returns via /success,
          // which routes into the dashboard where the plan is waiting. We can't
          // keep them in-app here, so this is the one path that doesn't reach
          // the in-onboarding plan stage.
          window.location.href = response.data.url;
        } else {
          setSubscribeBusy(false);
          setDescNote('Could not create checkout. Please try again.');
        }
      } else {
        console.error('No matching plan found');
        setSubscribeBusy(false);
        setDescNote('Plan not found. Please try again.');
      }
    } catch (err) {
      console.error('Subscribe error:', err);
      setSubscribeBusy(false);
      // The domain got claimed between the scrape check and completion (rare
      // race). Recover to the domain step instead of a dead "try again".
      if (err?.response?.data?.alreadyClaimed) {
        setDomainNote("This site is already claimed. If it's yours, you might have signed up with a different email. If not, message us in the support chat and we'll get it sorted.");
        setStage(STAGE.DOMAIN);
        return;
      }
      setDescNote('Something went wrong. Please try again.');
    }
  };

  // -------------------------------------------------------------------------
  // Plan stage hand-off.
  // -------------------------------------------------------------------------
  const handleOpenPlan = () => {
    clearSavedOnboardingState();
    clearSavedRedoState();
    clearSavedAddSiteState();
    // The article surface (renamed "Content Plan", calendar-first in Phase A)
    // lives at /dashboard. We keep the ending inside the Onboarding view and
    // route here rather than adding a new route.
    window.location.href = '/dashboard';
  };

  // =========================================================================
  // RENDER
  // =========================================================================
  const kwClusters = keywordPreview?.clusters || [];
  const kwCount = kwClusters.reduce((s, c) => s + (c.keywordCount || (c.keywords ? c.keywords.length : 0)), 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Sticky backdrop-blur header: thin progress bar + account chip. */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-100">
        <ProgressBar value={STAGE_PROGRESS[stage] || 0} />
        <div className="max-w-4xl mx-auto px-5 py-2.5 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold tracking-tight text-gray-900">Blawgy</span>
          <div className="flex items-center gap-3 min-w-0">
            {userEmail && (
              <span className="text-xs text-gray-400 truncate max-w-[200px] hidden sm:inline" title={userEmail}>
                {userEmail}
              </span>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Persistent redo banner: the safety contract for redoing setup. */}
      {redoMode && (
        <div className="bg-blue-50 border-b border-blue-100" data-testid="redo-banner">
          <div className="max-w-4xl mx-auto px-5 py-2.5 flex items-start sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-blue-800 text-left leading-snug">
              You are redoing your setup{redoOriginalSite ? <> for <span className="font-semibold">{redoOriginalSite}</span></> : null}.
              Nothing changes on your current site until you finish. Your keywords, posts, and connections stay exactly as they are.
            </p>
            <button
              type="button"
              onClick={handleExitRedo}
              data-testid="redo-exit"
              className="flex-shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-900 underline underline-offset-2 transition-colors"
            >
              Exit to dashboard
            </button>
          </div>
        </div>
      )}

      {/* Add-a-site banner: reassures nothing on the current site changes, and
          gives a clear exit back to the dashboard. */}
      {addMode && (
        <div className="bg-emerald-50 border-b border-emerald-100" data-testid="add-banner">
          <div className="max-w-4xl mx-auto px-5 py-2.5 flex items-start sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-emerald-800 text-left leading-snug">
              Adding a new site. Your current site and everything on it stays exactly as it is.
            </p>
            <button
              type="button"
              onClick={handleExitAddSite}
              data-testid="add-exit"
              className="flex-shrink-0 text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline underline-offset-2 transition-colors"
            >
              Exit to dashboard
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 flex items-center justify-center px-5 py-10 sm:py-16">
        {!hydrated ? (
          <div className="text-gray-300 text-sm">Loading…</div>
        ) : (
          <div className="w-full">
            {stage === STAGE.DOMAIN && (
              <Screen
                title="Let's set up your blog in 60 seconds"
                subtitle="Start with your website. We'll read it and prefill everything we can so you're mostly just confirming."
                testId="stage-domain"
              >
                {domainNote && <div className="mb-4"><SoftNote>{domainNote}</SoftNote></div>}
                <BigInput
                  value={websiteUrl}
                  onChange={setWebsiteUrl}
                  onSubmit={handleDomainSubmit}
                  placeholder="yourwebsite.com"
                  testId="domain-input"
                />
              </Screen>
            )}

            {stage === STAGE.ANALYZING_SITE && (
              <AnalyzingSite
                site={cleanDomain(websiteUrl)}
                onSkip={handleSkipAnalysis}
              />
            )}

            {stage === STAGE.MANUAL_DESC && (
              <Screen
                title="Tell us about your business"
                subtitle="A sentence or two is plenty. We'll turn it into your content plan."
                testId="stage-manual-desc"
              >
                {descNote && <div className="mb-4"><SoftNote>{descNote}</SoftNote></div>}
                <BigInput
                  value={manualDesc}
                  onChange={setManualDesc}
                  onSubmit={handleManualDescSubmit}
                  placeholder="e.g. We sell organic dog treats for health-conscious pet owners"
                  disabled={busy}
                  testId="manual-desc-input"
                />
              </Screen>
            )}

            {stage === STAGE.DESCRIPTION && (
              <Screen
                title={redoMode && !descIsAiFilled ? 'Your business description' : "Here's what we found"}
                subtitle={redoMode && !descIsAiFilled
                  ? 'This is what your setup says today. Update anything that changed.'
                  : 'This is how we understand your business. Edit anything that\'s off.'}
                testId="stage-description"
              >
                <div className="mb-3 flex items-center justify-between">
                  {descIsAiFilled ? <AiFilledBadge /> : <span />}
                  <GhostButton onClick={handleUseDifferentWebsite} testId="use-different-website">
                    Use a different website
                  </GhostButton>
                </div>
                <textarea
                  value={editedDesc}
                  onChange={(e) => { setEditedDesc(e.target.value); setDescIsAiFilled(false); }}
                  rows={7}
                  data-testid="description-textarea"
                  className={`w-full p-4 rounded-2xl border bg-white text-[15px] leading-relaxed text-gray-800 resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 ${descIsAiFilled ? 'ob-amber-glow' : 'border-gray-200'}`}
                  autoFocus
                />
                {descNote && <div className="mt-4"><SoftNote>{descNote}</SoftNote></div>}
                <div className="mt-6">
                  <PrimaryButton onClick={handleDescriptionConfirm} busy={busy} busyLabel="Finding competitors…" testId="description-confirm">
                    Looks good
                  </PrimaryButton>
                </div>
              </Screen>
            )}

            {stage === STAGE.COMPETITORS && (
              <Screen
                title={selectedCompetitors.length ? 'These are your competitors' : 'Who are your competitors?'}
                subtitle="We'll study what's working for them and find gaps you can win. Add or remove any."
                testId="stage-competitors"
              >
                {competitors.length > 0 && (
                  <div className="mb-5">
                    <PayoffStat
                      value={competitors.length}
                      label={competitors.length === 1 ? 'competitor found' : 'competitors found'}
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mb-4" data-testid="competitor-chips">
                  {competitors.map(d => (
                    <Chip
                      key={d}
                      label={d}
                      selected={selectedCompetitors.includes(d)}
                      onClick={() => toggleCompetitor(d)}
                      onRemove={() => removeCompetitor(d)}
                      testId={`competitor-chip-${d}`}
                    />
                  ))}
                  {competitors.length === 0 && (
                    <p className="text-sm text-gray-400">
                      We couldn't find competitors automatically. Add one below, or hit Continue and we'll work without them.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 mb-6 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                  <input
                    value={newCompetitor}
                    onChange={e => setNewCompetitor(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCompetitor(); } }}
                    placeholder="competitor.com"
                    data-testid="competitor-input"
                    className="flex-1 bg-transparent py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none"
                  />
                </div>
                <PrimaryButton onClick={handleCompetitorsConfirm} testId="competitors-continue">
                  Continue
                </PrimaryButton>
              </Screen>
            )}

            {stage === STAGE.AUDIENCE && (
              <Screen
                title="Who do you sell to?"
                subtitle="Pick all that apply, or add your own. This shapes who your content speaks to."
                testId="stage-audience"
              >
                <BubbleSelect
                  multiSelect
                  options={audienceSuggestions}
                  selected={targetAudience}
                  onSelect={setTargetAudience}
                  customValue={customAudience}
                  onCustomChange={setCustomAudience}
                  onAddCustom={addCustomAudience}
                  placeholder="Add your own (e.g. Small business owners)"
                  loading={audienceSuggestions.length === 0}
                />
                <div className="mt-6">
                  <PrimaryButton
                    onClick={handleAudienceConfirm}
                    busy={busy}
                    disabled={targetAudience.length === 0 && !customAudience.trim()}
                    testId="audience-continue"
                  >
                    Continue
                  </PrimaryButton>
                </div>
              </Screen>
            )}

            {stage === STAGE.MODE && (
              <Screen
                title="What kind of business is this?"
                subtitle="This shapes what we look for. Local businesses win 'near me' searches; stores win product searches. We picked the closest match."
                testId="stage-mode"
              >
                <div className="space-y-2.5">
                  {MODE_OPTIONS.map(opt => {
                    const active = businessType === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setBusinessType(opt.key)}
                        data-testid={`mode-option-${opt.key}`}
                        className={`w-full text-left p-4 rounded-2xl border transition-all ${
                          active ? 'border-primary bg-primary/[0.04] ring-1 ring-primary' : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-medium text-gray-900">{opt.title}</span>
                          {active && <span className="text-[11px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">Our pick</span>}
                        </div>
                        <div className="mt-0.5 text-sm text-gray-500">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-6">
                  <PrimaryButton onClick={handleModeConfirm} testId="mode-continue">Continue</PrimaryButton>
                </div>
              </Screen>
            )}

            {stage === STAGE.LOCAL && (
              <Screen
                title="Where do customers find you?"
                subtitle="We build local keywords around your location and every town within your service radius."
                testId="stage-local"
              >
                <input
                  value={businessProfileInput.address}
                  onChange={e => setBusinessProfileInput(p => ({ ...p, address: e.target.value }))}
                  placeholder="Street address (optional, makes local targeting more precise)"
                  autoFocus
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm mb-2 focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    value={businessProfileInput.city}
                    onChange={e => setBusinessProfileInput(p => ({ ...p, city: e.target.value }))}
                    placeholder="City"
                    className="p-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
                  />
                  <input
                    value={businessProfileInput.state}
                    onChange={e => setBusinessProfileInput(p => ({ ...p, state: e.target.value }))}
                    placeholder="State / region"
                    className="p-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
                  />
                </div>
                <input
                  value={businessProfileInput.serviceArea}
                  onChange={e => setBusinessProfileInput(p => ({ ...p, serviceArea: e.target.value }))}
                  placeholder="Nearby towns you serve (comma separated, optional)"
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm mb-4 focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
                />
                <div className="flex items-center gap-3 mb-6">
                  <label htmlFor="service-radius" className="text-sm text-gray-700 whitespace-nowrap">Service radius</label>
                  <input
                    id="service-radius"
                    type="number"
                    min="5"
                    max="100"
                    value={businessProfileInput.serviceRadiusMiles}
                    onChange={e => setBusinessProfileInput(p => ({ ...p, serviceRadiusMiles: e.target.value }))}
                    data-testid="service-radius-input"
                    className="w-20 p-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
                  />
                  <span className="text-sm text-gray-500">miles — how far out your customers come from</span>
                </div>
                {detectedLocations.length > 0 && (
                  <div className="mb-6">
                    <div className="text-sm text-gray-600 mb-2">We also found these locations on your site — we'll target them too:</div>
                    <div className="flex flex-wrap gap-2">
                      {detectedLocations.map((loc, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 text-sm bg-gray-100 text-gray-700 rounded-full px-3 py-1">
                          {[loc.address, loc.city, loc.state].filter(Boolean).join(', ')}
                          <button
                            type="button"
                            onClick={() => setDetectedLocations(prev => prev.filter((_, j) => j !== i))}
                            aria-label="Remove location"
                            className="text-gray-400 hover:text-gray-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <PrimaryButton onClick={handleLocalConfirm} testId="local-continue">Continue</PrimaryButton>
              </Screen>
            )}

            {stage === STAGE.TONE && preparingResearch && <PreparingResearch />}

            {stage === STAGE.TONE && !preparingResearch && (
              <Screen
                title="What's your writing style?"
                subtitle="Pick the voice that fits your brand, or describe your own."
                testId="stage-tone"
              >
                <BubbleSelect
                  options={toneSuggestions}
                  selected={tone}
                  onSelect={toneSelected}
                  customValue={customTone}
                  onCustomChange={setCustomTone}
                  onAddCustom={addCustomTone}
                  placeholder="Describe your own (e.g. Friendly and approachable)"
                  loading={toneSuggestions.length === 0}
                />
                <div className="mt-6">
                  <PrimaryButton
                    onClick={handleToneConfirm}
                    disabled={!tone && !customTone.trim()}
                    busy={busy}
                    busyLabel="Saving your setup…"
                    testId="tone-continue"
                  >
                    {redoSkipBilling ? 'Finish and update my setup' : 'Continue'}
                  </PrimaryButton>
                </div>
              </Screen>
            )}

            {stage === STAGE.SUBSCRIBE && (
              <SubscribeScreen
                isComp={!!pendingCompSlug}
                kwCount={kwCount}
                kwClusters={kwClusters}
                billingPeriod={billingPeriod}
                setBillingPeriod={setBillingPeriod}
                selectedPlan={selectedPlan}
                setSelectedPlan={setSelectedPlan}
                subscribeBusy={subscribeBusy}
                onSubscribe={handleSubscribe}
                onCompContinue={handleCompContinue}
                note={descNote}
              />
            )}

            {stage === STAGE.PLAN && (
              <PlanStage
                site={cleanDomain(websiteUrl)}
                keywordPreview={keywordPreview}
                progress={planProgress}
                onProgress={setPlanProgress}
                onOpenPlan={handleOpenPlan}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Analyzing screen — pulsing status rows time-advance so the crawl always
// looks alive, a live elapsed counter, and a 30s escape hatch.
// ---------------------------------------------------------------------------
const ANALYZE_STEPS = [
  { label: 'Reading your homepage', at: 0 },
  { label: 'Learning your products', at: 4 },
  { label: 'Drafting your profile', at: 9 }
];
const AnalyzingSite = ({ site, onSkip }) => {
  const elapsed = useElapsed(true);
  const active = ANALYZE_STEPS.reduce((acc, s, i) => (elapsed >= s.at ? i : acc), 0);
  const rows = ANALYZE_STEPS.map((s, i) => ({
    label: s.label,
    state: i < active ? 'done' : i === active ? 'active' : 'pending'
  }));
  return (
    <Screen title="Reading your site" subtitle={`Pulling up ${site} and figuring out what you do.`} testId="stage-analyzing">
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <StatusRows rows={rows} />
        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>Usually takes about 15 seconds</span>
          <ElapsedCounter seconds={elapsed} />
        </div>
      </div>
      {/* Escape hatch appears after 30s so a slow/hung crawl never traps the
          user. Before that we keep it calm — the counter already reassures. */}
      {elapsed >= 30 && (
        <div className="mt-5 text-center ob-rise-sm">
          <GhostButton onClick={onSkip} testId="skip-analysis">
            Taking a while? Describe it yourself instead
          </GhostButton>
        </div>
      )}
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Interstitial between Tone and Subscribe: the keyword-preview race (capped
// at 12s) plus the plan fetch used to hide behind a button spinner. Same
// status-row pattern as AnalyzingSite so the wait always looks alive.
// ---------------------------------------------------------------------------
const RESEARCH_STEPS = [
  { label: 'Checking what people search for', at: 0 },
  { label: 'Sizing your topics', at: 4 },
  { label: 'Lining up your first posts', at: 8 }
];
const PreparingResearch = () => {
  const elapsed = useElapsed(true);
  const active = RESEARCH_STEPS.reduce((acc, s, i) => (elapsed >= s.at ? i : acc), 0);
  const rows = RESEARCH_STEPS.map((s, i) => ({
    label: s.label,
    state: i < active ? 'done' : i === active ? 'active' : 'pending'
  }));
  return (
    <Screen
      title="Running your keyword research"
      subtitle="We're checking what your customers actually search for."
      testId="stage-preparing-research"
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <StatusRows rows={rows} />
        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>Usually takes about 10 seconds</span>
          <ElapsedCounter seconds={elapsed} />
        </div>
      </div>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Subscribe screen — keyword payoff reveal + plan cards (or comp celebration).
// ---------------------------------------------------------------------------
const PlanFeature = ({ children }) => (
  <li className="flex items-start gap-2 text-sm text-gray-600">
    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
    <span>{children}</span>
  </li>
);

const PlanOption = ({ name, price, period, badge, features, selected, onClick, testId }) => (
  <button
    type="button"
    onClick={onClick}
    data-testid={testId}
    className={`relative w-full text-left p-5 rounded-2xl border-2 transition-all ${
      selected ? 'border-primary ring-2 ring-primary/20 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'
    }`}
  >
    {badge && (
      <span className="absolute -top-2.5 left-5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
        {badge}
      </span>
    )}
    <div className="flex items-start justify-between mb-3">
      <h4 className="text-lg font-semibold text-gray-900">{name}</h4>
      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'border-primary' : 'border-gray-300'}`}>
        {selected && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
      </span>
    </div>
    <div className="mb-4">
      <span className="text-3xl font-bold text-gray-900 tabular-nums">${price}</span>
      <span className="text-sm text-gray-500">/month</span>
      {period === 'annual' && <p className="text-xs mt-1 text-gray-400">Billed annually</p>}
    </div>
    <ul className="space-y-2">
      {features.map((f, i) => <PlanFeature key={i}>{f}</PlanFeature>)}
    </ul>
  </button>
);

// Card pricing (mirrors the active Stripe plans). The annual badge is computed
// from these so it can never overstate the real discount.
const PLAN_PRICES = {
  growth: { monthly: 79, annual: 49 },
  seo_pro: { monthly: 129, annual: 69 }
};
const MAX_ANNUAL_SAVE_PCT = Math.max(
  ...Object.values(PLAN_PRICES).map(p => Math.round((1 - p.annual / p.monthly) * 100))
);

const fmtVolume = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v));

const SubscribeScreen = ({
  isComp, kwCount, kwClusters, billingPeriod, setBillingPeriod,
  selectedPlan, setSelectedPlan, subscribeBusy, onSubscribe, onCompContinue, note
}) => {
  const showReveal = kwClusters.length > 0 && kwCount > 0;
  return (
    <Screen
      title={isComp ? "You're all set" : 'Last step'}
      subtitle={isComp ? 'Your account is comped, so there\'s no payment needed. Let\'s build your plan.' : 'Pick a plan and we\'ll build your first month of content right away.'}
      testId="stage-subscribe"
    >
      {showReveal && (
        <div className="mb-8 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5" data-testid="keyword-reveal">
          <div className="mb-1">
            <PayoffStat value={kwCount} label="search phrases your customers actually type into Google" />
          </div>
          <p className="mb-3 text-sm text-gray-600">We'll write a post to win each one.</p>
          <div className="flex flex-wrap gap-1.5">
            {kwClusters.slice(0, 3).map((cl, i) => {
              const vol = cl.totalVolume || (cl.keywords || []).reduce((s, k) => s + (k.volume || 0), 0);
              return (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-white border border-emerald-200 px-3 py-1 text-xs font-medium text-gray-700">
                  {cl.label || cl.pillarKeyword}
                  {vol > 0 && (
                    <span className="font-semibold text-emerald-600 tabular-nums">{fmtVolume(vol)}/mo</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {!showReveal && (
        <div className="mb-6">
          <SoftNote testId="keyword-preview-fallback">
            We're still crunching your keyword research. It takes a couple of minutes for some sites. It'll be waiting on your dashboard.
          </SoftNote>
        </div>
      )}

      {note && <div className="mb-6"><SoftNote>{note}</SoftNote></div>}

      {isComp ? (
        <>
          <PrimaryButton onClick={onCompContinue} busy={subscribeBusy} busyLabel="Setting up…" testId="comp-continue">
            Build my content plan
          </PrimaryButton>
          <p className="text-xs text-gray-400 text-center mt-3">
            Posts publish automatically on schedule. Want to approve each one first? Flip on draft mode anytime.
          </p>
        </>
      ) : (
        <>
          <div className="flex justify-center mb-5">
            <div className="inline-flex bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${billingPeriod === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${billingPeriod === 'annual' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              >
                Annual
                <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full">Save up to {MAX_ANNUAL_SAVE_PCT}%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <PlanOption
              name="Pro"
              price={PLAN_PRICES.growth[billingPeriod] || PLAN_PRICES.growth.monthly}
              period={billingPeriod}
              features={[
                '31 blog posts per month',
                'All platform integrations',
                'YouTube video embeds',
                'Internal linking',
                'Custom AI images',
                'Priority support'
              ]}
              selected={selectedPlan === 'growth'}
              onClick={() => setSelectedPlan('growth')}
              testId="plan-option-pro"
            />
            <PlanOption
              name="Pro+"
              price={PLAN_PRICES.seo_pro[billingPeriod] || PLAN_PRICES.seo_pro.monthly}
              period={billingPeriod}
              badge="SEO Powered"
              features={[
                'Everything in Pro, plus:',
                'See how many people search each topic every month',
                'Know which topics are easy wins vs long shots',
                "Find topics your competitors rank for that you don't",
                'SEO analysis dashboard'
              ]}
              selected={selectedPlan === 'seo_pro'}
              onClick={() => setSelectedPlan('seo_pro')}
              testId="plan-option-pro-plus"
            />
          </div>

          <PrimaryButton onClick={onSubscribe} busy={subscribeBusy} busyLabel="Please wait…" testId="subscribe-cta">
            Start 3-day free trial
          </PrimaryButton>
          <p className="text-xs text-gray-400 text-center mt-3">Cancel anytime. No charge for 3 days.</p>
          <p className="text-xs text-gray-400 text-center mt-1.5">
            Posts publish automatically on schedule. Want to approve each one first? Flip on draft mode anytime.
          </p>
        </>
      )}
    </Screen>
  );
};

export default Onboarding;
