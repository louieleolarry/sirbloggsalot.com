import React, { useEffect } from 'react';

/**
 * Shared modal primitives.
 *
 * Every modal in the app should render through <BaseModal> so it inherits one
 * consistent, well-behaved shell:
 *   - a fixed overlay that always covers the full viewport,
 *   - a dialog capped at ~85vh with its own internal vertical scroll (long
 *     content never pushes the dialog off-screen or scrolls the page behind it),
 *   - body scroll locked while any modal is open,
 *   - Escape closes (when an onClose is provided and closeOnEsc isn't disabled),
 *   - a click on the backdrop closes (opt-out via closeOnBackdrop={false}).
 *
 * The dialog is a flex column so callers can pin a sticky header/footer and let
 * only the middle scroll: put the scrolling region in a child with
 * `flex-1 min-h-0 overflow-y-auto`. If a modal doesn't need internal structure,
 * its content just scrolls inside the dialog as a whole.
 */

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Close on Escape. Kept here (and re-exported) so components can import the
 * behavior from the shared modal module.
 */
export const useEscapeKey = (onClose, enabled = true) => {
  useEffect(() => {
    if (!enabled || typeof onClose !== 'function') return undefined;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, enabled]);
};

// Ref-count of open modals so nested/stacked modals don't unlock the body until
// the last one closes. Module-level so it's shared across every BaseModal.
let openModalCount = 0;

/**
 * Lock body scroll while a modal is open. Reference-counted, so stacked modals
 * (e.g. a confirm on top of a form) each hold the lock and the body only
 * unlocks once the last one unmounts. Restores the exact prior overflow value.
 */
export const useBodyScrollLock = (active = true) => {
  useEffect(() => {
    if (!active) return undefined;
    const { body } = document;
    if (openModalCount === 0) {
      body.dataset.prevOverflow = body.style.overflow || '';
      body.style.overflow = 'hidden';
    }
    openModalCount += 1;
    return () => {
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        body.style.overflow = body.dataset.prevOverflow || '';
        delete body.dataset.prevOverflow;
      }
    };
  }, [active]);
};

// Ref-count of surfaces that need the bottom-right corner (right-side drawers
// with footer actions), shared so stacked surfaces don't fight over the flag.
let hideLauncherCount = 0;

/**
 * Hide the Intercom launcher while a surface that owns the bottom-right corner
 * is open (the launcher otherwise sits on top of drawer footer buttons).
 * Reference-counted like the scroll lock; the launcher comes back when the
 * last surface closes. No-op when Intercom isn't booted (tests, ad blockers).
 */
export const useHideIntercomLauncher = (active = true) => {
  useEffect(() => {
    if (!active || typeof window.Intercom !== 'function') return undefined;
    if (hideLauncherCount === 0) window.Intercom('update', { hide_default_launcher: true });
    hideLauncherCount += 1;
    return () => {
      hideLauncherCount = Math.max(0, hideLauncherCount - 1);
      if (hideLauncherCount === 0 && typeof window.Intercom === 'function') {
        window.Intercom('update', { hide_default_launcher: false });
      }
    };
  }, [active]);
};

// ---------------------------------------------------------------------------
// BaseModal
// ---------------------------------------------------------------------------

/**
 * @param {object}   props
 * @param {boolean}  [props.isOpen=true]        When false, renders nothing.
 * @param {function} props.onClose              Called on Esc / backdrop click / close affordances.
 * @param {node}     props.children             Dialog contents.
 * @param {string}   [props.className]          Extra classes on the dialog box (sizing, etc).
 * @param {string}   [props.overlayClassName]   Extra classes on the overlay (e.g. z-index, tint).
 * @param {boolean}  [props.closeOnEsc=true]
 * @param {boolean}  [props.closeOnBackdrop=true]
 * @param {string}   [props.labelledBy]         id of the dialog title, for a11y.
 */
export function BaseModal({
  isOpen = true,
  onClose,
  children,
  className = '',
  overlayClassName = '',
  closeOnEsc = true,
  closeOnBackdrop = true,
  labelledBy,
}) {
  useEscapeKey(onClose, isOpen && closeOnEsc);
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const handleBackdrop = (e) => {
    if (!closeOnBackdrop) return;
    // Only when the click lands on the overlay itself, not a child.
    if (e.target === e.currentTarget && typeof onClose === 'function') onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 ${overlayClassName}`}
      onClick={handleBackdrop}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col min-h-0 overflow-y-auto ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

export default BaseModal;
