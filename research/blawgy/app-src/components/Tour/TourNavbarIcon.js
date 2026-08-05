import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Play, CheckCircle } from 'lucide-react';
import { useTour } from '../../contexts/TourContext';
import { getAvailableTours } from './tours';

const TourNavbarIcon = () => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);
    const { startTour, isTourCompleted, activeTour } = useTour();

    const tours = getAvailableTours();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target)
            ) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (showDropdown && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: 100,
                left: rect.right + 8
            });
        }
    }, [showDropdown]);

    const handleTourSelect = (tourId) => {
        setShowDropdown(false);
        startTour(tourId);
    };

    // Don't show while tour is active
    if (activeTour) return null;

    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center text-sm hover:bg-white/10 px-3 py-2.5 rounded-lg w-full transition-colors duration-200 group"
                title="Guided walkthroughs of each part of Blawgy"
            >
                <HelpCircle className="mr-3 group-hover:scale-110 transition-transform duration-200" size={18} />
                <span className="font-medium">Getting started</span>
            </button>

            {showDropdown && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
                    style={{
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        zIndex: 9999
                    }}
                >
                    <div className="px-4 py-3 bg-gradient-to-r from-primary to-primary-hover">
                        <h3 className="font-semibold text-white text-sm">Product Tours</h3>
                        <p className="text-xs text-gray-300 mt-0.5">Learn how to use Blawgy</p>
                    </div>
                    <div className="py-2">
                        {tours.map((tour) => {
                            const completed = isTourCompleted(tour.id);
                            return (
                                <button
                                    key={tour.id}
                                    onClick={() => handleTourSelect(tour.id)}
                                    className="flex items-center w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150"
                                >
                                    <div className="flex-shrink-0">
                                        {completed ? (
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <Play className="w-5 h-5 text-primary" />
                                        )}
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <div className="text-sm font-medium text-gray-800">
                                            {tour.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {tour.stepCount} steps
                                        </div>
                                    </div>
                                    {tour.id === 'main' && !completed && (
                                        <span className="text-xs bg-gray-100 text-primary px-2 py-1 rounded-full font-medium">
                                            Start here
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default TourNavbarIcon;
