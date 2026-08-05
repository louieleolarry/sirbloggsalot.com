import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useImpersonation } from '../contexts/ImpersonationContext';

/*
 * RedoOnboardingCard — Settings entry point for redoing onboarding.
 *
 * Self-contained: renders a small card with a one-step confirm, then routes
 * to /onboarding?redo=1. Nothing is persisted server-side until the user
 * finishes the redo flow, so this is always safe to start (and abandon).
 *
 * Not mounted anywhere by default; drop it into the Settings page wherever
 * it fits: <RedoOnboardingCard />
 */
const RedoOnboardingCard = () => {
  const navigate = useNavigate();
  const { isImpersonating, impersonatedSite } = useImpersonation();
  const [confirming, setConfirming] = useState(false);

  // The onboarding flow runs as the signed-in admin, not the impersonated
  // customer: completing it would 500 against the customer's site. Hide the
  // entry point entirely while impersonating.
  if (isImpersonating || impersonatedSite) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4" data-testid="redo-onboarding-card">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <h3 className="text-sm font-semibold text-gray-900">Redo setup</h3>
          <p className="mt-1 text-sm text-gray-500 leading-relaxed">
            Walk through setup again to update your business description, competitors,
            audience, and tone. Handy when your business has changed since you signed up.
          </p>

          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              data-testid="redo-setup-open-confirm"
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Redo setup
            </button>
          ) : (
            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3" data-testid="redo-setup-confirm">
              <p className="text-sm text-blue-800 leading-relaxed">
                Nothing changes on your current site until you finish the new setup.
                Your keywords, published posts, and platform connections stay exactly
                as they are. When you are done, we will take you to keyword research
                so you can re-run it with the updated info.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/onboarding?redo=1')}
                  data-testid="redo-setup-start"
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
                >
                  Start redo
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  data-testid="redo-setup-cancel"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RedoOnboardingCard;
