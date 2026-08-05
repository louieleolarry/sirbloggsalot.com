import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import './tailwind.css';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import SignupPage from './Views/SignupPage';
import LoginPage from './Views/LoginPage';
import { auth, markIntentionalSignOut, wasIntentionalSignOut, clearIntentionalSignOut } from './firebaseConfig';
import SessionExpiredModal from './components/SessionExpiredModal';
import Dashboard from './Views/Dashboard';
// Free generator removed - using onboarding flow instead
// import AiBlogPostGenerator from './Views/AiBlogPostGenerator';
import HormoziOfferGenerator from './Views/HormoziOfferGenerator';
import HormoziOfferView from './Views/HormoziOfferView';
import logo from './assets/blawgy-logo.svg';
import { ImpersonationProvider } from './contexts/ImpersonationContext';
import { cleanDomain } from './utils/domainUtils';
import { ModalProvider } from './contexts/ModalContext';
import { TourProvider } from './contexts/TourContext';
import TourUI from './components/Tour';
import TestDriveBanner from './components/TestDriveBanner';
import { TOUR_CONFIGS } from './components/Tour/tours';
import PreviewPage from './Views/PreviewPage';
import ApiDocsView from './Views/ApiDocsView';
import SuccessPage from './Views/SuccessPage';
import FailurePage from './Views/FailurePage';
import SettingsPage from './Views/SettingsPage';
import InvitePage from './Views/InvitePage';
import apiClient, { setSessionExpiredHandler } from './utils/apiClient';
import FacebookPixel from './utils/facebookPixel';
import ArticleBuilder from './Views/ArticleBuilder';
import KeywordFinder from './Views/KeywordFinder';
import ReportsPage from './Views/ReportsPage';
import SeoAnalysis from './Views/SeoAnalysis';
import AiMentions from './Views/AiMentions';
import Pages from './Views/Pages';
import Onboarding from './Views/Onboarding';
import BusinessDashboard from './Views/BusinessDashboard';
import SubscriptionRequired from './Views/SubscriptionRequired';
import AccountFrozen from './Views/AccountFrozen';
import { Toaster, toast } from 'react-hot-toast';
import Intercom from '@intercom/messenger-js-sdk';
import AssistantPanel from './components/Assistant/AssistantPanel';
import LeadGen from './pages/InternalTool/LeadGen';
import { isMockMode, supplementSiteSettings } from './mocks';

// Mock user for demo/screenshot mode (Gymshark)
const mockUser = {
  email: 'marketing@gymshark.com',
  sites: [{ site: 'gymshark.com', email: 'marketing@gymshark.com' }],
  blogType: 'wordpress',
  subscription: {
    isActive: true,
    plan: 'growth',
    credits: 847,
    maxCredits: 1000
  }
};

// Test-only escape hatch: e2e specs that need to drive the AdminPanel
// (gated by user.isAdmin in Navbar/ModalContext) hit /<route>?mock=admin,
// which sets BOTH useMockData and useMockAdmin in localStorage. We then
// merge isAdmin:true onto the mock user. Mirrors the existing ?mock=true
// convention — same shape, just one extra flag. Real demo mode is
// unaffected since the default mockUser has no isAdmin field.
const getMockUser = () => {
  try {
    if (localStorage.getItem('useMockAdmin') === 'true') {
      return { ...mockUser, isAdmin: true };
    }
  } catch { /* noop */ }
  return mockUser;
};

const mockSite = {
  site: 'gymshark.com',
  email: 'marketing@gymshark.com',
  settings: {
    // `site` mirrors the real /get-site-settings shape so any view that
    // reads siteSettings.site (Settings, etc.) works in mock mode without
    // waiting on an auth-gated fetch.
    site: 'gymshark.com',
    blogType: 'wordpress',
    product: supplementSiteSettings.product,
    gsc: {
      access_token: 'mock_gsc_token',
      connected_site: 'sc-domain:gymshark.com'
    }
  },
  success: true,
  onboard: true
};

// localStorage helpers that survive the two ways a write can go wrong:
// (1) `JSON.stringify(undefined)` returns the literal string "undefined",
//     which then crashes JSON.parse on every subsequent read — a real
//     customer (nfwdev) got stuck here after a failed onboarding scrape
//     left storeData undefined inside fetchUserDetails.
// (2) A stale "undefined"/"null" string already in localStorage from an
//     older build needs to self-heal on read instead of throwing forever.
const safeParseLocalStorage = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw === 'undefined' || raw === 'null') {
      if (raw === 'undefined' || raw === 'null') localStorage.removeItem(key);
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    // Corrupt entry — clear it so the next read starts clean instead of
    // hitting the same SyntaxError on every page load.
    try { localStorage.removeItem(key); } catch { /* noop */ }
    return null;
  }
};

const safeSetLocalStorage = (key, value) => {
  try {
    if (value === undefined || value === null) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

const LoadingLogo = () => {
  return (
    <div className="App min-h-screen bg-gradient-to-br from-[#C4B5FD]/10 via-[#99F6E4]/10 to-[#6EE7B7]/15">
      <div className="flex justify-center items-center h-screen">
        <img
          src={logo}
          alt="Blawgy"
          className="h-10"
          style={{ animation: 'logoPulse 1.5s ease-in-out infinite' }}
        />
      </div>
      <style>{`
        @keyframes logoPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [currentSite, setCurrentSite] = useState(() => {
    // If mock mode, return mock site
    if (isMockMode()) {
      return { site: 'gymshark.com', email: 'demo@gymshark.com' };
    }
    // Sanitize on read: an old onboarding bug stored pathful "domains"
    // ("example.com/location/x") here, which broke every /api/plan/<site>/...
    // URL into extra segments. Cleaning at boot heals any browser that still
    // carries a dirty value.
    const stored = safeParseLocalStorage('currentSite');
    if (stored && typeof stored.site === 'string') {
      stored.site = cleanDomain(stored.site);
    }
    return stored;
  });

  const [site, setSite] = useState(null);
  const [userEmailAddress, setUserEmailAddress] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  // Mirrors localStorage('impersonatedSite') so children (TourProvider) can
  // skip auto-fire/save when an admin is impersonating another customer.
  const [isImpersonating, setIsImpersonating] = useState(() => {
    try { return !!localStorage.getItem('impersonatedSite'); }
    catch { return false; }
  });
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);

  // Re-checks on every route change; covers same-tab impersonation start/stop
  // without needing a custom pub/sub. Placed after `location` is declared
  // because the dep array reads location.pathname.
  useEffect(() => {
    try {
      const isImp = !!localStorage.getItem('impersonatedSite');
      setIsImpersonating(prev => prev === isImp ? prev : isImp);
    } catch { /* noop */ }
  }, [location.pathname]);

  // Check for mock mode URL parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mock') === 'true') {
      localStorage.setItem('useMockData', 'true');
      // Remove the param from URL without reload
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('mock') === 'admin') {
      // Test-only: ?mock=admin → mock mode + isAdmin:true on the mock user.
      localStorage.setItem('useMockData', 'true');
      localStorage.setItem('useMockAdmin', 'true');
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('mock') === 'false') {
      localStorage.removeItem('useMockData');
      localStorage.removeItem('useMockAdmin');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // If mock mode is enabled, set up mock user/site
  useEffect(() => {
    if (isMockMode()) {
      const mocked = getMockUser();
      setUser(mocked);
      setUserEmailAddress(mocked.email);
      setSite(mockSite);
      setCurrentSite({ site: 'gymshark.com', email: 'demo@gymshark.com' });
      setInitialLoading(false);
    }
  }, []);

  // Keep locationRef updated without causing effect re-runs
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  // In-place re-auth for dead sessions. One prompt at a time; the promise is
  // shared by every caller (concurrent 401s from apiClient, plus the auth
  // listener's null branch below). true = signed back in, false = declined.
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const sessionExpiredResolverRef = useRef(null);
  const sessionExpiredPromiseRef = useRef(null);
  const hadSessionRef = useRef(false);

  const promptSessionReauth = useCallback(() => {
    if (sessionExpiredResolverRef.current) return sessionExpiredPromiseRef.current;
    sessionExpiredPromiseRef.current = new Promise((resolve) => {
      sessionExpiredResolverRef.current = resolve;
    });
    setShowSessionExpired(true);
    return sessionExpiredPromiseRef.current;
  }, []);

  const resolveSessionReauth = useCallback((reauthed) => {
    const resolve = sessionExpiredResolverRef.current;
    sessionExpiredResolverRef.current = null;
    sessionExpiredPromiseRef.current = null;
    setShowSessionExpired(false);
    if (resolve) resolve(reauthed);
    if (!reauthed) {
      // Declined: fall back to the old behavior — clear state, the render
      // guard sends them to /login.
      setUser(null);
      setUserEmailAddress(null);
    }
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(promptSessionReauth);
    return () => setSessionExpiredHandler(null);
  }, [promptSessionReauth]);

  useEffect(() => {
    FacebookPixel.init();
  }, []);

  useEffect(() => {
    FacebookPixel.pageView();
  }, [location.pathname]);

  useEffect(() => {
    if (!initialLoading) {
      if (user && userEmailAddress) {
        Intercom({
          app_id: 'j7ppdegr',
          email: userEmailAddress
        });
      } else {
        Intercom({
          app_id: 'j7ppdegr'
        });
      }
    }
  }, [initialLoading, user, userEmailAddress]);

  const fetchUserDetails = useCallback(async (email) => {
    let storeData = null;
    try {
      const response = await apiClient.get('/get-user-details', { params: { email } });
      if (response.data) {
        setUser(response.data);
        // Read currentSite from localStorage to avoid circular dependency.
        // Match the previously-selected site against the fresh response so we
        // keep the full record (faviconUrl, etc.). Without the lookup, this
        // would slim currentSite down to {email, site} and the navbar favicon
        // would fall through to the first site's icon after every refetch.
        const existingSite = safeParseLocalStorage('currentSite');
        // Heal pathful values from the old onboarding cleaner HERE as well as
        // at boot: this runs after every login/user refetch, and before this
        // guard it re-read the dirty value, matched nothing in the fresh site
        // list (server sites are clean), then wrote the dirty value straight
        // back to localStorage — undoing the boot-time sanitize every time.
        if (existingSite && typeof existingSite.site === 'string') {
          existingSite.site = cleanDomain(existingSite.site);
        }
        const sitesArray = response.data?.sites || [];
        const matchedSite = existingSite?.site
          ? sitesArray.find((s) => (typeof s === 'object' ? s.site : s) === existingSite.site)
          : null;
        if (matchedSite && typeof matchedSite === 'object') {
          storeData = matchedSite;
        } else if (matchedSite) {
          storeData = { site: matchedSite, email: existingSite?.email || email };
        } else if (existingSite?.site && email) {
          storeData = { email: existingSite?.email || email, site: existingSite?.site };
        } else {
          storeData = sitesArray[0];
        }
        setCurrentSite(storeData);
        // storeData is undefined for users who haven't completed onboarding
        // yet (no sites array on the user doc). safeSet handles that by
        // removing the key instead of writing the string "undefined".
        safeSetLocalStorage('currentSite', storeData);
      }
      return storeData;
    } catch (error) {
      console.error('Error fetching user details:', error);
      // Surface the failure instead of silently landing the user in a
      // site-less, "unsubscribed-looking" app on a transient backend blip.
      // Behavioral-only: we still return undefined and the auth/redirect
      // logic below is unchanged.
      toast.error('Could not load your account. Please refresh to try again.');
    }
  }, []);

  const fetchSiteSettings = useCallback(async (email, siteName) => {
    try {
      const { data: response } = await apiClient.get('/get-site-settings', {
        params: { email, site: siteName },
      });
      setSite(response);
      return response;
    } catch (error) {
      console.error('Error fetching site settings:', error);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      markIntentionalSignOut();
      await auth.signOut();
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentSite');
      localStorage.removeItem('impersonatedSite');
      setUser(null);
      setUserEmailAddress(null);
      navigate('/login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, [navigate]);

  useEffect(() => {
    if (isMockMode()) return;

    // Preview/sample pages don't need auth at all - skip Firebase listener entirely
    // This prevents cross-tab auth sync issues that can log users out of the dashboard
    const pathname = window.location.pathname;
    const isPreviewPage = pathname.startsWith('/preview/') ||
                          pathname.startsWith('/sample/');

    if (isPreviewPage) {
      setInitialLoading(false);
      return; // No auth listener, no cleanup needed
    }

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      try {
        if (currentUser) {
          hadSessionRef.current = true;
          clearIntentionalSignOut();
          // Session came back (re-auth modal, or sign-in in another tab):
          // close the prompt and let waiting requests retry.
          if (sessionExpiredResolverRef.current) resolveSessionReauth(true);
          setUser(currentUser);
          setUserEmailAddress(currentUser.email);

          const storedSite = await fetchUserDetails(currentUser.email);

          // If impersonating, fetch the impersonated site's settings instead
          const impersonated = safeParseLocalStorage('impersonatedSite');

          if (impersonated?.site) {
            await fetchSiteSettings(impersonated.email || storedSite?.email, impersonated.site);
          } else if (storedSite?.email && storedSite?.site) {
            await fetchSiteSettings(storedSite.email, storedSite.site);
          }

          const currentPath = locationRef.current.pathname;
          const currentState = locationRef.current.state;

          // Pages that don't require redirect
          const specialPages = [
            '/api-docs', '/success', '/failure', '/invite', '/onboarding', '/subscribe',
            '/article-builder', '/keyword-finder', '/reports', '/seo-analysis', '/ai-mentions', '/pages',
            '/alex-hormozi-offer-ai', '/business'
          ];
          const isSpecialPage = specialPages.includes(currentPath) ||
            currentPath.startsWith('/settings') ||
            currentPath.startsWith('/hormozi/offers/') ||
            currentPath.startsWith('/preview/') ||
            currentPath.startsWith('/sample/');

          if ((currentPath === '/login' || currentPath === '/signup') && currentState?.redirect) {
            navigate(currentState.redirect);
          } else if (!isSpecialPage) {
            // Check onboarding status from user response
            const userResponse = await apiClient.get('/me').catch(() => null);
            const userData = userResponse?.data;

            if (userData && !userData.onboardingComplete) {
              // User hasn't completed onboarding
              navigate('/onboarding');
            } else {
              // Go to dashboard - subscription check happens there or via context
              navigate('/dashboard');
            }
          }
        } else if (hadSessionRef.current && !wasIntentionalSignOut()) {
          // The session died underneath a live tab (cross-tab sign-out,
          // account hopping, revoked refresh token). Keep the page and its
          // unsaved state mounted and offer an in-place re-auth instead of
          // hard-bouncing to /login. Declining resolves false, which clears
          // state and lets the render guard redirect.
          promptSessionReauth();
        } else {
          setUser(null);
          setUserEmailAddress(null);
        }
      } catch (error) {
        console.error('Error handling auth state:', error);
      } finally {
        setInitialLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate, fetchUserDetails, fetchSiteSettings, promptSessionReauth, resolveSessionReauth]);

  const updateCurrentSite = (newSite) => {
    setCurrentSite(newSite);
    safeSetLocalStorage('currentSite', newSite);
  };

  useEffect(() => {
    // Skip for preview/sample pages - they don't need site settings
    const isPreviewPage = location.pathname.startsWith('/preview/') ||
                          location.pathname.startsWith('/sample/');
    if (isPreviewPage) return;

    if (auth?.currentUser) {
      // If impersonating, fetch the impersonated site's settings
      const impersonated = safeParseLocalStorage('impersonatedSite');

      const targetEmail = impersonated?.email || currentSite?.email || userEmailAddress;
      const targetSite = impersonated?.site || currentSite?.site;

      if (targetEmail && targetSite) {
        fetchSiteSettings(targetEmail, targetSite);
      }
    }
  }, [currentSite, userEmailAddress, fetchSiteSettings, location.pathname]);

  if (initialLoading) {
    return <LoadingLogo />;
  }

  if (!user || !userEmailAddress) {
    if (location.pathname !== '/login' &&
      location.pathname !== '/signup' &&
      location.pathname !== '/api-docs' &&
      location.pathname !== '/article-builder' &&
      location.pathname !== '/keyword-finder' &&
      location.pathname !== '/reports' &&
      location.pathname !== '/alex-hormozi-offer-ai' &&
      !location.pathname.startsWith('/hormozi/offers/') &&
      !location.pathname.startsWith('/preview/') &&
      !location.pathname.startsWith('/sample/') &&
      location.pathname !== '/internal-tool/leadgen') {
      if (location.pathname === '/invite') {
        const redirectUrl = `${location.pathname}${location.search}`;
        return <Navigate to="/login" replace state={{ redirect: redirectUrl }} />;
      } else {
        return <Navigate to="/login" replace />;
      }
    }

    return (
      <div className="min-h-screen bg-white">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          {/* Free generator removed - using onboarding flow instead */}
          {/* <Route path="/ai-blog-post-generator" element={<AiBlogPostGenerator />} /> */}
          <Route path="/api-docs" element={<ApiDocsView />} />
          <Route path="/article-builder" element={<ArticleBuilder />} />
          <Route path="/keyword-finder" element={<KeywordFinder />} />
          <Route path="/alex-hormozi-offer-ai" element={<HormoziOfferGenerator />} />
          <Route path="/hormozi/offers/:slug" element={<HormoziOfferView />} />
          <Route path="/preview/:siteId/:postId" element={<PreviewPage />} />
          <Route path="/sample/:domain/:slug" element={<PreviewPage />} />
          <Route path="/internal-tool/leadgen" element={<LeadGen />} />
          <Route path="*" element={<LoginPage />} />
        </Routes>
        <Toaster position="top-right" />
      </div>
    );
  }

  // Frozen-account gate: takes over the authed app when a payment fails.
  // Skipped for impersonators (so admins can investigate) and public-ish
  // pages that don't need the dashboard (preview, sample, success).
  const isFrozen = site?.subscription?.frozen === true;
  const isImpersonatingNow = !!safeParseLocalStorage('impersonatedSite');
  const pathname = location.pathname;
  const isFrozenBypassPath =
    pathname.startsWith('/preview/') ||
    pathname.startsWith('/sample/') ||
    pathname === '/success';

  if (isFrozen && !isImpersonatingNow && !isFrozenBypassPath) {
    return (
      <ImpersonationProvider user={user} site={site} selectedSite={currentSite}>
        {showSessionExpired && <SessionExpiredModal onResolve={resolveSessionReauth} />}
        <AccountFrozen
          subscription={site.subscription}
          onRetry={() => {
            const targetEmail = currentSite?.email || userEmailAddress;
            const targetSite = currentSite?.site;
            if (targetEmail && targetSite) {
              fetchSiteSettings(targetEmail, targetSite);
            } else {
              window.location.reload();
            }
          }}
        />
        <Toaster position="top-right" />
      </ImpersonationProvider>
    );
  }

  return (
    <ImpersonationProvider user={user} site={site} selectedSite={currentSite}>
      <ModalProvider>
        <TourProvider
          userId={userEmailAddress}
          tourConfigs={TOUR_CONFIGS}
          siteSettings={site?.settings}
          currentSubscription={site?.subscription}
          isImpersonating={isImpersonating}
        >
          <div className="App bg-[#F9FAFB] min-h-screen">
            {showSessionExpired && <SessionExpiredModal onResolve={resolveSessionReauth} />}
            <TestDriveBanner />
            {/* In-app assistant. Dark unless REACT_APP_ASSISTANT_ENABLED is set;
                the backend gates independently on ASSISTANT_ENABLED, so both
                sides must be switched on for it to do anything. */}
            {process.env.REACT_APP_ASSISTANT_ENABLED === 'true' && userEmailAddress && (
              <AssistantPanel site={currentSite?.site} />
            )}
            <Routes>
            <Route
              path="/dashboard"
              element={
                <Dashboard
                  logout={handleLogout}
                  email={userEmailAddress}
                  currentSite={currentSite}
                  updateCurrentSite={updateCurrentSite}
                />
              }
            />
            <Route
              path="/settings/:tab?"
              element={
                <SettingsPage
                  logout={handleLogout}
                  currentSite={currentSite}
                  updateCurrentSite={updateCurrentSite}
                />
              }
            />
            <Route
              path="/keyword-finder"
              element={
                <KeywordFinder
                  logout={handleLogout}
                  email={userEmailAddress}
                  currentSite={currentSite}
                  updateCurrentSite={updateCurrentSite}
                />
              }
            />
            <Route
              path="/pages"
              element={
                <Pages
                  logout={handleLogout}
                  currentSite={currentSite}
                  updateCurrentSite={updateCurrentSite}
                />
              }
            />
            <Route
              path="/reports"
              element={
                <ReportsPage
                  logout={handleLogout}
                  email={userEmailAddress}
                  currentSite={currentSite}
                  updateCurrentSite={updateCurrentSite}
                />
              }
            />
            <Route
              path="/seo-analysis"
              element={
                <SeoAnalysis
                  logout={handleLogout}
                  currentSite={currentSite}
                  updateCurrentSite={updateCurrentSite}
                />
              }
            />
            <Route
              path="/ai-mentions"
              element={
                <AiMentions
                  logout={handleLogout}
                  currentSite={currentSite}
                  updateCurrentSite={updateCurrentSite}
                />
              }
            />

            <Route path="/preview/:siteId/:postId" element={<PreviewPage />} />
            <Route path="/sample/:domain/:slug" element={<PreviewPage />} />
            <Route path="/api-docs" element={<ApiDocsView />} />
            <Route path="/invite" element={<InvitePage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/failure" element={<FailurePage email={userEmailAddress} />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route
              path="/business"
              element={
                <BusinessDashboard
                  user={user}
                  logout={handleLogout}
                  currentSite={currentSite}
                  updateCurrentSite={updateCurrentSite}
                />
              }
            />
            <Route path="/subscribe" element={<SubscriptionRequired />} />
            <Route path="/alex-hormozi-offer-ai" element={<HormoziOfferGenerator />} />
            <Route path="/hormozi/offers/:slug" element={<HormoziOfferView />} />
            <Route path="/article-builder" element={
              <ArticleBuilder
                logout={handleLogout}
                currentSite={currentSite}
                updateCurrentSite={updateCurrentSite}
              />} />
            <Route path="*" element={
              <Dashboard
                logout={handleLogout}
                email={userEmailAddress}
                currentSite={currentSite}
                updateCurrentSite={updateCurrentSite}
              />
            } />
            </Routes>
            <Toaster position="top-right" />
            <TourUI />
          </div>
        </TourProvider>
      </ModalProvider>
    </ImpersonationProvider>
  );
}

export default App;