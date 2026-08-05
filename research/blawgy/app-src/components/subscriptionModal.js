"use client";

import * as React from "react";
import { CircleCheckIcon, CalendarDays, Download, AlertCircle } from "lucide-react";
import apiClient from '../utils/apiClient';
import { useImpersonation } from '../contexts/ImpersonationContext';
import BaseModal from './Modals';

function SubscriptionModal({ open, onOpenChange, user }) {
    const { currentSubscription, currentSite, refreshSubscription } = useImpersonation();
    // Post-Postgres the user row is keyed `id` (uuid); legacy sessions may
    // still hold a Mongo `_id`. Send whichever exists — the backend resolves
    // both (and falls back to the auth token's email when neither is set yet).
    const userId = user?.id || user?._id;
    // currentSite is normally the bare domain string; site objects from
    // /get-user-details carry `site`, not an id.
    const siteId = typeof currentSite === 'string' ? currentSite : currentSite?.site;
    const [isLoading, setIsLoading] = React.useState(null);
    const [plans, setPlans] = React.useState([]);
    const [error, setError] = React.useState(null);
    const [isLoadingPlans, setIsLoadingPlans] = React.useState(true);
    const [buttonHovered, setButtonHovered] = React.useState(false);
    const [showCancelFlow, setShowCancelFlow] = React.useState(false);
    const [cancelStep, setCancelStep] = React.useState(1); // Multi-step cancellation
    const [cancelAnswers, setCancelAnswers] = React.useState({
        reason: '',
        missing: '',
        alternative: ''
    });
    const [retentionMessage, setRetentionMessage] = React.useState('');
    const [generatingMessage, setGeneratingMessage] = React.useState(false);
    const [isCancelling, setIsCancelling] = React.useState(false);
    const [subscriptionDetails, setSubscriptionDetails] = React.useState(null);
    const [selectedTier, setSelectedTier] = React.useState('growth'); // 'growth' or 'seo_pro'
    const [changeBilling, setChangeBilling] = React.useState('annually');
    // In-modal success banner. { message, reload } — when reload is true we
    // refresh the page after a readable delay (or when the user dismisses),
    // instead of yanking the page out from under an alert().
    const [successNotice, setSuccessNotice] = React.useState(null);

    React.useEffect(() => {
        if (!successNotice?.reload) return undefined;
        const timer = setTimeout(() => window.location.reload(), 6000);
        return () => clearTimeout(timer);
    }, [successNotice]);

    React.useEffect(() => {
        const fetchPlans = async () => {
            try {
                setIsLoadingPlans(true);
                setError(null);

                const response = await apiClient.get('/get-plans');

                if (response.data) {
                    setPlans(response.data.data);
                } else {
                    setError("Failed to retrieve plans.");
                }
            } catch (error) {
                console.error('Error fetching plans:', error);
                setError("An error occurred while fetching plans. Please try again.");
            } finally {
                setIsLoadingPlans(false);
            }
        };

        const fetchSubscriptionDetails = async () => {
            if (!currentSubscription?.isActive || !siteId) return;

            try {
                const response = await apiClient.get('/subscription-details', {
                    params: { userId, siteId }
                });

                if (response.data?.success) {
                    setSubscriptionDetails(response.data.subscription);
                }
            } catch (error) {
                console.error('Error fetching subscription details:', error);
            }
        };

        if (open) {
            fetchPlans();
            fetchSubscriptionDetails();
        }
    }, [open, currentSubscription?.isActive, userId, siteId]);

    // Derive prices from fetched data instead of hardcoding them.
    // effectiveMonthly: what a plan works out to per month regardless of billing period.
    const effectiveMonthly = (plan) => {
        if (!plan) return null;
        if (plan.billingPeriod === 'annual') {
            return plan.monthlyEquivalent || Math.round(plan.price / 12);
        }
        return plan.price;
    };

    const currentPlan = plans.find(pl => pl.planId === currentSubscription?.planId);
    const currentMonthlyRate = effectiveMonthly(currentPlan);
    const retentionPlanRecord = plans.find(pl => pl.isRetentionPlan);
    const retentionPrice = effectiveMonthly(retentionPlanRecord) || 49;
    // Only pitch the retention offer when it's actually cheaper than what
    // the customer pays today. Otherwise it reads as a fake discount.
    const retentionOfferAvailable = currentMonthlyRate != null && retentionPrice < currentMonthlyRate;

    const handleNextCancelStep = async () => {
        // All feedback questions are optional — an empty answer still continues.
        setError(null);

        // If moving from step 3 to 4, generate a personalized retention message
        // (only worth doing when there's an offer to show and something to react to).
        const hasAnswers = cancelAnswers.reason.trim() || cancelAnswers.missing.trim() || cancelAnswers.alternative.trim();
        if (cancelStep === 3 && retentionOfferAvailable && hasAnswers) {
            setGeneratingMessage(true);
            try {
                const response = await apiClient.post('/generate-retention-message', {
                    reason: cancelAnswers.reason,
                    missing: cancelAnswers.missing,
                    alternative: cancelAnswers.alternative
                });

                if (response.data?.success && response.data?.message) {
                    setRetentionMessage(response.data.message);
                }
            } catch (error) {
                console.error('Error generating retention message:', error);
                // Use fallback message if generation fails
                setRetentionMessage(`We appreciate your honest feedback. To thank you for helping us improve, we'd like to offer you a special permanent rate of $${retentionPrice}/mo if you lock in now.`);
            } finally {
                setGeneratingMessage(false);
            }
        }

        setCancelStep(cancelStep + 1);
    };

    const handleCancelSubscription = async (acceptRetention) => {
        setIsCancelling(true);
        try {
            const response = await apiClient.post('/cancel-subscription', {
                userId,
                siteId,
                reason: cancelAnswers.reason,
                missing: cancelAnswers.missing,
                alternative: cancelAnswers.alternative,
                acceptRetention
            });

            if (response.data?.success) {
                // Refresh subscription data
                if (refreshSubscription) {
                    await refreshSubscription();
                }
                
                // Close cancel flow and show an in-modal success banner
                setShowCancelFlow(false);
                setCancelStep(1);
                setCancelAnswers({ reason: '', missing: '', alternative: '' });

                if (acceptRetention) {
                    setSuccessNotice({
                        message: `You're all set. Your subscription is now $${retentionPrice}/mo, and any unused time from your current plan has been credited.`
                    });
                } else {
                    setSuccessNotice({
                        message: 'Your subscription is cancelled. It will stay active until ' +
                            new Date(response.data.endsAt * 1000).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            }) + ", and you won't be billed again."
                    });
                }
            }
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            setError('Failed to cancel subscription. Please try again or contact support.');
        } finally {
            setIsCancelling(false);
        }
    };

    if (currentSubscription?.isActive) {
        const stripeData = subscriptionDetails?.stripeData;
        const nextBillDate = stripeData?.currentPeriodEnd 
            ? new Date(stripeData.currentPeriodEnd * 1000)
            : currentSubscription?.nextBillDate 
            ? new Date(currentSubscription.nextBillDate)
            : null;

        const closeSubscriptionModal = () => {
            // If a plan change is waiting on a refresh, do it now rather than
            // leaving stale subscription data on screen.
            if (successNotice?.reload) {
                window.location.reload();
                return;
            }
            setShowCancelFlow(false);
            setCancelStep(1);
            setCancelAnswers({ reason: '', missing: '', alternative: '' });
            setError(null);
            setSuccessNotice(null);
            onOpenChange(false);
        };

        return (
            <BaseModal onClose={closeSubscriptionModal} className="max-w-[500px] p-8 relative">
                    <button
                        onClick={closeSubscriptionModal}
                        className="absolute right-4 top-4 text-gray-400 text-2xl hover:text-gray-600 leading-none"
                    >
                        ×
                    </button>

                    {!showCancelFlow ? (
                        <>
                            <div className="flex items-center justify-between mb-1">
                                <h2 className="text-2xl font-medium">Current Subscription</h2>
                                <div className="bg-black text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                    <CircleCheckIcon className="w-3 h-3" />
                                    <span>Active</span>
                                </div>
                            </div>
                            <p className="text-gray-500 text-sm mb-8 text-left">You are currently subscribed to our service</p>

                            {successNotice && (
                                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3" data-testid="billing-success-banner">
                                    <CircleCheckIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm text-green-800">{successNotice.message}</p>
                                        {successNotice.reload && (
                                            <p className="text-xs text-green-700 mt-1">This page will refresh in a few seconds.</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (successNotice.reload) {
                                                window.location.reload();
                                            } else {
                                                setSuccessNotice(null);
                                            }
                                        }}
                                        className="text-sm font-medium text-green-700 hover:text-green-900"
                                    >
                                        {successNotice.reload ? 'Refresh now' : 'Dismiss'}
                                    </button>
                                </div>
                            )}

                            {stripeData?.cancelAtPeriodEnd && (
                                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-yellow-900">Subscription Ending</p>
                                        <p className="text-sm text-yellow-700 mt-1">
                                            Your subscription will end on {nextBillDate?.toLocaleDateString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Plan</span>
                                    <span className="font-normal">{(() => {
                                        const p = plans.find(pl => pl.planId === currentSubscription?.planId);
                                        if (p?.tier === 'seo_pro') return p.billingPeriod === 'annual' ? 'Pro+ (Annual)' : 'Pro+ (Monthly)';
                                        if (p?.billingPeriod === 'annual') return 'Pro (Annual)';
                                        return currentSubscription?.name || 'Pro';
                                    })()}</span>
                                </div>

                                {nextBillDate && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">
                                            {stripeData?.cancelAtPeriodEnd ? 'Active Until' : 'Next Billing Date'}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4" />
                                            <span>
                                                {nextBillDate.toLocaleDateString('en-US', {
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {currentSubscription?.invoiceUrl && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Last Invoice</span>
                                        <button
                                            onClick={() => window.open(currentSubscription.invoiceUrl, '_blank')}
                                            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download Invoice
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Change Plan - LP-style: Monthly/Annual toggle, Pro & Pro+ side by side */}
                            {(() => {
                                const handleSwitch = async (targetPlan) => {
                                    setIsLoading(targetPlan.planId);
                                    setError(null);
                                    try {
                                        const response = await apiClient.post('/switch-plan', {
                                            userId,
                                            siteId,
                                            newPlanId: targetPlan.planId,
                                        });
                                        if (response.data?.success) {
                                            setSuccessNotice({
                                                message: `Switched to ${response.data.newPlan.name}. Unused time has been prorated as a credit.`,
                                                reload: true
                                            });
                                        } else {
                                            setError('Failed to switch plan. Please try again.');
                                        }
                                    } catch (err) {
                                        console.error('Switch plan error:', err);
                                        setError(err.response?.data?.error || 'Failed to switch plan. Please try again.');
                                    } finally {
                                        setIsLoading(null);
                                    }
                                };

                                const allPlans = plans.filter(p => p.isActive && !p.isRetentionPlan);

                                const proFeatures = [
                                    '31 blog posts per month (daily)',
                                    'All platform integrations',
                                    'YouTube video embeds',
                                    'Internal linking',
                                    'Google Search Console integration',
                                    'Custom AI images',
                                    'Priority support',
                                ];
                                const proPlusFeatures = [
                                    'Everything in Pro, plus:',
                                    'See how many people actually search for each topic (search volume)',
                                    'Know which topics are easy wins vs long shots',
                                    "Find topics your competitors rank for that you don't",
                                    'Watch your Google rankings from one dashboard',
                                    'Your content plan built around the topics most likely to win',
                                ];

                                const tiers = [
                                    {
                                        name: 'Pro',
                                        description: 'Everything you need for organic growth.',
                                        features: proFeatures,
                                        monthly: allPlans.find(p => (!p.tier || p.tier === 'growth') && p.billingPeriod === 'monthly'),
                                        annual: allPlans.find(p => (!p.tier || p.tier === 'growth') && p.billingPeriod === 'annual'),
                                        featured: false,
                                    },
                                    {
                                        name: 'Pro+',
                                        description: 'SEO-powered content for maximum rankings.',
                                        features: proPlusFeatures,
                                        monthly: allPlans.find(p => p.tier === 'seo_pro' && p.billingPeriod === 'monthly'),
                                        annual: allPlans.find(p => p.tier === 'seo_pro' && p.billingPeriod === 'annual'),
                                        featured: true,
                                    },
                                ];

                                return (
                                    <div className="mt-6 pt-6 border-t border-gray-200">
                                        <h3 className="text-lg font-medium mb-1">Change Plan</h3>
                                        <p className="text-gray-700 text-sm mb-1">More of your future customers finding you on Google, on autopilot.</p>
                                        <p className="text-gray-500 text-sm mb-4">Unused time will be prorated as a credit.</p>

                                        {/* Monthly / Annual toggle */}
                                        <div className="flex justify-center mb-4">
                                            <div className="grid grid-cols-2 gap-x-1 rounded-full p-1 text-center text-xs font-semibold ring-1 ring-inset ring-gray-200">
                                                <button
                                                    onClick={() => setChangeBilling('monthly')}
                                                    className={`rounded-full px-3 py-1 transition-all ${
                                                        changeBilling === 'monthly' ? 'bg-black text-white' : 'text-gray-500'
                                                    }`}
                                                >
                                                    Monthly
                                                </button>
                                                <button
                                                    onClick={() => setChangeBilling('annually')}
                                                    className={`rounded-full px-3 py-1 transition-all flex items-center gap-1 ${
                                                        changeBilling === 'annually' ? 'bg-black text-white' : 'text-gray-500'
                                                    }`}
                                                >
                                                    Annual
                                                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                                                        changeBilling === 'annually' ? 'bg-white/20' : 'bg-green-100 text-green-700'
                                                    }`}>
                                                        {(() => {
                                                            const gm = tiers[0].monthly;
                                                            const ga = tiers[0].annual;
                                                            if (gm && ga) {
                                                                const pct = Math.round(((gm.price * 12 - ga.price) / (gm.price * 12)) * 100);
                                                                return `Save ${pct}%`;
                                                            }
                                                            return 'Save';
                                                        })()}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Pro & Pro+ cards side by side */}
                                        <div className="grid grid-cols-2 gap-3">
                                            {tiers.map((tier) => {
                                                const plan = changeBilling === 'annually' ? tier.annual : tier.monthly;
                                                if (!plan) return null;
                                                const isCurrent = currentSubscription?.planId === plan.planId;
                                                const displayPrice = changeBilling === 'annually'
                                                    ? Math.round(plan.price / 12)
                                                    : plan.price;

                                                return (
                                                    <div
                                                        key={plan.planId}
                                                        className={`rounded-xl p-4 relative ${
                                                            tier.featured
                                                                ? 'bg-gray-900 text-white ring-2 ring-gray-700'
                                                                : 'bg-white ring-1 ring-gray-200'
                                                        } ${isCurrent ? 'ring-2 ring-black' : ''}`}
                                                    >
                                                        {tier.featured && !isCurrent && (
                                                            <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2">
                                                                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap">Most Popular</span>
                                                            </div>
                                                        )}
                                                        {isCurrent && (
                                                            <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2">
                                                                <span className="bg-black text-white px-2.5 py-0.5 rounded-full text-[10px] font-semibold">Current Plan</span>
                                                            </div>
                                                        )}

                                                        <h4 className={`text-sm font-semibold ${tier.featured ? 'text-white' : 'text-gray-900'}`}>{tier.name}</h4>
                                                        <p className={`text-xs mt-1 ${tier.featured ? 'text-gray-300' : 'text-gray-500'}`}>{tier.description}</p>

                                                        <div className="mt-3 flex items-baseline gap-x-1">
                                                            <span className={`text-2xl font-bold ${tier.featured ? 'text-white' : 'text-gray-900'}`}>${displayPrice}</span>
                                                            <span className={`text-xs ${tier.featured ? 'text-gray-300' : 'text-gray-500'}`}>/mo</span>
                                                        </div>
                                                        {changeBilling === 'annually' && (
                                                            <p className={`text-[11px] mt-0.5 ${tier.featured ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                Billed annually at ${plan.price}
                                                            </p>
                                                        )}

                                                        {isCurrent ? (
                                                            <div className={`mt-3 w-full py-2 rounded-md text-xs font-medium text-center ${
                                                                tier.featured ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-400'
                                                            }`}>
                                                                Current Plan
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleSwitch(plan)}
                                                                disabled={isLoading === plan.planId}
                                                                className={`mt-3 w-full py-2 rounded-md text-xs font-semibold disabled:opacity-50 transition-all ${
                                                                    tier.featured
                                                                        ? 'bg-white text-gray-900 hover:bg-gray-100'
                                                                        : 'bg-black text-white hover:bg-gray-800'
                                                                }`}
                                                            >
                                                                {isLoading === plan.planId ? 'Switching...' : 'Switch Plan'}
                                                            </button>
                                                        )}

                                                        <ul className={`mt-3 space-y-1.5 ${tier.featured ? 'text-gray-300' : 'text-gray-600'}`}>
                                                            {tier.features.map((f) => (
                                                                <li key={f} className="flex items-start text-[11px]">
                                                                    <span className={`mr-1.5 flex-shrink-0 ${tier.featured ? 'text-white' : 'text-green-600'}`}>✓</span>
                                                                    <span>{f}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

                            {error && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                    {error}
                                </div>
                            )}

                            {!stripeData?.cancelAtPeriodEnd && (
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                    <h3 className="text-lg font-medium mb-2">Need to cancel?</h3>
                                    <p className="text-gray-600 text-sm mb-4">
                                        We'd love to know how we can improve before you go.
                                    </p>
                                    <button
                                        onClick={() => setShowCancelFlow(true)}
                                        className="w-full py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium"
                                    >
                                        Cancel Subscription
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Progress Indicator */}
                            <div className="flex items-center justify-center mb-6">
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4].map((step) => (
                                        <div
                                            key={step}
                                            className={`h-2 rounded-full transition-all ${
                                                step === cancelStep
                                                    ? 'w-8 bg-primary'
                                                    : step < cancelStep
                                                    ? 'w-2 bg-primary'
                                                    : 'w-2 bg-gray-300'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className="ml-3 text-sm text-gray-500">Step {cancelStep} of 4</span>
                            </div>

                            {/* Step 1: Why are you cancelling? */}
                            {cancelStep === 1 && (
                                <>
                                    <h2 className="text-2xl font-medium mb-2">Why are you cancelling?</h2>
                                    <p className="text-gray-500 text-sm mb-6">Optional, but it helps us understand what went wrong</p>

                                    <div className="mb-6">
                                        <textarea
                                            value={cancelAnswers.reason}
                                            onChange={(e) => setCancelAnswers({ ...cancelAnswers, reason: e.target.value })}
                                            placeholder="e.g., Too expensive, not enough features, found a better alternative..."
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none"
                                            rows="4"
                                            autoFocus
                                        />
                                    </div>
                                </>
                            )}

                            {/* Step 2: What were you hoping for? */}
                            {cancelStep === 2 && (
                                <>
                                    <h2 className="text-2xl font-medium mb-2">What were you hoping for?</h2>
                                    <p className="text-gray-500 text-sm mb-6">What feature or improvement would have kept you? (optional)</p>

                                    <div className="mb-6">
                                        <textarea
                                            value={cancelAnswers.missing}
                                            onChange={(e) => setCancelAnswers({ ...cancelAnswers, missing: e.target.value })}
                                            placeholder="e.g., Better image quality, more customization options, faster generation..."
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none"
                                            rows="4"
                                            autoFocus
                                        />
                                    </div>
                                </>
                            )}

                            {/* Step 3: What will you use instead? */}
                            {cancelStep === 3 && (
                                <>
                                    <h2 className="text-2xl font-medium mb-2">What will you use instead?</h2>
                                    <p className="text-gray-500 text-sm mb-6">Just curious - how will you solve this problem? (optional)</p>

                                    <div className="mb-6">
                                        <textarea
                                            value={cancelAnswers.alternative}
                                            onChange={(e) => setCancelAnswers({ ...cancelAnswers, alternative: e.target.value })}
                                            placeholder="e.g., Hiring a writer, using ChatGPT directly, trying [competitor name]..."
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none"
                                            rows="4"
                                            autoFocus
                                        />
                                    </div>
                                </>
                            )}

                            {/* Step 4: Retention Offer (only when it's actually cheaper) */}
                            {cancelStep === 4 && retentionOfferAvailable && (
                                <>
                                    <h2 className="text-2xl font-medium mb-2">Wait - we have an offer for you!</h2>
                                    <p className="text-gray-500 text-sm mb-6">Thank you for your honest feedback</p>

                                    {generatingMessage && (
                                        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                                            <div className="animate-pulse text-primary text-sm">
                                                Personalizing your offer...
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 mb-6">
                                        <h3 className="text-xl font-bold text-green-900 mb-3">Special Retention Pricing</h3>

                                        <div className="text-center mb-4">
                                            <div className="text-4xl font-bold text-green-600">${retentionPrice}/mo</div>
                                            <div className="text-sm text-gray-600 line-through">was ${currentMonthlyRate}/mo</div>
                                            <div className="text-xs text-green-700 font-medium mt-1">
                                                Permanent rate • Lock in now
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-lg p-4 mb-4">
                                            <p className="text-gray-700 text-sm leading-relaxed">
                                                {retentionMessage || "We appreciate your honest feedback. To thank you for helping us improve, we'd like to offer you this special permanent rate if you lock in now. Your unused time will be credited automatically."}
                                            </p>
                                        </div>

                                        <div className="text-xs text-gray-600 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-600">✓</span>
                                                <span>Unused days credited automatically</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-600">✓</span>
                                                <span>Permanent ${retentionPrice}/mo rate (not temporary)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-600">✓</span>
                                                <span>Starts immediately</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Step 4 without an offer: plain confirmation */}
                            {cancelStep === 4 && !retentionOfferAvailable && (
                                <>
                                    <h2 className="text-2xl font-medium mb-2">Confirm your cancellation</h2>
                                    <p className="text-gray-500 text-sm mb-6">
                                        Your subscription will stay active until the end of your current billing period, and you won't be billed again.
                                    </p>
                                </>
                            )}

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                    {error}
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="space-y-3">
                                {cancelStep < 4 ? (
                                    <>
                                        <button
                                            onClick={handleNextCancelStep}
                                            className="w-full py-3 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium"
                                        >
                                            Continue
                                        </button>
                                        {cancelStep > 1 && (
                                            <button
                                                onClick={() => {
                                                    setCancelStep(cancelStep - 1);
                                                    setError(null);
                                                }}
                                                className="w-full py-2.5 rounded-lg text-gray-600 hover:text-gray-900 text-sm"
                                            >
                                                ← Back
                                            </button>
                                        )}
                                        <div className="text-center">
                                            <button
                                                onClick={() => {
                                                    setError(null);
                                                    setCancelStep(4);
                                                }}
                                                className="text-xs text-gray-400 hover:text-gray-600 underline"
                                            >
                                                Skip to cancel
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {retentionOfferAvailable && (
                                            <button
                                                onClick={() => handleCancelSubscription(true)}
                                                disabled={isCancelling}
                                                className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isCancelling ? 'Processing...' : `Accept $${retentionPrice}/mo Offer`}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleCancelSubscription(false)}
                                            disabled={isCancelling}
                                            className="w-full py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isCancelling
                                                ? 'Processing...'
                                                : retentionOfferAvailable
                                                ? 'No thanks, cancel my subscription'
                                                : 'Cancel my subscription'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </>
                    )}
            </BaseModal>
        );
    }

    if (isLoadingPlans) {
        return (
            <BaseModal onClose={() => onOpenChange(false)} className="max-w-[500px] p-6">
                    <p className="text-center">Loading plans...</p>
            </BaseModal>
        );
    }

    if (error) {
        return (
            <BaseModal onClose={() => onOpenChange(false)} className="max-w-[500px] p-6">
                    <p className="text-center text-red-500">{error}</p>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="mt-4 w-full py-2.5 rounded-lg bg-black text-white text-sm"
                    >
                        Close
                    </button>
            </BaseModal>
        );
    }

    const handleSubscribe = async (planId) => {
        setIsLoading(planId);
        try {
            const response = await apiClient.post('/checkout-session', {
                planId,
                email: user.email,
                referral: window.promotekit_referral || null,
                site: currentSite || null
            });

            if (response.data?.url) {
                window.location.href = response.data.url;
            } else {
                throw new Error('No checkout URL received');
            }
        } catch (error) {
            console.error('Checkout session error:', error);
            setError("We couldn't start checkout. You have not been charged. Please try again or email adam@blawgy.com.");
        } finally {
            setIsLoading(null);
        }
    };

    // Filter plans for non-active users (exclude retention plans)
    const availablePlans = plans.filter(plan => !plan.isRetentionPlan);

    // Separate plans by tier (plans without tier field are 'growth')
    const growthPlans = availablePlans.filter(plan => !plan.tier || plan.tier === 'growth');
    const seoProPlans = availablePlans.filter(plan => plan.tier === 'seo_pro');

    // Get plans for selected tier
    const tierPlans = selectedTier === 'seo_pro' ? seoProPlans : growthPlans;
    const monthlyPlans = tierPlans.filter(plan => plan.billingPeriod !== 'annual');
    const annualPlans = tierPlans.filter(plan => plan.billingPeriod === 'annual');

    // Check if we have multiple tiers available
    const hasMultipleTiers = growthPlans.length > 0 && seoProPlans.length > 0;

    // "from $X/mo" is the annual plan's monthly equivalent (the cheapest way
    // to get the tier), derived from fetched plans instead of hardcoded.
    const tierFromPrice = (list) => {
        const annual = list.find(p => p.billingPeriod === 'annual');
        if (annual) return annual.monthlyEquivalent || Math.round(annual.price / 12);
        const monthly = list.find(p => p.billingPeriod !== 'annual');
        return monthly?.price ?? null;
    };
    const growthFromPrice = tierFromPrice(growthPlans);
    const seoProFromPrice = tierFromPrice(seoProPlans);
    // Annual savings vs paying month-to-month for the same tier.
    const tierMonthlyPlan = monthlyPlans[0];

    return (
        <>
            <BaseModal onClose={() => onOpenChange(false)} className="max-w-[600px] p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className="text-left">
                            <h2 className="text-xl font-semibold">
                                {selectedTier === 'seo_pro' ? '🚀 Pro+' : '✨ Pro'}
                            </h2>
                            <p className="text-gray-500 text-sm mt-1">
                                {selectedTier === 'seo_pro'
                                    ? 'SEO-powered content for maximum rankings'
                                    : 'Everything you need for organic growth'}
                            </p>
                        </div>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="text-gray-400 hover:text-gray-600 ml-4 text-2xl"
                        >
                            ×
                        </button>
                    </div>

                    <p className="text-gray-900 font-medium text-sm mb-4 text-left">
                        More of your future customers finding you on Google, on autopilot.
                    </p>

                    {/* Tier Toggle - only show if both tiers exist */}
                    {hasMultipleTiers && (
                        <div className="mb-6">
                            <div className="flex bg-gray-100 rounded-lg p-1">
                                <button
                                    onClick={() => setSelectedTier('growth')}
                                    className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                                        selectedTier === 'growth'
                                            ? 'bg-white shadow-sm text-gray-900'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    Pro
                                    {growthFromPrice != null && (
                                        <span className="block text-xs font-normal text-gray-400">from ${growthFromPrice}/mo billed annually</span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setSelectedTier('seo_pro')}
                                    className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all relative ${
                                        selectedTier === 'seo_pro'
                                            ? 'bg-white shadow-sm text-gray-900'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <span className="absolute -top-2 right-2 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                        +SEO
                                    </span>
                                    Pro+
                                    {seoProFromPrice != null && (
                                        <span className="block text-xs font-normal text-gray-400">from ${seoProFromPrice}/mo billed annually</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Monthly Plan */}
                        {monthlyPlans.map((plan) => (
                            <div key={plan._id} className="border border-gray-200 rounded-lg p-6">
                                <div className="flex flex-col h-full justify-between">
                                    <div>
                                        <div className="mb-4">
                                            <div className="text-sm text-gray-500 mb-1">Monthly</div>
                                            <div className="text-3xl font-bold text-left">
                                                ${plan.price}
                                                <span className="text-base font-normal text-gray-500">/month</span>
                                            </div>
                                        </div>
                                        <ul className="space-y-2 mb-6">
                                            {plan.features.map((feature) => (
                                                <li key={feature} className="flex items-start text-sm text-gray-600">
                                                    <span className="mr-2 text-green-600">✓</span>
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <button
                                        onClick={() => handleSubscribe(plan.planId)}
                                        disabled={isLoading === plan.planId}
                                        className="w-full py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isLoading === plan.planId ? "Processing..." : "Get Started"}
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Annual Plan */}
                        {annualPlans.map((plan) => (
                            <div key={plan._id} className="border-2 border-primary rounded-lg p-6 relative">
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                    <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-bold">
                                        BEST VALUE
                                    </span>
                                </div>
                                <div className="flex flex-col h-full justify-between">
                                    <div>
                                        <div className="mb-4">
                                            <div className="text-sm text-gray-500 mb-1">Annual</div>
                                            <div className="text-3xl font-bold text-left">
                                                ${plan.monthlyEquivalent}
                                                <span className="text-base font-normal text-gray-500">/month</span>
                                            </div>
                                            <div className="text-xs text-green-600 font-medium mt-1">
                                                Billed ${plan.price}/year
                                                {tierMonthlyPlan && (tierMonthlyPlan.price * 12) > plan.price && (
                                                    <> • Save ${(tierMonthlyPlan.price * 12) - plan.price}</>
                                                )}
                                            </div>
                                        </div>
                                        <ul className="space-y-2 mb-6">
                                            {plan.features.map((feature) => (
                                                <li key={feature} className="flex items-start text-sm text-gray-600">
                                                    <span className="mr-2 text-green-600">✓</span>
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <button
                                        onClick={() => handleSubscribe(plan.planId)}
                                        onMouseEnter={() => setButtonHovered(true)}
                                        onMouseLeave={() => setButtonHovered(false)}
                                        disabled={isLoading === plan.planId}
                                        className={`w-full py-2.5 rounded-lg text-white text-sm font-medium relative overflow-hidden
                                            disabled:opacity-50 disabled:cursor-not-allowed
                                            transition-all duration-300 transform
                                            ${buttonHovered
                                                ? 'bg-black scale-105 shadow-lg'
                                                : 'bg-gradient-to-r from-primary to-gray-700 shadow-md'}`}
                                    >
                                        {!buttonHovered && !isLoading && (
                                            <div className="absolute inset-0 w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-10 animate-shine"></div>
                                        )}
                                        {isLoading === plan.planId ? "Processing..." : "Get Started"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="mt-4 text-center text-xs text-gray-500">
                        Cancel anytime. Your first article can be live on your site tomorrow.
                    </p>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                            {error}
                        </div>
                    )}
            </BaseModal>

            <style jsx>{`
                @keyframes shine {
                    0% {
                        transform: translateX(-100%);
                    }
                    100% {
                        transform: translateX(100%);
                    }
                }
                .animate-shine {
                    animation: shine 3s infinite;
                }
            `}</style>
        </>
    );
}

export default SubscriptionModal;