import React, { useState } from 'react';
import { XIcon, CalendarIcon, Wand2Icon, LoaderIcon, AlertTriangle } from 'lucide-react';
import DatePickerPortal from '../../components/DatePicker/DatePickerPortal';
import ProductSelector from '../../components/ProductSelector';
import { BaseModal, useEscapeKey } from '../../components/Modals';

// Re-export the shared Esc hook so existing imports keep working.
export { useEscapeKey };

// The full-screen article editor lives in ./ArticleEditor.js (the old cramped
// EditArticleModal it replaced was removed from here).

export const QuickEditModal = ({
  article, onClose, onSave, title, keywords,
  onTitleChange, onKeywordsChange, productIds, onProductIdsChange, isSaving
}) => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const [publishDate, setPublishDate] = useState(article.publishDate ? new Date(article.publishDate) : null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerPosition, setDatePickerPosition] = useState({ top: 0, left: 0 });

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (isMac ? e.metaKey : e.ctrlKey)) {
      handleSave();
    }
  };

  const handleSave = () => {
    if (isSaving) return;
    onSave({ publishDate: publishDate ? publishDate.toISOString() : article.publishDate });
  };

  const formatDisplayDate = (date) => {
    if (!date) return 'Select date';
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const handleDateButtonClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDatePickerPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
    setShowDatePicker(!showDatePicker);
  };

  return (
    <BaseModal onClose={onClose} className="rounded-xl" overlayClassName="z-50">
      <div className="flex flex-col min-h-0">
        <div className="flex justify-between items-center px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Edit Article</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <XIcon size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 flex-1 min-h-0 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 text-left">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-left"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 text-left">Keywords</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => onKeywordsChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-left"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 text-left">Publish Date</label>
            <button
              onClick={handleDateButtonClick}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-left bg-white hover:bg-gray-50 transition-colors flex items-center"
            >
              <CalendarIcon size={16} className="text-gray-400 mr-2" />
              {formatDisplayDate(publishDate)}
            </button>
            <DatePickerPortal
              isOpen={showDatePicker}
              position={datePickerPosition}
              value={publishDate}
              onChange={(date) => { setPublishDate(date); setShowDatePicker(false); }}
              onClose={() => setShowDatePicker(false)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 text-left">Linked Products</label>
            <ProductSelector
              selectedProductIds={productIds}
              onChange={onProductIdsChange}
              maxSelections={5}
              compact={true}
              hideLabel={true}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-opacity-90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
            <span className="text-xs opacity-75">{isMac ? '⌘' : 'Ctrl'}+↵</span>
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export const ExportDialog = ({ isOpen, onClose, message }) => (
  <BaseModal isOpen={isOpen} onClose={onClose} className="rounded-lg shadow-lg p-6 max-w-[400px]" overlayClassName="z-50">
    <div className="w-full">
      <div className="flex flex-col justify-start">
        <h2 className="text-lg font-semibold text-left">Export Successful</h2>
        <p className="text-sm text-gray-600 mt-2 text-left">{message}</p>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          className="py-2 px-4 bg-black text-white font-medium text-sm rounded hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  </BaseModal>
);

// Destructive-action confirm. Used for deleting written articles and bulk
// deletes so a credit-costing article can never vanish on one click.
export const ConfirmDialog = ({ title, body, confirmLabel = 'Confirm', onConfirm, onClose }) => (
  <BaseModal onClose={onClose} className="p-6 max-w-md" overlayClassName="z-[90]">
    <div className="w-full">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" size={22} />
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>
      <p className="text-gray-600 mb-6">{body}</p>
      <div className="flex justify-end gap-3">
        <button
          className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </BaseModal>
);

export const GenerateConfirmModal = ({ articleTitle, creditBalance, onClose, onConfirm }) => {
  // Only show a credit denominator when we actually know the balance.
  const creditLine = (typeof creditBalance === 'number')
    ? `Uses 1 of your ${creditBalance} credit${creditBalance === 1 ? '' : 's'}`
    : 'Uses 1 credit';
  return (
    <BaseModal onClose={onClose} className="max-w-md rounded-xl" overlayClassName="z-[80]">
      <div className="flex flex-col min-h-0">
        <div className="flex justify-between items-center px-6 py-4 border-b flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">Write this article?</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
            <XIcon size={20} />
          </button>
        </div>
        <div className="px-6 py-5 text-left">
          {articleTitle && (
            <p className="text-sm font-semibold text-gray-900 leading-snug">{articleTitle}</p>
          )}
          <div className={`rounded-lg border border-gray-200 bg-gray-50 p-3 ${articleTitle ? 'mt-4' : ''}`}>
            <p className="text-sm font-medium text-gray-800">{creditLine}</p>
            <p className="mt-1 text-sm text-gray-600">
              We'll write this article now. It usually takes about 5 minutes. You can leave this page; we'll keep going in the background.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl flex-shrink-0">
          <button
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
            onClick={onConfirm}
          >
            <Wand2Icon size={16} />
            Generate article
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export const BulkGenerateConfirmModal = ({ count, selectedCount, onClose, onConfirm, isGenerating }) => {
  // When a trial cap trims the request, `count` is what we'll actually queue and
  // `selectedCount` is what the user picked. Show the honest math up front.
  const trialCapped = typeof selectedCount === 'number' && selectedCount > count;
  return (
  <BaseModal onClose={onClose} className="max-w-md rounded-xl" overlayClassName="z-[80]">
    <div className="flex flex-col min-h-0">
      <div className="flex justify-between items-center px-6 py-4 border-b flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900">Generate {count} article{count === 1 ? '' : 's'}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
          <XIcon size={20} />
        </button>
      </div>
      <div className="px-6 py-5 text-left space-y-3">
        {trialCapped && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-800">
              You selected {selectedCount}, but your trial has {count} article{count === 1 ? '' : 's'} left. We'll generate {count} now.
            </p>
          </div>
        )}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm font-medium text-gray-800">
            This will use {count} credit{count > 1 ? 's' : ''}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Articles will be added to a queue and generated one at a time in the background.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm font-medium text-gray-800">
            Estimated time: ~{count * 5} minutes total
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {count} article{count === 1 ? '' : 's'} at about 5 minutes each. You can close this page and generation continues in the background.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl flex-shrink-0">
        <button
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onConfirm}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <LoaderIcon className="animate-spin" size={16} />
          ) : (
            <Wand2Icon size={16} />
          )}
          Generate all
        </button>
      </div>
    </div>
  </BaseModal>
  );
};
