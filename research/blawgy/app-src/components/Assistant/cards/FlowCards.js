import React, { useState } from 'react';
import { Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { auth } from '../../../firebaseConfig';

/**
 * Flow cards, including the secure credential form.
 *
 * SecureFormCard posts its values straight to /api/assistant/flow/:id/step.
 * They never go through the chat input, are never added to the message list,
 * and are cleared from component state as soon as the request resolves — so a
 * credential never reaches the model, the transcript, or React DevTools history.
 */

const baseURL = process.env.NODE_ENV === 'production'
  ? 'https://app.blawgy.com'
  : (process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080');

const postStep = async ({ flowId, values, site, conversationId }) => {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`${baseURL}/api/assistant/flow/${flowId}/step`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ values, site, conversationId }),
  });
  return res.json();
};

const Frame = ({ title, children }) => (
  <div className="mt-2 rounded-lg border border-gray-200 bg-white overflow-hidden">
    <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-900">
      {title}
    </div>
    <div className="p-3">{children}</div>
  </div>
);

export const FlowInstructions = ({ title, heading, body = [], flowId, onAdvance }) => (
  <Frame title={title}>
    {heading && <div className="mb-1.5 text-xs font-medium text-gray-900">{heading}</div>}
    <ol className="space-y-1.5 text-xs text-gray-700">
      {body.map((line, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-gray-400">{i + 1}.</span>
          <span>{line}</span>
        </li>
      ))}
    </ol>
    <button
      type="button"
      onClick={() => onAdvance?.(flowId, {})}
      className="mt-3 flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-[11px] font-medium text-white hover:opacity-90"
    >
      Done, next <ArrowRight size={11} />
    </button>
  </Frame>
);

export const SecureFormCard = ({ title, fields = [], flowId, site, conversationId, onResult }) => {
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await postStep({ flowId, values, site, conversationId });
      // Clear immediately, whatever the outcome — nothing lingers in memory.
      setValues({});
      if (!result.success) setError(result.error || result.message || 'That did not work.');
      onResult?.(result);
    } catch {
      setValues({});
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Frame title={title}>
      <div className="mb-2 flex items-center gap-1.5 rounded bg-blue-50 px-2 py-1.5 text-[11px] text-blue-800">
        <Lock size={11} className="shrink-0" />
        Sent straight to your site. Never shown to the assistant.
      </div>

      <form onSubmit={submit} className="space-y-2">
        {fields.map((f) => (
          <div key={f.name}>
            <label htmlFor={`${flowId}-${f.name}`} className="block text-[11px] font-medium text-gray-700">
              {f.label}
            </label>
            <input
              id={`${flowId}-${f.name}`}
              type={f.type === 'password' ? 'password' : 'text'}
              autoComplete="off"
              spellCheck={false}
              value={values[f.name] || ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
            />
            {f.help && <div className="mt-0.5 text-[10px] text-gray-500">{f.help}</div>}
          </div>
        ))}

        {error && (
          <div className="rounded bg-red-50 px-2 py-1.5 text-[11px] text-red-700">{error}</div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-primary px-2.5 py-1.5 text-[11px] font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Checking…' : 'Connect'}
        </button>
      </form>
    </Frame>
  );
};

export const ChoiceCard = ({ title, prompt, options = [], flowId, site, conversationId, onResult }) => {
  const [busy, setBusy] = useState(false);

  const pick = async (id) => {
    if (!flowId) return;
    setBusy(true);
    const result = await postStep({ flowId, values: { choice: id }, site, conversationId });
    setBusy(false);
    onResult?.(result);
  };

  return (
    <Frame title={title || 'Pick one'}>
      {prompt && <div className="mb-2 text-xs text-gray-700">{prompt}</div>}
      <div className="space-y-1">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={busy}
            onClick={() => pick(o.id)}
            className="block w-full rounded border border-gray-200 px-2.5 py-1.5 text-left text-xs text-gray-800 hover:border-primary hover:bg-gray-50 disabled:opacity-50"
          >
            {o.label}
          </button>
        ))}
        {options.length === 0 && (
          <div className="text-xs text-gray-500">Nothing to choose from.</div>
        )}
      </div>
    </Frame>
  );
};

export const ConsentCard = ({ title, text, flowId, site, conversationId, onResult }) => {
  const [busy, setBusy] = useState(false);
  return (
    <Frame title={title || 'Permission needed'}>
      <div className="text-xs text-gray-700">{text}</div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const result = await postStep({
            flowId, values: { consent: true }, site, conversationId,
          });
          setBusy(false);
          onResult?.(result);
        }}
        className="mt-2 rounded bg-primary px-2.5 py-1 text-[11px] font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        I agree
      </button>
    </Frame>
  );
};

export const ConnectionStatus = ({ platform, ok, done }) => (
  <div className="mt-2 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green-600" />
    <div className="text-xs text-green-800">
      {ok === false
        ? `${platform} is not connected yet.`
        : `${platform ? `${platform} connected.` : 'Connected.'}${done ? ' Articles will publish here from now on.' : ''}`}
    </div>
  </div>
);

export default {
  FlowInstructions, SecureFormCard, ChoiceCard, ConsentCard, ConnectionStatus,
};
