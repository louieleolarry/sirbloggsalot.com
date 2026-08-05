import React from 'react';
import {
  Wand2Icon, PenLine, Clock, EyeIcon, EditIcon, Send, RefreshCcwIcon,
  Trash2, Lock, Target, LineChart, Trophy, Sparkles, CheckCircle2, Tag
} from 'lucide-react';

// Status -> dot color. Kept for the List view / legacy consumers; the calendar
// card itself is quiet by default (no dot) and only labels exceptions.
const STATUS_DOT = {
  scheduled: 'bg-slate-400',
  in_queue: 'bg-amber-500 animate-pulse',
  generating: 'bg-amber-500 animate-pulse',
  generated: 'bg-blue-500',
  generated_by_api: 'bg-blue-500',
  cms_draft: 'bg-blue-500',
  publishing: 'bg-blue-500 animate-pulse',
  published: 'bg-emerald-600',
  failed: 'bg-rose-600',
};

// ---------------------------------------------------------------------------
// Per-entry provenance ("where did the kws come from?"). The scheduled blogs[]
// row carries a provenance-erasing top-level source ('content-plan'); the REAL
// origin is preserved in seoMetrics.contentPlanSource. Resolve the inner value
// first, fall back to the top-level source, and map defensively (unknown ->
// null so callers omit the glyph/line).
//   cluster        -> a keyword-research topic       (Target)
//   rec            -> a Search Console query          (LineChart)
//   ranked         -> a keyword you already rank for  (Trophy)
//   manual         -> a keyword you typed in Settings (Tag)
function sourceMeta(entry) {
  if (!entry) return null;
  const raw = String(
    entry.seoMetrics?.contentPlanSource || entry.source || ''
  ).toLowerCase();
  switch (raw) {
    case 'cluster':
    case 'keyword-research':
      return {
        key: 'research',
        Icon: Target,
        glyphTitle: 'From your keyword research',
        sentence: (e) =>
          e.clusterLabel
            ? `From your research topic: ${e.clusterLabel}`
            : 'From your keyword research topics',
      };
    case 'rec':
    case 'gsc':
    case 'search-console':
      return {
        key: 'gsc',
        Icon: LineChart,
        glyphTitle: 'From Search Console',
        sentence: () => 'From Search Console: a query you are close to page 1 for',
      };
    case 'ranked':
      return {
        key: 'ranked',
        Icon: Trophy,
        glyphTitle: 'From a keyword you already rank for',
        sentence: () => 'From a keyword you already rank for',
      };
    case 'manual':
      return {
        key: 'manual',
        Icon: Tag,
        glyphTitle: 'Your keyword',
        sentence: (e) => {
          const own = e.seoMetrics?.parentKeyword || e.parentKeyword || e.keyword;
          return own ? `From your keyword: ${own}` : 'From your keyword';
        },
      };
    default:
      return null;
  }
}

// Plain-English difficulty band from a 0-100 keyword-difficulty score. Same
// bands as the canonical MetricChip scale (green <=25, amber <=40, red >40)
// and planEngine's upside math, so "Easy to rank" means the same thing
// everywhere in the app.
function difficultyBand(kd) {
  if (kd == null || !(kd > 0)) return null;
  if (kd <= 25) return 'Easy to rank';
  if (kd <= 40) return 'Moderate to rank';
  return 'Hard to rank';
}

// Band -> text color, matching the same canonical green/amber/red scale so the
// difficulty reads at a glance without parsing the words.
const BAND_COLOR = {
  'Easy to rank': 'text-emerald-600',
  'Moderate to rank': 'text-amber-600',
  'Hard to rank': 'text-rose-600',
};

// "8,100/mo · Easy to rank" as one plain string (frosted card / legacy
// consumers). Null when the row carries neither number (caller renders its own
// fallback). The live card renders volume + band separately so the band can be
// color-coded.
function metricText(entry) {
  const vol = entry?.seoMetrics?.searchVolume ?? entry?.searchVolume;
  const kd = entry?.seoMetrics?.difficulty ?? entry?.difficulty;
  const parts = [];
  if (vol != null && vol > 0) parts.push(`${Number(vol).toLocaleString()}/mo`);
  const band = difficultyBand(kd);
  if (band) parts.push(band);
  return parts.join(' · ') || null;
}

// Defensive working title for legacy rows that predate the always-have-a-title
// engine rule: title-case the keyword rather than showing it raw.
function titleCaseKeyword(keyword) {
  return String(keyword || '')
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// Short "Jul 10" style date used for the card's date chip.
function shortDate(d) {
  if (!d) return null;
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return null;
  return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Was this row auto-added by the weekly autopilot recently enough to marker it?
const ADDED_BY_MARKER_DAYS = 7;
function isRecentAutoAdd(entry) {
  if (entry?.addedBy !== 'blawgy' || !entry?.addedAt) return false;
  const t = new Date(entry.addedAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < ADDED_BY_MARKER_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Exception chip + actions for a real entry, driven by blogStatus. Healthy
 * scheduled cards render NOTHING here by default (quiet autopilot); hover
 * reveals "Write now". Exceptions (writing / failed / publishing / draft)
 * label themselves.
 */
function StatusArea({ entry, onGenerate, onPreview, onPublish, disabled }) {
  const status = entry.blogStatus;
  const hasContent = !!entry.blogContent;

  if (status === 'in_queue' || status === 'generating') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700" data-testid="status-chip">
        {status === 'in_queue' ? <Clock size={11} /> : <PenLine size={11} className="animate-pulse" />}
        {status === 'in_queue' ? 'In queue' : 'Writing...'}
      </span>
    );
  }

  if (status === 'publishing') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700" data-testid="status-chip">
        <Send size={11} className="animate-pulse" /> Publishing...
      </span>
    );
  }

  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5" data-testid="status-chip">
        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">Failed</span>
        <button
          onClick={(e) => { e.stopPropagation(); onGenerate(entry); }}
          disabled={disabled}
          className={`inline-flex items-center gap-1 text-[11px] font-medium ${disabled ? 'text-slate-400 cursor-not-allowed' : 'text-rose-600 hover:text-rose-700'}`}
        >
          <RefreshCcwIcon size={12} /> Retry
        </button>
      </span>
    );
  }

  if (status === 'cms_draft') {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onPublish(entry); }}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary-hover"
        data-testid="status-chip"
      >
        <Send size={12} /> Publish now
      </button>
    );
  }

  if (status === 'published') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700" data-testid="status-chip">
        <CheckCircle2 size={12} /> Published
      </span>
    );
  }

  // Healthy: written and waiting for its date -> quiet hover Preview.
  if (hasContent && (status === 'generated' || status === 'generated_by_api')) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onPreview(entry); }}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-blue-700"
      >
        <EyeIcon size={12} /> Preview
      </button>
    );
  }

  // Healthy scheduled: quiet by default. Hover reveals the manual escape hatch.
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onGenerate(entry); }}
      disabled={disabled}
      className={`inline-flex items-center gap-1 text-[11px] font-medium opacity-0 transition-opacity group-hover:opacity-100 ${disabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-600 hover:text-slate-900'}`}
      title="Write this one now instead of waiting for its date"
    >
      <Wand2Icon size={12} /> Write now
    </button>
  );
}

/**
 * A single plan card with ONE uniform anatomy, in unison on every card:
 *   1. Title (a real title always exists; legacy rows get a title-cased keyword)
 *   2. keyword (muted; provenance details live in the drawer, not on the card)
 *   3. "8,100/mo · Easy to rank"  (volume muted, difficulty color-coded;
 *      "No search data yet" when the row carries neither number)
 *   4. "up to ~180 visits/mo"     (projected upside; omitted when unknown —
 *      never faked with a filler line)
 *   5. date chip + (only when exceptional) a status chip
 * Healthy cards are quiet; hover reveals Write now / remove. The card sets its
 * own text-left: it must not depend on inherited alignment from any wrapper.
 *
 * `frosted` renders a trial-locked glassy overlay; clicking it fires onUpgrade.
 */
const PlanCard = ({
  entry,
  frosted,
  onOpen,
  onGenerate,
  onPreview,
  onPublish,
  onEdit,
  onRemove,
  onUpgrade,
  onDragStart,
  onDragEnd,
  generateDisabled,
}) => {
  // ---- Frosted (trial-locked) real entry ---------------------------------
  if (frosted) {
    return (
      <button
        onClick={() => onUpgrade && onUpgrade()}
        className="group relative w-full overflow-hidden rounded-lg border border-slate-200 bg-white p-3 text-left"
        data-testid="plan-card-frosted"
      >
        <div className="pointer-events-none select-none blur-[3px] opacity-70">
          <p className="truncate text-xs font-semibold text-slate-700">
            {entry.title || titleCaseKeyword(entry.keyword) || 'Planned article'}
          </p>
          <p className="mt-1 text-[10px] text-slate-500">{metricText(entry) || 'Scheduled'}</p>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/40 backdrop-blur-[1px]">
          <Lock size={14} className="text-slate-600" />
          <span className="text-[10px] font-semibold text-slate-700 group-hover:text-slate-900">Unlock</span>
        </div>
      </button>
    );
  }

  // ---- Real entry card ----------------------------------------------------
  const vol = entry?.seoMetrics?.searchVolume ?? entry?.searchVolume;
  const volText = vol != null && vol > 0 ? `${Number(vol).toLocaleString()}/mo` : null;
  const band = difficultyBand(entry?.seoMetrics?.difficulty ?? entry?.difficulty);
  const upsideHigh = entry.upside?.high > 0 ? Number(entry.upside.high).toLocaleString() : null;
  // Published rows are locked; busy rows (worker mid-write) match the
  // backend's 409 guard — rescheduling one wouldn't stop the article anyway.
  const busy = ['in_queue', 'generating', 'publishing'].includes(entry.blogStatus);
  const draggable = entry.blogStatus !== 'published' && !busy;
  const dateChip = shortDate(entry.publishDate);
  const autoAdded = isRecentAutoAdd(entry);
  // Same rule as the list view's edit icon: editable once the article is
  // written (blogContent is the plan view's boolean presence flag), published
  // or not. Unwritten rows have nothing to edit.
  const canEdit = !!onEdit && (!!entry.blogContent || entry.blogStatus === 'published');
  const canRemove = entry.blogStatus !== 'published';

  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart(e, entry) : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      onClick={() => onOpen(entry)}
      title={busy ? 'Being written right now — it will settle in a minute' : undefined}
      className={`group relative cursor-pointer rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition-all hover:border-slate-300 hover:shadow-md ${draggable ? 'active:cursor-grabbing' : ''}`}
      data-testid="plan-card"
    >
      {/* 1. Title (right padding reserves the hover corner-action slots) */}
      <p className={`${canEdit && canRemove ? 'pr-10' : 'pr-5'} text-[13px] font-semibold text-slate-900 line-clamp-2 leading-snug ${entry.blogStatus === 'generating' ? 'animate-pulse' : ''}`}>
        {entry.title || titleCaseKeyword(entry.keyword) || 'Planned article'}
      </p>

      {/* 2. Keyword */}
      {entry.keyword && (
        <p className="mt-0.5 truncate text-[11px] text-slate-400">{entry.keyword}</p>
      )}

      {/* 3. Evidence: volume (muted) + difficulty (color-coded) */}
      {volText || band ? (
        <p className="mt-1.5 text-[11px] text-slate-500">
          {volText}
          {volText && band ? ' · ' : ''}
          {band && <span className={`font-medium ${BAND_COLOR[band]}`}>{band}</span>}
        </p>
      ) : (
        <p className="mt-1.5 text-[11px] text-slate-400">No search data yet</p>
      )}

      {/* 4. Payoff: projected upside, only when we actually have one */}
      {upsideHigh && (
        <p className="text-[11px] font-semibold text-emerald-700">{`up to ~${upsideHigh} visits/mo`}</p>
      )}

      {/* 5. Date chip + status (exceptions only) */}
      <div className="mt-1.5 flex items-center justify-between gap-1.5">
        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-slate-600">
          {dateChip || 'Unscheduled'}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          {autoAdded && (
            <span
              className="inline-flex items-center gap-0.5 text-[9px] font-medium text-slate-400"
              title="Autopilot found this topic and scheduled it for you. Remove it if it is not a fit."
              data-testid="added-by-blawgy"
            >
              <Sparkles size={10} /> Added by Blawgy
            </span>
          )}
          <StatusArea
            entry={entry}
            onGenerate={onGenerate}
            onPreview={onPreview}
            onPublish={onPublish}
            disabled={generateDisabled}
          />
        </span>
      </div>

      {/* Hover corner actions: edit (any written or published row — same modal
          as the list view's edit icon) + remove (non-published only). */}
      {(canEdit || canRemove) && (
        <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5">
          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(entry); }}
              className="rounded p-0.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
              aria-label="Edit article"
              title="Edit article"
            >
              <EditIcon size={13} />
            </button>
          )}
          {canRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(entry); }}
              className="rounded p-0.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-rose-600 group-hover:opacity-100"
              aria-label="Remove from plan"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PlanCard;
export { STATUS_DOT, metricText, sourceMeta, difficultyBand, titleCaseKeyword };
