// PostHog bootstrap for the app domain. Receives the landing-side distinct_id
// and variant via URL params (phid / phv), identifies, and registers the
// variant as a super property so all downstream events (signup, subscription)
// stay attributed to the landing experiment.

import posthog from 'posthog-js';

const POSTHOG_TOKEN = 'phc_RngTF4bgOXYJum79zLCeb0xC6X7y0LA4ug5oLqzcPLE';
const POSTHOG_HOST = 'https://us.i.posthog.com';
const STORAGE_KEY = 'blawgy_app_landing_variant';
const ATTRIBUTION_KEY = 'blawgy_app_attribution_v1';

let initialized = false;

export function initPostHog() {
  if (initialized || typeof window === 'undefined') return;

  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('[PostHog] Disabled on localhost');
    return;
  }

  const url = new URL(window.location.href);
  const phid = url.searchParams.get('phid');
  const phvParam = url.searchParams.get('phv');
  const phv = phvParam || readStoredVariant();

  // Persist before init so before_send can read it on the first auto-pageview.
  if (phvParam) {
    writeStoredVariant(phvParam);
  }

  posthog.init(POSTHOG_TOKEN, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    bootstrap: phid ? { distinctID: phid, isIdentifiedID: false } : undefined,
    before_send: (event) => {
      if (!event || !event.properties) return event;
      if (!event.properties.landing_variant) {
        const v = phv || readStoredVariant();
        if (v) event.properties.landing_variant = v;
      }
      return event;
    },
    loaded: (ph) => {
      if (phv) {
        try {
          ph.register({ landing_variant: phv });
        } catch {
          // ignore
        }
      }
    },
  });

  // Snapshot attribution at the FIRST page load so later events
  // (signup_completed, subscription_completed) read the entry context
  // even after the URL is rewritten.
  try {
    if (!sessionStorage.getItem(ATTRIBUTION_KEY)) {
      const attribution = readAttribution();
      sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
    }
  } catch {
    // ignore
  }

  // Fire an arrival event the first time we see params from a fresh landing handover.
  if (phvParam || phid) {
    try {
      posthog.capture('landing_handover', {
        landing_variant: phv,
        had_phid: !!phid,
      });
    } catch {
      // ignore
    }
  } else {
    // Direct app arrival (no landing handover). Capture how they got here
    // so unattributed signups are auto-classified going forward.
    try {
      const attribution = readAttribution();
      posthog.capture('app_arrival', {
        attribution_source: attribution.source,
        attribution_detail: attribution.detail,
        attribution_referrer: attribution.referrer,
        attribution_gclid: attribution.gclid,
        attribution_gcl_au: attribution.gclAu,
        attribution_utm_source: attribution.utm.source,
        attribution_utm_medium: attribution.utm.medium,
        attribution_utm_campaign: attribution.utm.campaign,
      });
    } catch {
      // ignore
    }
  }

  if (phid) {
    url.searchParams.delete('phid');
  }
  if (phvParam) {
    url.searchParams.delete('phv');
  }
  if (phid || phvParam) {
    window.history.replaceState({}, '', url.toString());
  }

  initialized = true;
}

export function identifyUser(uid, email) {
  if (!uid) return;
  try {
    posthog.identify(uid, email ? { email } : undefined);
    const phv = readStoredVariant();
    if (phv) posthog.setPersonProperties({ landing_variant: phv });
  } catch {
    // ignore
  }
}

export function captureSignupCompleted(uid, email) {
  try {
    const phv = readStoredVariant();
    const attribution = readSnapshotAttribution() || readAttribution();
    posthog.capture('signup_completed', {
      user_id: uid,
      email,
      landing_variant: phv || null,
      attribution_source: attribution.source,
      attribution_detail: attribution.detail,
      attribution_referrer: attribution.referrer,
      attribution_gclid: attribution.gclid,
      attribution_gcl_au: attribution.gclAu,
      attribution_utm_source: attribution.utm.source,
      attribution_utm_medium: attribution.utm.medium,
      attribution_utm_campaign: attribution.utm.campaign,
    });
  } catch {
    // ignore
  }
}

export function captureSubscriptionCompleted(uid, email, plan) {
  try {
    const phv = readStoredVariant();
    const attribution = readSnapshotAttribution() || readAttribution();
    posthog.capture('subscription_completed', {
      user_id: uid,
      email,
      plan: plan || null,
      landing_variant: phv || null,
      attribution_source: attribution.source,
      attribution_detail: attribution.detail,
      attribution_referrer: attribution.referrer,
      attribution_gclid: attribution.gclid,
      attribution_gcl_au: attribution.gclAu,
      attribution_utm_source: attribution.utm.source,
      attribution_utm_medium: attribution.utm.medium,
      attribution_utm_campaign: attribution.utm.campaign,
    });
  } catch {
    // ignore
  }
}

function readStoredVariant() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredVariant(v) {
  try {
    window.localStorage.setItem(STORAGE_KEY, v);
  } catch {
    // ignore
  }
}

function readSnapshotAttribution() {
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readCookie(name) {
  try {
    const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

// Classify how the current user reached the app so signup events are
// self-documenting even when they bypass the landing-page experiment.
function readAttribution() {
  const out = {
    source: 'unknown',
    detail: null,
    referrer: null,
    gclid: null,
    gclAu: null,
    utm: { source: null, medium: null, campaign: null },
  };

  try {
    if (typeof document !== 'undefined') {
      out.referrer = document.referrer || null;
    }
  } catch {
    // ignore
  }

  let params = null;
  try {
    params = new URL(window.location.href).searchParams;
  } catch {
    // ignore
  }
  if (params) {
    out.gclid = params.get('gclid');
    out.utm.source = params.get('utm_source');
    out.utm.medium = params.get('utm_medium');
    out.utm.campaign = params.get('utm_campaign');
  }

  // Google Ads sets _gcl_au server-side via auto-tagging on ad click.
  // Presence of this cookie is a strong signal the user clicked an ad recently.
  out.gclAu = readCookie('_gcl_au');

  // Storage variant takes precedence: real experiment exposure.
  if (readStoredVariant()) {
    out.source = 'experiment';
    out.detail = 'landing_variant_in_storage';
    return out;
  }

  if (out.gclid) {
    out.source = 'paid_ad';
    out.detail = 'gclid_param';
    return out;
  }

  if (out.utm.source) {
    out.source = 'utm';
    out.detail = `${out.utm.source}/${out.utm.medium || 'unknown'}`;
    return out;
  }

  if (out.gclAu) {
    out.source = 'paid_ad';
    out.detail = 'gcl_au_cookie';
    return out;
  }

  if (out.referrer && out.referrer.length > 0) {
    try {
      const host = new URL(out.referrer).hostname;
      if (host && !host.endsWith('blawgy.com')) {
        out.source = 'referral';
        out.detail = host;
        return out;
      }
    } catch {
      // ignore malformed referrer
    }
  }

  out.source = 'direct';
  return out;
}
