import React from 'react';
import {
  CheckCircle2, XCircle, AlertTriangle, ExternalLink, Info,
} from 'lucide-react';
import FlowCards from './FlowCards';

/**
 * Card registry.
 *
 * The whole point of the assistant rendering real UI rather than describing it:
 * a tool returns { card, props } and the widget mounts the matching component.
 * The model never sees these props, only a one-line summary, which is why a
 * 200-row table costs the same context as a sentence.
 */

const Shell = ({ title, subtitle, children }) => (
  <div className="mt-2 rounded-lg border border-gray-200 bg-white overflow-hidden">
    {(title || subtitle) && (
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
        {title && <div className="text-xs font-semibold text-gray-900">{title}</div>}
        {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
      </div>
    )}
    {children}
  </div>
);

const Empty = ({ children }) => (
  <div className="px-3 py-4 text-xs text-gray-500">{children}</div>
);

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const STATUS_STYLE = {
  published: 'bg-green-100 text-green-700',
  scheduled: 'bg-blue-100 text-blue-700',
  planned: 'bg-slate-100 text-slate-600',
  in_queue: 'bg-amber-100 text-amber-700',
  generating: 'bg-amber-100 text-amber-700',
  generated: 'bg-indigo-100 text-indigo-700',
  cms_draft: 'bg-purple-100 text-purple-700',
  failed: 'bg-red-100 text-red-700',
};

const Pill = ({ status }) => (
  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[status] || 'bg-gray-100 text-gray-600'}`}>
    {String(status || 'unknown').replace(/_/g, ' ')}
  </span>
);

// ---------------------------------------------------------------------------

const ArticleTable = ({ rows = [], status, onAction }) => {
  if (!rows.length) return <Shell title="Articles"><Empty>Nothing to show.</Empty></Shell>;
  return (
    <Shell title={`${rows.length} article${rows.length === 1 ? '' : 's'}`} subtitle={status && status !== 'all' ? status : null}>
      <div className="max-h-72 overflow-auto">
        <table className="w-full text-xs">
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div className="font-medium text-gray-900 truncate max-w-[240px]" title={r.title}>
                    {r.title}
                  </div>
                  {r.keyword && <div className="text-[10px] text-gray-500 truncate">{r.keyword}</div>}
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-gray-600">{fmtDate(r.publishDate)}</td>
                <td className="px-2 py-2 whitespace-nowrap"><Pill status={r.status} /></td>
                <td className="px-2 py-2 whitespace-nowrap text-right">
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      <ExternalLink size={12} className="inline" />
                    </a>
                  )}
                  {!r.url && onAction && r.origin === 'article' && (
                    <button
                      type="button"
                      onClick={() => onAction('rename_article', { id: r.id })}
                      className="text-[10px] text-primary hover:underline"
                    >
                      rename
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
};

const PlanCalendar = ({ entries = [], config, paused }) => (
  <Shell
    title={`Content plan${paused ? ' (paused)' : ''}`}
    subtitle={config ? `${config.weeks || '?'}-week horizon, auto-renew ${config.autoRenew === false ? 'off' : 'on'}` : null}
  >
    {entries.length === 0 ? <Empty>No entries scheduled.</Empty> : (
      <div className="max-h-72 overflow-auto divide-y divide-gray-50">
        {entries.slice(0, 40).map((e) => (
          <div key={e.id} className="px-3 py-2 flex items-start gap-2">
            <div className="text-[10px] text-gray-500 w-12 shrink-0 pt-0.5">{fmtDate(e.scheduledDate)}</div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-gray-900 truncate">{e.title}</div>
              {e.cluster && <div className="text-[10px] text-gray-500 truncate">{e.cluster}</div>}
            </div>
            <Pill status={e.status} />
          </div>
        ))}
      </div>
    )}
  </Shell>
);

const DiagnosticReport = ({ title, verdict, checks = [] }) => {
  const icon = { ok: CheckCircle2, warn: AlertTriangle, fail: XCircle, skip: Info };
  const tone = {
    ok: 'text-green-600', warn: 'text-amber-600', fail: 'text-red-600', skip: 'text-gray-400',
  };
  return (
    <Shell title={title} subtitle={`Verdict: ${verdict}`}>
      <div className="divide-y divide-gray-50">
        {checks.map((c, i) => {
          const Icon = icon[c.status] || Info;
          return (
            <div key={`${c.check}-${i}`} className="px-3 py-2 flex gap-2 items-start">
              <Icon size={13} className={`${tone[c.status]} mt-0.5 shrink-0`} />
              <div className="min-w-0">
                <div className="text-xs font-medium text-gray-900">{c.check.replace(/_/g, ' ')}</div>
                <div className="text-[11px] text-gray-600">{c.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
};

const SettingsView = ({ settings = {} }) => {
  const rows = [
    ['Platform', settings.platform || 'not set'],
    ['Connected', settings.credentialsComplete === 'n/a' ? 'n/a' : (settings.credentialsComplete ? 'yes' : 'no')],
    ['Posts per week', settings.postsPerWeek || 'not set'],
    ['Language', settings.language],
    ['Images', settings.includeImages ? 'on' : 'off'],
    ['Internal links', settings.internalLinks ? 'on' : 'off'],
    ['Post as draft', settings.postAsDraft ? 'on' : 'off'],
  ];
  return (
    <Shell title={`Settings — ${settings.site || ''}`}>
      <div className="divide-y divide-gray-50">
        {rows.map(([k, v]) => (
          <div key={k} className="px-3 py-1.5 flex justify-between text-xs">
            <span className="text-gray-500">{k}</span>
            <span className="text-gray-900 font-medium">{String(v)}</span>
          </div>
        ))}
      </div>
    </Shell>
  );
};

const BillingStatus = ({ billing = {}, cap, failedInvoiceUrl }) => (
  <Shell title="Billing">
    <div className="px-3 py-2 space-y-1 text-xs">
      {billing.billedByPartner ? (
        <div className="text-gray-700">Billed by your agency, not through Blawgy.</div>
      ) : (
        <>
          <div className="flex justify-between">
            <span className="text-gray-500">Plan</span>
            <span className="font-medium text-gray-900">{billing.planName || '—'}</span>
          </div>
          {billing.isTrialing && (
            <div className="flex justify-between">
              <span className="text-gray-500">Trial articles left</span>
              <span className="font-medium">{billing.trialArticlesRemaining}</span>
            </div>
          )}
          {cap && (
            <div className="flex justify-between">
              <span className="text-gray-500">Assistant can queue</span>
              <span className="font-medium">{cap.cap}/month</span>
            </div>
          )}
          {billing.frozen && (
            <div className="mt-2 rounded bg-red-50 p-2 text-red-700">
              Account frozen after a failed payment.
              {failedInvoiceUrl && (
                <a href={failedInvoiceUrl} target="_blank" rel="noreferrer" className="ml-1 underline">
                  Pay invoice
                </a>
              )}
            </div>
          )}
          {billing.subscriptionEnded && !billing.frozen && (
            <div className="mt-2 rounded bg-amber-50 p-2 text-amber-800">
              This subscription is no longer active, so nothing is generating or publishing.
              Your plan and articles are kept.
            </div>
          )}
        </>
      )}
    </div>
  </Shell>
);

const ConfirmCard = ({ effect, reversible, onConfirm, onCancel }) => (
  <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
    <div className="flex gap-2">
      <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-amber-900">Confirm this</div>
        <div className="text-xs text-amber-800 mt-0.5">{effect}</div>
        {!reversible && (
          <div className="text-[10px] text-amber-700 mt-1">This cannot be undone.</div>
        )}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded bg-amber-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-amber-700"
          >
            Yes, do it
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-amber-300 px-2.5 py-1 text-[11px] text-amber-800 hover:bg-amber-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
);

const EscalateOffer = () => (
  <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
    That one needs a person. Ask me to get a human and I&apos;ll pass over everything so far.
  </div>
);

const EscalationStatus = ({ ok }) => (
  <div className={`mt-2 rounded-lg border p-3 text-xs ${ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
    {ok
      ? 'Handed over to the team with your full conversation. Someone will reply here.'
      : 'I could not open a support thread automatically. Use the chat bubble or email adam@blawgy.com.'}
  </div>
);

const SimpleList = ({ rows = [], title, render }) => (
  <Shell title={title}>
    {rows.length === 0 ? <Empty>Nothing here.</Empty> : (
      <div className="max-h-64 overflow-auto divide-y divide-gray-50">
        {rows.map((r, i) => (
          <div key={r.id || i} className="px-3 py-2 text-xs">{render(r)}</div>
        ))}
      </div>
    )}
  </Shell>
);

export const CARD_REGISTRY = {
  ArticleTable,
  PlanCalendar,
  DiagnosticReport,
  SettingsView,
  BillingStatus,
  ConfirmCard,
  EscalateOffer,
  EscalationStatus,
  // Guided setup, including the secure credential form.
  ...FlowCards,
  SettingsDiff: ({ site, rows = [] }) => (
    <Shell title="Changed" subtitle={site}>
      {rows.length === 0 ? <Empty>No visible change.</Empty> : (
        <div className="divide-y divide-gray-50">
          {rows.map((r, i) => (
            <div key={i} className="px-3 py-1.5 text-xs">
              <div className="text-gray-500">{r.label}</div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 line-through">{String(r.before ?? 'not set')}</span>
                <span className="text-gray-400">to</span>
                <span className="font-medium text-gray-900">{String(r.after ?? 'not set')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  ),
  AccountOverview: ({ snapshot }) => <SettingsView settings={{
    site: snapshot?.currentSite?.domain,
    platform: snapshot?.currentSite?.platform,
    credentialsComplete: snapshot?.currentSite?.connected,
    postsPerWeek: snapshot?.currentSite?.postsPerWeek,
    language: snapshot?.currentSite?.language,
    includeImages: snapshot?.currentSite?.includeImages,
    internalLinks: snapshot?.currentSite?.internalLinks,
    postAsDraft: snapshot?.currentSite?.postAsDraft,
  }} />,
  SiteList: ({ sites = [], current }) => (
    <SimpleList
      title="Your sites"
      rows={sites}
      render={(s) => (
        <span className={s.site === current ? 'font-semibold text-gray-900' : 'text-gray-700'}>
          {s.site}{s.site === current ? ' (current)' : ''}
        </span>
      )}
    />
  ),
  ProductList: ({ rows }) => (
    <SimpleList title="Products" rows={rows} render={(r) => (
      <div className="flex justify-between">
        <span className="truncate">{r.title}</span>
        {r.hidden && <span className="text-[10px] text-gray-400">hidden</span>}
      </div>
    )} />
  ),
  KeywordClusters: ({ clusters = [], manual = [] }) => (
    <SimpleList
      title={`${manual.length} manual keywords, ${clusters.length} clusters`}
      rows={clusters}
      render={(c) => <span>{c.label || c.name}</span>}
    />
  ),
  CompetitorList: ({ rows }) => (
    <SimpleList title="Competitors" rows={rows} render={(r) => <span>{r.domain}</span>} />
  ),
  WebhookList: ({ rows }) => (
    <SimpleList title="Webhooks" rows={rows} render={(r) => (
      <div className="flex justify-between">
        <span className="truncate">{r.name}</span>
        {r.recentFailures > 0 && <span className="text-red-600 text-[10px]">{r.recentFailures} failed</span>}
      </div>
    )} />
  ),
  WebhookFailures: ({ rows }) => (
    <SimpleList title="Failed deliveries" rows={rows} render={(r) => (
      <span>{r.event} — {r.responseStatus || 'no status'}</span>
    )} />
  ),
  QueueTable: ({ rows }) => (
    <SimpleList title="Job queue" rows={rows} render={(r) => (
      <div className="flex justify-between">
        <span>{r.type}</span><Pill status={r.status} />
      </div>
    )} />
  ),
  ArticleDetail: ({ title, status, url }) => (
    <Shell title={title} subtitle={status}>
      {url && (
        <div className="px-3 py-2 text-xs">
          <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            View live <ExternalLink size={11} className="inline" />
          </a>
        </div>
      )}
    </Shell>
  ),
  ChangeLog: ({ actions = [] }) => (
    <SimpleList title="Recent changes" rows={actions} render={(a) => (
      <div className="flex justify-between">
        <span>{a.tool.replace(/_/g, ' ')}</span>
        <span className="text-[10px] text-gray-400">{a.reverted ? 'undone' : a.status}</span>
      </div>
    )} />
  ),
};

/**
 * Render a { card, props } directive, or nothing if the card is unknown.
 *
 * Flow cards additionally receive `site` / `conversationId` / `onResult` so a
 * secure form can POST its own step without routing values through the chat.
 */
export default function AssistantCard({
  card, props, onAction, onConfirm, onCancel, site, conversationId, onFlowResult,
}) {
  const Component = CARD_REGISTRY[card];
  if (!Component) return null;
  return (
    <Component
      {...props}
      onAction={onAction}
      onConfirm={onConfirm}
      onCancel={onCancel}
      site={site}
      conversationId={conversationId}
      onResult={onFlowResult}
      onAdvance={(flowId, values) => onFlowResult?.({ __advance: { flowId, values } })}
    />
  );
}
