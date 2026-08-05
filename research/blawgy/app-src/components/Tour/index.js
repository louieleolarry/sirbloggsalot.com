import React from 'react';
import TourOverlay from './TourOverlay';
import TourTooltip from './TourTooltip';
import TourConfetti from './TourConfetti';

// Main Tour components export
export { TourProvider, useTour, TOUR_TYPES } from '../../contexts/TourContext';
export { default as TourTooltip } from './TourTooltip';
export { default as TourOverlay } from './TourOverlay';
export { default as TourProgress } from './TourProgress';
export { default as TourConfetti } from './TourConfetti';
export { default as TourNavbarIcon } from './TourNavbarIcon';
export { TOUR_CONFIGS, getAvailableTours } from './tours';

// Combined Tour component that renders all tour UI elements
const TourUI = () => {
    return (
        <>
            <TourOverlay />
            <TourTooltip />
            <TourConfetti />
        </>
    );
};

export default TourUI;
