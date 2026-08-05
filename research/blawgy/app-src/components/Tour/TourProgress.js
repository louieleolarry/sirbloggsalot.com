import React from 'react';

const TourProgress = ({ current, total }) => {
    return (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
            {Array.from({ length: total }, (_, index) => (
                <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all duration-200 flex-shrink-0 ${
                        index < current
                            ? 'bg-slate-500' // Completed
                            : index === current
                            ? 'bg-primary scale-125' // Current
                            : 'bg-gray-200' // Upcoming
                    }`}
                />
            ))}
            <span className="text-xs text-gray-500 ml-2 font-medium flex-shrink-0">
                {current + 1} of {total}
            </span>
        </div>
    );
};

export default TourProgress;
