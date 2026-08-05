import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Loader2, RotateCcw } from 'lucide-react';
import { TriggerChip, SectionTitle, BeforeAfterRow, BodyDiff } from './updateShared';

/**
 * One published/flagged/reverted update in the History segment: what changed,
 * when, and what happened to the page's numbers since. The verdict pill is
 * computed server-side from stored weekly readings vs the page's own 4-week
 * pre-update baseline; the diff shown here is the same stored diff the owner
 * approved. Flagged cards carry the one-click revert.
 */

const VERDICT_PILLS = {
  watching: { label: 'Watching results', tone: 'bg-slate-100 text-slate-600' },
  improving: { label: 'Improving', tone: 'bg-emerald-100 text-emerald-800' },
  no_change: { label: 'No clear change yet', tone: 'bg-slate-100 text-slate-600' },
  regressed: { label: 'Regressed', tone: 'bg-red-100 text-red-800' },
  reverted: { label: 'Reverted', tone: 'bg-amber-100 text-amber-800' },
};

function fmtDate(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function signedPercent(before, after) {
  if (!Number.isFinite(before) || !Number.isFinite(after) || before <= 0) return null;
  const pct = Math.round(((after - before) / before) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}%`;
}

/**
 * Weekly clicks since the update as a small inline SVG: a dot marks the update
 * date (the series starts there), the dashed line is the pre-update baseline
 * mean. Dependency-free.
 */
function Sparkline({ readings, baselineMean }) {
  const points = (readings || []).map((r) => r.clicks || 0);
  if (points.length < 2) return null;
  const width = 150;
  const height = 40;
  const pad = 4;
  const max = Math.max(...points, Number.isFinite(baselineMean) ? baselineMean : 0, 1);
  const x = (i) => pad + (i * (width - 2 * pad)) / (points.length - 1);
  const y = (v) => height - pad - (v / max) * (height - 2 * pad);
  const path = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg
      data-testid="impact-sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
      role="img"
      aria-label="Weekly clicks since this update"
    >
      {Number.isFinite(baselineMean) && (
        <line
          x1={pad}
          x2={width - pad}
          y1={y(baselineMean)}
          y2={y(baselineMean)}
          stroke="#94a3b8"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      )}
      <path d={path} fill="none" stroke="#059669" strokeWidth="1.5" />
      <circle cx={x(0)} cy={y(points[0])} r="2.5" fill="#0f172a" />
    </svg>
  );
}

const UpdateHistoryCard = ({ update, busy, onRevert }) => {
  const [expanded, setExpanded] = useState(false);

  const impact = update.impact || {};
  const verdict = impact.verdict
    || (update.status === 'flagged' ? 'regressed'
      : update.status === 'reverted' ? 'reverted'
        : 'watching');
  const pill = VERDICT_PILLS[verdict] || VERDICT_PILLS.watching;
  const baseline = update.watch?.baseline || null;
  const readings = Array.isArray(update.impactReadings) ? update.impactReadings : [];
  const draft = update.draft || {};
  const hasDiff = !!draft.before;

  const publishedOn = fmtDate(update.publishedAt);
  const firstVerdictOn = fmtDate(impact.firstVerdictAt);

  // Latest numbers vs baseline, shown as soon as any reading exists.
  const latest = readings.length ? readings[readings.length - 1] : null;
  const recentClicks = Number.isFinite(impact.recentWeeklyClicks)
    ? impact.recentWeeklyClicks
    : (latest ? latest.clicks : null);
  const clicksDelta = baseline ? signedPercent(baseline.avgWeeklyClicks, recentClicks) : null;
  const lastQueryReading = [...readings].reverse().find((r) => r.query && Number.isFinite(r.query.position));

  return (
    <div
      data-testid="history-card"
      className={`rounded-xl border bg-white p-4 ${update.status === 'flagged' ? 'border-red-300' : 'border-slate-200'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${pill.tone}`} data-testid="verdict-pill">
              {pill.label}
            </span>
            {(update.triggers || []).map((t) => <TriggerChip key={t} trigger={t} />)}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <a
              href={update.pageUrl}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm font-semibold text-slate-900 hover:underline"
            >
              {update.blogTitle || update.pagePath} <ExternalLink size={11} className="mb-0.5 inline text-slate-400" />
            </a>
            {publishedOn && <span className="shrink-0 text-xs text-slate-400">updated {publishedOn}</span>}
          </div>
          {(draft.plan?.[0] || draft.changeSummary) && (
            <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">{draft.plan?.[0] || draft.changeSummary}</p>
          )}
        </div>
        <Sparkline readings={readings} baselineMean={baseline?.avgWeeklyClicks} />
      </div>

      {/* Impact numbers */}
      <div className="mt-3 space-y-1 text-sm text-slate-700" data-testid="impact-numbers">
        {verdict === 'watching' && (
          <p className="text-slate-500">
            Watching results (checks weekly{firstVerdictOn ? `, first verdict around ${firstVerdictOn}` : ''}).
          </p>
        )}
        {readings.length === 0 ? (
          <p className="text-slate-500">No readings yet. The first numbers land with next week's Search Console data.</p>
        ) : (
          <>
            {baseline && Number.isFinite(recentClicks) && (
              <p>
                Clicks: {baseline.avgWeeklyClicks}/wk before, {recentClicks}/wk now
                {clicksDelta ? ` (${clicksDelta})` : ''}
              </p>
            )}
            {baseline?.query && lastQueryReading && (
              <p>
                Position {baseline.query.avgPosition} to {lastQueryReading.query.position} for "{update.subjectQuery}"
              </p>
            )}
          </>
        )}
        {update.status === 'flagged' && (
          <p className="text-red-700">{update.flagReason || 'This update looks like it hurt the page.'}</p>
        )}
        {update.status === 'reverted' && (
          <p className="text-amber-800">
            The old version was put back{fmtDate(update.revertedAt) ? ` on ${fmtDate(update.revertedAt)}` : ''}.
            {update.flagReason ? ` ${update.flagReason}` : ''}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {hasDiff && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
            data-testid="view-what-changed"
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            View what changed
          </button>
        )}
        {update.status === 'flagged' && (
          <button
            onClick={() => onRevert(update)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
            {busy ? 'Restoring...' : 'Put the old version back'}
          </button>
        )}
      </div>

      {expanded && hasDiff && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          <BeforeAfterRow label="Title" before={draft.before?.title} after={draft.after?.title} />
          <BeforeAfterRow label="Description" before={draft.before?.metaDescription} after={draft.after?.metaDescription} />
          <div>
            <SectionTitle>Article body</SectionTitle>
            <div className="mt-1">
              <BodyDiff beforeHtml={draft.before?.contentHtml || ''} afterHtml={draft.contentHtml || ''} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateHistoryCard;
