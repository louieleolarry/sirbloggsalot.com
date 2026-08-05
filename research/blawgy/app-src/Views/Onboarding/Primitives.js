import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, X, Plus, Loader2, AlertCircle, Sparkles } from 'lucide-react';

/*
 * Premium onboarding primitives (Phase B).
 *
 * These are the one-thing-per-screen building blocks that mirror the
 * DeepContent onboarding bar: a thin animated progress bar, big
 * tracking-tight headlines, Enter-to-advance inputs, live elapsed
 * counters on every background wait, pulsing status rows, AI-prefilled
 * "edit anything that's off" fields with a one-shot amber glow, real-number
 * payoff reveals, and soft-fail amber notes.
 *
 * CSS-only animation (keyframes injected once below). No new dependencies,
 * no framer-motion here — the parent Onboarding view still imports
 * framer-motion for the legacy chat pieces, but the new premium flow is
 * pure CSS so counters stay crisp and cheap.
 *
 * Palette: single accent = the app's primary (#0F172A slate) for the
 * progress bar / CTAs, emerald for success/payoff, amber for AI-edited +
 * soft-fail notes, rose for hard errors. tabular-nums on every counter.
 */

// ---------------------------------------------------------------------------
// One-time keyframe injection. Scoped by id so Strict-Mode double-mounts and
// remounts don't stack duplicate <style> nodes.
// ---------------------------------------------------------------------------
const STYLE_ID = 'blawgy-onboarding-premium-styles';
const KEYFRAMES = `
@keyframes ob-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ob-rise-sm { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ob-pop { 0% { opacity: 0; transform: scale(0.96); } 60% { transform: scale(1.02); } 100% { opacity: 1; transform: scale(1); } }
@keyframes ob-pulse-dot { 0%, 100% { opacity: 0.35; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1); } }
@keyframes ob-shimmer { 0% { background-position: -300px 0; } 100% { background-position: 300px 0; } }
@keyframes ob-amber-glow {
  0%   { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.0); border-color: rgba(245, 158, 11, 0.9); }
  25%  { box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.18); border-color: rgba(245, 158, 11, 0.9); }
  100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.0); border-color: rgb(229, 231, 235); }
}
@keyframes ob-check-in { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }
@keyframes ob-count-flash { 0% { color: #059669; } 100% { color: inherit; } }
.ob-rise { animation: ob-rise 0.42s cubic-bezier(0.16, 1, 0.3, 1) both; }
.ob-rise-sm { animation: ob-rise-sm 0.32s cubic-bezier(0.16, 1, 0.3, 1) both; }
.ob-pop { animation: ob-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
.ob-amber-glow { animation: ob-amber-glow 2.4s ease-out 1 both; }
.ob-check-in { animation: ob-check-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
.ob-skeleton {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
  background-size: 600px 100%;
  animation: ob-shimmer 1.4s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .ob-rise, .ob-rise-sm, .ob-pop, .ob-amber-glow, .ob-check-in, .ob-skeleton { animation: none !important; }
}
`;

export const useOnboardingStyles = () => {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
    // Intentionally NOT removed on unmount: the sheet is idempotent (guarded
    // by id) and cheap, and keeping it avoids a flash if the view remounts.
  }, []);
};

// ---------------------------------------------------------------------------
// Thin animated progress bar (top of the shell). Fills to `value` (0..1).
// ---------------------------------------------------------------------------
export const ProgressBar = ({ value }) => {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-1 w-full bg-gray-100" data-testid="onboarding-progress">
      <div
        className="h-full bg-primary transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Live elapsed-seconds counter. Starts on mount, ticks every second, and
// renders "12s" / "1m 05s". tabular-nums so the digits don't jitter.
// `running` can be flipped false to freeze the counter (e.g. once a result
// lands but the row is still visible during the crossfade).
// ---------------------------------------------------------------------------
export const useElapsed = (running = true, startAt = null) => {
  const startRef = useRef(startAt || Date.now());
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - startRef.current) / 1000));
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);
  return elapsed;
};

export const formatElapsed = (s) => {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${String(rem).padStart(2, '0')}s`;
};

export const ElapsedCounter = ({ seconds, prefix = '', className = '' }) => (
  <span className={`tabular-nums ${className}`} data-testid="elapsed-counter">
    {prefix}{formatElapsed(seconds)}
  </span>
);

// ---------------------------------------------------------------------------
// Screen scaffold: centered column, headline + optional subhead, then body.
// Headlines are text-3xl/4xl tracking-tight per the styling brief.
// text-center is set here on purpose: these screens used to inherit it from
// the since-removed .App rule, and the whole scaffold is designed around it.
// ---------------------------------------------------------------------------
export const Screen = ({ title, subtitle, children, testId }) => (
  <div className="w-full max-w-xl mx-auto text-center ob-rise" data-testid={testId}>
    {title && (
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 text-balance">
        {title}
      </h1>
    )}
    {subtitle && (
      <p className="mt-3 text-base sm:text-lg text-gray-500 leading-relaxed">{subtitle}</p>
    )}
    <div className={title || subtitle ? 'mt-8' : ''}>{children}</div>
  </div>
);

// ---------------------------------------------------------------------------
// Big single-line text field with an inline submit arrow. Enter advances.
// ---------------------------------------------------------------------------
export const BigInput = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  prefix,
  autoFocus = true,
  disabled = false,
  testId = 'big-input',
  submitLabel = 'Continue'
}) => {
  const canSubmit = !disabled && !!String(value || '').trim();
  return (
    <div>
      <div className="flex items-stretch gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
          {prefix && <span className="text-gray-400 text-lg select-none">{prefix}</span>}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            data-testid={testId}
            className="flex-1 bg-transparent py-4 text-lg text-gray-900 placeholder-gray-300 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => canSubmit && onSubmit()}
          disabled={!canSubmit}
          data-testid={`${testId}-submit`}
          className="flex items-center justify-center w-14 rounded-2xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:bg-gray-200 disabled:text-gray-400"
          aria-label={submitLabel}
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
      <p className="mt-3 text-xs text-gray-400 flex items-center gap-1.5">
        <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] font-medium text-gray-500">Enter</kbd>
        to continue
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Primary CTA button. Full-width, shows a spinner + label when busy.
// ---------------------------------------------------------------------------
export const PrimaryButton = ({ children, onClick, disabled, busy, testId, busyLabel = 'Working…' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || busy}
    data-testid={testId}
    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-white font-medium text-base hover:bg-primary-hover transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
  >
    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
    {busy ? busyLabel : children}
  </button>
);

export const GhostButton = ({ children, onClick, testId, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    data-testid={testId}
    className={`text-sm font-medium text-gray-400 hover:text-gray-700 transition-colors ${className}`}
  >
    {children}
  </button>
);

// ---------------------------------------------------------------------------
// Status row list for background waits. Each row has a state:
//   'pending' (dim), 'active' (pulsing dot + label), 'done' (emerald check).
// Rows below the active one render dim. Used by the crawl + plan stages so
// the user always sees the work being done.
// ---------------------------------------------------------------------------
export const StatusRows = ({ rows }) => (
  <div className="space-y-3" data-testid="status-rows">
    {rows.map((r, i) => (
      <div
        key={i}
        className={`flex items-center gap-3 transition-opacity duration-300 ${
          r.state === 'pending' ? 'opacity-40' : 'opacity-100'
        }`}
      >
        <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          {r.state === 'done' ? (
            <span className="ob-check-in w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </span>
          ) : r.state === 'active' ? (
            <span
              className="w-2.5 h-2.5 rounded-full bg-primary"
              style={{ animation: 'ob-pulse-dot 1.1s ease-in-out infinite' }}
            />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full border border-gray-300" />
          )}
        </span>
        <span
          className={`text-[15px] ${
            r.state === 'done'
              ? 'text-gray-500'
              : r.state === 'active'
              ? 'text-gray-900 font-medium'
              : 'text-gray-400'
          }`}
        >
          {r.label}
        </span>
      </div>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Soft-fail amber note. Never a blocker — informs the user something didn't
// land and we're rolling on. Optional inline action (e.g. retry / add manually).
// ---------------------------------------------------------------------------
export const SoftNote = ({ children, testId = 'soft-note' }) => (
  <div
    className="ob-rise-sm flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800"
    data-testid={testId}
  >
    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
    <div>{children}</div>
  </div>
);

// ---------------------------------------------------------------------------
// "AI auto-filled" badge. Sits above prefilled fields with the honest
// "edit anything that's off" framing.
// ---------------------------------------------------------------------------
export const AiFilledBadge = ({ children = "AI auto-filled. Edit anything that's off", testId = 'ai-filled-badge' }) => (
  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1" data-testid={testId}>
    <Sparkles className="w-3 h-3" />
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Payoff stat — the real-number reveal. Big tabular number + label, emerald.
// ---------------------------------------------------------------------------
export const PayoffStat = ({ value, label, testId = 'payoff-stat' }) => (
  <div className="ob-pop inline-flex items-baseline gap-2" data-testid={testId}>
    <span className="text-4xl font-semibold tracking-tight text-emerald-600 tabular-nums">{value}</span>
    <span className="text-base text-gray-500">{label}</span>
  </div>
);

// ---------------------------------------------------------------------------
// Selectable chip (competitor, multi-select bubble). Emerald tick when picked.
// ---------------------------------------------------------------------------
export const Chip = ({ label, selected, onClick, onRemove, testId }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all ${
      selected
        ? 'border-primary bg-primary text-white'
        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
    }`}
    data-testid={testId}
  >
    {onClick ? (
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5">
        {selected && <Check className="w-3.5 h-3.5" />}
        {label}
      </button>
    ) : (
      <>
        {selected && <Check className="w-3.5 h-3.5" />}
        {label}
      </>
    )}
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className={`ml-0.5 rounded-full p-0.5 ${selected ? 'hover:bg-white/20' : 'hover:bg-gray-100'}`}
        aria-label={`Remove ${label}`}
      >
        <X className="w-3 h-3" />
      </button>
    )}
  </span>
);

// ---------------------------------------------------------------------------
// Bubble multi/single select with a free-text add. Enter in the input adds
// (multi) or confirms (single). Mirrors the old OptionBubbles contract but
// re-skinned for the premium flow.
// ---------------------------------------------------------------------------
export const BubbleSelect = ({
  options,
  selected,
  onSelect,
  multiSelect = false,
  customValue,
  onCustomChange,
  onAddCustom,
  placeholder,
  loading = false
}) => {
  const selectedList = multiSelect ? (selected || []) : [];
  const isPicked = (opt) => (multiSelect ? selectedList.includes(opt) : selected === opt);
  const toggle = (opt) => {
    if (multiSelect) {
      onSelect(selectedList.includes(opt) ? selectedList.filter((x) => x !== opt) : [...selectedList, opt]);
    } else {
      onSelect(opt);
    }
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3 min-h-[2.5rem]" data-testid="bubble-options">
        {loading && options.length === 0 ? (
          [0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="ob-skeleton h-9 rounded-full" style={{ width: `${70 + (i % 3) * 26}px` }} />
          ))
        ) : (
          options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                isPicked(opt)
                  ? 'border-primary bg-primary text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-primary/40'
              }`}
              data-testid={`bubble-${opt}`}
            >
              {multiSelect && isPicked(opt) && <Check className="w-3.5 h-3.5" />}
              {opt}
            </button>
          ))
        )}
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
        <input
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && customValue.trim()) {
              e.preventDefault();
              onAddCustom();
            }
          }}
          placeholder={placeholder}
          data-testid="bubble-custom-input"
          className="flex-1 bg-transparent py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none"
        />
        {customValue.trim() && (
          <button
            type="button"
            onClick={onAddCustom}
            className="rounded-lg bg-gray-100 hover:bg-gray-200 p-1.5 text-gray-600"
            aria-label="Add"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export { AlertCircle, Check, X, Plus, ArrowRight };
