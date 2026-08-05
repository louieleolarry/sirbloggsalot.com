import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient from '../utils/apiClient';
import defaultLogo from '../assets/blawgy-logo.svg';

/**
 * Host-driven branding.
 *
 * The backend decides whether the current host belongs to a white-label
 * partner; the client never guesses from window.location, so branding cannot be
 * spoofed by pointing a stray domain at the app.
 *
 * Defaults are the Blawgy brand, and every failure path keeps them. A branding
 * lookup must never be the reason a screen fails to render, so there is no
 * error state here — only a `loaded` flag for consumers that want to avoid a
 * logo flash.
 */

const DEFAULT_BRANDING = {
  isWhiteLabel: false,
  name: 'Blawgy',
  logoUrl: null,
  supportEmail: null,
  partnerId: null
};

const BrandingContext = createContext({ ...DEFAULT_BRANDING, logo: defaultLogo, loaded: false });

export const BrandingProvider = ({ children }) => {
    const [branding, setBranding] = useState(DEFAULT_BRANDING);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const response = await apiClient.get('/api/branding');
                if (!cancelled && response.data?.branding) {
                    setBranding(response.data.branding);
                }
            } catch (error) {
                // Keep the default brand.
                console.error('Branding lookup failed:', error);
            } finally {
                if (!cancelled) setLoaded(true);
            }
        })();

        return () => { cancelled = true; };
    }, []);

    // Partner logos are remote URLs; ours is a bundled asset.
    const logo = branding.logoUrl || defaultLogo;

    useEffect(() => {
        if (branding.name) document.title = branding.name;
    }, [branding.name]);

    return (
        <BrandingContext.Provider value={{ ...branding, logo, loaded }}>
            {children}
        </BrandingContext.Provider>
    );
};

export const useBranding = () => useContext(BrandingContext);

export default BrandingContext;
