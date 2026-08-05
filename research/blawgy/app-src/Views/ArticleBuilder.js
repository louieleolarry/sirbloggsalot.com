import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import {
  AlertCircle,
  Loader,
  CheckCircle,
  PenLine,
  RefreshCw,
  Image,
  Zap,
  FileText,
  Link,
  ExternalLink,
  Youtube,
  Upload
} from 'lucide-react';

import apiClient from '../utils/apiClient';
import { useImpersonation } from '../contexts/ImpersonationContext';
import NavbarWrapper from '../components/Navbar';
import LinkOptions from '../components/LinkOptions';
import { useModals } from '../contexts/ModalContext';
import DraftsModal from '../components/DraftsModal';
import RichTextEditor from '../components/rich-text-editor/rich-text-editor.component';

// Define YouTube channel storage key
const YOUTUBE_CHANNEL_STORAGE_KEY = 'blawg_youtube_channel_url';

// Define article types with custom icons that match the mockup
const ArticleTypes = [
  {
    id: 'smart-composer',
    name: 'Smart Composer',
    icon: <span className="text-[26px]">✨</span>,
    requiresUrl: false,
    maxUrls: 3,
    description: 'Our flagship AI writer that creates high-quality content on any topic'
  },
  {
    id: 'remix',
    name: 'Remix',
    icon: <span className="text-[26px]">🔄</span>,
    requiresUrl: true,
    maxUrls: 1,
    description: 'Transform existing content with a fresh perspective'
  },
  {
    id: 'listical',
    name: 'Listical',
    icon: <span className="text-[26px]">📋</span>,
    comingSoon: true,
    description: 'Create engaging, numbered list articles'
  },
  {
    id: 'informative',
    name: 'Informative',
    icon: <span className="text-[26px]">📚</span>,
    comingSoon: true,
    description: 'Authoritative, educational content'
  },
  {
    id: 'howto',
    name: 'How To',
    icon: <span className="text-[26px]">🔍</span>,
    comingSoon: true,
    description: 'Step-by-step guides and tutorials'
  }
];

function ArticleBuilder({ logout, currentSite: currentSiteProp, updateCurrentSite }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { authToken, userToken } = useAuth();
  const { currentSite, user, impersonatedSite } = useImpersonation();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const { setShowBulkGenerateModal, setShowImageStyleModal, setShowAdminPanel, setShowSubscriptionModal, setShowSupportModal } = useModals();

  // Step 1 - Prompt inputs
  const [articlePrompt, setArticlePrompt] = useState('');
  const [selectedType, setSelectedType] = useState(null);

  // Step 2 - Title selection
  const [generatedTitles, setGeneratedTitles] = useState([]);
  const [selectedTitle, setSelectedTitle] = useState(null);

  // Step 3 - Outline review
  const [outline, setOutline] = useState(null);
  const [regeneratePrompt, setRegeneratePrompt] = useState('');

  // Step 4 - Article review
  const [article, setArticle] = useState(null);
  const [currentSectionEditing, setCurrentSectionEditing] = useState(null);
  const [sectionEditPrompt, setSectionEditPrompt] = useState('');
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editedSectionContent, setEditedSectionContent] = useState('');

  // Options
  // Multi-location businesses can aim a draft at one store. Empty selection
  // means "all locations", which is the behaviour every site had before.
  const [businessLocations, setBusinessLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [useInternalLinks, setUseInternalLinks] = useState(false);
  const [useExternalLinks, setUseExternalLinks] = useState(false);
  const [useYouTubeVideos, setUseYouTubeVideos] = useState(false);
  const [useOwnYouTubeChannel, setUseOwnYouTubeChannel] = useState(false);
  const [youtubeChannelUrl, setYoutubeChannelUrl] = useState('');
  const [youtubeChannelInfo, setYoutubeChannelInfo] = useState(null);
  const [isLoadingChannel, setIsLoadingChannel] = useState(false);
  const [isValidYouTubeChannel, setIsValidYouTubeChannel] = useState(true);
  const [urlInput, setUrlInput] = useState('');
  const [urlList, setUrlList] = useState([]);
  const [showImageStyleOptions, setShowImageStyleOptions] = useState(false);
  const [customImageDescription, setCustomImageDescription] = useState('');
  const [customImageStyle, setCustomImageStyle] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Saved business locations, for the store picker. Only surfaced when there is
  // more than one, so single-location sites see no new control.
  useEffect(() => {
    const activeSite = impersonatedSite?.site || currentSite;
    if (!activeSite) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await apiClient.get('/api/pages/business-profiles', {
          params: { site: activeSite, email: impersonatedSite ? undefined : user?.email }
        });
        if (!cancelled && Array.isArray(resp?.data?.profiles)) {
          setBusinessLocations(resp.data.profiles);
        }
      } catch {
        // No locations configured, or the lookup failed. Picker stays hidden.
      }
    })();
    return () => { cancelled = true; };
  }, [impersonatedSite, currentSite, user?.email]);

  // Load YouTube channel URL from localStorage when component mounts
  useEffect(() => {
    const savedChannelUrl = localStorage.getItem(YOUTUBE_CHANNEL_STORAGE_KEY);
    if (savedChannelUrl) {
      setYoutubeChannelUrl(savedChannelUrl);
    }
  }, []);

  // Save YouTube channel URL to localStorage whenever it changes
  useEffect(() => {
    if (youtubeChannelUrl) {
      localStorage.setItem(YOUTUBE_CHANNEL_STORAGE_KEY, youtubeChannelUrl);
    } else {
      localStorage.removeItem(YOUTUBE_CHANNEL_STORAGE_KEY);
    }
  }, [youtubeChannelUrl]);

  // Add effect to fetch YouTube channel data when URL changes
  useEffect(() => {
    const fetchYouTubeChannel = async () => {
      // Reset channel info and validation state
      setYoutubeChannelInfo(null);

      // Don't try to fetch if URL is empty
      if (!youtubeChannelUrl || !useOwnYouTubeChannel) {
        setIsValidYouTubeChannel(true);
        return;
      }

      // Validate URL format
      const isValid = validateYouTubeChannel(youtubeChannelUrl);
      setIsValidYouTubeChannel(isValid);

      if (!isValid) return;

      // Start loading
      setIsLoadingChannel(true);
      setError('');

      try {
        const response = await apiClient.post('/fetch-youtube-channel', {
          channelUrl: youtubeChannelUrl,
          maxVideos: 50
        }, {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        });

        if (response.data.success && response.data.channelInfo) {
          setYoutubeChannelInfo(response.data.channelInfo);
        } else {
          setError('Could not fetch YouTube channel videos');
          setIsValidYouTubeChannel(false);
        }
      } catch (error) {
        console.error('Error fetching YouTube channel:', error);
        setError(error.response?.data?.message || 'Failed to fetch YouTube channel');
        setIsValidYouTubeChannel(false);
      } finally {
        setIsLoadingChannel(false);
      }
    };

    // Fetch YouTube channel data with a slight delay
    const timer = setTimeout(() => {
      if (useOwnYouTubeChannel && youtubeChannelUrl) {
        fetchYouTubeChannel();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [youtubeChannelUrl, useOwnYouTubeChannel, userToken]);

  // Add state for featured image
  const [featuredImage, setFeaturedImage] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Add state for regeneration attempts
  const [regenerationAttempts, setRegenerationAttempts] = useState({});
  const MAX_REGENERATION_ATTEMPTS = 3;

  // Keywords handling
  const [keywords, setKeywords] = useState([]);
  const [keywordInput, setKeywordInput] = useState('');

  // Product screenshot upload
  const [productScreenshots, setProductScreenshots] = useState([]);
  const [isAnalyzingScreenshots, setIsAnalyzingScreenshots] = useState(false);
  const [screenshotAnalysis, setScreenshotAnalysis] = useState(null);

  // Add state for regenerating sections
  const [isGeneratingSection, setIsGeneratingSection] = useState(false);
  const [sectionRegenerating, setSectionRegenerating] = useState(null);

  // In the ArticleBuilder function component, add these state variables
  const [currentArticleId, setCurrentArticleId] = useState(null);

  // Add this new state for regeneration modal
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerationError, setRegenerationError] = useState('');

  // Draft management state
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [publishedArticles, setPublishedArticles] = useState([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSaveFailed, setDraftSaveFailed] = useState(false);
  const [autoSaveEnabled] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  // Draft Management Functions
  const fetchDrafts = async () => {
    if (!user?.email || !currentSite) return;
    
    setIsLoadingDrafts(true);
    try {
      const response = await apiClient.get('/api/article-builder/drafts', {
        params: {
          email: impersonatedSite ? impersonatedSite.email : user.email,
          site: impersonatedSite?.site || currentSite,
          status: 'draft'
        },
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (response.data.success) {
        setDrafts(response.data.drafts || []);
      }
    } catch (error) {
      console.error('Error fetching drafts:', error);
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  const fetchPublishedArticles = async () => {
    if (!user?.email || !currentSite) return [];
    
    try {
      const response = await apiClient.get('/api/article-builder/published-articles', {
        params: {
          site: impersonatedSite?.site || currentSite,
          createdWith: 'article-builder'
        },
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (response.data.success) {
        return response.data.blogs || [];
      }
    } catch (error) {
      console.error('Error fetching published articles:', error);
    }
    return [];
  };

  const saveDraft = async (force = false) => {
    // Don't save if nothing to save yet
    if (!articlePrompt && !selectedTitle && !outline && !article) {
      return;
    }

    // Don't save if already saving (unless forced)
    if (isSavingDraft && !force) return;

    setIsSavingDraft(true);
    try {
      const draftData = {
        draftId: currentDraftId,
        email: impersonatedSite ? impersonatedSite.email : user?.email,
        site: impersonatedSite?.site || currentSite,
        currentStep: step === 1 ? 'define' : step === 2 ? 'title' : step === 3 ? 'outline' : 'article'
      };

      // Add data based on current step
      if (articlePrompt || selectedType) {
        draftData.defineData = {
          prompt: articlePrompt,
          articleType: selectedType?.id,
          uploadedBlogUrls: urlList,
          screenshots: productScreenshots.map(s => ({
            url: s.s3Url || s.previewUrl,
            analysis: s.analyzed ? screenshotAnalysis : null
          })),
          isRemix: selectedType?.id === 'remix',
          screenshotUrls: productScreenshots.map(s => s.s3Url || s.previewUrl).filter(Boolean)
        };
      }

      if (generatedTitles.length > 0 || selectedTitle) {
        draftData.titleData = {
          generatedTitles: generatedTitles.map(t => typeof t === 'object' ? t.refined : t),
          selectedTitle: selectedTitle,
          temperature: 0.7
        };
      }

      if (outline) {
        draftData.outlineData = {
          outline: outline,
          useInternalLinks,
          useExternalLinks,
          useYouTubeVideos,
          youtubeChannelUrl: useOwnYouTubeChannel ? youtubeChannelUrl : null,
          youtubeVideos: youtubeChannelInfo?.videos || []
        };
      }

      if (article) {
        draftData.articleData = {
          article: article,
          sections: article.sections,
          isFactChecked: article.isFactChecked || false,
          metaDescription: article.metaDescription,
          keywords: keywords,
          featuredImage: featuredImage
        };
      }

      const response = await apiClient.post('/api/article-builder/drafts', draftData, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (response.data.success) {
        setDraftSaveFailed(false);
        // Update current draft ID if this is a new draft
        if (!currentDraftId && response.data.draft?.id) {
          setCurrentDraftId(response.data.draft.id);
          // Add draft ID to URL for seamless reload
          setSearchParams({ draftId: response.data.draft.id });
        }
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      setDraftSaveFailed(true);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const loadDraft = async (draft, showToast = true) => {
    try {
      // Fetch full draft data
      const response = await apiClient.get(`/api/article-builder/drafts/${draft.id}`, {
        params: {
          email: impersonatedSite ? impersonatedSite.email : user?.email,
          site: impersonatedSite?.site || currentSite
        },
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (response.data.success && response.data.draft) {
        const fullDraft = response.data.draft;
        
        // Restore state based on draft data
        setCurrentDraftId(fullDraft._id);
        
        // Add draft ID to URL
        setSearchParams({ draftId: fullDraft._id });
        
        // Restore define step data
        if (fullDraft.defineData) {
          setArticlePrompt(fullDraft.defineData.prompt || '');
          if (fullDraft.defineData.articleType) {
            const type = ArticleTypes.find(t => t.id === fullDraft.defineData.articleType);
            setSelectedType(type);
          }
          setUrlList(fullDraft.defineData.uploadedBlogUrls || []);
          if (fullDraft.defineData.screenshots) {
            setProductScreenshots(fullDraft.defineData.screenshots);
          }
        }

        // Restore title step data
        if (fullDraft.titleData) {
          if (fullDraft.titleData.generatedTitles) {
            setGeneratedTitles(fullDraft.titleData.generatedTitles.map(t => ({
              original: t,
              refined: t,
              note: null
            })));
          }
          setSelectedTitle(fullDraft.titleData.selectedTitle || null);
        }

        // Restore outline step data
        if (fullDraft.outlineData) {
          setOutline(fullDraft.outlineData.outline);
          setUseInternalLinks(fullDraft.outlineData.useInternalLinks || false);
          setUseExternalLinks(fullDraft.outlineData.useExternalLinks || false);
          setUseYouTubeVideos(fullDraft.outlineData.useYouTubeVideos || false);
          if (fullDraft.outlineData.youtubeChannelUrl) {
            setYoutubeChannelUrl(fullDraft.outlineData.youtubeChannelUrl);
            setUseOwnYouTubeChannel(true);
          }
          if (fullDraft.outlineData.youtubeVideos) {
            setYoutubeChannelInfo({ videos: fullDraft.outlineData.youtubeVideos });
          }
        }

        // Restore article step data
        if (fullDraft.articleData) {
          setArticle(fullDraft.articleData.article);
          setKeywords(fullDraft.articleData.keywords || []);
          setFeaturedImage(fullDraft.articleData.featuredImage || null);
        }

        // Set the current step based on what data exists (smart detection)
        // This ensures if they generated titles, they see the title selection step
        let targetStep = 1;
        if (fullDraft.articleData?.article) {
          targetStep = 4; // Article review
        } else if (fullDraft.outlineData?.outline) {
          targetStep = 3; // Outline
        } else if (fullDraft.titleData?.generatedTitles?.length > 0) {
          targetStep = 2; // Title selection - show generated titles
        } else if (fullDraft.defineData?.prompt) {
          targetStep = 1; // Define
        }
        
        setStep(targetStep);

        // Close the drafts modal
        setShowDraftsModal(false);
        
        // Only show toast if requested (suppress for automatic URL loading)
        if (showToast) {
          toast.success('Draft loaded successfully!');
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
      if (showToast) {
        toast.error('Failed to load draft');
      }
    }
  };

  const deleteDraft = async (draftId) => {
    try {
      await apiClient.delete(`/api/article-builder/drafts/${draftId}`, {
        params: {
          email: impersonatedSite ? impersonatedSite.email : user?.email,
          site: impersonatedSite?.site || currentSite
        },
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      // Refresh drafts list
      await fetchDrafts();
      toast.success('Draft deleted successfully');
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast.error('Failed to delete draft');
    }
  };

  const startNewArticle = () => {
    // Reset all state
    setCurrentDraftId(null);
    setArticlePrompt('');
    setSelectedType(null);
    setGeneratedTitles([]);
    setSelectedTitle(null);
    setOutline(null);
    setArticle(null);
    setUrlList([]);
    setProductScreenshots([]);
    setKeywords([]);
    setFeaturedImage(null);
    setStep(1);
    setShowDraftsModal(false);
    
    // Remove draft ID from URL
    setSearchParams({});
  };

  const generateLoadingMessage = useCallback(() => {
    const messages = {
      1: [
        "Analyzing your request...",
        "Generating creative titles...",
        "Brainstorming ideas based on your prompt...",
        "Creating unique article concepts..."
      ],
      2: [
        "Creating article outline...",
        "Structuring content sections...",
        "Organizing main points..."
      ],
      3: [
        "Generating comprehensive article...",
        "Researching key information...",
        "Writing engaging content...",
        "Adding relevant details...",
        "Applying final touches..."
      ]
    };

    // Special messages for remix article type
    if (selectedType?.id === 'remix') {
      const remixMessages = {
        1: [
          "Analyzing the original article...",
          "Extracting key information...",
          "Exploring new angles...",
          "Planning unique perspective..."
        ],
        2: [
          "Restructuring original content...",
          "Creating fresh outline...",
          "Organizing from new perspective..."
        ],
        3: [
          "Transforming the article...",
          "Shifting perspective...",
          "Adding unique insights...",
          "Creating fresh content..."
        ]
      };
      return remixMessages[step] ?
        remixMessages[step][Math.floor(Math.random() * remixMessages[step].length)] :
        remixMessages[1][Math.floor(Math.random() * remixMessages[1].length)];
    }

    const currentMessages = messages[step] || messages[1];
    return currentMessages[Math.floor(Math.random() * currentMessages.length)];
  }, [selectedType?.id, step]);

  useEffect(() => {
    // Rotate messages for the generation steps only; step 4 keeps its own
    // "Saving article..." message.
    if (isLoading && step < 4) {
      const interval = setInterval(() => {
        setLoadingMessage(generateLoadingMessage());
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isLoading, step, generateLoadingMessage]);

  // Check for existing drafts on component mount OR load from URL
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const loadDraftFromUrl = async () => {
      const draftIdFromUrl = searchParams.get('draftId');
      
      // Prevent loading twice in React StrictMode
      if (hasLoadedFromUrl.current) return;
      
      if (draftIdFromUrl && user?.email && currentSite) {
        hasLoadedFromUrl.current = true;
        
        // Load specific draft from URL
        try {
          const response = await apiClient.get(`/api/article-builder/drafts/${draftIdFromUrl}`, {
            params: {
              email: impersonatedSite ? impersonatedSite.email : user.email,
              site: impersonatedSite?.site || currentSite
            },
            headers: {
              'Authorization': `Bearer ${userToken}`
            }
          });

          if (response.data.success && response.data.draft) {
            // Load draft without showing toast (automatic reload, not manual selection)
            await loadDraft({ id: draftIdFromUrl }, false);
          }
        } catch (error) {
          console.error('Error loading draft from URL:', error);
          // Remove invalid draft ID from URL
          setSearchParams({});
          hasLoadedFromUrl.current = false;
        }
      }
    };

    const checkForDrafts = async () => {
      if (!user?.email || !currentSite) {
        setIsInitializing(false);
        return;
      }
      
      // Skip if we're loading from URL
      if (searchParams.get('draftId')) {
        await loadDraftFromUrl();
        setIsInitializing(false);
        return;
      }

      setIsLoadingDrafts(true);
      try {
        const response = await apiClient.get('/api/article-builder/drafts', {
          params: {
            email: impersonatedSite ? impersonatedSite.email : user.email,
            site: impersonatedSite?.site || currentSite,
            status: 'draft'
          },
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        });

        if (response.data.success && response.data.drafts && response.data.drafts.length > 0) {
          setDrafts(response.data.drafts);
          
          // Also fetch published articles
          const publishedResp = await fetchPublishedArticles();
          setPublishedArticles(publishedResp);
          
          setShowDraftsModal(true);
        }
      } catch (error) {
        console.error('Error checking for drafts:', error);
      } finally {
        setIsLoadingDrafts(false);
        setIsInitializing(false);
      }
    };

    checkForDrafts();
    // NOTE: `searchParams` is intentionally NOT in the deps. The draftId is read
    // once on mount (and again when auth resolves). Keeping searchParams here made
    // the first autosave's setSearchParams({ draftId }) re-run this effect, which
    // re-loaded the just-saved server snapshot and clobbered in-flight edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, currentSite, userToken, impersonatedSite]);

  // Auto-save with debouncing
  const autoSaveTimeoutRef = useRef(null);
  const hasLoadedFromUrl = useRef(false);
  
  useEffect(() => {
    if (!autoSaveEnabled) return;
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (debounced by 2 seconds)
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articlePrompt, selectedType, urlList, selectedTitle, outline, article, keywords, featuredImage, useInternalLinks, useExternalLinks, useYouTubeVideos]);

  // After a failed autosave, keep retrying even if the user stops editing,
  // so the "We'll keep trying" pill stays honest.
  useEffect(() => {
    if (!draftSaveFailed) return;
    const retryInterval = setInterval(() => {
      saveDraft();
    }, 15000);
    return () => clearInterval(retryInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSaveFailed]);

  const handleArticleTypeSelect = (type) => {
    // Don't select coming soon types
    if (type.comingSoon) {
      return;
    }
    setSelectedType(type);
  };

  // Update URL handling functions
  const addUrl = () => {
    if (!urlInput.trim()) return;

    try {
      // Validate URL
      new URL(urlInput);

      // Check URL limit based on selected type
      const urlLimit = selectedType?.maxUrls || 1;
      if (urlList.length >= urlLimit) {
        setError(`You can only add up to ${urlLimit} URL${urlLimit > 1 ? 's' : ''} for ${selectedType?.name}`);
        return;
      }

      // Add URL to list
      setUrlList([...urlList, urlInput]);
      setUrlInput('');
    } catch (err) {
      setError('Please enter a valid URL');
    }
  };

  const removeUrl = (index) => {
    const newUrlList = [...urlList];
    newUrlList.splice(index, 1);
    setUrlList(newUrlList);
  };

  // Clear URL state when changing article type
  useEffect(() => {
    setUrlList([]);
    setUrlInput('');
  }, [selectedType?.id]);

  // Add YouTube channel validation
  const validateYouTubeChannel = (url) => {
    if (!url) return true; // Empty input is considered valid (validation happens when actually trying to use it)

    // Only validate non-empty URLs - include period in handles
    const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/)?(@[\w.-]+|channel\/[\w-]+)$/;
    const isValid = youtubePattern.test(url);

    if (!isValid && url.includes('youtube.com')) {
      setError('Please enter a valid YouTube channel URL in the format: https://www.youtube.com/@adamc0dez or https://www.youtube.com/channel/CHANNEL_ID');
    } else if (!isValid && !url.startsWith('@')) {
      setError('Please enter a valid YouTube channel handle (e.g., @adamc0dez) or full URL');
    } else {
      setError(''); // Clear any previous errors
    }

    return isValid;
  };

  const handleSubmitPrompt = async () => {
    // Prevent a second in-flight request (the step-2 "Generate More Titles"
    // button isn't disabled while loading, so it can be double-clicked).
    if (isLoading) return;

    if (!articlePrompt || !selectedType) {
      setError('Please provide a prompt and select an article type');
      return;
    }

    // URL validation for types requiring URL
    if (selectedType.requiresUrl && urlList.length === 0) {
      setError(`Please provide at least one URL for ${selectedType.name}`);
      return;
    }

    setIsLoading(true);
    setError('');
    setLoadingMessage(generateLoadingMessage());

    try {
      // Initial title generation
      const response = await apiClient.post('/generate-article-titles', {
        prompt: articlePrompt,
        articleType: selectedType.id,
        site: impersonatedSite?.site || currentSite,
        email: impersonatedSite ? undefined : user?.email,
        locationId: selectedLocationId || undefined,
        uploadedBlogUrl: urlList[0] || undefined,
        uploadedBlogUrls: urlList,
        isRemix: selectedType.id === 'remix',
        useInternalLinks,
        useExternalLinks,
        useYouTubeVideos,
        youtubeChannelUrl: useOwnYouTubeChannel ? youtubeChannelUrl : undefined,
        temperature: 0.7 // Use higher temperature for diverse title generation
      });

      if (response.data.success) {
        // Filter out any titles with colons as per style rules
        const initialTitles = response.data.titles.map(title =>
          title.includes(':') ? title.replace(/:/g, ' - ') : title
        );

        // Automatically refine titles with actionable advice
        setLoadingMessage("Refining titles for maximum impact...");

        // Second API call to refine titles with specific improvements
        try {
          const refinementResponse = await apiClient.post('/generate-article-titles', {
            prompt: `I need to improve these article titles to make them more compelling and click-worthy. 
            For each title, provide a specific improvement note explaining what was weak about the original,
            followed by the improved version.
            
            Original titles:
            ${initialTitles.join('\n')}
            
            Please format your response as follows for each title:

            TITLE 1:
            Original: "Original title text"
            Improvement Note: "Specific reason why the original could be stronger"
            Refined: "New, improved title"

            TITLE 2:
            Original: "Original title text"
            Improvement Note: "Specific reason why the original could be stronger"
            Refined: "New, improved title"
            
            And so on. Make the titles more compelling by:
            1. Using powerful action words
            2. Creating curiosity
            3. Adding specificity with numbers when appropriate
            4. Creating emotional connection
            5. Being direct and conversational
            6. Ensuring titles are 50-60 characters when possible`,
            articleType: selectedType.id,
            maxTokens: 2000,
            temperature: 0.8 // Use an even higher temperature for more creative title improvements
          });

          if (refinementResponse.data.success && refinementResponse.data.titles) {
            // Process the refined titles and their improvement notes
            const refinedTitlesWithNotes = parseRefinedTitles(refinementResponse.data.titles);
            if (refinedTitlesWithNotes.length > 0) {
              setGeneratedTitles(refinedTitlesWithNotes);
              setStep(2);
              return;
            }
          }
        } catch (err) {
          console.error('Error refining titles:', err);
          // Continue with original titles if refinement fails
        }

        // Fallback to original titles if refinement process fails
        setGeneratedTitles(initialTitles.map(title => ({
          original: title,
          refined: title,
          note: null
        })));
        setStep(2);
      } else {
        setError(response.data.message || 'Failed to generate titles');
      }
    } catch (err) {
      console.error('Error generating titles:', err);
      setError(err.response?.data?.message || 'An error occurred while generating titles');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to parse refined titles with improvement notes
  const parseRefinedTitles = (responseText) => {
    try {
      const titleBlocks = responseText.split(/TITLE \d+:/g).filter(block => block.trim().length > 0);
      return titleBlocks.map(block => {
        const originalMatch = block.match(/Original:\s*"?(.*?)"?\s*(?=Improvement|Refined)/);
        const noteMatch = block.match(/Improvement Note:\s*"?(.*?)"?\s*(?=Refined)/);
        const refinedMatch = block.match(/Refined:\s*"?(.*?)"?$/m);

        return {
          original: originalMatch ? originalMatch[1].trim().replace(/^"|"$/g, '') : '',
          note: noteMatch ? noteMatch[1].trim().replace(/^"|"$/g, '') : null,
          refined: refinedMatch ? refinedMatch[1].trim().replace(/^"|"$/g, '') : ''
        };
      }).filter(title => title.refined && title.original);
    } catch (err) {
      console.error('Error parsing refined titles:', err);
      return [];
    }
  };

  const handleTitleSelect = async (title) => {
    // Guard against a second in-flight outline request.
    if (isLoading) return;

    // If we receive a title object (with refined property), extract the actual title text
    const titleText = typeof title === 'object' ? title.refined : title;

    setSelectedTitle(titleText);
    setIsLoading(true);
    setError('');
    setLoadingMessage(generateLoadingMessage());

    try {
      // If we have product screenshots that have been analyzed, include the analysis in our outline prompt
      let outlineContext = articlePrompt;

      // Check if we have analyzed screenshots to incorporate into outline
      if (productScreenshots.length > 0 && screenshotAnalysis) {
        // Add screenshot context to the prompt
        outlineContext += `\n\nPlease incorporate these product screenshots in the article:`;

        // Add each screenshot with its information
        productScreenshots.forEach((screenshot, index) => {
          if (screenshot.s3Url) {
            outlineContext += `\nImage ${index + 1}: ${screenshot.name} (${screenshot.s3Url})`;
          }
        });

        // Add analysis summary
        if (screenshotAnalysis.summary) {
          outlineContext += `\n\nScreenshot Analysis: ${screenshotAnalysis.summary}`;
        }

        // Add key features
        if (screenshotAnalysis.keyFeatures && screenshotAnalysis.keyFeatures.length > 0) {
          outlineContext += `\n\nKey features in screenshots: ${screenshotAnalysis.keyFeatures.join(', ')}`;
        }

        // Add direction to assign images to sections
        outlineContext += `\n\nIMPORTANT: In your response, please suggest which article section each screenshot should be assigned to.`;
      }

      // Generate article outline with screenshot context
      const response = await apiClient.post('/generate-article-outline', {
        title: titleText,
        articleType: selectedType.id,
        site: impersonatedSite?.site || currentSite,
        email: impersonatedSite ? undefined : user?.email,
        locationId: selectedLocationId || undefined,
        useInternalLinks,
        useExternalLinks,
        useYouTubeVideos,
        youtubeChannelUrl: useOwnYouTubeChannel ? youtubeChannelUrl : null,
        youtubeVideos: youtubeChannelInfo?.videos || undefined,
        uploadedBlogUrl: urlList[0] || undefined,
        uploadedBlogUrls: urlList,
        isRemix: selectedType.id === 'remix',
        prompt: outlineContext + " Important: Make the intro section brief (2-3 short sentences max). Do not use colons in any section titles. Do not include a conclusion or summary section at the end of the article.",
        // If we have analyzed screenshots, include them
        screenshots: productScreenshots.length > 0 ? productScreenshots.map(s => ({
          name: s.name,
          url: s.s3Url || s.previewUrl,
          analyzed: s.analyzed
        })) : undefined,
        screenshotAnalysis: screenshotAnalysis
      });

      if (response.data.success) {
        // Process the outline to remove any colons from section titles and filter out conclusion sections
        let processedOutline = {
          ...response.data.outline,
          sections: response.data.outline.sections
            .filter(section => !section.title.toLowerCase().includes('conclusion'))
            .map(section => ({
              ...section,
              title: section.title
                .replace(/:/g, ' - ')
                .replace(/^(introduction|intro|conclusion)\s*-\s*/i, '$1')
                .replace(/conclusion/gi, 'Final Thoughts')
                .trim()
            }))
        };

        // If we have image assignments from the API, process them
        if (response.data.imageAssignments && productScreenshots.length > 0) {
          // Apply image assignments to sections
          processedOutline.sections = processedOutline.sections.map(section => {
            const assignment = response.data.imageAssignments.find(
              a => a.sectionId === section.id || a.sectionTitle === section.title
            );

            if (assignment && assignment.imageIndex >= 0 && assignment.imageIndex < productScreenshots.length) {
              return {
                ...section,
                assignedImage: productScreenshots[assignment.imageIndex],
                imageDescription: assignment.description || null
              };
            }
            return section;
          });
        } else if (productScreenshots.length > 0) {
          // Simple fallback assignment if API didn't provide assignments
          // Assign first image to intro, second to first main section, etc.
          let imageIndex = 0;
          processedOutline.sections = processedOutline.sections.map(section => {
            if (imageIndex < productScreenshots.length) {
              const result = {
                ...section,
                assignedImage: productScreenshots[imageIndex],
                imageDescription: null
              };
              imageIndex++;
              return result;
            }
            return section;
          });
        }

        setOutline(processedOutline);
        setStep(3);
      } else {
        setError(response.data.message || 'Failed to generate outline');
      }
    } catch (err) {
      console.error('Error generating outline:', err);
      setError(err.response?.data?.message || 'An error occurred while generating outline');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateOutline = async () => {
    if (!regeneratePrompt) {
      setError('Please provide instructions for regenerating the outline');
      return;
    }

    setIsLoading(true);
    setError('');
    setLoadingMessage(generateLoadingMessage());

    try {
      // This would be a real API call in the actual implementation
      const response = await apiClient.post('/regenerate-article-outline', {
        title: selectedTitle,
        articleType: selectedType.id,
        prompt: regeneratePrompt + " Important: Make the intro section brief (2-3 short sentences max). Do not use colons in any section titles. Do not include a conclusion or summary section at the end of the article.",
        site: impersonatedSite?.site || currentSite,
        email: impersonatedSite ? undefined : user?.email,
        locationId: selectedLocationId || undefined,
        useInternalLinks,
        useExternalLinks,
        useYouTubeVideos,
        youtubeChannelUrl: useOwnYouTubeChannel ? youtubeChannelUrl : null,
        youtubeVideos: youtubeChannelInfo?.videos || undefined,
        uploadedBlogUrl: urlList[0] || undefined,
        uploadedBlogUrls: urlList,
        isRemix: selectedType.id === 'remix',
        originalPrompt: articlePrompt
      });

      if (response.data.success) {
        // Process the outline to remove any colons from section titles and filter out conclusion sections
        const processedOutline = {
          ...response.data.outline,
          sections: response.data.outline.sections
            .filter(section => !section.title.toLowerCase().includes('conclusion'))
            .map(section => ({
              ...section,
              title: section.title
                .replace(/:/g, ' - ')
                .replace(/^(introduction|intro|conclusion)\s*-\s*/i, '$1')
                .replace(/conclusion/gi, 'Final Thoughts')
                .trim()
            }))
        };
        setOutline(processedOutline);
        setRegeneratePrompt('');
      } else {
        setError(response.data.message || 'Failed to regenerate outline');
      }
    } catch (err) {
      console.error('Error regenerating outline:', err);
      setError(err.response?.data?.message || 'An error occurred while regenerating outline');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateArticle = async () => {
    // Guard against a second in-flight full-article request.
    if (isLoading) return;

    if (!outline || !selectedTitle) {
      setError('Outline and title are required');
      return;
    }

    setIsLoading(true);
    setError('');
    setLoadingMessage('Generating full article...');

    try {
      const response = await apiClient.post('/generate-full-article', {
        title: selectedTitle,
        outline: outline,
        articleType: selectedType.id,
        site: impersonatedSite?.site || currentSite,
        email: impersonatedSite ? undefined : user?.email,
        locationId: selectedLocationId || undefined,
        useInternalLinks: useInternalLinks,
        useExternalLinks: useExternalLinks,
        useYouTubeVideos: useYouTubeVideos,
        useOwnYouTubeChannel: useOwnYouTubeChannel,
        youtubeChannelUrl: useOwnYouTubeChannel ? youtubeChannelUrl : null,
        uploadedBlogUrl: urlList[0] || undefined,
        uploadedBlogUrls: urlList,
        isRemix: selectedType.id === 'remix',
        prompt: articlePrompt,
        screenshotUrls: productScreenshots.map(s => s.s3Url).filter(Boolean)
      }, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (response.data.success) {
        const generatedArticle = response.data.article;

        // Save the article to state
        setArticle(generatedArticle);

        // Set a generated article ID for reference
        setCurrentArticleId(`temp-${Date.now()}`);

        // Auto-generate featured image in background (don't block moving to step 4)
        generateImage(selectedTitle, 'professional, modern').catch(err => {
          console.error('Background featured image generation failed:', err);
        });

        setStep(4);
      } else {
        setError(response.data.message || 'Failed to generate article');
      }
    } catch (error) {
      console.error('Error generating article:', error);
      setError(error.response?.data?.message || 'An error occurred while generating article');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate featured image using article builder endpoint
  const generateImage = async (title, style = "modern, professional", description = null) => {
    setIsGeneratingImage(true);

    try {
      const response = await apiClient.post('/generate-featured-image', {
        title: title || selectedTitle,
        site: impersonatedSite?.site || currentSite,
        product: impersonatedSite?.product || currentSite,
        style: style,
        description: description
      }, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (response.data.success) {
        setFeaturedImage(response.data.imageUrl);
        toast.success('Featured image generated!');
      } else {
        console.warn('Image generation failed:', response.data.message);
        toast.error(response.data.message || 'Failed to generate image');
      }
    } catch (err) {
      console.error('Error generating image:', err);
      toast.error(err.response?.data?.message || 'Error generating image');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Update handleGenerateImage to include style options
  const handleGenerateImage = async () => {
    if (!article) return;

    const style = customImageStyle.trim() || "modern, professional";
    const description = customImageDescription.trim() || null;
    generateImage(article.title, style, description);
  };

  const addKeyword = () => {
    if (!keywordInput.trim()) return;

    // Don't add duplicate keywords
    if (keywords.includes(keywordInput.trim())) {
      setError('This keyword already exists');
      return;
    }

    // Add keyword
    setKeywords([...keywords, keywordInput.trim()]);
    setKeywordInput('');
  };

  const removeKeyword = (keyword) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Maximum 3 screenshots
    if (productScreenshots.length + files.length > 3) {
      setError('You can upload a maximum of 3 screenshots');
      return;
    }

    // Process each file
    const newScreenshots = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Only accept images
      if (!file.type.startsWith('image/')) {
        setError('Please upload only image files');
        continue;
      }

      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);

      // Add to screenshots array
      newScreenshots.push({
        file,
        previewUrl,
        name: file.name,
        analyzed: false
      });
    }

    setProductScreenshots([...productScreenshots, ...newScreenshots]);
  };

  const removeScreenshot = (index) => {
    const newScreenshots = [...productScreenshots];

    // Release the URL object to free memory
    URL.revokeObjectURL(newScreenshots[index].previewUrl);

    // Remove the screenshot
    newScreenshots.splice(index, 1);
    setProductScreenshots(newScreenshots);
  };

  const analyzeScreenshots = async () => {
    if (productScreenshots.length === 0) {
      setError('Please upload at least one screenshot to analyze');
      return;
    }

    setIsAnalyzingScreenshots(true);
    setError('');

    try {
      // This would be a real API call in the actual implementation
      // For each screenshot, upload to S3 and then analyze with AI
      const uploadPromises = productScreenshots.map(async (screenshot, index) => {
        if (screenshot.s3Url) {
          // Skip upload if already uploaded
          return screenshot;
        }

        // Convert the file to base64
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(screenshot.file);
          reader.onload = async () => {
            try {
              // Upload file to S3 via API using base64 data
              const uploadResponse = await apiClient.post('/upload-file', {
                fileData: reader.result,
                fileName: screenshot.name,
                type: 'screenshot',
                site: impersonatedSite?.site || currentSite
              });

              if (!uploadResponse.data.success) {
                throw new Error(`Failed to upload ${screenshot.name}`);
              }

              resolve({
                ...screenshot,
                s3Url: uploadResponse.data.url,
                analyzed: true
              });
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = (error) => reject(error);
        });
      });

      // Wait for all uploads to complete
      const updatedScreenshots = await Promise.all(uploadPromises);
      setProductScreenshots(updatedScreenshots);

      // Now analyze all screenshots together
      const analyzeResponse = await apiClient.post('/analyze-screenshots', {
        screenshotUrls: updatedScreenshots.map(s => s.s3Url),
        articlePrompt: articlePrompt,
        articleType: selectedType?.id,
        site: impersonatedSite?.site || currentSite,
        email: impersonatedSite ? undefined : user?.email
      });

      if (analyzeResponse.data.success) {
        setScreenshotAnalysis(analyzeResponse.data.analysis);
        // Update article prompt with AI suggestions if available.
        // Guard against re-appending on repeat analysis (e.g. after adding a new
        // screenshot) so we don't accumulate duplicate "Product Analysis:" blocks.
        const suggestedPrompt = analyzeResponse.data.analysis.suggestedPrompt;
        if (suggestedPrompt) {
          setArticlePrompt(prev =>
            prev.includes(suggestedPrompt)
              ? prev
              : prev + '\n\nProduct Analysis: ' + suggestedPrompt
          );
        }
      } else {
        setError('Failed to analyze screenshots');
      }
    } catch (error) {
      console.error('Error analyzing screenshots:', error);
      setError(error.response?.data?.message || 'An error occurred while analyzing screenshots');
    } finally {
      setIsAnalyzingScreenshots(false);
    }
  };

  // Save article to dashboard
  const handleSaveArticle = async () => {
    if (!article) return;

    setIsLoading(true);
    setError('');
    setLoadingMessage('Saving article...');

    try {
      // Explicitly ensure we have the title before sending
      if (!selectedTitle) {
        setError('Cannot save article: no title selected');
        setIsLoading(false);
        return;
      }

      // Prepare the article data
      const articleData = {
        title: selectedTitle, // Using selectedTitle directly
        blogTitle: selectedTitle, // Also include as blogTitle for compatibility
        content: article.sections.map(section => section.content).join('\n'),
        metaDescription: article.metaDescription || '',
        site: impersonatedSite?.site || currentSite,
        email: impersonatedSite ? undefined : user?.email,
        locationId: selectedLocationId || undefined,
        keywords: keywords,
        featuredImage: featuredImage || null,
        createdWith: 'article-builder' // Track that this was created with article builder
      };

      // Send to the backend
      const response = await apiClient.post('/save-article', articleData, {
        headers: {
          'Authorization': `Bearer ${userToken || authToken}`
        }
      });

      if (response.data.success) {
        // Save the article ID for later use
        const savedArticleId = response.data.article?.id || response.data.blog?.id || response.data.blog?._id;
        
        if (savedArticleId) {
          setCurrentArticleId(savedArticleId);

          // Update the article with the real ID
          setArticle(prevArticle => ({
            ...prevArticle,
            id: savedArticleId
          }));

          // Mark the draft as published if we have a draft ID
          if (currentDraftId) {
            try {
              await apiClient.patch(`/api/article-builder/drafts/${currentDraftId}/publish`, {
                email: impersonatedSite ? impersonatedSite.email : user?.email,
                site: impersonatedSite?.site || currentSite,
                publishedArticleId: savedArticleId
              }, {
                headers: {
                  'Authorization': `Bearer ${userToken}`
                }
              });
            } catch (draftError) {
              console.error('Error marking draft as published:', draftError);
              // Don't fail the whole save if draft update fails
            }
          }

          toast.success('Article saved successfully!');
        }

        // Wait a moment before navigating to ensure data is fully persisted
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        setError(response.data.message || 'Failed to save article');
      }
    } catch (error) {
      console.error('Error saving article:', error);
      setError(error.response?.data?.message || 'An error occurred while saving article');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePointEdit = (sectionIndex, pointIndex, newValue) => {
    if (!outline) return;

    // Immutable nested update so we don't mutate the existing state objects.
    setOutline(prev => ({
      ...prev,
      sections: prev.sections.map((section, sIdx) =>
        sIdx === sectionIndex
          ? {
              ...section,
              points: section.points.map((point, pIdx) =>
                pIdx === pointIndex ? newValue : point
              )
            }
          : section
      )
    }));
  };


  // Add auto-regeneration function for sections with errors
  const autoRegenerateSection = async (sectionId) => {
    // Check if we've reached the max attempts for this section
    if (regenerationAttempts[sectionId] >= MAX_REGENERATION_ATTEMPTS) {
      return false;
    }

    // Increment attempt counter
    setRegenerationAttempts(prev => ({
      ...prev,
      [sectionId]: (prev[sectionId] || 0) + 1
    }));

    setIsLoading(true);
    setError('');
    setLoadingMessage(`Auto-regenerating section (Attempt ${(regenerationAttempts[sectionId] || 0) + 1}/${MAX_REGENERATION_ATTEMPTS})...`);

    try {
      // Find the section that needs regeneration
      const sectionToRegenerate = article.sections.find(s => s.id === sectionId);

      if (!sectionToRegenerate) {
        console.error('Section not found for auto-regeneration');
        return false;
      }

      // This would be a real API call in the actual implementation
      const response = await apiClient.post('/regenerate-article-section', {
        title: selectedTitle,
        articleType: selectedType.id,
        section: sectionToRegenerate,
        prompt: "Fix this section and make it more detailed. Avoid errors and ensure content is complete and accurate.",
        site: impersonatedSite?.site || currentSite,
        email: impersonatedSite ? undefined : user?.email,
        locationId: selectedLocationId || undefined,
        isRemix: selectedType.id === 'remix',
        uploadedBlogUrl: urlList[0] || undefined,
        uploadedBlogUrls: urlList,
        originalPrompt: articlePrompt
      });

      if (response.data.success) {
        // Update the article with the regenerated section using a functional
        // updater so concurrent edits to OTHER sections (made during the await)
        // are not discarded by a stale `article` closure.
        setArticle(prev => ({
          ...prev,
          sections: prev.sections.map(section =>
            section.id === sectionId ? response.data.section : section
          )
        }));

        return true;
      } else {
        console.error('Failed to auto-regenerate section:', response.data.message);
        return false;
      }
    } catch (err) {
      console.error('Error auto-regenerating section:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to regenerate a section
  const handleRegenerateSection = async (sectionId) => {
    if (isGeneratingSection) {
      toast.warning('Already generating a section. Please wait.');
      return;
    }

    // Show the regeneration modal
    setCurrentSectionEditing(article.sections.find(s => s.id === sectionId));
    setSectionEditPrompt('');
    setRegenerationError('');
    setShowRegenerateModal(true);
  };

  // Add a new function to execute the regeneration
  const executeRegenerateSection = async () => {
    if (!currentSectionEditing || !sectionEditPrompt.trim()) {
      setRegenerationError('Please provide instructions for how to regenerate this section.');
      return;
    }

    const articleId = article?.id || currentArticleId;
    if (!articleId) {
      toast.error('No article ID found. Please save the article first.');
      setShowRegenerateModal(false);
      return;
    }

    // Close the modal and start generation
    setShowRegenerateModal(false);
    setSectionRegenerating(currentSectionEditing.id);
    setIsGeneratingSection(true);

    try {
      // Find the original section to pass its content as reference
      const originalSection = currentSectionEditing;
      if (!originalSection) {
        throw new Error('Original section not found');
      }

      const response = await apiClient.post('/regenerate-article-section', {
        title: selectedTitle,
        articleType: selectedType.id,
        section: originalSection,
        prompt: sectionEditPrompt, // Pass the user's regeneration instructions
        site: impersonatedSite?.site || currentSite,
        email: impersonatedSite ? undefined : user?.email,
        locationId: selectedLocationId || undefined,
        isRemix: selectedType.id === 'remix',
        uploadedBlogUrl: urlList[0] || undefined,
        uploadedBlogUrls: urlList,
        originalPrompt: articlePrompt,
        useInternalLinks,
        useExternalLinks,
        useYouTubeVideos,
        useOwnYouTubeChannel,
        youtubeChannelUrl: useOwnYouTubeChannel ? youtubeChannelUrl : null
      });

      if (response.data.success) {
        // Functional updater so concurrent edits to other sections made during
        // the await aren't clobbered by a stale `article` closure.
        setArticle(prev => ({
          ...prev,
          sections: prev.sections.map(section =>
            section.id === originalSection.id ? response.data.section : section
          )
        }));

        toast.success('Section regenerated successfully!');
      } else {
        toast.error(response.data.message || 'Failed to regenerate section');
      }
    } catch (error) {
      console.error('Error regenerating section:', error);
      if (error.response?.data?.message?.includes('save the article first')) {
        toast.error('Please save the article before regenerating sections.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to regenerate section. Please try again.');
      }
    } finally {
      setIsGeneratingSection(false);
      setSectionRegenerating(null);
      setCurrentSectionEditing(null);
    }
  };

  // Update the Featured Image section UI to include style options
  const renderFeaturedImageSection = () => {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium">Featured Image</h3>
          <div className="flex gap-2">
            {/* Upload Custom Image */}
            <label className={`flex items-center text-sm py-1 px-3 rounded cursor-pointer ${isUploadingImage ? 'bg-gray-200 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {isUploadingImage ? (
                <>
                  <Loader size={14} className="animate-spin mr-1" /> Uploading...
                </>
              ) : (
                <>
                  <Upload size={14} className="mr-1" /> Upload
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploadingImage}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  setIsUploadingImage(true);
                  try {
                    const formData = new FormData();
                    formData.append('image', file);

                    const response = await apiClient.post('/upload-image', formData, {
                      headers: { 'Content-Type': 'multipart/form-data' }
                    });

                    if (response.data?.url) {
                      // Add cache buster to force image refresh
                      const imageUrl = response.data.url + '?t=' + Date.now();
                      setFeaturedImage(imageUrl);
                      toast.success('Image uploaded successfully!');
                    } else {
                      toast.error('Upload failed - no URL returned');
                    }
                  } catch (error) {
                    console.error('Failed to upload image:', error);
                    toast.error('Failed to upload image. Please try again.');
                  } finally {
                    setIsUploadingImage(false);
                  }

                  // Reset input so same file can be selected again
                  e.target.value = '';
                }}
              />
            </label>
            {/* Generate/Regenerate button - opens options panel */}
            <button
              onClick={() => setShowImageStyleOptions(!showImageStyleOptions)}
              disabled={isGeneratingImage}
              className={`flex items-center text-sm py-1 px-3 rounded ${isGeneratingImage ? 'bg-gray-200 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary-hover'}`}
            >
              {isGeneratingImage ? (
                <>
                  <Loader size={14} className="animate-spin mr-1" /> Generating...
                </>
              ) : (
                <>
                  <Image size={14} className="mr-1" /> {featuredImage ? 'Regenerate' : 'Generate'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Custom Image Options - shown when Generate/Regenerate is clicked */}
        {showImageStyleOptions && !isGeneratingImage && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image Description <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={customImageDescription}
                  onChange={(e) => setCustomImageDescription(e.target.value)}
                  placeholder="Describe what you want in the image..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Style <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={customImageStyle}
                  onChange={(e) => setCustomImageStyle(e.target.value)}
                  placeholder="e.g., modern, minimalist, photo-realistic..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <button
                onClick={() => {
                  if (!customImageDescription.trim() || !customImageStyle.trim()) {
                    toast.error('Please fill in both description and style');
                    return;
                  }
                  handleGenerateImage();
                  setShowImageStyleOptions(false);
                }}
                className="w-full py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary-hover text-sm font-medium"
              >
                Generate Image
              </button>
            </div>
          </div>
        )}

        {isGeneratingImage ? (
          <div className="flex items-center justify-center w-full h-40 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-center">
              <Loader size={32} className="mx-auto text-primary mb-3 animate-spin" />
              <p className="text-gray-600 text-sm font-medium">Generating featured image...</p>
              <p className="text-gray-500 text-xs mt-1">This may take 1-2 minutes</p>
            </div>
          </div>
        ) : featuredImage ? (
          <div className="relative w-full rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
            <img
              src={featuredImage}
              alt={article?.title || 'Featured image'}
              className="max-h-[50vh] w-auto max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center w-full h-40 bg-gray-100 rounded-lg border border-dashed border-gray-300">
            <div className="text-center">
              <Image size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500 text-sm">No featured image generated yet</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render product screenshots section
  const renderProductScreenshotsSection = () => {
    return (
      <div className="mb-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Product Screenshots</h3>
          <p className="text-sm text-gray-600">
            Upload up to 3 screenshots of your product to help AI understand and reference it in the article
          </p>
        </div>

        <div className="p-5">
          <div className="mb-4">
            <label className="block mb-2">
              <span className="sr-only">Choose screenshots</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-medium
                  file:bg-gray-100 file:text-gray-700
                  hover:file:bg-gray-200"
              />
            </label>
          </div>

          {productScreenshots.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {productScreenshots.map((screenshot, index) => (
                <div key={index} className="relative border border-gray-200 rounded-lg overflow-hidden">
                  <img
                    src={screenshot.previewUrl}
                    alt={`Screenshot ${index + 1}`}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => removeScreenshot(index)}
                      className="bg-red-500 text-white p-1 rounded-full"
                      aria-label="Remove screenshot"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                  {screenshot.analyzed && (
                    <div className="absolute bottom-2 left-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      Analyzed
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {productScreenshots.length > 0 && (
            <button
              onClick={analyzeScreenshots}
              disabled={isAnalyzingScreenshots || productScreenshots.every(s => s.analyzed)}
              className={`w-full py-2 rounded-lg ${isAnalyzingScreenshots
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-primary text-white hover:bg-primary-hover"
                }`}
            >
              {isAnalyzingScreenshots
                ? "Analyzing Screenshots..."
                : productScreenshots.every(s => s.analyzed)
                  ? "Screenshots Analyzed"
                  : "Analyze Screenshots"}
            </button>
          )}

          {screenshotAnalysis && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2 text-left">AI Analysis</h4>
              <p className="text-sm text-gray-700 text-left">{screenshotAnalysis.summary}</p>
              {screenshotAnalysis.keyFeatures && (
                <div className="mt-2">
                  <h5 className="font-medium text-gray-800 text-sm text-left">Key Features Identified:</h5>
                  <ul className="list-disc pl-5 mt-1 text-sm text-gray-700 text-left">
                    {screenshotAnalysis.keyFeatures.map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Add a keywords section 
  const renderKeywordsSection = () => {
    return (
      <div className="mb-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">SEO Keywords</h3>
          <p className="text-sm text-gray-600">
            Add keywords to optimize your article for search engines
          </p>
        </div>

        <div className="p-5">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addKeyword();
                }
              }}
              placeholder="Enter a keyword"
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
            />
            <button
              onClick={addKeyword}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
            >
              Add
            </button>
          </div>

          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <div
                  key={index}
                  className="flex items-center bg-gray-100 border border-gray-200 text-gray-700 text-sm px-3 py-1 rounded-full"
                >
                  <span>{keyword}</span>
                  <button
                    onClick={() => removeKeyword(keyword)}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-4">
            Only the keywords you add here will be used. If you don't add any keywords, we'll extract them automatically from your content.
          </p>
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Create New Article</h2>
              <p className="text-sm text-gray-600">
                Describe the article you want to create, select an article type, and provide any reference material
              </p>
            </div>

            <div className="p-5">
              <div className="space-y-6">
                {/* Article Type Selection */}
                <div className="mt-8">
                  <h3 className="text-base font-medium text-gray-700 mb-4 text-left">Article Type</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {ArticleTypes.map((type) => (
                      <div
                        key={type.id}
                        onClick={() => handleArticleTypeSelect(type)}
                        className={`flex flex-col items-center p-5 border rounded-xl cursor-pointer transition-all ${selectedType?.id === type.id
                          ? "border-primary bg-gray-50/50"
                          : type.comingSoon
                            ? "border-gray-200 bg-gray-50 relative overflow-hidden"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/20"
                          }`}
                      >
                        <div className="flex items-center justify-center w-10 h-10 mb-3">
                          {type.icon}
                        </div>
                        <span className="font-medium text-gray-800">{type.name}</span>
                        <p className="text-xs text-gray-500 mt-2 text-center">{type.description}</p>

                        {type.comingSoon && (
                          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                            <div className="bg-primary text-white text-xs font-semibold py-1 px-2 rounded-full transform -rotate-12">
                              Coming Soon
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add SEO keywords section early in the flow */}
                {renderKeywordsSection()}

                {/* Add product screenshots section early in the flow */}
                {renderProductScreenshotsSection()}

                {/* Add LinkOptions component after Article Type selection */}
                <LinkOptions
                  useInternalLinks={useInternalLinks}
                  setUseInternalLinks={setUseInternalLinks}
                  useExternalLinks={useExternalLinks}
                  setUseExternalLinks={setUseExternalLinks}
                  useYouTubeVideos={useYouTubeVideos}
                  setUseYouTubeVideos={setUseYouTubeVideos}
                  useOwnYouTubeChannel={useOwnYouTubeChannel}
                  setUseOwnYouTubeChannel={setUseOwnYouTubeChannel}
                  youtubeChannelUrl={youtubeChannelUrl}
                  setYoutubeChannelUrl={setYoutubeChannelUrl}
                  isLoadingChannel={isLoadingChannel}
                  youtubeChannelInfo={youtubeChannelInfo}
                  isValidYouTubeChannel={isValidYouTubeChannel}
                />

                {/* URL input section */}
                {selectedType && (selectedType.requiresUrl || selectedType.maxUrls > 0) && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-1 text-left">
                      {selectedType.requiresUrl ? 'URL to Remix (Required)' : 'Reference URLs (Optional)'}
                    </h4>
                    <p className="text-sm text-gray-500 mb-3 text-left">
                      {selectedType.id === 'remix'
                        ? 'Enter the URL of the article you want to remix with a fresh perspective'
                        : `Add up to ${selectedType.maxUrls} URLs to reference for creating your content`}
                    </p>

                    <div className="relative mb-2">
                      <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addUrl();
                          }
                        }}
                        className="w-full h-12 px-4 py-3 border border-gray-300 rounded-xl focus:ring-gray-500 focus:border-gray-500 text-gray-800"
                        placeholder="https://example.com/blog/post"
                      />
                      <button
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-lg text-sm hover:bg-primary-hover"
                        onClick={addUrl}
                      >
                        Add
                      </button>
                    </div>

                    {/* URL bubbles */}
                    {urlList.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {urlList.map((url, index) => (
                          <div
                            key={index}
                            className="flex items-center bg-gray-100 border border-gray-200 text-gray-700 text-sm px-3 py-1 rounded-full"
                          >
                            <span className="truncate max-w-[200px]">{url}</span>
                            <button
                              onClick={() => removeUrl(index)}
                              className="ml-2 text-gray-500 hover:text-gray-700"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* URL limit indicator */}
                    <p className="text-xs text-gray-500 mt-2">
                      {urlList.length} of {selectedType.maxUrls} URLs added
                    </p>
                  </div>
                )}

                {/* Article Prompt */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-1 text-left">Describe Your Article</h4>
                  <p className="text-sm text-gray-500 mb-3 text-left">What would you like to write about?</p>
                  <textarea
                    value={articlePrompt}
                    onChange={(e) => setArticlePrompt(e.target.value)}
                    className="w-full h-32 px-4 py-3 border border-gray-300 rounded-xl focus:ring-gray-500 focus:border-gray-500 text-gray-800"
                    placeholder="Detailed description of what you want in your article..."
                  />
                </div>

                {/* Store picker. Only meaningful for a multi-location business,
                    so single-location sites never see it. */}
                {businessLocations.length > 1 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1 text-left">Which location?</h4>
                    <p className="text-sm text-gray-500 mb-3 text-left">
                      Aim this article at one store, or leave it covering all of them.
                    </p>
                    <select
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-gray-500 focus:border-gray-500 text-gray-800"
                    >
                      <option value="">All locations</option>
                      {businessLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.label || location.city || 'Location'}
                          {location.city && location.label !== location.city ? ` — ${location.city}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="p-8"
          >
            <div className="flex items-center mb-6">
              <div className="bg-gray-200 text-gray-700 p-2 rounded-lg mr-4">
                <FileText className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 text-left">Select a Title</h2>
            </div>

            {/* Add Custom Title Option */}
            <div className="mb-6 p-5 border border-gray-200 rounded-xl bg-gray-100">
              <h3 className="font-medium text-gray-900 mb-2 text-left">Create Your Own Title</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={selectedTitle || ""}
                  onChange={(e) => setSelectedTitle(e.target.value)}
                  placeholder="Type your awesome title here..."
                  className="flex-1 p-3 border border-gray-300 rounded-lg text-gray-800"
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">Feel free to write your own or select one of our suggestions below. Your title will update automatically!</p>
            </div>

            <div className="space-y-4 mb-8">
              {generatedTitles.map((titleObj, index) => {
                const title = typeof titleObj === 'string' ? titleObj : titleObj.refined;
                const hasNote = titleObj.note && titleObj.original;

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    onClick={() => {
                      setSelectedTitle(titleObj.refined || title);
                    }}
                    className={`p-5 border rounded-xl cursor-pointer transition-all hover:border-gray-300 ${selectedTitle === title
                      ? "border-primary bg-gray-50 shadow-sm"
                      : "border-gray-200"
                      }`}
                  >
                    <div className="flex items-start">
                      <div className="mr-4 mt-0.5">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedTitle === title
                            ? "border-primary bg-primary text-white"
                            : "border-gray-300"
                            }`}
                        >
                          {selectedTitle === title && <CheckCircle className="w-3 h-3" />}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{title}</p>

                        {hasNote && (
                          <div className="mt-2 p-3 bg-gray-100 rounded-md border border-gray-200 text-sm">
                            <div className="flex items-start">
                              <div className="flex-shrink-0 mr-2">
                                <RefreshCw size={14} className="text-primary mt-0.5" />
                              </div>
                              <div>
                                <p className="text-gray-500 mb-1 text-xs">Improvement:</p>
                                <div className="text-sm text-gray-600 font-medium mb-2">{titleObj.note}</div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <div className="text-xs text-gray-500">
                                    <span className="font-medium">Original:</span> {titleObj.original}
                                  </div>
                                  <div className="text-xs text-primary">
                                    <span className="font-medium">Refined:</span> {titleObj.refined}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div className="pt-4 flex justify-between">
              <div>
                {/* Back button removed to prevent duplication with footer button */}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSubmitPrompt}
                  className="px-6 py-2.5 border border-primary text-primary rounded-lg hover:bg-gray-50 flex items-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate More Titles
                </button>
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="p-8"
          >
            <div className="flex items-center mb-6">
              <div className="bg-gradient-to-tr from-chart-4 via-accent to-accent-dark p-2 rounded-lg mr-4">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 text-left">Review Outline</h2>
            </div>

            <div className="bg-gray-100 p-5 rounded-xl mb-6 border border-gray-200">
              <h3 className="font-bold text-lg text-gray-900 text-left">{selectedTitle}</h3>
              <p className="mt-3 text-gray-600 text-sm text-left">This outline will be the blueprint for your article. Feel free to edit any section title or bullet point by clicking on it. These changes will shape how your final article is structured.</p>
            </div>

            <div className="space-y-5 mb-8">
              {outline?.sections.map((section, sectionIndex) => (
                <motion.div
                  key={sectionIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: sectionIndex * 0.1 }}
                  className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
                >
                  <h4 className="font-semibold text-lg text-gray-900 mb-3 flex items-center">
                    <span className="bg-gray-200 text-gray-700 w-6 h-6 rounded-full flex items-center justify-center text-sm mr-2">
                      {sectionIndex + 1}
                    </span>
                    <div
                      contentEditable={true}
                      suppressContentEditableWarning={true}
                      onBlur={(e) => {
                        const updatedOutline = { ...outline };
                        updatedOutline.sections[sectionIndex].title = e.target.innerText.replace(/:/g, ' - ');
                        setOutline(updatedOutline);
                      }}
                      className="outline-none focus:border-b border-gray-300 hover:border-b hover:border-gray-300 focus:px-1 px-1 text-left"
                    >
                      {section.title}
                    </div>
                  </h4>
                  <ul className="space-y-2 pl-8">
                    {section.points.map((point, pointIndex) => (
                      <li key={pointIndex} className="text-gray-700 list-disc">
                        <div
                          contentEditable={true}
                          suppressContentEditableWarning={true}
                          onBlur={(e) => handlePointEdit(sectionIndex, pointIndex, e.target.innerText)}
                          className="outline-none focus:border-b border-gray-300 hover:border-b hover:border-gray-300 focus:px-1 px-1 text-left"
                        >
                          {point}
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Display section links and videos */}
                  <div className="mt-4 space-y-2">
                    {/* Internal link suggestions */}
                    {section.internalLinkSuggestions && section.internalLinkSuggestions.length > 0 && (
                      <div className="bg-gray-100 p-3 rounded-lg text-sm border border-gray-200">
                        <h5 className="text-gray-700 font-medium mb-2 flex items-center">
                          <Link className="h-4 w-4 mr-1" />
                          Internal Links
                        </h5>
                        <ul className="space-y-2">
                          {section.internalLinkSuggestions.map((link, idx) => {
                            // Handle both string suggestions and actual link objects
                            const isLinkObject = typeof link === 'object' && link.url && link.title;
                            const title = isLinkObject ? link.title : (typeof link === 'string' ? link : '');
                            const url = isLinkObject ? link.url : '';

                            return (
                              <li key={idx} className="flex items-start">
                                <div className="min-w-[6px] h-2 w-2 rounded-full bg-primary mt-1.5 mr-2"></div>
                                <div className="text-left">
                                  <p className="text-gray-800 font-medium">{title}</p>
                                  {url && (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary text-xs hover:underline break-all"
                                    >
                                      {url}
                                    </a>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {/* External link suggestions */}
                    {section.externalLinkSuggestions && section.externalLinkSuggestions.length > 0 && (
                      <div className="bg-green-50 p-3 rounded-lg text-sm border border-green-100">
                        <h5 className="text-green-700 font-medium mb-2 flex items-center">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          External Links
                        </h5>
                        <ul className="space-y-2">
                          {section.externalLinkSuggestions.map((link, idx) => {
                            // Handle both string suggestions and actual link objects
                            const isLinkObject = typeof link === 'object' && link.link;
                            // Support both link.link (from Google Search API) and link.url formats
                            const url = isLinkObject ? (link.link || link.url) : '';
                            const title = isLinkObject ? link.title : (typeof link === 'string' ? link : '');
                            const snippet = isLinkObject && link.summary ? link.summary :
                              (isLinkObject && link.snippet ? link.snippet : '');

                            return (
                              <li key={idx} className="flex items-start">
                                <div className="min-w-[6px] h-2 w-2 rounded-full bg-green-500 mt-1.5 mr-2"></div>
                                <div className="text-left">
                                  <p className="text-green-800 font-medium">{title}</p>
                                  {url && (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-green-600 text-xs hover:underline break-all"
                                    >
                                      {url}
                                    </a>
                                  )}
                                  {snippet && (
                                    <p className="text-gray-600 text-xs mt-1">{snippet}</p>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {/* YouTube video suggestion */}
                    {section.youtubeVideoId && (
                      <div className="bg-red-50 p-3 rounded-lg text-sm border border-red-100">
                        <h5 className="text-red-700 font-medium mb-2 flex items-center">
                          <Youtube className="h-4 w-4 mr-1" />
                          YouTube Video
                        </h5>

                        {/* YouTube embed */}
                        <div className="mt-2 mb-2">
                          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '0.5rem' }}>
                            <iframe
                              src={`https://www.youtube.com/embed/${section.youtubeVideoId}`}
                              title="YouTube video player"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                            ></iframe>
                          </div>
                        </div>

                        {/* Video information if available */}
                        {youtubeChannelInfo?.videos && (
                          <div>
                            {youtubeChannelInfo.videos
                              .filter(video => video.videoId === section.youtubeVideoId)
                              .map(video => (
                                <a
                                  key={video.videoId}
                                  href={`https://www.youtube.com/watch?v=${video.videoId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-start mt-2 hover:bg-red-100 p-2 rounded transition-colors"
                                >
                                  <div className="flex-1 text-left">
                                    <p className="font-medium text-red-800 line-clamp-2">{video.title}</p>
                                    <p className="text-xs text-red-600 mt-1">ID: {video.videoId}</p>
                                  </div>
                                </a>
                              ))
                            }
                          </div>
                        )}

                        {(!youtubeChannelInfo?.videos || !youtubeChannelInfo.videos.find(v => v.videoId === section.youtubeVideoId)) && (
                          <div className="mt-2">
                            <a
                              href={`https://www.youtube.com/watch?v=${section.youtubeVideoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-red-700 hover:underline flex items-center"
                            >
                              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mr-2">
                                <Youtube className="h-3 w-3 text-red-700" />
                              </div>
                              Watch on YouTube
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="pt-6 border-t border-gray-100 space-y-4">
              <div>
                <label className="font-medium text-gray-900">
                  Not happy with current outline? Re prompt below
                </label>
                <textarea
                  value={regeneratePrompt}
                  onChange={(e) => setRegeneratePrompt(e.target.value)}
                  placeholder="Tell us what you'd like to change about the outline..."
                  className="mt-2 min-h-[120px] text-base resize-none w-full p-3 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
                />
              </div>

              <button
                onClick={handleRegenerateOutline}
                disabled={!regeneratePrompt}
                className={`w-full py-5 text-base border-dashed rounded-xl flex items-center justify-center ${regeneratePrompt
                  ? "border-primary hover:bg-gray-50 text-primary border"
                  : "border-gray-300 text-gray-400 cursor-not-allowed border"
                  }`}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate Outline
              </button>
            </div>

            {/* Navigation Buttons */}
            <div className="pt-8 flex justify-between">
              <div>
                {/* Back button removed to prevent duplication with footer button */}
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <div>
            {/* Generated article preview */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
              <div className="p-5 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 mb-1">Article Preview</h2>
                <p className="text-sm text-gray-600">
                  Review your generated article
                </p>
              </div>

              <div className="p-5">
                {article && (
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-5 text-center">{selectedTitle}</h1>

                    {/* Featured Image Section */}
                    {renderFeaturedImageSection()}

                    {/* Article Content */}
                    {Array.from(new Set(article.sections.map(s => s.id))).map(sectionId => {
                      // Get the section based on ID
                      const section = article.sections.find(s => s.id === sectionId);

                      // Check for duplicate content (debugging)
                      const contentMatches = article.sections.filter(s =>
                        s.content === section.content && s.id !== section.id
                      ).length;

                      if (contentMatches > 0) {
                        console.warn(`Found duplicate content for section ${section.id}: ${contentMatches} other sections have the same content`);
                      }

                      // Clean content of any colons in headings
                      let cleanContent = section.content;
                      const hasError = section.content.includes("Error generating content") ||
                        section.content.includes("Please try regenerating") ||
                        section.content === "";

                      // Auto-regenerate if there's an error
                      if (hasError && !regenerationAttempts[section.id]) {
                        autoRegenerateSection(section.id);
                      }

                      return (
                        <div key={section.id} className="mb-8">
                          <h2 className="text-2xl font-semibold text-gray-900 mb-4 text-center">{section.title}</h2>
                          {/* Display assigned image if it exists */}
                          {section.assignedImage && section.assignedImage.s3Url && (
                            <div className="mb-4 overflow-hidden rounded-lg border border-gray-200">
                              <img
                                src={section.assignedImage.s3Url}
                                alt={section.title}
                                className="w-full object-cover max-h-96"
                              />
                              <div className="p-2 bg-gray-100 text-xs text-gray-700">
                                {section.imageDescription || section.assignedImage.name.replace(/\.[^/.]+$/, '')}
                              </div>
                            </div>
                          )}
                          {/* Show rich text editor when editing, otherwise show content */}
                          {editingSectionId === section.id ? (
                            <div className="space-y-3">
                              <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <RichTextEditor
                                  rawBody={editedSectionContent}
                                  handleChange={(content) => setEditedSectionContent(content)}
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    // Save edited content
                                    const updatedSections = article.sections.map(s =>
                                      s.id === section.id ? { ...s, content: editedSectionContent } : s
                                    );
                                    setArticle({ ...article, sections: updatedSections });
                                    setEditingSectionId(null);
                                    setEditedSectionContent('');
                                    toast.success('Section updated!');
                                  }}
                                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover"
                                >
                                  Save Changes
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingSectionId(null);
                                    setEditedSectionContent('');
                                  }}
                                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="prose max-w-none text-gray-800 prose-p:text-left prose-ul:text-left prose-ol:text-left prose-h1:text-center prose-h2:text-center prose-h3:text-left prose-img:mx-auto [&_.video-container]:mx-auto [&_.video-container]:flex [&_.video-container]:justify-center"
                              dangerouslySetInnerHTML={{ __html: cleanContent }}
                            />
                          )}

                          {hasError && (
                            <div className="mt-4 p-5 bg-red-50 text-red-700 rounded-xl text-sm">
                              <p className="font-medium mb-2">Error generating content for this section</p>
                              <p>We've attempted to regenerate this section automatically.
                                {regenerationAttempts[section.id] >= MAX_REGENERATION_ATTEMPTS ?
                                  " Maximum regeneration attempts reached. Please try manual regeneration with different instructions." :
                                  " Retry regeneration will happen automatically."}
                              </p>
                            </div>
                          )}

                          {/* Only show buttons when not editing */}
                          {editingSectionId !== section.id && (
                            <div className="mt-4 flex space-x-3">
                              <button
                                onClick={() => {
                                  setEditingSectionId(section.id);
                                  setEditedSectionContent(section.content);
                                }}
                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors flex items-center"
                              >
                                <PenLine className="h-3 w-3 mr-1" /> Edit
                              </button>
                              <button
                                onClick={() => handleRegenerateSection(section.id)}
                                className="px-3 py-1 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors flex items-center"
                                disabled={isGeneratingSection && sectionRegenerating === section.id}
                              >
                                {isGeneratingSection && sectionRegenerating === section.id ? (
                                  <>
                                    <Loader className="h-3 w-3 mr-1 animate-spin" /> Regenerating...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Remove these sections since they've been moved to Step 1 */}
            {/* renderKeywordsSection() */}
            {/* renderProductScreenshotsSection() */}

          </div>
        );

      default:
        return null;
    }
  };

  // Add this modal component after the main return statement but before the final closing bracket
  const renderRegenerationModal = () => {
    if (!showRegenerateModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium">Regenerate Section: {currentSectionEditing?.title}</h3>
            <button
              onClick={() => setShowRegenerateModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="p-5">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                Regeneration Instructions
              </label>
              <textarea
                value={sectionEditPrompt}
                onChange={(e) => setSectionEditPrompt(e.target.value)}
                placeholder="Provide specific instructions for how to improve or change this section (e.g., 'Make it more technical' or 'Add more examples about X')"
                className="w-full min-h-[200px] p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
              {regenerationError && (
                <p className="mt-1 text-sm text-red-600">{regenerationError}</p>
              )}
            </div>

            <div className="p-4 bg-gray-100 rounded-lg mb-4 text-left">
              <h4 className="font-medium text-gray-800 mb-2">Tips for effective regeneration</h4>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Be specific about what needs to change</li>
                <li>Mention which aspects to keep or preserve</li>
                <li>Request additional examples or details on specific points</li>
                <li>Specify tone changes if needed (more casual, more professional, etc.)</li>
              </ul>
            </div>
          </div>

          <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={() => setShowRegenerateModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={executeRegenerateSection}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
            >
              Regenerate Section
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Show loading state during initialization to prevent flicker
  if (isInitializing) {
    return (
      <NavbarWrapper
        user={user}
        logout={logout}
        onShowBulkGenerate={() => setShowBulkGenerateModal(true)}
        onShowImageStyle={() => setShowImageStyleModal(true)}
        onShowSupport={() => setShowSupportModal(true)}
        onShowAdmin={() => setShowAdminPanel(true)}
        onShowSubscription={() => setShowSubscriptionModal(true)}
        currentSite={currentSiteProp}
        updateCurrentSite={updateCurrentSite}
      >
        <div className="flex flex-1 h-full items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </NavbarWrapper>
    );
  }

  return (
    <NavbarWrapper
      user={user}
      logout={logout}
      onShowBulkGenerate={() => setShowBulkGenerateModal(true)}
      onShowImageStyle={() => setShowImageStyleModal(true)}
      onShowSupport={() => setShowSupportModal(true)}
      onShowAdmin={() => setShowAdminPanel(true)}
      onShowSubscription={() => setShowSubscriptionModal(true)}
      currentSite={currentSiteProp}
      updateCurrentSite={updateCurrentSite}
    >
      <div className="flex flex-1 h-full relative">
        <main className="flex-1 p-6 overflow-auto bg-gray-50">
          <div className="max-w-5xl mx-auto">
            {/* Removed title, description, and progress steps to save space */}

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6 border border-red-100 text-left">
                {error}
              </div>
            )}

            <div className="rounded-xl overflow-hidden border border-gray-100 shadow-lg bg-white p-0">
              <AnimatePresence mode="wait">
                <div className="bg-white p-0">
                  {renderStepContent()}
                </div>
              </AnimatePresence>

              {/* Navigation Buttons - Footer */}
              <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-between">
                <div>
                  {step > 1 && (
                    <button
                      onClick={() => setStep(Math.max(1, step - 1))}
                      disabled={isLoading}
                      className="flex items-center justify-center px-6 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                        <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Back
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {isLoading && (
                    <div className="text-right">
                      <p className="text-sm text-gray-700">{loadingMessage || 'Working on it...'}</p>
                      {step === 3 && (
                        <p className="text-xs text-gray-500 mt-0.5">This usually takes 2 to 4 minutes. Keep this tab open.</p>
                      )}
                    </div>
                  )}
                <button
                  onClick={() => {
                    if (step === 1) {
                      handleSubmitPrompt();
                    } else if (step === 2 && selectedTitle) {
                      handleTitleSelect(selectedTitle);
                    } else if (step === 3) {
                      handleGenerateArticle();
                    } else if (step === 4) {
                      handleSaveArticle();
                    }
                  }}
                  disabled={
                    (step === 1 && (!articlePrompt || !selectedType || (selectedType?.requiresUrl && !urlList.length))) ||
                    (step === 2 && !selectedTitle) ||
                    isLoading
                  }
                  className={`flex items-center justify-center px-8 py-3 rounded-xl transition-colors ${((step === 1 && articlePrompt && selectedType && (!selectedType.requiresUrl || urlList.length)) ||
                    (step === 2 && selectedTitle) ||
                    step === 3 ||
                    step === 4) && !isLoading
                    ? 'bg-primary hover:bg-primary-hover text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      {step < 4 ? "Continue" : "Save Article"}
                      {step < 4 && (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-2">
                          <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  )}
                </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      {draftSaveFailed && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-amber-50 border border-amber-300 text-amber-900 text-sm font-medium px-4 py-2.5 rounded-full shadow-lg">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>Couldn't save your draft. We'll keep trying. Don't close this tab yet.</span>
        </div>
      )}
      <ToastContainer />
      {renderRegenerationModal()}
      <DraftsModal
        isOpen={showDraftsModal}
        onClose={() => setShowDraftsModal(false)}
        drafts={drafts}
        publishedArticles={publishedArticles}
        onSelectDraft={loadDraft}
        onDeleteDraft={deleteDraft}
        onNewArticle={startNewArticle}
        isLoading={isLoadingDrafts}
      />
    </NavbarWrapper>
  );
}

export default ArticleBuilder; 