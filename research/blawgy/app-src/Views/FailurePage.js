import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import apiClient from '../utils/apiClient';
import { useImpersonation } from '../contexts/ImpersonationContext';

function FailurePage({ email }) {
    const { currentSite } = useImpersonation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const planId = searchParams.get('planId');
    const [isRetrying, setIsRetrying] = React.useState(false);
    const [checkoutError, setCheckoutError] = React.useState(null);

    const handleRetryPayment = async () => {
        if (isRetrying) return;
        setIsRetrying(true);
        setCheckoutError(null);
        try {
            const response = await apiClient.post('/checkout-session', {
                planId,
                email,
                site: currentSite,
                referral: window.promotekit_referral || null
            });

            if (response.data?.url) {
                window.location.href = response.data.url;
            } else {
                throw new Error('No checkout URL received');
            }
        } catch (error) {
            console.error('Checkout session error:', error);
            setCheckoutError("We couldn't start checkout. You have not been charged. Please try again or email adam@blawgy.com.");
            setIsRetrying(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA]">
            <div className="w-[420px] bg-white rounded-lg p-8 shadow-[0_1px_3px_0_rgba(0,0,0,0.1)]">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-6">
                        <XCircle className="w-6 h-6 text-red-500" />
                    </div>

                    <h2 className="text-xl font-semibold text-center mb-2">
                        Payment Failed
                    </h2>

                    <p className="text-gray-600 text-center mb-4">
                        We're sorry, but your payment could not be processed.
                    </p>

                    {checkoutError && (
                        <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 text-center">
                            {checkoutError}
                        </div>
                    )}

                    <div className="flex flex-col gap-3 w-full">
                        {planId && (
                            <button
                                onClick={handleRetryPayment}
                                disabled={isRetrying}
                                className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isRetrying ? 'Starting checkout...' : 'Retry Payment'}
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Go to Dashboard Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FailurePage; 