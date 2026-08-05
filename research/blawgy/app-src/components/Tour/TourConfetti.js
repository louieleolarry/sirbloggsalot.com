import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useTour } from '../../contexts/TourContext';

const TourConfetti = () => {
    const { activeTour, getCurrentStepConfig, isLastStep } = useTour();
    const hasTriggered = useRef(false);
    const prevStep = useRef(null);

    const step = getCurrentStepConfig();

    useEffect(() => {
        // Reset trigger when tour changes
        if (!activeTour) {
            hasTriggered.current = false;
            prevStep.current = null;
        }
    }, [activeTour]);

    useEffect(() => {
        // Only trigger confetti when reaching the last step for the first time
        if (!step || !isLastStep() || hasTriggered.current) return;
        if (prevStep.current === step.id) return;

        prevStep.current = step.id;

        // Check if this step should trigger confetti
        if (step.triggerConfetti) {
            hasTriggered.current = true;

            // Fire confetti from both sides
            const duration = 3000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10002 };

            const randomInRange = (min, max) => Math.random() * (max - min) + min;

            const interval = setInterval(() => {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    clearInterval(interval);
                    return;
                }

                const particleCount = 50 * (timeLeft / duration);

                // Left side
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                    colors: ['#0F172A', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6']
                });

                // Right side
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                    colors: ['#0F172A', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6']
                });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [step, isLastStep]);

    // This component doesn't render anything - confetti is handled by canvas-confetti
    return null;
};

export default TourConfetti;
