import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Palette, Eye, Code, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const CtaModal = ({ isOpen, onClose, currentSettings, onSave }) => {
  const [ctaSettings, setCtaSettings] = useState({
    enabled: true, // Always true when modal is open
    positions: [],
    type: 'template', // 'template' or 'custom'
    template: {
      url: '',
      text: '',
      buttonText: 'Learn More',
      backgroundColor: '#ffffff',
      buttonColor: '#007bff',
      textColor: '#333333',
      fontFamily: 'inherit',
      borderRadius: 8
    },
    custom: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const saveTimeoutRef = useRef(null);
  const toastIdRef = useRef(null);
  const wasOpenRef = useRef(false);
  // The user's typing is the source of truth while the modal is open. These
  // refs let the save machinery always send the newest state and detect when
  // edits arrived while a request was in flight, so a slow response can never
  // clobber or "un-dirty" newer keystrokes.
  const latestSettingsRef = useRef(null);
  const editSeqRef = useRef(0);
  const lastSavedSeqRef = useRef(0);
  const saveInFlightRef = useRef(false);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Save the newest state, latest-wins. Never runs two requests at once; if
  // edits land while a request is in flight, it chains one more save with the
  // newest state so the server can never end on a stale snapshot.
  const runSave = useCallback(async function run() {
    if (saveInFlightRef.current) return;
    if (editSeqRef.current === lastSavedSeqRef.current) return;
    const payload = latestSettingsRef.current;
    const seqAtStart = editSeqRef.current;
    saveInFlightRef.current = true;
    setIsSaving(true);
    try {
      await onSaveRef.current(payload);
      lastSavedSeqRef.current = seqAtStart;
      // Only clear the dirty flag if nothing changed while the request ran.
      if (editSeqRef.current === seqAtStart) {
        setHasUnsavedChanges(false);
        toastIdRef.current = toast.success('CTA settings saved!', {
          duration: 3000,
          icon: '✅'
        });
      }
    } catch (error) {
      console.error('Error saving CTA settings:', error);
      toastIdRef.current = toast.error('Failed to save CTA settings', {
        duration: 4000,
        icon: '❌'
      });
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
      // Chain only when NEW edits arrived during this request. A failed save
      // with no newer edits must not chain, or a persistent server error
      // would retry in a tight loop.
      if (editSeqRef.current !== seqAtStart) run();
    }
  }, []);

  // Seed local state ONLY when the modal transitions to open. Re-seeding on
  // every currentSettings identity change (the parent echoes setCtaSettings
  // after each autosave, and background /get-site-settings refetches replace
  // the object) is what used to revert in-progress typing to stale values.
  //
  // The close transition FLUSHES any edit still inside the debounce window.
  // Closing used to just leave the 3s timer running: navigating away before it
  // fired (unmount clears the timer) silently dropped the edit, and reopening
  // re-seeded over it — both read as "my CTA got erased" (letsparty, 2026-07).
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      if (editSeqRef.current !== lastSavedSeqRef.current && latestSettingsRef.current) {
        // Reopened while an edit is still unsaved (debounce pending or save
        // in flight): keep the user's newest state, never the stale snapshot.
        setCtaSettings(latestSettingsRef.current);
        setHasUnsavedChanges(true);
      } else {
        const seeded = {
          enabled: true, // Always enabled when modal is open
          positions: currentSettings?.positions || [],
          type: currentSettings?.type || 'template',
          template: {
            url: currentSettings?.template?.url || '',
            text: currentSettings?.template?.text || '',
            buttonText: currentSettings?.template?.buttonText || 'Learn More',
            backgroundColor: currentSettings?.template?.backgroundColor || '#ffffff',
            buttonColor: currentSettings?.template?.buttonColor || '#007bff',
            textColor: currentSettings?.template?.textColor || '#333333',
            fontFamily: currentSettings?.template?.fontFamily || 'inherit',
            borderRadius: currentSettings?.template?.borderRadius || 8
          },
          custom: currentSettings?.custom || ''
        };
        setCtaSettings(seeded);
        latestSettingsRef.current = seeded;
        editSeqRef.current = 0;
        lastSavedSeqRef.current = 0;
        setHasUnsavedChanges(false);
      }
    } else if (!isOpen && wasOpenRef.current && editSeqRef.current !== lastSavedSeqRef.current) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      runSave();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, currentSettings, runSave]);

  // Debounced autosave: record the newest state immediately, save 3s after
  // the last edit.
  const debouncedSave = useCallback((settingsToSave) => {
    latestSettingsRef.current = settingsToSave;
    editSeqRef.current += 1;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
    }

    saveTimeoutRef.current = setTimeout(runSave, 3000);
  }, [runSave]);

  // Unmount: flush instead of dropping. Clearing the debounce timer alone
  // meant leaving the Settings page within 3s of an edit lost it silently —
  // the request itself survives SPA navigation, so fire it directly. When a
  // save is already in flight, its finally-chain re-sends the newest state.
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (editSeqRef.current !== lastSavedSeqRef.current
        && !saveInFlightRef.current
        && latestSettingsRef.current) {
        lastSavedSeqRef.current = editSeqRef.current;
        Promise.resolve(onSaveRef.current(latestSettingsRef.current)).catch((error) => {
          console.error('Error saving CTA settings on unmount:', error);
        });
      }
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, []);

  const updateSettings = (newSettings) => {
    setCtaSettings(newSettings);
    setHasUnsavedChanges(true);
    debouncedSave(newSettings);
  };

  const handleTemplateChange = (field, value) => {
    const newSettings = {
      ...ctaSettings,
      template: {
        ...ctaSettings.template,
        [field]: value
      }
    };
    updateSettings(newSettings);
  };

  const handlePositionToggle = (position) => {
    const newSettings = {
      ...ctaSettings,
      positions: ctaSettings.positions.includes(position)
        ? ctaSettings.positions.filter(p => p !== position)
        : [...ctaSettings.positions, position]
    };
    updateSettings(newSettings);
  };


  const handleTypeChange = (type) => {
    const newSettings = {
      ...ctaSettings,
      type
    };
    updateSettings(newSettings);
  };

  const handleCustomChange = (custom) => {
    const newSettings = {
      ...ctaSettings,
      custom
    };
    updateSettings(newSettings);
  };


  const generatePreviewHtml = () => {

    if (ctaSettings.type === 'custom') {
      return ctaSettings.custom;
    }

    const { url, text, buttonText, backgroundColor, buttonColor, textColor, fontFamily, borderRadius } = ctaSettings.template;
    
    if (!url || !text) return '';

    return `
      <div style="
        background-color: ${backgroundColor};
        color: ${textColor};
        font-family: ${fontFamily};
        border-radius: ${borderRadius}px;
        padding: 24px;
        margin: 32px 0;
        text-align: center;
        width: 100%;
        box-sizing: border-box;
        border: 2px solid ${buttonColor};
      ">
        <p style="margin: 0 0 16px 0; font-size: 18px; line-height: 1.5;">${text}</p>
        <a href="${url}" target="_blank" rel="noopener noreferrer" 
           style="
             display: inline-block;
             background-color: ${buttonColor};
             color: #ffffff;
             padding: 12px 24px;
             text-decoration: none;
             border-radius: ${borderRadius}px;
             font-weight: 600;
             margin-top: 16px;
             transition: all 0.3s ease;
             border: 2px solid ${buttonColor};
           ">
          ${buttonText}
        </a>
      </div>
    `;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Call to Action Settings</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col lg:flex-row max-h-[80vh]">
            {/* Settings Panel */}
            <div className="flex-1 p-6 overflow-y-auto">
              <>
                  {/* Position Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3 text-left">CTA Placement</label>
                    <div className="space-y-2">
                      {[
                        { value: 'middle', label: 'Middle of Article', description: 'Insert CTA at approximately 50% of content' },
                        { value: 'end', label: 'End of Article', description: 'Add CTA at the end before conclusion' }
                      ].map(position => (
                        <label key={position.value} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ctaSettings.positions.includes(position.value)}
                            onChange={() => handlePositionToggle(position.value)}
                            className="w-4 h-4 text-primary rounded focus:ring-gray-500 mt-1"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{position.label}</div>
                            <div className="text-sm text-gray-500">{position.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* CTA Type Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3 text-left">CTA Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleTypeChange('template')}
                        className={`p-4 border rounded-lg text-left transition-colors ${
                          ctaSettings.type === 'template' 
                            ? 'border-primary bg-gray-50 text-gray-900' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Settings className="w-5 h-5 mb-2" />
                        <div className="font-medium">Template</div>
                        <div className="text-sm text-gray-500">Use our visual editor</div>
                      </button>
                      <button
                        onClick={() => handleTypeChange('custom')}
                        className={`p-4 border rounded-lg text-left transition-colors ${
                          ctaSettings.type === 'custom' 
                            ? 'border-primary bg-gray-50 text-gray-900' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Code className="w-5 h-5 mb-2" />
                        <div className="font-medium">Custom HTML</div>
                        <div className="text-sm text-gray-500">Write your own code</div>
                      </button>
                    </div>
                  </div>

                  {/* Template Editor */}
                  {ctaSettings.type === 'template' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <Palette className="w-5 h-5 mr-2" />
                        Template Designer
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Destination URL *</label>
                          <input
                            type="url"
                            value={ctaSettings.template.url}
                            onChange={(e) => handleTemplateChange('url', e.target.value)}
                            placeholder="https://example.com"
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 text-left">CTA Text *</label>
                          <textarea
                            value={ctaSettings.template.text}
                            onChange={(e) => handleTemplateChange('text', e.target.value)}
                            placeholder="Ready to transform your business? Get started today!"
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 min-h-[60px]"
                            rows={2}
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Button Text</label>
                          <input
                            type="text"
                            value={ctaSettings.template.buttonText}
                            onChange={(e) => handleTemplateChange('buttonText', e.target.value)}
                            placeholder="Learn More"
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                          />
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Button & Outline Color</label>
                            <div className="flex space-x-2">
                              <input
                                type="color"
                                value={ctaSettings.template.buttonColor}
                                onChange={(e) => handleTemplateChange('buttonColor', e.target.value)}
                                className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                              />
                              <input
                                type="text"
                                value={ctaSettings.template.buttonColor}
                                onChange={(e) => handleTemplateChange('buttonColor', e.target.value)}
                                className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Background Color</label>
                            <div className="flex space-x-2">
                              <input
                                type="color"
                                value={ctaSettings.template.backgroundColor}
                                onChange={(e) => handleTemplateChange('backgroundColor', e.target.value)}
                                className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                              />
                              <input
                                type="text"
                                value={ctaSettings.template.backgroundColor}
                                onChange={(e) => handleTemplateChange('backgroundColor', e.target.value)}
                                className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Text Color</label>
                            <div className="flex space-x-2">
                              <input
                                type="color"
                                value={ctaSettings.template.textColor}
                                onChange={(e) => handleTemplateChange('textColor', e.target.value)}
                                className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                              />
                              <input
                                type="text"
                                value={ctaSettings.template.textColor}
                                onChange={(e) => handleTemplateChange('textColor', e.target.value)}
                                className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Font Family</label>
                          <select
                            value={ctaSettings.template.fontFamily}
                            onChange={(e) => handleTemplateChange('fontFamily', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                          >
                            <option value="inherit">Inherit from site</option>
                            <option value="Arial, sans-serif">Arial</option>
                            <option value="Helvetica, sans-serif">Helvetica</option>
                            <option value="Georgia, serif">Georgia</option>
                            <option value="Times, serif">Times</option>
                            <option value="'Courier New', monospace">Courier New</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Border Radius (px)</label>
                          <input
                            type="range"
                            min="0"
                            max="50"
                            value={ctaSettings.template.borderRadius}
                            onChange={(e) => handleTemplateChange('borderRadius', parseInt(e.target.value))}
                            className="w-full"
                          />
                          <div className="text-sm text-gray-500 text-center mt-1">{ctaSettings.template.borderRadius}px</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Custom HTML Editor */}
                  {ctaSettings.type === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Custom HTML</label>
                      <textarea
                        value={ctaSettings.custom}
                        onChange={(e) => handleCustomChange(e.target.value)}
                        placeholder="<div>Your custom CTA HTML here...</div>"
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 font-mono text-sm min-h-[150px]"
                        rows={8}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Write your own HTML/CSS. Make sure to include proper styling for responsiveness.
                      </p>
                    </div>
                  )}
                </>
            </div>

            {/* Preview Panel */}
            <div className="w-full lg:w-96 border-l bg-gray-50 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Preview
                </h3>
              </div>

              <div className="flex-1 flex items-center">
                <div className="w-full">
                  <div className="bg-white p-6 rounded-lg border">
                    <div className="text-sm text-gray-600 leading-relaxed mb-6">
                      <p>Understanding the latest trends in digital marketing is crucial for business success. Companies that adapt quickly to changing consumer behaviors often see significant improvements in their conversion rates.</p>
                    </div>
                    
                    <div 
                      dangerouslySetInnerHTML={{ __html: generatePreviewHtml() }}
                      className="max-w-full"
                      style={{ wordWrap: 'break-word' }}
                    />
                    
                    <div className="text-sm text-gray-600 leading-relaxed mt-6">
                      <p>Recent studies show that personalized content can increase engagement by up to 80%. This is why many businesses are investing heavily in data-driven marketing strategies.</p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                    <div className="text-sm font-medium text-gray-800">Mobile Preview</div>
                    <div className="text-xs text-primary mt-1">
                      Your CTA will automatically adapt to smaller screens with larger buttons and improved spacing.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isSaving && (
                <div className="flex items-center text-sm text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                  Saving...
                </div>
              )}
              {hasUnsavedChanges && !isSaving && (
                <div className="flex items-center text-sm text-amber-600">
                  <div className="w-2 h-2 bg-amber-400 rounded-full mr-2"></div>
                  Unsaved changes (auto-saving in 3s)
                </div>
              )}
              {!hasUnsavedChanges && !isSaving && (
                <div className="flex items-center text-sm text-green-600">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  All changes saved
                </div>
              )}
            </div>
            <div>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CtaModal;