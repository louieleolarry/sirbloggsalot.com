import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LoaderIcon, AlertCircleIcon, InfoIcon, CalendarIcon, TrendingUp, Search } from 'lucide-react';
import apiClient from '../utils/apiClient';
import { useImpersonation } from '../contexts/ImpersonationContext';

const PremiseApprovalModal = ({ premises, isOpen, onClose, onApprove, showCreditNotice = false, generationError, onRequireSubscription, frequency }) => {
  const { siteSettings, currentSubscription } = useImpersonation();
  const [products, setProducts] = useState([]);

  const validPremises = useMemo(() => (
    (premises || []).filter(premise => premise && (premise.title || premise.blogTitle))
  ), [premises]);

  const [selectedPremises, setSelectedPremises] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!siteSettings?.site) return;
    try {
      const response = await apiClient.get(`/api/products/${siteSettings.site}`);
      setProducts((response.data.products || []).filter(Boolean));
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, [siteSettings?.site]);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      setSelectedPremises(validPremises.map((_, index) => index));
    }
  }, [isOpen, fetchProducts, validPremises]);

  const getProductNames = (productIds) => {
    if (!productIds || productIds.length === 0) return [];
    return productIds
      .map(id => products.find(product => product && (String(product._id) === String(id))))
      .filter(Boolean)
      .map(product => product.name);
  };

  const togglePremise = (index) => {
    setSelectedPremises(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      }
      return [...prev, index];
    });
  };

  const handleApprove = async () => {
    const approvedPremises = selectedPremises
      .sort((a, b) => a - b)
      .map(index => validPremises[index])
      .filter(Boolean);

    // If user doesn't have an active subscription, save premises to localStorage and prompt subscription
    if (!currentSubscription?.isActive && onRequireSubscription) {
      const pendingData = {
        premises: validPremises,
        selectedIndices: selectedPremises,
        frequency: frequency || 7,
        site: siteSettings?.site,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('blawgy_pending_premises', JSON.stringify(pendingData));
      onRequireSubscription();
      return;
    }

    setIsSubmitting(true);
    await onApprove(approvedPremises);
    setIsSubmitting(false);
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-[60] ${isOpen ? 'block' : 'hidden'}`}>
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg w-[min(800px,95vw)] max-h-[85vh] flex flex-col min-h-0 shadow-xl">
        {/* Fixed Header */}
        <div className="p-6 sm:p-8 border-b flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Review Planned Articles</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-600 text-left mt-4">
            Select the articles you'd like to plan. Unselected articles will be discarded.
          </p>

          {/* Credit usage notice */}
          {showCreditNotice && (
            <div className="mt-4 p-3 bg-gray-100 border border-gray-200 rounded-lg flex items-start">
              <InfoIcon className="text-gray-700 mr-2 mt-0.5 flex-shrink-0" size={18} />
              <div className="text-sm text-gray-700">
                <p className="font-medium">No credits are used until articles are created</p>
                <p className="mt-1">Credits will only be consumed when articles are actually generated with the wand button or on their scheduled publish date.</p>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8">
          <div className="space-y-4">
            {validPremises.map((premise, index) => (
              <div
                key={`${premise.title}-${index}`}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedPremises.includes(index)
                  ? 'border-primary bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
                onClick={() => togglePremise(index)}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex items-center justify-center w-5 h-5 rounded-md flex-shrink-0 mt-1 transition-colors ${selectedPremises.includes(index)
                    ? 'bg-primary'
                    : 'border-2 border-gray-300'
                    }`}>
                    {selectedPremises.includes(index) && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">{premise.title}</h3>
                      {premise.source === 'seo-analysis' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <TrendingUp size={10} className="mr-1" />
                          SEO
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Keywords: {Array.isArray(premise.keywords) ? premise.keywords.join(', ') : premise.keywords}
                    </p>
                    {/* SEO metrics */}
                    {premise.seoMetrics && (
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                        <span className="flex items-center gap-1 text-gray-500">
                          <Search size={10} />
                          {premise.seoMetrics.searchVolume?.toLocaleString() || 0} monthly searches
                        </span>
                        {premise.seoMetrics.difficulty !== undefined && (
                          <span className={`px-1.5 py-0.5 rounded ${
                            premise.seoMetrics.difficulty < 30 ? 'bg-green-100 text-green-700' :
                            premise.seoMetrics.difficulty < 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            KD: {premise.seoMetrics.difficulty}
                          </span>
                        )}
                        {premise.seoMetrics.intent && (
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 capitalize">{premise.seoMetrics.intent}</span>
                        )}
                        {premise.seoMetrics.source && (
                          <span className={`px-1.5 py-0.5 rounded ${
                            premise.seoMetrics.source === 'suggestions' ? 'bg-blue-100 text-blue-700' :
                            premise.seoMetrics.source === 'related' ? 'bg-purple-100 text-purple-700' :
                            premise.seoMetrics.source === 'gap' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {premise.seoMetrics.source === 'suggestions' ? 'AI Suggested' :
                             premise.seoMetrics.source === 'related' ? 'Related Topic' :
                             premise.seoMetrics.source === 'gap' ? 'Competitor Gap' :
                             'From Your Site'}
                          </span>
                        )}
                        {premise.seoMetrics.opportunityScore && (
                          <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                            premise.seoMetrics.opportunityScore >= 50 ? 'bg-green-100 text-green-700' :
                            premise.seoMetrics.opportunityScore >= 25 ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {premise.seoMetrics.opportunityScore >= 50 ? '🎯' :
                             premise.seoMetrics.opportunityScore >= 25 ? '📈' : '•'}
                            {premise.seoMetrics.opportunityScore >= 50 ? 'Excellent' :
                             premise.seoMetrics.opportunityScore >= 25 ? 'Good' : 'Moderate'}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Why this keyword explanation */}
                    {premise.seoMetrics && (
                      <p className="text-xs text-gray-400 mt-1.5 italic">
                        {premise.seoMetrics.difficulty < 30 && premise.seoMetrics.searchVolume >= 100
                          ? '✨ Quick win: Low competition with solid search volume'
                          : premise.seoMetrics.source === 'gap'
                            ? '🔥 Your competitors rank for this - time to compete'
                            : premise.seoMetrics.intent === 'commercial'
                              ? '💰 Commercial intent - users may be ready to buy'
                              : premise.seoMetrics.intent === 'informational'
                                ? '📚 Info seekers - build authority with this topic'
                                : '📈 Good opportunity based on volume vs difficulty'}
                      </p>
                    )}
                    {/* Linked products */}
                    {Array.isArray(premise?.productIds) && premise.productIds.length > 0 && getProductNames(premise.productIds).length > 0 && (
                      <p className="text-sm text-gray-500">
                        Products: {getProductNames(premise.productIds).join(', ')}
                      </p>
                    )}
                    {/* Status tag */}
                    <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
                      <CalendarIcon size={12} className="mr-1" /> Planned
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-6 sm:p-8 border-t flex-shrink-0 bg-white">
          <div className="flex flex-wrap justify-end items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={selectedPremises.length === 0 || isSubmitting}
              className={`
                inline-flex items-center px-6 py-2 rounded-md text-white bg-primary
                hover:bg-primary-hover transition-colors font-medium whitespace-nowrap
                ${(selectedPremises.length === 0 || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isSubmitting ? (
                <>
                  <LoaderIcon className="animate-spin mr-2" size={18} />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span>Schedule {selectedPremises.length} Articles</span>
                </>
              )}
            </button>
          </div>

          {generationError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
              <AlertCircleIcon className="text-red-500 mr-3 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-red-600 text-sm">{generationError}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiseApprovalModal;