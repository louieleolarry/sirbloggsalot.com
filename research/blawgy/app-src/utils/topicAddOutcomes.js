import apiClient from './apiClient';
import { invalidate } from './apiCache';

// How often / how long we poll for a background topic-add's outcome before
// falling back to the soft "still working" state. Shared by the Add-topics
// drawer and the Keywords page so the two surfaces can never disagree.
//
// The schedule backs OFF instead of sitting on a flat 5s floor. Most background
// expansions finish within a second or two of the ACK, but the old first poll
// was 5s away, so even an instant add read as ~10s of nothing (4s server
// time-box + 5s first poll). Polling at 1s/2s first cuts that to ~5s while the
// tail still settles onto the cheap 5s cadence.
export const OUTCOME_POLL_SCHEDULE_MS = [1_000, 2_000, 3_000, 5_000];
export const OUTCOME_POLL_INTERVAL_MS = OUTCOME_POLL_SCHEDULE_MS[OUTCOME_POLL_SCHEDULE_MS.length - 1];
export const OUTCOME_POLL_BUDGET_MS = 120_000;

/** Delay before poll #n (0-based); the last entry repeats forever. */
export const pollDelayMs = (attempt) =>
  OUTCOME_POLL_SCHEDULE_MS[Math.min(attempt, OUTCOME_POLL_SCHEDULE_MS.length - 1)];

/**
 * Watch a background topic add ("expanding" ACK) until its recorded outcome
 * lands, then report it exactly once via onOutcome:
 *   { status: 'added', count }        real entries were scheduled
 *   { status: 'covered', message }    everything was already owned; nothing added
 *   { status: 'failed', message }     the expansion died; offer a retry
 *   { status: 'slow' }                poll budget exhausted; check the calendar
 *
 * Polls GET /api/plan/:site/topic-adds. Records with status 'expanding' mean
 * the backend is still working — keep polling. Only records stamped at/after
 * this add count (a minute of clock-skew grace), so a stale earlier outcome
 * for the same label can't resolve this one. Invalidates the plan cache before
 * reporting so the calendar refetches fresh.
 *
 * Returns a cancel() that stops the watch (close/unmount).
 */
export function watchTopicAdd({ site, label, startedAt = Date.now(), onOutcome }) {
  let timer = null;
  let cancelled = false;
  let attempt = 0;

  const report = (outcome) => {
    if (cancelled) return;
    invalidate(`plan:${site}`);
    onOutcome(outcome);
  };

  const tick = async () => {
    let record = null;
    try {
      const resp = await apiClient.get(`/api/plan/${site}/topic-adds`);
      const r = (resp.data?.results || {})[label];
      const fresh = r?.at && new Date(r.at).getTime() >= startedAt - 60_000;
      if (fresh && r.status !== 'expanding') record = r;
    } catch (err) {
      // Transient poll error: just wait for the next tick.
    }
    if (cancelled) return;
    if (record) {
      if (record.status === 'failed') {
        report({ status: 'failed', message: record.message || null });
      } else if (record.status === 'added' && record.added > 0) {
        report({ status: 'added', count: record.added });
      } else {
        // Carry the owners the guard recorded (bounded on the backend) so the
        // covered row can link to the post/page that owns the topic — same
        // CoveredLine the synchronous add path renders.
        report({ status: 'covered', message: record.message || null, owners: record.owners || null });
      }
      return;
    }
    if (Date.now() - startedAt >= OUTCOME_POLL_BUDGET_MS) {
      report({ status: 'slow' });
      return;
    }
    attempt += 1;
    timer = setTimeout(tick, pollDelayMs(attempt));
  };

  timer = setTimeout(tick, pollDelayMs(attempt));
  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}
