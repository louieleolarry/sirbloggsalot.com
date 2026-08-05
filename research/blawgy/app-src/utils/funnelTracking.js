// Funnel tracking utility for the main app (app.blawgy.com)
// Reads session data transferred from landing page and tracks conversions

class FunnelTrackingService {
  constructor() {
    // Completely disable tracking on localhost to avoid polluting analytics with dev data
    this.isLocalhost = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (this.isLocalhost) {
      this.baseUrl = null;
      this.sessionId = null;
      this.landingVariant = null;
      this.buttonVariant = null;
      this.sessionValidated = true;
      this.sessionValidationPromise = null;
      console.log('[FunnelTracking] Disabled on localhost');
      return;
    }

    this.baseUrl = 'https://blawgy.fly.dev/funnel';

    this.sessionId = null;
    this.landingVariant = null;
    this.buttonVariant = null;
    this.sessionValidated = false;
    this.sessionValidationPromise = null;

    // Try to get session from transfer or localStorage
    this.initializeSession();
  }

  initializeSession() {
    // First, check for transferred session data from URL params (cross-domain transfer)
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get('fs'); // funnel session
    const urlLandingVariant = urlParams.get('lv'); // landing variant
    const urlButtonVariant = urlParams.get('bv'); // button variant

    if (urlSessionId) {
      this.sessionId = urlSessionId;
      this.landingVariant = urlLandingVariant;
      this.buttonVariant = urlButtonVariant;
      this.sessionValidated = true;

      // Store in localStorage for persistence
      localStorage.setItem('blawgy_enhanced_session_id', urlSessionId);
      if (urlLandingVariant) {
        localStorage.setItem('blawgy_landing_variant', urlLandingVariant);
      }
      if (urlButtonVariant) {
        localStorage.setItem('blawgy_button_variant', urlButtonVariant);
      }

      // Clean up URL (remove tracking params without page reload)
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('fs');
      cleanUrl.searchParams.delete('lv');
      cleanUrl.searchParams.delete('bv');
      window.history.replaceState({}, '', cleanUrl.toString());
    } else {
      // Fall back to localStorage
      this.sessionId = localStorage.getItem('blawgy_enhanced_session_id');
      this.landingVariant = localStorage.getItem('blawgy_landing_variant');
      this.buttonVariant = localStorage.getItem('blawgy_button_variant');

      if (this.sessionId) {
        this.sessionValidated = true;
      }
    }
  }

  // Create a new session if none exists (called lazily on first track)
  async ensureSession() {
    // Already have a session
    if (this.sessionId && this.sessionValidated) {
      return true;
    }

    // Already validating - wait for it
    if (this.sessionValidationPromise) {
      await this.sessionValidationPromise;
      return !!this.sessionId;
    }

    // Create new session
    this.sessionValidationPromise = this.createSession();
    await this.sessionValidationPromise;
    return !!this.sessionId;
  }

  async createSession() {
    try {
      const pathname = window.location.pathname;
      const referrer = document.referrer || '';

      const params = new URLSearchParams();
      params.append('entryPoint', 'app');
      params.append('entryUrl', pathname);
      if (referrer) params.append('referrer', referrer);

      const response = await fetch(`${this.baseUrl}/variant?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to create funnel session:', response.statusText);
        this.sessionValidated = true;
        return;
      }

      const data = await response.json();

      if (data.success && data.sessionId) {
        this.sessionId = data.sessionId;
        this.landingVariant = data.landingVariant?.id || null;
        this.buttonVariant = data.buttonVariant?.id || null;

        // Store in localStorage for persistence
        localStorage.setItem('blawgy_enhanced_session_id', data.sessionId);
        if (data.landingVariant) {
          localStorage.setItem('blawgy_landing_variant', data.landingVariant.id);
        }
        if (data.buttonVariant) {
          localStorage.setItem('blawgy_button_variant', data.buttonVariant.id);
        }

        console.log('Funnel session created:', data.sessionId);
      }

      this.sessionValidated = true;
    } catch (error) {
      console.error('Error creating funnel session:', error);
      this.sessionValidated = true;
    }
  }

  async track(eventType, eventData = {}) {
    // Skip tracking on localhost
    if (this.isLocalhost) return;

    await this.ensureSession();

    if (!this.sessionId) {
      console.log('No funnel session found, skipping tracking');
      return;
    }

    try {
      const trackingData = {
        sessionId: this.sessionId,
        eventType,
        page: window.location.pathname,
        pageType: 'app',
        buttonVariant: this.buttonVariant,
        ...eventData
      };

      const response = await fetch(`${this.baseUrl}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trackingData),
      });

      if (!response.ok) {
        console.error('Failed to track funnel event:', response.statusText);
      } else {
        console.log(`Funnel event tracked: ${eventType}`);
      }
    } catch (error) {
      console.error('Error tracking funnel event:', error);
    }
  }

  async trackSignupCompleted(userEmail, userId) {
    await this.track('signup_completed', { userEmail, userId });
  }

  async trackSubscriptionCompleted(userEmail, userId) {
    await this.track('subscription_completed', { userEmail, userId });
  }

  // Deep funnel tracking for generator steps
  async trackGeneratorStep(step, stepData = {}) {
    await this.trackDeepFunnel('generator_step', { generatorStep: step, stepData });
  }

  async trackDeepFunnel(eventType, eventData = {}) {
    // Skip tracking on localhost
    if (this.isLocalhost) return;

    await this.ensureSession();

    if (!this.sessionId) {
      console.log('No funnel session found, skipping deep tracking');
      return;
    }

    try {
      const trackingData = {
        sessionId: this.sessionId,
        eventType,
        page: window.location.pathname,
        pageType: 'app',
        timestamp: new Date().toISOString(),
        ...eventData
      };

      // Fire and forget
      fetch(`${this.baseUrl}/deep-track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trackingData),
      }).catch(err => console.error('Deep funnel tracking error:', err));
    } catch (error) {
      console.error('Error tracking deep funnel event:', error);
    }
  }

  getSessionId() {
    return this.sessionId;
  }

  hasSession() {
    return !!this.sessionId;
  }
}

// Global instance
const funnelTracking = new FunnelTrackingService();

export default funnelTracking;
