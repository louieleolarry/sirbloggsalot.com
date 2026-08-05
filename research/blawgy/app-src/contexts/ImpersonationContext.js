import React, { createContext, useContext, useState } from 'react';

const ImpersonationContext = createContext();

export function ImpersonationProvider({ children, site, user, selectedSite }) {
  const siteSettings = site?.settings;
  // The site the user has *selected* in the navbar. App updates this
  // synchronously on switch (and seeds it from localStorage on boot), so it's
  // available ~10s before `siteSettings` — which only lands after the async
  // /get-site-settings call resolves. Preferring it below is what lets every
  // view repaint its loading state and refetch the instant a site is picked,
  // instead of showing the previous site's articles/data until settings load.
  const selectedSiteName = typeof selectedSite === 'string' ? selectedSite : selectedSite?.site;
  const selectedSiteEmail = typeof selectedSite === 'object' ? selectedSite?.email : null;
  const [impersonatedSite, setImpersonatedSite] = useState(() => {
    // Guard the parse: a corrupt or stale "undefined"/"null" value would
    // otherwise throw in JSON.parse, and since this provider wraps the whole
    // authed app that throw white-screens everything. Clear the bad entry so
    // the next load starts clean instead of crashing on every render.
    try {
      const stored = localStorage.getItem('impersonatedSite');
      if (!stored || stored === 'undefined' || stored === 'null') return null;
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading impersonatedSite from localStorage:', error);
      try { localStorage.removeItem('impersonatedSite'); } catch { /* noop */ }
      return null;
    }
  });

  const startImpersonation = (siteData) => {
    if (!siteData.site) {
      console.error('Site data must include a site domain');
      return;
    }

    const impersonationData = {
      site: siteData.site,
      blogType: siteData.blogType,
      settings: siteData.settings,
      email: siteData.email || null,
      impersonatedAt: new Date().toISOString(),
    };
    setImpersonatedSite(impersonationData);
    localStorage.setItem('impersonatedSite', JSON.stringify(impersonationData));
    window.location.reload();
  };

  const stopImpersonation = () => {
    setImpersonatedSite(null);
    localStorage.removeItem('currentSite');
    localStorage.removeItem('impersonatedSite');
    window.location.reload();
  };

  return (
    <ImpersonationContext.Provider value={{
      impersonatedSite,
      startImpersonation,
      stopImpersonation,
      isImpersonating: !!impersonatedSite,
      // Prefer the synchronously-selected site over the slow-loading
      // siteSettings.site so a switch is reflected immediately. Impersonation
      // still wins. Falls back to siteSettings.site for any boot edge case
      // where the selected site hasn't been seeded yet.
      currentSite: impersonatedSite?.site || selectedSiteName || siteSettings?.site || null,
      currentEmail: impersonatedSite?.email || selectedSiteEmail || user?.email || null,
      siteSettings,
      currentSubscription: site?.subscription || null,
      user: user || null
    }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  return useContext(ImpersonationContext);
}
