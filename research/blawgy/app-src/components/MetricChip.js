import React from 'react';
import InfoTip from './InfoTip';

/**
 * MetricChip: the one canonical rendering for the repeated SEO metrics
 * (keyword difficulty, search volume, search intent). Every chip teaches
 * itself via the shared glossary (hover or tap shows the plain-words
 * definition), and KD uses ONE color scale everywhere.
 *
 *   <MetricChip metric="kd" value={34} />
 *   <MetricChip metric="volume" value={2400} />
 *   <MetricChip metric="intent" value="commercial" />
 */

/**
 * Canonical keyword-difficulty color scale. Matches the plan engine's bands
 * (backend/services/planEngine.js: kd <= 25 low competition, kd <= 40
 * winnable, above that hard). Import this instead of inventing thresholds.
 */
export const kdColorClasses = (kd) => {
  const v = Number(kd) || 0;
  if (v <= 25) return 'text-emerald-700 bg-emerald-50';
  if (v <= 40) return 'text-amber-700 bg-amber-50';
  return 'text-red-700 bg-red-50';
};

const CHIP_BASE = 'inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded';

const GLOSSARY_TERM = { kd: 'kd', volume: 'searchVolume', intent: 'intent' };

const MetricChip = ({ metric, value, className = '' }) => {
  let chip = null;

  if (metric === 'kd') {
    chip = (
      <span className={`${CHIP_BASE} ${kdColorClasses(value)} ${className}`}>
        KD {Math.round(Number(value) || 0)}
      </span>
    );
  } else if (metric === 'volume') {
    chip = (
      <span className={`${CHIP_BASE} text-slate-600 bg-slate-50 tabular-nums ${className}`}>
        {(Number(value) || 0).toLocaleString()}/mo
      </span>
    );
  } else if (metric === 'intent') {
    if (!value) return null;
    chip = (
      <span className={`${CHIP_BASE} text-gray-600 bg-gray-100 capitalize ${className}`}>
        {value}
      </span>
    );
  } else {
    return null;
  }

  return (
    <InfoTip term={GLOSSARY_TERM[metric]} underline={false}>
      {chip}
    </InfoTip>
  );
};

export default MetricChip;
