import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTour } from '../../contexts/TourContext';
import TourProgress from './TourProgress';

const TourTooltip = () => {
    const {
        activeTour,
        currentStep,
        getCurrentStepConfig,
        getTotalSteps,
        isLastStep,
        nextStep,
        prevStep,
        skipTour,
        isTransitioning
    } = useTour();

    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [arrowPosition, setArrowPosition] = useState('top');
    const tooltipRef = useRef(null);
    const targetRef = useRef(null);

    const step = getCurrentStepConfig();
    const totalSteps = getTotalSteps();

    const calculatePosition = useCallback(() => {
        if (!step) return;

        // Center modal if no target
        if (!step.targetSelector || step.position === 'center') {
            setPosition({
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            });
            setArrowPosition('none');
            return;
        }

        const target = document.querySelector(step.targetSelector);
        if (!target) {
            // Fallback to center if target not found
            setPosition({
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            });
            setArrowPosition('none');
            return;
        }

        targetRef.current = target;
        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltipRef.current?.getBoundingClientRect() || { width: 340, height: 200 };
        const padding = 16;
        const arrowSize = 12;

        let top, left;
        let arrow = step.position || 'bottom';

        switch (step.position) {
            case 'bottom':
                top = targetRect.bottom + padding + arrowSize;
                left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
                arrow = 'top';
                break;
            case 'top':
                top = targetRect.top - tooltipRect.height - padding - arrowSize;
                left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
                arrow = 'bottom';
                break;
            case 'left':
                top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
                left = targetRect.left - tooltipRect.width - padding - arrowSize;
                arrow = 'right';
                break;
            case 'right':
                top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
                left = targetRect.right + padding + arrowSize;
                arrow = 'left';
                break;
            default:
                top = targetRect.bottom + padding + arrowSize;
                left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
                arrow = 'top';
        }

        // Keep tooltip within viewport
        const viewportPadding = 20;
        if (left < viewportPadding) left = viewportPadding;
        if (left + tooltipRect.width > window.innerWidth - viewportPadding) {
            left = window.innerWidth - tooltipRect.width - viewportPadding;
        }
        if (top < viewportPadding) top = viewportPadding;
        if (top + tooltipRect.height > window.innerHeight - viewportPadding) {
            top = window.innerHeight - tooltipRect.height - viewportPadding;
        }

        setPosition({ top, left, transform: 'none' });
        setArrowPosition(arrow);
    }, [step]);

    // Calculate position on step change and resize
    useEffect(() => {
        if (!step) return;

        // Initial calculation with delay for DOM to settle
        const timer = setTimeout(calculatePosition, 50);

        // Recalculate on resize
        window.addEventListener('resize', calculatePosition);
        window.addEventListener('scroll', calculatePosition);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', calculatePosition);
            window.removeEventListener('scroll', calculatePosition);
        };
    }, [step, calculatePosition]);

    // Scroll target into view
    useEffect(() => {
        if (step?.targetSelector && !step.position?.includes('center')) {
            const target = document.querySelector(step.targetSelector);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [step]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!activeTour) return;

            switch (e.key) {
                case 'Escape':
                    skipTour();
                    break;
                case 'ArrowRight':
                case 'Enter':
                    nextStep();
                    break;
                case 'ArrowLeft':
                    if (currentStep > 0) prevStep();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTour, currentStep, nextStep, prevStep, skipTour]);

    if (!activeTour || !step || isTransitioning) return null;

    const arrowStyles = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-[-6px] border-l-transparent border-r-transparent border-t-transparent border-b-white',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-[-6px] border-l-transparent border-r-transparent border-b-transparent border-t-white',
        left: 'right-full top-1/2 -translate-y-1/2 mr-[-6px] border-t-transparent border-b-transparent border-l-transparent border-r-white',
        right: 'left-full top-1/2 -translate-y-1/2 ml-[-6px] border-t-transparent border-b-transparent border-r-transparent border-l-white',
        none: 'hidden'
    };

    return createPortal(
        <AnimatePresence mode="wait">
            <motion.div
                key={`${activeTour}-${currentStep}`}
                ref={tooltipRef}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="fixed z-[10001] bg-white rounded-2xl shadow-2xl p-6 w-[380px]"
                style={{
                    top: typeof position.top === 'number' ? `${position.top}px` : position.top,
                    left: typeof position.left === 'number' ? `${position.left}px` : position.left,
                    transform: position.transform,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                }}
            >
                {/* Arrow */}
                <div
                    className={`absolute w-0 h-0 border-[10px] ${arrowStyles[arrowPosition]}`}
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
                />

                {/* Close button */}
                <button
                    onClick={skipTour}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                    aria-label="Skip tour"
                >
                    <X size={18} />
                </button>

                {/* Content */}
                <div className="pr-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {step.title}
                    </h3>
                    <p className="text-gray-600 text-[15px] leading-relaxed mb-5">
                        {step.content}
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <TourProgress current={currentStep} total={totalSteps} />

                    <div className="flex gap-2">
                        {currentStep > 0 && (
                            <button
                                onClick={prevStep}
                                className="px-3 py-2 text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm transition-colors rounded-lg hover:bg-gray-100"
                            >
                                <ChevronLeft size={16} />
                                Back
                            </button>
                        )}
                        <button
                            onClick={nextStep}
                            className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg flex items-center gap-1 text-sm font-semibold transition-colors shadow-sm"
                        >
                            {isLastStep() ? 'Finish' : 'Next'}
                            {!isLastStep() && <ChevronRight size={16} />}
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

export default TourTooltip;
