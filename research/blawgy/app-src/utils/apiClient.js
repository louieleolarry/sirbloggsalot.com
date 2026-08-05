import axios from 'axios';
import { auth } from '../firebaseConfig';

const baseURL = process.env.NODE_ENV === 'production'
  ? 'https://app.blawgy.com'
  : (process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080');

const isMockMode = () => {
  return process.env.REACT_APP_USE_MOCK_DATA === 'true' ||
         localStorage.getItem('useMockData') === 'true';
};

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set up mock adapter only in development when mock mode could be used
if (process.env.NODE_ENV !== 'production') {
  // Dynamic import to avoid bundling in production
  import('axios-mock-adapter').then(({ default: MockAdapter }) => {
    import('../mocks').then(({ supplementKeywords, supplementArticles, supplementSiteSettings }) => {
      // Generate GSC traffic data with 6-month growth
      const generateTrafficData = () => {
        const data = [];
        const today = new Date();
        for (let i = 180; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dayProgress = (180 - i) / 180;
          const baseClicks = 50 + Math.floor(dayProgress * dayProgress * 800);
          const baseImpressions = baseClicks * (8 + Math.random() * 4);
          const variance = 0.8 + Math.random() * 0.4;
          data.push({
            keys: [date.toISOString().split('T')[0]],
            clicks: Math.floor(baseClicks * variance),
            impressions: Math.floor(baseImpressions * variance),
            ctr: (baseClicks / baseImpressions * 100).toFixed(2),
            position: (15 - dayProgress * 10 + Math.random() * 2).toFixed(1)
          });
        }
        return data;
      };

      const gscTopPosts = [
        { keys: ['https://gymshark.com/blog/best-gym-leggings'], clicks: 2847, impressions: 45200, ctr: 6.3, position: 3.2 },
        { keys: ['https://gymshark.com/blog/squat-proof-leggings-guide'], clicks: 1923, impressions: 38400, ctr: 5.0, position: 4.1 },
        { keys: ['https://gymshark.com/blog/gymshark-vs-lululemon'], clicks: 1654, impressions: 29800, ctr: 5.5, position: 5.3 },
        { keys: ['https://gymshark.com/blog/best-sports-bra-running'], clicks: 1432, impressions: 27600, ctr: 5.2, position: 4.8 },
        { keys: ['https://gymshark.com/blog/seamless-workout-sets'], clicks: 1287, impressions: 24300, ctr: 5.3, position: 6.1 },
      ];

      const gscTopQueries = [
        { keys: ['best gym leggings'], clicks: 1847, impressions: 28400, ctr: 6.5, position: 2.8 },
        { keys: ['squat proof leggings'], clicks: 1523, impressions: 24200, ctr: 6.3, position: 3.1 },
        { keys: ['gymshark vs lululemon'], clicks: 1287, impressions: 19800, ctr: 6.5, position: 3.4 },
        { keys: ['best sports bra for running'], clicks: 1165, impressions: 21400, ctr: 5.4, position: 4.2 },
        { keys: ['seamless workout sets'], clicks: 987, impressions: 17600, ctr: 5.6, position: 4.8 },
      ];

      // Only set up mock handlers if mock mode is enabled
      if (!isMockMode()) return;

      const mock = new MockAdapter(apiClient, { delayResponse: 200, onNoMatch: 'passthrough' });

      mock.onGet(/\/all-blog-posts/).reply(() => [200, supplementArticles]);

      mock.onGet(/\/get-user-details/).reply(() => [200, {
        email: 'marketing@gymshark.com',
        sites: [{ site: 'gymshark.com', email: 'marketing@gymshark.com' }],
        blogType: 'wordpress',
        subscription: { isActive: true, plan: 'growth', credits: 847, maxCredits: 1000 }
      }]);

      mock.onGet(/\/get-site-settings/).reply(() => [200, {
        success: true,
        settings: {
          blogType: 'wordpress',
          product: supplementSiteSettings.product,
          site: 'gymshark.com',
          gsc: { access_token: 'mock_token', connected_site: 'sc-domain:gymshark.com' }
        },
        onboard: true
      }]);

      mock.onGet(/\/api\/keyword-finder-history\/.*/).reply(() => [200, {
        success: true,
        search: { _id: 'mock_search_001', status: 'completed', keywords: supplementKeywords }
      }]);

      mock.onGet(/\/api\/keyword-finder\//).reply(() => [200, { status: 'completed', keywords: supplementKeywords }]);

      mock.onGet(/\/api\/site-info\//).reply(() => [200, { success: true, siteInfo: { product: supplementSiteSettings.product } }]);

      mock.onGet(/\/api\/tour\/progress/).reply(() => [200, { success: true, progress: { tourVersion: 999, tours: {} } }]);

      mock.onGet('/gsc/data').reply(() => [200, { rows: generateTrafficData(), topPosts: gscTopPosts, topQueries: gscTopQueries }]);
    });
  }).catch(() => {
    // Mock adapter not available, that's fine in production
  });
}

// Session-expired recovery. When a request 401s and Firebase can't produce a
// token (signed out in another tab, revoked refresh token), we ask the app to
// re-authenticate the user IN PLACE — a modal with one-click sign-in — and then
// retry the original request. Unsaved page state survives; nobody is bounced to
// /login. App.js registers the handler; it resolves true once the user is
// signed back in, false if they decline. Single-flight: concurrent 401s share
// one prompt.
let sessionExpiredHandler = null;
let reauthInFlight = null;

export const setSessionExpiredHandler = (handler) => {
  sessionExpiredHandler = handler;
};

const requestReauth = () => {
  // No handler (preview/sample pages) or already on an auth screen: don't prompt.
  if (!sessionExpiredHandler) return Promise.resolve(false);
  const path = window.location.pathname;
  if (path.startsWith('/login') || path.startsWith('/signup')) return Promise.resolve(false);
  if (!reauthInFlight) {
    reauthInFlight = Promise.resolve()
      .then(() => sessionExpiredHandler())
      .catch(() => false)
      .finally(() => { reauthInFlight = null; });
  }
  return reauthInFlight;
};

// Request interceptor - get fresh token from Firebase (auto-refreshes if expired)
apiClient.interceptors.request.use(async (config) => {
  if (isMockMode()) return config;

  const user = auth?.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken(); // Firebase auto-refreshes if needed
      config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      // Refresh failed (offline, securetoken hiccup). The request would go out
      // with no header and 401; the response interceptor owns recovery.
      console.error('Error getting token:', error);
    }
  }

  // Handle impersonation
  const impersonatedSite = localStorage.getItem('impersonatedSite');
  const currentSite = localStorage.getItem('currentSite');
  if (impersonatedSite && !currentSite) {
    // Guard the parse: a corrupt 'impersonatedSite' value would otherwise
    // throw here and reject EVERY outgoing request (this runs in the request
    // interceptor). On a bad value, skip impersonation injection — the safe
    // default — and clear the entry so it self-heals.
    let siteData = null;
    try {
      siteData = JSON.parse(impersonatedSite);
    } catch (parseError) {
      console.error('Error parsing impersonatedSite in apiClient:', parseError);
      try { localStorage.removeItem('impersonatedSite'); } catch { /* noop */ }
    }
    if (siteData) {
      if (config.method === 'get') {
        config.params = { ...config.params, site: siteData.site, ...(siteData.email && { email: siteData.email }) };
      } else if (config.data && typeof config.data === 'object') {
        config.data = { ...config.data, site: siteData.site, ...(siteData.email && { email: siteData.email }) };
      }
    }
  }

  return config;
});

// Response interceptor - recover from 401s instead of surfacing them.
// Ladder: (1) force-refresh the token and retry; (2) if there is no session to
// refresh (currentUser null, or refresh threw), prompt an in-place re-auth via
// the session-expired modal and retry after sign-in. Only after both fail does
// the 401 reach the caller. GSC routes keep their own reconnect handling.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (isMockMode()) return Promise.reject(error);

    if (error.response?.status === 401 && !error.config?._retry && !error.config?.url?.includes('/gsc/')) {
      // Guard against a missing headers object — some failed requests
      // (e.g. network errors) surface a config without headers, and a
      // bare `error.config.headers.Authorization = ...` would throw here,
      // swallowing the 401 and the retry along with it.
      error.config._retry = true;
      error.config.headers = error.config.headers || {};

      const user = auth?.currentUser;
      if (user) {
        try {
          const token = await user.getIdToken(true); // Force refresh
          error.config.headers.Authorization = `Bearer ${token}`;
          return apiClient.request(error.config);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // Fall through: the session is effectively dead. Re-auth in place.
        }
      }

      const reauthed = await requestReauth();
      if (reauthed && auth?.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          error.config.headers.Authorization = `Bearer ${token}`;
          return apiClient.request(error.config);
        } catch (retryError) {
          console.error('Post-reauth retry failed:', retryError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
