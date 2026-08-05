import React from 'react';

/**
 * Pagination
 *
 * Reusable pagination control for any paged list/table on the app side.
 * Renders rows-per-page selector, first/prev/page/next/last buttons, a
 * "page N of M" indicator, and the total row count. Tailwind styled to
 * match the existing button language on SEO Analysis.
 *
 * Props:
 *   page            - current page (1-indexed)
 *   pageSize        - rows per page
 *   total           - total row count across all pages
 *   onPageChange    - (page) => void
 *   onPageSizeChange - (size) => void
 *   pageSizeOptions - array of page-size choices, default [20, 50, 100, 200]
 *   label           - optional row noun used in count ("keywords", "rows" default)
 *   compact         - when true, hide rows-per-page label (small footprint)
 */
const PAGE_WINDOW = 5;

const buildPageWindow = (page, totalPages) => {
  if (totalPages <= PAGE_WINDOW) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const half = Math.floor(PAGE_WINDOW / 2);
  let start = Math.max(1, page - half);
  let end = start + PAGE_WINDOW - 1;
  if (end > totalPages) {
    end = totalPages;
    start = end - PAGE_WINDOW + 1;
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

const Pagination = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100, 200],
  label = 'rows',
  compact = false,
}) => {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safePageSize = Math.max(1, Number(pageSize) || 20);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);

  const firstRow = safeTotal === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const lastRow = Math.min(safeTotal, safePage * safePageSize);

  const atFirst = safePage <= 1;
  const atLast = safePage >= totalPages;

  const go = (target) => {
    const clamped = Math.min(Math.max(1, target), totalPages);
    if (clamped !== safePage) onPageChange?.(clamped);
  };

  const pages = buildPageWindow(safePage, totalPages);

  const btnBase =
    'inline-flex items-center justify-center min-w-[2.25rem] h-9 px-2 text-sm rounded-lg border transition-colors';
  const btnIdle =
    'border-gray-200 text-gray-700 bg-white hover:bg-gray-50';
  const btnActive =
    'border-primary bg-primary text-white hover:bg-primary-hover';
  const btnDisabled =
    'border-gray-200 text-gray-300 bg-white cursor-not-allowed';

  return (
    <div
      data-testid="pagination"
      className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
    >
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <label className="flex items-center gap-2">
          {!compact && <span className="text-gray-500">Rows per page</span>}
          <select
            data-testid="pagination-page-size"
            aria-label="Rows per page"
            value={safePageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <span className="hidden sm:inline text-gray-500" data-testid="pagination-summary">
          {safeTotal === 0
            ? `0 ${label}`
            : `${firstRow.toLocaleString()}–${lastRow.toLocaleString()} of ${safeTotal.toLocaleString()} ${label}`}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          data-testid="pagination-first"
          aria-label="First page"
          onClick={() => go(1)}
          disabled={atFirst}
          className={`${btnBase} ${atFirst ? btnDisabled : btnIdle}`}
        >
          «
        </button>
        <button
          type="button"
          data-testid="pagination-prev"
          aria-label="Previous page"
          onClick={() => go(safePage - 1)}
          disabled={atFirst}
          className={`${btnBase} ${atFirst ? btnDisabled : btnIdle}`}
        >
          ‹
        </button>
        {pages[0] > 1 && (
          <span className="px-1 text-gray-400 text-sm">…</span>
        )}
        {pages.map((p) => {
          const active = p === safePage;
          return (
            <button
              type="button"
              key={p}
              data-testid={`pagination-page-${p}`}
              aria-label={`Page ${p}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => go(p)}
              className={`${btnBase} ${active ? btnActive : btnIdle}`}
            >
              {p}
            </button>
          );
        })}
        {pages[pages.length - 1] < totalPages && (
          <span className="px-1 text-gray-400 text-sm">…</span>
        )}
        <button
          type="button"
          data-testid="pagination-next"
          aria-label="Next page"
          onClick={() => go(safePage + 1)}
          disabled={atLast}
          className={`${btnBase} ${atLast ? btnDisabled : btnIdle}`}
        >
          ›
        </button>
        <button
          type="button"
          data-testid="pagination-last"
          aria-label="Last page"
          onClick={() => go(totalPages)}
          disabled={atLast}
          className={`${btnBase} ${atLast ? btnDisabled : btnIdle}`}
        >
          »
        </button>
        <span className="ml-2 text-sm text-gray-500" data-testid="pagination-page-of">
          Page {safePage} of {totalPages}
        </span>
      </div>
    </div>
  );
};

export default Pagination;
