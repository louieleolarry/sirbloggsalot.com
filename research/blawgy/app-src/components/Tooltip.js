import React, { useState } from 'react';

const Tooltip = ({ children, content, position = "top" }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const positions = {
    top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
    left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
    right: "left-full top-1/2 transform -translate-y-1/2 ml-2"
  };
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div className={`absolute ${positions[position]} z-50 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded w-max max-w-[16rem] whitespace-normal text-left`}>
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip; 