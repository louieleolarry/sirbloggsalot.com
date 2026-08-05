import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Sparkles, Shield, CreditCard, ArrowRight } from 'lucide-react';
import { useImpersonation } from '../contexts/ImpersonationContext';
import { useModals } from '../contexts/ModalContext';
import apiClient from '../utils/apiClient';

const SubscriptionRequired = () => {
  const navigate = useNavigate();
  const { user, currentSubscription } = useImpersonation();
  const { setShowSubscriptionModal } = useModals();
  const [selectedTier, setSelectedTier] = useState('growth'); // 'growth' or 'seo_pro'
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState(null);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  // Check if user already has subscription
  useEffect(() => {
    if (currentSubscription?.isActive) {
      navigate('/dashboard');
    }
  }, [currentSubscription, navigate]);

  // Fetch plans and onboarding data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, userRes] = await Promise.all([
          apiClient.get('/get-plans'),
          apiClient.get('/me')
        ]);

        if (plansRes.data.success && plansRes.data.data) {
          setPlans(plansRes.data.data.filter(p => p.isActive && !p.isRetentionPlan));
        }

        if (userRes.data.onboardingData) {
          setOnboardingData(userRes.data.onboardingData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSelectPlan = async (planId) => {
    if (isStartingCheckout) return;
    setIsStartingCheckout(true);
    setCheckoutError(null);
    try {
      const response = await apiClient.post('/checkout-session', {
        planId: planId,
        email: user?.email
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      setCheckoutError("We couldn't start checkout. You have not been charged. Please try again or email adam@blawgy.com.");
      setIsStartingCheckout(false);
    }
  };

  // Filter plans by tier and billing period
  const getFilteredPlans = () => {
    const tierPlans = plans.filter(p =>
      selectedTier === 'seo_pro' ? p.tier === 'seo_pro' : (!p.tier || p.tier === 'growth')
    );
    return tierPlans;
  };

  const filteredPlans = getFilteredPlans();
  const monthlyPlan = filteredPlans.find(p => p.billingPeriod === 'monthly');
  const annualPlan = filteredPlans.find(p => p.billingPeriod === 'annual');
  const selectedPlan = billingPeriod === 'monthly' ? monthlyPlan : annualPlan;

  const tiers = [
    {
      id: 'growth',
      name: 'Pro',
      description: 'Everything you need for organic growth',
      monthlyPrice: monthlyPlan?.price || 79,
      annualPrice: annualPlan?.price || 588,
      features: [
        '31 blog posts per month',
        'All platform integrations',
        'YouTube video embeds',
        'Internal linking',
        'Custom AI images',
        'Priority support'
      ]
    },
    {
      id: 'seo_pro',
      name: 'Pro+',
      description: 'SEO-powered content for maximum rankings',
      monthlyPrice: 129,
      annualPrice: 828,
      badge: 'SEO Powered',
      features: [
        'Everything in Pro, plus:',
        'Rankings dashboard',
        'Real search volume data',
        'Keyword difficulty scores',
        'Competitor gap analysis',
        'AI-powered content planning'
      ]
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Check className="w-4 h-4" />
            Your blog is ready to launch
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Start your 3-day free trial
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            No charge today. Cancel anytime. Your first AI article will be ready in minutes.
          </p>
        </motion.div>

        {/* Setup Summary */}
        {onboardingData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-gray-200 p-6 mb-8"
          >
            <h3 className="font-semibold text-gray-900 mb-4">Your blog setup</h3>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Website</span>
                <p className="font-medium text-gray-900">{onboardingData.site}</p>
              </div>
              <div>
                <span className="text-gray-500">First article</span>
                <p className="font-medium text-gray-900 line-clamp-1">
                  {onboardingData.selectedPremise?.title || 'Ready to generate'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Competitors tracked</span>
                <p className="font-medium text-gray-900">
                  {onboardingData.competitors?.length || 0} sites
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                billingPeriod === 'annual'
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500'
              }`}
            >
              Annual
              <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                Save 50%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {tiers.map((tier, idx) => {
            const isSelected = selectedTier === tier.id;
            const price = billingPeriod === 'monthly' ? tier.monthlyPrice : Math.round(tier.annualPrice / 12);

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                onClick={() => setSelectedTier(tier.id)}
                className={`
                  relative rounded-2xl p-6 cursor-pointer transition-all
                  ${isSelected
                    ? 'bg-gray-900 text-white ring-2 ring-gray-900'
                    : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                {tier.badge && (
                  <span className={`
                    absolute -top-3 left-6 px-3 py-1 rounded-full text-xs font-semibold
                    ${isSelected ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-700'}
                  `}>
                    {tier.badge}
                  </span>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                      {tier.name}
                    </h3>
                    <p className={`text-sm mt-1 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                      {tier.description}
                    </p>
                  </div>
                  <div className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center
                    ${isSelected
                      ? 'border-white bg-white'
                      : 'border-gray-300'
                    }
                  `}>
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <span className={`text-4xl font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                    ${price}
                  </span>
                  <span className={`text-sm ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                    /month
                  </span>
                  {billingPeriod === 'annual' && (
                    <p className={`text-xs mt-1 ${isSelected ? 'text-gray-400' : 'text-gray-400'}`}>
                      Billed annually at ${tier.annualPrice}
                    </p>
                  )}
                </div>

                <ul className="space-y-3">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        isSelected ? 'text-green-400' : 'text-green-600'
                      }`} />
                      <span className={isSelected ? 'text-gray-200' : 'text-gray-600'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          {checkoutError && (
            <div className="max-w-md mx-auto mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {checkoutError}
            </div>
          )}

          <button
            onClick={() => {
              const plan = selectedTier === 'seo_pro'
                ? plans.find(p => p.tier === 'seo_pro' && p.billingPeriod === billingPeriod)
                : plans.find(p => (!p.tier || p.tier === 'growth') && p.billingPeriod === billingPeriod);

              if (plan) {
                handleSelectPlan(plan.planId);
              }
            }}
            disabled={isStartingCheckout}
            className="
              inline-flex items-center gap-2 bg-gray-900 text-white
              px-8 py-4 rounded-xl font-semibold text-lg
              hover:bg-gray-800 transition-colors
              shadow-lg hover:shadow-xl
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isStartingCheckout ? 'Starting checkout...' : 'Start 3-day free trial'}
            <ArrowRight className="w-5 h-5" />
          </button>

          <p className="mt-4 text-sm text-gray-500">
            Cancel anytime during your trial. 30-day money-back guarantee after.
          </p>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 pt-8 border-t border-gray-200"
        >
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>SSL secured</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span>No charge for 3 days</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>First article in minutes</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SubscriptionRequired;
