import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTour } from '../../contexts/TourContext';

const TourOverlay = () => {
    const { activeTour, getCurrentStepConfig, isTransitioning, skipTour } = useTour();
    const [spotlightRect, setSpotlightRect] = useState(null);

    const step = getCurrentStepConfig();

    const updateSpotlight = useCallback(() => {
        if (!step?.targetSelector || step.position === 'center') {
            setSpotlightRect(null);
            return;
        }

        const target = document.querySelector(step.targetSelector);
        if (!target) {
            setSpotlightRect(null);
            return;
        }

        const rect = target.getBoundingClientRect();
        const padding = step.spotlightPadding || 8;

        setSpotlightRect({
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
            borderRadius: step.spotlightRadius || 8
        });
    }, [step]);

    useEffect(() => {
        if (!activeTour || !step) {
            setSpotlightRect(null);
            return;
        }

        // Update spotlight position
        const timer = setTimeout(updateSpotlight, 50);

        // Update on scroll/resize
        window.addEventListener('resize', updateSpotlight);
        window.addEventListener('scroll', updateSpotlight, true);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateSpotlight);
            window.removeEventListener('scroll', updateSpotlight, true);
        };
    }, [activeTour, step, updateSpotlight]);

    if (!activeTour || isTransitioning) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[10000] pointer-events-none"
            >
                {/* SVG-based overlay with spotlight cutout - click to close */}
                <svg
                    className="absolute inset-0 w-full h-full cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                    onClick={skipTour}
                >
                    <defs>
                        <mask id="spotlight-mask">
                            {/* White = visible overlay, Black = cutout */}
                            <rect x="0" y="0" width="100%" height="100%" fill="white" />
                            {spotlightRect && (
                                <rect
                                    x={spotlightRect.left}
                                    y={spotlightRect.top}
                                    width={spotlightRect.width}
                                    height={spotlightRect.height}
                                    rx={spotlightRect.borderRadius}
                                    fill="black"
                                />
                            )}
                        </mask>
                    </defs>

                    {/* Dark overlay with mask applied */}
                    <rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        fill="rgba(0, 0, 0, 0.6)"
                        mask="url(#spotlight-mask)"
                    />
                </svg>

                {/* Spotlight border highlight */}
                {spotlightRect && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                        className="absolute border-2 border-primary pointer-events-none"
                        style={{
                            top: spotlightRect.top,
                            left: spotlightRect.left,
                            width: spotlightRect.width,
                            height: spotlightRect.height,
                            borderRadius: spotlightRect.borderRadius,
                            boxShadow: '0 0 0 4px rgba(15, 23, 42, 0.3), 0 0 20px rgba(15, 23, 42, 0.4)'
                        }}
                    />
                )}
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

export default TourOverlay;
