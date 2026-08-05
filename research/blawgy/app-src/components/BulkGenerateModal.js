// Mint video upload smoke test
// Mint QA smoke test trigger (no-op).
import React, { useState, useEffect, useMemo } from 'react';
import { LoaderIcon, CalendarIcon, InfoIcon, AlertCircleIcon, PlusIcon, SearchIcon, ChevronDown } from 'lucide-react';
import apiClient from '../utils/apiClient';
import PremiseApprovalModal from './PremiseApprovalModal';
import BaseModal from './Modals';

const SUGGEST_COUNT_OPTIONS = [
  { value: '10', label: '10 keywords' },
  { value: '25', label: '25 keywords' },
  { value: '50', label: '50 keywords' },
  { value: '100', label: '100 keywords' },
  { value: '200', label: '200 keywords' },
  { value: 'unlimited', label: 'Unlimited' }
];

const SUGGEST_STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'was', 'one', 'our', 'out',
  'only', 'keywords', 'keyword', 'related', 'about', 'with', 'that', 'this', 'from', 'have', 'your',
  'what', 'which', 'when', 'where', 'would', 'should', 'like', 'want', 'need', 'use', 'using', 'them'
]);

function getDescriptionMatchers(description = '') {
  const normalized = description.toLowerCase().trim();
  const words = normalized
    .split(/[^a-z0-9]+/)
    .filter(word => word.length > 1 && !SUGGEST_STOPWORDS.has(word));

  const terms = words.filter(word => word.length > 2);
  const phrases = [];

  for (let index = 0; index < words.length - 1; index += 1) {
    phrases.push(`${words[index]} ${words[index + 1]}`);
  }

  for (let index = 0; index < words.length - 2; index += 1) {
    phrases.push(`${words[index]} ${words[index + 1]} ${words[index + 2]}`);
  }

  return {
    terms,
    phrases: [...new Set(phrases)].sort((first, second) => second.length - first.length),
    filterQuery: [...new Set(phrases), ...terms].sort((first, second) => second.length - first.length)[0] || ''
  };
}

function scoreKeywordMatch(keyword, matchers) {
  const normalized = keyword.toLowerCase();
  let score = 0;

  matchers.phrases.forEach(phrase => {
    if (normalized.includes(phrase)) score += 4;
  });

  matchers.terms.forEach(term => {
    if (normalized.includes(term)) score += 1;
  });

  return score;
}

const BulkGenerateModal = ({ isOpen, onClose, onGenerate, email, impersonatedSite, fetchArticles, user, subscription, onRequireSubscription }) => {
  const [frequency, setFrequency] = useState(7);
  const [count, setCount] = useState(20);
  const [isGenerating, setIsGenerating] = useState(false);
  const [premises, setPremises] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  // No streaming progress anymore — /generate-premises is a one-shot response.
  // isGenerating drives the button spinner; the modal body shows a wait message.
  const [generationError, setGenerationError] = useState(null);
  const [keywordMode, setKeywordMode] = useState('saved');
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [customKeywordsText, setCustomKeywordsText] = useState('');
  const [keywordGroups, setKeywordGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [aiKeywordDescription, setAiKeywordDescription] = useState('');
  const [aiSuggestCount, setAiSuggestCount] = useState('25');
  const [keywordSearchQuery, setKeywordSearchQuery] = useState('');
  const [suggestMessage, setSuggestMessage] = useState(null);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [savedKeywordScope, setSavedKeywordScope] = useState('all');
  const [showGroupOptions, setShowGroupOptions] = useState(false);

  // Normalize defensively: legacy site records may hold a mix of plain
  // strings and {keyword, volume, difficulty, source} objects from older
  // SeoAnalysis saves. Rendering those objects as React children blew up
  // the "Pick specific" chip list with "Objects are not valid as a React
  // child." Coerce everything to a trimmed string here so the rest of the
  // modal can stay simple.
  const savedKeywords = useMemo(() => {
    const raw = Array.isArray(impersonatedSite?.keywords) ? impersonatedSite.keywords : [];
    const seen = new Set();
    const out = [];
    for (const item of raw) {
      let str = '';
      if (typeof item === 'string') str = item.trim();
      else if (item && typeof item === 'object') {
        const candidate = item.keyword ?? item.kw ?? item.term ?? item.text ?? item.name;
        if (typeof candidate === 'string') str = candidate.trim();
      } else if (typeof item === 'number' || typeof item === 'boolean') {
        str = String(item).trim();
      }
      if (!str) continue;
      const key = str.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(str);
    }
    return out;
  }, [impersonatedSite?.keywords]);

  const suggestCountOptions = savedKeywords.length > 0 ? SUGGEST_COUNT_OPTIONS : [];

  const getSuggestLimit = (countValue = aiSuggestCount) => {
    if (countValue === 'unlimited') return savedKeywords.length;
    return Math.min(Number(countValue), savedKeywords.length);
  };

  const filteredSavedKeywords = useMemo(() => {
    const query = keywordSearchQuery.trim().toLowerCase();
    if (!query) return savedKeywords;
    return savedKeywords.filter(keyword => keyword.toLowerCase().includes(query));
  }, [savedKeywords, keywordSearchQuery]);

  const savedKeywordGroups = useMemo(() => (
    Array.isArray(impersonatedSite?.keywordGroups)
      ? impersonatedSite.keywordGroups.filter(group => group?.name && Array.isArray(group.keywords))
      : []
  ), [impersonatedSite?.keywordGroups]);

  const customKeywords = customKeywordsText
    .split(/[\n,]/)
    .map(keyword => keyword.trim())
    .filter(Boolean);

  const selectedGroup = keywordGroups.find(group => group.id === selectedGroupId);
  const groupKeywords = selectedGroup?.keywords || [];
  const keywordsForGeneration = keywordMode === 'custom'
    ? customKeywords
    : keywordMode === 'group'
      ? groupKeywords
      : savedKeywordScope === 'all'
        ? savedKeywords
        : selectedKeywords;

  useEffect(() => {
    if (!isOpen) return;
    setKeywordMode(savedKeywords.length > 0 ? 'saved' : 'custom');
    setSavedKeywordScope('all');
    setSelectedKeywords([]);
    setCustomKeywordsText('');
    setKeywordGroups(savedKeywordGroups);
    setSelectedGroupId(savedKeywordGroups[0]?.id || '');
    setNewGroupName('');
    setAiKeywordDescription('');
    setKeywordSearchQuery('');
    setSuggestMessage(null);
    setAiSuggestCount('25');
    setShowGroupOptions(false);
  }, [isOpen, savedKeywordGroups, savedKeywords, savedKeywords.length]);

  useEffect(() => {
    if (keywordMode === 'custom') {
      setShowGroupOptions(true);
    }
  }, [keywordMode]);

  const frequencyOptions = [
    { value: 2, label: '2 posts per week' },
    { value: 3, label: '3 posts per week' },
    { value: 4, label: '4 posts per week' },
    { value: 5, label: '5 posts per week' },
    { value: 6, label: '6 posts per week' },
    { value: 7, label: 'Daily posts' },
    ...(user?.isAdmin ? [{ value: 49, label: '7 posts per day' }] : []),
  ];

  const countOptions = Array.from({ length: 8 }, (_, i) => ({
    value: (i + 1) * 10,
    label: `${(i + 1) * 10} articles`
  }));

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setGenerationError(null);

      if (keywordsForGeneration.length === 0) {
        setGenerationError('Select or enter at least one keyword for bulk scheduling.');
        return;
      }

      const { data } = await apiClient.post('/generate-premises', {
        email: impersonatedSite ? impersonatedSite.email : email,
        site: impersonatedSite ? impersonatedSite.site : undefined,
        count,
        customKeywords: keywordsForGeneration
      });

      if (!data?.success || !Array.isArray(data.premises) || data.premises.length === 0) {
        setGenerationError(data?.message || 'An error occurred while generating premises');
        return;
      }

      const cleanedPremises = data.premises
        .filter(premise => premise && (premise.title || premise.blogTitle))
        .map(premise => ({
          ...premise,
          title: premise.title || premise.blogTitle,
          keywords: Array.isArray(premise.keywords) ? premise.keywords.filter(Boolean) : [],
          productIds: Array.isArray(premise.productIds) ? premise.productIds.filter(Boolean) : []
        }));

      setPremises(cleanedPremises);
      setShowApprovalModal(true);
    } catch (error) {
      console.error('Error generating premises:', error);
      const serverMessage = error?.response?.data?.message;
      setGenerationError(serverMessage || 'An error occurred while generating premises');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSavedKeyword = (keyword) => {
    setSelectedKeywords(current =>
      current.includes(keyword)
        ? current.filter(item => item !== keyword)
        : [...current, keyword]
    );
  };

  const selectAllVisibleKeywords = () => {
    if (filteredSavedKeywords.length === 0) return;
    setSelectedKeywords(current => Array.from(new Set([...current, ...filteredSavedKeywords])));
    setSuggestMessage(null);
  };

  const unselectAllVisibleKeywords = () => {
    if (filteredSavedKeywords.length === 0) return;
    const visibleKeywords = new Set(filteredSavedKeywords);
    setSelectedKeywords(current => current.filter(keyword => !visibleKeywords.has(keyword)));
    setSuggestMessage(null);
  };

  const getAiSuggestedKeywords = () => {
    const limit = getSuggestLimit();
    if (limit === 0) return { keywords: [], matchers: getDescriptionMatchers() };

    const description = aiKeywordDescription.trim();
    const matchers = getDescriptionMatchers(description);

    if (!description) {
      return { keywords: savedKeywords.slice(0, limit), matchers };
    }

    if (matchers.terms.length === 0 && matchers.phrases.length === 0) {
      return { keywords: [], matchers };
    }

    const scored = savedKeywords
      .map(keyword => ({
        keyword,
        score: scoreKeywordMatch(keyword, matchers)
      }))
      .filter(item => item.score > 0)
      .sort((first, second) => second.score - first.score || first.keyword.localeCompare(second.keyword))
      .map(item => item.keyword);

    return { keywords: scored.slice(0, limit), matchers };
  };

  const applyAiDescription = () => {
    const description = aiKeywordDescription.trim();
    if (!description) {
      setSuggestMessage(null);
      setGenerationError('Describe which keywords you want before clicking Suggest.');
      return;
    }

    const { keywords: suggested, matchers } = getAiSuggestedKeywords();

    if (suggested.length === 0) {
      setSelectedKeywords([]);
      setGenerationError(null);
      setSuggestMessage({
        type: 'error',
        text: 'No saved keywords match that description. Try different words or use Enter specific keywords.'
      });
      return;
    }

    setSelectedKeywords(suggested);
    setSavedKeywordScope('specific');
    setKeywordSearchQuery(matchers.filterQuery || description);
    setKeywordMode('saved');
    setGenerationError(null);
    setSuggestMessage({
      type: 'success',
      text: `Selected ${suggested.length} keyword${suggested.length === 1 ? '' : 's'} matching your description.`
    });
  };

  const saveKeywordGroup = async () => {
    const groupName = newGroupName.trim();
    const groupKeywordsToSave = keywordsForGeneration.length > 0 ? keywordsForGeneration : selectedKeywords;

    if (!groupName) {
      setGenerationError('Name the keyword group before saving it.');
      return;
    }

    if (groupKeywordsToSave.length === 0) {
      setGenerationError('Choose or enter at least one keyword before saving a group.');
      return;
    }

    const nextGroup = {
      id: groupName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `group-${Date.now()}`,
      name: groupName,
      keywords: Array.from(new Set(groupKeywordsToSave)),
      source: keywordMode === 'saved' && aiKeywordDescription.trim() ? 'ai_description' : keywordMode,
      description: aiKeywordDescription.trim() || undefined,
      updatedAt: new Date().toISOString()
    };
    const nextGroups = keywordGroups.filter(group => group.id !== nextGroup.id).concat(nextGroup);

    setIsSavingGroup(true);
    try {
      await apiClient.post('/update-site-settings', {
        email: impersonatedSite ? impersonatedSite.email : email,
        site: impersonatedSite ? impersonatedSite.site : undefined,
        settings: {
          keywordGroups: nextGroups
        }
      });
      setKeywordGroups(nextGroups);
      setKeywordMode('group');
      setSelectedGroupId(nextGroup.id);
      setShowGroupOptions(true);
      setNewGroupName('');
      setGenerationError(null);
    } catch (error) {
      console.error('Error saving keyword group:', error);
      setGenerationError('Could not save keyword group. Try again or use the selected keywords without saving.');
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handlePremisesApproved = async (approvedPremises) => {
    try {
      setIsGenerating(true);
      const response = await apiClient.post('/generate-bulk-articles', {
        email: impersonatedSite ? impersonatedSite.email : email,
        site: impersonatedSite ? impersonatedSite.site : undefined,
        frequency,
        approvedPremises
      });

      if (response.data.success) {
        setShowApprovalModal(false);
        setPremises(null);
        setGenerationError(null);
        onClose();
        if (typeof fetchArticles === 'function') {
          await fetchArticles();
        }
      } else {
        setGenerationError(response.data.message);
      }
    } catch (error) {
      console.error('Error in handlePremisesApproved:', error?.response?.data?.message);
      const errorMessage = error?.response?.data?.message || error?.message || 'An error occurred while generating articles';

      // Monthly limit is an upgrade moment, not a generic error: send the user
      // to the subscription flow. The old code had identical if/else branches,
      // so the upgrade CTA never fired.
      if (errorMessage.includes('Monthly article limit exceeded')) {
        setGenerationError("You've reached your monthly article limit. Upgrade to plan more this month.");
        if (typeof onRequireSubscription === 'function') onRequireSubscription();
      } else {
        setGenerationError(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <BaseModal isOpen={isOpen && !showApprovalModal} onClose={onClose} className="max-w-[640px] p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Schedule Your Articles</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* No credits consumed notice */}
        <div className="mb-6 p-3 bg-gray-100 border border-gray-200 rounded-lg flex items-start">
          <InfoIcon className="text-gray-700 mr-2 mt-0.5 flex-shrink-0" size={18} />
          <div className="text-sm text-gray-700">
            <ul className="list-disc list-inside space-y-1">
              <li><span className="font-medium">Scheduling reserves titles, 0 credits used now</span></li>
              <li>Edit or delete any scheduled post at any time for free</li>
              <li>Credits are deducted only when a full article is generated</li>
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col" data-testid="bulk-keyword-source">
            <label className="text-sm font-medium text-gray-700 mb-2 text-left">
              Which keywords should these articles use?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="select-saved-keywords-option"
                onClick={() => {
                  setKeywordMode('saved');
                  setSavedKeywordScope('all');
                }}
                disabled={savedKeywords.length === 0}
                className={`p-3 border rounded-md text-sm text-left transition-colors ${keywordMode === 'saved' ? 'border-gray-400 bg-gray-100 text-gray-900' : 'border-gray-200 text-gray-700 hover:bg-gray-50'} ${savedKeywords.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Saved keywords
              </button>
              <button
                type="button"
                data-testid="enter-specific-keywords-option"
                onClick={() => setKeywordMode('custom')}
                className={`p-3 border rounded-md text-sm text-left transition-colors ${keywordMode === 'custom' ? 'border-gray-400 bg-gray-100 text-gray-900' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                Enter specific keywords
              </button>
            </div>

            {keywordMode === 'group' && selectedGroup && (
              <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                Using keyword group: <span className="font-medium text-gray-900">{selectedGroup.name}</span>
                <span className="text-gray-500"> ({selectedGroup.keywords.length} keywords)</span>
                <button
                  type="button"
                  onClick={() => {
                    setKeywordMode('saved');
                    setSavedKeywordScope('all');
                  }}
                  className="ml-2 text-xs text-gray-700 hover:text-gray-900 underline"
                >
                  Change
                </button>
              </div>
            )}

            {keywordMode === 'saved' && (
              <div className="mt-3 border border-gray-200 rounded-md p-3" data-testid="saved-keyword-picker">
                {savedKeywords.length > 0 ? (
                  <>
                    <div className="mb-3 rounded-md bg-gray-50 border border-gray-200 p-3">
                      <label className="text-xs font-semibold text-gray-800">
                        Filter your saved keywords by topic
                      </label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <input
                          data-testid="ai-keyword-description-input"
                          value={aiKeywordDescription}
                          onChange={(event) => {
                            setAiKeywordDescription(event.target.value);
                            setSuggestMessage(null);
                          }}
                          placeholder="Example: world cup keywords"
                          className="flex-1 min-w-[180px] p-2 border rounded-md text-sm bg-white"
                        />
                        {suggestCountOptions.length > 0 && (
                          <select
                            data-testid="ai-suggest-count-select"
                            value={aiSuggestCount}
                            onChange={(event) => setAiSuggestCount(event.target.value)}
                            className="p-2 border rounded-md text-sm bg-white min-w-[130px]"
                            aria-label="How many keywords to suggest"
                          >
                            {suggestCountOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          type="button"
                          data-testid="apply-ai-keyword-description"
                          onClick={applyAiDescription}
                          className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Suggest
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Matches your description and switches to Pick specific with those keywords selected.
                      </p>
                      {suggestMessage && (
                        <p
                          data-testid="ai-suggest-message"
                          className={`mt-2 text-xs ${suggestMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}`}
                        >
                          {suggestMessage.text}
                        </p>
                      )}
                    </div>

                    <div className="flex rounded-lg border border-gray-200 p-1 mb-3">
                      <button
                        type="button"
                        data-testid="use-all-saved-keywords"
                        onClick={() => {
                          setSavedKeywordScope('all');
                          setSuggestMessage(null);
                        }}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          savedKeywordScope === 'all'
                            ? 'bg-gray-200 text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Use all ({savedKeywords.length})
                      </button>
                      <button
                        type="button"
                        data-testid="pick-specific-keywords"
                        onClick={() => setSavedKeywordScope('specific')}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          savedKeywordScope === 'specific'
                            ? 'bg-gray-200 text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Pick specific
                      </button>
                    </div>

                    {savedKeywordScope === 'all' ? (
                      <div className="rounded-md bg-gray-50 border border-gray-100 p-4 text-sm text-gray-600 text-center">
                        All {savedKeywords.length} saved keywords will be used for article planning.
                        <p className="mt-1 text-xs text-gray-500">
                          Switch to Pick specific to choose a subset or search with AI.
                        </p>
                      </div>
                    ) : (
                      <>
                    <div className="relative mb-2">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        data-testid="saved-keyword-search-input"
                        value={keywordSearchQuery}
                        onChange={(event) => setKeywordSearchQuery(event.target.value)}
                        placeholder="Search saved keywords..."
                        className="w-full pl-9 pr-3 py-2 border rounded-md text-sm bg-white focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          data-testid="select-all-visible-keywords"
                          onClick={selectAllVisibleKeywords}
                          disabled={filteredSavedKeywords.length === 0}
                          className="px-2.5 py-1 rounded-md text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Select all shown
                        </button>
                        <button
                          type="button"
                          data-testid="unselect-all-visible-keywords"
                          onClick={unselectAllVisibleKeywords}
                          disabled={filteredSavedKeywords.length === 0}
                          className="px-2.5 py-1 rounded-md text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Unselect all shown
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        {selectedKeywords.length} selected
                        {keywordSearchQuery.trim() ? ` · ${filteredSavedKeywords.length} shown` : ''}
                      </p>
                    </div>
                    <div
                      className="h-48 overflow-y-auto border border-gray-200 rounded-md p-3"
                      data-testid="saved-keyword-list"
                    >
                      {filteredSavedKeywords.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {filteredSavedKeywords.map(keyword => (
                            <button
                              key={keyword}
                              type="button"
                              onClick={() => toggleSavedKeyword(keyword)}
                              className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${selectedKeywords.includes(keyword) ? 'bg-gray-200 text-gray-900 border-gray-400' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}
                            >
                              {keyword}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No keywords match your search.</p>
                      )}
                    </div>
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No saved keywords found for this site. Enter specific keywords instead.</p>
                )}
              </div>
            )}

            {keywordMode === 'custom' && (
              <div className="mt-3" data-testid="custom-keyword-entry">
                <textarea
                  data-testid="custom-keywords-textarea"
                  value={customKeywordsText}
                  onChange={(event) => setCustomKeywordsText(event.target.value)}
                  placeholder="Enter one keyword per line, or separate keywords with commas"
                  className="w-full min-h-[96px] p-3 border rounded-md bg-white shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Each keyword becomes one article topic. One per line, or comma separated.
                </p>
              </div>
            )}

            <div className="mt-3 border-t border-gray-200 pt-3" data-testid="keyword-group-save-panel">
              <button
                type="button"
                data-testid="toggle-keyword-groups-panel"
                onClick={() => setShowGroupOptions(current => !current)}
                className="w-full flex items-center justify-between text-left text-sm text-gray-600 hover:text-gray-900"
              >
                <span>Keyword groups <span className="text-gray-400">(optional)</span></span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showGroupOptions ? 'rotate-180' : ''}`} />
              </button>

              {showGroupOptions && (
                <div className="mt-3 space-y-4">
                  {keywordGroups.length > 0 ? (
                    <div data-testid="keyword-group-picker">
                      <label className="text-xs font-semibold text-gray-700">Use keyword group</label>
                      <select
                        data-testid="keyword-group-select"
                        value={selectedGroupId}
                        onChange={(event) => {
                          setSelectedGroupId(event.target.value);
                          setKeywordMode('group');
                        }}
                        className="mt-2 w-full p-3 border rounded-md bg-white shadow-sm focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                      >
                        {keywordGroups.map(group => (
                          <option key={group.id} value={group.id}>
                            {group.name} ({group.keywords.length})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        data-testid="select-keyword-group-option"
                        onClick={() => setKeywordMode('group')}
                        className="mt-2 text-xs text-gray-700 hover:text-gray-900 underline"
                      >
                        Apply selected group
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No saved groups yet. Save a selection below to reuse it later.</p>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Save current selection as a keyword group
                    </label>
                    <div className="mt-2 flex gap-2">
                      <input
                        data-testid="keyword-group-name-input"
                        value={newGroupName}
                        onChange={(event) => setNewGroupName(event.target.value)}
                        placeholder="Group name, e.g. Local SEO"
                        className="flex-1 p-2 border rounded-md text-sm bg-white"
                      />
                      <button
                        type="button"
                        data-testid="save-keyword-group-button"
                        onClick={saveKeywordGroup}
                        disabled={isSavingGroup}
                        className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        <PlusIcon size={14} className="mr-1" />
                        {isSavingGroup ? 'Saving...' : 'Save group'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-2 text-left">
              How often would you like to publish?
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(Number(e.target.value))}
              className="w-full p-3 border rounded-md bg-white shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {frequencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-2 text-left">
              How many articles would you like to plan?
            </label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full p-3 border rounded-md bg-white shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {countOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {isGenerating && (
            <div className="mt-4 text-sm text-gray-600">
              Planning {count} article topics. This usually takes 20 to 40 seconds.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || keywordsForGeneration.length === 0}
            className={`
              flex items-center px-6 py-2 rounded-md text-white bg-primary
              hover:bg-primary-hover transition-colors font-medium
              ${isGenerating || keywordsForGeneration.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {isGenerating ? (
              <>
                <LoaderIcon className="animate-spin mr-2" size={18} />
                <span>Planning...</span>
              </>
            ) : (
              <>
                <CalendarIcon className="mr-2" size={18} />
                <span>Schedule Articles</span>
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

      </BaseModal>

      {showApprovalModal && premises && (
        <PremiseApprovalModal
          isOpen={showApprovalModal}
          premises={premises}
          onClose={() => {
            setShowApprovalModal(false);
            setPremises(null);
          }}
          onApprove={handlePremisesApproved}
          generationError={generationError}
          frequency={frequency}
          onRequireSubscription={() => {
            setShowApprovalModal(false);
            onClose();
            if (onRequireSubscription) onRequireSubscription();
          }}
        />
      )}
    </>
  );
};

export default BulkGenerateModal;