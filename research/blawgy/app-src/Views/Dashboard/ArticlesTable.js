import React from 'react';
import { EyeIcon, EditIcon, Wand2Icon, XIcon, RefreshCcwIcon, Clock, PenLine, LoaderIcon, AlertCircle, TrendingUp, Send, FileText } from 'lucide-react';
import { formatDate } from '../../utils/dateFormatter';
import DatePickerPortal from '../../components/DatePicker/DatePickerPortal';
import Tooltip from '../../components/Tooltip';
import styles from './dashboard.module.css';

// Rows created via add-to-plan carry `title: null` until generation writes one,
// which rendered blank Article Title cells. Sentence-style capitalize a keyword
// so a titleless row still reads as a real, human title.
const titleCase = (s) => {
  if (typeof s !== 'string') return '';
  const trimmed = s.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

// Never show a blank Article Title. Prefer a real title, then any legacy
// blogTitle, then a capitalized keyword, and finally a plain "Untitled".
// `fromFallback` tells the cell to render muted so real titles stand out.
export const resolveTitle = (article) => {
  if (article?.title) return { text: article.title, fromFallback: false };
  if (article?.blogTitle) return { text: article.blogTitle, fromFallback: false };
  const kw = article?.keyword || (Array.isArray(article?.keywords) ? article.keywords[0] : undefined);
  const cased = titleCase(kw);
  if (cased) return { text: cased, fromFallback: true };
  return { text: 'Untitled', fromFallback: true };
};

const ArticleActions = ({
  article, showPublished, publishedCount,
  onEdit, onPreview, onGenerate, onRepublish, onPublish, trialLimitReached
}) => {
  const articleId = article.id.$oid || article.id;

  if (article.blogStatus === 'published') {
    return (
      <div className="flex items-center gap-2">
        <Tooltip content="Preview article">
          <button
            className={`p-1.5 text-primary hover:bg-gray-50 rounded-full transition-colors ${showPublished && publishedCount === 1 ? 'preview-pulse' : ''}`}
            onClick={(e) => { e.stopPropagation(); onPreview(articleId); }}
          >
            <EyeIcon size={18} />
          </button>
        </Tooltip>
        <Tooltip content="Republish article">
          <button
            className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-full transition-colors"
            onClick={(e) => { e.stopPropagation(); onRepublish(article); }}
          >
            <RefreshCcwIcon size={18} />
          </button>
        </Tooltip>
        <Tooltip content="Edit article">
          <button
            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
            onClick={(e) => { e.stopPropagation(); onEdit(article); }}
          >
            <EditIcon size={18} />
          </button>
        </Tooltip>
      </div>
    );
  }

  if (article.hasContent) {
    return (
      <div className="flex items-center gap-2">
        <Tooltip content="Preview article">
          <button
            className={`p-1.5 text-primary hover:bg-gray-50 rounded-full transition-colors ${showPublished && publishedCount === 1 ? 'preview-pulse' : ''}`}
            onClick={(e) => { e.stopPropagation(); onPreview(articleId); }}
          >
            <EyeIcon size={18} />
          </button>
        </Tooltip>
        {article.blogStatus === 'cms_draft' && (
          <Tooltip content="Publish this draft to your site">
            <button
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
              onClick={(e) => { e.stopPropagation(); onPublish(article); }}
            >
              <Send size={18} />
            </button>
          </Tooltip>
        )}
        {article.blogStatus === 'failed' && (
          <Tooltip content="Retry publishing">
            <button
              className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-full transition-colors"
              onClick={(e) => { e.stopPropagation(); onRepublish(article); }}
            >
              <RefreshCcwIcon size={18} />
            </button>
          </Tooltip>
        )}
        <Tooltip content="Edit article">
          <button
            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
            onClick={(e) => { e.stopPropagation(); onEdit(article); }}
          >
            <EditIcon size={18} />
          </button>
        </Tooltip>
      </div>
    );
  }

  const isProcessing = article.blogStatus === 'in_queue' || article.blogStatus === 'generating';
  const isDisabled = isProcessing || trialLimitReached;

  return (
    <Tooltip content={
      trialLimitReached ? "Trial limit reached - upgrade to generate" :
      article.blogStatus === 'in_queue' ? "Waiting in queue..." :
      article.blogStatus === 'generating' ? "Writing article..." :
      "Generate article (uses 1 credit)"
    }>
      <button
        className={`p-2 rounded-lg transition-colors flex items-center ${
          isDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-primary hover:bg-gray-50'
        }`}
        onClick={(e) => { e.stopPropagation(); if (!isDisabled) onGenerate(article); }}
        disabled={isDisabled}
      >
        {article.blogStatus === 'in_queue' ? (
          <Clock size={18} className="text-blue-500" />
        ) : article.blogStatus === 'generating' ? (
          <PenLine size={18} className="text-yellow-600 animate-pulse" />
        ) : (
          <Wand2Icon size={16} className={trialLimitReached ? 'opacity-50' : ''} />
        )}
      </button>
    </Tooltip>
  );
};

const ArticlesTable = ({
  articles, selectedArticles, statusFilter, showPublished, publishedCount, currentSite, email,
  onSelectAll, onSelectArticle, onRowClick, onEdit, onGenerate, onDelete, deletingArticleId, onRepublish, onPublish,
  editingDateId, datePickerPosition, onDateClick, onDateChange, onDatePickerClose, trialLimitReached
}) => {
  const getDateColumnHeader = () => {
    switch (statusFilter) {
      case 'published': return 'Published Date';
      case 'scheduled': return 'Scheduled Date';
      case 'generated': return 'Generated Date';
      case 'cms_draft': return 'Draft Date';
      case 'processing': return 'Processing Date';
      default: return 'Scheduled Date';
    }
  };

  const handlePreview = (articleId) => {
    window.open(`/preview/${currentSite || email}/${articleId}`, '_blank');
  };

  return (
    <div data-tour="articles-table" className="w-full overflow-x-auto pb-8">
      <table className={`${styles.articles_table} w-full`}>
        <thead>
          <tr className={`${styles.table_header} border-b`}>
            <th>
              <input
                type="checkbox"
                className="m-2 form-checkbox h-5 w-5 text-gray-900 rounded border-gray-300 cursor-pointer focus:ring-gray-500"
                checked={articles.length > 0 && articles.every(a => selectedArticles.includes(a.id.$oid || a.id))}
                onChange={onSelectAll}
                aria-label="Select all articles"
              />
            </th>
            <th className="px-6 py-5 text-lg text-left">Article Title</th>
            <th className="px-6 py-5 text-lg text-left hidden md:table-cell">Target Keyword</th>
            <th className="px-6 py-5 text-lg text-right w-24">Actions</th>
            <th className="px-6 py-5 text-lg text-left hidden md:table-cell min-w-[180px] w-[210px]">
              {getDateColumnHeader()}
            </th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article, index) => {
            const articleId = article.id.$oid || article.id;
            const { text: displayTitle, fromFallback: titleIsFallback } = resolveTitle(article);
            return (
              <tr
                key={articleId}
                className="border-b group cursor-pointer hover:bg-gray-50"
              >
                <td>
                  <input
                    type="checkbox"
                    className="m-2 form-checkbox h-5 w-5 text-gray-900 rounded border-gray-300 cursor-pointer focus:ring-gray-500"
                    checked={selectedArticles.includes(articleId)}
                    onChange={(e) => onSelectArticle(articleId, e?.target?.checked)}
                    aria-label="Select article"
                  />
                </td>
                <td className="px-6 py-4 text-sm text-left" onClick={() => onRowClick(article)}>
                  <div className="flex items-center gap-2">
                    {titleIsFallback ? (
                      <Tooltip content="We'll write the final headline when the article is generated">
                        <span className={`truncate italic text-slate-500 ${article.blogStatus === 'generating' ? 'animate-pulse' : ''}`}>
                          {displayTitle}
                        </span>
                      </Tooltip>
                    ) : (
                      <span className={`truncate ${article.blogStatus === 'generating' ? 'animate-pulse' : ''}`}>
                        {displayTitle}
                      </span>
                    )}
                    {article.blogStatus === 'in_queue' && (
                      <span className="flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800" title="Waiting in queue. Writing usually takes about 5 minutes.">
                        <Clock size={12} className="mr-1" />
                        In Queue
                      </span>
                    )}
                    {article.blogStatus === 'generating' && (
                      <span className="flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 animate-pulse" title="Writing now. This usually takes about 5 minutes.">
                        <PenLine size={12} className="mr-1" />
                        Writing...
                      </span>
                    )}
                    {article.blogStatus === 'failed' && (
                      <span className="flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertCircle size={12} className="mr-1" />
                        Failed
                      </span>
                    )}
                    {article.source === 'seo-analysis' && (
                      <span className="flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800" title={`SEO optimized: ${article.seoMetrics?.targetKeyword || 'keyword targeting'}`}>
                        <TrendingUp size={12} className="mr-1" />
                        SEO
                      </span>
                    )}
                    {article.blogStatus === 'cms_draft' && (
                      <span className="flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800" title="Saved to your site as a draft, awaiting review and publish">
                        <FileText size={12} className="mr-1" />
                        Draft
                      </span>
                    )}
                  </div>
                  {/* Failure reason is visible text (not hover-only) with a Retry
                      action, so a failed article is never a silent dead end. */}
                  {article.blogStatus === 'failed' && (
                    <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-red-600">
                        {article.failureReason || "This article couldn't finish. Try again."}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onRepublish(article); }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <RefreshCcwIcon size={12} />
                        Retry
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 text-left hidden md:table-cell" onClick={() => onRowClick(article)}>
                  {Array.isArray(article.keywords) && article.keywords.length > 0
                    ? article.keywords.join(', ')
                    : article.keyword || article.seoMetrics?.targetKeyword || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex justify-end gap-2">
                    <ArticleActions
                      article={article}
                      showPublished={showPublished}
                      publishedCount={publishedCount}
                      onEdit={onEdit}
                      onPreview={handlePreview}
                      onGenerate={() => onGenerate(article, index)}
                      onRepublish={onRepublish}
                      onPublish={onPublish}
                      trialLimitReached={trialLimitReached}
                    />
                    {article?.blogStatus !== 'published' && (
                      <Tooltip content={deletingArticleId === articleId ? "Deleting..." : "Delete article"}>
                        <button
                          className={`p-1.5 rounded-full transition-colors ${
                            deletingArticleId === articleId
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-[#DC2626] hover:bg-gray-50'
                          }`}
                          onClick={() => onDelete(articleId)}
                          disabled={deletingArticleId === articleId}
                        >
                          {deletingArticleId === articleId ? (
                            <LoaderIcon size={18} className="animate-spin" />
                          ) : (
                            <XIcon size={18} />
                          )}
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 text-left hidden md:table-cell">
                  <button
                    onClick={(e) => onDateClick(e, article.id)}
                    className="w-full text-left hover:bg-gray-50 p-1 rounded"
                  >
                    {formatDate(article.publishDate)}
                  </button>
                  <DatePickerPortal
                    isOpen={editingDateId === article.id}
                    position={datePickerPosition}
                    value={article.publishDate}
                    onChange={(date) => onDateChange(article.id, date)}
                    onClose={onDatePickerClose}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ArticlesTable;
