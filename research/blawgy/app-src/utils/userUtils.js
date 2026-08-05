import apiClient from './apiClient';
import { captureAttribution, getStoredAttribution } from './attribution';

export const ensureUserInDatabase = async (email, options = {}) => {
  try {
    const siteSettings = sessionStorage.getItem('siteSettings');
    const domain = sessionStorage.getItem('siteName');
    const settings = (siteSettings && JSON.parse(siteSettings)) || {};
    const { compSlug } = options;

    // Last-chance capture (covers direct /signup landings), then attach the
    // stored first-touch attribution so the backend can persist it.
    captureAttribution();
    const attribution = getStoredAttribution();

    const response = await apiClient.post('/signup', {
      email,
      ...(domain && { domain }),
      ...(settings && {
        settings: {
          ...(settings.product && { product: settings.product }),
          ...(settings.links && { links: settings.links }),
          ...(settings.videos && { videos: settings.videos }),
          ...(settings.keywords && { keywords: settings.keywords }),
          ...(settings.blogType && { blogType: settings.blogType })
        },
      }),
      // Capture PromoteKit referral at signup for persistent tracking
      ...(window.promotekit_referral && { promotekit_referral: window.promotekit_referral }),
      // Comp link slug — backend validates and stamps it on the user
      // doc as pendingCompSlug; we redeem at the end of onboarding.
      ...(compSlug && { compSlug }),
      // First-touch ad attribution (gclid/utm) for offline conversion uploads.
      ...(attribution && { attribution })
    });

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to store user in database');
    }

    if (siteSettings) {
      // Clear the stored site settings
      sessionStorage.removeItem('productDescription');
      sessionStorage.removeItem('selectedPremise');
    }
  } catch (error) {
    console.error('MongoDB storage error:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to store user');
  }
}; 