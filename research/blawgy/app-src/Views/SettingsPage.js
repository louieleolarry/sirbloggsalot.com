import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LoaderIcon, Plus, Link2, FileJson, Trash2, Sparkles, HelpCircle, Copy, Check, ChevronUp, ChevronDown, RotateCcw, X } from 'lucide-react';
import apiClient from '../utils/apiClient';
import { cachedFetch } from '../utils/apiCache';
import { useImpersonation } from '../contexts/ImpersonationContext';
import { useModals } from '../contexts/ModalContext';
import NavbarWrapper from '../components/Navbar';
import ImpersonationBanner from '../components/ImpersonationBanner';
import languages from '../constants/languages.json';
import WebflowFieldMapper from '../components/WebflowFieldMapper';
import WebhookTab from '../components/WebhookTab';
import ProductsTab from '../components/ProductsTab';
import BusinessLocationsTab from '../components/BusinessLocationsTab';
import WhiteLabelTab from '../components/WhiteLabelTab';
import RedoOnboardingCard from '../components/RedoOnboardingCard';
import CtaModal from '../components/CtaModal';
import { toast, Toaster } from 'react-hot-toast';
import { useLocation, useNavigate, useParams, useBlocker } from 'react-router-dom';
import { motion, AnimatePresence } from "framer-motion";

// Legacy site.keywords arrays mix raw strings with
// { keyword, volume, difficulty, source } objects from SeoAnalysis "Save
// keywords". Rendering an object in <span>{keyword}</span> crashes the
// whole page (React "Objects are not valid as a React child"), so coerce
// to trimmed, deduped strings on read. Mirrors backend
// utils/normalizeKeywords + the BulkGenerateModal savedKeywords memo.
const normalizeKeywordList = (input) => {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const out = [];
  for (const item of input) {
    let str = '';
    if (typeof item === 'string') str = item.trim();
    else if (item && typeof item === 'object') {
      const candidate = item.keyword ?? item.kw ?? item.term ?? item.text ?? item.name;
      if (typeof candidate === 'string') str = candidate.trim();
    } else if (typeof item === 'number' || typeof item === 'boolean') {
      str = String(item).trim();
    }
    if (!str) continue;
    const key = str.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(str);
  }
  return out;
};

// Compact search-volume label (1.2K / 3M / 940). Mirrors KeywordFinder's
// formatVolume so the discovered-topics rows read the same as the Topics finder.
const formatVolume = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}K`;
  return String(v);
};

// Plain-words description of how the mix ratio (share of scheduled articles that
// come from the user's own keywords, 0-100) splits the calendar. The engine
// applies the ratio over the whole horizon's open slots, not per week, so the
// copy is phrased as a ratio ("X of every N scheduled articles"), never "a week".
// Degrades to a percentage sentence when postsPerWeek is unknown (older plan view).
const describeMix = (ratio, postsPerWeek) => {
  const r = Math.max(0, Math.min(100, Math.round(Number(ratio) || 0)));
  const ppw = Number(postsPerWeek);
  if (!Number.isFinite(ppw) || ppw <= 0) {
    if (r <= 0) return 'Every scheduled article comes from discovered topics.';
    if (r >= 100) return 'Every scheduled article comes from your keywords.';
    return `About ${r}% of your scheduled articles come from your keywords, the rest from discovered topics.`;
  }
  const manual = Math.round((r / 100) * ppw);
  const discovered = ppw - manual;
  if (manual <= 0) return 'Every scheduled article comes from discovered topics.';
  if (discovered <= 0) return 'Every scheduled article comes from your keywords.';
  return `About ${manual} of every ${ppw} scheduled articles come from your keywords, ${discovered} from discovered topics.`;
};

// Status-badge styling for a "Your keywords" chip (design doc E4). `available`
// returns null: an available keyword is unbadged (the chip stands on its own).
// `researching` is intentionally muted — it's a transient "we're still looking".
const KEYWORD_BADGE = {
  published: { label: 'Published', className: 'bg-green-100 text-green-700' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
  covered: { label: 'Already covered', className: 'bg-amber-100 text-amber-700' },
  researching: { label: 'Researching', className: 'bg-gray-100 text-gray-500' },
};
const keywordBadgeMeta = (status) => KEYWORD_BADGE[status] || null;

// "Covered by <post>" tooltip text from a coveredBy owner record. Best-effort:
// falls back to a generic sentence when only a bare flag is present.
const coveredByText = (coveredBy) => {
  const title = coveredBy?.title;
  return title
    ? `Already covered by your post "${title}". Blawgy won't schedule a duplicate.`
    : 'An existing page already covers this. Blawgy won\'t schedule a duplicate.';
};

const Settings = ({ currentSite, updateCurrentSite, logout }) => {
  const { user, siteSettings, currentSite: site, impersonatedSite } = useImpersonation();
  const location = useLocation();
  const navigate = useNavigate();
  const { tab } = useParams();
  const [saveStatus, setSaveStatus] = useState('');
  const [saveStatusIsError, setSaveStatusIsError] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [manualLinkToggle, setManualLinkToggle] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [descriptionError, setDescriptionError] = useState('');
  const [generationPhase, setGenerationPhase] = useState(0);
  const [isFindingCompetitors, setIsFindingCompetitors] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newCompetitor, setNewCompetitor] = useState('');
  const [suggestedCompetitors, setSuggestedCompetitors] = useState([]);
  const [activeTab, setActiveTab] = useState(() => {
    const defaultTab = 'site-settings';
    return tab || location.state?.activeTab || defaultTab;
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Whether this login owns a white-label account. A 403 is the normal answer
  // for almost everyone, so it is swallowed rather than surfaced.
  const [isPartnerOwner, setIsPartnerOwner] = useState(false);
  const [settings, setSettings] = useState({
    site: '',
    businessDescription: '',
    targetAudience: '',
    links: false,
    videos: false,
    includeImages: false,
    draft: false,
    rrh: { enabled: false },
    keywords: [],
    competitors: [],
    internalLinks: [],
    blogType: '',
    username: '',
    appPassword: '',
    apiToken: '',
    collectionId: '',
    fields: {},
    categoryId: '',
    siteName: '',
    authToken: '',
    shopifyClientId: '',
    shopifyClientSecret: '',
    author: '',
    apiKey: '',
    siteId: '',
    memberId: '',
    cta: {
      enabled: false,
      positions: [],
      type: 'template',
      template: {
        url: '',
        text: '',
        buttonText: 'Learn More',
        backgroundColor: '#ffffff',
        buttonColor: '#007bff',
        textColor: '#333333',
        fontFamily: 'inherit',
        borderRadius: 8
      },
      custom: ''
    },
    sitemapUrl: ''
  });
  const [fetchedFields, setFetchedFields] = useState([]);
  const [internalLinkToggle, setInternalLinkToggle] = useState(!!settings?.internalLinks?.length);
  const { setShowBulkGenerateModal, setShowImageStyleModal, setShowAdminPanel, setShowSubscriptionModal, setShowSupportModal } = useModals();
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [connectionSuccess, setConnectionSuccess] = useState('');
  const [shopifyCategories, setShopifyCategories] = useState([]);
  const [shopifyAuthors, setShopifyAuthors] = useState([]);
  const [wixMembers, setWixMembers] = useState([]);
  // Framer: collections come back from Test Connection (or the rehydration
  // fetch on revisit) so the picker is never empty for a connected site.
  const [framerCollections, setFramerCollections] = useState(null);
  const [framerProjectName, setFramerProjectName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  // --- Planner keyword controls (design doc Phase E) -----------------------
  // The mix slider and topic pruning persist through the plan-config PATCH and
  // the /topics/exclude route directly (not the main settings save), so they
  // live OUTSIDE `settings` and never flip hasUnsavedChanges.
  const [manualKeywordRatio, setManualKeywordRatio] = useState(0);
  const [planPostsPerWeek, setPlanPostsPerWeek] = useState(null);
  const [discoveredClusters, setDiscoveredClusters] = useState([]);
  const [clustersLoading, setClustersLoading] = useState(false);
  const [clustersError, setClustersError] = useState(false);
  const [clustersProcessing, setClustersProcessing] = useState(false);
  const [expandedClusters, setExpandedClusters] = useState(() => new Set());
  // Excluded lists are string arrays and the /topics/exclude response is the
  // source of truth: every mutation replaces these wholesale from the response.
  const [excludedTopics, setExcludedTopics] = useState([]);
  const [excludedKeywords, setExcludedKeywords] = useState([]);
  const ratioSaveTimerRef = useRef(null);
  // E4 status badges: normalized-keyword -> { status, volume?, kd?, coveredBy? }.
  // Filled from GET /api/plan/:site/keyword-status; empty => chips render as
  // today (graceful degrade when the endpoint is absent or returns nothing).
  const [keywordStatus, setKeywordStatus] = useState({});

  // Track WHICH site's settings are seeded into local form state. Seeding is
  // keyed by site domain, not object identity: App refetches
  // /get-site-settings on every route change, and each response is a fresh
  // object. Re-seeding on identity used to clobber in-progress edits with
  // server state. A real site switch (different domain) still re-seeds.
  const seededSiteRef = useRef(null);
  const seededExtrasSiteRef = useRef(null);

  // CTA Modal state
  const [showCtaModal, setShowCtaModal] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingTabChange, setPendingTabChange] = useState(null);
  const [isSavingFromModal, setIsSavingFromModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showClearKeywordsModal, setShowClearKeywordsModal] = useState(false);
  const [showDeleteSiteModal, setShowDeleteSiteModal] = useState(false);
  const [isDeletingSite, setIsDeletingSite] = useState(false);
  const [ctaSettings, setCtaSettings] = useState({
    enabled: false,
    positions: [],
    type: 'template',
    template: {
      url: '',
      text: '',
      buttonText: 'Learn More',
      backgroundColor: '#ffffff',
      buttonColor: '#007bff',
      textColor: '#333333',
      fontFamily: 'inherit',
      borderRadius: 8
    },
    custom: ''
  });

  // Image Style state
  const [imageTitle, setImageTitle] = useState('');
  const [imageStyle, setImageStyle] = useState('');
  const [styleHistory, setStyleHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState('');
  const [imageGuidelines, setImageGuidelines] = useState('');
  const [guidelinesEnabled, setGuidelinesEnabled] = useState(false);

  // Contextual Image state (in-article images)
  const [contextualImageStyle, setContextualImageStyle] = useState('');
  const [contextualImageStyleReuse, setContextualImageStyleReuse] = useState(true);
  const [contextualImageGuidelines, setContextualImageGuidelines] = useState('');
  // Guidelines mode: 'blawgy' (default), 'reuse', or 'custom'
  const [contextualImageGuidelinesMode, setContextualImageGuidelinesMode] = useState('blawgy');
  const [showContextualImageTest, setShowContextualImageTest] = useState(false);
  const [contextualImageTestTitle, setContextualImageTestTitle] = useState('');
  const [contextualImageTestSection, setContextualImageTestSection] = useState('');
  const [isGeneratingContextualImage, setIsGeneratingContextualImage] = useState(false);
  const [generatedContextualPreview, setGeneratedContextualPreview] = useState('');
  // Visual components settings (charts, infographics, etc. - these often contain text)
  const [visualComponentsEnabled, setVisualComponentsEnabled] = useState({
    charts: true,
    infographics: true,
    timelines: true,
    comparison_tables: true
  });

  // Product image settings
  const [useProductImagesForFeatured, setUseProductImagesForFeatured] = useState(false);

  const platforms = [
    { label: "WordPress", value: "wordpress" },
    { label: "Webflow", value: "webflow" },
    { label: "Framer", value: "framer" },
    { label: "Wix", value: "wix" },
    { label: "Shopify", value: "shopify" },
    { label: "Ghost", value: "ghost" },
    { label: "I'll connect to your API", value: "manual" },
  ];

  // Does this login own a white-label account? Decides whether the White Label
  // tab is offered. The endpoint 403s for everyone else, which is the expected
  // case, so a failure just leaves the tab hidden.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await apiClient.get('/api/partner/me');
        if (!cancelled && response?.data?.partner) setIsPartnerOwner(true);
      } catch {
        // Not a partner owner, or the call was not available. Tab stays hidden.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sync settings from context once per site (see seededSiteRef note above)
  useEffect(() => {
    const domain = siteSettings?.site || site?.site;
    if (siteSettings && domain && seededSiteRef.current !== domain) {
      seededSiteRef.current = domain;
      setSettings({
        site: siteSettings?.site || site?.site,
        businessDescription: siteSettings?.businessDescription || siteSettings?.product || '',
        // Onboarding saves an array of audience picks; the textarea edits a string.
        targetAudience: Array.isArray(siteSettings?.targetAudience)
          ? siteSettings.targetAudience.join(', ')
          : (siteSettings?.targetAudience || ''),
        language: siteSettings?.language || '',
        links: siteSettings?.links || false,
        videos: siteSettings?.videos || false,
        includeImages: siteSettings?.includeImages || false,
        draft: siteSettings?.draft || false,
        rrh: siteSettings?.rrh || { enabled: false },
        keywords: normalizeKeywordList(siteSettings?.keywords),
        competitors: siteSettings?.competitors || [],
        internalLinks: siteSettings?.internalLinks || [],
        blogType: siteSettings?.blogType,
        username: siteSettings?.username || '',
        appPassword: siteSettings?.appPassword || '',
        apiToken: siteSettings?.apiToken || '',
        collectionId: siteSettings?.collectionId || '',
        fields: siteSettings?.fields || {},
        categoryId: siteSettings?.categoryId || '',
        siteName: siteSettings?.siteName || '',
        authToken: siteSettings?.authToken || '',
        shopifyClientId: siteSettings?.shopifyClientId || '',
        shopifyClientSecret: siteSettings?.shopifyClientSecret || '',
        author: siteSettings?.author || '',
        apiKey: siteSettings?.apiKey || '',
        siteId: siteSettings?.siteId || '',
        memberId: siteSettings?.memberId || '',
        framerProjectUrl: siteSettings?.framerProjectUrl || '',
        framerApiKey: siteSettings?.framerApiKey || '',
        framerCollectionId: siteSettings?.framerCollectionId || '',
        framerFieldMap: siteSettings?.framerFieldMap || null,
        framerPublishConsent: siteSettings?.framerPublishConsent === true,
        cta: siteSettings?.cta || {
          enabled: false,
          positions: [],
          type: 'template',
          template: {
            url: '',
            text: '',
            buttonText: 'Learn More',
            backgroundColor: '#ffffff',
            buttonColor: '#007bff',
            textColor: '#333333',
            fontFamily: 'inherit',
            borderRadius: 8
          },
          custom: ''
        },
        sitemapUrl: siteSettings?.sitemapUrl || `${siteSettings?.site || site?.site}/sitemap.xml`
      });
      setInternalLinkToggle(!!siteSettings?.internalLinks?.length);
      // A site switch replaces the whole form; any dirty flag belonged to the
      // previous site's edits.
      setHasUnsavedChanges(false);
    }
  }, [siteSettings, site?.site]);

  // Warn users when leaving the page with unsaved changes (browser close/refresh)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Cycle through generation phases for better UX feedback
  const generationPhases = [
    'Reading your website...',
    'Analyzing content...',
    'Identifying key information...',
    'Generating description...'
  ];

  useEffect(() => {
    if (!isGenerating) {
      setGenerationPhase(0);
      return;
    }
    const interval = setInterval(() => {
      setGenerationPhase(prev => (prev + 1) % generationPhases.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isGenerating, generationPhases.length]);

  const getShopifyBlogs = useCallback(async (authToken, clientId, clientSecret) => {
    try {
      const response = await apiClient.get('/shopify/blogs', {
        params: {
          siteName: settings.siteName,
          authToken,
          shopifyClientId: clientId,
          shopifyClientSecret: clientSecret
        }
      });
      if (!response.data?.success) {
        setShopifyCategories([]);
      } else {
        setShopifyCategories(response.data?.data || []);
        setShopifyAuthors(response.data?.authors || []);
      }
    } catch (error) {
      console.error('Error fetching Shopify blogs:', error);
    }
  }, [settings.siteName]);

  const getWixDetails = useCallback(async () => {
    try {
      const response = await apiClient.get('/wix/details', {
        params: {
          siteId: settings.siteId,
          apiKey: settings.apiKey
        }
      });
      if (response.data.success) {
        setWixMembers(response.data?.data?.members || []);
      }
    } catch (error) {
      console.error('Error fetching Wix details:', error);
    }
  }, [settings.siteId, settings.apiKey]);

  useEffect(() => {
    if (settings.blogType !== 'shopify' || !settings.siteName) return;
    // Repopulate the blog/author dropdowns on load and whenever creds change.
    // OAuth (client-credentials) sites have no authToken, so fetch with the
    // stored client id/secret; otherwise the dropdowns render empty after a
    // reload even though the connection is valid.
    if (settings.authToken) {
      getShopifyBlogs(settings.authToken);
    } else if (settings.shopifyClientId && settings.shopifyClientSecret) {
      getShopifyBlogs(null, settings.shopifyClientId, settings.shopifyClientSecret);
    }
  }, [settings.siteName, settings.authToken, settings.shopifyClientId, settings.shopifyClientSecret, settings.siteId, settings.blogType, getShopifyBlogs]);

  useEffect(() => {
    if (settings.blogType === 'wix' && settings.siteId && settings.apiKey) {
      getWixDetails();
    }
  }, [settings.siteId, settings.apiKey, settings.blogType, getWixDetails]);

  // Framer: refill the collection picker from the SAVED connection when the
  // page is revisited (credentials never ride the browser after connect; the
  // backend uses its stored copy).
  useEffect(() => {
    let cancelled = false;
    const loadFramerCollections = async () => {
      try {
        const response = await apiClient.get('/framer/collections', {
          params: { site: settings.site }
        });
        if (!cancelled && response.data?.success) {
          setFramerCollections(response.data.collections || []);
          setFramerProjectName(response.data.projectName || '');
        }
      } catch (err) {
        // Non-fatal: the customer can always re-run Test Connection.
        console.error('Failed to load Framer collections:', err?.message);
      }
    };
    if (
      settings.blogType === 'framer' &&
      settings.framerApiKey &&
      settings.framerProjectUrl &&
      framerCollections === null
    ) {
      loadFramerCollections();
    }
    return () => { cancelled = true; };
  }, [settings.blogType, settings.framerApiKey, settings.framerProjectUrl, settings.site, framerCollections]);

  // Seed image-style and CTA state once per site, same guard as the main
  // settings effect. This effect used to run on EVERY siteSettings identity
  // change, so any background refetch mid-edit reverted these fields (the
  // "I started typing and old stuff came back" bug on the CTA settings).
  useEffect(() => {
    const domain = siteSettings?.site || site?.site;
    if (!siteSettings || !domain || seededExtrasSiteRef.current === domain) return;
    seededExtrasSiteRef.current = domain;

    if (siteSettings?.imageStyle) {
      setImageStyle(siteSettings.imageStyle.style || '');
      setStyleHistory([siteSettings.imageStyle.style || '']);
      setImageGuidelines(siteSettings.imageStyle.guidelines || '');
      setGuidelinesEnabled(siteSettings.imageStyle.guidelinesEnabled || false);

      // Contextual image settings
      setContextualImageStyle(siteSettings.imageStyle.contextualImageStyle || '');
      setContextualImageStyleReuse(siteSettings.imageStyle.contextualImageStyleReuse !== false); // default true
      setContextualImageGuidelines(siteSettings.imageStyle.contextualImageGuidelines || '');
      // Convert old fields to new mode, default to 'blawgy'
      const savedMode = siteSettings.imageStyle.contextualImageGuidelinesMode;
      if (savedMode) {
        setContextualImageGuidelinesMode(savedMode);
      } else {
        // Legacy migration: if old fields exist, convert them
        if (siteSettings.imageStyle.contextualImageGuidelinesCustomEnabled) {
          setContextualImageGuidelinesMode('custom');
        } else if (siteSettings.imageStyle.contextualImageGuidelinesReuse === true) {
          setContextualImageGuidelinesMode('reuse');
        } else {
          setContextualImageGuidelinesMode('blawgy'); // default
        }
      }
      // Visual components settings - default all to true for backward compatibility
      if (siteSettings.imageStyle.visualComponentsEnabled) {
        setVisualComponentsEnabled(siteSettings.imageStyle.visualComponentsEnabled);
      } else {
        // Default all to true for existing users
        setVisualComponentsEnabled({
          charts: true,
          infographics: true,
          timelines: true,
          comparison_tables: true
        });
      }

      // Product image settings
      if (siteSettings.imageStyle.useProductImagesForFeatured !== undefined) {
        setUseProductImagesForFeatured(siteSettings.imageStyle.useProductImagesForFeatured);
      }
    }

    // Initialize CTA settings
    if (siteSettings?.cta) {
      setCtaSettings(siteSettings.cta);
    }
  }, [siteSettings, site?.site]);

  // Hydrate the planner keyword controls (mix ratio + prune lists + cadence)
  // from the plan view. A backend change adds manualKeywordRatio / excludedTopics
  // / excludedKeywords to config; when they're absent (older backend) we degrade
  // to 0 / empty so the page still works. Keyed on the site domain.
  useEffect(() => {
    const siteKey = siteSettings?.site;
    if (!siteKey) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get(`/api/plan/${siteKey}`);
        const cfg = res?.data?.config || {};
        if (cancelled) return;
        setManualKeywordRatio(Number.isFinite(Number(cfg.manualKeywordRatio))
          ? Math.max(0, Math.min(100, Math.round(Number(cfg.manualKeywordRatio))))
          : 0);
        setPlanPostsPerWeek(Number.isFinite(Number(cfg.postsPerWeek)) ? Number(cfg.postsPerWeek) : null);
        setExcludedTopics(Array.isArray(cfg.excludedTopics) ? cfg.excludedTopics : []);
        setExcludedKeywords(Array.isArray(cfg.excludedKeywords) ? cfg.excludedKeywords : []);
      } catch (err) {
        // Degrade gracefully: keep the defaults (mix 0, nothing pruned).
      }
    })();
    return () => { cancelled = true; };
  }, [siteSettings?.site]);

  // Load discovered topics (research clusters) through the shared SWR cache,
  // using the exact key + fetcher the Add-topics drawer uses so both surfaces
  // share one network hit. Any failure just shows an inline message.
  useEffect(() => {
    const siteKey = siteSettings?.site;
    if (!siteKey) return undefined;
    let cancelled = false;
    (async () => {
      setClustersLoading(true);
      setClustersError(false);
      try {
        const data = await cachedFetch(
          `kwclusters:${siteKey}`,
          () => apiClient.get(`/api/keyword-research/${siteKey}/clusters`).then((r) => r.data || {}),
          { ttlMs: 60_000, staleMs: 600_000 }
        );
        if (cancelled) return;
        setDiscoveredClusters(Array.isArray(data?.clusters) ? data.clusters : []);
        setClustersProcessing(Boolean(data?.processing));
      } catch (err) {
        if (!cancelled) setClustersError(true);
      } finally {
        if (!cancelled) setClustersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [siteSettings?.site]);

  // E4: fetch the per-keyword status badges (scheduled/published/covered/etc).
  // Degrades to {} on any failure so chips render exactly as before. Called on
  // mount (below) and again right after a settings save persists new keywords.
  const refreshKeywordStatus = useCallback(async () => {
    const siteKey = siteSettings?.site;
    if (!siteKey) return;
    try {
      const res = await apiClient.get(`/api/plan/${siteKey}/keyword-status`);
      const list = Array.isArray(res?.data?.statuses) ? res.data.statuses : [];
      const map = {};
      for (const s of list) {
        const key = String(s?.keyword || '').trim().toLowerCase();
        if (key) map[key] = s;
      }
      setKeywordStatus(map);
    } catch (err) {
      // Endpoint absent / error -> keep chips unbadged.
      setKeywordStatus({});
    }
  }, [siteSettings?.site]);

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await refreshKeywordStatus(); })();
    return () => { cancelled = true; };
  }, [refreshKeywordStatus]);

  // Drop any pending debounced ratio save when the page unmounts.
  useEffect(() => () => {
    if (ratioSaveTimerRef.current) clearTimeout(ratioSaveTimerRef.current);
  }, []);

  // Sync URL parameter with active tab
  useEffect(() => {
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [tab, activeTab]);

  // Handle default tab redirect when no tab is specified
  useEffect(() => {
    if (location.pathname === '/settings' && !tab) {
      navigate('/settings/site-settings', { replace: true });
    }
  }, [location.pathname, tab, navigate]);

  const handleTabChange = (tabName) => {
    if (hasUnsavedChanges) {
      setPendingTabChange(tabName);
      setShowUnsavedModal(true);
      return;
    }
    setActiveTab(tabName);
    navigate(`/settings/${tabName}`, { replace: true });
  };

  // Block cross-route navigation (e.g. clicking Articles in the navbar)
  // while there are unsaved changes — same guard the existing in-page
  // tab switcher uses, just extended to the whole router.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowUnsavedModal(true);
    }
  }, [blocker.state]);

  const handleDiscardChanges = () => {
    setHasUnsavedChanges(false);
    setShowUnsavedModal(false);
    if (blocker.state === 'blocked') {
      blocker.proceed();
      return;
    }
    if (pendingTabChange) {
      setActiveTab(pendingTabChange);
      navigate(`/settings/${pendingTabChange}`, { replace: true });
      setPendingTabChange(null);
    }
  };

  const handleSaveAndContinue = async () => {
    try {
      setIsSavingFromModal(true);
      await handleSave();
      setHasUnsavedChanges(false);
      setShowUnsavedModal(false);
      if (blocker.state === 'blocked') {
        blocker.proceed();
        return;
      }
      if (pendingTabChange) {
        setActiveTab(pendingTabChange);
        navigate(`/settings/${pendingTabChange}`, { replace: true });
        setPendingTabChange(null);
      }
    } finally {
      setIsSavingFromModal(false);
    }
  };

  const handleCancelNavigation = () => {
    setShowUnsavedModal(false);
    setPendingTabChange(null);
    if (blocker.state === 'blocked') blocker.reset();
  };

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
    setHasUnsavedChanges(true);
  };

  const handleProductChange = (e) => {
    const newSettings = { ...settings, businessDescription: e.target.value };
    handleSettingsChange(newSettings);
  };

  const handleToggleChange = (field) => {
    const newSettings = { ...settings, [field]: !settings[field] };
    handleSettingsChange(newSettings);
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim()) {
      const keywords = newKeyword
        .split(/[,\n]/)
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const newSettings = {
        ...settings,
        keywords: [...new Set([...(settings.keywords || []), ...keywords])]
      };
      handleSettingsChange(newSettings);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keywordToRemove) => {
    const newSettings = {
      ...settings,
      keywords: settings.keywords.filter(keyword => keyword !== keywordToRemove)
    };
    handleSettingsChange(newSettings);
  };

  const handleClearAllKeywords = () => {
    const newSettings = { ...settings, keywords: [] };
    handleSettingsChange(newSettings);
    setShowClearKeywordsModal(false);
  };

  // Mix slider: persist manualKeywordRatio through the plan-config PATCH,
  // debounced so a drag doesn't fire a request per tick. Mirrors
  // PlanStrategyPanel's patchConfig (failure -> gentle toast, never crash).
  // Local state updates immediately for a responsive thumb.
  const handleManualRatioChange = (value) => {
    const next = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    setManualKeywordRatio(next);
    const siteKey = siteSettings?.site;
    if (!siteKey) return;
    if (ratioSaveTimerRef.current) clearTimeout(ratioSaveTimerRef.current);
    ratioSaveTimerRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.patch(`/api/plan/${siteKey}/config`, { manualKeywordRatio: next });
        if (res?.data?.success === false) {
          toast.error(res.data?.message || 'Could not save your keyword mix');
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not save your keyword mix');
      }
    }, 500);
  };

  // Mix-slider state signals (design doc E3, audit findings 3+4+5). All derived
  // from data already in hand: the saved keyword list, the hydrated mix ratio, and
  // the keyword-status map. They degrade with the data — with no status map only
  // the "raise the mix" prompt and the static refresh line show.
  const savedKeywordCount = Array.isArray(settings.keywords) ? settings.keywords.length : 0;
  const hasKeywordStatusData = Object.keys(keywordStatus).length > 0;
  // A keyword is "in use" once it's scheduled, published, or already covered —
  // none of those leave it available to fill more of the mix.
  const USED_KEYWORD_STATUSES = ['scheduled', 'published', 'covered'];
  // (a) They saved keywords but the mix is 0, so none become articles.
  const showRaiseMixSignal = manualKeywordRatio === 0 && savedKeywordCount > 0;
  // (b) The mix wants their keywords, but every saved one is already in use (none
  // available/researching), so the list can't fill its share. Needs status data.
  const allSavedKeywordsInUse = hasKeywordStatusData && savedKeywordCount > 0
    && settings.keywords.every((k) =>
      USED_KEYWORD_STATUSES.includes(keywordStatus[String(k).trim().toLowerCase()]?.status));
  const showAddMoreSignal = manualKeywordRatio > 0 && allSavedKeywordsInUse;

  const toggleClusterExpanded = (label) => {
    setExpandedClusters((cur) => {
      const next = new Set(cur);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  // Case-insensitive membership against the excluded string arrays.
  const isTopicExcluded = (label) =>
    excludedTopics.some((t) => String(t).toLowerCase() === String(label).toLowerCase());
  const isKeywordExcluded = (kw) =>
    excludedKeywords.some((k) => String(k).toLowerCase() === String(kw).toLowerCase());

  // Hard-prune (or restore, undo:true) a whole topic. The response is the source
  // of truth for excluded state, so both lists are replaced straight from it.
  // Pruning only affects FUTURE articles; scheduled/published posts are untouched.
  const excludeTopic = async (label, undo = false) => {
    const siteKey = siteSettings?.site;
    if (!siteKey || !label) return;
    try {
      const res = await apiClient.post(`/api/plan/${siteKey}/topics/exclude`, { topic: label, undo });
      if (res?.data?.success) {
        setExcludedTopics(Array.isArray(res.data.excludedTopics) ? res.data.excludedTopics : []);
        setExcludedKeywords(Array.isArray(res.data.excludedKeywords) ? res.data.excludedKeywords : []);
        toast.success(undo ? 'Topic restored' : 'Topic removed from future articles');
      } else {
        toast.error(res?.data?.message || 'Could not update that topic');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update that topic');
    }
  };

  // Hard-prune (or restore) a single discovered keyword. Same source-of-truth
  // contract and future-only effect as excludeTopic.
  const excludeKeyword = async (keyword, undo = false) => {
    const siteKey = siteSettings?.site;
    if (!siteKey || !keyword) return;
    try {
      const res = await apiClient.post(`/api/plan/${siteKey}/topics/exclude`, { keyword, undo });
      if (res?.data?.success) {
        setExcludedTopics(Array.isArray(res.data.excludedTopics) ? res.data.excludedTopics : []);
        setExcludedKeywords(Array.isArray(res.data.excludedKeywords) ? res.data.excludedKeywords : []);
        toast.success(undo ? 'Keyword restored' : 'Keyword removed from future articles');
      } else {
        toast.error(res?.data?.message || 'Could not update that keyword');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update that keyword');
    }
  };

  const handleConfirmDeleteSite = async () => {
    const siteIdentifier = settings.site || siteSettings?.site || site?.site;
    if (!siteIdentifier) {
      toast.error('Could not determine site to delete');
      return;
    }
    setIsDeletingSite(true);
    try {
      const response = await apiClient.delete(`/sites/${encodeURIComponent(siteIdentifier)}`);
      if (response.data?.success) {
        // Clear the deleted site from local cache. On reload, App.js's
        // fetchUserDetails will pick the next site off the user doc (if
        // any), or send the user back to onboarding when they had none
        // left — no sign-out, just a hard refresh into the new state.
        try {
          localStorage.removeItem('currentSite');
          localStorage.removeItem('impersonatedSite');
        } catch (e) {
          // ignore storage errors
        }
        toast.success('Site deleted');
        setShowDeleteSiteModal(false);
        window.location.reload();
      } else {
        toast.error(response.data?.message || 'Failed to delete site');
      }
    } catch (error) {
      console.error('Error deleting site:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete site');
    } finally {
      setIsDeletingSite(false);
    }
  };

  const handleAddCompetitor = () => {
    if (newCompetitor.trim()) {
      const competitors = newCompetitor
        .split(/[,\n]/)
        .map(c => c.trim())
        .filter(c => c.length > 0);

      const newSettings = {
        ...settings,
        competitors: [...new Set([...(settings.competitors || []), ...competitors])]
      };
      handleSettingsChange(newSettings);
      setNewCompetitor('');
    }
  };

  const handleRemoveCompetitor = (competitorToRemove) => {
    const newSettings = {
      ...settings,
      competitors: settings.competitors.filter(competitor => competitor !== competitorToRemove)
    };
    handleSettingsChange(newSettings);
  };

  const handleFindCompetitors = async () => {
    if (!settings.site || !settings.businessDescription) {
      toast.error('Please enter a website URL and product description first.');
      return;
    }

    try {
      setIsFindingCompetitors(true);
      const response = await apiClient.post('/research-competitors', {
        website: settings.site,
        productDescription: settings.businessDescription,
        existingCompetitors: settings.competitors || []
      });

      if (response.data.success && response.data?.competitors) {
        setSuggestedCompetitors(response.data.competitors);
        toast.success('Competitors found! Select the ones you want to add.');
      } else {
        toast.error(response.data.message || 'Failed to find competitors.');
      }
    } catch (error) {
      console.error('Error finding competitors:', error);
      toast.error(error.response?.data?.message || 'An error occurred while finding competitors.');
    } finally {
      setIsFindingCompetitors(false);
    }
  };

  const handleAddSuggestedCompetitor = (competitor) => {
    const newSettings = {
      ...settings,
      competitors: [...new Set([...(settings.competitors || []), competitor.domain])]
    };
    handleSettingsChange(newSettings);

    setSuggestedCompetitors(prev => prev.filter(c => c.domain !== competitor.domain));
  };

  const handleLanguageChange = (lang) => {
    const newSettings = {
      ...settings,
      language: lang,
    };
    handleSettingsChange(newSettings);
  };

  const handleBlogTypeChange = (e) => {
    const newSettings = { ...settings, blogType: e.target.value };
    handleSettingsChange(newSettings);
  };

  const handleCredentialsChange = (field, value) => {
    const newSettings = { ...settings, [field]: value };
    handleSettingsChange(newSettings);
  };

  // The save banner used to collapse every failure into one generic line, which
  // made 401s, permission errors, and real 500s indistinguishable to the user
  // AND to support. Keep the reassurance ("changes are still here") but name
  // the cause when the server gave one.
  const saveFailureMessage = (status, serverMessage) => {
    if (status === 401) {
      return 'Your session expired and we could not sign you back in. Your changes are still here, so sign in and save again.';
    }
    if (typeof serverMessage === 'string' && serverMessage.trim()) {
      return `Couldn't save your settings: ${serverMessage.trim()}. Your changes are still here.`;
    }
    return "Couldn't save your settings. Your changes are still here. Please try again.";
  };

  // `overrides` lets auto-save callers (Framer collection pick, consent check)
  // persist a value in the same tick it was chosen — React state updates are
  // async, so reading `settings` right after setSettings would save stale data.
  const handleSave = async (overrides = null) => {
    if (isSaving) return false;
    try {
      setIsSaving(true);
      setSaveStatus('Saving...');
      setSaveStatusIsError(false);

      // Note: removed required field validation - it was checking keys (Blawgy IDs)
      // against Webflow slugs which never matched, blocking all Webflow saves
      // The CTA saves through handleCtaSave the moment it changes; echoing
      // settings.cta here let any tab opened before a CTA edit silently revert
      // it on an unrelated save (the letsparty erasure class). Never send it.
      const { cta: _ctaSavedSeparately, ...settingsWithoutCta } = settings;
      // Ensure imageStyle is always included with current values
      const settingsToSave = {
        ...settingsWithoutCta,
        ...(overrides || {}),
        imageStyle: {
          style: imageStyle,
          guidelines: imageGuidelines,
          guidelinesEnabled: guidelinesEnabled,
          // Contextual image settings
          contextualImageStyle: contextualImageStyle,
          contextualImageStyleReuse: contextualImageStyleReuse,
          contextualImageGuidelines: contextualImageGuidelines,
          contextualImageGuidelinesMode: contextualImageGuidelinesMode,
          // Visual components settings
          visualComponentsEnabled: visualComponentsEnabled,
          // Product image settings
          useProductImagesForFeatured: useProductImagesForFeatured
        }
      };

      const response = await apiClient.post('/update-site-settings', {
        site: siteSettings?.site,
        settings: settingsToSave
      });

      if (response.data.success) {
        setSaveStatus('Saved!');
        setHasUnsavedChanges(false);
        setTimeout(() => setSaveStatus(''), 2000);
        // Refresh badges now (scheduled/covered reflect immediately) and once
        // more after the debounced backend enrichment has had time to fill
        // volume/covered for any newly added keywords.
        refreshKeywordStatus();
        setTimeout(() => { refreshKeywordStatus(); }, 8000);
        return true;
      }
      setSaveStatus(saveFailureMessage(null, response.data?.message));
      setSaveStatusIsError(true);
      return false;
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus(saveFailureMessage(error.response?.status, error.response?.data?.message));
      setSaveStatusIsError(true);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const generateDescription = async () => {
    try {
      setIsGenerating(true);
      setDescriptionError('');
      const response = await apiClient.get('/generate-description', {
        params: {
          domain: settings?.site,
        }
      });

      if (response.data.success && response.data?.description) {
        const newSettings = { ...settings, businessDescription: response.data.description };
        handleSettingsChange(newSettings);
      } else {
        setDescriptionError("Couldn't write a description from your site. You can type one yourself below.");
      }
    } catch (error) {
      console.error('Error generating description:', error);
      setDescriptionError("Couldn't write a description from your site. You can type one yourself below.");
    } finally {
      setIsGenerating(false);
    }
  };

  const addLink = () => {
    if (!newUrl) return;

    // Validate URL format
    let formattedUrl = newUrl;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    try {
      // Test if it's a valid URL
      new URL(formattedUrl);

      // Add the link to settings
      const updatedLinks = [...(settings?.internalLinks || []), {
        url: formattedUrl,
        description: newDescription || '',
        title: newDescription || formattedUrl // Add title property for compatibility
      }];

      handleSettingsChange({ ...settings, internalLinks: updatedLinks });
      setNewUrl('');
      setNewDescription('');
    } catch (error) {
      // Show error for invalid URL
      toast.error('Please enter a valid URL');
    }
  };

  const removeLink = (index) => {
    const updatedLinks = settings.internalLinks.filter((_, i) => i !== index);
    const newSettings = {
      ...settings,
      internalLinks: updatedLinks
    };
    handleSettingsChange(newSettings);
  };

  const fetchSitemap = async () => {
    try {
      const sitemapResponse = await apiClient.get('/fetch-sitemap', {
        params: {
          website: site,
          sitemapUrl: settings.sitemapUrl || undefined
        }
      });
      const sitemapLinks = sitemapResponse?.data?.sitemapLinks;

      if (!sitemapLinks || sitemapLinks.length === 0) {
        toast.error(
          'No links found in your sitemap. This usually means your site doesn\'t have a sitemap.xml file, or it\'s empty. You can add links manually instead.',
          { duration: 6000 }
        );
        return;
      }

      const formattedLinks = sitemapLinks.map((link) => ({ url: link }));
      const newSettings = {
        ...settings,
        internalLinks: formattedLinks
      };
      handleSettingsChange(newSettings);
      toast.success(`Found ${formattedLinks.length} links from your sitemap`);
    } catch (error) {
      console.error('Error fetching sitemap:', error);
      toast.error(
        'Could not fetch your sitemap. Make sure your site has a sitemap.xml file accessible at the root (e.g., yoursite.com/sitemap.xml). You can add links manually instead.',
        { duration: 6000 }
      );
    }
  };

  // Structural auto-map of a Framer collection's fields to post parts. Only
  // unambiguous matches map (exactly one rich-text field = body, exactly one
  // image field = hero); title prefers a string field literally named Title.
  // No body match means the connection stays incomplete (email delivery
  // continues) rather than publishing title-only posts.
  const computeFramerFieldMap = (fields) => {
    const ofType = (t) => (fields || []).filter((f) => f.type === t);
    const formatted = ofType('formattedText');
    const images = ofType('image');
    const strings = ofType('string');
    const dates = ofType('date');
    const titleField = strings.find((f) => (f.name || '').toLowerCase() === 'title') || strings[0] || null;
    return {
      title: titleField?.id || null,
      body: formatted.length === 1 ? formatted[0].id : null,
      heroImage: images.length === 1 ? images[0].id : null,
      date: dates.length === 1 ? dates[0].id : null,
    };
  };

  const framerMapLabel = (map, collection) => {
    if (!map || !collection) return '';
    const nameOf = (id) => collection.fields.find((f) => f.id === id)?.name;
    const parts = [];
    if (map.title) parts.push(`title → ${nameOf(map.title)}`);
    if (map.body) parts.push(`article text → ${nameOf(map.body)}`);
    if (map.heroImage) parts.push(`image → ${nameOf(map.heroImage)}`);
    if (map.date) parts.push(`date → ${nameOf(map.date)}`);
    return parts.join(', ');
  };

  // Selecting a collection is the moment the mapping is computed and saved.
  // Auto-saved immediately: the credentials auto-save at Test Connection fires
  // before the picker exists, so waiting for the Save button here would leave
  // connected-looking sites with no collection stored.
  const handleFramerCollectionSelect = async (collectionId) => {
    const collection = (framerCollections || []).find((c) => c.id === collectionId);
    if (!collection) return;
    const map = computeFramerFieldMap(collection.fields);
    if (!map.title || !map.body) {
      setConnectionError("We couldn't match this collection's fields automatically. Message us via Help and we'll set it up with you.");
      return;
    }
    setConnectionError('');
    const patch = { framerCollectionId: collectionId, framerFieldMap: map };
    handleSettingsChange({ ...settings, ...patch });
    const saved = await handleSave(patch);
    setConnectionSuccess(saved ? `Saved. We matched: ${framerMapLabel(map, collection)}.` : 'Choosing the collection worked, but saving failed. Click Save Changes.');
  };

  const handleFramerConsentChange = async (checked) => {
    const patch = { framerPublishConsent: checked === true };
    handleSettingsChange({ ...settings, ...patch });
    await handleSave(patch);
  };

  const testConnection = async () => {
    // Wrong-paste guard: the only URL most owners know is their live domain.
    if (settings.blogType === 'framer' && settings.framerProjectUrl && !/framer\.com\/projects\//i.test(settings.framerProjectUrl)) {
      setConnectionError("That looks like your live site's address. We need your Framer project link instead, the one in your browser's address bar while you're editing at framer.com.");
      return;
    }
    try {
      setTestingConnection(true);
      setConnectionError('');
      setConnectionSuccess('');
      const response = await apiClient.post('/test-connection', {
        site: settings.site,
        blogType: settings.blogType,
        ...(settings.blogType === 'webflow' && {
          apiToken: settings.apiToken,
          collectionId: settings.collectionId,
        }),
        ...(settings.blogType === 'shopify' && {
          authToken: settings.authToken,
          siteName: settings.siteName,
          categoryId: settings.categoryId,
          shopifyClientId: settings.shopifyClientId,
          shopifyClientSecret: settings.shopifyClientSecret
        }),
        ...(settings.blogType === 'wordpress' && {
          username: settings.username,
          appPassword: settings.appPassword
        }),
        ...(settings.blogType === 'framer' && {
          framerProjectUrl: settings.framerProjectUrl,
          framerApiKey: settings.framerApiKey
        })
      });

      if (response.data.success && settings.blogType === 'framer') {
        const collections = response.data.collections || [];
        setFramerCollections(collections);
        setFramerProjectName(response.data.projectName || '');
        // Credentials were persisted server-side by the endpoint itself.
        if (collections.length === 0) {
          setConnectionError("Connected! But this site has no CMS collections yet, so there's nowhere to put blog posts. Add one in Framer under CMS, or message us via Help.");
        } else if (collections.length === 1) {
          await handleFramerCollectionSelect(collections[0].id);
        } else {
          setConnectionSuccess('Connected! Now choose the collection where your blog posts live.');
        }
      } else if (response.data.success) {
        // Persist right away so users don't have to hunt for the separate "Save
        // Changes" button at the top of the page. The most common setup snag was
        // people testing the connection, seeing success, and never saving, so
        // nothing was stored.
        const saved = await handleSave();
        setConnectionSuccess(saved
          ? 'Connection successful and saved!'
          : 'Connected, but saving failed. Click Save Changes to store it.');
      } else {
        setConnectionError(response.data.message || 'Connection failed. Please check credentials.');
      }
    } catch (error) {
      setConnectionError(
        error.response?.data?.message ||
        'Connection failed. Please verify your credentials and try again.'
      );
      console.error('Connection test failed:', error);
    } finally {
      setTestingConnection(false);
      // Framer messages are multi-step guidance ("now choose the collection"),
      // so they persist until the next action instead of vanishing in 3s.
      if (settings.blogType !== 'framer') {
        setTimeout(() => {
          setConnectionSuccess('');
          setConnectionError('');
        }, 3000);
      }
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();

    if (!inviteEmail) return;

    if (inviteEmail === user?.email) {
      setInviteStatus('error');
      setInviteError('You cannot invite yourself');
      return;
    }

    try {
      setInviteStatus('generating');
      setInviteError('');

      const response = await apiClient.post('/invite-user', {
        email: inviteEmail,
        site: currentSite?.site,
        adminEmail: user?.email
      });

      if (response.data.success) {
        setInviteStatus('success');
        setInviteLink(response.data.link);
        setInviteEmail('');
      } else {
        setInviteStatus('error');
        setInviteError(response.data.message || 'Failed to generate invitation link');
      }
    } catch (error) {
      console.error('Error generating invite link:', error);
      setInviteStatus('error');
      setInviteError(error.response?.data?.message || 'An error occurred while generating the invitation link');
    }
  };

  const copyToClipboard = (link) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCtaSave = async (newCtaSettings) => {
    try {
      // Update local CTA settings immediately
      setCtaSettings(newCtaSettings);

      // Send ONLY the cta field — the backend merges partial payloads. Echoing
      // the whole settings object here re-uploaded ~1MB of internalLinks per
      // autosave on link-heavy sites and re-saved whatever half-edited state
      // the rest of the form held.
      const response = await apiClient.post('/update-site-settings', {
        site: siteSettings?.site,
        settings: { cta: newCtaSettings }
      });

      if (!response.data.success) {
        throw new Error(`Failed to save CTA settings to backend: ${response.data.message}`);
      }

      // Keep the main settings state in sync without flipping hasUnsavedChanges.
      setSettings(prev => ({ ...prev, cta: newCtaSettings }));

      return true; // Success
    } catch (error) {
      console.error('Error saving CTA settings:', error);
      throw error; // Re-throw so modal can handle error
    }
  };

  // Image Style functions
  const handleStyleChange = (newStyle) => {
    // Add to history only if it's different from the current style
    if (newStyle !== imageStyle) {
      // Truncate history if we're not at the end
      const newHistory = styleHistory.slice(0, historyIndex + 1);
      // Add new style to history
      newHistory.push(newStyle);
      // Update history and index
      setStyleHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
    setImageStyle(newStyle);
  };

  const handleUndoStyle = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setImageStyle(styleHistory[newIndex]);
      setHasUnsavedChanges(true);
    }
  };

  const handleRedoStyle = () => {
    if (historyIndex < styleHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setImageStyle(styleHistory[newIndex]);
      setHasUnsavedChanges(true);
    }
  };

  const handleImageStyleChange = (style) => {
    handleStyleChange(style);

    // Update settings
    const newSettings = {
      ...settings,
      imageStyle: {
        ...settings.imageStyle,
        style,
        guidelines: imageGuidelines,
        guidelinesEnabled
      }
    };
    handleSettingsChange(newSettings);
  };

  const handleImageGuidelinesChange = (guidelines) => {
    setImageGuidelines(guidelines);
    setHasUnsavedChanges(true);

    // Update settings
    const newSettings = {
      ...settings,
      imageStyle: {
        ...settings.imageStyle,
        style: imageStyle,
        guidelines,
        guidelinesEnabled
      }
    };
    handleSettingsChange(newSettings);
  };

  const handleGuidelinesEnabledChange = (enabled) => {
    setGuidelinesEnabled(enabled);
    setHasUnsavedChanges(true);

    // Update settings
    const newSettings = {
      ...settings,
      imageStyle: {
        ...settings.imageStyle,
        style: imageStyle,
        guidelines: imageGuidelines,
        guidelinesEnabled: enabled
      }
    };
    handleSettingsChange(newSettings);
  };

  const handleGenerateImage = async () => {
    try {
      setIsGeneratingImage(true);
      const response = await apiClient.post('/generate-image', {
        email: impersonatedSite?.email || user?.email,
        site: settings.site,
        title: imageTitle,
        style: imageStyle,
        guidelines: guidelinesEnabled ? imageGuidelines : undefined
      });
      setGeneratedPreview(response?.data?.url);
      toast.success('Image Generated!');
    } catch (err) {
      toast.error('Error generating image');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateContextualImage = async () => {
    try {
      setIsGeneratingContextualImage(true);

      // Determine which style and guidelines to use
      const effectiveStyle = contextualImageStyleReuse ? imageStyle : contextualImageStyle;
      let effectiveGuidelines = null;
      let useCustom = false;

      if (contextualImageGuidelinesMode === 'reuse') {
        effectiveGuidelines = guidelinesEnabled ? imageGuidelines : null;
      } else if (contextualImageGuidelinesMode === 'custom') {
        effectiveGuidelines = contextualImageGuidelines;
        useCustom = true;
      }
      // If mode is 'blawgy', effectiveGuidelines stays null and useCustom stays false

      const response = await apiClient.post('/generate-contextual-image', {
        email: impersonatedSite?.email || user?.email,
        site: settings.site,
        title: contextualImageTestTitle,
        sectionContent: contextualImageTestSection,
        style: effectiveStyle,
        guidelines: effectiveGuidelines,
        useCustomGuidelines: useCustom
      });
      setGeneratedContextualPreview(response?.data?.url);
      toast.success('Contextual Image Generated!');
    } catch (err) {
      toast.error('Error generating contextual image');
    } finally {
      setIsGeneratingContextualImage(false);
    }
  };

  // Blawgy's default guidelines for contextual images (shown to users)
  const blawgyDefaultGuidelines = `CRITICAL GUIDELINES:
• Create specific, detailed descriptions that would generate meaningful, relevant images
• Text and numbers are ALLOWED if they directly help explain the content (e.g., "95% satisfaction rate", "3-step process")
• Use US/English number formatting: use dots (.) for decimals, not commas
• NO generic icons, emojis, or standard symbols (phone, chat bubble, envelope, computer, smartphone, etc.)
• NO notification badges, random numbers, or irrelevant text elements
• NO timeline-style generic visuals with universal symbols
• NO humans, characters, or faces in the image AT ALL
• Professional, modern style that matches the content tone
• Focus on concrete, tangible visual elements that directly relate to the specific content
• MAXIMUM 1-2 visual elements per image (keep it simple and clear)
• Avoid complex data visualizations with multiple charts
• Focus on ONE clear concept or comparison that helps explain the content
• Create images that would actually help a reader understand the specific content better
• Ensure all content fits properly within the image frame with adequate spacing
• Use clear, readable layouts with proper proportions`;

  return (
    <>
      {impersonatedSite && (
        <ImpersonationBanner />
      )}
      <NavbarWrapper
        user={user}
        logout={logout}
        onShowBulkGenerate={() => setShowBulkGenerateModal(true)}
        onShowImageStyle={() => setShowImageStyleModal(true)}
        onShowSupport={() => setShowSupportModal(true)}
        onShowAdmin={() => setShowAdminPanel(true)}
        onShowSubscription={() => setShowSubscriptionModal(true)}
        currentSite={currentSite}
        updateCurrentSite={updateCurrentSite}
      >
        <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen overflow-hidden">
          <div className="w-full bg-white flex flex-col items-start flex-shrink-0 border-b">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center w-full px-4 sm:px-6 py-3 sm:min-h-[96px] gap-2">
              <div data-tour="settings-tabs" className="flex overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                <button
                  onClick={() => handleTabChange('site-settings')}
                  className={`mr-8 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'site-settings' || activeTab === 'basic'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Site Settings
                </button>
                <button
                  onClick={() => handleTabChange('products')}
                  className={`mr-8 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'products'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Products
                </button>
                {/* Only for white-label owners. The API authorizes independently,
                    so hiding this is presentation, not access control. */}
                {isPartnerOwner && (
                  <button
                    onClick={() => handleTabChange('white-label')}
                    className={`mr-8 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'white-label'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    White Label
                  </button>
                )}
                <button
                  data-tour="image-tab"
                  onClick={() => handleTabChange('image-style')}
                  className={`mr-8 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'image-style'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Image Settings
                </button>
                <button
                  data-tour="cms-tab"
                  onClick={() => handleTabChange('cms-connect')}
                  className={`mr-8 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'cms-connect' || activeTab === 'connection'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  CMS Connect
                </button>
                <button
                  onClick={() => handleTabChange('business-locations')}
                  className={`mr-8 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'business-locations'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Business Locations
                </button>
                <button
                  onClick={() => handleTabChange('cta')}
                  className={`mr-8 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'cta'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Call to Action
                </button>
                <button
                  onClick={() => handleTabChange('invite')}
                  className={`mr-8 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'invite'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Invite Users
                </button>
                <button
                  onClick={() => handleTabChange('webhooks')}
                  className={`py-1 text-sm font-medium whitespace-nowrap ${activeTab === 'webhooks'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Webhooks
                </button>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                {hasUnsavedChanges && (
                  <span className="text-sm text-gray-500 hidden sm:inline">
                    Unsaved changes
                  </span>
                )}
                {saveStatus && (
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${saveStatusIsError
                    ? 'bg-red-50 text-red-700'
                    : 'bg-green-100 text-green-800 animate-fade-out'
                    }`}>
                    {saveStatus}
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || isSaving}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium ${hasUnsavedChanges && !isSaving
                    ? 'bg-primary text-white hover:bg-primary-hover'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-4 sm:p-8 w-full">
              {activeTab === 'site-settings' && (
                <div className="space-y-6 w-full text-left max-w-4xl min-w-0">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Description
                      </label>
                      {!isGenerating && (
                        <button
                          className="text-sm font-medium ml-auto flex items-center text-primary hover:text-gray-700"
                          onClick={generateDescription}
                        >
                          <Sparkles className="w-3 h-3 mr-2" />
                          Generate using AI
                        </button>
                      )}
                    </div>
                    {descriptionError && (
                      <p className="text-sm text-red-600">{descriptionError}</p>
                    )}
                    <div className="relative">
                      <textarea
                        value={settings.businessDescription || ''}
                        onChange={handleProductChange}
                        disabled={isGenerating}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 min-h-[120px] resize-y"
                        placeholder="Describe your product or service..."
                      />
                      {isGenerating && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white rounded-md border border-gray-300">
                          <div className="flex flex-col items-center gap-2">
                            <LoaderIcon className="w-6 h-6 text-primary animate-spin" />
                            <span className="text-sm text-gray-600">{generationPhases[generationPhase]}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Target Audience (optional)
                    </label>
                    <p className="text-sm text-gray-500">
                      Who your articles should speak to. Blawgy uses this to guide topics, titles, and writing when it is filled in.
                    </p>
                    <textarea
                      value={settings.targetAudience || ''}
                      onChange={(e) => handleSettingsChange({ ...settings, targetAudience: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 min-h-[80px] resize-y"
                      placeholder="Example: Homeowners in the Denver metro comparing landscaping companies"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        Your keywords
                      </label>
                      {settings.keywords?.length > 0 && (
                        <button
                          onClick={() => setShowClearKeywordsModal(true)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      Your own keywords. Blawgy turns these into articles at the rate the mix below sets. At 0, it writes from your discovered topics only. Use terms your audience actually searches for.{' '}
                      <a
                        href="https://www.semrush.com/blog/keyword-research/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-gray-600"
                      >
                        Here's a guide on how to find good keywords
                      </a>
                    </p>

                    <div className="flex gap-2 mb-2">
                      <textarea
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddKeyword();
                          }
                        }}
                        className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 min-h-[38px] max-h-32"
                        placeholder="Add keywords (comma or new line separated)"
                        rows={1}
                      />
                      <button
                        onClick={handleAddKeyword}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors text-sm font-medium"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 max-h-[25vh] overflow-y-auto">
                      {settings.keywords?.map((keyword, index) => {
                        // E4: per-keyword status badge + subtle volume, from the
                        // keyword-status endpoint. Absent status => plain chip.
                        const st = keywordStatus[String(keyword).trim().toLowerCase()];
                        const badge = st ? keywordBadgeMeta(st.status) : null;
                        const hasVolume = st && Number.isFinite(Number(st.volume));
                        const hasKd = st && Number.isFinite(Number(st.kd));
                        const title = st?.status === 'covered' ? coveredByText(st.coveredBy) : undefined;
                        return (
                          <button
                            key={index}
                            onClick={() => handleRemoveKeyword(keyword)}
                            title={title}
                            data-testid={`keyword-chip-${keyword}`}
                            className="flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors group"
                          >
                            <span>{keyword}</span>
                            {badge && (
                              <span
                                data-testid={`keyword-badge-${keyword}`}
                                className={`text-[10px] font-medium leading-none px-1.5 py-0.5 rounded-full ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            )}
                            {(hasVolume || hasKd) && (
                              <span className="text-[10px] text-gray-400 tabular-nums leading-none">
                                {hasVolume ? `${formatVolume(st.volume)}/mo` : ''}
                                {hasVolume && hasKd ? ' · ' : ''}
                                {hasKd ? `KD ${st.kd}` : ''}
                              </span>
                            )}
                            <span className="text-gray-400 group-hover:text-gray-600">×</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* E3: mix slider — share of each week's articles that come from
                      your keywords vs discovered topics. Saves via the plan-config
                      PATCH (debounced), independent of the main settings save. */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Keyword mix
                    </label>
                    <p className="text-sm text-gray-500">
                      Choose how much of each week comes from your keywords versus the topics Blawgy discovers.
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-xs font-medium text-gray-600 w-28 shrink-0">Discovered topics</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={manualKeywordRatio}
                        onChange={(e) => handleManualRatioChange(e.target.value)}
                        className="w-full"
                        aria-label="Keyword mix"
                        data-testid="manual-ratio-slider"
                      />
                      <span className="text-xs font-medium text-gray-600 w-28 shrink-0 text-right">Your keywords</span>
                    </div>
                    <p className="text-sm text-gray-500 text-center" data-testid="mix-split-text">
                      {describeMix(manualKeywordRatio, planPostsPerWeek)}
                    </p>
                    {/* Static reassurance: the mix isn't retroactive, it takes
                        effect on the next weekly plan build. */}
                    <p className="text-xs text-gray-400 text-center" data-testid="mix-refresh-note">
                      Changes apply at the next weekly refresh.
                    </p>
                    {/* Signal a: keywords saved but the mix is 0, so none of them
                        turn into articles. */}
                    {showRaiseMixSignal && (
                      <div
                        data-testid="mix-raise-signal"
                        className="text-sm text-gray-700 bg-blue-50 border border-blue-200 rounded-md p-3"
                      >
                        You have {savedKeywordCount} saved keyword{savedKeywordCount === 1 ? '' : 's'}, but the mix is at 0, so none of them become articles. Raise it above 0 to start turning your keywords into posts.
                      </div>
                    )}
                    {/* Signal b: the mix wants their keywords but the whole list is
                        already scheduled, published, or covered. */}
                    {showAddMoreSignal && (
                      <div
                        data-testid="mix-add-more-signal"
                        className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded-md p-3"
                      >
                        Every keyword on your list is already scheduled, published, or covered. Add more keywords above to keep your share of the mix filled.
                      </div>
                    )}
                  </div>

                  {/* E2: discovered topics — research clusters, prunable. Pruning
                      writes config.excludedTopics/excludedKeywords via /topics/exclude
                      and only affects FUTURE articles (not scheduled/published ones). */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Discovered topics
                    </label>
                    <p className="text-sm text-gray-500 mb-2">
                      Topics Blawgy found by researching your site and market. Remove anything you don't want covered. Pruning only affects future articles; anything already scheduled or published stays put.
                    </p>

                    {clustersLoading && discoveredClusters.length === 0 ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                        <LoaderIcon className="w-4 h-4 animate-spin" />
                        Loading your discovered topics...
                      </div>
                    ) : clustersError ? (
                      <p className="text-sm text-gray-500 py-4">
                        We couldn't load your discovered topics right now. Try refreshing the page.
                      </p>
                    ) : discoveredClusters.length === 0 ? (
                      <p className="text-sm text-gray-500 py-4">
                        {clustersProcessing
                          ? 'Blawgy is still researching your topics. Check back in a few minutes.'
                          : 'No discovered topics yet. Blawgy will add them as it researches your site.'}
                      </p>
                    ) : (
                      <div className="space-y-2" data-testid="discovered-topics-list">
                        {discoveredClusters.map((cluster, ci) => {
                          const label = cluster?.label || cluster?.pillarKeyword || `Topic ${ci + 1}`;
                          const kws = Array.isArray(cluster?.keywords) ? cluster.keywords : [];
                          const count = cluster?.keywordCount ?? kws.length;
                          const topicExcluded = isTopicExcluded(label);
                          const expanded = expandedClusters.has(label);
                          return (
                            <div
                              key={`${label}-${ci}`}
                              className={`border rounded-lg ${topicExcluded ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-white'}`}
                              data-testid="discovered-topic"
                            >
                              <div className="flex items-center gap-2 p-3">
                                <button
                                  type="button"
                                  onClick={() => toggleClusterExpanded(label)}
                                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                                  aria-expanded={expanded}
                                >
                                  {expanded
                                    ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                                    : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                                  <span className={`text-sm font-medium truncate ${topicExcluded ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                    {label}
                                  </span>
                                  <span className="text-xs text-gray-400 shrink-0">
                                    {count} keyword{count === 1 ? '' : 's'} · {formatVolume(cluster?.totalVolume)}/mo
                                  </span>
                                  {!topicExcluded && cluster?.covered && (
                                    <span className="text-xs text-emerald-700 shrink-0">Already covered</span>
                                  )}
                                </button>
                                {topicExcluded ? (
                                  <button
                                    type="button"
                                    onClick={() => excludeTopic(label, true)}
                                    className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover shrink-0"
                                    data-testid="restore-topic"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" /> Restore
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => excludeTopic(label, false)}
                                    aria-label={`Remove topic ${label}`}
                                    className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0"
                                    data-testid="exclude-topic"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>

                              {expanded && (
                                <div className="border-t border-gray-100 divide-y divide-gray-50">
                                  {kws.length === 0 ? (
                                    <p className="px-3 py-2 text-xs text-gray-400">No keywords in this topic.</p>
                                  ) : kws.map((kw, ki) => {
                                    const term = kw?.kw || kw?.keyword || '';
                                    const kwExcluded = topicExcluded || isKeywordExcluded(term);
                                    return (
                                      <div key={`${term}-${ki}`} className="flex items-center gap-2 px-3 py-2" data-testid="discovered-keyword">
                                        <span className={`text-sm min-w-0 flex-1 truncate ${kwExcluded ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                          {term}
                                        </span>
                                        <span className="text-xs text-gray-400 tabular-nums shrink-0">{formatVolume(kw?.volume)}</span>
                                        {kw?.kd !== undefined && kw?.kd !== null && (
                                          <span className="text-xs text-gray-400 shrink-0">KD {kw.kd}</span>
                                        )}
                                        {kw?.intent && (
                                          <span className="text-xs text-gray-400 shrink-0 capitalize">{kw.intent}</span>
                                        )}
                                        {kw?.covered && !kwExcluded && (
                                          <span className="text-xs text-emerald-700 shrink-0">Covered</span>
                                        )}
                                        {topicExcluded ? null : isKeywordExcluded(term) ? (
                                          <button
                                            type="button"
                                            onClick={() => excludeKeyword(term, true)}
                                            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover shrink-0"
                                            data-testid="restore-keyword"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5" /> Restore
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => excludeKeyword(term, false)}
                                            aria-label={`Remove keyword ${term}`}
                                            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0"
                                            data-testid="exclude-keyword"
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Competitors (optional)
                      </label>
                      <button
                        onClick={handleFindCompetitors}
                        disabled={!settings.site || !settings.businessDescription || isFindingCompetitors}
                        className="text-primary hover:text-gray-700 text-sm font-medium ml-auto disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        {isFindingCompetitors ? 'Finding...' : 'Find Competitors'}
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      Add your main competitors to help generate more targeted blog content. These will be used to create comparison articles and position your business effectively, but we will never recommend their content or link to them externally.
                    </p>

                    <div className="flex gap-2 mb-2">
                      <textarea
                        value={newCompetitor}
                        onChange={(e) => setNewCompetitor(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddCompetitor();
                          }
                        }}
                        className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 min-h-[38px] max-h-32"
                        placeholder="Add competitors (comma or new line separated)"
                        rows={1}
                      />
                      <button
                        onClick={handleAddCompetitor}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors text-sm font-medium"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4 max-h-[25vh] overflow-y-auto">
                      {settings.competitors?.map((competitor, index) => (
                        <button
                          key={index}
                          onClick={() => handleRemoveCompetitor(competitor)}
                          className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors group"
                        >
                          <span>{competitor}</span>
                          <span className="text-gray-400 group-hover:text-gray-600">×</span>
                        </button>
                      ))}
                    </div>

                    {suggestedCompetitors.length > 0 && (
                      <div className="mb-4">
                        <div className="space-y-2">
                          {suggestedCompetitors.map((competitor, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                              <div className="flex-1">
                                <div className="text-sm text-gray-800 mb-1">{competitor.domain}</div>
                                <div className="text-xs text-gray-500">Reasoning: {competitor.reasoning}</div>
                              </div>
                              <button
                                onClick={() => handleAddSuggestedCompetitor(competitor)}
                                className="ml-3 px-2 py-1 bg-primary text-white text-xs rounded-md hover:bg-primary-hover transition-colors"
                              >
                                Add
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Internal Links
                        </label>
                        <p className="text-sm text-gray-500">
                          Add internal links to reference in your articles. We'll automatically pick the most relevant ones for each article.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={internalLinkToggle}
                          onChange={(e) => setInternalLinkToggle(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    {internalLinkToggle &&
                      <div>
                        <div className="flex gap-2 mt-2">
                          <div className="w-60">
                            <input
                              type="text"
                              value={settings.sitemapUrl || ''}
                              onChange={(e) => handleSettingsChange({
                                ...settings,
                                sitemapUrl: e.target.value
                              })}
                              placeholder="Enter custom sitemap URL (optional)"
                              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                            />
                          </div>
                          <button
                            onClick={fetchSitemap}
                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors text-sm font-medium flex items-center"
                          >
                            <FileJson className="w-4 h-4 mr-2" />
                            Fetch from Sitemap
                          </button>
                          <button
                            onClick={() => setManualLinkToggle(!manualLinkToggle)}
                            className="text-primary hover:text-gray-700 text-sm font-medium flex items-center"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Manual Link
                          </button>
                        </div>

                        <div className="space-y-4 mt-4">
                          {manualLinkToggle &&
                            <div className="grid gap-4">
                              <div className="grid gap-2">
                                <label className="block text-xs font-medium text-gray-700">
                                  URL
                                </label>
                                <div className="flex gap-2">
                                  <textarea
                                    id="url"
                                    placeholder="Enter URL"
                                    value={newUrl}
                                    onChange={(e) => setNewUrl(e.target.value)}
                                    className="flex-1 p-2 border rounded-md min-h-[38px] max-h-32"
                                    rows={1}
                                  />
                                  <button
                                    onClick={addLink}
                                    disabled={!newUrl}
                                    className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed border"
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                              <div className="grid gap-2">
                                <label className="block text-xs font-medium text-gray-700">
                                  Description (optional)
                                </label>
                                <textarea
                                  id="description"
                                  placeholder="Enter description"
                                  value={newDescription}
                                  onChange={(e) => setNewDescription(e.target.value)}
                                  className="flex-1 p-2 border rounded-md min-h-[38px] max-h-32"
                                  rows={2}
                                ></textarea>
                              </div>
                            </div>}

                          {settings?.internalLinks?.length > 0 && (
                            <div className="border rounded-lg mt-4 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                              {settings?.internalLinks?.map((link, index) => (
                                <div
                                  key={index}
                                  className="flex items-start justify-between p-4 border-b last:border-b-0 bg-white"
                                >
                                  <div className="grid gap-1">
                                    <div className="flex items-center gap-2">
                                      <Link2 className="w-4 h-4 text-muted-foreground" />
                                      <span className="font-medium">{link.url}</span>
                                    </div>
                                    {link.description && (
                                      <p className="text-sm text-muted">{link.description}</p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => removeLink(index)}
                                    className="btn-ghost"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {settings?.internalLinks?.length > 0 &&
                            <label className="block text-sm font-medium text-gray-700">
                              {settings?.internalLinks?.length} links added</label>}
                        </div>
                      </div>}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <div className="text-left">
                        <label className="text-sm font-medium text-gray-700">External Links</label>
                        <p className="text-xs text-gray-500 mt-1">
                          Include relevant external links to research articles, case studies, and other authoritative blog posts
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleChange('links')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.links ? 'bg-emerald-500' : 'bg-gray-200'
                          }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.links ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div className="text-left">
                        <label className="text-sm font-medium text-gray-700">YouTube Videos</label>
                        <p className="text-xs text-gray-500 mt-1">
                          Automatically embed relevant YouTube videos related to your article topics
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleChange('videos')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.videos ? 'bg-emerald-500' : 'bg-gray-200'
                          }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.videos ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>

                    <div className="text-left">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                      </label>
                      <select
                        value={settings.language}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="" disabled>
                          Select a language
                        </option>
                        {languages.map((language, index) => (
                          <option key={index} value={language}>
                            {language}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <RedoOnboardingCard />

                  {/* Danger Zone — soft-delete site + cancel subscription */}
                  <div
                    data-testid="danger-zone"
                    className="mt-12 border border-red-200 rounded-lg p-6 bg-red-50/40"
                  >
                    <h3 className="text-base font-semibold text-red-700 mb-2">Danger Zone</h3>
                    <p className="text-sm text-gray-700 mb-4">
                      Deleting a site cancels its subscription and archives its content. You can restore it by contacting support.
                    </p>
                    <button
                      type="button"
                      data-testid="delete-site-button"
                      onClick={() => setShowDeleteSiteModal(true)}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                    >
                      Delete Site
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'cms-connect' && (
                <div className="space-y-6 w-full text-left max-w-4xl min-w-0">
                  <div className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Website URL
                        </label>
                        <input
                          disabled
                          value={settings?.site || site?.site}
                          onChange={(e) => handleCredentialsChange('site', e.target.value)}
                          className="w-full p-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Enter website URL"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Website Platform
                        </label>
                        <select
                          value={settings.blogType || ''}
                          onChange={handleBlogTypeChange}
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="" disabled>Select your website platform</option>
                          {platforms.map((platform) => (
                            <option key={platform.value} value={platform.value}>
                              {platform.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {['wordpress', 'ghost', 'shopify', 'wix', 'framer'].includes(settings.blogType) && (
                      <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">Post as draft</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              Send new articles to your site as drafts instead of publishing them live. Review and publish them yourself from Blawgy whenever you're ready.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleChange('draft')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.draft ? 'bg-emerald-500' : 'bg-gray-200'}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.draft ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                          </button>
                        </div>
                      </div>
                    )}

                    {settings.blogType === 'wordpress' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            WordPress Username
                          </label>
                          <input
                            type="text"
                            value={settings.username || ''}
                            onChange={(e) => handleCredentialsChange('username', e.target.value)}
                            className="w-full p-2 border rounded-md"
                            placeholder="Your wordpress admin username"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Application Password
                          </label>
                          <input
                            type="password"
                            value={settings.appPassword || ''}
                            onChange={(e) => handleCredentialsChange('appPassword', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                            placeholder="Enter application password"
                          />
                        </div>
                        <div className="flex items-center">
                          <button
                            onClick={testConnection}
                            disabled={testingConnection}
                            className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {testingConnection && <LoaderIcon className="animate-spin" size={16} />}
                            {testingConnection ? 'Testing...' : 'Test Connection'}
                          </button>
                          {connectionError && (
                            <span className="ml-3 text-sm text-red-600 flex items-center">{connectionError}</span>
                          )}
                          {connectionSuccess && (
                            <span className="ml-3 text-sm text-green-600 flex items-center">{connectionSuccess}</span>
                          )}
                        </div>

                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mt-4">
                          <div className="flex items-center justify-between">
                            <div className="text-left pr-4">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium text-gray-900">RRH Integration</h3>
                                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">Add-on</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                Automatically places a Rank Ecommerce product carousel in each article, matched to the topic. For WordPress sites built on Rank Really High.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSettingsChange({ ...settings, rrh: { ...(settings.rrh || {}), enabled: !settings.rrh?.enabled } })}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${settings.rrh?.enabled ? 'bg-emerald-500' : 'bg-gray-200'}`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.rrh?.enabled ? 'translate-x-6' : 'translate-x-1'}`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {settings.blogType === 'webflow' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Webflow API Token
                          </label>
                          <input
                            type="password"
                            value={settings.apiToken || ''}
                            onChange={(e) => handleCredentialsChange('apiToken', e.target.value)}
                            className="w-full p-2 border rounded-md"
                            placeholder="Enter your Webflow API token"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Collection ID
                          </label>
                          <input
                            type="text"
                            value={settings.collectionId || ''}
                            onChange={(e) => handleCredentialsChange('collectionId', e.target.value)}
                            className="w-full p-2 border rounded-md"
                            placeholder="Enter your Webflow collection ID"
                          />
                        </div>

                        <div className="flex items-center">
                          <button
                            onClick={testConnection}
                            disabled={testingConnection}
                            className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {testingConnection && <LoaderIcon className="animate-spin" size={16} />}
                            {testingConnection ? 'Testing...' : 'Test Connection'}
                          </button>

                          {connectionError && (
                            <span className="ml-3 text-sm text-red-600 flex items-center">{connectionError}</span>
                          )}
                          {connectionSuccess && (
                            <span className="ml-3 text-sm text-green-600 flex items-center">{connectionSuccess}</span>
                          )}
                        </div>

                        {settings.apiToken && settings.collectionId && (
                          <div className="mt-6 border-t pt-6">
                            <WebflowFieldMapper
                              settings={settings}
                              fetchedFields={fetchedFields}
                              onSettingsChange={handleSettingsChange}
                              onFetchedFieldsChange={setFetchedFields}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {settings.blogType === 'shopify' && (
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h3 className="text-sm font-medium text-gray-900 mb-2">Connecting Shopify</h3>
                          <p className="text-sm text-gray-700 mb-2">Shopify changed this in 2026. You now create the app in Shopify's <span className="font-medium">Dev Dashboard</span>, not in your store admin.</p>
                          <p className="text-xs font-semibold text-gray-900 mb-1">In Shopify</p>
                          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 mb-3">
                            <li>Go to <span className="font-medium">dev.shopify.com/dashboard</span> and sign in with your Shopify account.</li>
                            <li>Click <span className="font-medium">Apps &rarr; Create app</span> (top right), then <span className="font-medium">Start from Dev Dashboard</span>. Name it Blawgy and click Create.</li>
                            <li>Open the <span className="font-medium">Versions</span> tab. Under access scopes, add <span className="font-medium">write_content</span>, <span className="font-medium">read_content</span>, and <span className="font-medium">read_products</span>, then click <span className="font-medium">Release</span>.</li>
                            <li>Click <span className="font-medium">Home &rarr; Install app</span>, choose your store, and install. This is easy to miss but required.</li>
                            <li>Click <span className="font-medium">Settings</span> and copy your <span className="font-medium">Client ID</span> and <span className="font-medium">Client secret</span>.</li>
                          </ol>
                          <p className="text-xs font-semibold text-gray-900 mb-1">Back here in Blawgy</p>
                          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700" start="6">
                            <li>Enter your store name (just the part before <span className="font-medium">.myshopify.com</span>), then paste your Client ID and Client secret below.</li>
                            <li>Pick your <span className="font-medium">Blog category</span> and <span className="font-medium">Author</span> from the dropdowns. They fill in once your credentials are right.</li>
                            <li>Click <span className="font-medium">Test Connection</span> to check it.</li>
                            <li className="font-semibold text-gray-900">Click <span className="font-medium">Save Changes</span> at the top of this page. Testing the connection does not save it. If you skip Save, nothing is stored.</li>
                          </ol>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Shopify Site Name
                          </label>
                          <input
                            type="text"
                            value={settings.siteName || ''}
                            onChange={(e) => handleCredentialsChange('siteName', e.target.value)}
                            className="w-full p-2 border rounded-md"
                            placeholder="your-store (without .myshopify.com)"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Client ID
                          </label>
                          <input
                            type="text"
                            value={settings.shopifyClientId || ''}
                            onChange={(e) => handleCredentialsChange('shopifyClientId', e.target.value)}
                            className="w-full p-2 border rounded-md"
                            placeholder="Enter Client ID from Dev Dashboard"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Client Secret
                          </label>
                          <input
                            type="password"
                            value={settings.shopifyClientSecret || ''}
                            onChange={(e) => handleCredentialsChange('shopifyClientSecret', e.target.value)}
                            className="w-full p-2 border rounded-md"
                            placeholder="Enter Client Secret from Dev Dashboard"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Shopify Category ID
                          </label>
                          <select
                            value={settings.categoryId || ''}
                            onChange={(e) => handleCredentialsChange('categoryId', e.target.value)}
                            className="w-full p-2 border rounded-md"
                          >
                            <option value="" disabled>Select blog category</option>
                            {(shopifyCategories || [])?.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.title}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Author Name
                          </label>
                          <select
                            value={settings.author || ''}
                            onChange={(e) => handleCredentialsChange('author', e.target.value)}
                            className="w-full p-2 border rounded-md"
                          >
                            <option value="" disabled>Select author</option>
                            {(shopifyAuthors || [])?.map((author) => (
                              <option key={author.name} value={author.name}>
                                {author.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center">
                          <button
                            onClick={testConnection}
                            disabled={testingConnection}
                            className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {testingConnection && <LoaderIcon className="animate-spin" size={16} />}
                            {testingConnection ? 'Testing...' : 'Test Connection'}
                          </button>

                          {connectionError && (
                            <span className="ml-3 text-sm text-red-600 flex items-center">{connectionError}</span>
                          )}
                          {connectionSuccess && (
                            <span className="ml-3 text-sm text-green-600 flex items-center">{connectionSuccess}</span>
                          )}
                        </div>
                      </div >
                    )}
                    {settings.blogType === 'wix' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Wix API Key
                          </label>
                          <input
                            type="text"
                            value={settings.apiKey || ''}
                            onChange={(e) => handleCredentialsChange('apiKey', e.target.value)}
                            className="w-full p-2 border rounded-md"
                            placeholder="Enter your Wix API key"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Wix Site ID
                          </label>
                          <input
                            type="text"
                            value={settings.siteId || ''}
                            onChange={(e) => handleCredentialsChange('siteId', e.target.value)}
                            className="w-full p-2 border rounded-md"
                            placeholder="Enter your Wix site ID"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Wix Member
                          </label>
                          <select
                            value={settings.memberId || ''}
                            onChange={(e) => handleCredentialsChange('memberId', e.target.value)}
                            className="w-full p-2 border rounded-md"
                          >
                            <option value="" disabled>Select Member</option>
                            {(wixMembers || [])?.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                    {settings.blogType === 'framer' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Framer project link
                          </label>
                          <input
                            type="text"
                            value={settings.framerProjectUrl || ''}
                            onChange={(e) => handleCredentialsChange('framerProjectUrl', e.target.value)}
                            className="w-full p-2 border rounded-md"
                            placeholder="framer.com/projects/yoursite-AbC123"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Framer API key
                          </label>
                          <input
                            type="password"
                            value={settings.framerApiKey || ''}
                            onChange={(e) => handleCredentialsChange('framerApiKey', e.target.value)}
                            className="w-full p-2 border rounded-md"
                            placeholder="Paste the key you created in Framer"
                          />
                        </div>
                        <div className="flex items-center">
                          <button
                            onClick={testConnection}
                            disabled={testingConnection || !settings.framerProjectUrl || !settings.framerApiKey}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                          >
                            {testingConnection ? 'Testing...' : 'Test Connection'}
                          </button>
                          {framerProjectName && !connectionError && !connectionSuccess && (
                            <span className="ml-3 text-sm text-gray-600 flex items-center">Connected to {framerProjectName}</span>
                          )}
                        </div>
                        {connectionError && (
                          <p className="text-sm text-red-600">{connectionError}</p>
                        )}
                        {connectionSuccess && (
                          <p className="text-sm text-green-600">{connectionSuccess}</p>
                        )}
                        {(framerCollections || []).length > 0 && (
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Blog collection
                            </label>
                            <select
                              value={settings.framerCollectionId || ''}
                              onChange={(e) => handleFramerCollectionSelect(e.target.value)}
                              className="w-full p-2 border rounded-md"
                            >
                              <option value="" disabled>Choose where your posts live</option>
                              {(framerCollections || []).map((collection) => (
                                <option key={collection.id} value={collection.id}>
                                  {collection.name}
                                </option>
                              ))}
                            </select>
                            {settings.framerCollectionId && settings.framerFieldMap && (
                              <p className="text-xs text-gray-500">
                                We matched your title, article text, and image automatically. If something looks wrong, message us via Help and we'll fix it with you.
                              </p>
                            )}
                          </div>
                        )}
                        {settings.framerCollectionId && (
                          <label className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.framerPublishConsent === true}
                              onChange={(e) => handleFramerConsentChange(e.target.checked)}
                              className="mt-0.5"
                            />
                            <span className="text-sm text-gray-700">
                              I understand that when Blawgy publishes or updates a post, my whole Framer site publishes with it, including any unfinished edits I have in the Framer editor. Until this box is checked, Blawgy delivers articles by email instead of publishing them.
                            </span>
                          </label>
                        )}
                        <div className="mt-4 p-5 bg-gray-100 rounded-lg text-sm h-fit">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 mr-3">
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                <HelpCircle className="w-4 h-4 text-gray-700" />
                              </div>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700 mb-3">Connecting Framer</p>
                              <p className="text-gray-700 mb-2">
                                You'll need two things from Framer: your project link and an API key. Grab a computer for this, the Framer phone app doesn't show what we need. Keep Framer open in one tab and Blawgy in this one.
                              </p>
                              <ol className="space-y-2 text-gray-700 list-decimal ml-5">
                                <li>Open your site at framer.com like you're going to edit it.</li>
                                <li>Copy the web address from the top of your browser (it looks like framer.com/projects/yoursite-AbC123) and paste it into the Framer project link field here.</li>
                                <li>Back in Framer, click the gear icon in the top right to open Site Settings, then scroll down the General tab to API Keys.</li>
                                <li>Click to create a new API key, name it Blawgy, and copy it.</li>
                                <li>Paste the key into the Framer API key field here and click Test Connection.</li>
                                <li>Choose the collection where your blog posts live (usually called Blog or Posts). We save your setup as you go.</li>
                                <li>Check the publishing box once you've read it. Framer publishes your whole site whenever a post goes out or gets updated, so any unfinished edits you leave in the editor would go live too.</li>
                              </ol>
                              <p className="text-gray-700 mt-3">
                                Don't see API Keys in Framer? You may need to be the site's owner (whoever created the site). Ask them to make the key for you, or message us via Help and we'll sort it out.
                              </p>
                              <p className="text-gray-700 mt-2">
                                <span className="font-medium">Good to know:</span> your site needs a blog page that shows your posts collection. Most Framer templates include one. If posts show as published here but you can't find them on your site, that page is probably missing. Message us via Help and we'll help you add it. You can revoke Blawgy's access anytime by deleting the key in Framer.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {['ghost', 'manual'].includes(settings.blogType) && (
                      <div className="mt-4 p-5 bg-gray-100 rounded-lg text-sm h-fit">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 mr-3">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                              <HelpCircle className="w-4 h-4 text-gray-700" />
                            </div>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700 mb-1">We'll set this up with you</p>
                            <p className="text-gray-700">
                              Setup for {settings.blogType === 'ghost' ? 'Ghost' : 'a custom API connection'} takes a few minutes with us. Message us via Help and we'll connect it with you.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div >
                  {settings.blogType === 'wordpress' && (
                    <div className="mt-4 p-5 bg-gray-100 rounded-lg text-sm h-fit">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mr-3">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                            <HelpCircle className="w-4 h-4 text-gray-700" />
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 mb-3">How to get your WordPress credentials</p>
                          <ol className="space-y-2 text-gray-700 list-decimal ml-5">
                            <li className="text-gray-700">Log in to your WordPress admin dashboard</li>
                            <li className="text-gray-700">Go to Users &gt; Profile (or Users &gt; All Users &gt; [Your User])</li>
                            <li className="text-gray-700">Scroll down to "Application Passwords" section</li>
                            <li className="text-gray-700">Enter a name for the application</li>
                            <li className="text-gray-700">Click "Add New Application Password"</li>
                            <li className="text-gray-700">Copy the generated password immediately (it won't be shown again)</li>
                            <li className="text-gray-700">Use your WordPress username and the application password here</li>
                          </ol>
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md max-w-[500px]">
                            <p className="text-yellow-800 text-sm">
                              <strong>Note:</strong> Application passwords require WordPress 5.6+ and may need to be enabled by your hosting provider. If you don't see this option, contact your host or use a plugin like "Application Passwords".
                            </p>
                          </div>
                          <a
                            href="https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-3 text-gray-700 hover:underline"
                          >
                            Learn more about WordPress Application Passwords
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                  {settings.blogType === 'webflow' && (
                    <div className="mt-4 p-5 bg-gray-100 rounded-lg text-sm h-fit">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mr-3">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                            <HelpCircle className="w-4 h-4 text-gray-700" />
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 mb-3">How to get your Webflow credentials</p>
                          <ol className="space-y-2 text-gray-700 list-decimal ml-5">
                            <li className="text-gray-700">Go to your Webflow project dashboard</li>
                            <li className="text-gray-700">Navigate to Site Settings &gt; Apps & Integrations</li>
                            <li className="text-gray-700">Generate a new API token with read and write permissions</li>
                            <li className="text-gray-700">Find your collection ID in the Collection settings</li>
                          </ol>
                          <a
                            href="https://help.webflow.com/hc/en-us/articles/33961356296723-Intro-to-Webflow-s-APIs#01JE6P4KVMD1SNJ4K8CXKDZBFZ"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-3 text-gray-700 hover:underline"
                          >
                            Learn more about Webflow API
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                  {settings.blogType === 'wix' && (
                    <div className="mt-4 p-5 bg-gray-100 rounded-lg text-sm h-fit">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mr-3">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                            <HelpCircle className="w-4 h-4 text-gray-700" />
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 mb-3">How to get your Wix credentials</p>
                          <ol className="space-y-2 text-gray-700 list-decimal ml-5">
                            <li className="text-gray-700">Log in to Wix, click your profile icon, and open Account Settings</li>
                            <li className="text-gray-700">Go to API Keys and generate a new key with all site permissions</li>
                            <li className="text-gray-700">Copy the key right away and paste it into the Wix API Key field above</li>
                            <li className="text-gray-700">Open your site's dashboard and look at the URL. The long string of letters and numbers is your Site ID (it looks like b4dc73e0-7146-4946-881a-0f096a444249)</li>
                            <li className="text-gray-700">Paste the Site ID into the field above</li>
                            <li className="text-gray-700">We'll pull in the members from your site automatically. Pick the one your posts should publish as</li>
                            <li className="text-gray-700">Want posts under a different name? Create a new member in your Wix dashboard and it will show up here</li>
                          </ol>
                        </div >
                      </div>
                    </div>
                  )}
                </div>)}
              {activeTab === 'image-style' && (
                <div className="space-y-6 w-full text-left max-w-4xl min-w-0">
                  {/* Include Images Toggle */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Include Images in Articles</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Automatically generate and include relevant images throughout your blog articles
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleChange('includeImages')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.includeImages ? 'bg-emerald-500' : 'bg-gray-200'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.includeImages ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Product Image Settings */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-900">Product Images</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Use your synced product images instead of AI-generated images
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-700">Use product images for featured image</p>
                          <p className="text-xs text-gray-500">When products are linked to an article, use their image as the featured image</p>
                        </div>
                        <button
                          onClick={() => {
                            setUseProductImagesForFeatured(!useProductImagesForFeatured);
                            setHasUnsavedChanges(true);
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useProductImagesForFeatured ? 'bg-emerald-500' : 'bg-gray-200'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useProductImagesForFeatured ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </button>
                      </div>

                      <p className="text-sm text-gray-500 mt-2">
                        In-article images automatically use product photos when mentioned, AI images otherwise.
                      </p>
                    </div>
                  </div>

                  {/* Visual Style Section */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Visual Style</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Define the artistic style for generated images (e.g., realistic, cartoon, 3D)
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleUndoStyle}
                          disabled={historyIndex <= 0}
                          className={`p-1 rounded ${historyIndex <= 0 ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-100'}`}
                          title="Undo style change"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleRedoStyle}
                          disabled={historyIndex >= styleHistory.length - 1}
                          className={`p-1 rounded ${historyIndex >= styleHistory.length - 1 ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-100'}`}
                          title="Redo style change"
                        >
                          <RotateCcw className="w-4 h-4 transform scale-x-[-1]" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      placeholder="e.g., professional photography, minimalist, vibrant colors, soft lighting..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[80px] text-sm"
                      value={imageStyle}
                      onChange={(e) => handleImageStyleChange(e.target.value)}
                    />
                  </div>

                  {/* Image Guidelines Section */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Image Guidelines</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Add specific constraints for what should or shouldn't appear in generated images
                        </p>
                      </div>
                      <button
                        onClick={() => handleGuidelinesEnabledChange(!guidelinesEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${guidelinesEnabled ? 'bg-emerald-500' : 'bg-gray-200'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${guidelinesEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>
                    <AnimatePresence>
                      {guidelinesEnabled && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <textarea
                            placeholder="e.g., Never show any products or sellable objects. Only create editorial-style images showing environments, textures, natural lighting, and atmospheric interior spaces..."
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[100px] text-sm"
                            value={imageGuidelines}
                            onChange={(e) => handleImageGuidelinesChange(e.target.value.slice(0, 5000))}
                            maxLength={5000}
                          />
                          <div className="flex justify-end mt-1">
                            <span className={`text-xs ${imageGuidelines.length >= 4500 ? 'text-amber-600' : 'text-gray-400'}`}>
                              {imageGuidelines.length}/5000
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Preview Section */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <button
                      onClick={() => setShowImageOptions(!showImageOptions)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Test Image Generation</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Preview how your style and guidelines affect generated images
                        </p>
                      </div>
                      {showImageOptions ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </button>
                    <AnimatePresence>
                      {showImageOptions && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-4 space-y-4"
                        >
                          {generatedPreview && (
                            <div className="mb-4">
                              <img
                                src={generatedPreview}
                                alt="Preview"
                                className="mx-auto max-h-[300px] rounded-lg border border-gray-200"
                              />
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Test Image Description
                            </label>
                            <input
                              type="text"
                              placeholder="e.g., A modern bathroom with natural stone tiles"
                              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                              value={imageTitle}
                              onChange={(e) => setImageTitle(e.target.value)}
                            />
                          </div>
                          <button
                            className="w-full bg-primary text-white font-medium py-2.5 px-4 rounded-lg hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleGenerateImage}
                            disabled={isGeneratingImage || !imageTitle}
                          >
                            {isGeneratingImage ? "Generating..." : "Generate Test Image"}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 my-6"></div>

                  {/* In-Article (Contextual) Images Section Header */}
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">In-Article Images</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Configure the style and guidelines for images generated throughout your articles
                    </p>
                  </div>

                  {/* Contextual Image Style Section */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">In-Article Image Style</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Define the artistic style for images within your articles
                        </p>
                      </div>
                    </div>

                    {/* Reuse Style Checkbox */}
                    <div className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        id="contextualStyleReuse"
                        checked={contextualImageStyleReuse}
                        onChange={(e) => {
                          setContextualImageStyleReuse(e.target.checked);
                          setHasUnsavedChanges(true);
                        }}
                        className="h-4 w-4 text-gray-700 focus:ring-gray-500 border-gray-300 rounded"
                      />
                      <label htmlFor="contextualStyleReuse" className="ml-2 text-sm text-gray-700">
                        Reuse style from featured image
                      </label>
                    </div>

                    <AnimatePresence>
                      {!contextualImageStyleReuse && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <textarea
                            placeholder="e.g., clean infographic style, data visualization, modern diagrams..."
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[80px] text-sm"
                            value={contextualImageStyle}
                            onChange={(e) => {
                              setContextualImageStyle(e.target.value);
                              setHasUnsavedChanges(true);
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Contextual Image Guidelines Section */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-900">In-Article Image Guidelines</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Set constraints for images generated within your article content
                      </p>
                    </div>

                    {/* Radio Options */}
                    <div className="space-y-4">
                      {/* Option 1: Use Blawgy's Guidelines (DEFAULT) */}
                      <div className="space-y-3">
                        <div className="flex items-start">
                          <input
                            type="radio"
                            id="guidelinesBlawgy"
                            name="contextualGuidelinesMode"
                            checked={contextualImageGuidelinesMode === 'blawgy'}
                            onChange={() => {
                              setContextualImageGuidelinesMode('blawgy');
                              setHasUnsavedChanges(true);
                            }}
                            className="h-4 w-4 mt-0.5 text-gray-700 focus:ring-gray-500 border-gray-300"
                          />
                          <label htmlFor="guidelinesBlawgy" className="ml-2 text-sm text-gray-700 font-medium">
                            Use Blawgy's default guidelines (recommended)
                          </label>
                        </div>
                        <AnimatePresence>
                          {contextualImageGuidelinesMode === 'blawgy' && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="ml-6"
                            >
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-[250px] overflow-y-auto">
                                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans">{blawgyDefaultGuidelines}</pre>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Option 2: Reuse from Featured */}
                      <div className="flex items-start">
                        <input
                          type="radio"
                          id="guidelinesReuse"
                          name="contextualGuidelinesMode"
                          checked={contextualImageGuidelinesMode === 'reuse'}
                          onChange={() => {
                            setContextualImageGuidelinesMode('reuse');
                            setHasUnsavedChanges(true);
                          }}
                          className="h-4 w-4 mt-0.5 text-gray-700 focus:ring-gray-500 border-gray-300"
                        />
                        <label htmlFor="guidelinesReuse" className="ml-2 text-sm text-gray-700 font-medium">
                          Reuse guidelines from featured image
                        </label>
                      </div>

                      {/* Option 3: Custom Guidelines */}
                      <div className="space-y-3">
                        <div className="flex items-start">
                          <input
                            type="radio"
                            id="guidelinesCustom"
                            name="contextualGuidelinesMode"
                            checked={contextualImageGuidelinesMode === 'custom'}
                            onChange={() => {
                              setContextualImageGuidelinesMode('custom');
                              setHasUnsavedChanges(true);
                            }}
                            className="h-4 w-4 mt-0.5 text-gray-700 focus:ring-gray-500 border-gray-300"
                          />
                          <label htmlFor="guidelinesCustom" className="ml-2 text-sm text-gray-700 font-medium">
                            Use custom guidelines
                          </label>
                        </div>
                        <AnimatePresence>
                          {contextualImageGuidelinesMode === 'custom' && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="ml-6"
                            >
                              <textarea
                                placeholder="e.g., Use only flat illustrations with a limited color palette. No 3D renders or photorealistic images..."
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[150px] text-sm"
                                value={contextualImageGuidelines}
                                onChange={(e) => {
                                  setContextualImageGuidelines(e.target.value.slice(0, 5000));
                                  setHasUnsavedChanges(true);
                                }}
                                maxLength={5000}
                              />
                              <div className="flex justify-end mt-1">
                                <span className={`text-xs ${contextualImageGuidelines.length >= 4500 ? 'text-amber-600' : 'text-gray-400'}`}>
                                  {contextualImageGuidelines.length}/5000
                                </span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Visual Components Settings */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="mb-3">
                      <h3 className="text-sm font-medium text-gray-900">Visual Component Types</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        These image types are generated when content suggests data visualization. They often include text labels, numbers, and structured elements.
                      </p>
                    </div>
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visualComponentsEnabled.charts}
                          onChange={(e) => {
                            setVisualComponentsEnabled({
                              ...visualComponentsEnabled,
                              charts: e.target.checked
                            });
                            setHasUnsavedChanges(true);
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-700">Charts</span>
                          <p className="text-xs text-gray-500">Data visualization with trend lines, data points, and labels</p>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visualComponentsEnabled.infographics}
                          onChange={(e) => {
                            setVisualComponentsEnabled({
                              ...visualComponentsEnabled,
                              infographics: e.target.checked
                            });
                            setHasUnsavedChanges(true);
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-700">Infographics</span>
                          <p className="text-xs text-gray-500">Structured visual information with icons and data representations</p>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visualComponentsEnabled.timelines}
                          onChange={(e) => {
                            setVisualComponentsEnabled({
                              ...visualComponentsEnabled,
                              timelines: e.target.checked
                            });
                            setHasUnsavedChanges(true);
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-700">Timelines</span>
                          <p className="text-xs text-gray-500">Chronological markers, progression indicators, and milestone elements</p>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visualComponentsEnabled.comparison_tables}
                          onChange={(e) => {
                            setVisualComponentsEnabled({
                              ...visualComponentsEnabled,
                              comparison_tables: e.target.checked
                            });
                            setHasUnsavedChanges(true);
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-700">Comparison Tables</span>
                          <p className="text-xs text-gray-500">Side-by-side comparison elements with contrasting layouts</p>
                        </div>
                      </label>
                    </div>
                    <p className="mt-3 text-xs text-amber-600">
                      Tip: If you want text-free images, consider disabling these options. Regular contextual images will be generated instead.
                    </p>
                  </div>

                  {/* Test Contextual Image Generation */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <button
                      onClick={() => setShowContextualImageTest(!showContextualImageTest)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Test In-Article Image Generation</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Preview how your style and guidelines affect in-article images
                        </p>
                      </div>
                      {showContextualImageTest ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </button>
                    <AnimatePresence>
                      {showContextualImageTest && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-4 space-y-4"
                        >
                          {generatedContextualPreview && (
                            <div className="mb-4">
                              <img
                                src={generatedContextualPreview}
                                alt="Contextual Preview"
                                className="mx-auto max-h-[300px] rounded-lg border border-gray-200"
                              />
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Article Title
                            </label>
                            <input
                              type="text"
                              placeholder="e.g., 10 Ways to Improve Customer Service"
                              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                              value={contextualImageTestTitle}
                              onChange={(e) => setContextualImageTestTitle(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Section Content (what the image illustrates)
                            </label>
                            <textarea
                              placeholder="e.g., Customer satisfaction metrics show that response time is the most important factor..."
                              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[80px] text-sm"
                              value={contextualImageTestSection}
                              onChange={(e) => setContextualImageTestSection(e.target.value)}
                            />
                          </div>
                          <button
                            className="w-full bg-primary text-white font-medium py-2.5 px-4 rounded-lg hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleGenerateContextualImage}
                            disabled={isGeneratingContextualImage || !contextualImageTestTitle || !contextualImageTestSection}
                          >
                            {isGeneratingContextualImage ? "Generating..." : "Generate Test In-Article Image"}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {activeTab === 'cta' && (
                <div className="space-y-6 w-full text-left max-w-4xl min-w-0">
                  {/* CTA Enable Toggle */}
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ctaSettings.enabled}
                          onChange={async (e) => {
                            // Persist immediately: this toggle used to only flip
                            // local state and count on the main Save Changes
                            // button, which never sent ctaSettings — so the
                            // toggle silently never stuck.
                            const newSettings = { ...ctaSettings, enabled: e.target.checked };
                            try {
                              await handleCtaSave(newSettings);
                              toast.success(newSettings.enabled ? 'CTA turned on' : 'CTA turned off');
                            } catch (error) {
                              toast.error("Couldn't save the CTA toggle. Please try again.");
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                      <div>
                        <span className="text-base font-medium text-gray-900">Call to Action</span>
                        {ctaSettings.enabled && ctaSettings.positions.length > 0 && (
                          <div className="text-sm text-gray-500">
                            Active in {ctaSettings.positions.includes('middle') && ctaSettings.positions.includes('end') ? 'middle and end of articles' : ctaSettings.positions.includes('middle') ? 'middle of articles' : 'end of articles'}
                          </div>
                        )}
                      </div>
                    </div>
                    {ctaSettings.enabled && (
                      <button
                        onClick={() => setShowCtaModal(true)}
                        className="text-primary hover:text-gray-700 text-sm font-medium"
                      >
                        Edit CTA
                      </button>
                    )}
                  </div>

                  {/* CTA Preview */}
                  {ctaSettings.enabled && (ctaSettings.template.url || ctaSettings.custom) && (
                    <div className="mb-6">
                      <h4 className="text-md font-medium text-gray-900 mb-3">Preview</h4>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-500 mb-4">...blog content above...</div>

                        {ctaSettings.type === 'template' && ctaSettings.template.url && ctaSettings.template.text ? (
                          <div
                            style={{
                              backgroundColor: ctaSettings.template.backgroundColor || '#ffffff',
                              color: ctaSettings.template.textColor || '#333333',
                              fontFamily: ctaSettings.template.fontFamily,
                              borderRadius: `${ctaSettings.template.borderRadius}px`,
                              padding: '24px',
                              margin: '32px 0',
                              textAlign: 'center',
                              border: `2px solid ${ctaSettings.template.buttonColor || '#007bff'}`
                            }}
                          >
                            <p style={{ margin: '0 0 16px 0', fontSize: '18px', lineHeight: '1.5' }}>
                              {ctaSettings.template.text}
                            </p>
                            <a
                              href={ctaSettings.template.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-block',
                                backgroundColor: ctaSettings.template.buttonColor || '#007bff',
                                color: '#ffffff',
                                padding: '12px 24px',
                                textDecoration: 'none',
                                borderRadius: `${ctaSettings.template.borderRadius}px`,
                                fontWeight: '600',
                                marginTop: '16px',
                                border: `2px solid ${ctaSettings.template.buttonColor || '#007bff'}`
                              }}
                            >
                              {ctaSettings.template.buttonText}
                            </a>
                          </div>
                        ) : ctaSettings.type === 'custom' && ctaSettings.custom ? (
                          <div
                            dangerouslySetInnerHTML={{ __html: ctaSettings.custom }}
                            className="max-w-full"
                            style={{ wordWrap: 'break-word' }}
                          />
                        ) : null}

                        <div className="text-sm text-gray-500 mt-4">...blog content below...</div>
                      </div>
                    </div>
                  )}

                  {/* Quick Stats */}
                  {ctaSettings.enabled && (
                    <>
                      {/* Help Section */}
                      <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-800 mb-2">💡 CTA Best Practices</h4>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• Use action-oriented language ("Get Started", "Download Now", "Learn More")</li>
                          <li>• Keep your message clear and concise</li>
                          <li>• Make sure the CTA stands out visually from your content</li>
                          <li>• Test different positions to see what works best for your audience</li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'invite' && (
                <div className="space-y-6 w-full text-left max-w-4xl min-w-0">
                  <form onSubmit={handleInviteUser} className="space-y-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="flex gap-3 items-start md:flex-row flex-col">
                        <div className="flex-grow">
                          <input
                            id="email"
                            type="email"
                            value={inviteEmail || ''}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                            placeholder="colleague@example.com"
                            disabled={inviteStatus === 'generating'}
                            required
                          />
                          <p className="mt-1 text-sm text-gray-500">
                            We'll generate an invite link for the email, but you need to send it manually.
                          </p>
                        </div>
                        <button
                          type="submit"
                          disabled={!inviteEmail || inviteStatus === 'generating'}
                          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center min-w-[140px] transition-colors ${!inviteEmail || inviteStatus === 'generating'
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-primary text-white hover:bg-primary-hover'
                            }`}
                        >
                          {inviteStatus === 'generating' ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Generating...
                            </>
                          ) : (
                            'Generate Invite Link'
                          )}
                        </button>
                      </div>

                      {inviteStatus === 'error' && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-md flex items-center text-red-700">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          {inviteError}
                        </div>
                      )}
                    </div>
                  </form>

                  {inviteLink && (
                    <div className="mt-8">
                      <h4 className="text-md font-medium text-gray-800 mb-4">Invitation Link</h4>
                      <div className="p-4 border rounded-md bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-gray-800">{inviteEmail || "Invitation Link"}</p>
                            <p className="text-xs text-gray-500">
                              Generated {new Date().toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() => copyToClipboard(inviteLink)}
                            className="flex items-center gap-1 text-gray-700 hover:text-gray-800 text-sm"
                          >
                            {copied ? (
                              <>
                                <Check className="w-4 h-4" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                Copy Link
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 border-t pt-6">
                    <h4 className="text-md font-medium text-gray-800 mb-4">Current Team Members</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium">
                            {user?.email?.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-800">{user?.email}</p>
                            <p className="text-xs text-gray-500">Owner</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-gray-800">How to use invitation links</h3>
                        <div className="mt-2 text-sm text-gray-700">
                          <p>
                            Share these invitation links with your team members. When they click the link, they'll be able to create an account and access your site.
                            Links are valid for 7 days and can only be used once.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'business-locations' && (
                <BusinessLocationsTab />
              )}

              {activeTab === 'webhooks' && <WebhookTab />}

              {activeTab === 'products' && <ProductsTab />}

              {activeTab === 'white-label' && <WhiteLabelTab />}
            </div>
          </div>
        </div>
      </NavbarWrapper >

      {/* Unsaved Changes Modal */}
      <AnimatePresence>
        {showUnsavedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={handleCancelNavigation}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Unsaved Changes
              </h3>
              <p className="text-gray-600 mb-6">
                You have unsaved changes. Would you like to save them before leaving?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCancelNavigation}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Keep Editing
                </button>
                <button
                  onClick={handleDiscardChanges}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveAndContinue}
                  disabled={isSavingFromModal}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center ${
                    isSavingFromModal
                      ? 'bg-primary/70 text-white cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary-hover'
                  }`}
                >
                  {isSavingFromModal ? (
                    <>
                      <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear Keywords Modal */}
      <AnimatePresence>
        {showClearKeywordsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowClearKeywordsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Clear All Keywords
              </h3>
              <p className="text-gray-600 mb-6">
                This will remove all {settings.keywords?.length || 0} keyword{settings.keywords?.length !== 1 ? 's' : ''} from your list. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowClearKeywordsModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAllKeywords}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Site Modal */}
      <AnimatePresence>
        {showDeleteSiteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => !isDeletingSite && setShowDeleteSiteModal(false)}
            data-testid="delete-site-modal"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Delete this site?
              </h3>
              <div className="space-y-3 text-sm text-gray-700 mb-6">
                <p>Your subscription will be cancelled at the end of your current billing period.</p>
                <p>Your blog posts and settings will be archived but not deleted. We can restore them if you change your mind.</p>
                <p>You won't be billed again.</p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteSiteModal(false)}
                  disabled={isDeletingSite}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  data-testid="delete-site-confirm"
                  onClick={handleConfirmDeleteSite}
                  disabled={isDeletingSite}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center ${
                    isDeletingSite
                      ? 'bg-red-400 text-white cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {isDeletingSite ? (
                    <>
                      <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Yes, delete site'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA Modal */}
      <CtaModal
        isOpen={showCtaModal}
        onClose={() => setShowCtaModal(false)}
        currentSettings={ctaSettings}
        onSave={handleCtaSave}
      />

      <Toaster position="top-right" />
    </>
  );
};

export default Settings;