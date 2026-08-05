import React, { useMemo, useState } from 'react';
import { diffHtml } from '../../utils/lineDiff';

/**
 * Pieces shared by the Updates surfaces (the review panel and the history
 * cards): trigger chips, section titles, the title/meta before-after rows,
 * and the GitHub-style body diff. One implementation so the diff a user
 * approved is byte-for-byte the diff they see later in History.
 */

export const TRIGGER_LABELS = {
  decay: { label: 'Traffic drop', tone: 'bg-red-50 text-red-700 border-red-200' },
  striking_distance: { label: 'Almost page 1', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  low_ctr: { label: 'Low click rate', tone: 'bg-sky-50 text-sky-700 border-sky-200' },
  pixel_exit: { label: 'Readers leave early', tone: 'bg-violet-50 text-violet-700 border-violet-200' },
};

export function TriggerChip({ trigger }) {
  const t = TRIGGER_LABELS[trigger] || { label: trigger, tone: 'bg-slate-50 text-slate-600 border-slate-200' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${t.tone}`}>
      {t.label}
    </span>
  );
}

export function SectionTitle({ children }) {
  return <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{children}</h4>;
}

/** Compact before/after row for title and meta. */
export function BeforeAfterRow({ label, before, after }) {
  if (after == null || before === after) return null;
  return (
    <div className="text-sm" data-testid={`diff-${label.toLowerCase()}`}>
      <SectionTitle>{label}</SectionTitle>
      <div className="mt-1 rounded-md bg-red-50 px-2.5 py-1.5 text-red-800 line-through decoration-red-300">{before || '(empty)'}</div>
      <div className="mt-1 rounded-md bg-emerald-50 px-2.5 py-1.5 text-emerald-900">{after}</div>
    </div>
  );
}

export function BodyDiff({ beforeHtml, afterHtml }) {
  const [expanded, setExpanded] = useState({});
  const { hunks, added, removed } = useMemo(() => diffHtml(beforeHtml, afterHtml), [beforeHtml, afterHtml]);

  if (!afterHtml || beforeHtml === afterHtml) {
    return <div className="mt-1 text-sm text-slate-500">The article body is unchanged.</div>;
  }

  return (
    <div data-testid="body-diff">
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="font-medium text-emerald-700">+{added} added</span>
        <span className="font-medium text-red-700">-{removed} removed</span>
      </div>
      <div className="mt-1.5 overflow-hidden rounded-lg border border-slate-200 font-mono text-[13px] leading-5">
        {hunks.map((h, i) => {
          if (h.type === 'collapsed' && !expanded[i]) {
            return (
              <button
                key={i}
                onClick={() => setExpanded((e) => ({ ...e, [i]: true }))}
                className="block w-full bg-slate-50 px-3 py-1 text-center text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ··· {h.count} unchanged {h.count === 1 ? 'line' : 'lines'} ···
              </button>
            );
          }
          const lines = h.type === 'collapsed' ? h.lines : [h.line];
          const tone = h.type === 'add'
            ? 'bg-emerald-50 text-emerald-900'
            : h.type === 'del'
              ? 'bg-red-50 text-red-800'
              : 'bg-white text-slate-600';
          const marker = h.type === 'add' ? '+' : h.type === 'del' ? '-' : ' ';
          return lines.map((line, j) => (
            <div key={`${i}-${j}`} className={`flex gap-2 px-3 py-0.5 ${tone}`}>
              <span className="w-3 shrink-0 select-none text-slate-400">{marker}</span>
              <span className="whitespace-pre-wrap break-words">{line}</span>
            </div>
          ));
        })}
      </div>
    </div>
  );
}
