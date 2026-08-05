import React, { useEffect, useState, useCallback } from 'react';
import { XIcon, Sparkles, Image, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import stockPreview from '../assets/samples/stock-sample-image.jpg';
import aiPreview from '../assets/samples/ai-sample-image.jpeg';
import { BaseModal } from './Modals';
import apiClient from '../utils/apiClient';

const ImageStyleModal = ({ email, settings, onClose }) => {
  const [imageSource, setImageSource] = useState(settings?.imageStyle?.type || "stock");
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState(settings?.imageStyle?.style);
  const [styleHistory, setStyleHistory] = useState([settings?.imageStyle?.style]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [saveStatus, setSaveStatus] = useState(false);
  const [preview, setPreview] = useState(imageSource === 'stock' ? stockPreview : aiPreview);
  const [generatedPreview, setGeneratedPreview] = useState('');
  const [isInitialized, setIsInitialized] = useState(false); // Track initialization

  const imageOptions = [
    { id: "stock", label: "Professional Stock", icon: Image },
    { id: "flux", label: "AI Generated Artwork", icon: Sparkles },
  ];

  const handleSettingsChange = useCallback(async () => {
    try {
      await apiClient.post('/update-site-settings', {
        email,
        settings: { imageStyle: { type: imageSource, style } },
      });
      setSaveStatus('Style saved. Applies to your next article.');
    } catch (err) {
      setSaveStatus("Couldn't save. Please try again.");
    }
    setTimeout(() => setSaveStatus(''), 3000);
  }, [email, imageSource, style]);

  const handleStyleChange = (newStyle) => {
    // Add to history only if it's different from the current style
    if (newStyle !== style) {
      // Truncate history if we're not at the end
      const newHistory = styleHistory.slice(0, historyIndex + 1);
      // Add new style to history
      newHistory.push(newStyle);
      // Update history and index
      setStyleHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
    setStyle(newStyle);
  };

  const handleUndoStyle = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setStyle(styleHistory[newIndex]);
    }
  };

  const handleRedoStyle = () => {
    if (historyIndex < styleHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setStyle(styleHistory[newIndex]);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const response = await apiClient.post('/generate-image', {
        email,
        site: settings.site,
        type: imageSource,
        title,
        style: imageSource === 'stock' ? undefined : style
      });
      setGeneratedPreview(response?.data?.url);
      setSaveStatus(imageSource === 'stock' ? 'Preview ready!' : 'Image generated!');
    } catch (err) {
      setSaveStatus('Error occurred!');
    }
    setIsGenerating(false);
    setTimeout(() => setSaveStatus(''), 2000);
  };

  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
      return undefined;
    }

    // Debounce so typing a style doesn't fire a save per keystroke.
    const timer = setTimeout(() => {
      handleSettingsChange();
    }, 800);
    return () => clearTimeout(timer);
  }, [imageSource, style, isInitialized, handleSettingsChange]);

  return (
    <BaseModal onClose={onClose} className="max-w-3xl shadow-lg p-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center pb-2">
          <div className="text-left">
            <h2 className="text-2xl font-bold flex items-center gap-2">Article Image Style</h2>
            <p className="text-sm text-gray-500 mt-1">Choose the header image style for every article we publish.</p>
          </div>
          <div className='flex items-center gap-4'>
            {saveStatus && (
              <span className="text-sm font-medium bg-green-100 text-green-800 px-3 py-1 rounded-full animate-fade-out">
                {saveStatus}
              </span>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-base font-medium block w-full text-left">Choose Image Source</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {imageOptions.map((option) => (
              <label key={option.id} className={`flex flex-row items-center justify-center gap-4 p-4 border border-gray-300 rounded-lg cursor-pointer transition-all hover:border-primary hover:bg-gray-100 ${imageSource === option.id && 'border-primary bg-gray-100'}`} id={option.id} >
                <input
                  type="radio"
                  name="imageSource"
                  className="sr-only"
                  value={option.id}
                  onChange={(e) => {
                    const value = e.target.value;
                    setImageSource(value);
                    setPreview(value === 'stock' ? stockPreview : aiPreview);
                  }}
                />
                <option.icon className="w-6 h-6" />
                <span className="font-medium text-left">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
        {imageSource === 'flux' && !showOptions &&
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label htmlFor="style" className="block font-medium text-left">Style</label>
              <div className="flex space-x-2">
                <button 
                  onClick={handleUndoStyle} 
                  disabled={historyIndex <= 0}
                  className={`p-1 rounded ${historyIndex <= 0 ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-100'}`}
                  title="Undo style change"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleRedoStyle} 
                  disabled={historyIndex >= styleHistory.length - 1}
                  className={`p-1 rounded ${historyIndex >= styleHistory.length - 1 ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-100'}`}
                  title="Redo style change"
                >
                  <RotateCcw className="w-4 h-4 transform scale-x-[-1]" />
                </button>
              </div>
            </div>
            <textarea
              id="style"
              placeholder="e.g. cartoon like, realistic, anime, stock image, 3d..."
              className="w-full p-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-200 min-h-[80px]"
              value={style}
              onChange={(e) => handleStyleChange(e.target.value)}
            />
          </div>}
        {!showOptions && !generatedPreview && imageSource === 'stock' &&
          <div className="mt-6">
            <label htmlFor="preview" className="block text-left font-medium mb-2">Preview</label>
            <img
              src={preview}
              alt="Preview"
              className="mx-auto max-h-[250px] rounded-lg"
            />
          </div>}

        {imageSource === 'flux' ? (
          <>
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="w-full hover:bg-gray-100 text-gray-700 border border-gray-300 dark:border-gray-400 font-medium p-2 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-200 transition"
            >
              {showOptions ? 'Hide Options' : 'Try it out'}
              {showOptions ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
            </button>

            <AnimatePresence>
              {showOptions && (
                <motion.div initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2"
                >
                  {generatedPreview &&
                    <div className="mt-8">
                      <label htmlFor="preview" className="block text-left font-medium mb-2">Preview</label>
                      <img
                        src={generatedPreview}
                        alt="Preview"
                        className="mx-auto max-h-[250px] rounded-lg"
                      />
                    </div>}
                  <div className="space-y-1">
                    <label htmlFor="title" className="block font-medium text-left">Image Description (*)</label>
                    <input
                      id="title"
                      type="text"
                      placeholder="Describe what image you want to generate"
                      className="w-full p-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-200"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label htmlFor="testStyle" className="block font-medium text-left">Style (optional)</label>
                      <div className="flex space-x-2">
                        <button 
                          onClick={handleUndoStyle} 
                          disabled={historyIndex <= 0}
                          className={`p-1 rounded ${historyIndex <= 0 ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-100'}`}
                          title="Undo style change"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={handleRedoStyle} 
                          disabled={historyIndex >= styleHistory.length - 1}
                          className={`p-1 rounded ${historyIndex >= styleHistory.length - 1 ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-100'}`}
                          title="Redo style change"
                        >
                          <RotateCcw className="w-4 h-4 transform scale-x-[-1]" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      id="testStyle"
                      placeholder="e.g. cartoon like, realistic, anime, stock image, 3d..."
                      className="w-full p-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-200 min-h-[80px]"
                      value={style}
                      onChange={(e) => handleStyleChange(e.target.value)}
                    />
                  </div>
                  <button
                    className="w-full bg-primary text-white font-medium p-2 rounded-lg hover:bg-primary-hover transition disabled:opacity-50"
                    onClick={handleGenerate}
                    disabled={isGenerating || !title}
                  >
                    {isGenerating ? "Generating..." : "Generate Image"}
                  </button>
                </motion.div>)}
            </AnimatePresence>
          </>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="space-y-1">
              <label htmlFor="title" className="block font-medium text-left">Try it out (optional)</label>
              <input
                id="title"
                type="text"
                placeholder="e.g. a plumber fixing a sink"
                className="w-full p-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-200"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            {generatedPreview &&
              <div className="mt-8">
                <label htmlFor="preview" className="block text-left font-medium mb-2">Preview</label>
                <img
                  src={generatedPreview}
                  alt="Preview"
                  className="mx-auto max-h-[250px] rounded-lg"
                />
              </div>}
            <button
              className="w-full bg-primary text-white font-medium p-2 rounded-lg hover:bg-primary-hover transition disabled:opacity-50"
              onClick={handleGenerate}
              disabled={isGenerating || !title}
            >
              {isGenerating ? "Finding a photo..." : "Preview a Stock Photo"}
            </button>
          </div>
        )}
      </div>
    </BaseModal>
  );
};

export default ImageStyleModal;