import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import FacebookPixel from '../utils/facebookPixel';
import funnelTracking from '../utils/funnelTracking';
import { captureSubscriptionCompleted } from '../utils/postHogClient';
import { auth } from '../firebaseConfig';
import PlanStage from './Onboarding/PlanStage';
import { useOnboardingStyles } from './Onboarding/Primitives';
import {
    ONBOARDING_STORAGE_KEY,
    readSavedOnboardingState,
    clearSavedOnboardingState
} from './Onboarding';

/*
 * Stripe checkout return. Two experiences:
 *
 * 1. Onboarding state still in localStorage (the normal signup path; the
 *    Stripe redirect happens before handleOpenPlan clears it): resume the
 *    PlanStage payoff here, exactly like the comp path, ending on the
 *    "Open your content plan" CTA. This is the reveal the paying customer
 *    would otherwise skip.
 * 2. No onboarding state (returning customer, cleared storage, another
 *    device): a simple Blawgy-voiced confirmation with an auto-redirect.
 *
 * Every checkout session the backend creates carries trial_period_days: 3,
 * so arrivals here started a trial and were not charged, and the copy says so
 * instead of thanking them "for your payment".
 */

function SuccessPage() {
    useOnboardingStyles();
    const navigate = useNavigate();
    const location = useLocation();
    const hasTracked = useRef(false);

    // Read once on mount; the PlanStage poll mutates the blob via
    // handlePlanProgress, so re-reading on every render would fight it.
    const [saved] = useState(() => readSavedOnboardingState());
    const [countdown, setCountdown] = useState(8);

    // Auto-redirect only on the simple confirmation. PlanStage owns its own
    // pacing and CTA; yanking the user mid-reveal would defeat the point.
    useEffect(() => {
        if (saved) return undefined;
        if (countdown <= 0) {
            navigate('/dashboard');
            return undefined;
        }
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
    }, [saved, countdown, navigate]);

    useEffect(() => {
        // Fire conversion tracking only once. Without this guard the effect
        // re-runs on any location.search change and double-fires under
        // React StrictMode, double-counting conversions.
        if (hasTracked.current) return;
        hasTracked.current = true;

        const searchParams = new URLSearchParams(location.search);
        const amount = searchParams.get('amount') || 0;

        FacebookPixel.trackPayment({
            planId: searchParams.get('planId'),
            amount: parseFloat(amount),
            currency: 'USD',
            transaction_id: searchParams.get('session_id')
        });

        // Track Google Ads conversion
        if (window.gtag) {
            // Enhanced conversions: hand Google the (auto-hashed) email so the
            // conversion can be matched to the ad click even without a gclid.
            const email = auth.currentUser?.email;
            if (email) {
                window.gtag('set', 'user_data', { email });
            }
            window.gtag('event', 'conversion', {
                send_to: 'AW-18062755732/907-CJiGyJ8cEJSP_6RD',
                value: parseFloat(amount) || 1.0,
                currency: 'USD',
                transaction_id: searchParams.get('session_id') || ''
            });
        }

        // Track subscription completion for funnel analytics
        funnelTracking.trackSubscriptionCompleted();

        captureSubscriptionCompleted(
            auth.currentUser?.uid,
            auth.currentUser?.email,
            searchParams.get('planId')
        );
    }, [location.search]);

    // Keep the PlanStage snapshot in the saved onboarding blob so a refresh
    // mid-prepare resumes the poll (mirrors what Onboarding itself persists).
    const handlePlanProgress = (progress) => {
        try {
            const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
                ...parsed,
                planProgress: progress,
                savedAt: Date.now()
            }));
        } catch { /* quota / private window: non-fatal */ }
    };

    const handleOpenPlan = () => {
        clearSavedOnboardingState();
        // Full navigation (not client-side) so the dashboard boots with the
        // fresh subscription + site state, same as the comp path hand-off.
        window.location.href = '/dashboard';
    };

    if (saved) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col" data-testid="success-plan-reveal">
                <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-100">
                    <div className="max-w-4xl mx-auto px-5 py-2.5 flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold tracking-tight text-gray-900">Blawgy</span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700" data-testid="trial-confirmation">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Your free trial has started. You won't be charged for 3 days and you can cancel anytime.
                        </span>
                    </div>
                </header>
                <main className="flex-1 flex items-center justify-center px-5 py-10 sm:py-16">
                    <div className="w-full">
                        <PlanStage
                            site={(saved.websiteUrl || '').trim()}
                            keywordPreview={saved.keywordPreview || null}
                            progress={saved.planProgress || null}
                            onProgress={handlePlanProgress}
                            onOpenPlan={handleOpenPlan}
                        />
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
            <div className="w-[420px] bg-white rounded-lg shadow-lg p-8" data-testid="success-simple">
                <div className="flex flex-col items-center space-y-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-semibold text-center">You're in</h2>
                    <p className="text-gray-500 text-center">
                        We're building your content plan right now.
                    </p>
                    <p className="text-gray-500 text-center">
                        Your free trial has started. You won't be charged for 3 days and you can cancel anytime.
                    </p>
                    <p className="text-gray-400 text-sm text-center">
                        Taking you to your dashboard in {countdown} seconds.
                    </p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="mt-4 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Go to my dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SuccessPage;
