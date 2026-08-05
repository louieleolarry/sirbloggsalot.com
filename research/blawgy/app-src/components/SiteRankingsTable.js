import React, { useMemo, useState } from 'react';
import { Plus, Loader, Link2, TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown } from 'lucide-react';

// ---------------------------------------------------------------------------
// Shared "Your rankings" table.
//
// One rankings surface, used in two homes: the Keywords > "Your rankings" view
// and the SEO Analysis > Rankings tab. Both render the exact same rows from the
// same GET /:site/rankings endpoint (GSC when connected, DataForSEO estimate
// otherwise), so a keyword reads identically wherever the user looks.
//
// Layout rules (fixes the old overflow where long Page URLs bled into Actions):
//   - table-fixed with explicit column widths.
//   - Page cell is path-only (host dropped), truncated, full URL in a title
//     tooltip so nothing ever overlaps the Actions column.
//   - Actions column is a fixed width and right-aligned.
//
// Props:
//   rows         Array of ranking rows { keyword, position, movement, clicks?,
//                impressions?, volume?, page? }.
//   source       'gsc' | 'dfs' — drives the metric column (Clicks+Impressions
//                for GSC, Volume for DFS) and the source-line wording.
//   asOf         Date/ISO of the snapshot (GSC) or cache refresh (DFS).
//   onAddToPlan  (row) => void; the per-row "Add to plan" action.
//   addingKey    the keyword whose add is currently in flight (spinner state).
//   compact      tighter padding when embedded under another page's tab.
//   otherRows    optional Map<keyword, position> from the OTHER source (only when
//                the user has already loaded it — never auto-fetched). Used to
//                show a quiet delta chip when the sources disagree by > 2.
//   otherSource  optional 'gsc' | 'dfs' label for that other source's chip.
//   emptyMessage optional copy for the zero-rows state (defaults to a neutral
//                "No rankings to show.").
//   truncated    true when the server capped the rows (top 200); renders an
//                honest footer so the cap is never silent.
// ---------------------------------------------------------------------------

// Compact number formatting: 2400 -> "2.4K", 1200000 -> "1.2M".
const formatCount = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}K`;
  return String(v);
};

// Path-only display for a page URL: drop protocol + host, keep the path (and
// query). Homepage collapses to "/". Full URL stays available via title.
const shortPath = (url) => {
  if (!url) return '';
  try {
    const u = new URL(/^https?:\/\//.test(url) ? url : `https://${url}`);
    const path = `${u.pathname}${u.search}`;
    return path === '' ? '/' : path;
  } catch {
    // Bare/relative value: strip a leading host-looking chunk if present.
    return String(url).replace(/^https?:\/\//, '').replace(/^[^/]+/, '') || String(url);
  }
};

const hrefFor = (page) => (page ? (/^https?:\/\//.test(page) ? page : `https://${page}`) : null);

// Customer-facing label for a source. Never the vendor name: GSC data is "the
// user's own Google data"; DataForSEO is "an estimate".
const sourceLabel = (source) => (source === 'gsc' ? 'Google' : 'Est.');
const sourceLongLabel = (source) => (source === 'gsc' ? 'Google' : 'The estimate');

// Plain-words teaching copy for every metric header. Rendered as title
// tooltips for now; swap to <InfoTip> once that component lands.
const HEADER_TIPS = {
  position: 'Where you show up in Google results. 1 is the top; 1 to 10 is page one.',
  clicks: 'How many of those people clicked through to you.',
  impressions: 'How many times your site appeared in someone\'s search results.',
  volume: 'Roughly how many people search this each month.',
};

// What the movement arrow is comparing against, per source.
const movementTip = (source) => (
  source === 'gsc'
    ? 'Change vs your average position over the previous 4 weeks'
    : 'Change since our last check'
);

// Position cell: current position with a small movement arrow. Movement is
// framed so positive = moved UP the SERP (green). null (no prior period) shows
// position only. Colors follow the app's semantic-status rule; chrome is
// near-black.
const RankMovement = ({ position, movement, movementTitle }) => {
  const pos = Number(position);
  const posLabel = Number.isFinite(pos) ? (Number.isInteger(pos) ? pos : pos.toFixed(1)) : '-';
  if (movement === null || movement === undefined || !Number.isFinite(Number(movement))) {
    return <span className="text-sm font-medium text-slate-900 tabular-nums">{posLabel}</span>;
  }
  const m = Number(movement);
  const up = m > 0;
  const down = m < 0;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  const color = up ? 'text-green-600' : down ? 'text-rose-600' : 'text-slate-400';
  const abs = Math.abs(m);
  const absLabel = Number.isInteger(abs) ? abs : abs.toFixed(1);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-sm font-medium text-slate-900 tabular-nums">{posLabel}</span>
      <span
        className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${color}`}
        title={movementTitle}
      >
        <Icon className="w-3.5 h-3.5" />
        {m === 0 ? '0' : absLabel}
      </span>
    </span>
  );
};

// A quiet chip shown next to a position when the OTHER source (already loaded)
// disagrees by more than 2 positions: e.g. "Est. #4" or "Google #12".
const DeltaChip = ({ otherPosition, otherSource }) => {
  const p = Number(otherPosition);
  if (!Number.isFinite(p)) return null;
  const label = Number.isInteger(p) ? p : p.toFixed(1);
  return (
    <span
      className="ml-2 inline-flex items-center text-[11px] font-medium text-slate-400"
      title={`${sourceLongLabel(otherSource)} has this at position ${label}`}
    >
      {sourceLabel(otherSource)} #{label}
    </span>
  );
};

const DELTA_THRESHOLD = 2;

// Sortable columns and the direction that makes sense as the FIRST click:
// position ascending (best rank first), everything else descending (most
// clicks / biggest gains first). A second click flips it.
const SORT_DEFAULT_DIR = {
  position: 'asc',
  movement: 'desc',
  clicks: 'desc',
  impressions: 'desc',
  volume: 'desc',
};

// Null-safe numeric read for sorting; nulls always sort last either direction.
// Missing values are checked explicitly because Number(null) is 0, which would
// silently rank a "no data" movement as "no change".
const sortValue = (row, key) => {
  const raw = row?.[key];
  if (raw === null || raw === undefined || raw === '') return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : null;
};

const SortButton = ({ label, sortKey, sort, onSort, title }) => {
  const active = sort?.key === sortKey;
  const Arrow = active ? (sort.dir === 'asc' ? ChevronUp : ChevronDown) : null;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      title={title}
      className={`inline-flex items-center gap-0.5 uppercase tracking-wide text-xs font-medium hover:text-slate-700 ${active ? 'text-slate-700' : 'text-slate-500'}`}
    >
      {label}
      {Arrow && <Arrow className="w-3 h-3" />}
    </button>
  );
};

const SiteRankingsTable = ({
  rows = [],
  source,
  onAddToPlan,
  addingKey = null,
  compact = false,
  otherRows = null,
  otherSource = null,
  emptyMessage = 'No rankings to show.',
  truncated = false,
}) => {
  const isGsc = source === 'gsc';
  const cellPad = compact ? 'px-3 py-2.5' : 'px-4 py-3';
  const headPad = compact ? 'px-3 py-2.5' : 'px-4 py-3';
  const colCount = isGsc ? 6 : 5;

  // Client-side sort. null = server order (clicks/volume desc from the API).
  const [sort, setSort] = useState(null);
  const toggleSort = (key) => {
    setSort((prev) => {
      if (prev?.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { key, dir: SORT_DEFAULT_DIR[key] || 'desc' };
    });
  };

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const { key, dir } = sort;
    const mult = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = sortValue(a, key);
      const bv = sortValue(b, key);
      if (av === null && bv === null) return 0;
      if (av === null) return 1; // nulls last, either direction
      if (bv === null) return -1;
      return (av - bv) * mult;
    });
  }, [rows, sort]);

  // Only compare when the other source is actually loaded (a Map with entries).
  // We never fetch DFS just to compute a delta — that costs money.
  const hasOther = otherRows instanceof Map && otherRows.size > 0 && otherSource && otherSource !== source;

  const deltaFor = useMemo(() => {
    if (!hasOther) return () => null;
    return (row) => {
      const other = otherRows.get(row.keyword);
      if (!Number.isFinite(Number(other)) || !Number.isFinite(Number(row.position))) return null;
      if (Math.abs(Number(other) - Number(row.position)) <= DELTA_THRESHOLD) return null;
      return other;
    };
  }, [hasOther, otherRows]);

  return (
    <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <colgroup>
            {/* Keyword | Position | metric(s) | Page | Actions.
                Fixed widths keep long page paths from ever colliding with the
                Actions column. */}
            <col className="w-[34%]" />
            <col className="w-[16%]" />
            {isGsc ? (
              <>
                <col className="w-[12%]" />
                <col className="w-[12%]" />
              </>
            ) : (
              <col className="w-[14%]" />
            )}
            <col />
            <col className="w-[130px]" />
          </colgroup>
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className={`${headPad} text-left text-xs font-medium text-slate-500 uppercase tracking-wide`}>Keyword</th>
              <th className={`${headPad} text-left`}>
                <span className="inline-flex items-center gap-2">
                  <SortButton label="Position" sortKey="position" sort={sort} onSort={toggleSort} title={HEADER_TIPS.position} />
                  <SortButton label="Change" sortKey="movement" sort={sort} onSort={toggleSort} title={movementTip(source)} />
                </span>
              </th>
              {isGsc ? (
                <>
                  <th className={`${headPad} text-right`}>
                    <SortButton label="Clicks" sortKey="clicks" sort={sort} onSort={toggleSort} title={HEADER_TIPS.clicks} />
                  </th>
                  <th className={`${headPad} text-right`}>
                    <SortButton label="Impressions" sortKey="impressions" sort={sort} onSort={toggleSort} title={HEADER_TIPS.impressions} />
                  </th>
                </>
              ) : (
                <th className={`${headPad} text-right`}>
                  <SortButton label="Volume" sortKey="volume" sort={sort} onSort={toggleSort} title={HEADER_TIPS.volume} />
                </th>
              )}
              <th className={`${headPad} text-left text-xs font-medium text-slate-500 uppercase tracking-wide`}>Page</th>
              <th className={`${headPad} text-right text-xs font-medium text-slate-500 uppercase tracking-wide`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className={`${cellPad} py-10 text-center text-sm text-slate-500`}>
                  {emptyMessage}
                </td>
              </tr>
            ) : sortedRows.map((row, i) => {
              const page = row.page;
              const href = hrefFor(page);
              const other = deltaFor(row);
              return (
                <tr key={`${row.keyword}-${i}`} className="hover:bg-slate-50 transition-colors">
                  <td className={`${cellPad} text-sm font-medium text-slate-900`}>
                    <span className="block truncate" title={row.keyword}>{row.keyword}</span>
                  </td>
                  <td className={cellPad}>
                    <span className="inline-flex items-center">
                      <RankMovement position={row.position} movement={row.movement} movementTitle={movementTip(source)} />
                      {other !== null && <DeltaChip otherPosition={other} otherSource={otherSource} />}
                    </span>
                  </td>
                  {isGsc ? (
                    <>
                      <td className={`${cellPad} text-sm text-slate-600 text-right tabular-nums`}>{formatCount(row.clicks)}</td>
                      <td className={`${cellPad} text-sm text-slate-600 text-right tabular-nums`}>{formatCount(row.impressions)}</td>
                    </>
                  ) : (
                    <td className={`${cellPad} text-sm text-slate-600 text-right tabular-nums`}>{formatCount(row.volume)}</td>
                  )}
                  <td className={`${cellPad} text-sm`}>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 hover:underline max-w-full"
                        title={page}
                      >
                        <Link2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">{shortPath(page)}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className={cellPad}>
                    <div className="flex items-center justify-end">
                      {onAddToPlan && (
                        <button
                          type="button"
                          onClick={() => onAddToPlan(row)}
                          disabled={addingKey === row.keyword}
                          className="text-xs px-2 py-1 text-slate-700 hover:bg-slate-100 rounded font-medium disabled:opacity-50 inline-flex items-center whitespace-nowrap"
                        >
                          {addingKey === row.keyword
                            ? <Loader className="w-3 h-3 animate-spin" />
                            : <><Plus className="w-3 h-3 mr-0.5" /> Add to plan</>}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {truncated && rows.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-500 text-center">
          Showing your top 200 keywords
        </div>
      )}
    </div>
  );
};

export default SiteRankingsTable;
