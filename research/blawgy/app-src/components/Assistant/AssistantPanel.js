import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, Square, RotateCcw } from 'lucide-react';
import { auth } from '../../firebaseConfig';
import useAssistantStream from './useAssistantStream';
import AssistantCard from './cards';
import AssistantMarkdown from './AssistantMarkdown';

/**
 * The assistant panel.
 *
 * Ambient context: the current route and selected entity ride along with every
 * turn, so "change the title of this one" resolves without the customer
 * restating what they are looking at.
 */

const baseURL = process.env.NODE_ENV === 'production'
  ? 'https://app.blawgy.com'
  : (process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080');

const SUGGESTIONS = [
  'Which articles are scheduled?',
  'Why has nothing published?',
  'What is my content plan doing?',
];

export default function AssistantPanel({ site, brandName = 'Blawgy' }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const location = useLocation();
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const {
    messages, send, stop, streaming, reset, pendingTool, setPendingTool, conversationId,
  } = useAssistantStream();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = useCallback((text) => {
    const value = (text ?? input).trim();
    if (!value) return;
    setInput('');
    send(value, { site, ambientSite: site });
  }, [input, send, site]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const [flowCards, setFlowCards] = useState([]);

  /**
   * A flow step finished. Render whatever comes next and, when the flow
   * completes, tell the assistant so it can pick the thread back up. The result
   * never contains credential values — only the next card and field names.
   */
  const handleFlowResult = useCallback(async (result) => {
    if (result?.__advance) {
      const { flowId, values } = result.__advance;
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${baseURL}/api/assistant/flow/${flowId}/step`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ values, site, conversationId: conversationId.current }),
      });
      return handleFlowResult(await res.json());
    }

    if (result?.render) setFlowCards((prev) => [...prev, result.render]);
    if (result?.done) {
      setFlowCards([]);
      send('[setup finished]', { site, ambientSite: site });
    }
    return undefined;
  }, [send, site, conversationId]);

  /** Replay a minted confirmation token after an explicit click. */
  const confirmPending = useCallback(async () => {
    if (!pendingTool) return;
    const token = await auth.currentUser?.getIdToken();
    try {
      const res = await fetch(`${baseURL}/api/assistant/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          tool: pendingTool.tool,
          args: pendingTool.args,
          confirmationToken: pendingTool.token,
          conversationId: conversationId.current,
          site,
        }),
      });
      const data = await res.json();
      setPendingTool(null);
      send(data.success
        ? `[confirmed] ${data.summary || 'Done.'}`
        : `[confirmation failed] ${data.error || data.message}`, { site, ambientSite: site });
    } catch {
      setPendingTool(null);
    }
  }, [pendingTool, send, site, setPendingTool, conversationId]);

  // Intercom's launcher lives bottom-right with a z-index near the 32-bit max,
  // so anything lower renders underneath it and looks like it never mounted.
  // Sit above Intercom's stacking order, and offset upward so both bubbles are
  // reachable rather than overlapping.
  const FLOAT_Z = 2147483000;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open ${brandName} assistant`}
        style={{ zIndex: FLOAT_Z, bottom: '5.5rem', right: '1.25rem' }}
        className="fixed flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:opacity-90"
      >
        <MessageCircle size={20} />
      </button>
    );
  }

  return (
    <div
      style={{ zIndex: FLOAT_Z, bottom: '5.5rem', right: '1.25rem' }}
      className="fixed flex h-[600px] max-h-[80vh] w-[400px] max-w-[calc(100vw-2.5rem)] flex-col rounded-xl border border-gray-200 bg-white shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">{brandName} assistant</div>
          {site && <div className="text-[11px] text-gray-500">{site}</div>}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={reset}
            title="New conversation"
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <RotateCcw size={15} />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            title="Close"
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="pt-4">
            <p className="text-sm text-gray-600">
              Ask me anything about {brandName}, or tell me what to change.
            </p>
            <div className="mt-3 space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-xs text-gray-700 hover:border-primary hover:bg-gray-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
            {m.role === 'user' ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-white">
                {m.text}
              </div>
            ) : (
              <div className="max-w-full">
                {m.text && <AssistantMarkdown text={m.text} />}
                {m.thinking && !m.text && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400" />
                    Thinking
                  </div>
                )}
                {m.activeTool && (
                  <div className="mt-1 text-[11px] text-gray-400">
                    {m.activeTool.replace(/_/g, ' ')}…
                  </div>
                )}
                {(m.cards || []).map((c, ci) => (
                  <AssistantCard
                    key={ci}
                    card={c.card}
                    props={c.props}
                    onConfirm={confirmPending}
                    onCancel={() => setPendingTool(null)}
                    site={site}
                    conversationId={conversationId.current}
                    onFlowResult={handleFlowResult}
                  />
                ))}
                {m.error && (
                  <div className="mt-1 rounded bg-red-50 px-2 py-1.5 text-xs text-red-700">
                    {m.error}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Steps the customer is working through, rendered outside the message
            list so a form is never mistaken for chat content. */}
        {flowCards.map((c, i) => (
          <AssistantCard
            key={`flow-${i}`}
            card={c.card}
            props={c.props}
            site={site}
            conversationId={conversationId.current}
            onFlowResult={handleFlowResult}
          />
        ))}
      </div>

      <div className="border-t border-gray-200 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask or tell me what to do…"
            className="max-h-28 flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          {streaming ? (
            <button
              type="button"
              onClick={stop}
              title="Stop"
              className="rounded-lg bg-gray-200 p-2 text-gray-700 hover:bg-gray-300"
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => submit()}
              disabled={!input.trim()}
              title="Send"
              className="rounded-lg bg-primary p-2 text-white disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          )}
        </div>
        <div className="mt-1.5 text-[10px] text-gray-400">
          Never paste passwords or API keys here.
        </div>
      </div>
    </div>
  );
}
