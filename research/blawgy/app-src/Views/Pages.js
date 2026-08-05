import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  ExternalLink,
  FileText,
  LoaderIcon,
  MapPin,
  Plug,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react';
import NavbarWrapper from '../components/Navbar';
import ImpersonationBanner from '../components/ImpersonationBanner';
import apiClient from '../utils/apiClient';
import { useImpersonation } from '../contexts/ImpersonationContext';
import { useModals } from '../contexts/ModalContext';
import { hasWordPressConnection } from '../utils/cmsUtils';

const TEMPLATES_PAGE_SIZE = 50;
const NEARBY_RADIUS_MILES = 40;
const PREVIEW_DEBOUNCE_MS = 400;
const CURRENT_YEAR = new Date().getFullYear();

const templatePurposeOptions = [
  {
    value: 'local_town',
    label: 'Town / location',
    description: 'Each target becomes a place name. Example: Quincy + dispensary = Quincy Dispensary.'
  },
  {
    value: 'product_brand',
    label: 'Product / brand',
    description: 'Each target is the full topic. Example: Blue Dream = Blue Dream.'
  },
  {
    value: 'event',
    label: 'Event pages',
    description: 'Each target is the full event topic. Example: Memorial Day Sale.'
  }
];

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'publish', label: 'Publish live immediately' }
];

const formatRelativeDate = (iso) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return 'today';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

const Pages = ({ logout, currentSite, updateCurrentSite }) => {
  const navigate = useNavigate();
  const { siteSettings, impersonatedSite, user } = useImpersonation();
  const {
    setShowBulkGenerateModal,
    setShowImageStyleModal,
    setShowAdminPanel,
    setShowSubscriptionModal,
    setShowSupportModal
  } = useModals();

  // Template state
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [debouncedTemplateSearch, setDebouncedTemplateSearch] = useState('');
  const [templatePagination, setTemplatePagination] = useState({ page: 1, total: 0, hasMore: false });
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isLoadingMoreTemplates, setIsLoadingMoreTemplates] = useState(false);

  // Config state
  const [templatePurpose, setTemplatePurpose] = useState('local_town');
  const [baseKeyword, setBaseKeyword] = useState('dispensary');
  const [titleSuffix, setTitleSuffix] = useState('');
  const [targets, setTargets] = useState('');
  const [status, setStatus] = useState('draft');
  const [titlePattern, setTitlePattern] = useState('');
  const [titlePatternEdited, setTitlePatternEdited] = useState(false);
  const [stripPhrasesText, setStripPhrasesText] = useState('');
  const [generateFeaturedImage, setGenerateFeaturedImage] = useState(true);

  // Nearby towns state
  const [nearbyCity, setNearbyCity] = useState('');
  const [nearbyState, setNearbyState] = useState('MA');
  const [isFindingTowns, setIsFindingTowns] = useState(false);
  const [townFinderMessage, setTownFinderMessage] = useState('');
  const [lastTownSearchLabel, setLastTownSearchLabel] = useState('');
  const [showNearbyPanel, setShowNearbyPanel] = useState(false);

  // Preview state
  const [previews, setPreviews] = useState([]);
  const [templateMeta, setTemplateMeta] = useState(null); // { sourceHints, replacementCount, replacementCounts }
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [overrides, setOverrides] = useState({}); // { name: true } - include colliding row using year-suffixed slug

  // Full-page preview modal state
  const [previewModalTarget, setPreviewModalTarget] = useState(null); // { name }
  const [previewModalData, setPreviewModalData] = useState(null);
  const [previewModalLoading, setPreviewModalLoading] = useState(false);
  const [previewModalError, setPreviewModalError] = useState('');

  // Generate state
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [generationMessage, setGenerationMessage] = useState('');
  const [results, setResults] = useState([]);

  // Business profile state. One-time setup per site — the rewrite pipeline
  // uses this to skip any span that's about the real store identity (address,
  // "based in X", footer, map). Avoids the regression where cloning a town
  // page rewrote the real address along with the SEO target.
  //
  // Multi-location: `businessProfiles` is the full list, `activeLocationId`
  // is the one the form/preview/generate uses. When only one location exists
  // (or none), the location chip-row is hidden and the UX is identical to the
  // single-location version.
  const [businessProfiles, setBusinessProfiles] = useState([]);
  const [activeLocationId, setActiveLocationId] = useState(null);
  const [businessProfileLoading, setBusinessProfileLoading] = useState(false);
  const [businessProfileDetecting, setBusinessProfileDetecting] = useState(false);
  const [businessProfileSaving, setBusinessProfileSaving] = useState(false);
  // Editing defaults to TRUE so the setup card is visible the moment Pages
  // mounts, even before the load/detect effect has had a chance to resolve.
  // Once we know a profile exists we flip this to false to show the chip
  // instead. This makes the card render-resilient: if the API is broken,
  // the network is down, or the effect somehow never fires, the user still
  // sees the form they can fill out manually.
  const [businessProfileEditing, setBusinessProfileEditing] = useState(true);
  const [businessProfileForm, setBusinessProfileForm] = useState({});
  const [businessProfileError, setBusinessProfileError] = useState('');

  // Derived: the currently-selected location object. When the form is in
  // "add new" mode (activeLocationId === null but profiles exist) this is null
  // and the form starts empty.
  const activeLocation = useMemo(
    () => businessProfiles.find(p => p.id === activeLocationId) || null,
    [businessProfiles, activeLocationId]
  );
  const businessProfile = activeLocation; // shorthand used throughout this view

  // Refs to prevent runaway preview fetches
  const previewRequestIdRef = useRef(0);
  const previewInFlightRef = useRef(false);
  const lastPreviewKeyRef = useRef('');
  const templateListRef = useRef(null);
  // Sequencing guard for template fetches: a slow earlier search (or a
  // load-more racing a fresh search) must not overwrite newer results.
  const templatesRequestIdRef = useRef(0);

  const activeSite = impersonatedSite?.site || currentSite?.site || siteSettings?.site || user?.site;
  const activeEmail = impersonatedSite?.email || currentSite?.email || siteSettings?.email || user?.email;

  const titleSuffixPlaceholder = useMemo(() => {
    if (activeSite?.includes('kushgroove')) return 'Kush Groove Dispensary';
    return siteSettings?.siteName || siteSettings?.businessName || '';
  }, [activeSite, siteSettings]);

  const wordpressConnected = hasWordPressConnection(siteSettings);
  const selectedTemplate = templates.find(page => String(page.id) === String(selectedTemplateId));
  const selectedPurpose = templatePurposeOptions.find(option => option.value === templatePurpose);

  const targetItems = useMemo(() => (
    targets
      .split(/\n+/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => line.split(',')[0]?.trim())
      .filter(Boolean)
  ), [targets]);

  // ---------- Defaults
  useEffect(() => {
    if (!titleSuffix && titleSuffixPlaceholder) {
      setTitleSuffix(titleSuffixPlaceholder);
    }
  }, [titleSuffix, titleSuffixPlaceholder]);

  // Smart default title pattern based on selected template + purpose.
  // - local_town: simple "{name} {baseKeyword}" (matches existing default behavior)
  // - product / event: derive from the template's actual title by replacing
  //   the detected source name (e.g. "Moonrocks Weed Near Me For Sale" with
  //   source "Moonrocks" becomes "{name} Weed Near Me For Sale")
  const suggestedTitlePattern = useMemo(() => {
    if (templatePurpose === 'local_town') {
      return baseKeyword ? `{name} ${baseKeyword}` : '{name}';
    }
    if (!selectedTemplate?.title) return '{name}';
    // Strip suffix like " | Brand" so we don't carry it twice
    const rawTitle = String(selectedTemplate.title).split('|')[0].trim();
    // sourceHint detection — first non-stopword token from the title
    // (kept loosely aligned with backend SOURCE_HINT_STOPWORDS in
    // wordpressPageService.js — the backend is the source of truth, this
    // just powers the suggested placeholder for the user)
    const stopwords = new Set([
      'best', 'top', 'trusted', 'local', 'your', 'near', 'in', 'on', 'at',
      'ma', 'massachusetts', 'usa', 'us',
      'dispensary', 'dispensaries', 'cannabis', 'weed', 'recreational',
      'kush', 'groove', 'marijuana', 'thc', 'cbd',
      'me', 'we', 'you', 'our', 'their',
      'for', 'and', 'the', 'of', 'or', 'with', 'from',
      'this', 'that', 'how', 'what', 'when', 'where',
      'sale', 'buy', 'order', 'shop', 'store',
      'guide', 'tips', 'review', 'reviews',
      'a', 'an'
    ]);
    const words = rawTitle.split(/\s+/);
    const sourceIdx = words.findIndex(w =>
      w.length >= 4 && !stopwords.has(w.toLowerCase().replace(/[^a-z0-9]/g, ''))
    );
    if (sourceIdx === -1) return rawTitle ? `{name} ${rawTitle}` : '{name}';
    const replaced = words.slice();
    replaced[sourceIdx] = '{name}';
    return replaced.join(' ');
  }, [templatePurpose, baseKeyword, selectedTemplate]);

  // Auto-fill the title pattern from the suggestion unless the user has edited it.
  // Reset edit-flag when the template changes so smart defaults take over again.
  useEffect(() => {
    setTitlePatternEdited(false);
    // Clear stale template metadata when switching templates — the next
    // preview fetch will refresh it.
    setTemplateMeta(null);
  }, [selectedTemplate?.id, templatePurpose]);

  useEffect(() => {
    if (!titlePatternEdited) {
      setTitlePattern(suggestedTitlePattern);
    }
  }, [suggestedTitlePattern, titlePatternEdited]);

  useEffect(() => {
    if (nearbyCity) return;
    const defaultCity = siteSettings?.city || siteSettings?.businessCity || siteSettings?.locationCity;
    const defaultState = siteSettings?.state || siteSettings?.businessState || siteSettings?.locationState;
    if (defaultCity) {
      setNearbyCity(defaultCity);
      if (defaultState) setNearbyState(defaultState);
      return;
    }
    if (activeSite?.includes('kushgroove')) {
      setNearbyCity('Cambridge');
      setNearbyState('MA');
    }
  }, [activeSite, nearbyCity, siteSettings]);

  // ---------- Business profile(s): load on mount, auto-detect on first use.
  // Multi-location-aware. The new /business-profiles endpoint always returns
  // an array (synthesized from the legacy single profile if needed), so we
  // get the same behavior for old single-location sites with no extra UI.
  useEffect(() => {
    if (!wordpressConnected || !activeSite) return;
    let cancelled = false;
    setBusinessProfileLoading(true);
    setBusinessProfileError('');
    (async () => {
      try {
        const resp = await apiClient.get('/api/pages/business-profiles', {
          params: { site: activeSite, email: activeEmail }
        });
        if (cancelled) return;
        const profiles = Array.isArray(resp.data?.profiles) ? resp.data.profiles : [];
        setBusinessProfiles(profiles);
        if (profiles.length > 0) {
          const primary = profiles.find(p => p.isPrimary) || profiles[0];
          setActiveLocationId(primary.id);
          setBusinessProfileEditing(false);
        } else {
          // No profile yet: auto-detect once, prefill the form, leave it
          // in editing mode so the user reviews + saves.
          setActiveLocationId(null);
          setBusinessProfileDetecting(true);
          try {
            const det = await apiClient.post('/api/pages/business-profile/detect', {
              site: activeSite, email: activeEmail
            });
            if (cancelled) return;
            setBusinessProfileForm(det.data?.detected || {});
            setBusinessProfileEditing(true);
          } catch (err) {
            if (!cancelled) {
              setBusinessProfileError('Could not auto-detect. You can still enter your details manually.');
              setBusinessProfileForm({});
              setBusinessProfileEditing(true);
            }
          } finally {
            if (!cancelled) setBusinessProfileDetecting(false);
          }
        }
      } catch (err) {
        if (!cancelled) {
          // Backend route may not be deployed yet, or the site record is
          // missing on this environment. Either way, fall through to manual
          // entry so the user can still fill in values rather than seeing
          // nothing at all.
          setBusinessProfileError(
            err?.response?.status === 404
              ? 'Business profile endpoint not available yet on this environment. You can still enter values manually.'
              : (err?.response?.data?.message || 'Could not load business profile. Enter values manually.')
          );
          setBusinessProfileForm({});
          setBusinessProfileEditing(true);
        }
      } finally {
        if (!cancelled) setBusinessProfileLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [wordpressConnected, activeSite, activeEmail]);

  const startEditingBusinessProfile = () => {
    setBusinessProfileForm({ ...(activeLocation || {}) });
    setBusinessProfileEditing(true);
    setBusinessProfileError('');
  };

  // Switch to a specific saved location — read-only chip view, no editing.
  const selectLocation = (id) => {
    setActiveLocationId(id);
    setBusinessProfileEditing(false);
    setBusinessProfileForm(null);
    setBusinessProfileError('');
  };

  // Start adding a brand-new location. Form opens empty, no activeLocationId
  // so saveBusinessProfileForm POSTs instead of PUTs.
  const startAddingLocation = () => {
    setActiveLocationId(null);
    setBusinessProfileForm({});
    setBusinessProfileEditing(true);
    setBusinessProfileError('');
  };

  const cancelEditingBusinessProfile = () => {
    // Only allow cancel if at least one saved profile exists to fall back to.
    if (businessProfiles.length === 0) return;
    // If they were adding a new one, snap back to the primary.
    if (!activeLocationId) {
      const primary = businessProfiles.find(p => p.isPrimary) || businessProfiles[0];
      setActiveLocationId(primary.id);
    }
    setBusinessProfileEditing(false);
    setBusinessProfileForm(null);
    setBusinessProfileError('');
  };

  const reDetectBusinessProfile = async () => {
    if (!activeSite) return;
    setBusinessProfileDetecting(true);
    setBusinessProfileError('');
    try {
      const det = await apiClient.post('/api/pages/business-profile/detect', {
        site: activeSite, email: activeEmail
      });
      // Merge over the user's current edits so they don't lose typed values.
      setBusinessProfileForm(prev => ({ ...(det.data?.detected || {}), ...(prev || {}) }));
    } catch (err) {
      setBusinessProfileError('Could not auto-detect. Enter your details manually.');
    } finally {
      setBusinessProfileDetecting(false);
    }
  };

  // Save the form. Routes to the right endpoint based on whether we're
  // editing an existing location or adding a new one. Falls back to the
  // legacy singular PUT when no locations exist yet AND the new POST path
  // 404s (older backend), so we never strand a user mid-setup.
  const saveBusinessProfileForm = async () => {
    if (!activeSite) return;
    const form = businessProfileForm || {};
    if (!form.city && !form.address && !form.businessName) {
      setBusinessProfileError('Add at least your business name, city, or address.');
      return;
    }
    setBusinessProfileSaving(true);
    setBusinessProfileError('');
    try {
      let updatedProfile;
      if (activeLocationId) {
        const resp = await apiClient.put(`/api/pages/business-profiles/${activeLocationId}`, {
          site: activeSite, email: activeEmail, profile: form
        });
        updatedProfile = resp.data?.profile;
        setBusinessProfiles(prev => prev.map(p => (p.id === activeLocationId ? { ...p, ...updatedProfile } : p)));
      } else {
        const resp = await apiClient.post('/api/pages/business-profiles', {
          site: activeSite, email: activeEmail, profile: form
        });
        updatedProfile = resp.data?.profile;
        if (updatedProfile?.id) {
          setBusinessProfiles(prev => [...prev, updatedProfile]);
          setActiveLocationId(updatedProfile.id);
        }
      }
      setBusinessProfileEditing(false);
      setBusinessProfileForm(null);
    } catch (err) {
      setBusinessProfileError(err?.response?.data?.message || 'Could not save business profile.');
    } finally {
      setBusinessProfileSaving(false);
    }
  };

  const setBpField = (field, value) => {
    setBusinessProfileForm(prev => ({ ...(prev || {}), [field]: value }));
  };

  const setBpServiceArea = (value) => {
    const arr = String(value || '')
      .split(/[\n,]+/)
      .map(t => t.trim())
      .filter(Boolean);
    setBusinessProfileForm(prev => ({ ...(prev || {}), serviceArea: arr }));
  };

  // ---------- Template fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTemplateSearch(templateSearch.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [templateSearch]);

  const fetchTemplates = useCallback(async ({ page = 1, search = debouncedTemplateSearch, append = false } = {}) => {
    if (!activeSite) return;
    if (append) setIsLoadingMoreTemplates(true);
    else setIsLoadingTemplates(true);
    if (!append) setError('');

    const requestId = ++templatesRequestIdRef.current;
    try {
      const response = await apiClient.get('/api/pages/templates', {
        params: {
          site: activeSite,
          email: activeEmail,
          search: search || undefined,
          page,
          per_page: TEMPLATES_PAGE_SIZE
        }
      });

      // Ignore stale responses: a newer search/refresh (or a load-more that
      // raced a fresh search) started after this request was issued.
      if (requestId !== templatesRequestIdRef.current) return;

      const pages = response.data.pages || [];
      const pagination = response.data.pagination || { page: 1, total: pages.length, hasMore: false };
      const hasMore = Boolean(pagination.hasMore) && pages.length > 0;

      setTemplates(prev => (append ? [...prev, ...pages] : pages));
      setTemplatePagination(current => ({
        page: pagination.page || page,
        total: append && (pagination.total ?? 0) === 0 ? current.total : pagination.total ?? pages.length,
        hasMore
      }));
    } catch (err) {
      if (requestId !== templatesRequestIdRef.current) return;
      console.error('Error loading page templates:', err);
      if (!append) {
        setError(err?.response?.data?.error?.message || err?.response?.data?.message || 'Could not load WordPress pages.');
      }
    } finally {
      // Only the latest request clears the loading flags; a stale response
      // resolving late shouldn't flip spinners off mid-flight for the new one.
      if (requestId === templatesRequestIdRef.current) {
        setIsLoadingTemplates(false);
        setIsLoadingMoreTemplates(false);
      }
    }
  }, [activeEmail, activeSite, debouncedTemplateSearch]);

  useEffect(() => {
    if (!wordpressConnected) return;
    fetchTemplates({ page: 1, append: false });
  }, [wordpressConnected, debouncedTemplateSearch, fetchTemplates]);

  const loadMoreTemplates = useCallback(() => {
    if (
      !templatePagination.hasMore
      || isLoadingTemplates
      || isLoadingMoreTemplates
      || templates.length >= templatePagination.total
    ) return;
    fetchTemplates({ page: templatePagination.page + 1, append: true });
  }, [
    fetchTemplates, isLoadingMoreTemplates, isLoadingTemplates,
    templatePagination.hasMore, templatePagination.page, templatePagination.total, templates.length
  ]);

  const handleTemplateListScroll = (event) => {
    const element = event.currentTarget;
    const canScroll = element.scrollHeight > element.clientHeight + 8;
    if (!canScroll) return;
    const nearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 48;
    if (nearBottom) loadMoreTemplates();
  };

  // ---------- Live preview (debounced, guarded)
  const previewKey = useMemo(() => JSON.stringify({
    s: activeSite,
    p: templatePurpose,
    k: baseKeyword,
    t: titleSuffix,
    g: targets,
    tp: titlePattern,
    tid: selectedTemplateId
  }), [activeSite, templatePurpose, baseKeyword, titleSuffix, targets, titlePattern, selectedTemplateId]);

  useEffect(() => {
    if (!wordpressConnected || !activeSite) return;
    if (!targets.trim()) {
      setPreviews([]);
      setPreviewError('');
      return;
    }

    // Guard against duplicate fires for the exact same inputs
    if (previewInFlightRef.current && lastPreviewKeyRef.current === previewKey) return;

    const requestId = ++previewRequestIdRef.current;
    const timer = setTimeout(async () => {
      // No in-flight short-circuit — the requestId comparison below ensures
      // stale responses are ignored, but every keystroke still gets fetched.
      previewInFlightRef.current = true;
      lastPreviewKeyRef.current = previewKey;
      setIsLoadingPreview(true);
      setPreviewError('');
      try {
        const response = await apiClient.post('/api/pages/preview', {
          email: activeEmail,
          site: activeSite,
          targets,
          baseKeyword,
          titleSuffix,
          templatePurpose,
          titlePattern,
          templatePageId: selectedTemplateId || undefined
        });
        // Only apply if this is the latest request
        if (requestId === previewRequestIdRef.current) {
          setPreviews(response.data.previews || []);
          setTemplateMeta(response.data.templateMeta || null);
        }
      } catch (err) {
        if (requestId === previewRequestIdRef.current) {
          console.error('Error previewing pages:', err);
          setPreviewError(err?.response?.data?.error?.message || err?.response?.data?.message || 'Preview unavailable.');
          setPreviews([]);
          setTemplateMeta(null);
        }
      } finally {
        previewInFlightRef.current = false;
        if (requestId === previewRequestIdRef.current) {
          setIsLoadingPreview(false);
        }
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [previewKey, wordpressConnected, activeSite, activeEmail, targets, baseKeyword, titleSuffix, templatePurpose, titlePattern, selectedTemplateId]);

  // Reset overrides when targets list changes shape
  useEffect(() => {
    setOverrides(prev => {
      const next = {};
      Object.keys(prev).forEach(key => {
        if (previews.some(p => p.name === key)) next[key] = prev[key];
      });
      return next;
    });
  }, [previews]);

  const collisionCount = useMemo(
    () => previews.filter(p => p.collision).length,
    [previews]
  );
  const freeCount = previews.length - collisionCount;
  const overrideCount = useMemo(
    () => previews.filter(p => p.collision && overrides[p.name]).length,
    [previews, overrides]
  );

  // ---------- Nearby towns
  const applyNearbyTowns = (towns, message) => {
    setTargets(towns.join('\n'));
    setTownFinderMessage(message);
  };

  const findNearbyTowns = async ({ lat, lng, city, state } = {}) => {
    setIsFindingTowns(true);
    setTownFinderMessage('');
    setError('');
    try {
      const response = await apiClient.get('/api/pages/nearby-towns', {
        params: {
          site: activeSite,
          email: activeEmail,
          lat,
          lng,
          city,
          state,
          radiusMiles: NEARBY_RADIUS_MILES,
          baseKeyword,
          excludeExisting: true
        }
      });
      const { towns, totalFound, existingCount, center } = response.data;
      const searchedLabel = center?.label || city || 'that location';
      setLastTownSearchLabel(searchedLabel);
      if (!towns?.length) {
        setTownFinderMessage(
          totalFound > 0
            ? `Found ${totalFound} towns within ${NEARBY_RADIUS_MILES} miles of ${searchedLabel}, but you already have pages for all of them.`
            : `No towns found within ${NEARBY_RADIUS_MILES} miles. Try a different city.`
        );
        return;
      }
      applyNearbyTowns(
        towns,
        `Added ${towns.length} towns within ${NEARBY_RADIUS_MILES} miles of ${searchedLabel}${existingCount ? ` (${existingCount} skipped - already have pages)` : ''}.`
      );
    } catch (err) {
      console.error('Error finding nearby towns:', err);
      setError(err?.response?.data?.message || err?.response?.data?.error?.message || 'Could not find nearby towns.');
    } finally {
      setIsFindingTowns(false);
    }
  };

  const findTownsFromCity = () => {
    if (!nearbyCity.trim()) {
      setError('Enter a city to search around, like Cambridge.');
      return;
    }
    findNearbyTowns({ city: nearbyCity.trim(), state: nearbyState.trim() });
  };

  const findTownsFromLocation = () => {
    if (!navigator.geolocation) {
      setError('Your browser does not support location access. Enter a city instead.');
      return;
    }
    setIsFindingTowns(true);
    setTownFinderMessage('Reading your browser location...');
    navigator.geolocation.getCurrentPosition(
      (position) => findNearbyTowns({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => {
        setIsFindingTowns(false);
        setError('Could not read your location. Enter a city instead.');
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  // ---------- Generate
  const buildTargetsPayload = useCallback((opts = { includeColliding: false }) => {
    // Build a newline-joined targets string that respects overrides.
    // If the preview row collides and is overridden, we append `, , <slug>-{YEAR}` to use the suffixed slug.
    // Otherwise we use the original target line, but skip colliding rows unless includeColliding=true.
    const previewByName = new Map(previews.map(p => [p.name, p]));
    const lines = targets.split(/\n+/).map(l => l.trim()).filter(Boolean);

    const out = [];
    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim());
      const name = parts[0];
      if (!name) continue;

      const preview = previewByName.get(name);
      if (!preview) {
        out.push(line);
        continue;
      }
      if (!preview.collision) {
        out.push(line);
        continue;
      }
      // collision
      if (opts.includeColliding || overrides[name]) {
        const overriddenSlug = `${preview.slug}-${CURRENT_YEAR}`;
        const keyword = parts[1] || '';
        const notes = parts[3] || '';
        out.push([name, keyword, overriddenSlug, notes].join(','));
      }
      // else: skip
    }
    return out.join('\n');
  }, [previews, targets, overrides]);

  const generatePages = async (opts = { includeColliding: false }) => {
    if (!selectedTemplateId) {
      setError('Choose a template page first.');
      return;
    }
    if (!targets.trim()) {
      setError('Enter at least one town, brand, or event.');
      return;
    }

    const payloadTargets = buildTargetsPayload(opts);
    if (!payloadTargets.trim()) {
      setError('Nothing to generate. All targets collide — either override or change the names.');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGenerationMessage('');
    setResults([]);
    try {
      const stripPhrases = stripPhrasesText
        .split(/\n+/)
        .map(s => s.trim())
        .filter(Boolean);
      const response = await apiClient.post('/api/pages/generate', {
        email: activeEmail,
        site: activeSite,
        templatePageId: selectedTemplateId,
        templatePurpose,
        baseKeyword,
        titleSuffix,
        titlePattern,
        stripPhrases,
        generateFeaturedImage,
        targets: payloadTargets,
        status,
        locationId: activeLocationId || undefined
      });
      const generatedResults = response.data.results || [];
      const successCount = generatedResults.filter(r => r.success).length;
      const failedCount = generatedResults.length - successCount;
      setResults(generatedResults);
      if (generatedResults.length === 0) {
        setGenerationMessage('No pages were created.');
      } else if (failedCount > 0) {
        setGenerationMessage(`${successCount} page${successCount === 1 ? '' : 's'} created, ${failedCount} failed.`);
      } else {
        setGenerationMessage(`${successCount} page${successCount === 1 ? '' : 's'} created successfully.`);
        setTargets('');
        setOverrides({});
      }
    } catch (err) {
      console.error('Error generating pages:', err);
      setError(err?.response?.data?.error?.message || err?.response?.data?.message || 'Could not generate pages.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ---------- Full-page preview modal
  const openPreviewModal = useCallback(async (preview) => {
    if (!selectedTemplateId) return;
    setPreviewModalTarget({ name: preview.name });
    setPreviewModalData(null);
    setPreviewModalError('');
    setPreviewModalLoading(true);
    try {
      const response = await apiClient.post('/api/pages/preview-content', {
        email: activeEmail,
        site: activeSite,
        templatePageId: selectedTemplateId,
        target: { name: preview.name },
        baseKeyword,
        titleSuffix,
        templatePurpose,
        titlePattern,
        locationId: activeLocationId || undefined
      });
      setPreviewModalData(response.data);
    } catch (err) {
      console.error('Error loading full preview:', err);
      setPreviewModalError(
        err?.response?.data?.error?.message
        || err?.response?.data?.message
        || 'Could not load full preview.'
      );
    } finally {
      setPreviewModalLoading(false);
    }
  }, [activeEmail, activeSite, baseKeyword, selectedTemplateId, titlePattern, titleSuffix, templatePurpose, activeLocationId]);

  const closePreviewModal = useCallback(() => {
    setPreviewModalTarget(null);
    setPreviewModalData(null);
    setPreviewModalError('');
    setPreviewModalLoading(false);
  }, []);

  useEffect(() => {
    if (!previewModalTarget) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') closePreviewModal();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [previewModalTarget, closePreviewModal]);

  // ---------- UI helpers
  const targetPlaceholder = templatePurpose === 'local_town'
    ? 'Belmont\nWatertown\nWaltham\nNewton'
    : templatePurpose === 'product_brand'
      ? 'Blue Dream\nLive Rosin\nPre-Roll Pack'
      : 'Memorial Day\nBlack Friday\n420 Sale';

  const stepEnabled = {
    1: true,
    2: Boolean(selectedTemplateId),
    3: Boolean(selectedTemplateId)
  };

  const generableCount = freeCount + overrideCount;
  const generateDisabled =
    isGenerating ||
    isLoadingTemplates ||
    !selectedTemplateId ||
    targetItems.length === 0 ||
    generableCount === 0;

  const generateActionWord = status === 'publish' ? 'Publish' : 'Save';
  const generateNoun = status === 'publish' ? 'page' : 'draft';
  const generateLabel = (count) => `${generateActionWord} ${count} ${generateNoun}${count === 1 ? '' : 's'}`;

  const StepBadge = ({ n, enabled = true, done = false }) => (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
        done ? 'bg-green-100 text-green-700' : enabled ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'
      }`}
    >
      {done ? <Check className="w-4 h-4" /> : n}
    </div>
  );

  const sourceHint = selectedTemplate?.title?.split(' ')?.[0] || null;

  return (
    <NavbarWrapper
      user={user}
      logout={logout}
      currentSite={currentSite}
      updateCurrentSite={updateCurrentSite}
      onShowBulkGenerate={() => setShowBulkGenerateModal(true)}
      onShowImageStyle={() => setShowImageStyleModal(true)}
      onShowAdmin={() => setShowAdminPanel(true)}
      onShowSubscription={() => setShowSubscriptionModal(true)}
      onShowSupport={() => setShowSupportModal(true)}
    >
      <div className="min-h-screen bg-gray-50">
        <ImpersonationBanner />
        {!wordpressConnected ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="w-full max-w-lg text-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-orange-50 mx-auto mb-5">
                <Plug className="w-7 h-7 text-orange-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Connect WordPress</h1>
              <p className="text-sm text-gray-500 mb-8">
                Pages are available after you connect a WordPress site with a working username and application password.
              </p>
              <button
                onClick={() => navigate('/settings/cms-connect')}
                className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover shadow-sm transition-all"
              >
                Go to Settings
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <main className="flex-1 p-4 lg:p-12 lg:pt-8 overflow-auto pb-20 lg:pb-12">
            <div className="max-w-full">
                {/* Header — same chrome as Dashboard / Keyword Finder / SEO
                    Analysis / AI Mentions: text-xl/lg:text-2xl title with a
                    text-sm gray description directly underneath. */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                  <div className="flex-1">
                    <h2 className="text-xl lg:text-2xl font-bold text-left mb-2">Pages</h2>
                    <p className="text-sm text-gray-500 text-left mb-2">
                      Clone a WordPress page and generate location, brand, or event variants with live preview.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="mb-6 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Business profile: one-time setup so the page generator
                    never rewrites the real store address, footer, or map.
                    Multi-location: when 2+ locations exist, the chip row
                    above lets the user pick which one this batch targets;
                    that location's profile is what gets sent to /generate
                    as locationId and what the protection logic uses.
                    For single-location users the chip row is hidden so the
                    UX is identical to the original single-profile flow. */}
                {businessProfiles.length >= 2 && !businessProfileLoading && (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500 mr-1">Location:</span>
                    {businessProfiles.map(loc => {
                      const isActive = loc.id === activeLocationId && !businessProfileEditing;
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => selectLocation(loc.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <MapPin className="w-3 h-3" />
                          {loc.label || loc.city || loc.businessName || 'Location'}
                          {loc.isPrimary && (
                            <span className="ml-1 text-[10px] uppercase tracking-wide text-emerald-700/70">primary</span>
                          )}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={startAddingLocation}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    >
                      <Plus className="w-3 h-3" />
                      Add location
                    </button>
                  </div>
                )}
                {businessProfileLoading ? (
                  <div className="mb-6 p-4 rounded-xl bg-white border border-gray-200 flex items-center gap-2 text-sm text-gray-500">
                    <LoaderIcon className="w-4 h-4 animate-spin" />
                    Loading business profile...
                  </div>
                ) : businessProfileEditing ? (
                  <div className="mb-6 rounded-xl bg-white border border-emerald-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-emerald-50/40 border-b border-emerald-100 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5 text-emerald-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-semibold text-gray-900">
                          {activeLocation
                            ? 'Edit your business details'
                            : businessProfiles.length > 0
                              ? 'Add a new location'
                              : 'Confirm your business details'}
                        </h2>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {activeLocation
                            ? 'These details stay the same on every generated page so your real address and footer never get rewritten.'
                            : businessProfiles.length > 0
                              ? 'Enter the details for this location. You can switch between locations using the chips above.'
                              : businessProfileDetecting
                                ? 'Detecting your business from your site...'
                                : 'We pulled these from your site. Confirm them once and we will protect them on every page you generate from now on.'}
                        </p>
                      </div>
                      {businessProfiles.length > 0 && (
                        <button
                          type="button"
                          onClick={cancelEditingBusinessProfile}
                          className="text-gray-400 hover:text-gray-600 shrink-0"
                          aria-label="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Business name</label>
                        <input
                          value={businessProfileForm?.businessName || ''}
                          onChange={(e) => setBpField('businessName', e.target.value)}
                          placeholder="Kush Groove Dispensary"
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          value={businessProfileForm?.phone || ''}
                          onChange={(e) => setBpField('phone', e.target.value)}
                          placeholder="508-555-1234"
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Street address</label>
                        <input
                          value={businessProfileForm?.address || ''}
                          onChange={(e) => setBpField('address', e.target.value)}
                          placeholder="123 Main St"
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                        <input
                          value={businessProfileForm?.city || ''}
                          onChange={(e) => setBpField('city', e.target.value)}
                          placeholder="Brockton"
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                          <input
                            value={businessProfileForm?.state || ''}
                            onChange={(e) => setBpField('state', e.target.value.toUpperCase().slice(0, 2))}
                            placeholder="MA"
                            maxLength={2}
                            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">ZIP</label>
                          <input
                            value={businessProfileForm?.postalCode || ''}
                            onChange={(e) => setBpField('postalCode', e.target.value)}
                            placeholder="02301"
                            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Service area
                          <span className="ml-1 text-gray-400 font-normal">(towns you serve, comma or new-line separated)</span>
                        </label>
                        <textarea
                          value={(businessProfileForm?.serviceArea || []).join(', ')}
                          onChange={(e) => setBpServiceArea(e.target.value)}
                          placeholder="Whitman, Rockland, Holbrook, Hanover, Weymouth, East Bridgewater, Avon, Braintree"
                          rows={2}
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Any sentence that lists 2+ of these towns is protected so your "we serve" copy stays accurate on every page.
                        </p>
                      </div>
                    </div>

                    {businessProfileError && (
                      <div className="px-6 pb-2 text-sm text-red-600">{businessProfileError}</div>
                    )}

                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={reDetectBusinessProfile}
                        disabled={businessProfileDetecting}
                        className="text-xs text-gray-600 hover:text-gray-900 inline-flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${businessProfileDetecting ? 'animate-spin' : ''}`} />
                        {businessProfileDetecting ? 'Re-detecting...' : 'Re-detect from site'}
                      </button>
                      <div className="flex items-center gap-2">
                        {businessProfiles.length > 0 && (
                          <button
                            type="button"
                            onClick={cancelEditingBusinessProfile}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={saveBusinessProfileForm}
                          disabled={businessProfileSaving || businessProfileDetecting}
                          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover shadow-sm disabled:opacity-50"
                        >
                          {businessProfileSaving && <LoaderIcon className="w-4 h-4 mr-1.5 animate-spin" />}
                          {activeLocation ? 'Save changes' : businessProfiles.length > 0 ? 'Add location' : 'Confirm and save'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : businessProfile ? (
                  <div className="mb-6 p-3 rounded-xl bg-emerald-50/40 border border-emerald-200 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        Protecting{' '}
                        <span className="font-semibold">{businessProfile.businessName || 'your business'}</span>
                        {businessProfile.city && (
                          <> at <span className="font-medium">{[businessProfile.address, businessProfile.city, businessProfile.state].filter(Boolean).join(', ')}</span></>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        Real address, footer, map, and "based in" copy stay identical on every generated page.
                      </p>
                    </div>
                    {businessProfiles.length === 1 && (
                      <button
                        type="button"
                        onClick={startAddingLocation}
                        className="text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 shrink-0 inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add location
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={startEditingBusinessProfile}
                      className="text-xs font-medium text-emerald-800 hover:text-emerald-900 px-2 py-1 rounded-md hover:bg-emerald-100 shrink-0"
                    >
                      Edit
                    </button>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* LEFT COLUMN: steps 1-3 */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Step 1: template */}
                    <section data-tour="pages-template" className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <StepBadge n={1} done={Boolean(selectedTemplateId)} />
                        <div className="flex-1 min-w-0">
                          <h2 className="text-lg font-semibold text-gray-900">Pick a template</h2>
                          <p className="text-sm text-gray-500">
                            We'll clone this page's layout and rewrite its content for each target.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => fetchTemplates({ page: 1, append: false })}
                          className="text-xs text-gray-600 hover:text-gray-900 inline-flex items-center"
                          disabled={isLoadingTemplates}
                        >
                          <RefreshCw size={12} className={`mr-1 ${isLoadingTemplates ? 'animate-spin' : ''}`} />
                          Refresh
                        </button>
                      </div>

                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          data-testid="template-page-search"
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                          placeholder="Search your WordPress pages..."
                          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div className="mb-2 text-xs text-gray-500">
                        {templatePagination.total > 0
                          ? `${templates.length} loaded of ${templatePagination.total} pages`
                          : isLoadingTemplates ? 'Loading pages...' : 'No pages found'}
                      </div>

                      <div
                        ref={templateListRef}
                        data-testid="template-page-list"
                        onScroll={handleTemplateListScroll}
                        className="h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white"
                      >
                        {isLoadingTemplates && templates.length === 0 ? (
                          <div className="flex items-center h-full text-sm text-gray-500 px-3">
                            <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                            Loading WordPress pages...
                          </div>
                        ) : templates.length === 0 ? (
                          <div className="flex items-center h-full text-sm text-gray-500 px-3">
                            {debouncedTemplateSearch ? 'No pages match your search.' : 'No WordPress pages found.'}
                          </div>
                        ) : (
                          templates.map(page => {
                            const isSelected = String(page.id) === String(selectedTemplateId);
                            return (
                              <button
                                key={page.id}
                                type="button"
                                data-testid={`template-page-option-${page.id}`}
                                onClick={() => setSelectedTemplateId(String(page.id))}
                                className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                                  isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className={`text-sm truncate ${isSelected ? 'font-semibold text-gray-900' : 'text-gray-900'}`}>
                                    {page.title}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    /{page.slug}/ · {page.status || 'unknown'}
                                  </p>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-gray-700 shrink-0" />}
                              </button>
                            );
                          })
                        )}

                        {isLoadingMoreTemplates && (
                          <div className="flex items-center py-3 px-3 text-xs text-gray-500">
                            <LoaderIcon className="w-3.5 h-3.5 mr-2 animate-spin" />
                            Loading more pages...
                          </div>
                        )}
                      </div>

                      {selectedTemplate && (
                        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span className="font-semibold text-gray-900 truncate">{selectedTemplate.title}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                {activeSite}/{selectedTemplate.slug}/
                                {selectedTemplate.modified && (
                                  <> · last modified {formatRelativeDate(selectedTemplate.modified)}</>
                                )}
                              </p>
                              {(templateMeta?.sourceHints?.length || sourceHint) && (
                                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-gray-200 text-xs text-gray-700">
                                  <Sparkles className="w-3 h-3" />
                                  {templateMeta?.sourceHints?.length ? (
                                    <span>
                                      Replacing{' '}
                                      <span className="font-semibold">
                                        {templateMeta.replacementCount}
                                      </span>{' '}
                                      instance{templateMeta.replacementCount === 1 ? '' : 's'} of{' '}
                                      <span className="font-medium">
                                        {templateMeta.sourceHints.join(', ')}
                                      </span>{' '}
                                      in the page body
                                    </span>
                                  ) : (
                                    <span>Replacing instances of: <span className="font-medium">{sourceHint}</span></span>
                                  )}
                                </div>
                              )}
                            </div>
                            <a
                              href={selectedTemplate.link || `https://${activeSite}/?page_id=${selectedTemplate.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary hover:text-primary-hover font-medium inline-flex items-center gap-1 shrink-0"
                            >
                              View page <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      )}
                    </section>

                    {/* Step 2: configure */}
                    <section data-tour="pages-configure" className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${!stepEnabled[2] ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className="flex items-start gap-3 mb-4">
                        <StepBadge n={2} enabled={stepEnabled[2]} />
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">Configure</h2>
                          <p className="text-sm text-gray-500">
                            Decide the page type, the keyword to append, and how SEO titles end.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Purpose</label>
                          <select
                            value={templatePurpose}
                            onChange={(e) => setTemplatePurpose(e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-lg bg-white focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                          >
                            {templatePurposeOptions.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                          {selectedPurpose && (
                            <p className="mt-1.5 text-xs text-gray-500">{selectedPurpose.description}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">SEO title suffix</label>
                          <input
                            value={titleSuffix}
                            onChange={(e) => setTitleSuffix(e.target.value)}
                            placeholder={titleSuffixPlaceholder || 'Business name'}
                            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                          <p className="mt-1.5 text-xs text-gray-500">Comes after the pipe in the Yoast title.</p>
                        </div>
                      </div>

                      {/* Title pattern — controls the actual page title shape */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-medium text-gray-700">Title pattern</label>
                          {titlePatternEdited && (
                            <button
                              type="button"
                              onClick={() => {
                                setTitlePatternEdited(false);
                                setTitlePattern(suggestedTitlePattern);
                              }}
                              className="text-xs text-primary hover:underline"
                            >
                              Reset to suggested
                            </button>
                          )}
                        </div>
                        <input
                          value={titlePattern}
                          onChange={(e) => {
                            setTitlePattern(e.target.value);
                            setTitlePatternEdited(true);
                          }}
                          placeholder={suggestedTitlePattern || '{name} dispensary'}
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                        <p className="mt-1.5 text-xs text-gray-500">
                          Use <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">{'{name}'}</code> where each target's name goes.
                          {templatePurpose !== 'local_town' && selectedTemplate?.title && !titlePatternEdited && (
                            <> Suggested from template title: <span className="font-medium">{selectedTemplate.title}</span></>
                          )}
                        </p>
                      </div>

                      {templatePurpose === 'local_town' && !titlePatternEdited && (
                        <div className="mt-4">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Base keyword</label>
                          <input
                            value={baseKeyword}
                            onChange={(e) => setBaseKeyword(e.target.value)}
                            placeholder="dispensary"
                            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                          <p className="mt-1.5 text-xs text-gray-500">Used in the default title pattern <code className="px-1 py-0.5 bg-gray-100 rounded">{'{name} ' + baseKeyword}</code>.</p>
                        </div>
                      )}

                      <div className="mt-4">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Phrases to remove from cloned pages (optional)</label>
                        <textarea
                          value={stripPhrasesText}
                          onChange={(e) => setStripPhrasesText(e.target.value)}
                          placeholder={'Cannabis Dispensaries in Massachusetts\nAnother phrase to strip'}
                          rows={2}
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                        />
                        <p className="mt-1.5 text-xs text-gray-500">One phrase per line. Case-insensitive exact match. Useful for stripping boilerplate that exists in your template but you don&apos;t want in clones.</p>
                      </div>

                      <div className="mt-4 flex items-start gap-3">
                        <input
                          id="generate-featured-image"
                          type="checkbox"
                          checked={generateFeaturedImage}
                          onChange={(e) => setGenerateFeaturedImage(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="generate-featured-image" className="text-sm text-gray-700">
                          <span className="font-medium">Generate featured image for each page</span>
                          <span className="block text-xs text-gray-500 mt-0.5">AI generates an image based on each page&apos;s title and uploads to your media library. Adds ~5s per page.</span>
                        </label>
                      </div>

                      <div className="mt-4">
                        <label className="block text-xs font-medium text-gray-700 mb-1">WordPress status</label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="w-full md:w-1/2 p-2.5 border border-gray-200 rounded-lg bg-white focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                        >
                          {statusOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                    </section>

                    {/* Step 3: targets */}
                    <section data-tour="pages-targets" className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${!stepEnabled[3] ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className="flex items-start gap-3 mb-4">
                        <StepBadge n={3} enabled={stepEnabled[3]} />
                        <div className="flex-1">
                          <h2 className="text-lg font-semibold text-gray-900">Targets</h2>
                          <p className="text-sm text-gray-500">
                            One target per line. Each becomes one new WordPress page.
                          </p>
                        </div>
                      </div>

                      <textarea
                        data-testid="page-targets-input"
                        id="page-targets-input"
                        name="page-targets"
                        aria-label="Enter targets, one per line"
                        value={targets}
                        onChange={(e) => setTargets(e.target.value)}
                        placeholder={targetPlaceholder}
                        className="w-full min-h-[160px] p-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-sm font-mono"
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        Optional CSV per line: <code>name, keyword, slug, notes</code>
                      </p>

                      {templatePurpose === 'local_town' && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => setShowNearbyPanel(s => !s)}
                            className="text-sm text-primary hover:text-primary-hover font-medium inline-flex items-center gap-1"
                          >
                            <MapPin className="w-4 h-4" />
                            {showNearbyPanel ? 'Hide nearby towns finder' : '+ Add nearby towns'}
                          </button>

                          {showNearbyPanel && (
                            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                              <p className="text-xs text-gray-500 mb-3">
                                Finds towns within {NEARBY_RADIUS_MILES} miles, skipping towns you already have pages for.
                              </p>
                              <div className="grid grid-cols-[1fr_80px] gap-2 mb-2">
                                <input
                                  data-testid="nearby-city-input"
                                  value={nearbyCity}
                                  onChange={(e) => setNearbyCity(e.target.value)}
                                  placeholder="City"
                                  className="p-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:border-primary focus:ring-1 focus:ring-primary"
                                />
                                <input
                                  value={nearbyState}
                                  onChange={(e) => setNearbyState(e.target.value)}
                                  placeholder="State"
                                  className="p-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:border-primary focus:ring-1 focus:ring-primary"
                                />
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                  type="button"
                                  data-testid="find-nearby-towns-button"
                                  onClick={findTownsFromCity}
                                  disabled={isFindingTowns}
                                  className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                  {isFindingTowns
                                    ? <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                                    : <Search className="w-4 h-4 mr-2" />}
                                  Find towns near {nearbyCity || 'city'}
                                </button>
                                <button
                                  type="button"
                                  data-testid="use-my-location-button"
                                  onClick={findTownsFromLocation}
                                  disabled={isFindingTowns}
                                  className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                  <MapPin className="w-4 h-4 mr-2" />
                                  Use my location
                                </button>
                              </div>
                              {lastTownSearchLabel && (
                                <p className="mt-3 text-xs text-gray-600">
                                  Last search: <span className="font-medium">{lastTownSearchLabel}</span>
                                </p>
                              )}
                              {townFinderMessage && (
                                <p className="mt-2 text-xs text-green-700">{townFinderMessage}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </section>
                  </div>

                  {/* RIGHT COLUMN: live preview */}
                  <div className="lg:col-span-5">
                    <div className="lg:sticky lg:top-6 space-y-4">
                      <section data-tour="pages-preview" className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h2 className="text-lg font-semibold text-gray-900">Live preview</h2>
                            <p className="text-sm text-gray-500">
                              What will actually be created. Updates as you type.
                            </p>
                          </div>
                          {isLoadingPreview && (
                            <LoaderIcon className="w-4 h-4 text-gray-400 animate-spin" />
                          )}
                        </div>

                        {/* Status bar */}
                        {previews.length > 0 && (
                          <div className="mb-4 flex items-center gap-3 text-xs">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 border border-green-200 text-green-800">
                              <CheckCircle2 className="w-3 h-3" />
                              {freeCount} ready
                            </span>
                            {collisionCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800">
                                <AlertTriangle className="w-3 h-3" />
                                {collisionCount} collision{collisionCount === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                        )}

                        {previewError && (
                          previews.length === 0 ? (
                            <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-800 text-sm border-2 border-red-300 flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                              <div>
                                <p className="font-semibold">Couldn't reach WordPress to check for existing pages.</p>
                                <p className="text-xs mt-1 text-red-700">
                                  Collision warnings won't show — verify on your site before publishing. Try refreshing or re-check your WordPress connection.
                                </p>
                                <p className="text-xs mt-1 text-red-600 font-mono">{previewError}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="mb-3 p-3 rounded-lg bg-yellow-50 text-yellow-900 text-sm border border-yellow-300 flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                              <div>
                                <p className="font-medium">Partial preview — collision check may be incomplete.</p>
                                <p className="text-xs mt-1 text-yellow-800">{previewError}</p>
                              </div>
                            </div>
                          )
                        )}

                        {/* Empty states */}
                        {!selectedTemplateId ? (
                          <div className="py-10 text-center text-sm text-gray-500">
                            <FileText className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                            Pick a template above to start.
                          </div>
                        ) : !targets.trim() ? (
                          <div className="py-10 text-center text-sm text-gray-500">
                            <Sparkles className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                            Type some targets above to see how they'll look.
                          </div>
                        ) : previews.length === 0 && !isLoadingPreview ? (
                          <div className="py-10 text-center text-sm text-gray-500">
                            No previews yet.
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                            {previews.map((preview) => {
                              const isCollision = Boolean(preview.collision);
                              const isOverridden = isCollision && overrides[preview.name];
                              const displaySlug = isOverridden
                                ? `${preview.slug}-${CURRENT_YEAR}`
                                : preview.slug;
                              const displaySeoTitle = preview.seoTitle;
                              const willGenerate = !isCollision || isOverridden;
                              return (
                                <div
                                  key={preview.name}
                                  className={`rounded-lg border p-3 transition-colors ${
                                    isCollision && !isOverridden
                                      ? 'bg-yellow-50 border-yellow-200'
                                      : isOverridden
                                        ? 'bg-white border-gray-300'
                                        : 'bg-white border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-start gap-2">
                                    {willGenerate ? (
                                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                                    ) : (
                                      <X className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-semibold text-gray-900 truncate flex-1">
                                          {preview.pageTitle}
                                        </p>
                                        <button
                                          type="button"
                                          onClick={() => openPreviewModal(preview)}
                                          disabled={!selectedTemplateId}
                                          className="text-xs text-primary hover:text-primary-hover font-medium inline-flex items-center gap-1 shrink-0 disabled:opacity-50"
                                          title="Preview full page content"
                                        >
                                          <Eye className="w-3 h-3" />
                                          Preview
                                        </button>
                                      </div>
                                      <p className="text-xs text-gray-600 mt-0.5 font-mono truncate">
                                        /{displaySlug}/
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1 truncate" title={displaySeoTitle}>
                                        SEO: {displaySeoTitle}
                                      </p>

                                      {isCollision && (
                                        <div className="mt-2 text-xs">
                                          <div className="flex items-start gap-1.5 text-yellow-800">
                                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                            <span>
                                              Already exists{' '}
                                              <a
                                                href={`https://${activeSite}/?page_id=${preview.collision.existingPageId}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="underline hover:no-underline"
                                              >
                                                (page #{preview.collision.existingPageId}, {preview.collision.existingStatus})
                                              </a>
                                            </span>
                                          </div>
                                          <label className="mt-1.5 inline-flex items-center gap-1.5 cursor-pointer text-gray-700">
                                            <input
                                              type="checkbox"
                                              checked={Boolean(overrides[preview.name])}
                                              onChange={(e) => setOverrides(prev => ({ ...prev, [preview.name]: e.target.checked }))}
                                              className="h-3.5 w-3.5"
                                            />
                                            <span>
                                              Override — use slug <code className="px-1 py-0.5 bg-gray-100 rounded">{preview.slug}-{CURRENT_YEAR}</code>
                                            </span>
                                          </label>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Generate actions */}
                        <div data-tour="pages-generate" className="mt-5 pt-5 border-t border-gray-100 space-y-2">
                          <button
                            type="button"
                            onClick={() => generatePages({ includeColliding: false })}
                            disabled={generateDisabled}
                            className="w-full inline-flex items-center justify-center px-4 py-3 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isGenerating ? (
                              <>
                                <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                                {status === 'publish' ? 'Publishing...' : 'Saving...'}
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                {generateLabel(generableCount)}
                              </>
                            )}
                          </button>

                          {collisionCount > 0 && overrideCount < collisionCount && previews.length > 0 && (
                            <button
                              type="button"
                              onClick={() => generatePages({ includeColliding: true })}
                              disabled={isGenerating || !selectedTemplateId}
                              className="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                            >
                              {generateActionWord} all {previews.length} anyway (override every collision)
                            </button>
                          )}

                          {generableCount === 0 && previews.length > 0 && (
                            <p className="text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded p-2">
                              All targets collide with existing pages. Override the rows you want to regenerate, or change the names.
                            </p>
                          )}
                        </div>

                        {generationMessage && (
                          <div
                            className={`mt-4 rounded-lg border p-3 text-sm ${
                              results.some(r => !r.success)
                                ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                                : 'bg-green-50 border-green-200 text-green-800'
                            }`}
                          >
                            {generationMessage}
                          </div>
                        )}

                        {results.length > 0 && (
                          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                            {results.map((result, index) => (
                              <div
                                key={`${result.target?.name}-${index}`}
                                className="flex items-center justify-between gap-2 p-2 rounded-lg border border-gray-100 bg-gray-50"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {result.target?.pageTitle || result.target?.name}
                                  </p>
                                  <p className={`text-xs ${result.success ? 'text-green-700' : 'text-red-600'}`}>
                                    {result.success ? `Created (${result.status || 'page'})` : result.error}
                                  </p>
                                </div>
                                {result.link && (
                                  <a
                                    href={result.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-primary hover:text-primary-hover font-medium shrink-0 inline-flex items-center gap-1"
                                  >
                                    Open <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    </div>
                  </div>
                </div>
              </div>
          </main>
        )}

        {previewModalTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={closePreviewModal}
          >
            <div
              className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Full page preview"
            >
              <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-200">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {previewModalData?.title || `Preview: ${previewModalTarget.name}`}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Deterministic rewrite preview. AI will additionally rephrase paragraphs for uniqueness when you click {generateActionWord.toLowerCase()}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePreviewModal}
                  aria-label="Close preview"
                  className="shrink-0 p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {previewModalLoading && (
                  <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                    <LoaderIcon className="w-5 h-5 mr-2 animate-spin" />
                    Resolving full page content...
                  </div>
                )}

                {previewModalError && !previewModalLoading && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-800 text-sm border border-red-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{previewModalError}</span>
                  </div>
                )}

                {previewModalData && !previewModalLoading && (
                  <>
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs space-y-1">
                      <div className="flex gap-2">
                        <span className="text-gray-500 w-24 shrink-0">Page title:</span>
                        <span className="text-gray-900 font-medium">{previewModalData.title}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-gray-500 w-24 shrink-0">SEO title:</span>
                        <span className="text-gray-900">{previewModalData.seoTitle}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-gray-500 w-24 shrink-0">Slug:</span>
                        <span className="text-gray-900 font-mono">/{previewModalData.slug}/</span>
                      </div>
                    </div>

                    {previewModalData.sourceHints?.length > 0 && (
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-gray-800 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span>
                          We'll replace{' '}
                          <span className="font-semibold">{previewModalData.replacementCount}</span>{' '}
                          instance{previewModalData.replacementCount === 1 ? '' : 's'} of{' '}
                          <span className="font-medium">
                            {previewModalData.sourceHints.join(', ')}
                          </span>{' '}
                          in this page with{' '}
                          <span className="font-medium">{previewModalTarget.name}</span>.
                        </span>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-2">Body content (deterministic rewrite)</p>
                      <iframe
                        title="Page preview"
                        sandbox="allow-same-origin"
                        className="w-full h-[600px] border border-gray-200 rounded-lg bg-white"
                        srcDoc={`<!doctype html><html><head>
                          <meta charset="utf-8" />
                          <base href="https://${activeSite}/" />
                          <style>
                            :root { color-scheme: light; }
                            * { box-sizing: border-box; }
                            body {
                              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                              color: #1f2937;
                              line-height: 1.65;
                              margin: 0;
                              padding: 32px;
                              max-width: 880px;
                              margin-left: auto;
                              margin-right: auto;
                              background: #fff;
                            }
                            h1, h2, h3, h4, h5, h6 { color: #0f172a; font-weight: 700; line-height: 1.25; }
                            h1 { font-size: 32px; margin: 0 0 20px; }
                            h2 { font-size: 24px; margin: 36px 0 14px; }
                            h3 { font-size: 19px; margin: 28px 0 12px; }
                            h4 { font-size: 16px; margin: 20px 0 8px; }
                            h5, h6 { font-size: 14px; margin: 16px 0 6px; }
                            p { margin: 0 0 16px; }
                            a { color: #2563eb; text-decoration: underline; }
                            ul, ol { margin: 0 0 18px; padding-left: 26px; }
                            li { margin-bottom: 8px; }
                            img { max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0; display: block; }
                            blockquote { border-left: 3px solid #cbd5e1; padding: 4px 16px; color: #475569; margin: 18px 0; font-style: italic; }
                            table { border-collapse: collapse; width: 100%; margin: 18px 0; font-size: 14px; }
                            th, td { border: 1px solid #e5e7eb; padding: 10px 14px; text-align: left; }
                            th { background: #f9fafb; font-weight: 600; }
                            strong { color: #0f172a; font-weight: 600; }
                            hr { border: none; border-top: 1px solid #e5e7eb; margin: 32px 0; }
                            /* ----- Elementor compatibility ----- */
                            /* Elementor wraps everything in nested containers with no default styling.
                               Without the theme's CSS the page renders as one squashed blob. Give
                               containers vertical rhythm + reset their layout so content reads cleanly. */
                            [data-elementor-type], .elementor, .e-con, .e-parent, .e-con-inner,
                            .elementor-element, .elementor-container, .elementor-row, .elementor-column,
                            .elementor-column-wrap, .elementor-widget-wrap, .elementor-widget-container {
                              display: block;
                              width: 100%;
                              max-width: 100%;
                              margin: 0;
                              padding: 0;
                              background: none !important;
                              border: 0 !important;
                              box-shadow: none !important;
                            }
                            .elementor-widget { margin-bottom: 18px; }
                            .elementor-heading-title { margin: 0; }
                            /* Elementor's headings are p-tags styled like h2 — give them real heading look */
                            p.elementor-heading-title.elementor-size-default { font-size: 18px; font-weight: 600; color: #0f172a; margin: 24px 0 10px; }
                            /* Visual elements we can't render meaningfully without theme CSS */
                            .elementor-widget-spacer, .elementor-widget-divider,
                            .elementor-background-overlay, .elementor-shape, .elementor-shape-fill,
                            .elementor-button-wrapper.is-pending { display: none; }
                            /* Elementor buttons → real-looking buttons */
                            .elementor-button, .elementor-button-link {
                              display: inline-block;
                              padding: 10px 18px;
                              background: #0f172a;
                              color: #fff !important;
                              text-decoration: none !important;
                              border-radius: 8px;
                              font-weight: 600;
                              margin: 6px 0;
                            }
                            .elementor-button-text { color: #fff; }
                            /* iframes inside the content (maps etc.) */
                            iframe { max-width: 100%; border: 0; border-radius: 8px; }
                            /* Hide raw shortcode-like fragments that look ugly without their plugin */
                            .joint-slider, [data-config] { display: none; }
                          </style>
                        </head><body>${previewModalData.bodyHtml || '<p style="color:#9ca3af">No body content.</p>'}</body></html>`}
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        Simplified preview — your live site&apos;s theme adds full styling.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="border-t border-gray-200 p-3 flex justify-end">
                <button
                  type="button"
                  onClick={closePreviewModal}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </NavbarWrapper>
  );
};

export default Pages;
