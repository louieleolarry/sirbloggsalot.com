import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import { hasWordPressConnection } from '../utils/cmsUtils';

const TourContext = createContext();

export const useTour = () => useContext(TourContext);

const CURRENT_TOUR_VERSION = 1;
const STORAGE_KEY = 'blawgy_tour_state';

// Tour configurations will be imported from separate files
export const TOUR_TYPES = {
    MAIN: 'main',
    SETTINGS: 'settings',
    IMAGE_SETTINGS: 'imageSettings',
    WEBHOOKS: 'webhooks',
    CMS: 'cms',
    PAGES: 'pages',
    AI_MENTIONS: 'aiMentions',
    SEO_ANALYSIS: 'seoAnalysis'
};

// Pro+ detection — matches the same pattern used in feature-gated views
const isProPlusSubscription = (sub) => {
    if (!sub?.isActive) return false;
    const features = sub.features || [];
    if (features.includes('seo_analysis') || features.includes('ai_mentions')) return true;
    const name = sub.name || sub.plan || '';
    return /pro\+|pro plus|premium|business|enterprise/i.test(name);
};

export const TourProvider = ({ children, userId, tourConfigs, siteSettings, currentSubscription, isImpersonating = false }) => {
    const [activeTour, setActiveTour] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [progress, setProgress] = useState({});
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [tourVersion, setTourVersion] = useState(CURRENT_TOUR_VERSION);
    const [isInitialized, setIsInitialized] = useState(false);
    const stepStartTime = useRef(Date.now());

    const navigate = useNavigate();
    const location = useLocation();

    // Load progress from localStorage and sync with backend
    useEffect(() => {
        const loadProgress = async () => {
            // Load from localStorage first for fast initial state
            try {
                const local = localStorage.getItem(STORAGE_KEY);
                if (local) {
                    const parsed = JSON.parse(local);
                    setProgress(parsed.tours || {});
                    setTourVersion(parsed.tourVersion || 0);
                }
            } catch (err) {
                console.error('Failed to parse local tour state:', err);
            }

            // Then sync with backend if user is logged in
            if (userId) {
                try {
                    const { data } = await apiClient.get(`/api/tour/progress?userId=${encodeURIComponent(userId)}`);
                    if (data.success && data.progress) {
                        setProgress(data.progress.tours || {});
                        setTourVersion(data.progress.tourVersion || 0);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.progress));
                    }
                } catch (err) {
                    // Backend may not have tour endpoints yet, that's ok
                    console.log('Tour progress fetch skipped:', err.message);
                }
            }

            setIsInitialized(true);
        };

        loadProgress();
    }, [userId]);

    // Auto-start tours based on which route the user landed on.
    // Each branch returns early so we only fire one tour per render.
    useEffect(() => {
        if (!isInitialized || !userId) return;
        if (activeTour) return; // Don't interrupt active tour
        // Never auto-start tours while impersonating — Adam shouldn't accidentally
        // mark another customer's tour as skipped/completed by closing it.
        if (isImpersonating) return;

        const path = location.pathname;

        // 1) Main tour — dashboard only, version-gated
        if (path === '/dashboard') {
            const mainTourProgress = progress[TOUR_TYPES.MAIN];
            const needsMain = tourVersion < CURRENT_TOUR_VERSION || !mainTourProgress?.completed;
            if (needsMain) {
                const timer = setTimeout(() => startTour(TOUR_TYPES.MAIN), 500);
                return () => clearTimeout(timer);
            }
            return;
        }

        // 2) Pages tour — WordPress users only
        if (path === '/pages') {
            const pagesProgress = progress[TOUR_TYPES.PAGES];
            if (!pagesProgress?.completed && hasWordPressConnection(siteSettings)) {
                const timer = setTimeout(() => startTour(TOUR_TYPES.PAGES), 500);
                return () => clearTimeout(timer);
            }
            return;
        }

        // 3) AI Mentions tour — Pro+ only
        if (path === '/ai-mentions') {
            const aiProgress = progress[TOUR_TYPES.AI_MENTIONS];
            if (!aiProgress?.completed && isProPlusSubscription(currentSubscription)) {
                const timer = setTimeout(() => startTour(TOUR_TYPES.AI_MENTIONS), 500);
                return () => clearTimeout(timer);
            }
            return;
        }

        // 4) SEO Analysis tour — Pro+ only
        if (path === '/seo-analysis') {
            const seoProgress = progress[TOUR_TYPES.SEO_ANALYSIS];
            if (!seoProgress?.completed && isProPlusSubscription(currentSubscription)) {
                const timer = setTimeout(() => startTour(TOUR_TYPES.SEO_ANALYSIS), 500);
                return () => clearTimeout(timer);
            }
            return;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInitialized, userId, progress, tourVersion, location.pathname, activeTour, siteSettings, currentSubscription, isImpersonating]);

    // Handle cross-page navigation resume
    useEffect(() => {
        if (location.state?.tourStep !== undefined && location.state?.tourType) {
            setActiveTour(location.state.tourType);
            setCurrentStep(location.state.tourStep);
            setIsTransitioning(false);
            // Clear the state to prevent re-triggering
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const getCurrentStepConfig = useCallback(() => {
        if (!activeTour || !tourConfigs?.[activeTour]) return null;
        return tourConfigs[activeTour].steps[currentStep] || null;
    }, [activeTour, currentStep, tourConfigs]);

    const getTourConfig = useCallback((tourType) => {
        return tourConfigs?.[tourType] || null;
    }, [tourConfigs]);

    const trackEvent = useCallback(async (action, metadata = {}) => {
        if (!activeTour || !userId) return;

        const stepConfig = getCurrentStepConfig();
        const timeOnStep = Date.now() - stepStartTime.current;

        try {
            await apiClient.post('/api/tour/track', {
                userId,
                tourType: activeTour,
                stepId: stepConfig?.id || `step-${currentStep}`,
                stepIndex: currentStep,
                action,
                page: location.pathname,
                timeOnStep,
                metadata: {
                    ...metadata,
                    browser: navigator.userAgent,
                    viewport: { width: window.innerWidth, height: window.innerHeight }
                }
            });
        } catch (err) {
            // Analytics tracking failure shouldn't break the tour
            console.log('Tour tracking skipped:', err.message);
        }
    }, [activeTour, userId, currentStep, location.pathname, getCurrentStepConfig]);

    const saveProgress = useCallback(async (newProgress, newVersion = tourVersion) => {
        const state = { tours: newProgress, tourVersion: newVersion };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

        // Don't persist tour skip/complete state to the backend while
        // impersonating — that would mark the customer's tour as done from
        // an admin session. Local state is fine to retain for the session.
        if (userId && !isImpersonating) {
            try {
                await apiClient.post('/api/tour/progress', {
                    userId,
                    progress: state
                });
            } catch (err) {
                console.log('Tour progress save skipped:', err.message);
            }
        }
    }, [userId, tourVersion, isImpersonating]);

    const startTour = useCallback((tourType) => {
        const config = tourConfigs?.[tourType];
        if (!config) {
            console.warn(`Tour config not found for: ${tourType}`);
            return;
        }

        const existingProgress = progress[tourType];
        // Resume from last step if not completed, otherwise start fresh
        const startStep = existingProgress?.completed ? 0 : (existingProgress?.currentStep || 0);

        setActiveTour(tourType);
        setCurrentStep(startStep);
        stepStartTime.current = Date.now();

        // Track tour start
        trackEvent('start', { resumedFrom: startStep > 0 ? startStep : undefined });

        // Update progress with start time
        const newProgress = {
            ...progress,
            [tourType]: {
                ...existingProgress,
                startedAt: existingProgress?.startedAt || new Date().toISOString(),
                currentStep: startStep,
                completed: false
            }
        };
        setProgress(newProgress);
        saveProgress(newProgress);
    }, [tourConfigs, progress, trackEvent, saveProgress]);

    const nextStep = useCallback(async () => {
        if (!activeTour || !tourConfigs?.[activeTour]) return;

        const config = tourConfigs[activeTour];
        const currentStepConfig = config.steps[currentStep];
        const nextStepIndex = currentStep + 1;
        const nextStepConfig = config.steps[nextStepIndex];

        // Track the 'next' action for current step
        await trackEvent('next');

        // Check if this is the last step
        if (nextStepIndex >= config.steps.length) {
            completeTour();
            return;
        }

        // Check if navigation is needed for next step
        if (nextStepConfig?.route && location.pathname !== nextStepConfig.route) {
            setIsTransitioning(true);
            navigate(nextStepConfig.route, {
                state: { tourStep: nextStepIndex, tourType: activeTour }
            });
            return;
        }

        // Move to next step
        setCurrentStep(nextStepIndex);
        stepStartTime.current = Date.now();

        // Update progress
        const newProgress = {
            ...progress,
            [activeTour]: {
                ...progress[activeTour],
                currentStep: nextStepIndex
            }
        };
        setProgress(newProgress);
        saveProgress(newProgress);
    }, [activeTour, tourConfigs, currentStep, location.pathname, navigate, progress, trackEvent, saveProgress]);

    const prevStep = useCallback(async () => {
        if (!activeTour || currentStep <= 0) return;

        const config = tourConfigs?.[activeTour];
        const prevStepIndex = currentStep - 1;
        const prevStepConfig = config?.steps[prevStepIndex];

        await trackEvent('prev');

        // Check if navigation is needed
        if (prevStepConfig?.route && location.pathname !== prevStepConfig.route) {
            setIsTransitioning(true);
            navigate(prevStepConfig.route, {
                state: { tourStep: prevStepIndex, tourType: activeTour }
            });
            return;
        }

        setCurrentStep(prevStepIndex);
        stepStartTime.current = Date.now();

        // Update progress
        const newProgress = {
            ...progress,
            [activeTour]: {
                ...progress[activeTour],
                currentStep: prevStepIndex
            }
        };
        setProgress(newProgress);
        saveProgress(newProgress);
    }, [activeTour, tourConfigs, currentStep, location.pathname, navigate, progress, trackEvent, saveProgress]);

    const skipTour = useCallback(async () => {
        if (!activeTour) return;

        await trackEvent('skip');

        const newProgress = {
            ...progress,
            [activeTour]: {
                ...progress[activeTour],
                skipped: true,
                skippedAt: new Date().toISOString(),
                completed: true // Mark as completed so it doesn't auto-start again
            }
        };
        setProgress(newProgress);
        setTourVersion(CURRENT_TOUR_VERSION); // Update state so auto-start check passes
        saveProgress(newProgress, CURRENT_TOUR_VERSION);

        setActiveTour(null);
        setCurrentStep(0);
        setIsTransitioning(false);
    }, [activeTour, progress, trackEvent, saveProgress]);

    const completeTour = useCallback(async () => {
        if (!activeTour) return;

        await trackEvent('complete');

        const newProgress = {
            ...progress,
            [activeTour]: {
                ...progress[activeTour],
                completed: true,
                completedAt: new Date().toISOString()
            }
        };
        setProgress(newProgress);
        setTourVersion(CURRENT_TOUR_VERSION);
        saveProgress(newProgress, CURRENT_TOUR_VERSION);

        setActiveTour(null);
        setCurrentStep(0);
        setIsTransitioning(false);
    }, [activeTour, progress, trackEvent, saveProgress]);

    const resetTourProgress = useCallback(async () => {
        // Reset all tour progress (useful for testing or restart all)
        const emptyProgress = {};
        setProgress(emptyProgress);
        setTourVersion(0);
        saveProgress(emptyProgress, 0);
    }, [saveProgress]);

    const value = {
        // State
        activeTour,
        currentStep,
        progress,
        isTransitioning,
        isInitialized,

        // Computed
        getCurrentStepConfig,
        getTourConfig,
        getTotalSteps: () => activeTour && tourConfigs?.[activeTour] ? tourConfigs[activeTour].steps.length : 0,
        isLastStep: () => activeTour && tourConfigs?.[activeTour] ? currentStep >= tourConfigs[activeTour].steps.length - 1 : false,
        isTourCompleted: (tourType) => progress[tourType]?.completed || false,

        // Actions
        startTour,
        nextStep,
        prevStep,
        skipTour,
        completeTour,
        resetTourProgress,

        // Constants
        TOUR_TYPES
    };

    return (
        <TourContext.Provider value={value}>
            {children}
        </TourContext.Provider>
    );
};

export default TourContext;
