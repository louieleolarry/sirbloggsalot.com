import React, { useEffect, useId, useRef, useState } from 'react';
import { SEO_GLOSSARY } from '../constants/seoGlossary';

/**
 * InfoTip: the one way the app teaches SEO vocabulary.
 *
 *   <InfoTip term="kd">KD</InfoTip>   -> dotted-underline text that explains itself
 *   <InfoTip term="kd" />             -> a small 12px info glyph
 *
 * Shows the glossary label + one-liner from constants/seoGlossary.js. Hover
 * shows it on desktop; click/tap toggles it (and pins it) for touch. The
 * bubble wraps to multiple lines (max-w-[16rem]) and is announced via
 * aria-describedby. Dependency-free: inline SVG glyph, no portal.
 *
 * Props:
 *   term      key into SEO_GLOSSARY (unknown term renders children untouched)
 *   children  optional anchor text; omitted = info glyph
 *   position  'top' (default) | 'bottom' for tight containers (table headers)
 *   underline set false to skip the dotted underline (e.g. wrapping a chip)
 *   className extra classes on the wrapper
 */

const BUBBLE_POSITIONS = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5'
};

const InfoGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    width="12"
    height="12"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="inline-block align-[-1px]"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const InfoTip = ({ term, children, position = 'top', underline = true, className = '' }) => {
  const entry = SEO_GLOSSARY[term];
  const [open, setOpen] = useState(false);
  // Pinned = opened by click/tap; stays up until outside click / Escape / re-tap.
  const [pinned, setPinned] = useState(false);
  const wrapRef = useRef(null);
  const tipId = useId();

  // Close a pinned tip on outside click/tap or Escape.
  useEffect(() => {
    if (!pinned) return undefined;
    const close = () => { setPinned(false); setOpen(false); };
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) close();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pinned]);

  // Unknown term: never break the surface, just render the anchor as-is.
  if (!entry) return children || null;

  const toggle = (e) => {
    // Keep the tap from also firing row clicks / sort handlers around it.
    e.stopPropagation();
    setPinned((prev) => {
      const next = !prev;
      setOpen(next);
      return next;
    });
  };

  const anchorClasses = children
    ? `cursor-help ${underline ? 'underline decoration-dotted decoration-slate-400 underline-offset-2' : ''}`
    : 'cursor-help text-slate-400 hover:text-slate-600 inline-flex items-center';

  return (
    <span
      ref={wrapRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => { if (!pinned) setOpen(false); }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-describedby={open ? tipId : undefined}
        aria-expanded={open}
        aria-label={children ? undefined : `What is ${entry.label.toLowerCase()}?`}
        className={`bg-transparent border-0 p-0 m-0 text-inherit text-left align-baseline ${anchorClasses}`}
      >
        {children || <InfoGlyph />}
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className={`absolute ${BUBBLE_POSITIONS[position] || BUBBLE_POSITIONS.top} z-50 w-max max-w-[16rem] whitespace-normal rounded-md bg-slate-800 px-2.5 py-1.5 text-left text-xs font-normal normal-case tracking-normal leading-relaxed text-white shadow-lg pointer-events-none`}
        >
          <span className="block font-semibold">{entry.label}</span>
          {entry.oneLiner}
        </span>
      )}
    </span>
  );
};

export default InfoTip;
