import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight, CheckCircle2, ExternalLink, Eye, Loader2, Pencil, RotateCcw,
  Search, Sparkles, X,
} from 'lucide-react';
import InfoTip from '../../components/InfoTip';
import { TriggerChip, SectionTitle, BeforeAfterRow, BodyDiff } from './updateShared';

/**
 * The Updates review surface: ONE panel that makes the case for an update
 * (the data), shows what the analysis found (SERP + intent + reader data),
 * lays out the recommended changes in plain sentences, and renders a
 * GitHub-style before/after diff the owner can edit before approving.
 * No modals on modals; everything happens here. The chips, before/after rows
 * and body diff live in updateShared.js, shared with the History cards.
 */

const INTENT_LABELS = {
  informational: 'want to learn',
  commercial: 'are comparing options',
  transactional: 'are ready to act',
  local: 'want something nearby',
  tool: 'want an interactive tool',
};

/** The evidence numbers, laid out so the claim is checkable at a glance. */
function EvidenceGrid({ update }) {
  const n = update.evidence?.numbers || {};
  const cells = [];
  if (Number.isFinite(n.position)) cells.push({ label: 'Google position', value: `#${n.position}`, tip: 'position' });
  if (Number.isFinite(n.impressions)) cells.push({ label: 'Searches seeing it weekly', value: n.impressions.toLocaleString(), tip: 'impressions' });
  if (Number.isFinite(n.ctr)) cells.push({ label: 'Click rate', value: `${(n.ctr * 100).toFixed(1)}%`, tip: 'ctr' });
  if (Number.isFinite(n.expectedCtr)) cells.push({ label: 'Typical for that spot', value: `${(n.expectedCtr * 100).toFixed(1)}%`, tip: 'ctr' });
  if (Number.isFinite(n.avgWeeklyClicksBaseline)) cells.push({ label: 'Clicks a week, before', value: Math.round(n.avgWeeklyClicksBaseline).toLocaleString() });
  if (Number.isFinite(n.latestWeeklyClicks)) cells.push({ label: 'Clicks a week, now', value: Math.round(n.latestWeeklyClicks).toLocaleString() });
  if (!cells.length) return null;
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="evidence-grid">
      {cells.map((c) => (
        <div key={c.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="text-base font-semibold text-slate-900">{c.value}</div>
          <div className="text-xs text-slate-500">{c.tip ? <InfoTip term={c.tip}>{c.label}</InfoTip> : c.label}</div>
        </div>
      ))}
    </div>
  );
}

function PixelEvidence({ pixel }) {
  // Needs real sample size before we assert where a page loses people;
  // 50 views mirrors PIXEL_MIN_VIEWS in the backend update engine.
  if (!pixel?.worstExitSection || (pixel.views || 0) < 50) return null;
  const worst = pixel.worstExitSection;
  // exitShare arrives as an integer percent (0-100) from behaviorRollupJob.
  const pct = Math.round(worst.exitShare || 0);
  return (
    <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm text-violet-900" data-testid="pixel-evidence">
      <span className="font-semibold">Your reader data:</span>{' '}
      {pct}% of readers leave at "{worst.title || worst.id}" ({(pixel.views || 0).toLocaleString()} visits
      in the last 28 days, median scroll {pixel.scrollP50 || 0}%). That section is where this page loses people.
    </div>
  );
}

/** Pre-generation: what the analysis WILL do. Post: what it found. */
function AnalysisSection({ update }) {
  const analysis = update.analysis;
  const intent = update.intent;

  if (!analysis) {
    return (
      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-sm text-slate-600" data-testid="analysis-pending">
        <div className="font-medium text-slate-700">When you start this update, we will:</div>
        <ul className="mt-1.5 space-y-1">
          <li className="flex gap-2"><Search size={14} className="mt-0.5 shrink-0 text-slate-400" /> Pull today's top 5 Google results for this search and read each page</li>
          <li className="flex gap-2"><Search size={14} className="mt-0.5 shrink-0 text-slate-400" /> Find what they cover that your page does not</li>
          <li className="flex gap-2"><Search size={14} className="mt-0.5 shrink-0 text-slate-400" /> Run two independent checks on what searchers actually want; they must agree or we stay conservative</li>
          <li className="flex gap-2"><Search size={14} className="mt-0.5 shrink-0 text-slate-400" /> Fold in your reader data where we have it</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-3" data-testid="analysis-found">
      {intent?.intent && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-sm font-semibold text-slate-900">
            {intent.intent === 'uncertain'
              ? 'Search intent could not be confirmed, so the change stays conservative.'
              : <>People searching this {INTENT_LABELS[intent.intent] || intent.intent}{intent.confidence ? ` (${intent.confidence} confidence)` : ''}.</>}
          </div>
          {intent.winningFormat && (
            <div className="mt-0.5 text-sm text-slate-600">What wins today: {intent.winningFormat}.</div>
          )}
          {intent.reasoning && <div className="mt-1 text-sm text-slate-500">{intent.reasoning}</div>}
          {intent.disagreement && (
            <div className="mt-1 text-xs text-slate-400">
              Our two checks read it differently ({intent.disagreement.a} vs {intent.disagreement.b}), so we kept the edit small.
            </div>
          )}
        </div>
      )}

      {Array.isArray(analysis.serpTopPages) && analysis.serpTopPages.length > 0 && (
        <div>
          <SectionTitle>Pages that outrank you (we read these)</SectionTitle>
          <ul className="mt-1.5 space-y-1">
            {analysis.serpTopPages.map((p) => (
              <li key={p.url} className="text-sm">
                <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 text-slate-700 hover:text-slate-900 hover:underline">
                  <ExternalLink size={13} className="mt-0.5 shrink-0 text-slate-400" />
                  <span className="line-clamp-1">{p.title || p.url}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(analysis.headingGaps) && analysis.headingGaps.length > 0 && (
        <div>
          <SectionTitle>They cover, you do not</SectionTitle>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {analysis.headingGaps.slice(0, 8).map((g) => (
              <span key={g} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">{g}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Edit mode: title/meta inputs + the body as HTML, diff re-rendering live. */
function DraftEditor({ update, saving, onSave, onCancel }) {
  const draft = update.draft || {};
  const [title, setTitle] = useState(draft.after?.title ?? draft.title ?? '');
  const [meta, setMeta] = useState(draft.after?.metaDescription ?? draft.metaDescription ?? '');
  const [body, setBody] = useState(draft.contentHtml || '');

  return (
    <div className="space-y-3" data-testid="draft-editor">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="edit-title">Title</label>
        <input
          id="edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="edit-meta">Meta description</label>
        <textarea
          id="edit-meta"
          value={meta}
          onChange={(e) => setMeta(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      {draft.contentHtml && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="edit-body">
            Article body (HTML)
          </label>
          <textarea
            id="edit-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={14}
            spellCheck={false}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs leading-5 focus:border-primary focus:outline-none"
          />
          <div className="mt-2">
            <SectionTitle>Your edit, against the live page</SectionTitle>
            <div className="mt-1">
              <BodyDiff beforeHtml={draft.before?.contentHtml || ''} afterHtml={body} />
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSave({ title, metaDescription: meta, ...(draft.contentHtml ? { contentHtml: body } : {}) })}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          {saving ? 'Saving...' : 'Save edits'}
        </button>
        <button onClick={onCancel} disabled={saving} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50">
          Discard edits
        </button>
      </div>
    </div>
  );
}

const UpdateReviewPanel = ({ update, busy, savingDraft, onClose, onGenerate, onApprove, onDismiss, onRevert, onSaveDraft }) => {
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => { setEditing(false); }, [update?._id, update?.status]);

  if (!update) return null;
  const draft = update.draft || {};
  const status = update.status;

  return (
    <div className="fixed inset-0 z-[60]" data-testid="update-review-panel">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {(update.triggers || []).map((t) => <TriggerChip key={t} trigger={t} />)}
              {update.estMonthlyClickGain > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <ArrowUpRight size={13} /> worth up to ~{update.estMonthlyClickGain} clicks/mo
                </span>
              )}
            </div>
            <h3 className="mt-1.5 truncate text-lg font-bold text-slate-900">{update.blogTitle || update.pagePath}</h3>
            <a href={update.pageUrl} target="_blank" rel="noreferrer" className="text-xs text-slate-500 hover:underline break-all">
              {update.pagePath} <ExternalLink size={11} className="mb-0.5 inline" />
            </a>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <SectionTitle>Why this page needs attention</SectionTitle>
          <ul className="mt-1.5 space-y-1.5">
            {(update.why || []).map((line, i) => (
              <li key={i} className="text-sm text-slate-700">{line}</li>
            ))}
          </ul>
          <EvidenceGrid update={update} />
          <PixelEvidence pixel={update.pixel} />

          <div className="mt-5">
            <SectionTitle>{update.analysis ? 'What the analysis found' : 'The analysis'}</SectionTitle>
            <AnalysisSection update={update} />
          </div>

          {status === 'generating' && (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600" data-testid="generating-state">
              <div className="flex items-center gap-2 font-medium text-slate-800">
                <Loader2 size={15} className="animate-spin" /> Writing the update
              </div>
              <p className="mt-1">
                We are reading what ranks for this search today and writing against it. This usually
                takes 2 to 4 minutes; you can close this panel, it keeps working.
              </p>
            </div>
          )}

          {update.generateError && status === 'proposed' && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Last attempt did not pass our safety checks ({update.generateError}). You can try again.
            </div>
          )}

          {status === 'ready' && (
            <>
              <div className="mt-5">
                <SectionTitle>The recommended update</SectionTitle>
                <ul className="mt-1.5 space-y-1.5" data-testid="update-plan">
                  {(draft.plan || (draft.changeSummary ? [draft.changeSummary] : [])).map((line, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <Sparkles size={14} className="mt-0.5 shrink-0 text-slate-400" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                {draft.widget?.included && (
                  <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
                    Built-in interactive tool: {draft.widget.spec}
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <SectionTitle>Before and after</SectionTitle>
                  {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
                      data-testid="edit-draft-button"
                    >
                      <Pencil size={12} /> Edit before publishing
                    </button>
                  )}
                </div>
                {draft.editedByOwner && !editing && (
                  <div className="text-xs text-slate-400">Includes your edits.</div>
                )}
                {editing ? (
                  <DraftEditor
                    update={update}
                    saving={savingDraft}
                    onSave={async (edits) => {
                      const ok = await onSaveDraft(update, edits);
                      if (ok) setEditing(false);
                    }}
                    onCancel={() => setEditing(false)}
                  />
                ) : (
                  <>
                    <BeforeAfterRow label="Title" before={draft.before?.title} after={draft.after?.title} />
                    <BeforeAfterRow label="Description" before={draft.before?.metaDescription} after={draft.after?.metaDescription} />
                    <div>
                      <SectionTitle>Article body</SectionTitle>
                      <div className="mt-1">
                        <BodyDiff beforeHtml={draft.before?.contentHtml || ''} afterHtml={draft.contentHtml || ''} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {status === 'published' && (
            <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
              <div className="flex items-center gap-1.5 font-medium"><Eye size={14} /> Live.</div>
              {update.publishResult?.note && <p className="mt-0.5">{update.publishResult.note}</p>}
              <p className="mt-0.5">We watch its Google results for the next 4 weeks and tell you how it went.</p>
            </div>
          )}

          {status === 'flagged' && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
              {update.flagReason || 'This update looks like it hurt the page. You can put the old version back.'}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-200 px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {status === 'proposed' && (
              <>
                <button
                  onClick={() => onGenerate(update)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {busy ? 'Starting...' : 'Write the update'}
                </button>
                <span className="text-xs text-slate-400">Takes 2 to 4 minutes. Nothing goes live without your approval.</span>
              </>
            )}
            {status === 'ready' && !editing && (
              <button
                onClick={() => onApprove(update)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {busy ? 'Publishing...' : 'Approve and publish'}
              </button>
            )}
            {status === 'flagged' && (
              <button
                onClick={() => onRevert(update)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                {busy ? 'Restoring...' : 'Put the old version back'}
              </button>
            )}
            {['proposed', 'ready', 'flagged'].includes(status) && !editing && (
              <button
                onClick={() => onDismiss(update)}
                disabled={busy}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-60"
              >
                {status === 'flagged' ? 'Keep it anyway' : 'Dismiss'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateReviewPanel;
