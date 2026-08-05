import React from 'react';

const LinkOptions = ({ 
  useInternalLinks, 
  setUseInternalLinks,
  useExternalLinks, 
  setUseExternalLinks,
  useYouTubeVideos, 
  setUseYouTubeVideos,
  useOwnYouTubeChannel, 
  setUseOwnYouTubeChannel,
  youtubeChannelUrl, 
  setYoutubeChannelUrl,
  isLoadingChannel,
  youtubeChannelInfo,
  isValidYouTubeChannel,
  fetchYouTubeChannel
}) => {

  return (
    <div className="mb-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-5 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-1 text-left">Link & Media Options</h3>
        <p className="text-sm text-gray-600 text-left">
          Configure what types of links and media to include in your article
        </p>
      </div>
      
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-left">
            <h4 className="font-medium text-gray-900">Internal Links</h4>
            <p className="text-sm text-gray-500">Include links to other content on your site</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={useInternalLinks}
              onChange={() => setUseInternalLinks(!useInternalLinks)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-left">
            <h4 className="font-medium text-gray-900">External Links</h4>
            <p className="text-sm text-gray-500">Include links to authoritative external sources</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={useExternalLinks}
              onChange={() => setUseExternalLinks(!useExternalLinks)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-left">
            <h4 className="font-medium text-gray-900">YouTube Videos</h4>
            <p className="text-sm text-gray-500">Include relevant YouTube videos in your article</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={useYouTubeVideos}
              onChange={() => setUseYouTubeVideos(!useYouTubeVideos)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-left">
            <h4 className="font-medium text-gray-900">Your YouTube Channel</h4>
            <p className="text-sm text-gray-500">Embed videos only from your channel</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={useOwnYouTubeChannel}
              onChange={() => setUseOwnYouTubeChannel(!useOwnYouTubeChannel)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
        
        {useOwnYouTubeChannel && (
          <div className="mt-4 pl-6">
            <label className="block text-sm text-gray-700 mb-2">
              Your YouTube Channel URL or Handle
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={youtubeChannelUrl}
                onChange={(e) => setYoutubeChannelUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    fetchYouTubeChannel();
                  }
                }}
                placeholder="@yourchannel or https://www.youtube.com/@yourchannel"
                className={`flex-1 p-2 border ${
                  !isValidYouTubeChannel ? 'border-red-300' : 'border-gray-300'
                } rounded-lg focus:ring-gray-500 focus:border-gray-500`}
              />
              <button
                onClick={fetchYouTubeChannel}
                disabled={isLoadingChannel || !youtubeChannelUrl}
                className={`px-4 py-2 rounded-lg ${
                  isLoadingChannel
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary-hover'
                }`}
              >
                {isLoadingChannel ? 'Searching...' : 'Search'}
              </button>
            </div>
            {youtubeChannelInfo && (
              <div className="mt-2 text-sm text-green-600">
                <span className="font-medium">Channel connected!</span> {youtubeChannelInfo.videoCount} videos found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkOptions; 