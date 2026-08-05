import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, FileText, Clock, Trash2, Calendar, ChevronRight } from 'lucide-react';

const DraftsModal = ({ 
  isOpen, 
  onClose, 
  drafts = [], 
  publishedArticles = [], 
  onSelectDraft, 
  onDeleteDraft, 
  onNewArticle,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState('drafts'); // 'drafts' or 'published'
  const [deletingId, setDeletingId] = useState(null);

  if (!isOpen) return null;

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (ms) => {
    if (!ms) return 'N/A';
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const getStepLabel = (step) => {
    const labels = {
      'define': 'Define',
      'title': 'Title Selection',
      'outline': 'Outline',
      'article': 'Article Review',
      'review': 'Final Review'
    };
    return labels[step] || step;
  };

  const handleDelete = async (e, draftId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      setDeletingId(draftId);
      try {
        await onDeleteDraft(draftId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl shadow-xl">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Write</h3>
                <p className="mt-1 text-sm text-gray-500">Continue where you left off or start fresh</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mt-4 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('drafts')}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'drafts'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Drafts {drafts.length > 0 && `(${drafts.length})`}
              </button>
              <button
                onClick={() => setActiveTab('published')}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'published'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Published {publishedArticles.length > 0 && `(${publishedArticles.length})`}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : activeTab === 'drafts' ? (
              <div className="space-y-3">
                {drafts.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No drafts yet. Start creating your first article!</p>
                  </div>
                ) : (
                  drafts.map((draft) => (
                    <motion.div
                      key={draft.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      onClick={() => onSelectDraft(draft)}
                      className="group relative p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all cursor-pointer bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-semibold text-gray-900 truncate group-hover:text-gray-700 transition-colors">
                            {draft.name}
                          </h4>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            {draft.preview?.articleType && (
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {draft.preview.articleType}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(draft.updatedAt)}
                            </span>
                            {draft.analytics?.totalTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(draft.analytics.totalTime)}
                              </span>
                            )}
                          </div>
                          
                          {/* Progress indicator */}
                          <div className="mt-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600">
                                {getStepLabel(draft.currentStep)}
                              </span>
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ 
                                    width: `${
                                      draft.currentStep === 'define' ? '25%' :
                                      draft.currentStep === 'title' ? '50%' :
                                      draft.currentStep === 'outline' ? '75%' :
                                      '100%'
                                    }`
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={(e) => handleDelete(e, draft.id)}
                            disabled={deletingId === draft.id}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete draft"
                          >
                            {deletingId === draft.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-700 transition-colors" />
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {publishedArticles.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No published articles yet.</p>
                  </div>
                ) : (
                  publishedArticles.map((article) => (
                    <motion.div
                      key={article.id || article._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 border border-gray-200 rounded-lg bg-white hover:border-green-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-semibold text-gray-900 truncate">
                            {article.title || article.blogTitle}
                          </h4>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(article.publishDate)}
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              Published
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onNewArticle}
              className="px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
            >
              Start New Article
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraftsModal;

