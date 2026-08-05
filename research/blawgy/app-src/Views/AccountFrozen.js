import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertOctagon, CreditCard, ExternalLink, RefreshCw } from 'lucide-react';
import apiClient from '../utils/apiClient';

const AccountFrozen = ({ subscription, onRetry }) => {
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState(null);

  const failedInvoiceUrl = subscription?.failedInvoiceUrl;
  const customerId = subscription?.customerId;
  const amount = subscription?.failedInvoiceAmount
    ? `$${(subscription.failedInvoiceAmount / 100).toFixed(2)}`
    : null;

  const handlePayInvoice = () => {
    if (failedInvoiceUrl) {
      window.location.href = failedInvoiceUrl;
    }
  };

  const handleManageBilling = async () => {
    if (!customerId) return;
    setPortalLoading(true);
    setPortalError(null);
    try {
      const { data } = await apiClient.post('/customer-portal', {
        customerId,
        returnUrl: window.location.origin,
      });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setPortalError('Could not open billing portal. Try again or use the Pay invoice button.');
      }
    } catch (err) {
      console.error('customer-portal error:', err);
      setPortalError('Could not open billing portal. Try again or use the Pay invoice button.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleRefresh = () => {
    if (onRetry) onRetry();
    else window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-lg w-full"
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-red-600 px-6 py-5 flex items-center gap-3">
            <AlertOctagon className="w-7 h-7 text-white" />
            <div>
              <div className="text-white text-xs font-semibold uppercase tracking-wider opacity-80">
                Billing
              </div>
              <h1 className="text-white text-2xl font-bold leading-tight">
                Account frozen
              </h1>
            </div>
          </div>

          <div className="px-6 py-6 space-y-5">
            <div>
              <p className="text-gray-900 font-semibold mb-1">
                Your last payment{amount ? ` of ${amount}` : ''} was declined by your bank.
              </p>
              <p className="text-gray-600 text-sm leading-relaxed">
                Article writing, scheduling, and publishing are paused for this site
                until payment is fixed. Update your card or pay the open invoice to
                resume immediately.
              </p>
            </div>

            <div className="space-y-2">
              {failedInvoiceUrl ? (
                <button
                  onClick={handlePayInvoice}
                  className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <CreditCard className="w-5 h-5" />
                  Pay invoice &amp; update card
                  <ExternalLink className="w-4 h-4 opacity-70" />
                </button>
              ) : null}

              {customerId ? (
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="w-full bg-white border border-gray-300 hover:border-gray-400 text-gray-900 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {portalLoading ? 'Opening…' : 'Manage billing'}
                </button>
              ) : null}

              <button
                onClick={handleRefresh}
                className="w-full text-gray-500 hover:text-gray-700 text-sm font-medium py-2 flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                I paid — refresh status
              </button>
            </div>

            {portalError ? (
              <p className="text-red-600 text-sm">{portalError}</p>
            ) : null}

            <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
              Once payment clears, your account unlocks automatically and any paused
              articles resume on their original schedule. Need help? Reply to your
              billing email or ping support in-app.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AccountFrozen;
