import React from 'react';
import { CalendarIcon, Plug, ArrowRight, Monitor } from 'lucide-react';
import { useImpersonation } from '../../contexts/ImpersonationContext';
import { useNavigate } from 'react-router-dom';

const MobileNotice = () => (
  <div className="sm:hidden bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-center">
    <Monitor className="w-5 h-5 text-gray-400 mx-auto mb-2" />
    <p className="text-xs text-gray-500">
      Blawgy is designed for desktop. For the best experience, please visit on a computer.
    </p>
  </div>
);

const EmptyDashboard = ({ onStartBulkGenerate }) => {
  const { currentSubscription, siteSettings } = useImpersonation();
  const navigate = useNavigate();
  const isSubscribed = currentSubscription?.isActive;
  const hasCms = !!siteSettings?.blogType;

  // If no CMS connected, prompt that first
  if (!hasCms) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-20 px-4" data-tour="articles-table">
        <div className="w-full max-w-lg text-center">
          <MobileNotice />
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-orange-50 mx-auto mb-5">
            <Plug className="w-7 h-7 text-orange-500" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            Connect your website
          </h3>
          <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto">
            Your plan is ready. One step left: connect WordPress, Shopify, or your platform and Blawgy publishes every post for you. Prefer to review first? You can set posts to publish as drafts.
          </p>
          <button
            onClick={() => navigate('/settings/cms-connect')}
            className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover shadow-sm transition-all w-full sm:w-auto justify-center"
          >
            Connect my website
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
          <button
            onClick={onStartBulkGenerate}
            data-tour="bulk-schedule-btn"
            data-testid="bulk-schedule-button"
            className="block mx-auto mt-3 text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
          >
            Skip for now and generate article ideas first
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-20 px-4" data-tour="articles-table">
      <div className="w-full max-w-lg text-center">
        <MobileNotice />
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
          No articles yet
        </h3>
        <p className="text-sm text-gray-500 mb-8">
          {isSubscribed
            ? 'Generate article ideas and schedule them for publishing.'
            : 'Generate article ideas for free. Subscribe when you\'re ready to publish.'}
        </p>
        <button
          onClick={onStartBulkGenerate}
          data-tour="bulk-schedule-btn"
          data-testid="bulk-schedule-button"
          className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover shadow-sm transition-all w-full sm:w-auto justify-center"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          Schedule Your First Articles
        </button>
      </div>
    </div>
  );
};

export default EmptyDashboard;
